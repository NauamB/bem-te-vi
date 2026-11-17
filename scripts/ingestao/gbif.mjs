// Conector das ocorrências do GBIF (downloads oficiais com DOI).
//
//   node scripts/ingestao/gbif.mjs avaliar <lote>      contagens prévias na API pública (sem conta, sem download)
//   node scripts/ingestao/gbif.mjs solicitar <lote>    pede o download (DWCA) com a conta do proprietário
//   node scripts/ingestao/gbif.mjs situacao <chave>    mostra a situação do download e o DOI
//   node scripts/ingestao/gbif.mjs baixar <chave>      baixa o ZIP pronto e registra SHA-256 e DOI
//   node scripts/ingestao/gbif.mjs inspecionar <chave> licenças, qualidade e duplicidades do arquivo (só leitura)
//   node scripts/ingestao/gbif.mjs carregar <chave>    valida, concilia e carrega no banco local
//   node scripts/ingestao/gbif.mjs pendentes           lista conjuntos de dados aguardando revisão humana
//   node scripts/ingestao/gbif.mjs revisar --conjunto <datasetKey> --decisao aprovado|rejeitado --revisor "<nome>"
//        --licenca CC-BY-NC-4.0 --condicoes "<termos lidos>" --atribuicao "<crédito exigido>" --justificativa "<motivo>"
//
// Credenciais: GBIF_USUARIO e GBIF_SENHA, lidas de variáveis de ambiente ou de .env.local (ignorado pelo Git).
// Nunca são impressas nem gravadas em arquivo versionado.
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { copiar } from "../banco/copiar.mjs";
import { abrirDwca } from "./dwca.mjs";
import { RAIZ, sha256 } from "./manifesto.mjs";

export const LOTES = join(RAIZ, "dados", "referencias", "gbif-lotes.json");
export const DOWNLOADS = join(RAIZ, "dados", "referencias", "gbif-downloads.json");
const API = "https://api.gbif.org/v1";
const VERSAO_CONECTOR = "gbif@1";
export const FONTE_OCORRENCIAS = "gbif";
export const FONTE_TAXONOMIA = "gbif-taxonomia";
const REINOS_FLORA_FUNGA = new Set(["Plantae", "Fungi"]);
const CATEGORIAS_AMEACADAS = new Set(["CR", "EN", "VU", "CRITICALLY_ENDANGERED", "ENDANGERED", "VULNERABLE"]);

// ---------------------------------------------------------------------------------------------
// Licenças
// ---------------------------------------------------------------------------------------------
const ORDEM_LICENCA = { "CC0-1.0": 0, "CC-BY-4.0": 1, "CC-BY-NC-4.0": 2 };
export function licencaDe(texto) {
  const t = String(texto ?? "").toLowerCase();
  if (!t) return "ausente";
  // Aceita URL da Creative Commons ou código do GBIF (ex.: CC_BY_NC_4_0).
  if (/publicdomain\/zero\/1\.0|cc0[_ -]?1[._]0|^cc0$/.test(t)) return "CC0-1.0";
  if (/licenses\/by-nc\/4\.0|cc[_ -]by[_ -]nc[_ -]4[._]0/.test(t)) return "CC-BY-NC-4.0";
  if (/licenses\/by\/4\.0|cc[_ -]by[_ -]4[._]0/.test(t)) return "CC-BY-4.0";
  return "outra";
}
// A mais restritiva entre a do registro e a do conjunto; null se alguma não for admitida.
export function licencaEfetiva(doRegistro, doConjunto) {
  const a = licencaDe(doRegistro);
  const b = doConjunto;
  if (!(a in ORDEM_LICENCA) || !(b in ORDEM_LICENCA)) return null;
  return ORDEM_LICENCA[a] >= ORDEM_LICENCA[b] ? a : b;
}
// A mais restritiva entre duas licenças de conjunto (ex.: a registrada e a do EML do download novo).
// Uma licença não admitida sempre prevalece, para que o conjunto vá para revisão humana.
export function licencaMaisRestritiva(a, b) {
  if (a === b || b == null) return a;
  if (!(a in ORDEM_LICENCA)) return a;
  if (!(b in ORDEM_LICENCA)) return b;
  return ORDEM_LICENCA[a] >= ORDEM_LICENCA[b] ? a : b;
}

// ---------------------------------------------------------------------------------------------
// Classificação dos conjuntos de dados para revisão (ADR-0001, seção 7). Usada na carga e na inspeção.
// Considera TODOS os registros originais do conjunto no download, inclusive os que depois forem rejeitados.
// Conferência automática só se: licença do conjunto CC0 ou CC BY, nenhum registro com licença efetiva
// CC BY-NC, nenhum registro com licença não admitida e nenhum registro com rights/accessRights.
// Qualquer outro caso fica para revisão humana. A licença mais restritiva sempre prevalece.
// ---------------------------------------------------------------------------------------------
export function classificarConjuntos(registros, licencaDoConjunto) {
  const conjuntos = new Map();
  for (const r of registros) {
    const chave = r.datasetKey;
    let c = conjuntos.get(chave);
    if (!c) {
      c = { licenca_conjunto: licencaDoConjunto(chave), registros: 0, efetivas: {}, cc_by_nc: 0, licenca_nao_admitida: 0, termos_adicionais: 0 };
      conjuntos.set(chave, c);
    }
    c.registros++;
    const efetiva = licencaEfetiva(r.license, c.licenca_conjunto);
    if (!efetiva) c.licenca_nao_admitida++;
    else {
      c.efetivas[efetiva] = (c.efetivas[efetiva] ?? 0) + 1;
      if (efetiva === "CC-BY-NC-4.0") c.cc_by_nc++;
    }
    if (r.rights || r.accessRights) c.termos_adicionais++;
  }
  for (const c of conjuntos.values()) {
    c.motivos = [];
    if (!["CC0-1.0", "CC-BY-4.0"].includes(c.licenca_conjunto)) c.motivos.push(`licença do conjunto ${c.licenca_conjunto}`);
    if (c.cc_by_nc) c.motivos.push(`${c.cc_by_nc} registro(s) com licença efetiva CC BY-NC`);
    if (c.licenca_nao_admitida) c.motivos.push(`${c.licenca_nao_admitida} registro(s) com licença não admitida`);
    if (c.termos_adicionais) c.motivos.push(`${c.termos_adicionais} registro(s) com rights/accessRights`);
    c.decisao = c.motivos.length ? "revisao_humana" : "automatica";
    // Licença confirmada na conferência automática: a mais restritiva entre as efetivas dos registros.
    c.licenca_automatica = c.decisao === "automatica" ? (c.efetivas["CC-BY-4.0"] ? "CC-BY-4.0" : "CC0-1.0") : null;
  }
  return conjuntos;
}

