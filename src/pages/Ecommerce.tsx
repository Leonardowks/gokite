import { useState, useEffect } from "react";
import { ShoppingCart, Package, TrendingUp, DollarSign, Truck, CheckCircle, Clock, AlertCircle, Eye, MessageSquare, Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle, PremiumCardDescription } from "@/components/ui/premium-card";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { localStorageService, PedidoEcommerce } from "@/lib/localStorage";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  pendente: { label: 'Pendente', icon: <Clock className="h-3 w-3" />, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  pago: { label: 'Pago', icon: <DollarSign className="h-3 w-3" />, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  separando: { label: 'Separando', icon: <Package className="h-3 w-3" />, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  enviado: { label: 'Enviado', icon: <Truck className="h-3 w-3" />, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  entregue: { label: 'Entregue', icon: <CheckCircle className="h-3 w-3" />, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  cancelado: { label: 'Cancelado', icon: <AlertCircle className="h-3 w-3" />, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
};

export default function Ecommerce() {
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState<PedidoEcommerce[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    localStorageService.inicializarMockCompleto();
    carregarPedidos();
  }, []);

  const carregarPedidos = () => {
    const data = localStorageService.listarPedidos();
    setPedidos(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  };

  const atualizarStatus = (id: string, novoStatus: PedidoEcommerce['status']) => {
    localStorageService.atualizarPedido(id, { status: novoStatus });
    carregarPedidos();
    toast({
      title: "Status atualizado",
      description: `Pedido atualizado para ${statusConfig[novoStatus].label}`,
    });
  };

  const contatarCliente = (pedido: PedidoEcommerce) => {
    const mensagem = `Olá ${pedido.cliente_nome}! Aqui é da GoKite. Sobre seu pedido #${pedido.id.slice(-4)}, gostaria de informar...`;
    window.open(`https://wa.me/${pedido.cliente_whatsapp}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  // Filtrar pedidos
  const pedidosFiltrados = pedidos.filter(p => {
    const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus;
    const matchBusca = busca === '' || 
      p.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.id.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchBusca;
  });

  // Estatísticas
  const totalPedidos = pedidos.length;
  const pedidosPendentes = pedidos.filter(p => p.status === 'pendente' || p.status === 'pago' || p.status === 'separando').length;
  const pedidosEnviados = pedidos.filter(p => p.status === 'enviado').length;
  const pedidosEntregues = pedidos.filter(p => p.status === 'entregue').length;
  const receitaTotal = pedidos.filter(p => p.status !== 'cancelado').reduce((sum, p) => sum + p.valor_total, 0);
  const ticketMedio = totalPedidos > 0 ? receitaTotal / pedidos.filter(p => p.status !== 'cancelado').length : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">E-commerce</h1>
            <PremiumBadge variant="accent">
              <ShoppingCart className="h-3 w-3 mr-1" />
              Duotone Store
            </PremiumBadge>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">Gestão de pedidos da loja online - Equipamentos Duotone</p>
        </div>
        <div className="flex items-center gap-2">
          <PremiumBadge variant="success">Frete Grátis</PremiumBadge>
          <PremiumBadge variant="default">6x Sem Juros</PremiumBadge>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <PremiumCard hover>
          <PremiumCardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Pedidos</p>
                <AnimatedNumber value={totalPedidos} className="text-xl font-bold" />
              </div>
            </div>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard hover>
          <PremiumCardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">A Processar</p>
                <AnimatedNumber value={pedidosPendentes} className="text-xl font-bold" />
              </div>
            </div>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard hover>
          <PremiumCardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Truck className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Em Trânsito</p>
                <AnimatedNumber value={pedidosEnviados} className="text-xl font-bold" />
              </div>
            </div>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard hover>
          <PremiumCardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Entregues</p>
                <AnimatedNumber value={pedidosEntregues} className="text-xl font-bold" />
              </div>
            </div>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard hover className="col-span-2 lg:col-span-1">
          <PremiumCardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <DollarSign className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receita Total</p>
                <AnimatedNumber value={receitaTotal} format="currency" className="text-xl font-bold" />
              </div>
            </div>
          </PremiumCardContent>
        </PremiumCard>
      </div>

      {/* Métricas Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PremiumCard>
          <PremiumCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <AnimatedNumber value={ticketMedio} format="currency" className="text-2xl font-bold" />
              </div>
              <TrendingUp className="h-8 w-8 text-green-500/50" />
            </div>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard>
          <PremiumCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <AnimatedNumber value={3.2} format="percent" className="text-2xl font-bold" />
              </div>
              <TrendingUp className="h-8 w-8 text-primary/50" />
            </div>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard>
          <PremiumCardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Produtos Mais Vendidos</p>
                <p className="text-lg font-semibold text-primary">Kites Duotone</p>
              </div>
              <Package className="h-8 w-8 text-accent/50" />
            </div>
          </PremiumCardContent>
        </PremiumCard>
      </div>

      {/* Filtros */}
      <PremiumCard>
        <PremiumCardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou pedido..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="separando">Separando</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      {/* Pedidos */}
      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Pedidos Recentes
            <PremiumBadge variant="default" className="ml-2">{pedidosFiltrados.length}</PremiumBadge>
          </PremiumCardTitle>
          <PremiumCardDescription>
            Gerencie os pedidos da loja online
          </PremiumCardDescription>
        </PremiumCardHeader>
        <PremiumCardContent>
          {pedidosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {pedidosFiltrados.map((pedido) => {
                  const status = statusConfig[pedido.status];
                  return (
                    <PremiumCard key={pedido.id} hover className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{pedido.cliente_nome}</p>
                            <p className="text-xs text-muted-foreground">#{pedido.id.slice(-4)}</p>
                          </div>
                          <Badge className={`${status.bgColor} ${status.color} border-0`}>
                            {status.icon}
                            <span className="ml-1">{status.label}</span>
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          {pedido.itens.map((item, i) => (
                            <p key={i}>{item.quantidade}x {item.produto_nome} ({item.tamanho})</p>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-lg text-primary">
                            R$ {pedido.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                          <Select 
                            value={pedido.status} 
                            onValueChange={(value) => atualizarStatus(pedido.id, value as PedidoEcommerce['status'])}
                          >
                            <SelectTrigger className="flex-1 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="pago">Pago</SelectItem>
                              <SelectItem value="separando">Separando</SelectItem>
                              <SelectItem value="enviado">Enviado</SelectItem>
                              <SelectItem value="entregue">Entregue</SelectItem>
                              <SelectItem value="cancelado">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => contatarCliente(pedido)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </PremiumCard>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Itens</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedidosFiltrados.map((pedido) => {
                      const status = statusConfig[pedido.status];
                      return (
                        <TableRow key={pedido.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">#{pedido.id.slice(-4)}</TableCell>
                          <TableCell>
                            {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{pedido.cliente_nome}</p>
                              <p className="text-xs text-muted-foreground">{pedido.cliente_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              {pedido.itens.map((item, i) => (
                                <p key={i} className="text-sm truncate">
                                  {item.quantidade}x {item.produto_nome}
                                </p>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-primary">
                              R$ {pedido.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={pedido.status} 
                              onValueChange={(value) => atualizarStatus(pedido.id, value as PedidoEcommerce['status'])}
                            >
                              <SelectTrigger className="w-36 h-8">
                                <Badge className={`${status.bgColor} ${status.color} border-0`}>
                                  {status.icon}
                                  <span className="ml-1">{status.label}</span>
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="pago">Pago</SelectItem>
                                <SelectItem value="separando">Separando</SelectItem>
                                <SelectItem value="enviado">Enviado</SelectItem>
                                <SelectItem value="entregue">Entregue</SelectItem>
                                <SelectItem value="cancelado">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => contatarCliente(pedido)}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </PremiumCardContent>
      </PremiumCard>

      {/* Categorias de Produtos */}
      <PremiumCard>
        <PremiumCardHeader>
          <PremiumCardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Categorias de Produtos
          </PremiumCardTitle>
          <PremiumCardDescription>
            Equipamentos Duotone disponíveis na loja
          </PremiumCardDescription>
        </PremiumCardHeader>
        <PremiumCardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { nome: 'Kites', quantidade: 5, icone: '🪁' },
              { nome: 'Wings', quantidade: 3, icone: '🦅' },
              { nome: 'Pranchas Twintip', quantidade: 3, icone: '🏄' },
              { nome: 'Pranchas Wave', quantidade: 2, icone: '🌊' },
              { nome: 'Barras', quantidade: 2, icone: '🎛️' },
              { nome: 'Trapézios', quantidade: 3, icone: '🦺' },
              { nome: 'Wetsuits', quantidade: 2, icone: '👔' },
              { nome: 'Acessórios', quantidade: 10, icone: '🎒' },
            ].map((cat) => (
              <div 
                key={cat.nome} 
                className="p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
              >
                <div className="text-2xl mb-2">{cat.icone}</div>
                <p className="font-medium text-sm">{cat.nome}</p>
                <p className="text-xs text-muted-foreground">{cat.quantidade} produtos</p>
              </div>
            ))}
          </div>
        </PremiumCardContent>
      </PremiumCard>
    </div>
  );
}
