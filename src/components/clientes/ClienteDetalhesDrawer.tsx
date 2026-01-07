import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Edit,
  MessageCircle,
  Wallet
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ClienteComAulas } from "@/hooks/useSupabaseClientes";
import { StoreCreditCard } from "./StoreCreditCard";
import { PremiumBadge } from "@/components/ui/premium-badge";

interface ClienteDetalhesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: ClienteComAulas | null;
  onEdit?: (cliente: ClienteComAulas) => void;
}

export function ClienteDetalhesDrawer({ 
  open, 
  onOpenChange, 
  cliente,
  onEdit 
}: ClienteDetalhesDrawerProps) {
  if (!cliente) return null;

  const storeCredit = (cliente as any).store_credit || 0;

  const handleWhatsApp = () => {
    const telefone = cliente.telefone?.replace(/\D/g, '') || '';
    if (telefone) {
      window.open(`https://wa.me/55${telefone}`, '_blank');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-background shadow-lg">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {cliente.nome?.slice(0, 2).toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl truncate">{cliente.nome}</SheetTitle>
              
              <div className="flex flex-wrap gap-2 mt-2">
                <PremiumBadge variant="default" size="sm">
                  {cliente.total_aulas} aulas
                </PremiumBadge>
                {storeCredit > 0 && (
                  <PremiumBadge variant="success" size="sm" icon={Wallet}>
                    R$ {storeCredit.toLocaleString('pt-BR')}
                  </PremiumBadge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                {cliente.telefone && (
                  <a 
                    href={`tel:${cliente.telefone}`} 
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {cliente.telefone}
                  </a>
                )}
                <a 
                  href={`mailto:${cliente.email}`}
                  className="flex items-center gap-1 hover:text-foreground transition-colors truncate"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {cliente.email}
                </a>
              </div>
            </div>
          </div>

          {/* Ações rápidas */}
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 min-h-[44px]"
              onClick={handleWhatsApp}
              disabled={!cliente.telefone}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            {onEdit && (
              <Button 
                variant="outline" 
                size="sm" 
                className="min-h-[44px]"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(cliente);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Informações básicas */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Informações
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Cadastro</p>
                  <p className="font-medium">
                    {cliente.created_at 
                      ? format(new Date(cliente.created_at), "dd/MM/yyyy", { locale: ptBR })
                      : 'N/A'
                    }
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Última aula</p>
                  <p className="font-medium">
                    {cliente.ultima_aula 
                      ? format(new Date(cliente.ultima_aula), "dd/MM/yyyy", { locale: ptBR })
                      : 'Sem aulas'
                    }
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Crédito de Loja */}
            <StoreCreditCard 
              clienteId={cliente.id} 
              storeCredit={storeCredit}
              className="border-0 shadow-none bg-transparent p-0"
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
