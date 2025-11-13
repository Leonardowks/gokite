import { useState } from "react";
import { Package as PackageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Aluguel() {
  const [equipamentos] = useState([
    {
      id: '1',
      nome: 'Kite 12m',
      tipo: 'Kite',
      tamanho: '12m',
      status: 'disponível',
      preco_aluguel_dia: 150
    },
    {
      id: '2',
      nome: 'Prancha Iniciante',
      tipo: 'Prancha',
      tamanho: '140cm',
      status: 'alugado',
      preco_aluguel_dia: 100
    }
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Aluguel de Equipamentos</h1>
        <p className="text-muted-foreground">Gestão de equipamentos para kitesurf</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {equipamentos.map((equip) => (
          <Card key={equip.id} className="hover-lift">
            <CardHeader>
              <div className="flex items-center justify-between">
                <PackageIcon className="h-8 w-8 text-primary" />
                <Badge variant={equip.status === 'disponível' ? 'default' : 'secondary'}>
                  {equip.status}
                </Badge>
              </div>
              <CardTitle className="mt-4">{equip.nome}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium">{equip.tipo}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tamanho:</span>
                  <span className="font-medium">{equip.tamanho}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Diária:</span>
                  <span className="font-bold text-primary">
                    R$ {equip.preco_aluguel_dia}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <PackageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Funcionalidade completa em breve
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
