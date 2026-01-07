import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface CategoriaResumo {
  category: string;
  label: string;
  imposto: number;
  faturamento: number;
  taxaAplicada: number;
  taxaReal: number;
}

interface DadoMensal {
  mes: string;
  mesLabel: string;
  servico_aula: number;
  produto_novo: number;
  produto_usado: number;
  pousada: number;
  total: number;
  faturamentoTotal: number;
}

interface Totais {
  mesAtual: number;
  mesAnterior: number;
  variacao: number;
  acumulado: number;
  media: number;
}

const formatCurrency = (value: number) => {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
};

export async function exportImpostosPDF(
  resumoPorCategoria: CategoriaResumo[],
  dadosMensais: DadoMensal[],
  totais: Totais,
  mesesExibir: string
): Promise<void> {
  toast.info("Gerando PDF...");

  try {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Header
    pdf.setFontSize(20);
    pdf.setTextColor(40, 40, 40);
    pdf.text("GoKite - Relatório de Provisão de Impostos", margin, yPos);
    yPos += 10;

    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text(
      `Período: ${format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}`,
      margin,
      yPos
    );
    yPos += 6;
    pdf.text(
      `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      margin,
      yPos
    );
    yPos += 15;

    // KPIs Section
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(40, 40, 40);
    pdf.text("RESUMO EXECUTIVO", margin, yPos);
    yPos += 10;

    // KPI boxes
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");

    const kpis = [
      { label: "Provisão Mês Atual", value: formatCurrency(totais.mesAtual), color: [217, 119, 6] as const },
      { label: "Média Mensal", value: formatCurrency(totais.media), color: [59, 130, 246] as const },
      { label: "Acumulado Período", value: formatCurrency(totais.acumulado), color: [147, 51, 234] as const },
      { label: "Variação vs Anterior", value: `${totais.variacao > 0 ? "+" : ""}${totais.variacao.toFixed(1)}%`, color: totais.variacao > 0 ? [239, 68, 68] as const : [34, 197, 94] as const },
    ];

    const boxWidth = (pageWidth - 2 * margin - 10) / 2;
    kpis.forEach((kpi, index) => {
      const xPos = margin + (index % 2) * (boxWidth + 5);
      const boxY = yPos + Math.floor(index / 2) * 20;

      pdf.setFillColor(245, 245, 245);
      pdf.rect(xPos, boxY, boxWidth, 16, "F");

      pdf.setTextColor(100, 100, 100);
      pdf.text(kpi.label, xPos + 3, boxY + 6);

      pdf.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      pdf.setFont("helvetica", "bold");
      pdf.text(kpi.value, xPos + 3, boxY + 12);
      pdf.setFont("helvetica", "normal");
    });

    yPos += 45;

    // Detalhamento por Categoria
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(40, 40, 40);
    pdf.text("DETALHAMENTO POR CATEGORIA (MÊS ATUAL)", margin, yPos);
    yPos += 10;

    // Table header
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, "F");
    pdf.setFontSize(9);
    pdf.setTextColor(60, 60, 60);
    pdf.text("Categoria", margin + 3, yPos + 5);
    pdf.text("Faturamento", margin + 55, yPos + 5);
    pdf.text("Taxa", margin + 100, yPos + 5);
    pdf.text("Imposto Provisionado", margin + 125, yPos + 5);
    yPos += 10;

    pdf.setFont("helvetica", "normal");
    resumoPorCategoria.forEach((cat) => {
      pdf.setTextColor(60, 60, 60);
      pdf.text(cat.label, margin + 3, yPos);
      pdf.text(formatCurrency(cat.faturamento), margin + 55, yPos);
      pdf.text(`${cat.taxaAplicada.toFixed(1)}%`, margin + 100, yPos);
      pdf.setTextColor(217, 119, 6);
      pdf.text(formatCurrency(cat.imposto), margin + 125, yPos);
      yPos += 7;
    });

    // Total row
    yPos += 3;
    pdf.setFillColor(254, 243, 199);
    pdf.rect(margin, yPos - 4, pageWidth - 2 * margin, 10, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(40, 40, 40);
    pdf.text("TOTAL A PROVISIONAR", margin + 3, yPos + 2);
    pdf.setTextColor(217, 119, 6);
    const totalProvisao = resumoPorCategoria.reduce((sum, c) => sum + c.imposto, 0);
    pdf.text(formatCurrency(totalProvisao), margin + 125, yPos + 2);
    yPos += 15;

    // Evolução Mensal
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(40, 40, 40);
    pdf.text(`EVOLUÇÃO MENSAL (${mesesExibir} MESES)`, margin, yPos);
    yPos += 10;

    // Table header
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, "F");
    pdf.setFontSize(9);
    pdf.setTextColor(60, 60, 60);
    pdf.text("Mês", margin + 3, yPos + 5);
    pdf.text("Serviços/Aulas", margin + 30, yPos + 5);
    pdf.text("Prod. Novos", margin + 65, yPos + 5);
    pdf.text("Prod. Usados", margin + 100, yPos + 5);
    pdf.text("Total", margin + 140, yPos + 5);
    yPos += 10;

    pdf.setFont("helvetica", "normal");
    dadosMensais.forEach((mes) => {
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        yPos = margin;
      }

      pdf.setTextColor(60, 60, 60);
      pdf.text(mes.mesLabel.toUpperCase(), margin + 3, yPos);
      pdf.text(formatCurrency(mes.servico_aula || 0), margin + 30, yPos);
      pdf.text(formatCurrency(mes.produto_novo || 0), margin + 65, yPos);
      pdf.text(formatCurrency(mes.produto_usado || 0), margin + 100, yPos);
      pdf.setFont("helvetica", "bold");
      pdf.text(formatCurrency(mes.total), margin + 140, yPos);
      pdf.setFont("helvetica", "normal");
      yPos += 7;
    });

    // Recomendação
    yPos += 10;
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      yPos = margin;
    }

    pdf.setFillColor(254, 243, 199);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 25, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(146, 64, 14);
    pdf.text("RECOMENDAÇÃO", margin + 3, yPos + 7);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(
      `Separe ${formatCurrency(totais.mesAtual)} este mês para provisão de impostos.`,
      margin + 3,
      yPos + 14
    );
    pdf.text(
      `Média histórica: ${formatCurrency(totais.media)} por mês.`,
      margin + 3,
      yPos + 20
    );

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      "Relatório gerado automaticamente pelo sistema GoKite CRM",
      margin,
      pageHeight - 10
    );

    // Save
    const fileName = `Provisao_Impostos_${format(new Date(), "yyyy-MM")}.pdf`;
    pdf.save(fileName);
    toast.success(`PDF exportado: ${fileName}`);
  } catch (error) {
    console.error("Erro ao exportar PDF:", error);
    toast.error("Erro ao gerar PDF. Tente novamente.");
  }
}
