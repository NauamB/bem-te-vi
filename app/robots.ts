import type { MetadataRoute } from "next";
import { site } from "@/lib/config/site";

// /acesso NÃO entra em Disallow de propósito: um robô bloqueado não lê a página e, portanto, não vê o noindex.
// A não indexação de /acesso é garantida pela meta robots da página e pelo cabeçalho X-Robots-Tag (next.config.ts),
// e a rota fica fora do sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