// ---------------------------------------------------------------------------------------------
// Revisão vigente × registros novos (Fase 11.4.4C). A classificação `k` é feita sobre TODOS os registros já
// recebidos do conjunto, em todos os lotes. Retorna a ação da carga:
//   aprovar   — conferência automática (sem revisão ainda, ou automática anterior com outra licença);
//   suspender — a aprovação vigente não cobre mais os registros: revisão 'pendente' até nova revisão humana;
//   aguardar  — sem revisão e com motivo para revisão humana (nada é gravado);
//   manter    — nada muda. Revisões humanas nunca viram aprovação nem rejeição automática.
// ---------------------------------------------------------------------------------------------
export function decidirRevisao(vigente, k, registros = []) {
  if (!vigente) return k.decisao === "automatica" ? { acao: "aprovar", licenca: k.licenca_automatica } : { acao: "aguardar" };
  // Suspensa, pendente ou rejeitada: só uma revisão humana muda a situação.
  if (vigente.decisao !== "aprovado") return { acao: "manter" };
  if (vigente.tipo === "automatica") {
    if (k.decisao !== "automatica") return { acao: "suspender", motivos: k.motivos };
    return vigente.licenca_confirmada === k.licenca_automatica ? { acao: "manter" } : { acao: "aprovar", licenca: k.licenca_automatica };
  }
  const motivos = motivosContraAprovacaoHumana(vigente, k, registros);
  return motivos.length ? { acao: "suspender", motivos } : { acao: "manter" };
}

// Uma aprovação humana continua valendo enquanto os registros couberem no que foi revisado: toda licença efetiva
// admitida e não mais restritiva que a confirmada, e nenhum termo adicional (rights/accessRights) que não
// existisse nos registros recebidos até a data da revisão. `registros` traz { rights, accessRights, concluidoEm }
// (concluidoEm nulo = lote em carga).
export function motivosContraAprovacaoHumana(vigente, k, registros) {
  const motivos = [];
  if (!(k.licenca_conjunto in ORDEM_LICENCA)) motivos.push(`licença do conjunto ${k.licenca_conjunto}`);
  if (k.licenca_nao_admitida) motivos.push(`${k.licenca_nao_admitida} registro(s) com licença não admitida`);
  for (const [licenca, n] of Object.entries(k.efetivas)) {
    if (ORDEM_LICENCA[licenca] > ORDEM_LICENCA[vigente.licenca_confirmada]) {
      motivos.push(`${n} registro(s) com licença efetiva ${licenca}, mais restritiva que a confirmada (${vigente.licenca_confirmada})`);
    }
  }
  const revisadoEm = new Date(vigente.revisado_em).getTime();
  const posterior = (r) => r.concluidoEm == null || new Date(r.concluidoEm).getTime() > revisadoEm;
  const termos = (r) => [r.rights, r.accessRights].map((t) => String(t ?? "").trim()).filter(Boolean);
  const conhecidos = new Set(registros.filter((r) => !posterior(r)).flatMap(termos));
  const novos = registros.filter((r) => posterior(r) && termos(r).some((t) => !conhecidos.has(t))).length;
  if (novos) motivos.push(`${novos} registro(s) com rights/accessRights novos, posteriores à revisão humana`);
  return motivos;
}

// ---------------------------------------------------------------------------------------------
// Validação de cada registro (antes do banco). Retorna o motivo de rejeição ou null.
// ---------------------------------------------------------------------------------------------
export function motivoRejeicao(r, { anoAtual, licencaConjunto }) {
  const lat = Number(r.decimalLatitude);
  const lon = Number(r.decimalLongitude);
  if (r.decimalLatitude == null || r.decimalLongitude == null || !Number.isFinite(lat) || !Number.isFinite(lon)) return "sem coordenada";
  if (lat === 0 && lon === 0) return "coordenada (0, 0)";
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return "coordenada inválida";
  const ano = Number(r.year);
  if (r.year != null && (!Number.isInteger(ano) || ano > anoAtual)) return "ano inválido ou futuro";
  if (!licencaEfetiva(r.license, licencaConjunto)) return `licença não admitida (registro: ${licencaDe(r.license)}, conjunto: ${licencaConjunto})`;
  return null;
}

const dataDoEvento = (texto) => {
  const inicio = String(texto ?? "").split("/")[0];
  return /^\d{4}-\d{2}-\d{2}/.test(inicio) ? inicio.slice(0, 10) : null;
};
const canonicoVerbatim = (nome) => {
  const partes = String(nome ?? "").trim().split(/\s+/);
  return partes.length >= 2 && /^[A-Z][a-zë-]+$/.test(partes[0]) && /^[a-zë-]+$/.test(partes[1]) ? `${partes[0]} ${partes[1]}` : null;
};

// ---------------------------------------------------------------------------------------------
// Metadados dos conjuntos de dados (EML incluídos no download, pasta dataset/)
// ---------------------------------------------------------------------------------------------
export function lerEml(xml) {
  const primeiro = (re) => xml.match(re)?.[1]?.replace(/\s+/g, " ").trim() ?? null;
  const direitos = primeiro(/<intellectualRights>([\s\S]*?)<\/intellectualRights>/);
  const urlLicenca = xml.match(/<intellectualRights>[\s\S]*?<ulink[^>]*url="([^"]+)"/)?.[1] ?? null;
  return {
    titulo: primeiro(/<dataset>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/),
    publicador: primeiro(/<creator>[\s\S]*?<organizationName>([\s\S]*?)<\/organizationName>/),
    licenca: licencaDe(urlLicenca ?? direitos),
    licencaVerbatim: urlLicenca,
    direitos: direitos?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? null,
  };
}

