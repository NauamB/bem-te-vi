// Fotografias de paisagem usadas na interface. Todas são ILUSTRATIVAS: mostram ecossistemas reais de Mato Grosso,
// mas não são registros científicos nem dados da plataforma. Origem e licença verificadas na página de cada arquivo
// no Wikimedia Commons (API imageinfo/extmetadata) em 17/11/2026. Procedência completa (original, SHA-1 no Commons, arquivo
// baixado e versão publicada com SHA-256): dados/referencias/imagens-paisagens.json.
//
// Licença CC BY-SA 4.0: exige crédito ao autor, link para a licença e indicação das alterações. As versões em
// public/imagens/paisagens/ são derivadas (redimensionadas, convertidas para WebP e exibidas recortadas pelo
// enquadramento de cada página) e ficam sob a mesma licença. O crédito exibido (CreditoImagem) informa tudo isso.

export type ImagemPaisagem = {
  obra: string; // título do arquivo no Wikimedia Commons (identificação da obra)
  arquivo: string;
  largura: number;
  altura: number;
  alt: string;
  bioma: "Amazônia" | "Cerrado" | "Pantanal";
  local: string;
  autor: string;
  licenca: "CC BY-SA 4.0";
  urlLicenca: string;
  fonte: string; // página do arquivo no Wikimedia Commons
  dataFoto: string;
  alteracoes: string;
  sha256: string; // da versão publicada em public/
};

const BY_SA_4 = "https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br";
const ALTERACOES = "redimensionada, convertida de JPEG para WebP e recortada no enquadramento da página";

export const imagens = {
  chapada: {
    obra: "PARNA da Chapada dos Guimarães - Rdzanini(001)",
    arquivo: "/imagens/paisagens/chapada-dos-guimaraes.webp",
    largura: 2400,
    altura: 1800,
    alt: "Vale coberto por floresta entre paredões de arenito avermelhado, sob céu azul, no Parque Nacional da Chapada dos Guimarães.",
    bioma: "Cerrado",
    local: "Parque Nacional da Chapada dos Guimarães (MT)",
    autor: "RodrigoDZ",
    licenca: "CC BY-SA 4.0",
    urlLicenca: BY_SA_4,
    fonte: "https://commons.wikimedia.org/wiki/File:PARNA_da_Chapada_dos_Guimar%C3%A3es_-_Rdzanini(001).jpg",
    dataFoto: "2017-10-09",
    alteracoes: ALTERACOES,
    sha256: "cdb6618d34850c4eaad976321f692db6c32ab3c842926b626d47782ea1c1cc2d",
  },
  amazonia: {
    obra: "Parque Estadual do Cristalino",
    arquivo: "/imagens/paisagens/cristalino-amazonia.webp",
    largura: 1600,
    altura: 1065,
    alt: "Margem de floresta amazônica refletida nas águas calmas do rio Teles Pires.",
    bioma: "Amazônia",
    local: "Parque Estadual do Cristalino, rio Teles Pires (MT)",
    autor: "Aline Gama Baptista",
    licenca: "CC BY-SA 4.0",
    urlLicenca: BY_SA_4,
    fonte: "https://commons.wikimedia.org/wiki/File:Parque_Estadual_do_Cristalino.jpg",
    dataFoto: "2014-08-07",
    alteracoes: ALTERACOES,
    sha256: "9ebc4fe9cd2566af6a3476edfa9486dfbaaf42776f3fcd91fbca53fdb4285340",
  },
  cerrado: {
    obra: "PE Serra Ricardo Franco - Jean Explorador Aventureiro(001)",
    arquivo: "/imagens/paisagens/serra-ricardo-franco-cerrado.webp",
    largura: 1600,
    altura: 1067,
    alt: "Cachoeira despencando de um cânion de paredões avermelhados, cercado de vegetação, na Serra de Ricardo Franco.",
    bioma: "Cerrado",
    local: "Parque Estadual Serra de Ricardo Franco (MT)",
    autor: "Jean Taques Explorador Aventureiro",
    licenca: "CC BY-SA 4.0",
    urlLicenca: BY_SA_4,
    fonte: "https://commons.wikimedia.org/wiki/File:PE_Serra_Ricardo_Franco_-_Jean_Explorador_Aventureiro(001).jpg",
    dataFoto: "2018-03-25",
    alteracoes: ALTERACOES,
    sha256: "9836e59a9ac9a237cd43812b6005a93c331610f5a0c63bb9e67c0f1d50be36b9",
  },
  pantanal: {
    obra: "Cambara (Vochysia divergens Pohl) tree with Tuiuiu (Jabiru mycteria) nest in RPPN Sesc Pantanal",
    arquivo: "/imagens/paisagens/pantanal-rppn-sesc.webp",
    largura: 1600,
    altura: 1077,
    alt: "Silhueta de um cambará contra o sol nascente, com um casal de tuiuiús no ninho.",
    bioma: "Pantanal",
    local: "RPPN Sesc Pantanal, Barão de Melgaço (MT)",
    autor: "Gabyschuck",
    licenca: "CC BY-SA 4.0",
    urlLicenca: BY_SA_4,
    fonte: "https://commons.wikimedia.org/wiki/File:Cambara_(Vochysia_divergens_Pohl)_tree_with_Tuiuiu_(Jabiru_mycteria)_nest_in_RPPN_Sesc_Pantanal.jpg",
    dataFoto: "2020-11-28",
    alteracoes: ALTERACOES,
    sha256: "dd4789291e4d4f0d13d2ce50ac01613dec357f2dedd8d00dafcfe04a9d465973",
  },
} as const satisfies Record<string, ImagemPaisagem>;

export const AVISO_IMAGEM = "Imagem ilustrativa de paisagem";
