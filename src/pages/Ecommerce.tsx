import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  cliente_nome: string;
}

export default function Ecommerce() {
  const [pedidos] = useState<Pedido[]>([
    {
      id: 'P001',
      data_pedido: new Date().toISOString(),
      valor_total: 299.90,
      status: 'pendente',
      cliente_nome: 'Cliente Exemplo'
    }
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">E-commerce</h1>
        <p className="text-muted-foreground">Gestão de pedidos online</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Pedidos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pedidos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum pedido registrado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell className="font-medium">{pedido.id}</TableCell>
                    <TableCell>
                      {new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{pedido.cliente_nome}</TableCell>
                    <TableCell>
                      R$ {pedido.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{pedido.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Funcionalidade completa em breve
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