// ---------------------------------------------------------------------------------------------
// Carga
// ---------------------------------------------------------------------------------------------
export async function carregarDownload(db, { zip, download, loteDef, fonteFlora = "flora-funga-brasil", ufCodigo = "51" }) {
  const dwca = abrirDwca(zip);
  if (dwca.nucleo.tipo !== "Occurrence") throw new Error(`núcleo ${dwca.nucleo.tipo} (esperado Occurrence)`);
  const registros = [...dwca.linhas(dwca.nucleo)];
  const anoAtual = new Date().getUTCFullYear();
  // gbifID é único por construção no GBIF: repetição indica arquivo corrompido, e a carga inteira é recusada.
  const vistos = new Set();
  for (const r of registros) {
    if (!r.gbifID) throw new Error("registro sem gbifID: download corrompido ou formato inesperado");
    if (vistos.has(r.gbifID)) throw new Error(`gbifID ${r.gbifID} repetido no download: arquivo corrompido, carga recusada`);
    vistos.add(r.gbifID);
  }

  const conjuntos = new Map();
  for (const chave of new Set(registros.map((r) => r.datasetKey).filter(Boolean))) {
    const eml = dwca.arquivo(`dataset/${chave}.xml`);
    conjuntos.set(chave, eml ? lerEml(new TextDecoder().decode(eml)) : { titulo: null, publicador: null, licenca: "ausente", licencaVerbatim: null, direitos: null });
  }

  return db.transaction(async (tx) => {
    // O PostGIS fica no schema extensions; numa sessão nova ele não está no caminho de busca (Fase 11.4.4D).
    await tx.exec("set local search_path = protegido, extensions, public");
    for (const [codigo, nome, papel, url, nota] of [
      [FONTE_OCORRENCIAS, "GBIF — Global Biodiversity Information Facility", "ocorrencias", "https://www.gbif.org", null],
      [FONTE_TAXONOMIA, "GBIF Backbone Taxonomy (classificação atribuída pelo GBIF)", "taxonomia", "https://doi.org/10.15468/39omei",
        "Referência provisória: classificação atribuída pelo GBIF às ocorrências (GBIF Backbone Taxonomy). Não é o catálogo taxonômico oficial brasileiro."],
    ]) {
      await tx.query("insert into protegido.fonte (codigo, nome, papel, url, nota_publica) values ($1, $2, $3, $4, $5) on conflict (codigo) do nothing", [codigo, nome, papel, url, nota]);
    }

    const lote = (
      await tx.query(
        `insert into protegido.lote (fonte_codigo, descricao, filtros, doi, citacao, versao_fonte, versao_conector, solicitado_em, obtido_em)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
        [FONTE_OCORRENCIAS, `GBIF — ${loteDef.descricao}`, JSON.stringify(loteDef.predicado), download.doi, download.citacao, download.chave, VERSAO_CONECTOR, download.solicitado_em, download.baixado_em],
      )
    ).rows[0].id;
    await tx.query("insert into protegido.arquivo_original (lote_id, caminho, tipo, tamanho_bytes, sha256) values ($1, $2, 'application/zip', $3, $4)", [lote, download.link, download.tamanho_bytes, download.sha256]);

    // Conjuntos de dados (mantém o registro existente, se já houver).
    for (const [chave, c] of conjuntos) {
      await tx.query(
        `insert into protegido.conjunto_dados (fonte_codigo, chave_externa, titulo, publicador, licenca, licenca_verbatim, direitos_verbatim, url)
         values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict (fonte_codigo, chave_externa) do nothing`,
        [FONTE_OCORRENCIAS, chave, c.titulo ?? `Conjunto ${chave}`, c.publicador, c.licenca, c.licencaVerbatim, c.direitos, `https://www.gbif.org/dataset/${chave}`],
      );
    }
    // Licença do conjunto: a mais restritiva entre a registrada e a do EML deste download (o publicador pode tê-la mudado).
    const idConjunto = new Map((await tx.query("select id, chave_externa, licenca from protegido.conjunto_dados where fonte_codigo = $1", [FONTE_OCORRENCIAS])).rows
      .map((r) => [r.chave_externa, { ...r, licenca: licencaMaisRestritiva(r.licenca, conjuntos.get(r.chave_externa)?.licenca) }]));

    // Validação por registro e posição no território (malha do IBGE já carregada).
    const motivo = new Map();
    for (const r of registros) {
      const m = motivoRejeicao(r, { anoAtual, licencaConjunto: idConjunto.get(r.datasetKey)?.licenca ?? "ausente" });
      if (m) motivo.set(r, m);
    }
    await tx.exec("create temporary table tmp_ponto (gbif_id text primary key, geom geometry(Point, 4674)) on commit drop");
    await copiar(tx, "tmp_ponto", ["gbif_id", "geom"],
      registros.filter((r) => !motivo.has(r)).map((r) => [r.gbifID, `SRID=4674;POINT(${Number(r.decimalLongitude)} ${Number(r.decimalLatitude)})`]));
    const municipioDe = new Map(
      (await tx.query(`select p.gbif_id, min(m.codigo_ibge) as codigo from tmp_ponto p
        join protegido.municipio m on m.uf_codigo = $1 and st_intersects(m.geom, p.geom) group by p.gbif_id`, [ufCodigo])).rows.map((r) => [r.gbif_id, r.codigo]),
    );
    if (municipioDe.size === 0 && vistos.size > 0) throw new Error(`nenhum ponto caiu em município da UF ${ufCodigo}: a malha municipal foi carregada?`);
    for (const r of registros) if (!motivo.has(r) && !municipioDe.has(r.gbifID)) motivo.set(r, `fora dos limites da UF ${ufCodigo} (malha municipal carregada)`);

    // Originais (inclusive rejeitados, com o motivo).
    await copiar(tx, "protegido.ocorrencia_recebida",
      ["lote_id", "conjunto_id", "gbif_id", "occurrence_id", "dataset_key", "institution_code", "collection_code", "catalog_number", "recorded_by", "record_number",
        "event_date", "ano", "scientific_name", "scientific_name_authorship", "taxon_key", "verbatim_locality", "municipality", "state_province", "decimal_latitude",
        "decimal_longitude", "coordinate_uncertainty_m", "georeference_remarks", "data_generalizations", "information_withheld", "license", "rights", "issues",
        "motivo_rejeicao", "basis_of_record", "kingdom", "phylum", "class", "\"order\"", "family", "genus", "species", "species_key", "taxon_rank",
        "verbatim_scientific_name", "iucn_red_list_category", "access_rights", "level1_gid"],
      registros.map((r) => [lote, idConjunto.get(r.datasetKey)?.id ?? null, r.gbifID, r.occurrenceID, r.datasetKey, r.institutionCode, r.collectionCode, r.catalogNumber,
        r.recordedBy, r.recordNumber, r.eventDate, r.year, r.scientificName, r.scientificNameAuthorship, r.taxonKey, r.locality, r.municipality, r.stateProvince,
        r.decimalLatitude, r.decimalLongitude, r.coordinateUncertaintyInMeters, r.georeferenceRemarks, r.dataGeneralizations, r.informationWithheld, r.license,
        r.rights, r.issue ? r.issue.split(";").filter(Boolean) : [], motivo.get(r) ?? null, r.basisOfRecord, r.kingdom, r.phylum, r.class, r.order, r.family,
        r.genus, r.species, r.speciesKey, r.taxonRank, r.verbatimScientificName, r.iucnRedListCategory, r.accessRights, r.level1Gid]));
    const idRecebida = new Map((await tx.query("select id, gbif_id from protegido.ocorrencia_recebida where lote_id = $1", [lote])).rows.map((r) => [r.gbif_id, r.id]));
    const aceitos = registros.filter((r) => !motivo.has(r));

    // Conciliação — plantas e fungos: Flora e Funga do Brasil (nome canônico do GBIF, depois o verbatim).
    const loteFlora = (await tx.query("select max(id) as id from protegido.lote where fonte_codigo = $1 and situacao = 'ok'", [fonteFlora])).rows[0].id;
    const porCanonico = new Map();
    if (loteFlora) {
      for (const n of (await tx.query(`select nome_canonico, id, especie_id, status from protegido.nome_cientifico
          where lote_id = $1 and especie_id is not null and nome_canonico is not null`, [loteFlora])).rows) {
        if (!porCanonico.has(n.nome_canonico)) porCanonico.set(n.nome_canonico, []);
        porCanonico.get(n.nome_canonico).push(n);
      }
    }
    const conciliarFlora = (r) => {
      for (const [nome, metodo] of [[r.species, "flora-funga: nome canônico do GBIF"], [canonicoVerbatim(r.verbatimScientificName), "flora-funga: nome verbatim"]]) {
        const candidatos = nome ? porCanonico.get(nome) : null;
        if (!candidatos) continue;
        const especies = new Set(candidatos.map((c) => c.especie_id));
        if (especies.size > 1) return { conciliacao: "ambiguo", metodo, nome: null };
        const escolhido = candidatos.find((c) => c.status === "aceito") ?? candidatos[0];
        return { conciliacao: "conciliado", metodo, nome: escolhido.id };
      }
      return { conciliacao: "nao_conciliado", metodo: loteFlora ? "flora-funga: sem correspondência" : "flora-funga: referência não carregada", nome: null };
    };

    // Conciliação — demais grupos: espécie do GBIF Backbone (speciesKey), como referência provisória.
    const outros = aceitos.filter((r) => !REINOS_FLORA_FUNGA.has(r.kingdom) && r.speciesKey && r.species);
    let loteTax = null;
    const nomePorChave = new Map();
    if (outros.length) {
      loteTax = (
        await tx.query(
          `insert into protegido.lote (fonte_codigo, descricao, filtros, doi, citacao, versao_fonte, versao_conector, obtido_em)
           values ($1, $2, $3, '10.15468/39omei', 'GBIF Secretariat (2023). GBIF Backbone Taxonomy. Checklist dataset https://doi.org/10.15468/39omei', '2023-08-28', $4, $5) returning id`,
          [FONTE_TAXONOMIA, `Classificação do GBIF para as espécies do download ${download.chave}`, JSON.stringify({ download: download.chave }), VERSAO_CONECTOR, download.baixado_em],
        )
      ).rows[0].id;
      const especies = new Map();
      for (const r of outros) if (!especies.has(r.speciesKey)) especies.set(r.speciesKey, r);
      const lista = [...especies.values()];
      await copiar(tx, "protegido.nome_recebido", ["lote_id", "taxon_id", "nome", "rank", "status", "reino", "filo", "classe", "ordem", "familia", "genero"],
        lista.map((r) => [loteTax, r.speciesKey, r.species, "SPECIES", "ACCEPTED", r.kingdom, r.phylum, r.class, r.order, r.family, r.genus]));
      await tx.query(
        `insert into protegido.especie (nome, familia, genero, lote_id, taxon_id, reino, filo, classe, ordem)
         select nome, familia, genero, lote_id, taxon_id, reino, filo, classe, ordem from protegido.nome_recebido where lote_id = $1`, [loteTax]);
      await tx.query(
        `insert into protegido.nome_cientifico (lote_id, recebido_id, taxon_id, nome, rank, status, nome_canonico, nome_busca, especie_id)
         select n.lote_id, n.id, n.taxon_id, n.nome, 'especie', 'aceito', n.nome, lower(n.nome), e.id
         from protegido.nome_recebido n join protegido.especie e on e.lote_id = n.lote_id and e.taxon_id = n.taxon_id
         where n.lote_id = $1`, [loteTax]);
      for (const n of (await tx.query("select id, taxon_id from protegido.nome_cientifico where lote_id = $1", [loteTax])).rows) nomePorChave.set(n.taxon_id, n.id);
    }

    // Ocorrências tratadas.
    const linhas = aceitos.map((r) => {
      const c = REINOS_FLORA_FUNGA.has(r.kingdom)
        ? conciliarFlora(r)
        : nomePorChave.has(r.speciesKey)
          ? { conciliacao: "conciliado", metodo: "gbif-taxonomia: speciesKey (referência provisória)", nome: nomePorChave.get(r.speciesKey) }
          : { conciliacao: "nao_conciliado", metodo: "gbif-taxonomia: identificação abaixo de espécie ausente", nome: null };
      const conjunto = idConjunto.get(r.datasetKey);
      return [idRecebida.get(r.gbifID), FONTE_OCORRENCIAS, r.gbifID, conjunto.id, lote, r.verbatimScientificName ?? r.scientificName ?? "(sem nome)", c.nome, c.conciliacao,
        c.metodo, dataDoEvento(r.eventDate), r.year ? Number(r.year) : null, `SRID=4674;POINT(${Number(r.decimalLongitude)} ${Number(r.decimalLatitude)})`,
        r.coordinateUncertaintyInMeters, licencaEfetiva(r.license, conjunto.licenca), r.issue ? r.issue.split(";").filter(Boolean) : [],
        Boolean(r.dataGeneralizations || r.informationWithheld), `https://www.gbif.org/occurrence/${r.gbifID}`, r.basisOfRecord, r.kingdom];
    });
    await copiar(tx, "protegido.ocorrencia",
      ["recebida_id", "fonte_codigo", "id_externo", "conjunto_id", "lote_id", "nome_recebido", "nome_cientifico_id", "conciliacao", "conciliacao_metodo",
        "data_evento", "ano", "geom", "incerteza_m", "licenca_efetiva", "alertas", "generalizada_na_fonte", "url_origem", "base_do_registro", "reino_recebido"],
      linhas);
    await tx.query(
      `insert into protegido.ocorrencia_municipio (ocorrencia_id, municipio_codigo, metodo, edicao_malha)
       select o.id, m.codigo_ibge, 'st_intersects (ponto na malha municipal)', m.edicao_malha
       from protegido.ocorrencia o join tmp_ponto p on p.gbif_id = o.id_externo
       join protegido.municipio m on m.uf_codigo = $2 and st_intersects(m.geom, p.geom)
       where o.lote_id = $1
       on conflict (ocorrencia_id) do nothing`, [lote, ufCodigo]);

    // Proteção adicional: espécies com categoria IUCN CR/EN/VU (informada pelo GBIF) ficam só por município.
    const ameacadas = aceitos.filter((r) => CATEGORIAS_AMEACADAS.has(String(r.iucnRedListCategory ?? "").toUpperCase()));
    let sensiveis = 0;
    if (ameacadas.length) {
      const lista = (await tx.query(
        `insert into protegido.lista_referencia (lote_id, nome, ato_normativo) values ($1, 'IUCN Red List — categoria informada pelo GBIF (CR, EN, VU)',
         'Lista global da IUCN; não é a lista oficial brasileira. Usada só para proteção adicional de coordenadas.') returning id`, [lote])).rows[0].id;
      const r = await tx.query(
        `insert into protegido.taxon_sensivel (especie_id, lista_id, categoria)
         select distinct n.especie_id, $2::bigint, upper(rec.iucn_red_list_category)
         from protegido.ocorrencia o join protegido.ocorrencia_recebida rec on rec.id = o.recebida_id
         join protegido.nome_cientifico n on n.id = o.nome_cientifico_id
         where o.lote_id = $1 and n.especie_id is not null and upper(rec.iucn_red_list_category) = any($3)
         on conflict do nothing`, [lote, lista, [...CATEGORIAS_AMEACADAS]]);
      sensiveis = r.affectedRows ?? 0;
    }

    // Revisão dos conjuntos deste download: classificação sobre TODOS os registros originais já recebidos de cada
    // conjunto, em todos os lotes (inclusive rejeitados). Uma aprovação de lote anterior só continua valendo se
    // ainda cobrir todos eles (decidirRevisao).
    const idsDoDownload = [...conjuntos.keys()].map((chave) => idConjunto.get(chave).id);
    const historico = (await tx.query(
      `select c.chave_externa as "datasetKey", r.license, r.rights, r.access_rights as "accessRights", l.concluido_em as "concluidoEm"
       from protegido.ocorrencia_recebida r join protegido.conjunto_dados c on c.id = r.conjunto_id join protegido.lote l on l.id = r.lote_id
       where r.conjunto_id = any($1::bigint[])`, [idsDoDownload])).rows;
    const classificacao = classificarConjuntos(historico, (chave) => idConjunto.get(chave).licenca);
    const vigentes = new Map((await tx.query(
      `select distinct on (conjunto_id) conjunto_id, tipo, decisao, licenca_confirmada, atribuicao_exigida, revisado_em
       from protegido.revisao_conjunto where conjunto_id = any($1::bigint[]) order by conjunto_id, revisado_em desc, id desc`, [idsDoDownload])).rows
      .map((r) => [r.conjunto_id, r]));
    const revisor = `conferência automática (${VERSAO_CONECTOR})`;
    const viaDownload = `Via GBIF.org, download ${download.doi ? `https://doi.org/${download.doi}` : download.chave}.`;
    let aprovadosAuto = 0, suspensos = 0, humanasPreservadas = 0;
    for (const [chave, k] of classificacao) {
      const c = conjuntos.get(chave);
      const conj = idConjunto.get(chave);
      const vigente = vigentes.get(conj.id);
      const decisao = decidirRevisao(vigente, k, historico.filter((r) => r.datasetKey === chave));
      if (decisao.acao === "aprovar") {
        await tx.query(
          `insert into protegido.revisao_conjunto (conjunto_id, revisor, tipo, licenca_confirmada, condicoes_de_uso, atribuicao_exigida, decisao, justificativa)
           values ($1, $2, 'automatica', $3, $4, $5, 'aprovado', $6)`,
          [conj.id, revisor, decisao.licenca,
            `Licença do conjunto: ${k.licenca_conjunto}. ${k.registros} registro(s) recebidos do conjunto (todos os lotes), todos com licença efetiva CC0 ou CC BY e sem campos rights/accessRights.`,
            `${c.titulo ?? chave}${c.publicador ? ` — ${c.publicador}` : ""}. ${viaDownload}`,
            "Nenhum registro do conjunto com licença efetiva CC BY-NC, licença não admitida ou termos adicionais; atribuição exibida em cada registro e na página de fontes."]);
        aprovadosAuto++;
      } else if (decisao.acao === "suspender") {
        await tx.query(
          `insert into protegido.revisao_conjunto (conjunto_id, revisor, tipo, licenca_confirmada, condicoes_de_uso, atribuicao_exigida, decisao, justificativa)
           values ($1, $2, 'automatica', null, $3, $4, 'pendente', $5)`,
          [conj.id, revisor,
            `Aprovação ${vigente.tipo} anterior (licença ${vigente.licenca_confirmada}) suspensa pelo download ${download.chave}: ${decisao.motivos.join("; ")}.`,
            vigente.atribuicao_exigida,
            "Registros recebidos do conjunto deixaram de atender às condições da aprovação vigente; o conjunto sai da camada pública até nova revisão humana. A revisão anterior continua no histórico."]);
        suspensos++;
      } else if (vigente?.tipo === "humana") humanasPreservadas++;
    }

    const porMotivo = {};
    for (const m of motivo.values()) porMotivo[m] = (porMotivo[m] ?? 0) + 1;
    const contar = (cond) => linhas.filter(cond).length;
    const relatorio = {
      download: download.chave,
      doi: download.doi,
      recebidos: registros.length,
      aceitos: aceitos.length,
      rejeitados: motivo.size,
      conciliados: contar((l) => l[7] === "conciliado"),
      nao_conciliados: contar((l) => l[7] === "nao_conciliado"),
      ambiguos: contar((l) => l[7] === "ambiguo"),
      com_alertas: contar((l) => l[14].length > 0),
      generalizadas_na_fonte: contar((l) => l[15]),
      especies_gbif_criadas: nomePorChave.size,
      especies_sensiveis_iucn: sensiveis,
      conjuntos: conjuntos.size,
      conjuntos_classificados_conferencia_automatica: [...classificacao.values()].filter((k) => k.decisao === "automatica").length,
      conjuntos_aprovados_automaticamente_neste_lote: aprovadosAuto,
      conjuntos_suspensos_neste_lote: suspensos,
      conjuntos_com_revisao_humana_preservada: humanasPreservadas,
      conjuntos_aguardando_revisao_humana: [...classificacao.values()].filter((k) => k.decisao === "revisao_humana").length,
    };
    if (relatorio.aceitos + relatorio.rejeitados !== relatorio.recebidos) throw new Error("contagens do lote não fecham");
    await tx.query(
      `update protegido.lote set situacao = 'ok', concluido_em = now(), recebidos = $2, aceitos = $3, rejeitados = $4, nao_conciliados = $5,
              sinalizados = $6, rejeicoes_por_motivo = $7, relatorio = $8 where id = $1`,
      [lote, relatorio.recebidos, relatorio.aceitos, relatorio.rejeitados, relatorio.nao_conciliados, relatorio.com_alertas, JSON.stringify(porMotivo), JSON.stringify({ validacao: relatorio })],
    );
    if (loteTax) {
      await tx.query("update protegido.lote set situacao = 'ok', concluido_em = now(), recebidos = $2, aceitos = $2, rejeitados = 0 where id = $1", [loteTax, nomePorChave.size]);
    }
    return { lote, lote_taxonomia: loteTax, ...relatorio, rejeicoes_por_motivo: porMotivo };
  });
}

