import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCreateAula, useUpdateAula, type AulaSupabase } from "@/hooks/useSupabaseAulas";
import { useClientesListagem } from "@/hooks/useSupabaseClientes";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AulaDialogSupabaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aulaId?: string;
}

export function AulaDialogSupabase({ open, onOpenChange, aulaId }: AulaDialogSupabaseProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [aula, setAula] = useState<AulaSupabase | null>(null);
  
  const [formData, setFormData] = useState({
    tipo: 'kitesurf_iniciante',
    local: 'florianopolis',
    data: new Date().toISOString().split('T')[0],
    hora: '10:00',
    instrutor: 'Principal',
    preco: 400,
    status: 'agendada',
    cliente_id: '',
  });

  const { data: clientes = [] } = useClientesListagem();
  const createAula = useCreateAula();
  const updateAula = useUpdateAula();

  // Fetch aula if editing
  useEffect(() => {
    if (aulaId && open) {
      setIsLoading(true);
      supabase
        .from('aulas')
        .select('*')
        .eq('id', aulaId)
        .single()
        .then(({ data, error }) => {
          if (data && !error) {
            setAula(data as AulaSupabase);
            setFormData({
              tipo: data.tipo || 'kitesurf_iniciante',
              local: data.local || 'florianopolis',
              data: data.data || new Date().toISOString().split('T')[0],
              hora: data.hora || '10:00',
              instrutor: data.instrutor || 'Principal',
              preco: data.preco || 400,
              status: data.status || 'agendada',
              cliente_id: data.cliente_id || '',
            });
          }
          setIsLoading(false);
        });
    } else {
      setAula(null);
      setFormData({
        tipo: 'kitesurf_iniciante',
        local: 'florianopolis',
        data: new Date().toISOString().split('T')[0],
        hora: '10:00',
        instrutor: 'Principal',
        preco: 400,
        status: 'agendada',
        cliente_id: '',
      });
    }
  }, [aulaId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente_id) {
      toast({
        title: "Cliente obrigatório",
        description: "Por favor, selecione um cliente.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (aulaId) {
        await updateAula.mutateAsync({
          id: aulaId,
          ...formData,
        });
        toast({
          title: "Aula atualizada!",
          description: formData.status === 'confirmada' 
            ? "Transação criada automaticamente no módulo Vendas." 
            : "As informações foram salvas com sucesso.",
        });
      } else {
        await createAula.mutateAsync(formData);
        toast({
          title: "Aula criada!",
          description: "O agendamento foi criado com sucesso.",
        });
      }
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar a aula.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{aulaId ? "Editar Aula" : "Nova Aula"}</DialogTitle>
          <DialogDescription>
            {aulaId 
              ? "Atualize as informações da aula. Ao confirmar, uma transação será criada automaticamente." 
              : "Crie um novo agendamento de aula."}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="cliente_id">Cliente</Label>
              <Select
                value={formData.cliente_id}
                onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Aula</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kitesurf_iniciante">Kitesurf Iniciante</SelectItem>
                    <SelectItem value="kitesurf_intermediario">Kitesurf Intermediário</SelectItem>
                    <SelectItem value="kitesurf_avancado">Kitesurf Avançado</SelectItem>
                    <SelectItem value="wing_foil">Wing Foil</SelectItem>
                    <SelectItem value="foil">Foil</SelectItem>
                    <SelectItem value="downwind">Downwind</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="local">Localização</Label>
                <Select
                  value={formData.local}
                  onValueChange={(value) => setFormData({ ...formData, local: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="florianopolis">Florianópolis</SelectItem>
                    <SelectItem value="taiba">Taíba</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hora">Horário</Label>
                <Input
                  id="hora"
                  type="time"
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendada">Agendada</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preco">Valor (R$)</Label>
                <Input
                  id="preco"
                  type="number"
                  value={formData.preco}
                  onChange={(e) => setFormData({ ...formData, preco: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instrutor">Instrutor</Label>
                <Input
                  id="instrutor"
                  value={formData.instrutor}
                  onChange={(e) => setFormData({ ...formData, instrutor: e.target.value })}
                  placeholder="Nome do instrutor"
                />
              </div>
            </div>

            {formData.status === 'confirmada' && !aula?.status?.includes('confirmada') && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-sm">
                <p className="text-success font-medium">
                  ✓ Ao confirmar, uma transação será criada automaticamente no módulo Vendas.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createAula.isPending || updateAula.isPending}
              >
                {(createAula.isPending || updateAula.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {aulaId ? "Atualizar" : "Criar"}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
