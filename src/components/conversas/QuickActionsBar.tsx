import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  Tag, 
  MessageSquare,
  ChevronDown,
  Copy,
  Send,
  Sparkles,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContatoComUltimaMensagem } from '@/hooks/useConversasPage';
import { toast } from 'sonner';

interface QuickActionsBarProps {
  contato: ContatoComUltimaMensagem;
  onEnviarMensagem: (mensagem: string) => void;
  onAgendarAula?: () => void;
  onEnviarProposta?: () => void;
  isSending?: boolean;
}

// Templates de respostas rápidas
const respostasRapidas = [
  {
    id: 'saudacao',
    label: '👋 Saudação',
    template: 'Olá! Tudo bem? Obrigado pelo contato! Como posso ajudar você hoje?',
  },
  {
    id: 'aula_experimental',
    label: '🏄 Aula Experimental',
    template: 'Que tal agendar uma aula experimental? Temos horários disponíveis essa semana!',
  },
  {
    id: 'precos',
    label: '💰 Preços',
    template: 'Nossos pacotes:\n🎯 Aula avulsa: R$ 280\n📦 5 aulas: R$ 1.200\n📦 10 aulas: R$ 2.000',
  },
  {
    id: 'followup',
    label: '📞 Follow-up',
    template: 'Oi! Passando para saber se ainda tem interesse nas aulas. Estou à disposição!',
  },
  {
    id: 'confirmacao',
    label: '✅ Confirmação',
    template: 'Sua aula está confirmada! Lembre-se de trazer protetor solar e roupa de banho. Até lá! 🤙',
  },
];

export function QuickActionsBar({ 
  contato, 
  onEnviarMensagem, 
  onAgendarAula,
  onEnviarProposta,
  isSending = false,
}: QuickActionsBarProps) {
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState('');

  const handleSelectTemplate = (template: string) => {
    const nome = contato.whatsapp_profile_name || contato.nome || '';
    const templatePersonalizado = template.replace('{nome}', nome);
    setEditedTemplate(templatePersonalizado);
    setTemplateDialogOpen(true);
  };

  const handleEnviarTemplate = () => {
    if (editedTemplate.trim()) {
      onEnviarMensagem(editedTemplate);
      setTemplateDialogOpen(false);
      setEditedTemplate('');
    }
  };

  const handleCopiarTemplate = () => {
    navigator.clipboard.writeText(editedTemplate);
    toast.success('Copiado!');
  };

  const handleUpdateStatus = async (novoStatus: string) => {
    toast.info(`Status: ${novoStatus}`);
  };

  return (
    <>
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-border/50 bg-muted/20 overflow-x-auto scrollbar-none">
        {/* Ação Principal: Agendar */}
        <Button
          size="sm"
          variant="outline"
          className="h-10 min-w-[44px] gap-2 text-sm shrink-0 bg-primary/5 hover:bg-primary/10 border-primary/30"
          onClick={onAgendarAula}
        >
          <Calendar className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Agendar</span>
        </Button>

        {/* Ação: Proposta */}
        <Button
          size="sm"
          variant="outline"
          className="h-10 min-w-[44px] gap-2 text-sm shrink-0 bg-green-500/5 hover:bg-green-500/10 border-green-500/30"
          onClick={onEnviarProposta}
        >
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="hidden sm:inline">Proposta</span>
        </Button>

        {/* Ação: Follow-up */}
        <Button
          size="sm"
          variant="outline"
          className="h-10 min-w-[44px] gap-2 text-sm shrink-0 bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30"
          onClick={() => toast.info('Follow-up agendado')}
        >
          <Clock className="h-4 w-4 text-amber-600" />
          <span className="hidden md:inline">Follow-up</span>
        </Button>

        {/* Menu Mais Ações (mobile) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-10 min-w-[44px] gap-1 text-sm shrink-0 sm:hidden">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs">Ações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.info('Follow-up agendado')} className="min-h-[44px]">
              <Clock className="h-4 w-4 mr-2 text-amber-600" />
              Follow-up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdateStatus('lead_quente')} className="min-h-[44px]">
              <Tag className="h-4 w-4 mr-2" />
              Alterar Status
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Alterar Status (desktop) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-10 min-w-[44px] gap-2 text-sm shrink-0 hidden sm:flex">
              <Tag className="h-4 w-4" />
              <span className="hidden md:inline">Status</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuLabel className="text-xs">Alterar Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleUpdateStatus('lead')} className="min-h-[44px]">
              <Badge variant="outline" className="mr-2 text-xs border-blue-500/50 text-blue-600">Lead</Badge>
              Novo Lead
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdateStatus('lead_quente')} className="min-h-[44px]">
              <Badge variant="outline" className="mr-2 text-xs border-orange-500/50 text-orange-600">Quente</Badge>
              Lead Quente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdateStatus('cliente_ativo')} className="min-h-[44px]">
              <Badge variant="outline" className="mr-2 text-xs border-green-500/50 text-green-600">Cliente</Badge>
              Cliente Ativo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Separador */}
        <div className="w-px h-7 bg-border/50 mx-1.5 shrink-0 hidden sm:block" />

        {/* Respostas Rápidas */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-10 min-w-[44px] gap-2 text-sm shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Respostas</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-50 hidden sm:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs">Respostas Rápidas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {respostasRapidas.map((resp) => (
              <DropdownMenuItem 
                key={resp.id} 
                onClick={() => handleSelectTemplate(resp.template)}
                className="cursor-pointer min-h-[44px]"
              >
                <span className="text-sm">{resp.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialog para editar e enviar template */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Enviar Mensagem
            </DialogTitle>
            <DialogDescription>
              Personalize a mensagem antes de enviar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              value={editedTemplate}
              onChange={(e) => setEditedTemplate(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="min-h-[120px] text-sm"
            />
          </div>

          <DialogFooter className="flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopiarTemplate}
              className="gap-1.5 h-10 flex-1 sm:flex-none"
            >
              <Copy className="h-4 w-4" />
              Copiar
            </Button>
            <Button 
              size="sm" 
              onClick={handleEnviarTemplate}
              disabled={!editedTemplate.trim() || isSending}
              className="gap-1.5 h-10 flex-1 sm:flex-none"
            >
              <Send className="h-4 w-4" />
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
