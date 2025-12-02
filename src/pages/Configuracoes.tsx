import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, Bell, Mail, Phone, MapPin, DollarSign } from "lucide-react";

export default function Configuracoes() {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    empresaNome: "Gokite School",
    empresaEmail: "contato@gokite.com",
    empresaWhatsApp: "554891541618",
    empresaEndereco: "Florianópolis, SC",
    valorAulaIniciante: 400,
    valorAulaIntermediario: 500,
    valorAulaAvancado: 600,
    valorWingFoil: 700,
    notificacoesEmail: true,
    notificacoesWhatsApp: true,
    autoConfirmarAgendamentos: false,
  });

  const handleSave = () => {
    // Aqui você salvaria no localStorage ou backend
    localStorage.setItem('gokite_config', JSON.stringify(config));
    toast({
      title: "Configurações salvas!",
      description: "Suas alterações foram aplicadas com sucesso.",
    });
  };

  const handleReset = () => {
    const defaultConfig = {
      empresaNome: "Gokite School",
      empresaEmail: "contato@gokite.com",
      empresaWhatsApp: "554891541618",
      empresaEndereco: "Florianópolis, SC",
      valorAulaIniciante: 400,
      valorAulaIntermediario: 500,
      valorAulaAvancado: 600,
      valorWingFoil: 700,
      notificacoesEmail: true,
      notificacoesWhatsApp: true,
      autoConfirmarAgendamentos: false,
    };
    setConfig(defaultConfig);
    toast({
      title: "Configurações restauradas",
      description: "Valores padrão foram restaurados.",
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Gerencie as configurações da sua escola</p>
      </div>

      {/* Informações da Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Informações da Empresa
          </CardTitle>
          <CardDescription>
            Dados básicos da sua escola de kitesurf
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                WhatsApp
              </Label>
              <Input
                id="empresaWhatsApp"
                value={config.empresaWhatsApp}
                onChange={(e) => setConfig({ ...config, empresaWhatsApp: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresaEndereco" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço
              </Label>
              <Input
                id="empresaEndereco"
                value={config.empresaEndereco}
                onChange={(e) => setConfig({ ...config, empresaEndereco: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Valores das Aulas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Valores das Aulas
          </CardTitle>
          <CardDescription>
            Configure os preços para cada tipo de aula
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="valorIniciante">Aula Iniciante (R$)</Label>
              <Input
                id="valorIniciante"
                type="number"
                value={config.valorAulaIniciante}
                onChange={(e) => setConfig({ ...config, valorAulaIniciante: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorIntermediario">Aula Intermediário (R$)</Label>
              <Input
                id="valorIntermediario"
                type="number"
                value={config.valorAulaIntermediario}
                onChange={(e) => setConfig({ ...config, valorAulaIntermediario: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorAvancado">Aula Avançado (R$)</Label>
              <Input
                id="valorAvancado"
                type="number"
                value={config.valorAulaAvancado}
                onChange={(e) => setConfig({ ...config, valorAulaAvancado: Number(e.target.value) })}
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
          </div>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notificações
          </CardTitle>
          <CardDescription>
            Configure como deseja receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <Button onClick={handleSave} className="flex-1 min-h-[44px]">
          Salvar Alterações
        </Button>
        <Button onClick={handleReset} variant="outline" className="min-h-[44px] sm:w-auto">
          Restaurar Padrões
        </Button>
      </div>
    </div>
  );
}
