// NF-e XML Parser - Extrai dados de Nota Fiscal Eletrônica

export interface NFeProduto {
  nItem: number;
  cProd: string; // Código do produto no fornecedor
  cEAN: string; // Código de barras EAN
  xProd: string; // Nome/descrição do produto
  NCM: string; // NCM
  uCom: string; // Unidade de medida
  qCom: number; // Quantidade
  vUnCom: number; // Valor unitário
  vProd: number; // Valor total do produto
}

export interface NFeDuplicata {
  nDup: string; // Número da duplicata
  dVenc: string; // Data de vencimento (YYYY-MM-DD)
  vDup: number; // Valor da duplicata
}

export interface NFeFornecedor {
  CNPJ: string;
  xNome: string;
  xFant?: string; // Nome fantasia
  endereco?: {
    xLgr?: string;
    nro?: string;
    xBairro?: string;
    xMun?: string;
    UF?: string;
    CEP?: string;
  };
}

export interface NFeData {
  // Identificação da NF-e
  nNF: string; // Número da NF-e
  serie: string;
  dhEmi: string; // Data de emissão
  chNFe?: string; // Chave de acesso (44 dígitos)
  
  // Fornecedor (emitente)
  fornecedor: NFeFornecedor;
  
  // Produtos
  produtos: NFeProduto[];
  
  // Totais
  vNF: number; // Valor total da NF-e
  vProd: number; // Valor total dos produtos
  vFrete?: number;
  vDesc?: number;
  
  // Duplicatas/Faturas (para Contas a Pagar)
  duplicatas: NFeDuplicata[];
}

// Função auxiliar para extrair texto de um elemento XML
function getTextContent(parent: Element | Document, tagName: string): string {
  const element = parent.getElementsByTagName(tagName)[0];
  return element?.textContent?.trim() || "";
}

// Função auxiliar para extrair número
function getNumberContent(parent: Element | Document, tagName: string): number {
  const text = getTextContent(parent, tagName);
  return text ? parseFloat(text) : 0;
}

// Parser principal
export function parseNFeXML(xmlString: string): NFeData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");
  
  // Verificar erros de parsing
  const parseError = doc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    throw new Error("XML inválido: " + parseError[0].textContent);
  }

  // Buscar o elemento NFe ou nfeProc
  const nfeProc = doc.getElementsByTagName("nfeProc")[0] || doc.getElementsByTagName("NFe")[0];
  if (!nfeProc) {
    throw new Error("Estrutura de NF-e não encontrada no XML");
  }

  // Extrair infNFe
  const infNFe = doc.getElementsByTagName("infNFe")[0];
  if (!infNFe) {
    throw new Error("Elemento infNFe não encontrado");
  }

  // Chave de acesso
  const chNFe = infNFe.getAttribute("Id")?.replace("NFe", "") || "";

  // Identificação
  const ide = doc.getElementsByTagName("ide")[0];
  const nNF = getTextContent(ide, "nNF");
  const serie = getTextContent(ide, "serie");
  const dhEmi = getTextContent(ide, "dhEmi") || getTextContent(ide, "dEmi");

  // Emitente (fornecedor)
  const emit = doc.getElementsByTagName("emit")[0];
  const enderEmit = emit?.getElementsByTagName("enderEmit")[0];
  
  const fornecedor: NFeFornecedor = {
    CNPJ: getTextContent(emit, "CNPJ"),
    xNome: getTextContent(emit, "xNome"),
    xFant: getTextContent(emit, "xFant"),
    endereco: enderEmit ? {
      xLgr: getTextContent(enderEmit, "xLgr"),
      nro: getTextContent(enderEmit, "nro"),
      xBairro: getTextContent(enderEmit, "xBairro"),
      xMun: getTextContent(enderEmit, "xMun"),
      UF: getTextContent(enderEmit, "UF"),
      CEP: getTextContent(enderEmit, "CEP"),
    } : undefined,
  };

  // Produtos
  const detElements = doc.getElementsByTagName("det");
  const produtos: NFeProduto[] = [];
  
  for (let i = 0; i < detElements.length; i++) {
    const det = detElements[i];
    const prod = det.getElementsByTagName("prod")[0];
    
    if (prod) {
      // Normalizar EAN (pode vir como cEAN ou cEANTrib)
      let cEAN = getTextContent(prod, "cEAN");
      if (!cEAN || cEAN === "SEM GTIN") {
        cEAN = getTextContent(prod, "cEANTrib");
      }
      if (cEAN === "SEM GTIN") cEAN = "";

      produtos.push({
        nItem: parseInt(det.getAttribute("nItem") || String(i + 1)),
        cProd: getTextContent(prod, "cProd"),
        cEAN: cEAN,
        xProd: getTextContent(prod, "xProd"),
        NCM: getTextContent(prod, "NCM"),
        uCom: getTextContent(prod, "uCom"),
        qCom: getNumberContent(prod, "qCom"),
        vUnCom: getNumberContent(prod, "vUnCom"),
        vProd: getNumberContent(prod, "vProd"),
      });
    }
  }

  // Totais
  const total = doc.getElementsByTagName("total")[0];
  const ICMSTot = total?.getElementsByTagName("ICMSTot")[0];
  
  const vNF = getNumberContent(ICMSTot || doc, "vNF");
  const vProd = getNumberContent(ICMSTot || doc, "vProd");
  const vFrete = getNumberContent(ICMSTot || doc, "vFrete");
  const vDesc = getNumberContent(ICMSTot || doc, "vDesc");

  // Duplicatas (cobranças)
  const cobr = doc.getElementsByTagName("cobr")[0];
  const dupElements = cobr?.getElementsByTagName("dup") || [];
  const duplicatas: NFeDuplicata[] = [];
  
  for (let i = 0; i < dupElements.length; i++) {
    const dup = dupElements[i];
    duplicatas.push({
      nDup: getTextContent(dup, "nDup"),
      dVenc: getTextContent(dup, "dVenc"),
      vDup: getNumberContent(dup, "vDup"),
    });
  }

  // Se não houver duplicatas mas houver valor total, criar uma única
  if (duplicatas.length === 0 && vNF > 0) {
    // Calcular data de vencimento (30 dias após emissão)
    const emissao = new Date(dhEmi);
    emissao.setDate(emissao.getDate() + 30);
    const dVenc = emissao.toISOString().split("T")[0];
    
    duplicatas.push({
      nDup: "001",
      dVenc,
      vDup: vNF,
    });
  }

  return {
    nNF,
    serie,
    dhEmi,
    chNFe,
    fornecedor,
    produtos,
    vNF,
    vProd,
    vFrete,
    vDesc,
    duplicatas,
  };
}

// Formatar CNPJ para exibição
export function formatCNPJ(cnpj: string): string {
  if (!cnpj || cnpj.length !== 14) return cnpj;
  return cnpj.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

// Formatar valor monetário
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
