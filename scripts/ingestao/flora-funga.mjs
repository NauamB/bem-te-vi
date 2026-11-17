// Conector da referência taxonômica: Flora e Funga do Brasil — Lista Oficial (DwC-A do IPT do JBRJ).
//
//   node scripts/ingestao/flora-funga.mjs baixar    baixa o DwC-A e confere o SHA-256 com o manifesto
//   node scripts/ingestao/flora-funga.mjs carregar  carrega nomes, espécies, nomes populares, distribuição em MT
//                                                    e perfil no banco local (dados/banco-local)
//
// O registro original de cada nome é preservado em protegido.nome_recebido; espécies e nomes tratados são
// derivados dele por regras explícitas (abaixo). Nada é descartado: sinônimos sem alvo válido viram "outro".
import { join } from "node:path";
import { copiar } from "../banco/copiar.mjs";
import { abrirDwca } from "./dwca.mjs";
import { baixarArquivos, lerArquivo, lerManifesto, RAIZ } from "./manifesto.mjs";
import { normalizarBusca } from "./texto.mjs";

export const MANIFESTO = join(RAIZ, "dados", "referencias", "flora-funga-brasil.json");
export const CODIGO_FONTE = "flora-funga-brasil";
const VERSAO_CONECTOR = "flora-funga@1";
const UF_DISTRIBUICAO = "BR-MT";

