import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Settings, Bell, Mail, Phone, MapPin, DollarSign, Building2, Globe, Award, Ship, Plug } from "lucide-react";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle, PremiumCardDescription } from "@/components/ui/premium-card";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { NuvemshopIntegration } from "@/components/NuvemshopIntegration";

export default function Configuracoes() {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    // Informações da Empresa
    empresaNome: "GoKite - Escola de Kitesurf",
    empresaEmail: "contato@gokite.com.br",
    empresaWhatsApp: "5548984091618",
    empresaSite: "https://gokite.com.br",
    empresaInstagram: "@gokitebrasil",
    
    // Descrição
    empresaDescricao: "Há mais de 20 anos formando praticantes de kitesurf, wing foil e foil. Estrutura completa com barco de apoio, equipamentos Duotone de última geração e instrutores certificados IKO.",
    anosExperiencia: 20,
    diferenciais: "Barco de apoio, Equipamentos Duotone, Instrutores IKO, Duas bases (Floripa e Taíba)",
    
    // Localização Florianópolis
    floripa_endereco: "Lagoa da Conceição - Florianópolis/SC",
    floripa_whatsapp: "5548984091618",
    
    // Localização Taíba
    taiba_endereco: "Praia da Taíba - São Gonçalo do Amarante/CE",
    taiba_whatsapp: "5548984091618",
    
    // Valores das Aulas
    valorKitesurfIniciante: 450,
    valorKitesurfIntermediario: 550,
    valorKitesurfAvancado: 650,
    valorWingFoil: 750,
    valorFoil: 800,
    valorDownwind: 900,
    
    // Notificações
    notificacoesEmail: true,
    notificacoesWhatsApp: true,
    autoConfirmarAgendamentos: false,
    
    // E-commerce
    freteGratis: true,
    parcelasMaximas: 6,
  });

  const handleSave = () => {
    localStorage.setItem('gokite_config', JSON.stringify(config));
    toast({
      title: "Configurações salvas!",
      description: "Suas alterações foram aplicadas com sucesso.",
    });
  };

  const handleReset = () => {
    const defaultConfig = {
      empresaNome: "GoKite - Escola de Kitesurf",
      empresaEmail: "contato@gokite.com.br",
      empresaWhatsApp: "5548984091618",
      empresaSite: "https://gokite.com.br",
      empresaInstagram: "@gokitebrasil",
      empresaDescricao: "Há mais de 20 anos formando praticantes de kitesurf, wing foil e foil. Estrutura completa com barco de apoio, equipamentos Duotone de última geração e instrutores certificados IKO.",
      anosExperiencia: 20,
      diferenciais: "Barco de apoio, Equipamentos Duotone, Instrutores IKO, Duas bases (Floripa e Taíba)",
      floripa_endereco: "Lagoa da Conceição - Florianópolis/SC",
      floripa_whatsapp: "5548984091618",
      taiba_endereco: "Praia da Taíba - São Gonçalo do Amarante/CE",
      taiba_whatsapp: "5548984091618",
      valorKitesurfIniciante: 450,
      valorKitesurfIntermediario: 550,
      valorKitesurfAvancado: 650,
      valorWingFoil: 750,
      valorFoil: 800,
      valorDownwind: 900,
      notificacoesEmail: true,
      notificacoesWhatsApp: true,
      autoConfirmarAgendamentos: false,
      freteGratis: true,
      parcelasMaximas: 6,
    };
    setConfig(defaultConfig);
    toast({
      title: "Configurações restauradas",
      description: "Valores padrão foram restaurados.",
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Configurações</h1>
            <PremiumBadge variant="accent">
              <Award className="h-3 w-3 mr-1" />
              20+ Anos
            </PremiumBadge>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">Gerencie as configurações da GoKite</p>
        </div>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="geral" className="gap-2">
            <Settings className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-2">
            <Plug className="h-4 w-4" />
            Integrações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4 sm:space-y-6 mt-6">

      {/* Informações da Empresa */}
      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Informações da Empresa
          </PremiumCardTitle>
          <PremiumCardDescription>
            Dados básicos da GoKite - Escola de Kitesurf
          </PremiumCardDescription>
        </PremiumCardHeader>
        <PremiumCardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="empresaNome">Nome da Empresa</Label>
              <Input
                id="empresaNome"
                value={config.empresaNome}
                onChange={(e) => setConfig({ ...config, empresaNome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresaEmail" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="empresaEmail"
                type="email"
                value={config.empresaEmail}
                onChange={(e) => setConfig({ ...config, empresaEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresaWhatsApp" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                WhatsApp Principal
              </Label>
              <Input
                id="empresaWhatsApp"
                value={config.empresaWhatsApp}
                onChange={(e) => setConfig({ ...config, empresaWhatsApp: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresaSite" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Site
              </Label>
              <Input
                id="empresaSite"
                value={config.empresaSite}
                onChange={(e) => setConfig({ ...config, empresaSite: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresaInstagram">Instagram</Label>
              <Input
                id="empresaInstagram"
                value={config.empresaInstagram}
                onChange={(e) => setConfig({ ...config, empresaInstagram: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anosExperiencia" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Anos de Experiência
              </Label>
              <Input
                id="anosExperiencia"
                type="number"
                value={config.anosExperiencia}
                onChange={(e) => setConfig({ ...config, anosExperiencia: Number(e.target.value) })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="empresaDescricao">Descrição da Empresa</Label>
            <Textarea
              id="empresaDescricao"
              value={config.empresaDescricao}
              onChange={(e) => setConfig({ ...config, empresaDescricao: e.target.value })}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="diferenciais" className="flex items-center gap-2">
              <Ship className="h-4 w-4" />
              Diferenciais
            </Label>
            <Input
              id="diferenciais"
              value={config.diferenciais}
              onChange={(e) => setConfig({ ...config, diferenciais: e.target.value })}
              placeholder="Barco de apoio, Equipamentos premium..."
            />
          </div>
        </PremiumCardContent>
      </PremiumCard>

      {/* Localizações */}
      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Localizações
            <PremiumBadge variant="default" className="ml-2">2 Bases</PremiumBadge>
          </PremiumCardTitle>
          <PremiumCardDescription>
            Dois dos principais destinos de vento do Brasil
          </PremiumCardDescription>
        </PremiumCardHeader>
        <PremiumCardContent className="space-y-6">
          {/* Florianópolis */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="font-semibold">Base Florianópolis</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="floripa_endereco">Endereço</Label>
                <Input
                  id="floripa_endereco"
                  value={config.floripa_endereco}
                  onChange={(e) => setConfig({ ...config, floripa_endereco: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floripa_whatsapp">WhatsApp</Label>
                <Input
                  id="floripa_whatsapp"
                  value={config.floripa_whatsapp}
                  onChange={(e) => setConfig({ ...config, floripa_whatsapp: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          {/* Taíba */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <span className="font-semibold">Base Taíba</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="taiba_endereco">Endereço</Label>
                <Input
                  id="taiba_endereco"
                  value={config.taiba_endereco}
                  onChange={(e) => setConfig({ ...config, taiba_endereco: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taiba_whatsapp">WhatsApp</Label>
                <Input
                  id="taiba_whatsapp"
                  value={config.taiba_whatsapp}
                  onChange={(e) => setConfig({ ...config, taiba_whatsapp: e.target.value })}
                />
              </div>
            </div>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      {/* Valores das Aulas */}
      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Valores das Aulas
          </PremiumCardTitle>
          <PremiumCardDescription>
            Configure os preços para cada modalidade
          </PremiumCardDescription>
        </PremiumCardHeader>
        <PremiumCardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="valorKitesurfIniciante">Kitesurf Iniciante (R$)</Label>
              <Input
                id="valorKitesurfIniciante"
                type="number"
                value={config.valorKitesurfIniciante}
                onChange={(e) => setConfig({ ...config, valorKitesurfIniciante: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorKitesurfIntermediario">Kitesurf Intermediário (R$)</Label>
              <Input
                id="valorKitesurfIntermediario"
                type="number"
                value={config.valorKitesurfIntermediario}
                onChange={(e) => setConfig({ ...config, valorKitesurfIntermediario: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorKitesurfAvancado">Kitesurf Avançado (R$)</Label>
              <Input
                id="valorKitesurfAvancado"
                type="number"
                value={config.valorKitesurfAvancado}
                onChange={(e) => setConfig({ ...config, valorKitesurfAvancado: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorWingFoil">Wing Foil (R$)</Label>
              <Input
                id="valorWingFoil"
                type="number"
                value={config.valorWingFoil}
                onChange={(e) => setConfig({ ...config, valorWingFoil: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorFoil">Foil (R$)</Label>
              <Input
                id="valorFoil"
                type="number"
                value={config.valorFoil}
                onChange={(e) => setConfig({ ...config, valorFoil: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorDownwind">Downwind (R$)</Label>
              <Input
                id="valorDownwind"
                type="number"
                value={config.valorDownwind}
                onChange={(e) => setConfig({ ...config, valorDownwind: Number(e.target.value) })}
              />
            </div>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      {/* E-commerce */}
      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            E-commerce
            <PremiumBadge variant="success" className="ml-2">Duotone</PremiumBadge>
          </PremiumCardTitle>
          <PremiumCardDescription>
            Configurações da loja online - Equipamentos Duotone
          </PremiumCardDescription>
        </PremiumCardHeader>
        <PremiumCardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="frete-gratis">Frete Grátis</Label>
              <p className="text-sm text-muted-foreground">
                Oferecer frete grátis para todo Brasil
              </p>
            </div>
            <Switch
              id="frete-gratis"
              checked={config.freteGratis}
              onCheckedChange={(checked) => setConfig({ ...config, freteGratis: checked })}
            />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="parcelasMaximas">Parcelas Máximas (sem juros)</Label>
            <Input
              id="parcelasMaximas"
              type="number"
              value={config.parcelasMaximas}
              onChange={(e) => setConfig({ ...config, parcelasMaximas: Number(e.target.value) })}
              className="w-32"
            />
          </div>
        </PremiumCardContent>
      </PremiumCard>

      {/* Notificações */}
      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notificações
          </PremiumCardTitle>
          <PremiumCardDescription>
            Configure como deseja receber notificações
          </PremiumCardDescription>
        </PremiumCardHeader>
        <PremiumCardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-email">Notificações por Email</Label>
              <p className="text-sm text-muted-foreground">
                Receba emails quando houver novos agendamentos
              </p>
            </div>
            <Switch
              id="notif-email"
              checked={config.notificacoesEmail}
              onCheckedChange={(checked) => setConfig({ ...config, notificacoesEmail: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-whatsapp">Notificações por WhatsApp</Label>
              <p className="text-sm text-muted-foreground">
                Receba mensagens no WhatsApp sobre agendamentos
              </p>
            </div>
            <Switch
              id="notif-whatsapp"
              checked={config.notificacoesWhatsApp}
              onCheckedChange={(checked) => setConfig({ ...config, notificacoesWhatsApp: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-confirmar">Auto-confirmar Agendamentos</Label>
              <p className="text-sm text-muted-foreground">
                Confirmar automaticamente novos agendamentos
              </p>
            </div>
            <Switch
              id="auto-confirmar"
              checked={config.autoConfirmarAgendamentos}
              onCheckedChange={(checked) => setConfig({ ...config, autoConfirmarAgendamentos: checked })}
            />
          </div>
        </PremiumCardContent>
      </PremiumCard>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <Button onClick={handleSave} className="flex-1 min-h-[44px]">
          Salvar Alterações
        </Button>
        <Button onClick={handleReset} variant="outline" className="min-h-[44px] sm:w-auto">
          Restaurar Padrões
        </Button>
      </div>
        </TabsContent>

        <TabsContent value="integracoes" className="space-y-4 sm:space-y-6 mt-6">
          <NuvemshopIntegration />
        </TabsContent>
      </Tabs>
    </div>
  );
}
