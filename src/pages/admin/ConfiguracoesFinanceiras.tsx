import { useState, useEffect } from "react";
import { 
  Settings2, 
  CreditCard, 
  Landmark, 
  Target, 
  Save, 
  RefreshCw,
  Percent,
  Info,
  GraduationCap,
  ShoppingBag,
  Package,
  Home,
  Globe,
  Bed,
  RotateCw
} from "lucide-react";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle, PremiumCardDescription } from "@/components/ui/premium-card";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useConfigFinanceiro, useUpdateConfigFinanceiro, TaxasCartao } from "@/hooks/useTransacoes";
import { useTaxRules, useUpdateTaxRule, TaxRule } from "@/hooks/useTaxRules";

export default function ConfiguracoesFinanceiras() {
  const { data: config, isLoading, refetch } = useConfigFinanceiro();
  const updateConfig = useUpdateConfigFinanceiro();
  const { data: taxRules = [], isLoading: isLoadingRules } = useTaxRules();
  const updateTaxRule = useUpdateTaxRule();

  // Mapa de ícones por categoria
  const getCategoryIcon = (iconName: string | null) => {
    switch (iconName) {
      case 'GraduationCap': return GraduationCap;
      case 'ShoppingBag': return ShoppingBag;
      case 'Package': return Package;
      case 'Home': return Home;
      case 'Globe': return Globe;
      case 'Bed': return Bed;
      case 'RefreshCw': return RotateCw;
      default: return Package;
    }
  };

  const [formData, setFormData] = useState({
    taxas_cartao: {
      debito: 1.99,
      credito_1x: 3.50,
      credito_2x_6x: 4.90,
      credito_7x_12x: 12.50,
    } as TaxasCartao,
    taxa_pix: 0,
    taxa_imposto_padrao: 6.0,
    meta_mensal: 15000,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        taxas_cartao: config.taxas_cartao || {
          debito: 1.99,
          credito_1x: 3.50,
          credito_2x_6x: 4.90,
          credito_7x_12x: 12.50,
        },
        taxa_pix: config.taxa_pix,
        taxa_imposto_padrao: config.taxa_imposto_padrao,
        meta_mensal: config.meta_mensal,
      });
      setHasChanges(false);
    }
  }, [config]);

  const handleTaxaCartaoChange = (field: keyof TaxasCartao, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      taxas_cartao: {
        ...prev.taxas_cartao,
        [field]: numValue,
      },
    }));
    setHasChanges(true);
  };

  const handleChange = (field: 'taxa_pix' | 'taxa_imposto_padrao' | 'meta_mensal', value: string) => {
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
        taxas_cartao: config.taxas_cartao || {
          debito: 1.99,
          credito_1x: 3.50,
          credito_2x_6x: 4.90,
          credito_7x_12x: 12.50,
        },
        taxa_pix: config.taxa_pix,
        taxa_imposto_padrao: config.taxa_imposto_padrao,
        meta_mensal: config.meta_mensal,
      });
      setHasChanges(false);
      toast.info("Alterações descartadas");
    }
  };

  // Atualizar regra fiscal por categoria
  const handleTaxRuleUpdate = async (rule: TaxRule, field: 'estimated_tax_rate' | 'card_fee_rate', value: number) => {
    try {
      await updateTaxRule.mutateAsync({
        id: rule.id,
        updates: { [field]: value }
      });
      toast.success(`Taxa de ${rule.label} atualizada!`);
    } catch (error) {
      toast.error("Erro ao atualizar regra");
      console.error(error);
    }
  };

  const handleTaxRuleToggle = async (rule: TaxRule, isActive: boolean) => {
    try {
      await updateTaxRule.mutateAsync({
        id: rule.id,
        updates: { is_active: isActive }
      });
      toast.success(`${rule.label} ${isActive ? 'ativada' : 'desativada'}`);
    } catch (error) {
      toast.error("Erro ao atualizar regra");
      console.error(error);
    }
  };

  // Simulação: Venda de R$ 1000 no crédito 12x
  const exampleValue = 1000;
  const taxaCartao = (exampleValue * formData.taxas_cartao.credito_7x_12x) / 100;
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
            Configure as taxas variáveis e metas para cálculos automáticos
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

      <Tabs defaultValue="taxas" className="space-y-6">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="taxas" className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Taxas de Cartão
          </TabsTrigger>
          <TabsTrigger value="categorias" className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Regras por Categoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="taxas" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Taxas de Cartão - Nova estrutura com 4 campos */}
            <PremiumCard className="lg:col-span-2">
          <PremiumCardHeader>
            <div className="flex items-center gap-3">
              <div className="icon-container icon-container-primary h-10 w-10">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <PremiumCardTitle>Taxas de Cartão</PremiumCardTitle>
                <PremiumCardDescription>
                  Taxas variáveis por modalidade de pagamento
                </PremiumCardDescription>
              </div>
            </div>
          </PremiumCardHeader>
          <PremiumCardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Débito */}
              <div className="space-y-2">
                <Label htmlFor="taxa_debito" className="flex items-center gap-2">
                  Débito
                  <PremiumBadge variant="success" size="sm">Menor taxa</PremiumBadge>
                </Label>
                <div className="relative">
                  <Input
                    id="taxa_debito"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.taxas_cartao.debito}
                    onChange={(e) => handleTaxaCartaoChange('debito', e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Transações no débito
                </p>
              </div>

              {/* Crédito à Vista */}
              <div className="space-y-2">
                <Label htmlFor="taxa_credito_1x" className="flex items-center gap-2">
                  Crédito à Vista (1x)
                  <PremiumBadge variant="neutral" size="sm">
                    <Percent className="h-3 w-3" />
                  </PremiumBadge>
                </Label>
                <div className="relative">
                  <Input
                    id="taxa_credito_1x"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.taxas_cartao.credito_1x}
                    onChange={(e) => handleTaxaCartaoChange('credito_1x', e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Crédito sem parcelamento
                </p>
              </div>

              {/* Crédito 2x a 6x */}
              <div className="space-y-2">
                <Label htmlFor="taxa_credito_2x_6x" className="flex items-center gap-2">
                  Crédito (2x a 6x)
                  <PremiumBadge variant="warning" size="sm">
                    <Percent className="h-3 w-3" />
                  </PremiumBadge>
                </Label>
                <div className="relative">
                  <Input
                    id="taxa_credito_2x_6x"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.taxas_cartao.credito_2x_6x}
                    onChange={(e) => handleTaxaCartaoChange('credito_2x_6x', e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Parcelado curto prazo
                </p>
              </div>

              {/* Crédito 7x a 12x */}
              <div className="space-y-2">
                <Label htmlFor="taxa_credito_7x_12x" className="flex items-center gap-2">
                  Crédito (7x a 12x)
                  <PremiumBadge variant="urgent" size="sm">Maior taxa</PremiumBadge>
                </Label>
                <div className="relative">
                  <Input
                    id="taxa_credito_7x_12x"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.taxas_cartao.credito_7x_12x}
                    onChange={(e) => handleTaxaCartaoChange('credito_7x_12x', e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Parcelado longo prazo
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* PIX */}
            <div className="max-w-xs">
              <Label htmlFor="taxa_pix" className="flex items-center gap-2">
                PIX
                <PremiumBadge variant="success" size="sm">Geralmente grátis</PremiumBadge>
              </Label>
              <div className="relative mt-2">
                <Input
                  id="taxa_pix"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.taxa_pix}
                  onChange={(e) => handleChange('taxa_pix', e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Alguns gateways cobram taxa sobre PIX
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

            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-accent mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Provisionamento de Impostos
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Este valor é separado automaticamente de cada venda para que você tenha 
                    dinheiro guardado quando os impostos forem cobrados.
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

        {/* Simulação - Crédito 12x (pior caso) */}
        <PremiumCard featured gradient="primary" className="lg:col-span-2">
          <PremiumCardHeader>
            <div className="flex items-center gap-3">
              <div className="icon-container icon-container-primary h-10 w-10">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <PremiumCardTitle>Simulação: Venda de R$ 1.000 no Crédito 12x</PremiumCardTitle>
                <PremiumCardDescription>
                  Pior cenário de margem com parcelamento longo
                </PremiumCardDescription>
              </div>
            </div>
          </PremiumCardHeader>
          <PremiumCardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Valor da venda</span>
                  <span className="font-medium">R$ {exampleValue.toLocaleString('pt-BR')}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center text-destructive">
                  <span className="text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Taxa Cartão 12x ({formData.taxas_cartao.credito_7x_12x}%)
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
              </div>

              <div className="flex flex-col items-center justify-center gap-4 p-6 rounded-xl bg-background/50">
                <PremiumBadge variant={lucroLiquido > 0 ? "success" : "urgent"} size="lg">
                  {((lucroLiquido / exampleValue) * 100).toFixed(1)}% de margem
                </PremiumBadge>
                <p className="text-xs text-center text-muted-foreground">
                  Este é o pior cenário. <br />
                  Débito e PIX terão margens melhores.
                </p>
              </div>
            </div>
          </PremiumCardContent>
        </PremiumCard>
          </div>
        </TabsContent>

        <TabsContent value="categorias" className="space-y-6">
          {/* Banner Explicativo */}
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-accent/10 to-primary/5 border border-accent/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Info className="h-5 w-5 text-accent" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Como funciona?</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Cada tipo de receita pode ter uma <span className="font-medium text-foreground">taxa de imposto diferente</span>. 
                  Quando você registra uma venda ou aula, o sistema aplica automaticamente a regra correspondente para 
                  calcular seu <span className="font-medium text-success">lucro líquido real</span>.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  💡 As taxas de cartão são aplicadas conforme a forma de pagamento escolhida (configuradas na aba anterior).
                </p>
              </div>
            </div>
          </div>

          {/* Grid de Cards de Categorias */}
          {isLoadingRules ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              {taxRules.map((rule) => {
                const Icon = getCategoryIcon(rule.icon);
                const simulationValue = 500;
                const impostoValue = (simulationValue * rule.estimated_tax_rate) / 100;
                const liquidoValue = simulationValue - impostoValue;
                const margemPercent = ((liquidoValue / simulationValue) * 100).toFixed(1);
                
                return (
                  <PremiumCard 
                    key={rule.id} 
                    className={`transition-all duration-300 ${!rule.is_active ? 'opacity-50 grayscale' : ''}`}
                  >
                    <PremiumCardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${rule.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <PremiumCardTitle className="text-base sm:text-lg">{rule.label}</PremiumCardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{rule.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${rule.is_active ? 'text-success' : 'text-muted-foreground'}`}>
                            {rule.is_active ? 'Ativa' : 'Inativa'}
                          </span>
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={(checked) => handleTaxRuleToggle(rule, checked)}
                            className="data-[state=checked]:bg-success"
                          />
                        </div>
                      </div>
                    </PremiumCardHeader>
                    
                    <PremiumCardContent className="space-y-4">
                      {/* Campo de Taxa de Imposto */}
                      <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-2">
                          <Landmark className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Taxa de Imposto</span>
                        </div>
                        <div className="relative w-24">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={rule.estimated_tax_rate}
                            onChange={(e) => handleTaxRuleUpdate(rule, 'estimated_tax_rate', parseFloat(e.target.value) || 0)}
                            className="pr-7 h-10 text-right font-medium min-h-[44px]"
                            disabled={!rule.is_active}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                        </div>
                      </div>
                      
                      {/* Simulação em Tempo Real */}
                      <div className={`p-4 rounded-xl border-2 border-dashed transition-colors ${rule.is_active ? 'border-success/30 bg-success/5' : 'border-muted bg-muted/20'}`}>
                        <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                          SIMULAÇÃO: Venda de R$ {simulationValue.toLocaleString('pt-BR')}
                        </p>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Valor Bruto</span>
                            <span className="font-medium">R$ {simulationValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-destructive/80">Imposto ({rule.estimated_tax_rate}%)</span>
                            <span className="font-medium text-destructive">- R$ {impostoValue.toFixed(2)}</span>
                          </div>
                          
                          <Separator className="my-2" />
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-success">Você recebe</span>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-success">
                                R$ {liquidoValue.toFixed(2)}
                              </span>
                              <PremiumBadge 
                                variant={Number(margemPercent) >= 90 ? "success" : Number(margemPercent) >= 80 ? "warning" : "urgent"} 
                                size="sm"
                              >
                                {margemPercent}%
                              </PremiumBadge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </PremiumCardContent>
                  </PremiumCard>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}