// ---------------------------------------------------------------------------------------------
// Inspeção de um download (somente leitura do arquivo; nada é gravado no banco)
// ---------------------------------------------------------------------------------------------
export function inspecionarDownload(zip) {
  const dwca = abrirDwca(zip);
  if (dwca.nucleo.tipo !== "Occurrence") throw new Error(`núcleo ${dwca.nucleo.tipo} (esperado Occurrence)`);
  const registros = [...dwca.linhas(dwca.nucleo)];
  const conta = (mapa, chave) => mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
  const ordenar = (mapa, limite = 50) => Object.fromEntries([...mapa].sort((a, b) => b[1] - a[1]).slice(0, limite));

  const conjuntos = new Map();
  for (const chave of new Set(registros.map((r) => r.datasetKey))) {
    const eml = dwca.arquivo(`dataset/${chave}.xml`);
    conjuntos.set(chave, { ...(eml ? lerEml(new TextDecoder().decode(eml)) : { titulo: null, publicador: null, licenca: "ausente", direitos: null }), eml: Boolean(eml), registros: 0, nc: 0, termosExtras: 0 });
  }

  const licRegistro = new Map(), licEfetiva = new Map(), alertas = new Map(), reinos = new Map(), bases = new Map(), iucn = new Map(), ranks = new Map();
  const gbifIds = new Map(), occIds = new Map(), catalogos = new Map();
  const problemas = { sem_coordenada: 0, coordenada_zero: 0, coordenada_fora_da_faixa: 0, sem_ano: 0, ano_antes_de_2000: 0, ano_futuro: 0,
    sem_incerteza: 0, generalizado_ou_retido_na_fonte: 0, com_rights_ou_accessRights: 0, sem_especie: 0, licenca_nao_admitida: 0, fora_de_BRA_12_1: 0 };
  const anoAtual = new Date().getUTCFullYear();
  let anoMin = Infinity, anoMax = -Infinity;
  for (const r of registros) {
    const c = conjuntos.get(r.datasetKey);
    c.registros++;
    conta(licRegistro, licencaDe(r.license));
    const ef = licencaEfetiva(r.license, c.licenca);
    conta(licEfetiva, ef ?? "não admitida");
    if (!ef) problemas.licenca_nao_admitida++;
    if (ef === "CC-BY-NC-4.0") c.nc++;
    if (r.rights || r.accessRights) { problemas.com_rights_ou_accessRights++; c.termosExtras++; }
    for (const a of (r.issue ?? "").split(";").filter(Boolean)) conta(alertas, a);
    conta(reinos, r.kingdom ?? "(vazio)");
    conta(bases, r.basisOfRecord ?? "(vazio)");
    conta(ranks, r.taxonRank ?? "(vazio)");
    if (r.iucnRedListCategory) conta(iucn, r.iucnRedListCategory);
    const lat = Number(r.decimalLatitude), lon = Number(r.decimalLongitude);
    if (r.decimalLatitude == null || r.decimalLongitude == null) problemas.sem_coordenada++;
    else if (lat === 0 && lon === 0) problemas.coordenada_zero++;
    else if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) problemas.coordenada_fora_da_faixa++;
    if (r.coordinateUncertaintyInMeters == null) problemas.sem_incerteza++;
    if (r.dataGeneralizations || r.informationWithheld) problemas.generalizado_ou_retido_na_fonte++;
    if (!r.speciesKey) problemas.sem_especie++;
    if (r.level1Gid && r.level1Gid !== "BRA.12_1") problemas.fora_de_BRA_12_1++;
    const ano = Number(r.year);
    if (r.year == null) problemas.sem_ano++;
    else { anoMin = Math.min(anoMin, ano); anoMax = Math.max(anoMax, ano); if (ano < 2000) problemas.ano_antes_de_2000++; if (ano > anoAtual) problemas.ano_futuro++; }
    conta(gbifIds, r.gbifID);
    if (r.occurrenceID) conta(occIds, `${r.datasetKey}|${r.occurrenceID}`);
    if (r.catalogNumber) conta(catalogos, `${r.institutionCode ?? ""}|${r.collectionCode ?? ""}|${r.catalogNumber}`);
  }
  const repetidos = (mapa) => [...mapa.values()].filter((n) => n > 1);
  const especies = new Set(registros.map((r) => r.speciesKey).filter(Boolean));
  // Mesma classificação usada na carga (classificarConjuntos).
  const classificacao = classificarConjuntos(registros, (chave) => conjuntos.get(chave).licenca);
  const revisaoHumana = [...classificacao].filter(([, k]) => k.decisao === "revisao_humana")
    .map(([chave, k]) => ({ chave, titulo: conjuntos.get(chave).titulo, publicador: conjuntos.get(chave).publicador, licenca_conjunto: k.licenca_conjunto, registros: k.registros,
      registros_cc_by_nc: k.cc_by_nc, registros_com_termos_extras: k.termos_adicionais, registros_licenca_nao_admitida: k.licenca_nao_admitida, motivos: k.motivos }))
    .sort((a, b) => b.registros - a.registros);
  const automaticos = [...classificacao.values()].filter((k) => k.decisao === "automatica");

  return {
    arquivos_no_pacote: Object.keys(dwca.extensoes).length + 1,
    extensoes: dwca.extensoes.map((e) => e.tipo),
    tem_verbatim: Boolean(dwca.arquivo("verbatim.txt")),
    tem_citations: Boolean(dwca.arquivo("citations.txt")),
    tem_rights: Boolean(dwca.arquivo("rights.txt")),
    registros: registros.length,
    anos: { min: anoMin, max: anoMax },
    especies_distintas_gbif: especies.size,
    conjuntos: conjuntos.size,
    conjuntos_sem_eml: [...conjuntos.values()].filter((c) => !c.eml).length,
    licenca_do_registro: ordenar(licRegistro),
    licenca_efetiva: ordenar(licEfetiva),
    licenca_dos_conjuntos: ordenar(new Map([...conjuntos.values()].reduce((m, c) => m.set(c.licenca, (m.get(c.licenca) ?? 0) + 1), new Map()))),
    problemas,
    alertas_gbif: ordenar(alertas, 20),
    reinos: ordenar(reinos),
    bases_do_registro: ordenar(bases),
    nivel_taxonomico: ordenar(ranks),
    iucn: ordenar(iucn),
    duplicidades: {
      gbifID_repetidos: repetidos(gbifIds).length,
      occurrenceID_repetidos_no_mesmo_conjunto: repetidos(occIds).length,
      registros_em_occurrenceID_repetido: repetidos(occIds).reduce((s, n) => s + n, 0),
      catalogo_repetido_instituicao_colecao_numero: repetidos(catalogos).length,
      registros_em_catalogo_repetido: repetidos(catalogos).reduce((s, n) => s + n, 0),
    },
    conferencia_automatica: { conjuntos: automaticos.length, registros: automaticos.reduce((s, k) => s + k.registros, 0),
      por_licenca: automaticos.reduce((m, k) => { for (const [l, n] of Object.entries(k.efetivas)) m[l] = (m[l] ?? 0) + n; return m; }, {}) },
    revisao_humana: { conjuntos: revisaoHumana.length, registros: revisaoHumana.reduce((s, c) => s + c.registros, 0), lista: revisaoHumana },
  };
}

