// Imagem do Twitter/X Card (a mesma do Open Graph). Desenho em lib/paginas/imagem-compartilhamento.tsx.
import { imagemCompartilhamento } from "@/lib/paginas/imagem-compartilhamento";

export const alt = "Bem-te-vi — Plataforma de Inteligência da Biodiversidade. Mato Grosso · Flora · Fauna · Território.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return imagemCompartilhamento();
}
