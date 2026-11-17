// Identidade e navegação do Bem-te-vi. Fonte única para textos institucionais repetidos.

export const site = {
  nome: "Bem-te-vi",
  titulo: "Bem-te-vi — Plataforma de Inteligência da Biodiversidade",
  assinatura: "Mato Grosso · Flora · Fauna · Território",
  descricao:
    "Uma plataforma de inteligência da biodiversidade que conecta informações sobre espécies, ocorrências e territórios para ampliar o conhecimento sobre a natureza.",
  // Domínio oficial de produção (Vercel). Usado em metadados absolutos, robots.txt e sitemap.xml.
  url: "https://bem-te-vi-zeta.vercel.app",
  versao: "0.1.0",
  fase: "Projeto piloto em desenvolvimento — Mato Grosso",
  aviso:
    "Projeto independente em desenvolvimento. Não é serviço oficial de órgão público ou instituição, e ainda não publica dados de biodiversidade.",
} as const;

export type ItemNavegacao = { rotulo: string; href: string };

export const navegacaoInstitucional: ItemNavegacao[] = [
  { rotulo: "A plataforma", href: "/#plataforma" },
  { rotulo: "Princípios", href: "/#principios" },
  { rotulo: "Mato Grosso", href: "/#mato-grosso" },
  { rotulo: "Estado do projeto", href: "/#estado" },
];

export const rotas = {
  inicio: "/",
  explorar: "/explorar",
  acessoInterno: "/acesso",
  plataforma: "/#plataforma",
} as const;

// Únicas páginas públicas e indexáveis que existem hoje. /acesso fica de fora (noindex). Não incluir rotas futuras.
export const rotasIndexaveis = [rotas.inicio, rotas.explorar] as const;
