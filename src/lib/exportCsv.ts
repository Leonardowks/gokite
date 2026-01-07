import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TransacaoExport {
  id: string;
  data_transacao: string;
  descricao: string | null;
  origem: string;
  tipo: string;
  valor_bruto: number;
  custo_produto: number;
  taxa_cartao_estimada: number;
  imposto_provisionado: number;
  lucro_liquido: number;
  forma_pagamento: string;
  centro_de_custo: string;
  cliente_id: string | null;
}

/**
 * Export transactions to CSV file
 */
export function exportTransacoesToCsv(
  transacoes: TransacaoExport[],
  filename?: string
): void {
  if (!transacoes.length) {
    return;
  }

  // CSV headers
  const headers = [
    "Data",
    "Descrição",
    "Tipo",
    "Origem",
    "Valor Bruto (R$)",
    "Custo (R$)",
    "Taxa Cartão (R$)",
    "Imposto (R$)",
    "Lucro Líquido (R$)",
    "Forma Pagamento",
    "Centro de Custo",
  ];

  // Format payment method labels
  const formatPagamento = (forma: string): string => {
    const map: Record<string, string> = {
      pix: "PIX",
      cartao_credito: "Cartão Crédito",
      cartao_debito: "Cartão Débito",
      dinheiro: "Dinheiro",
      trade_in: "Trade-in",
    };
    return map[forma] || forma;
  };

  // Format origin labels
  const formatOrigem = (origem: string): string => {
    const map: Record<string, string> = {
      aula: "Aula",
      pacote: "Pacote",
      aluguel: "Aluguel",
      venda_produto: "Venda Produto",
      ecommerce: "E-commerce",
      trade_in: "Trade-in",
      pousada: "Pousada",
      manual: "Manual",
    };
    return map[origem] || origem;
  };

  // Convert transactions to CSV rows
  const rows = transacoes.map((t) => [
    format(new Date(t.data_transacao), "dd/MM/yyyy"),
    `"${(t.descricao || "").replace(/"/g, '""')}"`, // Escape quotes
    t.tipo === "receita" ? "Receita" : "Despesa",
    formatOrigem(t.origem),
    t.valor_bruto.toFixed(2).replace(".", ","),
    t.custo_produto.toFixed(2).replace(".", ","),
    t.taxa_cartao_estimada.toFixed(2).replace(".", ","),
    t.imposto_provisionado.toFixed(2).replace(".", ","),
    t.lucro_liquido.toFixed(2).replace(".", ","),
    formatPagamento(t.forma_pagamento),
    t.centro_de_custo,
  ]);

  // Build CSV content with BOM for Excel compatibility
  const BOM = "\uFEFF";
  const csvContent = BOM + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const defaultFilename = `transacoes_${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.href = url;
  link.download = filename || defaultFilename;
  link.click();
  
  URL.revokeObjectURL(url);
}

/**
 * Export DRE summary to CSV
 */
export function exportDreToCsv(
  data: {
    mes: string;
    receitas: number;
    custos: number;
    taxasCartao: number;
    impostos: number;
    lucroLiquido: number;
    margemBruta: number;
    margemLiquida: number;
  },
  filename?: string
): void {
  const headers = ["Métrica", "Valor"];
  
  const rows = [
    ["Mês de Referência", data.mes],
    ["Receita Bruta", `R$ ${data.receitas.toFixed(2).replace(".", ",")}`],
    ["(-) Custos de Produtos", `R$ ${data.custos.toFixed(2).replace(".", ",")}`],
    ["(-) Taxas de Cartão", `R$ ${data.taxasCartao.toFixed(2).replace(".", ",")}`],
    ["(-) Impostos Provisionados", `R$ ${data.impostos.toFixed(2).replace(".", ",")}`],
    ["(=) Lucro Líquido", `R$ ${data.lucroLiquido.toFixed(2).replace(".", ",")}`],
    ["Margem Bruta", `${data.margemBruta.toFixed(1)}%`],
    ["Margem Líquida", `${data.margemLiquida.toFixed(1)}%`],
  ];

  const BOM = "\uFEFF";
  const csvContent = BOM + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const defaultFilename = `dre_${format(new Date(), "yyyy-MM")}.csv`;
  link.href = url;
  link.download = filename || defaultFilename;
  link.click();
  
  URL.revokeObjectURL(url);
}
