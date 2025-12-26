import { Target, TrendingUp, DollarSign, Landmark } from "lucide-react";
import { PremiumCard, PremiumCardContent } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Progress } from "@/components/ui/progress";

interface DREKPIsProps {
  margemBruta: number;
  margemLiquida: number;
  ticketMedio: number;
  impostosProvisionados: number;
}

export function DREKPIs({ margemBruta, margemLiquida, ticketMedio, impostosProvisionados }: DREKPIsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <PremiumCard>
        <PremiumCardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-accent" />
            <span className="text-xs text-muted-foreground">Margem Bruta</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {margemBruta.toFixed(1)}%
          </p>
          <Progress value={Math.min(margemBruta, 100)} className="h-1.5 mt-2" />
        </PremiumCardContent>
      </PremiumCard>

      <PremiumCard>
        <PremiumCardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-xs text-muted-foreground">Margem Líquida</span>
          </div>
          <p className={`text-2xl font-bold ${margemLiquida >= 0 ? 'text-success' : 'text-destructive'}`}>
            {margemLiquida.toFixed(1)}%
          </p>
          <Progress value={Math.max(0, Math.min(margemLiquida, 100))} className="h-1.5 mt-2" />
        </PremiumCardContent>
      </PremiumCard>

      <PremiumCard>
        <PremiumCardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-chart-1" />
            <span className="text-xs text-muted-foreground">Ticket Médio</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            <AnimatedNumber value={ticketMedio} format="currency" />
          </p>
        </PremiumCardContent>
      </PremiumCard>

      <PremiumCard>
        <PremiumCardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="h-4 w-4 text-warning" />
            <span className="text-xs text-muted-foreground">Provisão Impostos</span>
          </div>
          <p className="text-2xl font-bold text-warning">
            <AnimatedNumber value={impostosProvisionados} format="currency" />
          </p>
        </PremiumCardContent>
      </PremiumCard>
    </div>
  );
}
