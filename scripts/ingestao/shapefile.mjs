// Leitor mínimo de shapefile (ESRI Shapefile Technical Description, 1998) para polígonos, e de tabela dBASE.
// Só lê: não corrige nem simplifica geometrias. Anéis são devolvidos como recebidos; a montagem dos polígonos
// (externos e furos) é feita no PostGIS, com ST_BuildArea.

const TIPOS_POLIGONO = new Set([5, 15, 25]); // Polygon, PolygonZ, PolygonM (só X e Y são lidos)

export function lerShp(buffer) {
  const dv = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (dv.getInt32(0, false) !== 9994) throw new Error("arquivo .shp inválido (código de arquivo diferente de 9994)");
  const tamanho = dv.getInt32(24, false) * 2;
  if (tamanho !== buffer.byteLength) throw new Error(`tamanho do .shp no cabeçalho (${tamanho}) difere do arquivo (${buffer.byteLength})`);
  const tipoArquivo = dv.getInt32(32, true);
  if (!TIPOS_POLIGONO.has(tipoArquivo)) throw new Error(`tipo de geometria ${tipoArquivo} não suportado (esperado polígono)`);

  const registros = [];
  let pos = 100;
  while (pos < tamanho) {
    const numero = dv.getInt32(pos, false);
    const conteudo = dv.getInt32(pos + 4, false) * 2;
    const inicio = pos + 8;
    const tipo = dv.getInt32(inicio, true);
    if (tipo === 0) {
      registros.push({ numero, aneis: null });
    } else {
      if (!TIPOS_POLIGONO.has(tipo)) throw new Error(`registro ${numero}: tipo ${tipo} não suportado`);
      const numPartes = dv.getInt32(inicio + 36, true);
      const numPontos = dv.getInt32(inicio + 40, true);
      const partes = [];
      for (let i = 0; i < numPartes; i++) partes.push(dv.getInt32(inicio + 44 + i * 4, true));
      const base = inicio + 44 + numPartes * 4;
      const aneis = partes.map((de, i) => {
        const ate = i + 1 < numPartes ? partes[i + 1] : numPontos;
        const anel = [];
        for (let p = de; p < ate; p++) anel.push([dv.getFloat64(base + p * 16, true), dv.getFloat64(base + p * 16 + 8, true)]);
        return anel;
      });
      registros.push({ numero, aneis });
    }
    pos = inicio + conteudo;
  }
  if (pos !== tamanho) throw new Error("registros do .shp não terminam no fim do arquivo");
  return registros;
}

export function lerDbf(buffer, codificacao = "utf-8") {
  const dv = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const numRegistros = dv.getUint32(4, true);
  const tamCabecalho = dv.getUint16(8, true);
  const tamRegistro = dv.getUint16(10, true);
  const decodificar = new TextDecoder(codificacao, { fatal: true });

  const campos = [];
  for (let pos = 32; pos < tamCabecalho - 1 && buffer[pos] !== 0x0d; pos += 32) {
    const nome = new TextDecoder("ascii").decode(buffer.subarray(pos, pos + 11)).replace(/\0.*$/s, "");
    campos.push({ nome, tipo: String.fromCharCode(buffer[pos + 11]), tamanho: buffer[pos + 16] });
  }

  const registros = [];
  for (let r = 0; r < numRegistros; r++) {
    let pos = tamCabecalho + r * tamRegistro;
    const apagado = buffer[pos] === 0x2a;
    pos += 1;
    const valores = {};
    for (const c of campos) {
      const texto = decodificar.decode(buffer.subarray(pos, pos + c.tamanho)).trim();
      valores[c.nome] = c.tipo === "N" || c.tipo === "F" ? (texto === "" ? null : Number(texto)) : texto;
      pos += c.tamanho;
    }
    registros.push({ apagado, valores });
  }
  return { campos, registros };
}
