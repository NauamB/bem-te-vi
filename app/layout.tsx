import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Manrope } from "next/font/google";
import { site } from "@/lib/config/site";
import "./globals.css";

// Fontes com licença SIL Open Font License, embutidas no build pelo next/font (sem requisição externa no navegador).
const titulo = Manrope({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-titulo", display: "swap" });
const texto = Inter({ subsets: ["latin"], variable: "--font-texto", display: "swap" });
const dados = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dados", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.titulo, template: `%s · ${site.nome}` },
  description: site.descricao,
  applicationName: site.nome,
  openGraph: { type: "website", locale: "pt_BR", siteName: site.nome, title: site.titulo, description: site.descricao },
  // A imagem de compartilhamento vem de app/opengraph-image.tsx e app/twitter-image.tsx.
  twitter: { card: "summary_large_image", title: site.titulo, description: site.descricao },
};

export const viewport: Viewport = {
  themeColor: "#082f1a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${titulo.variable} ${texto.variable} ${dados.variable}`}>
      <body className="min-h-dvh antialiased">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-laranja-500 focus:px-5 focus:py-3 focus:font-semibold focus:text-verde-950"
        >
          Ir para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