// ---------------------------------------------------------------------------------------------
// Pedido, situação e download (API do GBIF)
// ---------------------------------------------------------------------------------------------
function credenciais() {
  const local = join(RAIZ, ".env.local");
  if (existsSync(local)) process.loadEnvFile(local);
  const usuario = process.env.GBIF_USUARIO;
  const senha = process.env.GBIF_SENHA;
  if (!usuario || !senha) throw new Error("defina GBIF_USUARIO e GBIF_SENHA no .env.local (ignorado pelo Git) ou no ambiente");
  return { usuario, autorizacao: `Basic ${Buffer.from(`${usuario}:${senha}`).toString("base64")}` };
}

const lerJson = async (caminho, padrao) => (existsSync(caminho) ? JSON.parse(await readFile(caminho, "utf8")) : padrao);
const gravarDownloads = (d) => writeFile(DOWNLOADS, JSON.stringify(d, null, 2) + "\n");

async function avaliar(nome) {
  const def = (await lerJson(LOTES)).lotes[nome];
  if (!def) throw new Error(`lote desconhecido: ${nome}`);
  const consulta = async (extra) => (await fetch(`${API}/occurrence/search?${def.filtros_busca}&limit=0${extra}`)).json();
  const total = await consulta("&facet=license");
  const conjuntos = await consulta("&facet=datasetKey&facetLimit=2000");
  const nc = await consulta("&license=CC_BY_NC_4_0&facet=datasetKey&facetLimit=2000");
  return {
    lote: nome,
    medido_em: new Date().toISOString(),
    ocorrencias: total.count,
    por_licenca: Object.fromEntries(total.facets[0].counts.map((c) => [c.name, c.count])),
    conjuntos: conjuntos.facets[0].counts.length,
    conjuntos_cc_by_nc: nc.facets[0]?.counts.length ?? 0,
  };
}

