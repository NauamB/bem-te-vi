import type { MetadataRoute } from "next";
import { rotasIndexaveis, site } from "@/lib/config/site";

// Só as páginas públicas existentes. Sem lastModified: não há data de conteúdo confiável a anunciar.
export default function sitemap(): MetadataRoute.Sitemap {
  return rotasIndexaveis.map((rota) => ({ url: rota === "/" ? site.url : `${site.url}${rota}` }));
}
