import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { PageHeader } from "@/components/PageHeader";
import { PremiumCard } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package,
  Truck,
  Clock,
  CheckCircle2,
  Store,
  Building2,
  MoreVertical,
  Send,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { 
  usePedidosNuvemshop, 
  useAtualizarStatusPedido, 
  usePedidoStats,
  ItemPedido 
} from "@/hooks/usePedidosNuvemshop";
import { Skeleton } from "@/components/ui/skeleton";

export default function PedidosNuvemshop() {
  const [statusFilter, setStatusFilter] = useState("todos");
  const { data: pedidos, isLoading, refetch } = usePedidosNuvemshop(statusFilter);
  const { data: stats } = usePedidoStats();
  const atualizarStatus = useAtualizarStatusPedido();

  const handleMarcarEnviado = (pedidoId: string) => {
    atualizarStatus.mutate({ pedidoId, novoStatus: "enviado" });
  };

  const handleMarcarAguardando = (pedidoId: string) => {
    atualizarStatus.mutate({ pedidoId, novoStatus: "aguardando_fornecedor" });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case "enviado":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Enviado</Badge>;
      case "aguardando_fornecedor":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30"><Building2 className="w-3 h-3 mr-1" /> Aguardando Duotone</Badge>;
      case "cancelado":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30"><AlertCircle className="w-3 h-3 mr-1" /> Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status || "Desconhecido"}</Badge>;
    }
  };

  const renderItemOrigem = (item: ItemPedido) => {
    if (item.origem === "estoque_loja") {
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <Store className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700 dark:text-green-400 font-medium">Estoque Loja</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <Building2 className="w-4 h-4 text-blue-600" />
        <span className="text-sm text-blue-700 dark:text-blue-400 font-medium">Pedir na Duotone</span>
      </div>
    );
  };

  const temItensFornecedor = (itens: ItemPedido[]) => {
    return itens.some(item => item.origem === "fornecedor_virtual");
  };

  return (
    <>
      <PageHeader
        title="Pedidos Nuvemshop"
        description="Gerencie os pedidos recebidos pela loja virtual"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <PremiumCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Pedidos</p>
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-600">{stats?.pendentes || 0}</p>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Store className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Itens Estoque Loja</p>
              <p className="text-2xl font-bold text-green-600">{stats?.itensEstoqueLoja || 0}</p>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Itens Duotone</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.itensFornecedor || 0}</p>
            </div>
          </div>
        </PremiumCard>
      </div>

      {/* Tabs de Status */}
      <PremiumCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="pendente">
                <Clock className="w-4 h-4 mr-1" /> Pendentes
              </TabsTrigger>
              <TabsTrigger value="aguardando_fornecedor">
                <Building2 className="w-4 h-4 mr-1" /> Aguardando
              </TabsTrigger>
              <TabsTrigger value="enviado">
                <Truck className="w-4 h-4 mr-1" /> Enviados
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : pedidos?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum pedido encontrado</p>
            <p className="text-sm mt-2">Os pedidos aparecerão aqui quando forem recebidos pela Nuvemshop</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pedidos?.map((pedido) => (
              <div
                key={pedido.id}
                className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                {/* Header do Pedido */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">
                        Pedido #{pedido.numero_pedido || pedido.nuvemshop_order_id}
                      </h3>
                      {getStatusBadge(pedido.status)}
                      {temItensFornecedor(pedido.itens) && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                          <Building2 className="w-3 h-3 mr-1" />
                          Cross-docking
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {pedido.created_at && format(new Date(pedido.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">
                      {pedido.valor_total?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleMarcarEnviado(pedido.id)}>
                          <Send className="w-4 h-4 mr-2" />
                          Marcar como Enviado
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMarcarAguardando(pedido.id)}>
                          <Building2 className="w-4 h-4 mr-2" />
                          Aguardando Fornecedor
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Info do Cliente */}
                <div className="flex flex-wrap gap-4 mb-4 text-sm text-muted-foreground">
                  {pedido.cliente_nome && (
                    <span className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      {pedido.cliente_nome}
                    </span>
                  )}
                  {pedido.cliente_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {pedido.cliente_email}
                    </span>
                  )}
                  {pedido.cliente_telefone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {pedido.cliente_telefone}
                    </span>
                  )}
                  {pedido.endereco_entrega && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {pedido.endereco_entrega}
                    </span>
                  )}
                </div>

                {/* Tabela de Itens */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedido.itens.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell>{renderItemOrigem(item)}</TableCell>
                        <TableCell className="text-right">
                          {(item.price * item.quantity).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Ações Rápidas */}
                {pedido.status === "pendente" && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    {!temItensFornecedor(pedido.itens) ? (
                      <Button 
                        className="flex-1" 
                        onClick={() => handleMarcarEnviado(pedido.id)}
                        disabled={atualizarStatus.isPending}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Marcar como Enviado
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          className="flex-1 border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
                          onClick={() => handleMarcarAguardando(pedido.id)}
                          disabled={atualizarStatus.isPending}
                        >
                          <Building2 className="w-4 h-4 mr-2" />
                          Pedir na Duotone
                        </Button>
                        <Button 
                          className="flex-1"
                          onClick={() => handleMarcarEnviado(pedido.id)}
                          disabled={atualizarStatus.isPending}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Já Tenho, Enviar
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {pedido.status === "aguardando_fornecedor" && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button 
                      className="flex-1"
                      onClick={() => handleMarcarEnviado(pedido.id)}
                      disabled={atualizarStatus.isPending}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Produto Chegou, Enviar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </PremiumCard>
    </>
  );
}
