import { FileText, TrendingUp, TrendingDown, DollarSign, CreditCard, Landmark, Package, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle, PremiumCardDescription } from "@/components/ui/premium-card";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DREMainCardProps {
  selectedDate: Date;
  dreData: {
    receitaBruta: number;
    custosProdutos: number;
    taxasCartao: number;
    impostosProvisionados: number;
    lucroOperacional: number;
    margemLiquida: number;
    qtdTransacoes: number;
  };
  crescimentoReceita: number;
  formatCurrency: (value: number) => string;
}

export function DREMainCard({ selectedDate, dreData, crescimentoReceita, formatCurrency }: DREMainCardProps) {
  return (
    <PremiumCard featured gradient="primary">
      <PremiumCardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="icon-container icon-container-primary h-12 w-12">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <PremiumCardTitle className="text-xl">Resultado do Exercício</PremiumCardTitle>
              <PremiumCardDescription>
                {format(selectedDate, "MMMM yyyy", { locale: ptBR })} • {dreData.qtdTransacoes} transações
              </PremiumCardDescription>
            </div>
          </div>
          {crescimentoReceita !== 0 && (
            <PremiumBadge 
              variant={crescimentoReceita >= 0 ? "success" : "urgent"} 
              icon={crescimentoReceita >= 0 ? ArrowUpRight : ArrowDownRight}
            >
              {crescimentoReceita >= 0 ? '+' : ''}{crescimentoReceita.toFixed(1)}% vs mês anterior
            </PremiumBadge>
          )}
        </div>
      </PremiumCardHeader>
      <PremiumCardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-success/10 border border-success/20">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-success" />
              <span className="font-medium">RECEITA BRUTA</span>
            </div>
            <span className="text-2xl font-bold text-success">
              <AnimatedNumber value={dreData.receitaBruta} format="currency" />
            </span>
          </div>

          <div className="space-y-2 pl-4 border-l-2 border-border">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="h-4 w-4" />
                <span className="text-sm">(-) Custo dos Produtos Vendidos</span>
              </div>
              <span className="text-destructive font-medium">
                -{formatCurrency(dreData.custosProdutos)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm">(-) Taxas de Cartão</span>
              </div>
              <span className="text-destructive font-medium">
                -{formatCurrency(dreData.taxasCartao)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Landmark className="h-4 w-4" />
                <span className="text-sm">(-) Impostos Provisionados</span>
              </div>
              <span className="text-destructive font-medium">
                -{formatCurrency(dreData.impostosProvisionados)}
              </span>
            </div>
          </div>

          <Separator />

          <div className={`flex items-center justify-between p-4 rounded-xl ${
            dreData.lucroOperacional >= 0 
              ? 'bg-success/10 border border-success/20' 
              : 'bg-destructive/10 border border-destructive/20'
          }`}>
            <div className="flex items-center gap-3">
              {dreData.lucroOperacional >= 0 ? (
                <TrendingUp className="h-5 w-5 text-success" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
              <span className="font-bold">LUCRO OPERACIONAL</span>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-bold ${
                dreData.lucroOperacional >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                <AnimatedNumber value={dreData.lucroOperacional} format="currency" />
              </span>
              <p className="text-xs text-muted-foreground">
                {dreData.margemLiquida.toFixed(1)}% margem líquida
              </p>
            </div>
          </div>
        </div>
      </PremiumCardContent>
    </PremiumCard>
  );
}
