// Verificação SOMENTE LEITURA, no Supabase, dos dados de referência publicados: malha municipal do IBGE
// (geometrias, áreas contra o AREA_KM2 oficial, cobertura) e Flora e Funga (contagens, buscas de exemplo),
// além de fontes, licenças e avisos públicos.
//
//   node --use-system-ca scripts/banco/verificar-referencias.mjs
import { lerMalha, TOLERANCIA_AREA } from "../ingestao/ibge-malha.mjs";
import { normalizarBusca } from "../ingestao/texto.mjs";
import { conectarRemoto } from "./remoto.mjs";

export async function verificarReferencias(sql) {
  const malha = await lerMalha();
  const areaOficial = new Map(malha.municipios.map((m) => [m.CD_MUN, m.AREA_KM2]));
  const nomeOficial = new Map(malha.municipios.map((m) => [m.CD_MUN, m.NM_MUN]));

  return sql.begin("read only", async (tx) => {
    // --- Território ---
    const municipios = await tx`select codigo_ibge, nome, st_isvalid(geom) as valida, st_srid(geom) as srid,
      geometrytype(geom) as tipo, st_area(geom::geography) / 1e6 as area_km2 from protegido.municipio`;
    const erros = [];
    let maiorDiferenca = 0;
    for (const m of municipios) {
      if (!m.valida) erros.push(`${m.codigo_ibge}: geometria inválida no PostGIS remoto`);
      if (m.srid !== 4674 || m.tipo !== "MULTIPOLYGON") erros.push(`${m.codigo_ibge}: ${m.tipo}/${m.srid}`);
      if (nomeOficial.get(m.codigo_ibge) !== m.nome) erros.push(`${m.codigo_ibge}: nome difere do arquivo oficial`);
      const d = Math.abs(m.area_km2 - areaOficial.get(m.codigo_ibge)) / areaOficial.get(m.codigo_ibge);
      maiorDiferenca = Math.max(maiorDiferenca, d);
      if (d > TOLERANCIA_AREA) erros.push(`${m.codigo_ibge}: área difere ${(d * 100).toFixed(3)}%`);
    }
    const [cobertura] = await tx`
      with u as (select geom from protegido.uf where codigo_ibge = '51'),
           m as (select st_union(geom) as geom, sum(st_area(geom::geography)) / 1e6 as soma from protegido.municipio)
      select st_area(u.geom::geography) / 1e6 as area_uf, m.soma as soma_municipios,
             st_area(m.geom::geography) / 1e6 as uniao_municipios,
             st_area(st_difference(m.geom, u.geom)::geography) / 1e6 as fora_da_uf_km2,
             st_area(st_difference(u.geom, m.geom)::geography) / 1e6 as uf_descoberta_km2
      from u, m`;
    const [{ pares_sobrepostos }] = await tx`select count(*)::int as pares_sobrepostos from protegido.municipio a
      join protegido.municipio b on a.codigo_ibge < b.codigo_ibge and a.geom && b.geom
      where st_overlaps(a.geom, b.geom) and st_area(st_intersection(a.geom, b.geom)::geography) > 1e4`;
    const territorio = {
      municipios: municipios.length,
      codigos_validos: municipios.every((m) => /^51\d{5}$/.test(m.codigo_ibge)),
      todas_validas_4674_multipoligono: municipios.every((m) => m.valida && m.srid === 4674 && m.tipo === "MULTIPOLYGON"),
      nomes_iguais_ao_oficial: municipios.every((m) => nomeOficial.get(m.codigo_ibge) === m.nome),
      maior_diferenca_area_pct: Number((maiorDiferenca * 100).toFixed(4)),
      area_uf_km2: Number(cobertura.area_uf.toFixed(3)),
      area_uf_oficial_km2: malha.uf.AREA_KM2,
      soma_municipios_km2: Number(cobertura.soma_municipios.toFixed(3)),
      uniao_municipios_km2: Number(cobertura.uniao_municipios.toFixed(3)),
      fora_da_uf_km2: Number(cobertura.fora_da_uf_km2.toFixed(6)),
      uf_descoberta_km2: Number(cobertura.uf_descoberta_km2.toFixed(6)),
      pares_sobrepostos_acima_1ha: pares_sobrepostos,
      erros,
    };

    // --- Taxonomia ---
    const [taxonomia] = await tx`select
      (select count(*)::int from protegido.nome_recebido) as nomes_recebidos,
      (select count(*)::int from protegido.nome_cientifico) as nomes_tratados,
      (select count(*)::int from protegido.especie) as especies,
      (select count(*)::int from protegido.especie where reino = 'Plantae') as plantae,
      (select count(*)::int from protegido.especie where reino = 'Fungi') as fungi,
      (select count(*)::int from protegido.nome_cientifico where status = 'sinonimo') as sinonimos,
      (select count(*)::int from protegido.nome_popular_recebido) as nomes_populares,
      (select count(*)::int from protegido.distribuicao_recebida) as distribuicoes_mt,
      (select count(*)::int from protegido.perfil_recebido) as perfis`;

    const buscar = async (texto) => {
      const chave = normalizarBusca(texto);
      return tx`select distinct e.nome as especie, e.familia, e.taxon_id, b.tipo, b.texto
        from publico.busca b join publico.especie e on e.id = b.especie_id
        where b.chave = ${chave} or b.chave like ${chave + " %"} order by 1, 4 limit 10`;
    };
    const exemplos = {
      jatoba: await buscar("jatobá"),
      JATOBA_sem_acento: await buscar("JATOBA"),
      hymenaea_courbaril: await buscar("Hymenaea courbaril"),
      sinonimo_var_stilbocarpa: await buscar("Hymenaea courbaril var. stilbocarpa"),
    };
    const [ficha] = await tx`select e.id, e.nome, e.familia, e.grupo, e.referencia, e.referencia_versao, e.sensivel, e.ocorrencias
      from publico.especie e where e.taxon_id = '22972'`;
    const distribuicao = await tx`select location_id, origem, endemismo, dominios from publico.distribuicao where especie_id = ${ficha.id}`;
    const perfil = await tx`select formas_de_vida, vegetacao from publico.perfil where especie_id = ${ficha.id}`;
    const populares = await tx`select nome, idioma, regiao_do_nome from publico.nome_popular where especie_id = ${ficha.id}`;

    // --- Fontes, licenças e avisos ---
    const fontes = await tx`select codigo, nome, papel, left(termos_de_uso, 140) as termos, nota_publica from publico.fonte order by 1`;
    const lotes = await tx`select id, fonte_codigo, versao_fonte, doi, left(citacao, 120) as citacao, situacao, recebidos from publico.lote order by id`;
    const [publico] = await tx`select (select count(*)::int from publico.ocorrencia) as ocorrencias_publicas,
      (select count(*)::int from publico.municipio) as municipios_publicos, (select count(*)::int from publico.conjunto_dados) as conjuntos_publicos`;
    const [tamanho] = await tx`select pg_size_pretty(pg_database_size(current_database())) as banco,
      pg_size_pretty((select sum(pg_total_relation_size(c.oid)) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'protegido' and c.relkind = 'r')) as schema_protegido`;

    return { territorio, taxonomia, exemplos, ficha_hymenaea: { ...ficha, distribuicao, perfil, populares }, fontes, lotes, publico, tamanho };
  });
}

if (import.meta.main) {
  const sql = conectarRemoto();
  try {
    console.log(JSON.stringify(await verificarReferencias(sql), null, 1));
  } finally {
    await sql.end();
  }
}
