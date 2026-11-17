// Perfil de uma espécie: classificação, nomes (aceito, sinônimos, populares), distribuição e perfil da
// referência taxonômica, com a fonte e o aviso público da referência (Flora e Funga ou GBIF provisório).
import type { Consultar } from "../../banco/tipos.ts";
import { lista, numero, textoOuNulo } from "../valores.ts";

export async function perfilEspecie(consultar: Consultar, id: number) {
  const [especie] = await consultar(
    `select id::int8 as id, nome, taxon_id, reino, grupo, filo, classe, ordem, familia, genero, referencia, referencia_nome, referencia_nota,
            referencia_versao, sensivel, ocorrencias::int as ocorrencias_publicas, municipios::int as municipios_com_registro
     from publico.especie where id = $1`,
    [id],
  );
  if (!especie) return null;
  const nomes = await consultar(
    `select nome, autoria, rank, status from publico.nome_cientifico where especie_id = $1
     order by case status when 'aceito' then 0 when 'sinonimo' then 1 else 2 end, nome limit 500`,
    [id],
  );
  const populares = await consultar("select nome, idioma, regiao_do_nome from publico.nome_popular where especie_id = $1 order by nome limit 500", [id]);
  const distribuicao = await consultar("select location_id, origem, endemismo, dominios from publico.distribuicao where especie_id = $1 order by location_id", [id]);
  const perfil = await consultar("select formas_de_vida, habitats, vegetacao from publico.perfil where especie_id = $1", [id]);
  const [referencia] = await consultar(
    `select f.codigo, f.nome, f.url, f.termos_de_uso, f.nota_publica, l.doi, l.citacao
     from publico.fonte f left join publico.lote l on l.fonte_codigo = f.codigo and l.versao_fonte = $2
     where f.codigo = $1 limit 1`,
    [especie.referencia, especie.referencia_versao],
  );
  return {
    especie: {
      id: numero(especie.id), nome: String(especie.nome), taxon_id: textoOuNulo(especie.taxon_id), grupo: String(especie.grupo),
      classificacao: {
        reino: textoOuNulo(especie.reino), filo: textoOuNulo(especie.filo), classe: textoOuNulo(especie.classe),
        ordem: textoOuNulo(especie.ordem), familia: textoOuNulo(especie.familia), genero: textoOuNulo(especie.genero),
      },
      // Espécie sensível: todas as suas ocorrências públicas aparecem só por município.
      sensivel: Boolean(especie.sensivel),
      ocorrencias_publicas: numero(especie.ocorrencias_publicas),
      municipios_com_registro: numero(especie.municipios_com_registro),
      nomes_cientificos: nomes.map((n) => ({ nome: String(n.nome), autoria: textoOuNulo(n.autoria), rank: textoOuNulo(n.rank), status: String(n.status) })),
      nomes_populares: populares.map((p) => ({ nome: String(p.nome), idioma: textoOuNulo(p.idioma), regiao_do_nome: textoOuNulo(p.regiao_do_nome) })),
      distribuicao: distribuicao.map((d) => ({
        local: String(d.location_id), origem: textoOuNulo(d.origem), endemismo: textoOuNulo(d.endemismo), dominios: lista(d.dominios),
      })),
      perfil: perfil[0]
        ? { formas_de_vida: lista(perfil[0].formas_de_vida), habitats: lista(perfil[0].habitats), vegetacao: lista(perfil[0].vegetacao) }
        : null,
    },
    referencia: {
      codigo: String(especie.referencia), nome: textoOuNulo(especie.referencia_nome), versao: textoOuNulo(especie.referencia_versao),
      nota: textoOuNulo(especie.referencia_nota), url: textoOuNulo(referencia?.url), termos_de_uso: textoOuNulo(referencia?.termos_de_uso),
      doi: textoOuNulo(referencia?.doi), citacao: textoOuNulo(referencia?.citacao),
    },
  };
}
