import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { nome: string; email: string; telefone: string }) => void;
  cliente?: {
    id?: string;
    nome: string;
    email: string;
    telefone?: string | null;
  };
  isLoading?: boolean;
}

export function ClienteDialog({ open, onOpenChange, onSave, cliente, isLoading }: ClienteDialogProps) {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
  });
  const [errors, setErrors] = useState<{ nome?: string; email?: string; telefone?: string }>({});

  // Reset form quando abre/fecha ou muda cliente
  useEffect(() => {
    if (open) {
      setFormData({
        nome: cliente?.nome || "",
        email: cliente?.email || "",
        telefone: cliente?.telefone || "",
      });
      setErrors({});
    }
  }, [open, cliente]);

  const validate = () => {
    const newErrors: { nome?: string; email?: string; telefone?: string } = {};
    
    if (!formData.nome.trim()) {
      newErrors.nome = "Nome é obrigatório";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }
    
    if (!formData.telefone.trim()) {
      newErrors.telefone = "Telefone é obrigatório";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    onSave({
      nome: formData.nome.trim(),
      email: formData.email.trim(),
      telefone: formData.telefone.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          <DialogDescription>
            {cliente 
              ? "Atualize as informações do cliente." 
              : "Adicione um novo cliente ao sistema."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="João Silva"
              className={`min-h-[48px] ${errors.nome ? "border-destructive" : ""}`}
              disabled={isLoading}
            />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="joao@email.com"
              className={`min-h-[48px] ${errors.email ? "border-destructive" : ""}`}
              disabled={isLoading}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">WhatsApp / Telefone</Label>
            <Input
              id="telefone"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              placeholder="55 48 99999-9999"
              className={`min-h-[48px] ${errors.telefone ? "border-destructive" : ""}`}
              disabled={isLoading}
            />
            {errors.telefone && <p className="text-xs text-destructive">{errors.telefone}</p>}
            <p className="text-xs text-muted-foreground">Inclua o código do país (55 para Brasil)</p>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={isLoading}
              className="w-full sm:w-auto min-h-[48px]"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="w-full sm:flex-1 min-h-[48px]" 
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {cliente ? "Atualizar" : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
