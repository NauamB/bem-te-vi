import { test as base, expect } from "@playwright/test";

// Fixture automática: todo teste que abre páginas falha se houver erro de JavaScript, console.error,
// requisição com falha ou resposta HTTP >= 400 inesperada.
//
// Exceções documentadas:
// 1. `respostasPermitidas`: o teste declara as URLs cuja resposta de erro é o próprio objeto do teste
//    (ex.: o documento 404). O console.error correspondente do Chromium ("Failed to load resource") também é aceito.
// 2. net::ERR_ABORTED: o Next.js cancela pré-carregamentos (prefetch/RSC) quando a navegação muda de destino;
//    o Chromium registra isso como requisição abortada. Não é falha da aplicação.

type Opcoes = { respostasPermitidas: RegExp[] };

export const test = base.extend<Opcoes & { monitorDeFalhas: void }>({
  respostasPermitidas: [[], { option: true }],
  monitorDeFalhas: [
    async ({ page, respostasPermitidas }, use) => {
      const falhas: string[] = [];
      const permitida = (url: string) => respostasPermitidas.some((padrao) => padrao.test(url));

      page.on("pageerror", (erro) => falhas.push(`erro de JavaScript: ${erro.message}`));
      page.on("console", (mensagem) => {
        if (mensagem.type() !== "error") return;
        if (permitida(mensagem.location().url ?? "")) return;
        falhas.push(`console.error: ${mensagem.text()}`);
      });
      page.on("requestfailed", (requisicao) => {
        const erro = requisicao.failure()?.errorText ?? "desconhecido";
        if (erro === "net::ERR_ABORTED") return;
        falhas.push(`requisição com falha (${erro}): ${requisicao.url()}`);
      });
      page.on("response", (resposta) => {
        if (resposta.status() >= 400 && !permitida(resposta.url())) falhas.push(`HTTP ${resposta.status()}: ${resposta.url()}`);
      });

      await use();

      expect(falhas, "falhas inesperadas de console ou rede").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

// Números que podem aparecer na interface. Qualquer outro número indicaria dado não previsto
// (ex.: contagem de espécies ou registros), o que a plataforma ainda não publica.
//   01–05  ordinais das dimensões e dos princípios
//   142    municípios de Mato Grosso (IBGE)
//   0.1.0  versão do produto
//   10     rótulo de fase ("Fase 10C")
//   404    código da página não encontrada
export const NUMEROS_PERMITIDOS = new Set(["01", "02", "03", "04", "05", "142", "0.1.0", "10", "404"]);

export const extrairNumeros = (texto: string) => [...new Set(texto.match(/\d+(?:[.,]\d+)*/g) ?? [])];
