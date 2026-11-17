// Conector da referência territorial: IBGE — Malha Municipal Digital (edição 2025), recorte Mato Grosso.
//
//   node scripts/ingestao/ibge-malha.mjs baixar    baixa os ZIPs oficiais e confere o SHA-256 com o manifesto
//   node scripts/ingestao/ibge-malha.mjs carregar  valida e carrega UF e municípios no banco local (dados/banco-local)
//
// O manifesto versionado (dados/referencias/ibge-malha-municipal-2025.json) registra URL, tamanho, SHA-256,
// data de obtenção e as condições de uso conhecidas. Os ZIPs ficam em dados/originais/ (ignorado pelo Git).
// Nenhuma geometria é corrigida, simplificada ou substituída: se algo não validar, a carga falha.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { unzipSync } from "fflate";
import { lerDbf, lerShp } from "./shapefile.mjs";

const RAIZ = join(import.meta.dirname, "..", "..");
export const MANIFESTO = join(RAIZ, "dados", "referencias", "ibge-malha-municipal-2025.json");
const VERSAO_CONECTOR = "ibge-malha@1";

export const CODIGO_FONTE = "ibge-malha-municipal";
export const UF_ESPERADA = { codigo: "51", sigla: "MT", nome: "Mato Grosso", municipios: 142 };
// Diferença máxima aceita entre a área calculada (elipsoide GRS 80) e o atributo AREA_KM2 do IBGE.
export const TOLERANCIA_AREA = 0.005;

export async function lerManifesto() {
  return JSON.parse(await readFile(MANIFESTO, "utf8"));
}

const sha256 = (dados) => createHash("sha256").update(dados).digest("hex");
const caminhoLocal = (arquivo) => join(RAIZ, arquivo.caminho_local);

// Baixa (se necessário) e confere cada arquivo do manifesto. Divergência de SHA-256 é erro: a fonte mudou.
export async function baixar({ forcar = false } = {}) {
  const manifesto = await lerManifesto();
  for (const arquivo of manifesto.arquivos) {
    const destino = caminhoLocal(arquivo);
    let dados = await readFile(destino).catch(() => null);
    if (!dados || forcar) {
      const resposta = await fetch(arquivo.url);
      if (!resposta.ok) throw new Error(`${arquivo.url}: HTTP ${resposta.status}`);
      dados = Buffer.from(await resposta.arrayBuffer());
      await mkdir(dirname(destino), { recursive: true });
      await writeFile(destino, dados);
    }
    const hash = sha256(dados);
    if (hash !== arquivo.sha256) {
      throw new Error(`${arquivo.nome}: SHA-256 ${hash} difere do manifesto (${arquivo.sha256}). A fonte mudou ou o arquivo está corrompido.`);
    }
    if (dados.byteLength !== arquivo.tamanho_bytes) throw new Error(`${arquivo.nome}: tamanho difere do manifesto`);
  }
  return manifesto;
}

