import { useEffect, useState } from "react";
import { Plus, Package as PackageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface Equipamento {
  id: string;
  nome: string;
  tipo: string;
  tamanho: string | null;
  status: string;
  preco_aluguel_dia: number;
}

export default function Aluguel() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadEquipamentos();
  }, []);

  const loadEquipamentos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("equipamentos")
        .select("*")
        .order("nome");

      if (error) throw error;
      setEquipamentos(data || []);
    } catch (error) {
      console.error("Erro ao carregar equipamentos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os equipamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "disponivel":
        return "bg-success text-success-foreground";
      case "alugado":
        return "bg-primary text-primary-foreground";
      case "manutencao":
        return "bg-destructive text-destructive-foreground";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Aluguel de Equipamentos</h1>
          <p className="text-muted-foreground">Gerencie equipamentos e contratos de aluguel</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Registrar Aluguel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageIcon className="h-5 w-5" />
            Equipamentos Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : equipamentos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum equipamento cadastrado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Preço/Dia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipamentos.map((equipamento) => (
                  <TableRow key={equipamento.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{equipamento.nome}</TableCell>
                    <TableCell>{equipamento.tipo}</TableCell>
                    <TableCell>{equipamento.tamanho || "-"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(equipamento.status)}>
                        {equipamento.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      R$ {Number(equipamento.preco_aluguel_dia).toFixed(2)}
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