async function solicitar(nome) {
  const def = (await lerJson(LOTES)).lotes[nome];
  if (!def) throw new Error(`lote desconhecido: ${nome}`);
  const { usuario, autorizacao } = credenciais();
  const resposta = await fetch(`${API}/occurrence/download/request`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: autorizacao },
    body: JSON.stringify({ creator: usuario, sendNotification: false, format: "DWCA", predicate: def.predicado }),
  });
  const texto = (await resposta.text()).trim();
  if (!resposta.ok) throw new Error(`GBIF recusou o pedido (HTTP ${resposta.status}): ${texto.slice(0, 300)}`);
  const downloads = await lerJson(DOWNLOADS, { downloads: [] });
  downloads.downloads.push({ lote: nome, chave: texto, solicitado_em: new Date().toISOString() });
  await gravarDownloads(downloads);
  return texto;
}

async function situacao(chave) {
  const d = await (await fetch(`${API}/occurrence/download/${chave}`)).json();
  return { chave: d.key, situacao: d.status, doi: d.doi, registros: d.totalRecords, conjuntos: d.numberDatasets, tamanho_bytes: d.size, licenca: d.license, link: d.downloadLink, criado: d.created };
}

async function baixar(chave) {
  const s = await situacao(chave);
  if (s.situacao !== "SUCCEEDED") throw new Error(`download ${chave} ainda não está pronto (situação: ${s.situacao})`);
  const resposta = await fetch(s.link);
  if (!resposta.ok) throw new Error(`${s.link}: HTTP ${resposta.status}`);
  const dados = Buffer.from(await resposta.arrayBuffer());
  const destino = join(RAIZ, "dados", "originais", "gbif", `${chave}.zip`);
  await mkdir(join(RAIZ, "dados", "originais", "gbif"), { recursive: true });
  await writeFile(destino, dados);
  const downloads = await lerJson(DOWNLOADS, { downloads: [] });
  let item = downloads.downloads.find((x) => x.chave === chave);
  if (!item) downloads.downloads.push((item = { chave }));
  Object.assign(item, {
    doi: s.doi, citacao: `GBIF.org (${s.criado.slice(0, 10)}) GBIF Occurrence Download https://doi.org/${s.doi}`, licenca: s.licenca,
    registros: s.registros, conjuntos: s.conjuntos, link: s.link, tamanho_bytes: dados.byteLength, sha256: sha256(dados),
    caminho_local: `dados/originais/gbif/${chave}.zip`, baixado_em: new Date().toISOString(),
  });
  await gravarDownloads(downloads);
  return item;
}

