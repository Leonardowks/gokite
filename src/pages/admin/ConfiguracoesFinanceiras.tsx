import { useState, useEffect } from "react";
import { 
  Settings2, 
  CreditCard, 
  Landmark, 
  Target, 
  Save, 
  RefreshCw,
  Percent,
  Info
} from "lucide-react";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle, PremiumCardDescription } from "@/components/ui/premium-card";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useConfigFinanceiro, useUpdateConfigFinanceiro } from "@/hooks/useTransacoes";

export default function ConfiguracoesFinanceiras() {
  const { data: config, isLoading, refetch } = useConfigFinanceiro();
  const updateConfig = useUpdateConfigFinanceiro();

  const [formData, setFormData] = useState({
    taxa_cartao_credito: 4.0,
    taxa_cartao_debito: 2.0,
    taxa_pix: 0,
    taxa_imposto_padrao: 6.0,
    meta_mensal: 15000,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        taxa_cartao_credito: config.taxa_cartao_credito,
        taxa_cartao_debito: config.taxa_cartao_debito,
        taxa_pix: config.taxa_pix,
        taxa_imposto_padrao: config.taxa_imposto_padrao,
        meta_mensal: config.meta_mensal,
      });
      setHasChanges(false);
    }
  }, [config]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync(formData);
      toast.success("Configurações salvas com sucesso!");
      setHasChanges(false);
    } catch (error) {
      toast.error("Erro ao salvar configurações");
      console.error(error);
    }
  };

  const handleReset = () => {
    if (config) {
      setFormData({
        taxa_cartao_credito: config.taxa_cartao_credito,
        taxa_cartao_debito: config.taxa_cartao_debito,
        taxa_pix: config.taxa_pix,
        taxa_imposto_padrao: config.taxa_imposto_padrao,
        meta_mensal: config.meta_mensal,
      });
      setHasChanges(false);
      toast.info("Alterações descartadas");
    }
  };

  // Calculate example
  const exampleValue = 1000;
  const taxaCartao = (exampleValue * formData.taxa_cartao_credito) / 100;
  const taxaImposto = (exampleValue * formData.taxa_imposto_padrao) / 100;
  const lucroLiquido = exampleValue - taxaCartao - taxaImposto;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
            Configurações Financeiras
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Configure as taxas e metas para cálculos automáticos
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Descartar
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || updateConfig.isPending}
          >
            {updateConfig.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Taxas de Cartão */}
        <PremiumCard>
          <PremiumCardHeader>
            <div className="flex items-center gap-3">
              <div className="icon-container icon-container-primary h-10 w-10">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <PremiumCardTitle>Taxas de Cartão</PremiumCardTitle>
                <PremiumCardDescription>
                  Taxas cobradas pelas operadoras de cartão
                </PremiumCardDescription>
              </div>
            </div>
          </PremiumCardHeader>
          <PremiumCardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taxa_credito" className="flex items-center gap-2">
                Cartão de Crédito
                <PremiumBadge variant="neutral" size="sm">
                  <Percent className="h-3 w-3" />
                </PremiumBadge>
              </Label>
              <div className="relative">
                <Input
                  id="taxa_credito"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.taxa_cartao_credito}
                  onChange={(e) => handleChange('taxa_cartao_credito', e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Taxa média cobrada para transações de crédito (parcelado ou à vista)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxa_debito" className="flex items-center gap-2">
                Cartão de Débito
                <PremiumBadge variant="neutral" size="sm">
                  <Percent className="h-3 w-3" />
                </PremiumBadge>
              </Label>
              <div className="relative">
                <Input
                  id="taxa_debito"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.taxa_cartao_debito}
                  onChange={(e) => handleChange('taxa_cartao_debito', e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Taxa média cobrada para transações de débito
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxa_pix" className="flex items-center gap-2">
                PIX
                <PremiumBadge variant="success" size="sm">Grátis</PremiumBadge>
              </Label>
              <div className="relative">
                <Input
                  id="taxa_pix"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.taxa_pix}
                  onChange={(e) => handleChange('taxa_pix', e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Geralmente 0%, mas alguns gateways cobram
              </p>
            </div>
          </PremiumCardContent>
        </PremiumCard>

        {/* Impostos */}
        <PremiumCard>
          <PremiumCardHeader>
            <div className="flex items-center gap-3">
              <div className="icon-container icon-container-accent h-10 w-10">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <PremiumCardTitle>Impostos</PremiumCardTitle>
                <PremiumCardDescription>
                  Taxa de imposto para provisionamento
                </PremiumCardDescription>
              </div>
            </div>
          </PremiumCardHeader>
          <PremiumCardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taxa_imposto" className="flex items-center gap-2">
                Imposto Padrão
                <PremiumBadge variant="warning" size="sm">
                  <Percent className="h-3 w-3" />
                </PremiumBadge>
              </Label>
              <div className="relative">
                <Input
                  id="taxa_imposto"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.taxa_imposto_padrao}
                  onChange={(e) => handleChange('taxa_imposto_padrao', e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Taxa de imposto para provisionar em cada venda (Simples Nacional, etc.)
              </p>
            </div>

            <Separator className="my-4" />

            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-accent mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Provisionamento de Impostos
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Este valor é separado automaticamente de cada venda para que você tenha 
                    dinheiro guardado quando os impostos forem cobrados. Não é cobrado do 
                    cliente, apenas contabilizado separadamente.
                  </p>
                </div>
              </div>
            </div>
          </PremiumCardContent>
        </PremiumCard>

        {/* Meta Mensal */}
        <PremiumCard>
          <PremiumCardHeader>
            <div className="flex items-center gap-3">
              <div className="icon-container icon-container-success h-10 w-10">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <PremiumCardTitle>Meta Mensal</PremiumCardTitle>
                <PremiumCardDescription>
                  Defina sua meta de faturamento
                </PremiumCardDescription>
              </div>
            </div>
          </PremiumCardHeader>
          <PremiumCardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meta_mensal">Meta de Faturamento</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  id="meta_mensal"
                  type="number"
                  step="100"
                  min="0"
                  value={formData.meta_mensal}
                  onChange={(e) => handleChange('meta_mensal', e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Valor que você deseja faturar por mês
              </p>
            </div>
          </PremiumCardContent>
        </PremiumCard>

        {/* Simulação */}
        <PremiumCard featured gradient="primary">
          <PremiumCardHeader>
            <div className="flex items-center gap-3">
              <div className="icon-container icon-container-primary h-10 w-10">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <PremiumCardTitle>Simulação</PremiumCardTitle>
                <PremiumCardDescription>
                  Exemplo de venda com as taxas configuradas
                </PremiumCardDescription>
              </div>
            </div>
          </PremiumCardHeader>
          <PremiumCardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valor da venda (cartão crédito)</span>
                <span className="font-medium">R$ {exampleValue.toLocaleString('pt-BR')}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center text-destructive">
                <span className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Taxa de Cartão ({formData.taxa_cartao_credito}%)
                </span>
                <span className="font-medium">-R$ {taxaCartao.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center text-destructive">
                <span className="text-sm flex items-center gap-2">
                  <Landmark className="h-4 w-4" />
                  Imposto ({formData.taxa_imposto_padrao}%)
                </span>
                <span className="font-medium">-R$ {taxaImposto.toFixed(2)}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-success flex items-center gap-2">
                  💰 Lucro Líquido
                </span>
                <span className="text-xl font-bold text-success">
                  R$ {lucroLiquido.toFixed(2)}
                </span>
              </div>
              
              <div className="text-center pt-2">
                <PremiumBadge variant="success">
                  {((lucroLiquido / exampleValue) * 100).toFixed(1)}% de margem
                </PremiumBadge>
              </div>
            </div>
          </PremiumCardContent>
        </PremiumCard>
      </div>
    </div>
  );
}
