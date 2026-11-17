import { BiodiversidadeIntegrada } from "@/components/presentation/biodiversidade-integrada";
import { EstadoDoProjeto } from "@/components/presentation/estado-do-projeto";
import { FontesDeInformacao } from "@/components/presentation/fontes-de-informacao";
import { Hero } from "@/components/presentation/hero";
import { Indicadores } from "@/components/presentation/indicadores";
import { MatoGrosso } from "@/components/presentation/mato-grosso";
import { Principios } from "@/components/presentation/principios";

// Página de apresentação: porta de entrada do Bem-te-vi, antes de qualquer painel.
export default function PaginaApresentacao() {
  return (
    <>
      <Hero />
      <BiodiversidadeIntegrada />
      <Indicadores />
      <MatoGrosso />
      <Principios />
      <FontesDeInformacao />
      <EstadoDoProjeto />
    </>
  );
}