if (import.meta.main) {
  const [comando, alvo] = process.argv.slice(2);
  const opcao = (nome) => {
    const i = process.argv.indexOf(`--${nome}`);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  if (comando === "avaliar") console.log(JSON.stringify(await avaliar(alvo), null, 2));
  else if (comando === "solicitar") console.log(`download solicitado: ${await solicitar(alvo)} (acompanhe com: npm run gbif -- situacao <chave>)`);
  else if (comando === "situacao") console.log(JSON.stringify(await situacao(alvo), null, 2));
  else if (comando === "baixar") console.log(JSON.stringify(await baixar(alvo), null, 2));
  else if (comando === "inspecionar") {
    const downloads = await lerJson(DOWNLOADS, { downloads: [] });
    const download = downloads.downloads.find((d) => d.chave === alvo);
    if (!download?.sha256) throw new Error(`download ${alvo} não foi baixado (rode: npm run gbif -- baixar ${alvo})`);
    const zip = await readFile(join(RAIZ, download.caminho_local));
    if (sha256(zip) !== download.sha256) throw new Error(`SHA-256 de ${download.caminho_local} difere do registrado`);
    console.log(JSON.stringify({ chave: alvo, lote: download.lote, doi: download.doi, ...inspecionarDownload(zip) }, null, 2));
  }
  else if (comando === "carregar") {
    const downloads = await lerJson(DOWNLOADS, { downloads: [] });
    const download = downloads.downloads.find((d) => d.chave === alvo);
    if (!download?.sha256) throw new Error(`download ${alvo} não foi baixado (rode: npm run gbif -- baixar ${alvo})`);
    const zip = await readFile(join(RAIZ, download.caminho_local));
    if (sha256(zip) !== download.sha256) throw new Error(`SHA-256 de ${download.caminho_local} difere do registrado`);
    const loteDef = (await lerJson(LOTES)).lotes[download.lote];
    const { abrirBancoLocal } = await import("../banco/local.mjs");
    const db = await abrirBancoLocal();
    const ja = await db.query("select 1 from protegido.lote where fonte_codigo = $1 and versao_fonte = $2 and situacao = 'ok'", [FONTE_OCORRENCIAS, alvo]);
    if (ja.rows.length) console.log(`o download ${alvo} já está carregado; nada a fazer.`);
    else console.log(JSON.stringify(await carregarDownload(db, { zip, download, loteDef }), null, 2));
    await db.close();
  } else if (comando === "pendentes") {
    const { abrirBancoLocal } = await import("../banco/local.mjs");
    const db = await abrirBancoLocal();
    const { rows } = await db.query(`
      select c.chave_externa, c.titulo, c.publicador, c.licenca, c.direitos_verbatim, count(o.id)::int as ocorrencias
      from protegido.conjunto_dados c left join protegido.ocorrencia o on o.conjunto_id = c.id
      where c.fonte_codigo = $1 and not exists (select 1 from protegido.revisao_vigente rv where rv.conjunto_id = c.id and rv.decisao <> 'pendente')
      group by c.id order by ocorrencias desc`, [FONTE_OCORRENCIAS]);
    for (const r of rows) console.log(`${String(r.ocorrencias).padStart(6)}  ${r.licenca.padEnd(13)} ${r.chave_externa}  ${r.titulo}${r.publicador ? ` — ${r.publicador}` : ""}\n        https://www.gbif.org/dataset/${r.chave_externa}${r.direitos_verbatim ? `\n        direitos: ${r.direitos_verbatim.slice(0, 200)}` : ""}`);
    console.log(`${rows.length} conjuntos aguardando revisão humana.`);
    await db.close();
  } else if (comando === "revisar") {
    const campos = ["conjunto", "decisao", "revisor", "licenca", "condicoes", "atribuicao", "justificativa"].map((n) => [n, opcao(n)]);
    const faltando = campos.filter(([, v]) => !v).map(([n]) => `--${n}`);
    if (faltando.length) throw new Error(`faltam: ${faltando.join(", ")}`);
    const v = Object.fromEntries(campos);
    const { abrirBancoLocal } = await import("../banco/local.mjs");
    const db = await abrirBancoLocal();
    const conj = (await db.query("select id from protegido.conjunto_dados where fonte_codigo = $1 and chave_externa = $2", [FONTE_OCORRENCIAS, v.conjunto])).rows[0];
    if (!conj) throw new Error(`conjunto ${v.conjunto} não encontrado`);
    await db.query(
      `insert into protegido.revisao_conjunto (conjunto_id, revisor, tipo, licenca_confirmada, condicoes_de_uso, atribuicao_exigida, decisao, justificativa)
       values ($1, $2, 'humana', $3, $4, $5, $6, $7)`, [conj.id, v.revisor, v.licenca, v.condicoes, v.atribuicao, v.decisao, v.justificativa]);
    console.log(`revisão humana registrada: ${v.conjunto} → ${v.decisao}`);
    await db.close();
  } else {
    console.error("uso: node scripts/ingestao/gbif.mjs avaliar|solicitar <lote> | situacao|baixar|carregar <chave> | pendentes | revisar --conjunto … (ver cabeçalho)");
    process.exit(2);
  }
}
