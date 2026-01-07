import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Building2,
  Filter,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/ui/premium-card";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useContasAPagar,
  useContasAPagarSummary,
  useCreateContaAPagar,
  useMarcarComoPago,
  useDeleteContaAPagar,
  ContaAPagar,
} from "@/hooks/useContasAPagar";
import { format, parseISO, isBefore, isToday, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const CATEGORIAS = [
  { value: "aluguel", label: "Aluguel" },
  { value: "funcionarios", label: "Funcionários" },
  { value: "impostos", label: "Impostos" },
  { value: "fornecedores", label: "Fornecedores" },
  { value: "manutencao", label: "Manutenção" },
  { value: "marketing", label: "Marketing" },
  { value: "servicos", label: "Serviços" },
  { value: "outros", label: "Outros" },
];

const CENTROS_CUSTO = [
  { value: "Escola", label: "Escola" },
  { value: "Loja", label: "Loja" },
  { value: "Administrativo", label: "Administrativo" },
  { value: "Pousada", label: "Pousada" },
];

export default function ContasAPagar() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pendente");
  const { toast } = useToast();

  const { data: contasPendentes = [], isLoading: loadingPendentes } = useContasAPagar({ status: "pendente" });
  const { data: contasPagas = [], isLoading: loadingPagas } = useContasAPagar({ status: "pago" });
  const { data: summary } = useContasAPagarSummary();

  const createMutation = useCreateContaAPagar();
  const marcarPagoMutation = useMarcarComoPago();
  const deleteMutation = useDeleteContaAPagar();

  const [formData, setFormData] = useState({
    descricao: "",
    valor: "",
    data_vencimento: "",
    categoria: "outros",
    centro_de_custo: "Administrativo",
    fornecedor: "",
    notas: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.descricao || !formData.valor || !formData.data_vencimento) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    try {
      await createMutation.mutateAsync({
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        data_vencimento: formData.data_vencimento,
        categoria: formData.categoria,
        centro_de_custo: formData.centro_de_custo,
        fornecedor: formData.fornecedor || undefined,
        notas: formData.notas || undefined,
      });

      toast({ title: "Conta registrada com sucesso!" });
      setIsDialogOpen(false);
      setFormData({
        descricao: "",
        valor: "",
        data_vencimento: "",
        categoria: "outros",
        centro_de_custo: "Administrativo",
        fornecedor: "",
        notas: "",
      });
    } catch (error) {
      toast({ title: "Erro ao registrar conta", variant: "destructive" });
    }
  };

  const handleMarcarPago = async (id: string) => {
    try {
      await marcarPagoMutation.mutateAsync(id);
      toast({ title: "Conta marcada como paga!" });
    } catch (error) {
      toast({ title: "Erro ao atualizar conta", variant: "destructive" });
    }
  };

  const getStatusBadge = (conta: ContaAPagar) => {
    const hoje = new Date();
    const vencimento = parseISO(conta.data_vencimento);

    if (conta.status === "pago") {
      return <PremiumBadge variant="success" icon={CheckCircle2} size="sm">Pago</PremiumBadge>;
    }

    if (isBefore(vencimento, hoje) && !isToday(vencimento)) {
      return <PremiumBadge variant="urgent" icon={AlertTriangle} size="sm">Vencido</PremiumBadge>;
    }

    if (isToday(vencimento)) {
      return <PremiumBadge variant="warning" icon={Clock} size="sm">Vence hoje</PremiumBadge>;
    }

    if (isBefore(vencimento, addDays(hoje, 7))) {
      return <PremiumBadge variant="warning" icon={Calendar} size="sm">Esta semana</PremiumBadge>;
    }

    return <PremiumBadge variant="info" icon={Calendar} size="sm">Futuro</PremiumBadge>;
  };

  const filteredPendentes = contasPendentes.filter(c =>
    c.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPagas = contasPagas.filter(c =>
    c.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link to="/financeiro">
            <Button variant="ghost" size="icon" className="h-10 w-10 min-h-[44px] min-w-[44px]">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-display text-foreground">
              Contas a Pagar
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Gerencie seus compromissos financeiros
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="min-h-[44px] gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nova Conta</span>
                <span className="sm:hidden">Nova</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Conta a Pagar</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Ex: Aluguel do galpão"
                    className="min-h-[48px]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor (R$) *</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      placeholder="0,00"
                      className="min-h-[48px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vencimento">Vencimento *</Label>
                    <Input
                      id="vencimento"
                      type="date"
                      value={formData.data_vencimento}
                      onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                      className="min-h-[48px]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                      <SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Centro de Custo</Label>
                    <Select value={formData.centro_de_custo} onValueChange={(v) => setFormData({ ...formData, centro_de_custo: v })}>
                      <SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CENTROS_CUSTO.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fornecedor">Fornecedor</Label>
                  <Input
                    id="fornecedor"
                    value={formData.fornecedor}
                    onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                    placeholder="Nome do fornecedor"
                    className="min-h-[48px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notas">Observações</Label>
                  <Textarea
                    id="notas"
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    placeholder="Notas adicionais..."
                    rows={2}
                    className="min-h-[60px]"
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <Button type="button" variant="outline" className="w-full sm:flex-1 min-h-[48px]" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="w-full sm:flex-1 min-h-[48px]" disabled={createMutation.isPending}>
                    Salvar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PremiumCard featured gradient="primary">
          <PremiumCardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Total Pendente</span>
            </div>
            <p className="text-2xl font-bold text-destructive">
              <AnimatedNumber value={summary?.totalPendente || 0} format="currency" />
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.qtdPendente || 0} conta(s)
            </p>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard>
          <PremiumCardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Vencido</span>
            </div>
            <p className="text-2xl font-bold text-destructive">
              <AnimatedNumber value={summary?.totalVencido || 0} format="currency" />
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.qtdVencido || 0} conta(s)
            </p>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard>
          <PremiumCardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-warning" />
              <span className="text-xs text-muted-foreground">Vencendo em 7 dias</span>
            </div>
            <p className="text-2xl font-bold text-warning">
              <AnimatedNumber value={summary?.totalVencendo7Dias || 0} format="currency" />
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.qtdVencendo7Dias || 0} conta(s)
            </p>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard>
          <PremiumCardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-chart-1" />
              <span className="text-xs text-muted-foreground">Futuro</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              <AnimatedNumber value={summary?.totalFuturo || 0} format="currency" />
            </p>
          </PremiumCardContent>
        </PremiumCard>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por descrição ou fornecedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="pendente" className="flex-1 sm:flex-none">
            Pendentes ({contasPendentes.length})
          </TabsTrigger>
          <TabsTrigger value="pago" className="flex-1 sm:flex-none">
            Pagas ({contasPagas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendente" className="space-y-3 mt-4">
          {filteredPendentes.length === 0 ? (
            <PremiumCard>
              <PremiumCardContent className="p-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma conta pendente! 🎉</p>
              </PremiumCardContent>
            </PremiumCard>
          ) : (
            filteredPendentes.map((conta) => (
              <PremiumCard key={conta.id} className="hover-lift">
                <PremiumCardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{conta.descricao}</p>
                        {getStatusBadge(conta)}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(conta.data_vencimento), "dd/MM/yyyy")}
                        </span>
                        {conta.fornecedor && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {conta.fornecedor}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 bg-muted rounded text-xs">
                          {CATEGORIAS.find(c => c.value === conta.categoria)?.label || conta.categoria}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-destructive">
                        {formatCurrency(conta.valor)}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => handleMarcarPago(conta.id)}
                        disabled={marcarPagoMutation.isPending}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Pagar
                      </Button>
                    </div>
                  </div>
                </PremiumCardContent>
              </PremiumCard>
            ))
          )}
        </TabsContent>

        <TabsContent value="pago" className="space-y-3 mt-4">
          {filteredPagas.length === 0 ? (
            <PremiumCard>
              <PremiumCardContent className="p-8 text-center text-muted-foreground">
                <p>Nenhuma conta paga encontrada.</p>
              </PremiumCardContent>
            </PremiumCard>
          ) : (
            filteredPagas.map((conta) => (
              <PremiumCard key={conta.id} className="opacity-75">
                <PremiumCardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{conta.descricao}</p>
                        {getStatusBadge(conta)}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Pago em {format(parseISO(conta.data_pagamento!), "dd/MM/yyyy")}</span>
                        {conta.fornecedor && <span>• {conta.fornecedor}</span>}
                      </div>
                    </div>
                    <p className="text-lg font-bold text-muted-foreground">
                      {formatCurrency(conta.valor)}
                    </p>
                  </div>
                </PremiumCardContent>
              </PremiumCard>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
