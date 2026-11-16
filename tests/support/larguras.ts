// Larguras de tela validadas pelo projeto (celular, tablet e computador).
export const LARGURAS = [360, 390, 430, 768, 1024, 1366, 1920] as const;

// Abaixo desta largura o cabeçalho mostra o menu móvel (classe lg: do Tailwind = 1024 px).
export const LARGURA_MENU_COMPLETO = 1024;

// Abaixo desta largura a página é tratada como celular (toque e viewport móvel).
export const LARGURA_TABLET = 768;

export const ALTURA_PADRAO = 900;

// Alvo de toque mínimo adotado pelo projeto (altura) e mínimo absoluto de largura (WCAG 2.5.8: 24 px).
export const ALVO_MINIMO_ALTURA = 44;
export const ALVO_MINIMO_LARGURA = 24;

export const ROTAS_PUBLICAS = ["/", "/explorar", "/acesso"] as const;
