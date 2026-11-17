// Leitor de Darwin Core Archive (DwC-A): lê o meta.xml e devolve, para o núcleo e cada extensão,
// as linhas como objetos indexados pelo termo Darwin Core (ex.: "scientificName", "vernacularName").
// Suporta o formato usado pelo IPT e pelos downloads do GBIF: texto UTF-8, separado por tabulação, sem aspas.
import { unzipSync } from "fflate";

const termoCurto = (uri) => uri.replace(/^.*[/#]/, "");

function lerArquivoMeta(xml, tag) {
  const blocos = [...xml.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, "g"))];
  return blocos.map(([, atributos, corpo]) => {
    const atributo = (nome) => atributos.match(new RegExp(`${nome}="([^"]*)"`))?.[1];
    const campos = [...corpo.matchAll(/<field\b[^>]*index="(\d+)"[^>]*term="([^"]+)"/g)].map(([, i, t]) => ({ indice: Number(i), termo: termoCurto(t) }));
    const id = corpo.match(/<(?:id|coreid)\s+index="(\d+)"/)?.[1];
    return {
      tipo: termoCurto(atributo("rowType")),
      arquivo: corpo.match(/<location>([^<]+)<\/location>/)?.[1],
      separador: (atributo("fieldsTerminatedBy") ?? "\\t").replace("\\t", "\t"),
      delimitador: atributo("fieldsEnclosedBy") ?? "",
      cabecalho: Number(atributo("ignoreHeaderLines") ?? 0),
      codificacao: atributo("encoding") ?? "UTF-8",
      campos,
      indiceId: id === undefined ? null : Number(id),
    };
  });
}

export function abrirDwca(zipBuffer) {
  const zip = unzipSync(zipBuffer);
  const meta = new TextDecoder().decode(zip["meta.xml"]);
  const [nucleo] = lerArquivoMeta(meta, "core");
  const extensoes = lerArquivoMeta(meta, "extension");
  for (const parte of [nucleo, ...extensoes]) {
    if (parte.delimitador) throw new Error(`${parte.arquivo}: campos entre aspas não são suportados`);
    if (parte.codificacao.toUpperCase() !== "UTF-8") throw new Error(`${parte.arquivo}: codificação ${parte.codificacao} não suportada`);
    if (!zip[parte.arquivo]) throw new Error(`arquivo ${parte.arquivo} citado no meta.xml não está no pacote`);
  }

  // Itera as linhas de uma parte como objetos { id, termo: valor }. Valores vazios viram null.
  function* linhas(parte) {
    const texto = new TextDecoder("utf-8", { fatal: true }).decode(zip[parte.arquivo]);
    let inicio = 0;
    let numero = 0;
    while (inicio < texto.length) {
      let fim = texto.indexOf("\n", inicio);
      if (fim === -1) fim = texto.length;
      const linha = texto.slice(inicio, fim).replace(/\r$/, "");
      inicio = fim + 1;
      numero++;
      if (numero <= parte.cabecalho || linha === "") continue;
      const valores = linha.split(parte.separador);
      const registro = { id: parte.indiceId === null ? null : valores[parte.indiceId] || null };
      for (const c of parte.campos) registro[c.termo] = valores[c.indice] === undefined || valores[c.indice] === "" ? null : valores[c.indice];
      yield registro;
    }
  }

  return {
    nucleo,
    extensoes,
    extensao: (tipo) => extensoes.find((e) => e.tipo === tipo) ?? null,
    linhas,
    arquivo: (nome) => zip[nome] ?? null,
  };
}