// Lê e valida os atributos e a estrutura dos arquivos oficiais (sem banco).
export async function lerMalha() {
  const manifesto = await baixar();
  const porPapel = Object.fromEntries(manifesto.arquivos.map((a) => [a.papel, a]));
  const ler = async (papel) => {
    const arquivo = porPapel[papel];
    const zip = unzipSync(await readFile(caminhoLocal(arquivo)));
    const base = arquivo.nome.replace(/\.zip$/, "");
    const parte = (ext) => {
      const conteudo = zip[`${base}.${ext}`];
      if (!conteudo) throw new Error(`${arquivo.nome}: falta ${base}.${ext}`);
      return conteudo;
    };
    const prj = new TextDecoder().decode(parte("prj"));
    if (!/GCS_SIRGAS_2000/.test(prj) || !/GRS_1980/.test(prj)) throw new Error(`${arquivo.nome}: sistema de referência não é SIRGAS 2000: ${prj}`);
    const cpg = new TextDecoder().decode(parte("cpg")).trim().toLowerCase();
    if (cpg !== "utf-8") throw new Error(`${arquivo.nome}: codificação ${cpg} não prevista`);
    const formas = lerShp(parte("shp"));
    const { registros } = lerDbf(parte("dbf"), "utf-8");
    if (formas.length !== registros.length) throw new Error(`${arquivo.nome}: ${formas.length} geometrias para ${registros.length} registros`);
    return { arquivo, formas, registros, leiame: zip["LEIA-ME.txt"] ? new TextDecoder().decode(zip["LEIA-ME.txt"]) : null };
  };

  const mun = await ler("municipios");
  const uf = await ler("uf");
  const erros = [];

  if (uf.registros.length !== 1) erros.push(`UF: ${uf.registros.length} registros (esperado 1)`);
  const ufAtributos = uf.registros[0]?.valores ?? {};
  if (ufAtributos.CD_UF !== UF_ESPERADA.codigo || ufAtributos.SIGLA_UF !== UF_ESPERADA.sigla) erros.push(`UF inesperada: ${JSON.stringify(ufAtributos)}`);

  const municipios = mun.registros.map((r, i) => ({ ...r.valores, apagado: r.apagado, aneis: mun.formas[i].aneis }));
  if (municipios.length !== UF_ESPERADA.municipios) erros.push(`${municipios.length} municípios (esperado ${UF_ESPERADA.municipios})`);
  const vistos = new Set();
  for (const m of municipios) {
    const id = `${m.CD_MUN} ${m.NM_MUN}`;
    if (m.apagado) erros.push(`${id}: registro marcado como apagado`);
    if (!/^\d{7}$/.test(m.CD_MUN)) erros.push(`${id}: código IBGE inválido`);
    if (!m.CD_MUN.startsWith(UF_ESPERADA.codigo)) erros.push(`${id}: código fora da UF ${UF_ESPERADA.codigo}`);
    if (vistos.has(m.CD_MUN)) erros.push(`${id}: código repetido`);
    vistos.add(m.CD_MUN);
    if (!m.NM_MUN) erros.push(`${m.CD_MUN}: sem nome`);
    if (m.SIGLA_UF !== UF_ESPERADA.sigla || m.CD_UF !== UF_ESPERADA.codigo) erros.push(`${id}: UF ${m.SIGLA_UF}/${m.CD_UF}`);
    if (!m.aneis?.length) erros.push(`${id}: sem geometria`);
    if (!(m.AREA_KM2 > 0)) erros.push(`${id}: AREA_KM2 ausente`);
    for (const anel of m.aneis ?? []) {
      const [x0, y0] = anel[0];
      const [x1, y1] = anel.at(-1);
      if (anel.length < 4 || x0 !== x1 || y0 !== y1) erros.push(`${id}: anel não fechado`);
    }
  }
  if (erros.length) throw new Error(`malha do IBGE não passou na validação:\n  ${erros.join("\n  ")}`);
  return { manifesto, municipios, uf: { ...ufAtributos, aneis: uf.formas[0].aneis }, leiame: mun.leiame };
}

const multiLinha = (aneis) => JSON.stringify({ type: "MultiLineString", coordinates: aneis });
// Monta o polígono a partir dos anéis oficiais (externos e furos), sem corrigir nada.
const GEOMETRIA = "st_multi(st_buildarea(st_setsrid(st_geomfromgeojson($1), 4674)))";

// Metadados da fonte (termos verificados e aviso público), atualizados a cada execução.
export async function atualizarFonte(db, manifesto) {
  await db.query(
    `insert into protegido.fonte (codigo, nome, papel, url, termos_de_uso, nota_publica) values ($1, $2, 'territorio', $3, $4, $5)
     on conflict (codigo) do update set nome = excluded.nome, url = excluded.url, termos_de_uso = excluded.termos_de_uso, nota_publica = excluded.nota_publica`,
    [CODIGO_FONTE, manifesto.fonte.nome, manifesto.fonte.url, manifesto.condicoes_de_uso.resumo, manifesto.nota_publica ?? null],
  );
}

