import { useEffect, useState } from "react";
import { Plus, Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Aula {
  id: string;
  tipo: string;
  data: string;
  hora: string;
  instrutor: string;
  local: string;
  status: string;
  preco: number;
  clientes: {
    nome: string;
  };
}

export default function Aulas() {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAulas();
  }, []);

  const loadAulas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("aulas")
        .select("*, clientes(nome)")
        .order("data", { ascending: true })
        .order("hora", { ascending: true });

      if (error) throw error;
      setAulas(data || []);
    } catch (error) {
      console.error("Erro ao carregar aulas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as aulas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "agendada":
        return "bg-primary text-primary-foreground";
      case "concluida":
        return "bg-success text-success-foreground";
      case "cancelada":
        return "bg-destructive text-destructive-foreground";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Aulas</h1>
          <p className="text-muted-foreground">Gerencie e agende aulas de kitesurf</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Agendar Aula
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : aulas.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              Nenhuma aula agendada ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {aulas.map((aula) => (
            <Card key={aula.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{aula.tipo}</h3>
                    <p className="text-sm text-muted-foreground">
                      {aula.clientes?.nome || "Cliente não encontrado"}
                    </p>
                  </div>
                  <Badge className={getStatusColor(aula.status)}>{aula.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(aula.data).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{aula.hora}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{aula.local}</span>
                </div>
                <div className="pt-2 border-t mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Instrutor:</span>
                    <span className="font-medium">{aula.instrutor}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-muted-foreground">Valor:</span>
                    <span className="font-semibold text-primary">
                      R$ {Number(aula.preco).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
