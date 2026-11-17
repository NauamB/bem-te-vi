// Download Darwin Core Archive SINTÉTICO do GBIF para os testes (conector e publicador). Nenhum dado real.
import { strToU8, zipSync } from "fflate";

export const CAMPOS = ["gbifID", "datasetKey", "occurrenceID", "basisOfRecord", "kingdom", "phylum", "class", "order", "family", "genus", "species", "speciesKey",
  "taxonRank", "scientificName", "verbatimScientificName", "decimalLatitude", "decimalLongitude", "coordinateUncertaintyInMeters", "eventDate", "year",
  "license", "rights", "accessRights", "dataGeneralizations", "informationWithheld", "iucnRedListCategory", "issue", "locality"];
export const TERMO = (c) => (c === "gbifID" || c === "iucnRedListCategory" ? `http://rs.gbif.org/terms/1.0/${c}` : `http://rs.tdwg.org/dwc/terms/${c}`);
export const BY = "http://creativecommons.org/licenses/by/4.0/legalcode";
export const BYNC = "http://creativecommons.org/licenses/by-nc/4.0/legalcode";

// Registros sintéticos: [gbifID, datasetKey, kingdom, species, speciesKey, verbatim, lat, lon, ano, licença, extras]
export const REGISTROS = [
  ["P1", "D1", "Plantae", "Sinteticus communis", "", "Sinteticus communis Teste", "0.45", "0.15", "2020", BY, {}],
  ["P2", "D1", "Plantae", "", "", "Sinteticus vetus Teste", "0.55", "0.25", "2019", BY, {}],
  ["P3", "D1", "Plantae", "Sinteticus ignotus", "", "Sinteticus ignotus", "0.65", "1.35", "2018", BY, {}],
  ["A1", "D2", "Animalia", "Animalis sinteticus", "9001", "Animalis sinteticus", "0.35", "1.55", "2015", BYNC, {}],
  ["A2", "D1", "Animalia", "Animalis ameacadus", "9002", "Animalis ameacadus", "0.75", "0.85", "2016", BY, { iucnRedListCategory: "EN" }],
  ["A3", "D1", "Animalia", "", "", "Animalis sp.", "0.25", "1.25", "2017", BY, {}],
  ["X1", "D3", "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0.15", "0.55", "2021", BY, { rights: "[SINTÉTICO] Uso sujeito a termos do publicador" }],
  ["R1", "D1", "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0.5", "5.5", "2020", BY, {}],
  ["R2", "D1", "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0", "0", "2020", BY, {}],
  ["R4", "D4", "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0.5", "0.5", "2020", "http://creativecommons.org/licenses/by-sa/4.0/legalcode", {}],
  ["R5", "D1", "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0.5", "0.5", "2999", BY, {}],
];

export function dwcaSintetico(registros = REGISTROS, licencas = { D1: BY, D2: BYNC, D3: BY, D4: BY }) {
  const meta = `<archive xmlns="http://rs.tdwg.org/dwc/text/">
    <core encoding="UTF-8" fieldsTerminatedBy="\\t" linesTerminatedBy="\\n" fieldsEnclosedBy="" ignoreHeaderLines="1" rowType="http://rs.tdwg.org/dwc/terms/Occurrence">
      <files><location>occurrence.txt</location></files><id index="0"/>
      ${CAMPOS.map((c, i) => `<field index="${i}" term="${TERMO(c)}"/>`).join("\n      ")}
    </core></archive>`;
  const linhas = registros.map(([g, d, k, sp, key, verb, lat, lon, ano, lic, extra]) => {
    const r = { gbifID: g, datasetKey: d, occurrenceID: `occ-${g}`, basisOfRecord: "PRESERVED_SPECIMEN", kingdom: k, species: sp, speciesKey: key,
      taxonRank: sp ? "SPECIES" : "GENUS", scientificName: verb, verbatimScientificName: verb, decimalLatitude: lat, decimalLongitude: lon, year: ano,
      eventDate: `${ano}-05-10`, license: lic, locality: `[SINTÉTICO] localidade precisa ${g}`, issue: g === "P1" ? "COORDINATE_ROUNDED" : "", ...extra };
    return CAMPOS.map((c) => r[c] ?? "").join("\t");
  });
  const eml = (titulo, licenca) => `<eml><dataset><title>${titulo}</title><creator><organizationName>[SINTÉTICO] Instituição</organizationName></creator>
    <intellectualRights><para>[SINTÉTICO] <ulink url="${licenca}"><citetitle>licença</citetitle></ulink></para></intellectualRights></dataset></eml>`;
  return zipSync({
    "meta.xml": strToU8(meta),
    "occurrence.txt": strToU8([CAMPOS.join("\t"), ...linhas].join("\n") + "\n"),
    ...Object.fromEntries(Object.entries(licencas).map(([d, l]) => [`dataset/${d}.xml`, strToU8(eml(`[SINTÉTICO] Conjunto ${d}`, l))])),
  });
}
