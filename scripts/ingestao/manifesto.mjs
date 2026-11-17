// Manifestos versionados de fontes (dados/referencias/*.json): baixa cada arquivo para dados/originais/
// (ignorado pelo Git) e confere tamanho e SHA-256. Divergência é erro: a fonte mudou ou o arquivo corrompeu,
// e a nova versão exige revisão e manifesto novo.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const RAIZ = join(import.meta.dirname, "..", "..");

export const sha256 = (dados) => createHash("sha256").update(dados).digest("hex");
export const caminhoLocal = (arquivo) => join(RAIZ, arquivo.caminho_local);

export async function lerManifesto(caminho) {
  return JSON.parse(await readFile(caminho, "utf8"));
}

export async function baixarArquivos(manifesto, { forcar = false } = {}) {
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

export async function lerArquivo(arquivo) {
  return readFile(caminhoLocal(arquivo));
}
