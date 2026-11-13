import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import { site } from "@/lib/config/site";
import "./globals.css";

// Fontes com licença SIL Open Font License, embutidas no build pelo next/font (sem requisição externa no navegador).
const titulo = Fraunces({ subsets: ["latin"], variable: "--font-titulo", display: "swap" });
const texto = Inter({ subsets: ["latin"], variable: "--font-texto", display: "swap" });
const dados = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dados", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.titulo, template: `%s · ${site.nome}` },
  description: site.descricao,
  applicationName: site.nome,
  openGraph: { type: "website", locale: "pt_BR", siteName: site.nome, title: site.titulo, description: site.descricao },
};

export const viewport: Viewport = {
  themeColor: "#1b4430",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${titulo.variable} ${texto.variable} ${dados.variable}`}>
      <body className="min-h-dvh antialiased">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-sol-300 focus:px-4 focus:py-3 focus:text-grafite-900"
        >
          Ir para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