const lista = (v) => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);
const jsonOuNulo = (texto) => {
  try {
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
};

export async function baixar(opcoes) {
  return baixarArquivos(await lerManifesto(MANIFESTO), opcoes);
}

// Lê o DwC-A e prepara as linhas para cópia. Valida a estrutura esperada antes de qualquer gravação.
export async function lerFloraFunga() {
  const manifesto = await baixar();
  const dwca = abrirDwca(await lerArquivo(manifesto.arquivos[0]));
  if (dwca.nucleo.tipo !== "Taxon") throw new Error(`núcleo ${dwca.nucleo.tipo} (esperado Taxon)`);
  const eml = new TextDecoder().decode(dwca.arquivo("eml.xml") ?? new Uint8Array());
  if (!/creativecommons\.org\/licenses\/by\/4\.0/.test(eml)) throw new Error("eml.xml não declara CC BY 4.0: rever licença antes de carregar");

  const nomes = [];
  const ids = new Set();
  for (const t of dwca.linhas(dwca.nucleo)) {
    if (!t.taxonID || !t.scientificName) throw new Error(`linha sem taxonID ou scientificName: ${JSON.stringify(t).slice(0, 200)}`);
    if (ids.has(t.taxonID)) throw new Error(`taxonID repetido: ${t.taxonID}`);
    ids.add(t.taxonID);
    nomes.push(t);
  }

  const populares = [];
  const vern = dwca.extensao("VernacularName");
  for (const v of vern ? dwca.linhas(vern) : []) {
    if (v.vernacularName) populares.push({ taxonID: v.id, nome: v.vernacularName.trim(), idioma: v.language, localidade: v.locality });
  }

  const distribuicao = [];
  const dist = dwca.extensao("Distribution");
  for (const d of dist ? dwca.linhas(dist) : []) {
    if (d.locationID !== UF_DISTRIBUICAO) continue;
    const obs = jsonOuNulo(d.occurrenceRemarks);
    distribuicao.push({ taxonID: d.id, locationID: d.locationID, origem: d.establishmentMeans, endemismo: obs?.endemism ?? null, dominios: lista(obs?.phytogeographicDomain), texto: d.occurrenceRemarks });
  }

  // Perfil só de espécies aceitas e com algum conteúdo (recorte do manifesto; reduz ~64% do volume).
  const especiesAceitas = new Set(nomes.filter((t) => t.taxonRank === "ESPECIE" && t.taxonomicStatus === "NOME_ACEITO").map((t) => t.taxonID));
  const perfis = [];
  const perf = dwca.extensao("SpeciesProfile");
  for (const p of perf ? dwca.linhas(perf) : []) {
    if (!especiesAceitas.has(p.id)) continue;
    const obs = jsonOuNulo(p.lifeForm);
    const perfil = { taxonID: p.id, formas: lista(obs?.lifeForm), habitats: lista(obs?.habitat), vegetacao: lista(obs?.vegetationType), texto: p.lifeForm };
    if (perfil.formas.length + perfil.habitats.length + perfil.vegetacao.length > 0) perfis.push(perfil);
  }

  return { manifesto, nomes, populares, distribuicao, perfis };
}

// Nome canônico (sem autoria), conforme o nível taxonômico.
const NOME_CANONICO = `case n.rank
    when 'ESPECIE' then n.genero || ' ' || n.especifico
    when 'VARIEDADE' then n.genero || ' ' || n.especifico || ' var. ' || n.infraespecifico
    when 'SUB_ESPECIE' then n.genero || ' ' || n.especifico || ' subsp. ' || n.infraespecifico
    when 'FORMA' then n.genero || ' ' || n.especifico || ' f. ' || n.infraespecifico
    else trim(case when n.autoria is not null and right(n.nome, length(n.autoria)) = n.autoria
                   then left(n.nome, length(n.nome) - length(n.autoria)) else n.nome end)
  end`;

export async function carregarFloraFunga(db, dados) {
  const { manifesto } = dados;
  return db.transaction(async (tx) => {
    // Mesmo caminho de busca das migrações, independente do estado da sessão (Fase 11.4.4D).
    await tx.exec("set local search_path = protegido, extensions, public");
    await tx.query(
      `insert into protegido.fonte (codigo, nome, papel, url, termos_de_uso) values ($1, $2, 'taxonomia', $3, $4)
       on conflict (codigo) do nothing`,
      [CODIGO_FONTE, manifesto.fonte.nome, manifesto.fonte.url, `${manifesto.licenca}. ${manifesto.licenca_evidencia}`],
    );
    const lote = (
      await tx.query(
        `insert into protegido.lote (fonte_codigo, descricao, filtros, doi, citacao, versao_fonte, versao_conector, obtido_em)
         values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
        [CODIGO_FONTE, manifesto.descricao, JSON.stringify(manifesto.recorte), manifesto.doi, manifesto.citacao, manifesto.versao, VERSAO_CONECTOR, manifesto.obtido_em],
      )
    ).rows[0].id;
    for (const a of manifesto.arquivos) {
      await tx.query("insert into protegido.arquivo_original (lote_id, caminho, tipo, tamanho_bytes, sha256) values ($1, $2, 'application/zip', $3, $4)", [lote, a.url, a.tamanho_bytes, a.sha256]);
    }

    // 1. Originais, como recebidos.
    await copiar(tx, "protegido.nome_recebido",
      ["lote_id", "taxon_id", "nome", "autoria", "rank", "status", "accepted_name_usage_id", "parent_name_usage_id", "reino", "filo", "classe", "ordem", "familia", "genero", "especifico", "infraespecifico", "status_nomenclatural"],
      dados.nomes.map((t) => [lote, t.taxonID, t.scientificName, t.scientificNameAuthorship, t.taxonRank, t.taxonomicStatus, t.acceptedNameUsageID, t.parentNameUsageID, t.kingdom, t.phylum, t.class, t.order, t.family, t.genus, t.specificEpithet, t.infraspecificEpithet, t.nomenclaturalStatus]));
    await copiar(tx, "protegido.nome_popular_recebido", ["lote_id", "taxon_id", "nome", "idioma", "localidade", "nome_busca"],
      dados.populares.map((p) => [lote, p.taxonID, p.nome, p.idioma, p.localidade, normalizarBusca(p.nome)]));
    await copiar(tx, "protegido.distribuicao_recebida", ["lote_id", "taxon_id", "location_id", "establishment_means", "endemismo", "dominios", "occurrence_remarks"],
      dados.distribuicao.map((d) => [lote, d.taxonID, d.locationID, d.origem, d.endemismo, d.dominios, d.texto]));
    await copiar(tx, "protegido.perfil_recebido", ["lote_id", "taxon_id", "formas_de_vida", "habitats", "vegetacao", "texto_original"],
      dados.perfis.map((p) => [lote, p.taxonID, p.formas, p.habitats, p.vegetacao, p.texto]));

    // 2. Espécies: nomes aceitos de rank espécie.
    await tx.query(
      `insert into protegido.especie (nome, familia, genero, lote_id, taxon_id, reino, filo, classe, ordem)
       select n.genero || ' ' || n.especifico, n.familia, n.genero, n.lote_id, n.taxon_id, n.reino, n.filo, n.classe, n.ordem
       from protegido.nome_recebido n
       where n.lote_id = $1 and n.rank = 'ESPECIE' and n.status = 'NOME_ACEITO' and n.genero is not null and n.especifico is not null`,
      [lote],
    );

    // 3. Nomes tratados, já ligados à espécie (sem UPDATE posterior, para não inchar a tabela).
    //    Passada 1: aceitos, nomes sem status e sinônimos sem alvo existente (viram "outro").
    //    Espécie de um aceito: pelo taxonID (rank espécie) ou, se infraespecífico, a única espécie aceita
    //    de mesmo gênero e epíteto.
    await tx.query(
      `insert into protegido.nome_cientifico (lote_id, recebido_id, taxon_id, nome, autoria, rank, status, nome_canonico, nome_busca, especie_id)
       select n.lote_id, n.id, n.taxon_id, n.nome, n.autoria, coalesce(lower(n.rank), 'desconhecido'),
              case when n.status = 'NOME_ACEITO' then 'aceito' else 'outro' end,
              ${NOME_CANONICO}, lower(${NOME_CANONICO}),
              case when n.status <> 'NOME_ACEITO' then null
                   when n.rank = 'ESPECIE' then (select e.id from protegido.especie e where e.lote_id = n.lote_id and e.taxon_id = n.taxon_id)
                   when n.rank in ('VARIEDADE', 'SUB_ESPECIE', 'FORMA') then
                     (select min(e.id) from protegido.especie e where e.lote_id = n.lote_id and e.nome = n.genero || ' ' || n.especifico having count(*) = 1)
              end
       from protegido.nome_recebido n
       where n.lote_id = $1 and (n.status is distinct from 'SINONIMO'
         or n.accepted_name_usage_id is null
         or not exists (select 1 from protegido.nome_recebido a where a.lote_id = n.lote_id and a.taxon_id = n.accepted_name_usage_id))`,
      [lote],
    );
    // Passadas seguintes: sinônimos cujo alvo já está em nome_cientifico (resolve cadeias); herdam a espécie do alvo.
    let passadas = 0;
    for (;;) {
      const { affectedRows } = await tx.query(
        `insert into protegido.nome_cientifico (lote_id, recebido_id, taxon_id, nome, autoria, rank, status, nome_aceito_id, nome_canonico, nome_busca, especie_id)
         select n.lote_id, n.id, n.taxon_id, n.nome, n.autoria, coalesce(lower(n.rank), 'desconhecido'), 'sinonimo', a.id,
                ${NOME_CANONICO}, lower(${NOME_CANONICO}), a.especie_id
         from protegido.nome_recebido n
         join protegido.nome_cientifico a on a.lote_id = n.lote_id and a.taxon_id = n.accepted_name_usage_id
         where n.lote_id = $1 and n.status = 'SINONIMO'
           and not exists (select 1 from protegido.nome_cientifico x where x.recebido_id = n.id)`,
        [lote],
      );
      passadas++;
      if (!affectedRows) break;
      if (passadas > 20) throw new Error("cadeia de sinônimos não converge após 20 passadas");
    }
    // Sinônimos em ciclo (alvo nunca resolvido) entram como "outro".
    const ciclo = await tx.query(
      `insert into protegido.nome_cientifico (lote_id, recebido_id, taxon_id, nome, autoria, rank, status, nome_canonico, nome_busca)
       select n.lote_id, n.id, n.taxon_id, n.nome, n.autoria, coalesce(lower(n.rank), 'desconhecido'), 'outro', ${NOME_CANONICO}, lower(${NOME_CANONICO})
       from protegido.nome_recebido n
       where n.lote_id = $1 and not exists (select 1 from protegido.nome_cientifico x where x.recebido_id = n.id)`,
      [lote],
    );

    // 5. Conferências e relatório.
    const c = (
      await tx.query(
        `select (select count(*)::int from protegido.nome_recebido where lote_id = $1) as nomes_recebidos,
                (select count(*)::int from protegido.nome_cientifico where lote_id = $1) as nomes_tratados,
                (select count(*)::int from protegido.nome_cientifico where lote_id = $1 and status = 'aceito') as aceitos,
                (select count(*)::int from protegido.nome_cientifico where lote_id = $1 and status = 'sinonimo') as sinonimos,
                (select count(*)::int from protegido.nome_cientifico where lote_id = $1 and status = 'outro') as outros,
                (select count(*)::int from protegido.especie where lote_id = $1) as especies,
                (select count(*)::int from protegido.especie where lote_id = $1 and reino = 'Plantae') as especies_plantae,
                (select count(*)::int from protegido.especie where lote_id = $1 and reino = 'Fungi') as especies_fungi,
                (select count(*)::int from protegido.nome_cientifico where lote_id = $1 and especie_id is not null) as nomes_ligados_a_especie,
                (select count(*)::int from protegido.nome_popular_recebido where lote_id = $1) as nomes_populares,
                (select count(*)::int from protegido.distribuicao_recebida where lote_id = $1) as distribuicoes_mt,
                (select count(*)::int from protegido.perfil_recebido where lote_id = $1) as perfis,
                (select count(*)::int from (select nome from protegido.especie where lote_id = $1 group by nome having count(*) > 1) h) as homonimos`,
        [lote],
      )
    ).rows[0];
    const erros = [];
    if (c.nomes_recebidos !== dados.nomes.length) erros.push(`nomes recebidos ${c.nomes_recebidos} ≠ lidos ${dados.nomes.length}`);
    if (c.nomes_tratados !== c.nomes_recebidos) erros.push(`nomes tratados ${c.nomes_tratados} ≠ recebidos ${c.nomes_recebidos}`);
    if (c.nomes_populares !== dados.populares.length) erros.push("nomes populares não conferem");
    if (c.distribuicoes_mt !== dados.distribuicao.length) erros.push("distribuições não conferem");
    if (c.perfis !== dados.perfis.length) erros.push("perfis não conferem");
    if (erros.length) throw new Error(`carga da Flora e Funga não conferiu:\n  ${erros.join("\n  ")}`);

    const relatorio = { ...c, passadas_sinonimos: passadas, sinonimos_em_ciclo: ciclo.affectedRows ?? 0 };
    await tx.query(
      `update protegido.lote set situacao = 'ok', concluido_em = now(), recebidos = $2, aceitos = $3, rejeitados = 0, relatorio = $4 where id = $1`,
      [lote, c.nomes_recebidos, c.nomes_tratados, JSON.stringify({ validacao: relatorio })],
    );
    return { lote, ...relatorio };
  });
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
    if (ja.rows[0].n > 0) console.log("a Flora e Funga já está carregada no banco local; nada a fazer.");
    else console.log(JSON.stringify(await carregarFloraFunga(db, await lerFloraFunga()), null, 2));
    await db.close();
  } else {
    console.error("uso: node scripts/ingestao/flora-funga.mjs baixar [--forcar] | carregar");
    process.exit(2);
  }
}
