import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface DREData {
  receitaBruta: number;
  custosProdutos: number;
  taxasCartao: number;
  impostosProvisionados: number;
  lucroOperacional: number;
  margemBruta: number;
  margemLiquida: number;
  qtdTransacoes: number;
  ticketMedio: number;
  porCentroCusto: Record<string, { receitas: number; lucro: number }>;
  porFormaPagamento: Record<string, number>;
}

interface InstrutorStats {
  instrutor: string;
  aulasConfirmadas: number;
  receitaTotal: number;
}

interface TipoStats {
  tipo: string;
  aulasConfirmadas: number;
  receitaTotal: number;
}

const formatCurrency = (value: number) => {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
};

const getFormaPagamentoLabel = (forma: string) => {
  const labels: Record<string, string> = {
    pix: 'PIX',
    cartao_credito: 'Cartão Crédito',
    cartao_debito: 'Cartão Débito',
    dinheiro: 'Dinheiro',
    trade_in: 'Trade-in',
  };
  return labels[forma] || forma;
};

const getTipoAulaLabel = (tipo: string): string => {
  const config: Record<string, string> = {
    kite_iniciante: "Kite Iniciante",
    kite_avancado: "Kite Avançado",
    wing_iniciante: "Wing Iniciante",
    wing_avancado: "Wing Avançado",
    foil: "Foil",
    avulsa: "Aula Avulsa",
    pacote: "Pacote",
  };
  return config[tipo] || tipo;
};

export async function exportDREPDF(
  selectedDate: Date,
  dreData: DREData,
  statsByInstrutor: InstrutorStats[],
  statsByTipo: TipoStats[]
): Promise<void> {
  toast.info("Gerando PDF...");

  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Header
    pdf.setFontSize(20);
    pdf.setTextColor(40, 40, 40);
    pdf.text("GoKite - Demonstrativo de Resultado (DRE)", margin, yPos);
    yPos += 10;

    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Período: ${format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}`, margin, yPos);
    yPos += 8;
    pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, yPos);
    yPos += 15;

    // Main DRE Section
    pdf.setFontSize(14);
    pdf.setTextColor(40, 40, 40);
    pdf.text("RESULTADO DO EXERCÍCIO", margin, yPos);
    yPos += 10;

    // Table header
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    pdf.text("Descrição", margin + 3, yPos + 5);
    pdf.text("Valor", pageWidth - margin - 30, yPos + 5);
    yPos += 10;

    // Table rows
    const dreRows = [
      { desc: "RECEITA BRUTA", value: dreData.receitaBruta, bold: true, color: [34, 197, 94] as const },
      { desc: "(-) Custo dos Produtos", value: -dreData.custosProdutos, bold: false, color: [239, 68, 68] as const },
      { desc: "(-) Taxas de Cartão", value: -dreData.taxasCartao, bold: false, color: [239, 68, 68] as const },
      { desc: "(-) Impostos Provisionados", value: -dreData.impostosProvisionados, bold: false, color: [239, 68, 68] as const },
      { desc: "LUCRO OPERACIONAL", value: dreData.lucroOperacional, bold: true, color: (dreData.lucroOperacional >= 0 ? [34, 197, 94] : [239, 68, 68]) as readonly [number, number, number] },
    ];

    dreRows.forEach((row) => {
      if (row.bold) {
        pdf.setFillColor(240, 253, 244);
        pdf.rect(margin, yPos - 4, pageWidth - 2 * margin, 8, 'F');
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setFont('helvetica', 'normal');
      }
      
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.text(row.desc, margin + 3, yPos);
      
      pdf.setTextColor(row.color[0], row.color[1], row.color[2]);
      pdf.text(formatCurrency(Math.abs(row.value)), pageWidth - margin - 30, yPos);
      yPos += 8;
    });

    yPos += 10;

    // KPIs
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(40, 40, 40);
    pdf.text("INDICADORES", margin, yPos);
    yPos += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);

    const kpis = [
      { label: "Margem Bruta", value: `${dreData.margemBruta.toFixed(1)}%` },
      { label: "Margem Líquida", value: `${dreData.margemLiquida.toFixed(1)}%` },
      { label: "Ticket Médio", value: formatCurrency(dreData.ticketMedio) },
      { label: "Qtd. Transações", value: `${dreData.qtdTransacoes}` },
    ];

    kpis.forEach((kpi, index) => {
      const xPos = margin + (index % 2) * 80;
      if (index > 0 && index % 2 === 0) yPos += 7;
      pdf.text(`${kpi.label}: ${kpi.value}`, xPos, yPos);
    });
    yPos += 15;

    // Por Centro de Custo
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text("POR CENTRO DE CUSTO", margin, yPos);
    yPos += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    Object.entries(dreData.porCentroCusto)
      .filter(([, data]) => data.receitas > 0)
      .forEach(([centro, data]) => {
        pdf.text(`${centro}: Receita ${formatCurrency(data.receitas)} | Lucro ${formatCurrency(data.lucro)}`, margin, yPos);
        yPos += 6;
      });

    yPos += 10;

    // Por Forma de Pagamento
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text("POR FORMA DE PAGAMENTO", margin, yPos);
    yPos += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    Object.entries(dreData.porFormaPagamento)
      .filter(([, value]) => value > 0)
      .forEach(([forma, valor]) => {
        pdf.text(`${getFormaPagamentoLabel(forma)}: ${formatCurrency(valor)}`, margin, yPos);
        yPos += 6;
      });

    yPos += 10;

    // Por Instrutor
    if (statsByInstrutor.length > 0) {
      if (yPos > pageHeight - 50) {
        pdf.addPage();
        yPos = margin;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text("RECEITA POR INSTRUTOR", margin, yPos);
      yPos += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      statsByInstrutor.forEach((stat) => {
        pdf.text(`${stat.instrutor}: ${stat.aulasConfirmadas} aulas | ${formatCurrency(stat.receitaTotal)}`, margin, yPos);
        yPos += 6;
      });

      yPos += 10;
    }

    // Por Tipo de Aula
    if (statsByTipo.length > 0) {
      if (yPos > pageHeight - 50) {
        pdf.addPage();
        yPos = margin;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text("RECEITA POR TIPO DE AULA", margin, yPos);
      yPos += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      statsByTipo.forEach((stat) => {
        pdf.text(`${getTipoAulaLabel(stat.tipo)}: ${stat.aulasConfirmadas} aulas | ${formatCurrency(stat.receitaTotal)}`, margin, yPos);
        yPos += 6;
      });
    }

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text("Relatório gerado automaticamente pelo sistema GoKite", margin, pageHeight - 10);

    // Save
    const fileName = `DRE_GoKite_${format(selectedDate, 'yyyy-MM')}.pdf`;
    pdf.save(fileName);
    toast.success(`PDF exportado: ${fileName}`);
  } catch (error) {
    console.error("Erro ao exportar PDF:", error);
    toast.error("Erro ao gerar PDF. Tente novamente.");
  }
}
