import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Rocket, Copy, Download, MessageSquare } from 'lucide-react';
import { useCriarCampanha, ContatoFiltros, ContatoInteligencia } from '@/hooks/useContatosInteligencia';
import { toast } from '@/hooks/use-toast';

interface CampanhaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filtros: ContatoFiltros;
  contatos: ContatoInteligencia[];
}

export function CampanhaDialog({ open, onOpenChange, filtros, contatos }: CampanhaDialogProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [template, setTemplate] = useState(
    'Oi {nome}! 🪁\n\nSentimos sua falta aqui na GoKite!\n{mensagem_personalizada}\n\nQue tal voltar a voar? Temos condições especiais pra você!'
  );
  const [usarMensagemIA, setUsarMensagemIA] = useState(true);

  const criarCampanhaMutation = useCriarCampanha();

  const handleCriar = async () => {
    if (!nome.trim()) {
      toast({ title: 'Nome da campanha é obrigatório', variant: 'destructive' });
      return;
    }

    await criarCampanhaMutation.mutateAsync({
      nome,
      descricao,
      segmento_filtros: { ...filtros } as Record<string, unknown>,
      template_mensagem: template,
      total_contatos: contatos.length,
      status: 'rascunho',
    });

    onOpenChange(false);
    setNome('');
    setDescricao('');
  };

  const formatarNumero = (telefone: string) => {
    const numeros = telefone.replace(/\D/g, '');
    if (!numeros.startsWith('55')) return `55${numeros}`;
    return numeros;
  };

  const gerarMensagem = (contato: ContatoInteligencia) => {
    let msg = template
      .replace('{nome}', contato.nome?.split(' ')[0] || 'Amigo(a)')
      .replace('{telefone}', contato.telefone);

    if (usarMensagemIA && contato.mensagem_personalizada) {
      msg = msg.replace('{mensagem_personalizada}', contato.mensagem_personalizada);
    } else {
      msg = msg.replace('{mensagem_personalizada}', '');
    }

    return msg.replace(/\n{3,}/g, '\n\n').trim();
  };

  const copiarNumeros = () => {
    const numeros = contatos.map(c => formatarNumero(c.telefone)).join('\n');
    navigator.clipboard.writeText(numeros);
    toast({ title: `${contatos.length} números copiados!` });
  };

  const exportarCSV = () => {
    const headers = ['Nome', 'Telefone', 'Email', 'Mensagem', 'Score', 'Prioridade'];
    const rows = contatos.map(c => [
      c.nome || '',
      formatarNumero(c.telefone),
      c.email || '',
      gerarMensagem(c).replace(/\n/g, ' '),
      c.score_interesse.toString(),
      c.prioridade,
    ]);

    const csv = [
      headers.join(';'),
      ...rows.map(r => r.map(v => `"${v}"`).join(';')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `campanha-${nome || 'contatos'}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: 'CSV exportado!' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Criar Campanha
          </DialogTitle>
          <DialogDescription>
            Configure sua campanha de remarketing para {contatos.length} contatos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info do Segmento */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{contatos.length} contatos</Badge>
            {filtros.status && filtros.status !== 'todos' && (
              <Badge variant="outline">Status: {filtros.status}</Badge>
            )}
            {filtros.interesse && filtros.interesse !== 'todos' && (
              <Badge variant="outline">Interesse: {filtros.interesse}</Badge>
            )}
            {filtros.campanha && filtros.campanha !== 'todas' && (
              <Badge variant="outline">Campanha: {filtros.campanha}</Badge>
            )}
          </div>

          {/* Nome e Descrição */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Campanha *</Label>
              <Input
                id="nome"
                placeholder="Ex: Reativação Janeiro 2026"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="min-h-[48px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                placeholder="Descrição opcional..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="min-h-[48px]"
              />
            </div>
          </div>

          {/* Template de Mensagem */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="template">Template da Mensagem</Label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={usarMensagemIA}
                  onChange={(e) => setUsarMensagemIA(e.target.checked)}
                  className="rounded"
                />
                Usar mensagem personalizada da IA
              </label>
            </div>
            <Textarea
              id="template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={5}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Variáveis disponíveis: {'{nome}'}, {'{telefone}'}, {'{mensagem_personalizada}'}
            </p>
          </div>

          {/* Preview de Mensagens */}
          <div className="space-y-2">
            <Label>Preview das Mensagens</Label>
            <div className="border rounded-lg max-h-48 overflow-auto">
              {contatos.slice(0, 3).map((contato) => (
                <div key={contato.id} className="p-3 border-b last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm">{contato.nome || 'Contato'}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatarNumero(contato.telefone)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line pl-6">
                    {gerarMensagem(contato)}
                  </p>
                </div>
              ))}
              {contatos.length > 3 && (
                <div className="p-2 bg-muted text-center text-sm text-muted-foreground">
                  ... e mais {contatos.length - 3} mensagens
                </div>
              )}
            </div>
          </div>

          {/* Ações de Exportação */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copiarNumeros}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Números
            </Button>
            <Button variant="outline" size="sm" onClick={exportarCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-3 sm:gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[48px]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCriar}
            disabled={criarCampanhaMutation.isPending || !nome.trim()}
            className="w-full sm:w-auto min-h-[48px]"
          >
            {criarCampanhaMutation.isPending ? 'Salvando...' : 'Salvar Campanha'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
