import { defineConfig, devices } from "@playwright/test";

// Testes de ponta a ponta do Bem-te-vi contra o servidor de PRODUÇÃO local (next start), nunca contra
// a implantação pública. O build precisa existir antes: `npm run test:e2e` faz o build; na CI, o build é
// um passo próprio do workflow e os testes são executados em seguida.
const PORTA = 3200;
const ENDERECO = `http://127.0.0.1:${PORTA}`;
const CI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [["github"], ["list"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: ENDERECO,
    // Desliga a rolagem suave (prefers-reduced-motion), para não depender do tempo de animação.
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start --hostname 127.0.0.1 --port ${PORTA}`,
    url: ENDERECO,
    // Nunca reaproveita um servidor já aberto: garante que o teste use o build atual.
    reuseExistingServer: false,
    timeout: 60_000,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
