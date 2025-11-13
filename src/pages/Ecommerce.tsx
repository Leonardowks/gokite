import { useEffect, useState } from "react";
import { ShoppingCart, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Pedido {
  id: string;
  data_pedido: string;
  valor_total: number;
  status: string;
  clientes: {
    nome: string;
  };
}

export default function Ecommerce() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPedidos();
  }, []);

  const loadPedidos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pedidos_ecommerce")
        .select("*, clientes(nome)")
        .order("data_pedido", { ascending: false });

      if (error) throw error;
      setPedidos(data || []);
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pedidos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "entregue":
        return "bg-success text-success-foreground";
      case "enviado":
        return "bg-primary text-primary-foreground";
      case "processando":
        return "bg-secondary text-secondary-foreground";
      case "pendente":
        return "bg-muted text-muted-foreground";
      case "cancelado":
        return "bg-destructive text-destructive-foreground";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">E-commerce</h1>
        <p className="text-muted-foreground">Gerencie produtos e pedidos da loja online</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Pedidos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum pedido registrado ainda.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map((pedido) => (
                  <TableRow key={pedido.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono text-xs">
                      {pedido.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">
                      {pedido.clientes?.nome || "Cliente não encontrado"}
                    </TableCell>
                    <TableCell>
                      {new Date(pedido.data_pedido).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(pedido.status)}>{pedido.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      R$ {Number(pedido.valor_total).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
