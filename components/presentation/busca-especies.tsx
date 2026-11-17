import Form from "next/form";
import { rotas } from "@/lib/config/site";
import { IconeBusca } from "@/components/ui/icones";

// Busca de espécies em destaque. Envia para /explorar?q=…, onde a busca usa a API pública (/api/v1/especies).
// Funciona sem JavaScript (formulário GET); com JavaScript, o next/form navega sem recarregar a página.
export function BuscaEspecies() {
  return (
    <Form action={rotas.explorar} role="search" aria-label="Buscar espécies" className="mt-12 max-w-3xl">
      <label htmlFor="busca-inicio" className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-verde-200">
        Buscar espécie
      </label>
      <div className="mt-3 flex flex-col gap-2 rounded-[1.25rem] bg-white p-2 shadow-elevado sm:flex-row">
        <div className="relative flex-1">
          <IconeBusca className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-tinta-500" />
          <input
            id="busca-inicio"
            name="q"
            type="search"
            required
            minLength={3}
            autoComplete="off"
            placeholder="Nome científico ou popular"
            className="h-13 w-full rounded-xl bg-transparent pl-12 pr-4 text-base text-tinta-950 placeholder:text-tinta-500 focus-visible:outline-offset-0"
          />
        </div>
        <button type="submit" className="h-13 rounded-xl bg-verde-800 px-7 text-base font-semibold text-white transition-colors hover:bg-verde-700">
          Buscar
        </button>
      </div>
    </Form>
  );
}
