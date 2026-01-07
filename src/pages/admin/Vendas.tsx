import { useState, useMemo } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  DollarSign, 
  TrendingUp, 
  Package, 
  GraduationCap,
  Repeat,
  Loader2,
  Filter,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PremiumCard } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { useTransacoes, useTransacoesSummary, type Transacao } from "@/hooks/useTransacoes";
import { NovaVendaDialog } from "@/components/NovaVendaDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FiltroOrigem = 'todos' | 'aula' | 'aluguel' | 'venda_produto' | 'trade_in' | 'manual';
type FiltroPagamento = 'todos' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'trade_in';

export default function Vendas() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState<FiltroOrigem>('todos');
  const [filtroPagamento, setFiltroPagamento] = useState<FiltroPagamento>('todos');
  const [periodoSummary, setPeriodoSummary] = useState<'hoje' | 'semana' | 'mes'>('mes');

  // Buscar transações
  const { data: transacoes = [], isLoading } = useTransacoes({ 
    tipo: 'receita',
    limit: 100 
  });
  const { data: summary, isLoading: isLoadingSummary } = useTransacoesSummary(periodoSummary);

  // Filtrar transações
  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter(t => {
      const matchBusca = !busca || 
        t.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
        t.origem.toLowerCase().includes(busca.toLowerCase());
      const matchOrigem = filtroOrigem === 'todos' || t.origem === filtroOrigem;
      const matchPagamento = filtroPagamento === 'todos' || t.forma_pagamento === filtroPagamento;
      return matchBusca && matchOrigem && matchPagamento;
    });
  }, [transacoes, busca, filtroOrigem, filtroPagamento]);

  // Estatísticas por categoria
  const estatsPorCategoria = useMemo(() => {
    const aulas = transacoes.filter(t => t.origem === 'aula');
    const produtos = transacoes.filter(t => t.origem === 'venda_produto');
    const alugueis = transacoes.filter(t => t.origem === 'aluguel');
    const tradeIns = transacoes.filter(t => t.origem === 'trade_in');

    return {
      aulas: {
        total: aulas.reduce((sum, t) => sum + t.valor_bruto, 0),
        count: aulas.length
      },
      produtos: {
        total: produtos.reduce((sum, t) => sum + t.valor_bruto, 0),
        count: produtos.length
      },
      alugueis: {
        total: alugueis.reduce((sum, t) => sum + t.valor_bruto, 0),
        count: alugueis.length
      },
      tradeIns: {
        total: tradeIns.reduce((sum, t) => sum + t.valor_bruto, 0),
        count: tradeIns.length
      }
    };
  }, [transacoes]);

  const getOrigemLabel = (origem: string) => {
    const labels: Record<string, string> = {
      aula: 'Aula',
      aluguel: 'Aluguel',
      venda_produto: 'Produto',
      trade_in: 'Trade-In',
      manual: 'Manual'
    };
    return labels[origem] || origem;
  };

  const getOrigemIcon = (origem: string) => {
    switch (origem) {
      case 'aula': return <GraduationCap className="h-4 w-4" />;
      case 'aluguel': return <Calendar className="h-4 w-4" />;
      case 'venda_produto': return <Package className="h-4 w-4" />;
      case 'trade_in': return <Repeat className="h-4 w-4" />;
      default: return <ShoppingCart className="h-4 w-4" />;
    }
  };

  const getPagamentoIcon = (forma: string) => {
    switch (forma) {
      case 'pix': return <Smartphone className="h-4 w-4 text-success" />;
      case 'cartao_credito': 
      case 'cartao_debito': return <CreditCard className="h-4 w-4 text-primary" />;
      case 'dinheiro': return <Banknote className="h-4 w-4 text-warning" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getPagamentoLabel = (forma: string) => {
    const labels: Record<string, string> = {
      pix: 'PIX',
      cartao_credito: 'Crédito',
      cartao_debito: 'Débito',
      dinheiro: 'Dinheiro',
      trade_in: 'Trade-In'
    };
    return labels[forma] || forma;
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PremiumBadge variant="success" size="sm" icon={DollarSign}>
              ERP Comercial
            </PremiumBadge>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground tracking-tight">
            Central de Vendas
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gerencie todas as transações comerciais da GoKite
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 min-h-[44px] w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Nova Venda
        </Button>
      </div>

      {/* Período Toggle */}
      <div className="flex gap-2">
        <Button
          variant={periodoSummary === 'hoje' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriodoSummary('hoje')}
        >
          Hoje
        </Button>
        <Button
          variant={periodoSummary === 'semana' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriodoSummary('semana')}
        >
          Semana
        </Button>
        <Button
          variant={periodoSummary === 'mes' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriodoSummary('mes')}
        >
          Mês
        </Button>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <PremiumCard hover glow>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Receita Total
                </p>
                {isLoadingSummary ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <AnimatedNumber 
                    value={summary?.totalReceitas || 0} 
                    className="text-2xl sm:text-3xl font-bold text-success"
                    prefix="R$ "
                  />
                )}
              </div>
              <div className="icon-container bg-success/10 shrink-0">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Lucro Líquido
                </p>
                {isLoadingSummary ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <AnimatedNumber 
                    value={summary?.lucroLiquido || 0} 
                    className="text-2xl sm:text-3xl font-bold text-foreground"
                    prefix="R$ "
                  />
                )}
              </div>
              <div className="icon-container shrink-0">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Transações
                </p>
                {isLoadingSummary ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <AnimatedNumber 
                    value={summary?.qtdTransacoes || 0} 
                    className="text-2xl sm:text-3xl font-bold text-foreground"
                  />
                )}
              </div>
              <div className="icon-container shrink-0">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard hover>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1.5">
                  Margem Média
                </p>
                {isLoadingSummary ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <AnimatedNumber 
                    value={summary?.margemMedia || 0} 
                    className="text-2xl sm:text-3xl font-bold text-foreground"
                    suffix="%"
                    decimals={1}
                  />
                )}
              </div>
              <div className="icon-container shrink-0">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>
      </div>

      {/* KPIs por Categoria */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <PremiumCard className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aulas</p>
                <p className="text-lg font-bold">R$ {estatsPorCategoria.aulas.total.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">{estatsPorCategoria.aulas.count} vendas</p>
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Produtos</p>
                <p className="text-lg font-bold">R$ {estatsPorCategoria.produtos.total.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">{estatsPorCategoria.produtos.count} vendas</p>
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aluguéis</p>
                <p className="text-lg font-bold">R$ {estatsPorCategoria.alugueis.total.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">{estatsPorCategoria.alugueis.count} vendas</p>
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Repeat className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trade-Ins</p>
                <p className="text-lg font-bold">R$ {estatsPorCategoria.tradeIns.total.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">{estatsPorCategoria.tradeIns.count} vendas</p>
              </div>
            </div>
          </CardContent>
        </PremiumCard>
      </div>

      {/* Filtros e Lista */}
      <PremiumCard>
        <CardHeader className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 min-h-[44px] bg-muted/30 border-border/50 focus:bg-background"
                />
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select value={filtroOrigem} onValueChange={(v) => setFiltroOrigem(v as FiltroOrigem)}>
                <SelectTrigger className="w-[140px] min-h-[44px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aula">Aulas</SelectItem>
                  <SelectItem value="venda_produto">Produtos</SelectItem>
                  <SelectItem value="aluguel">Aluguéis</SelectItem>
                  <SelectItem value="trade_in">Trade-Ins</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroPagamento} onValueChange={(v) => setFiltroPagamento(v as FiltroPagamento)}>
                <SelectTrigger className="w-[140px] min-h-[44px]">
                  <CreditCard className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_credito">Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Débito</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : transacoesFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-foreground">Nenhuma venda encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em "Nova Venda" para registrar uma transação
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3 p-4">
                {transacoesFiltradas.map((transacao) => (
                  <div 
                    key={transacao.id} 
                    className="p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          {getOrigemIcon(transacao.origem)}
                        </div>
                        <div>
                          <p className="font-medium text-sm line-clamp-1">
                            {transacao.descricao || getOrigemLabel(transacao.origem)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(transacao.data_transacao), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <PremiumBadge 
                        variant={transacao.lucro_liquido >= 0 ? 'success' : 'warning'}
                        size="sm"
                      >
                        {getOrigemLabel(transacao.origem)}
                      </PremiumBadge>
                    </div>
                    
                    {/* Values Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-0.5">Valor</p>
                        <p className="font-semibold">R$ {transacao.valor_bruto.toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-0.5">Lucro</p>
                        <p className={`font-semibold ${transacao.lucro_liquido >= 0 ? 'text-success' : 'text-destructive'}`}>
                          R$ {transacao.lucro_liquido.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                      {getPagamentoIcon(transacao.forma_pagamento)}
                      <span className="text-xs text-muted-foreground">
                        {getPagamentoLabel(transacao.forma_pagamento)}
                        {transacao.parcelas > 1 && ` (${transacao.parcelas}x)`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transacoesFiltradas.map((transacao) => (
                      <TableRow key={transacao.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(transacao.data_transacao), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getOrigemIcon(transacao.origem)}
                            <span>{getOrigemLabel(transacao.origem)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {transacao.descricao || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getPagamentoIcon(transacao.forma_pagamento)}
                            <span>{getPagamentoLabel(transacao.forma_pagamento)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {transacao.valor_bruto.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${transacao.lucro_liquido >= 0 ? 'text-success' : 'text-destructive'}`}>
                          R$ {transacao.lucro_liquido.toLocaleString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </PremiumCard>

      <NovaVendaDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          setDialogOpen(false);
          toast({
            title: "Venda registrada!",
            description: "A transação foi salva com sucesso."
          });
        }}
      />
    </div>
  );
}
