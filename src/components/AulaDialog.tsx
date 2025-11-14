import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { localStorageService, type Agendamento } from "@/lib/localStorage";

interface AulaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  aula?: Agendamento;
}

export function AulaDialog({ open, onOpenChange, onSave, aula }: AulaDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<Agendamento>>({
    tipo_aula: aula?.tipo_aula || 'iniciante',
    localizacao: aula?.localizacao || 'florianopolis',
    data: aula?.data?.split('T')[0] || new Date().toISOString().split('T')[0],
    horario: aula?.horario || '10:00',
    cliente_nome: aula?.cliente_nome || '',
    cliente_email: aula?.cliente_email || '',
    cliente_whatsapp: aula?.cliente_whatsapp || '',
    experiencia: aula?.experiencia || 'nunca',
    status: aula?.status || 'pendente',
    valor: aula?.valor || 400,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente_nome || !formData.cliente_email || !formData.data) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (aula) {
      // Atualizar aula existente
      const aulaAtualizada = { ...aula, ...formData } as Agendamento;
      localStorageService.atualizarAgendamento(aula.id, aulaAtualizada);
      toast({
        title: "Aula atualizada!",
        description: "As informações foram salvas com sucesso.",
      });
    } else {
      // Nova aula
      localStorageService.salvarAgendamento(formData as any);
      toast({
        title: "Aula criada!",
        description: "O agendamento foi criado com sucesso.",
      });
    }
    
    onSave();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{aula ? "Editar Aula" : "Nova Aula"}</DialogTitle>
          <DialogDescription>
            {aula 
              ? "Atualize as informações da aula." 
              : "Crie um novo agendamento de aula."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tipo_aula">Tipo de Aula</Label>
              <Select
                value={formData.tipo_aula}
                onValueChange={(value: any) => setFormData({ ...formData, tipo_aula: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iniciante">Iniciante</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="avancado">Avançado</SelectItem>
                  <SelectItem value="wing_foil">Wing Foil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="localizacao">Localização</Label>
              <Select
                value={formData.localizacao}
                onValueChange={(value: any) => setFormData({ ...formData, localizacao: value })}
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
              <Label htmlFor="horario">Horário</Label>
              <Input
                id="horario"
                type="time"
                value={formData.horario}
                onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Informações do Cliente</h3>
            
            <div className="space-y-2">
              <Label htmlFor="cliente_nome">Nome</Label>
              <Input
                id="cliente_nome"
                value={formData.cliente_nome}
                onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
                placeholder="João Silva"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cliente_email">Email</Label>
                <Input
                  id="cliente_email"
                  type="email"
                  value={formData.cliente_email}
                  onChange={(e) => setFormData({ ...formData, cliente_email: e.target.value })}
                  placeholder="joao@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cliente_whatsapp">WhatsApp</Label>
                <Input
                  id="cliente_whatsapp"
                  value={formData.cliente_whatsapp}
                  onChange={(e) => setFormData({ ...formData, cliente_whatsapp: e.target.value })}
                  placeholder="(48) 99999-9999"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experiencia">Experiência</Label>
              <Select
                value={formData.experiencia}
                onValueChange={(value: any) => setFormData({ ...formData, experiencia: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nunca">Nunca pratiquei</SelectItem>
                  <SelectItem value="poucas_vezes">Poucas vezes</SelectItem>
                  <SelectItem value="experiente">Experiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {aula ? "Atualizar" : "Criar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