// Carrega UF e municípios num banco já migrado, num único lote. Retorna o relatório da carga.
export async function carregarMalha(db, malha) {
  const { manifesto } = malha;
  const relatorio = await db.transaction(async (tx) => {
    // O PostGIS fica no schema extensions; numa sessão nova ele não está no caminho de busca (Fase 11.4.4D).
    await tx.exec("set local search_path = protegido, extensions, public");
    await atualizarFonte(tx, manifesto);
    const lote = (
      await tx.query(
        `insert into protegido.lote (fonte_codigo, descricao, filtros, citacao, versao_fonte, versao_conector, obtido_em)
         values ($1, $2, $3, $4, $5, $6, $7) returning id`,
        [CODIGO_FONTE, manifesto.descricao, JSON.stringify(manifesto.recorte), manifesto.citacao, manifesto.edicao, VERSAO_CONECTOR, manifesto.obtido_em],
      )
    ).rows[0].id;

    for (const a of manifesto.arquivos) {
      await tx.query(
        "insert into protegido.arquivo_original (lote_id, caminho, tipo, tamanho_bytes, sha256) values ($1, $2, 'application/zip', $3, $4)",
        [lote, a.url, a.tamanho_bytes, a.sha256],
      );
    }

    await tx.query(
      `insert into protegido.uf (codigo_ibge, sigla, nome, geom, edicao_malha, lote_id) values ($1, $2, $3, ${GEOMETRIA.replace("$1", "$4")}, $5, $6)`,
      [malha.uf.CD_UF, malha.uf.SIGLA_UF, malha.uf.NM_UF, multiLinha(malha.uf.aneis), manifesto.edicao, lote],
    );
    for (const m of malha.municipios) {
      await tx.query(
        `insert into protegido.municipio (codigo_ibge, nome, uf_codigo, geom, edicao_malha, lote_id) values ($1, $2, $3, ${GEOMETRIA.replace("$1", "$4")}, $5, $6)`,
        [m.CD_MUN, m.NM_MUN, m.CD_UF, multiLinha(m.aneis), manifesto.edicao, lote],
      );
    }

    // Validações espaciais no banco. Qualquer falha desfaz a transação inteira.
    const areaOficial = Object.fromEntries(malha.municipios.map((m) => [m.CD_MUN, m.AREA_KM2]));
    const geometrias = (
      await tx.query(
        `select codigo_ibge, nome, st_isvalid(geom) as valida, st_srid(geom) as srid, st_numgeometries(geom) as partes,
                st_area(geom::geography) / 1e6 as area_km2
         from protegido.municipio where lote_id = $1`,
        [lote],
      )
    ).rows;
    const erros = [];
    if (geometrias.length !== malha.municipios.length) erros.push(`${geometrias.length} geometrias no banco para ${malha.municipios.length} municípios lidos`);
    let maiorDiferenca = 0;
    for (const g of geometrias) {
      if (!g.valida) erros.push(`${g.codigo_ibge} ${g.nome}: geometria inválida`);
      if (g.srid !== 4674) erros.push(`${g.codigo_ibge}: SRID ${g.srid}`);
      const diferenca = Math.abs(g.area_km2 - areaOficial[g.codigo_ibge]) / areaOficial[g.codigo_ibge];
      maiorDiferenca = Math.max(maiorDiferenca, diferenca);
      if (diferenca > TOLERANCIA_AREA) erros.push(`${g.codigo_ibge} ${g.nome}: área ${g.area_km2.toFixed(3)} km² difere de AREA_KM2 ${areaOficial[g.codigo_ibge]} em ${(diferenca * 100).toFixed(2)}%`);
    }
    // Cobertura sem lacunas nem sobreposições, comprovada por áreas: se soma = união = UF, não há sobreposição
    // (ela aumentaria a soma) nem lacuna (ela reduziria a união). ST_Difference/ST_Intersection entre os
    // multipolígonos completos NÃO são usados: no PGlite (WASM 32 bits) eles devolvem zero linhas sem erro.
    const umaLinha = async (sql, params) => {
      const { rows } = await tx.query(sql, params);
      if (rows.length !== 1) throw new Error(`consulta de validação devolveu ${rows.length} linhas (esperada 1): ${sql}`);
      return rows[0];
    };
    const cobertura = await umaLinha(
      `select (select st_area(geom::geography) / 1e6 from protegido.uf where codigo_ibge = $2) as area_uf,
              (select sum(st_area(geom::geography)) / 1e6 from protegido.municipio where lote_id = $1) as soma_municipios,
              (select st_area(st_union(geom)::geography) / 1e6 from protegido.municipio where lote_id = $1) as uniao_municipios`,
      [lote, malha.uf.CD_UF],
    );
    const { fora } = await umaLinha(
      `select count(*) filter (where not st_covers(u.geom, st_pointonsurface(m.geom)))::int as fora
       from protegido.municipio m join protegido.uf u on u.codigo_ibge = m.uf_codigo where m.lote_id = $1`,
      [lote],
    );
    const ufOficial = malha.uf.AREA_KM2;
    const sobreposicao = cobertura.soma_municipios - cobertura.uniao_municipios;
    const lacuna = cobertura.area_uf - cobertura.uniao_municipios;
    if (Math.abs(cobertura.area_uf - ufOficial) / ufOficial > TOLERANCIA_AREA) erros.push(`UF: área ${cobertura.area_uf} difere de AREA_KM2 ${ufOficial}`);
    if (sobreposicao > 1) erros.push(`${sobreposicao.toFixed(3)} km² de sobreposição entre municípios`);
    if (Math.abs(lacuna) > 1) erros.push(`${lacuna.toFixed(3)} km² de diferença entre a UF e a união dos municípios`);
    if (fora > 0) erros.push(`${fora} municípios com ponto interno fora da UF`);
    if (erros.length) throw new Error(`validação espacial falhou:\n  ${erros.join("\n  ")}`);

    const resumo = {
      municipios: geometrias.length,
      partes: geometrias.reduce((s, g) => s + g.partes, 0),
      maior_diferenca_area_pct: Number((maiorDiferenca * 100).toFixed(4)),
      area_uf_km2: Number(cobertura.area_uf.toFixed(3)),
      soma_municipios_km2: Number(cobertura.soma_municipios.toFixed(3)),
      uniao_municipios_km2: Number(cobertura.uniao_municipios.toFixed(3)),
      sobreposicao_km2: Number(sobreposicao.toFixed(6)),
      lacuna_km2: Number(lacuna.toFixed(6)),
      municipios_fora_da_uf: fora,
    };
    await tx.query(
      `update protegido.lote set situacao = 'ok', concluido_em = now(), recebidos = $2, aceitos = $2, rejeitados = 0,
              relatorio = $3 where id = $1`,
      [lote, geometrias.length, JSON.stringify({ validacao: resumo })],
    );
    return { lote, ...resumo };
  });
  return relatorio;
}

if (import.meta.main) {
  const comando = process.argv[2];
  if (comando === "baixar") {
    const m = await baixar({ forcar: process.argv.includes("--forcar") });
    for (const a of m.arquivos) console.log(`ok  ${a.nome}  ${a.tamanho_bytes} B  sha256 ${a.sha256}`);
  } else if (comando === "carregar") {
    const { abrirBancoLocal } = await import("../banco/local.mjs");
    const db = await abrirBancoLocal();
    const ja = await db.query("select count(*)::int as n from protegido.lote where fonte_codigo = $1 and situacao = 'ok'", [CODIGO_FONTE]);
    if (ja.rows[0].n > 0) {
      await atualizarFonte(db, await lerManifesto());
      console.log("a malha já está carregada no banco local; metadados da fonte atualizados.");
    } else {
      const relatorio = await carregarMalha(db, await lerMalha());
      console.log(JSON.stringify(relatorio, null, 2));
    }
    await db.close();
  } else {
    console.error("uso: node scripts/ingestao/ibge-malha.mjs baixar [--forcar] | carregar");
    process.exit(2);
  }
}
