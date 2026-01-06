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
  CheckCircle,
  Sparkles,
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
    template: 'Que tal agendar uma aula experimental? Temos horários disponíveis essa semana! A primeira aula é especial para você conhecer o esporte com segurança.',
  },
  {
    id: 'precos',
    label: '💰 Tabela de Preços',
    template: 'Nossos pacotes:\n\n🎯 Aula avulsa: R$ 280\n📦 Pacote 5 aulas: R$ 1.200 (R$ 240/aula)\n📦 Pacote 10 aulas: R$ 2.000 (R$ 200/aula)\n\nInclui equipamento completo e seguro!',
  },
  {
    id: 'condicoes_vento',
    label: '🌬️ Condições de Vento',
    template: 'As condições de vento estão boas para aula! Vamos agendar para os próximos dias?',
  },
  {
    id: 'followup',
    label: '📞 Follow-up',
    template: 'Oi! Passando para saber se ainda tem interesse nas aulas de kitesurf. Estou à disposição para tirar qualquer dúvida!',
  },
  {
    id: 'confirmacao',
    label: '✅ Confirmação',
    template: 'Sua aula está confirmada! Nos encontramos no local combinado. Lembre-se de trazer: protetor solar, óculos de sol e roupa de banho. Até lá! 🤙',
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
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [editedTemplate, setEditedTemplate] = useState('');

  const handleSelectTemplate = (template: string) => {
    // Personalizar template com nome do contato
    const nome = contato.whatsapp_profile_name || contato.nome || '';
    const templatePersonalizado = template.replace('{nome}', nome);
    setSelectedTemplate(template);
    setEditedTemplate(templatePersonalizado);
    setTemplateDialogOpen(true);
  };

  const handleEnviarTemplate = () => {
    if (editedTemplate.trim()) {
      onEnviarMensagem(editedTemplate);
      setTemplateDialogOpen(false);
      setEditedTemplate('');
      setSelectedTemplate('');
    }
  };

  const handleCopiarTemplate = () => {
    navigator.clipboard.writeText(editedTemplate);
    toast.success('Template copiado!');
  };

  const handleUpdateStatus = async (novoStatus: string) => {
    // TODO: Implementar atualização de status
    toast.info(`Status será alterado para: ${novoStatus}`);
  };

  return (
    <>
      <div className="flex items-center gap-1.5 p-2 border-t border-border/50 bg-muted/30 overflow-x-auto">
        {/* Ações Principais */}
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs shrink-0 bg-primary/5 hover:bg-primary/10 border-primary/30"
          onClick={onAgendarAula}
        >
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span className="hidden sm:inline">Agendar Aula</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs shrink-0 bg-green-500/5 hover:bg-green-500/10 border-green-500/30"
          onClick={onEnviarProposta}
        >
          <DollarSign className="h-3.5 w-3.5 text-green-600" />
          <span className="hidden sm:inline">Proposta</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs shrink-0 bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30"
          onClick={() => toast.info('Follow-up agendado para amanhã às 10h')}
        >
          <Clock className="h-3.5 w-3.5 text-amber-600" />
          <span className="hidden sm:inline">Follow-up</span>
        </Button>

        {/* Alterar Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs shrink-0">
              <Tag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Status</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel className="text-xs">Alterar Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleUpdateStatus('lead')}>
              <Badge variant="outline" className="mr-2 text-[10px] border-blue-500/50 text-blue-600">Lead</Badge>
              Novo Lead
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdateStatus('lead_quente')}>
              <Badge variant="outline" className="mr-2 text-[10px] border-orange-500/50 text-orange-600">Quente</Badge>
              Lead Quente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdateStatus('cliente_ativo')}>
              <Badge variant="outline" className="mr-2 text-[10px] border-green-500/50 text-green-600">Cliente</Badge>
              Cliente Ativo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdateStatus('cliente_inativo')}>
              <Badge variant="outline" className="mr-2 text-[10px] border-muted-foreground/50">Inativo</Badge>
              Inativo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Separador */}
        <div className="w-px h-5 bg-border/50 mx-1" />

        {/* Respostas Rápidas */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Respostas</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">Respostas Rápidas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {respostasRapidas.map((resp) => (
              <DropdownMenuItem 
                key={resp.id} 
                onClick={() => handleSelectTemplate(resp.template)}
                className="cursor-pointer"
              >
                <span className="text-xs">{resp.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Próxima ação sugerida pela IA */}
        {contato.proxima_acao_sugerida && (
          <div className="hidden lg:flex items-center gap-1.5 ml-auto pl-2 border-l border-border/50">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
              {contato.proxima_acao_sugerida.slice(0, 50)}...
            </span>
          </div>
        )}
      </div>

      {/* Dialog para editar e enviar template */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Enviar Mensagem
            </DialogTitle>
            <DialogDescription>
              Personalize a mensagem antes de enviar para {contato.whatsapp_profile_name || contato.nome || 'o contato'}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              value={editedTemplate}
              onChange={(e) => setEditedTemplate(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="min-h-[150px] text-sm"
            />
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopiarTemplate}
              className="gap-1.5"
            >
              <Copy className="h-4 w-4" />
              Copiar
            </Button>
            <Button 
              size="sm" 
              onClick={handleEnviarTemplate}
              disabled={!editedTemplate.trim() || isSending}
              className="gap-1.5"
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
