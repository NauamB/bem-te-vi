// Imagem de compartilhamento (Open Graph e Twitter Card), gerada no build pelo next/og (já incluído no Next.js).
// Usa só a marca e as cores da identidade: nenhuma fotografia (as fotos CC BY-SA exigiriam crédito na própria imagem).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/lib/config/site";

const TAMANHO = { width: 1200, height: 630 };

const FOLHA = "M5 39C15 26 39 21.5 59 30.5C50 46.5 25 52.5 5 39Z";

// Manrope ExtraBold, a fonte do nome na marca (licença OFL; origem em lib/paginas/fontes/LEIAME.md).
const manrope = () => readFile(join(process.cwd(), "lib", "paginas", "fontes", "Manrope-ExtraBold.ttf"));

export async function imagemCompartilhamento() {
  const fonteNome = await manrope();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#082f1a", color: "#ffffff", padding: "72px 80px" }}>
        {/* Curvas de nível decorativas, no canto direito. */}
        <svg width="560" height="630" viewBox="0 0 560 630" style={{ position: "absolute", right: 0, top: 0 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <path
              key={i}
              d={`M${40 + i * 22} 630C${120 + i * 18} ${470 - i * 30} ${60 + i * 26} ${300 - i * 22} ${220 + i * 20} ${180 - i * 14}S${480 - i * 6} ${40 + i * 6} 560 ${20 + i * 24}`}
              fill="none"
              stroke="#a9d1b7"
              strokeOpacity="0.14"
              strokeWidth="2"
            />
          ))}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
          <svg width="240" height="184" viewBox="2 9 60 46">
            <defs>
              <clipPath id="f">
                <path d={FOLHA} />
              </clipPath>
            </defs>
            <path d="M7.5 27C19 16.5 41 12 60.5 19C43 16.5 24.5 19.5 11 29.5Z" fill="#eaf4ee" />
            <g clipPath="url(#f)">
              <rect x="0" y="0" width="64" height="64" fill="#3e9b5e" />
              <path d="M0 41.5C10 38.5 19 43 30 40S50 32.5 64 34.5V64H0Z" fill="#3a9cc0" />
              <path d="M0 47.5C11 44.5 20 49 31 46S52 39 64 41" fill="none" stroke="#eaf4ee" strokeOpacity=".4" strokeWidth="1.1" />
              <path d="M0 34C12 31 22 34 32 31S52 25 64 27" fill="none" stroke="#eaf4ee" strokeOpacity=".3" strokeWidth="1.1" />
            </g>
            <path d={FOLHA} fill="none" stroke="#eaf4ee" strokeWidth="2.4" strokeLinejoin="round" />
            <circle cx="31" cy="37.5" r="9.6" fill="#eaf4ee" stroke="#eaf4ee" strokeWidth="2.2" />
            <circle cx="31" cy="37.5" r="6.4" fill="none" stroke="#0f4c28" strokeWidth="1" strokeOpacity=".5" />
            <circle cx="31" cy="37.5" r="3.9" fill="#f97316" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Manrope", fontSize: 140, fontWeight: 800, letterSpacing: "-5px", lineHeight: 1 }}>{site.nome}</div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 28 }}>
              <div style={{ width: 56, height: 6, background: "#f97316", marginRight: 22 }} />
              <div style={{ fontSize: 38, color: "#d4e8db" }}>Plataforma de Inteligência da Biodiversidade</div>
            </div>
            <div style={{ fontSize: 26, color: "#7db892", letterSpacing: "6px", marginTop: 34, textTransform: "uppercase" }}>{site.assinatura}</div>
          </div>
        </div>
      </div>
    ),
    { ...TAMANHO, fonts: [{ name: "Manrope", data: fonteNome, weight: 800, style: "normal" }] },
  );
}
