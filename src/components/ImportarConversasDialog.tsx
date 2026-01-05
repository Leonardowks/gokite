import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, MessageSquare, User, Building2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useContatosInteligencia } from '@/hooks/useContatosInteligencia';
import { useImportarConversas, MensagemImportada } from '@/hooks/useConversasWhatsapp';
import { format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ImportarConversasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MensagemParseada extends MensagemImportada {
  nomeRemetente: string;
}

export const ImportarConversasDialog = ({ open, onOpenChange }: ImportarConversasDialogProps) => {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mensagensParseadas, setMensagensParseadas] = useState<MensagemParseada[]>([]);
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [contatoSelecionado, setContatoSelecionado] = useState<string>('');
  const [telefoneDetectado, setTelefoneDetectado] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [erroParser, setErroParser] = useState<string | null>(null);
  const [participantes, setParticipantes] = useState<string[]>([]);

  const { data: contatos = [] } = useContatosInteligencia();
  const importarMutation = useImportarConversas();

  // Parser de arquivo WhatsApp
  const parseWhatsAppExport = (conteudo: string): MensagemParseada[] => {
    const mensagens: MensagemParseada[] = [];
    const linhas = conteudo.split('\n');
    
    // Regex para diferentes formatos de data/hora do WhatsApp
    const regexPatterns = [
      // Formato brasileiro: [DD/MM/YYYY, HH:MM:SS] Nome: Mensagem
      /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s*(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*-?\s*([^:]+):\s*(.+)$/,
      // Formato alternativo: DD/MM/YYYY HH:MM - Nome: Mensagem
      /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*([^:]+):\s*(.+)$/,
      // Formato com AM/PM
      /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\]?\s*-?\s*([^:]+):\s*(.+)$/i,
    ];

    const participantesSet = new Set<string>();
    let mensagemAtual: MensagemParseada | null = null;

    for (const linha of linhas) {
      const linhaLimpa = linha.trim();
      if (!linhaLimpa) continue;

      let matched = false;

      for (const regex of regexPatterns) {
        const match = linhaLimpa.match(regex);
        if (match) {
          const [, dataStr, horaStr, nome, mensagem] = match;
          
          // Tentar parsear a data
          let dataCompleta: Date | null = null;
          const dataFormatos = ['dd/MM/yyyy', 'd/M/yyyy', 'dd/MM/yy', 'd/M/yy'];
          
          for (const formato of dataFormatos) {
            try {
              const dataParsed = parse(`${dataStr} ${horaStr}`, `${formato} HH:mm:ss`, new Date());
              if (isValid(dataParsed)) {
                dataCompleta = dataParsed;
                break;
              }
              const dataParsed2 = parse(`${dataStr} ${horaStr}`, `${formato} HH:mm`, new Date());
              if (isValid(dataParsed2)) {
                dataCompleta = dataParsed2;
                break;
              }
            } catch {
              continue;
            }
          }

          if (dataCompleta) {
            const nomeRemetente = nome.trim();
            participantesSet.add(nomeRemetente);

            // Detectar tipo de mídia
            let tipoMidia = 'texto';
            const mensagemLower = mensagem.toLowerCase();
            if (mensagemLower.includes('imagem omitida') || mensagemLower.includes('image omitted')) {
              tipoMidia = 'imagem';
            } else if (mensagemLower.includes('áudio omitido') || mensagemLower.includes('audio omitted')) {
              tipoMidia = 'audio';
            } else if (mensagemLower.includes('vídeo omitido') || mensagemLower.includes('video omitted')) {
              tipoMidia = 'video';
            } else if (mensagemLower.includes('documento omitido') || mensagemLower.includes('document omitted')) {
              tipoMidia = 'documento';
            } else if (mensagemLower.includes('sticker omitido') || mensagemLower.includes('sticker omitted')) {
              tipoMidia = 'sticker';
            }

            mensagemAtual = {
              data_mensagem: dataCompleta.toISOString(),
              remetente: 'cliente', // Será ajustado depois de definir o nome da empresa
              conteudo: mensagem.trim(),
              tipo_midia: tipoMidia,
              nomeRemetente,
            };
            mensagens.push(mensagemAtual);
            matched = true;
            break;
          }
        }
      }

      // Se não matchou e temos uma mensagem atual, pode ser continuação
      if (!matched && mensagemAtual && linhaLimpa) {
        mensagemAtual.conteudo += '\n' + linhaLimpa;
      }
    }

    setParticipantes(Array.from(participantesSet));
    return mensagens;
  };

  // Atualizar remetentes quando nome da empresa muda
  const mensagensComRemetente = useMemo(() => {
    if (!nomeEmpresa) return mensagensParseadas;
    
    return mensagensParseadas.map(msg => ({
      ...msg,
      remetente: msg.nomeRemetente.toLowerCase().includes(nomeEmpresa.toLowerCase()) 
        ? 'empresa' as const 
        : 'cliente' as const,
    }));
  }, [mensagensParseadas, nomeEmpresa]);

  // Estatísticas das mensagens
  const estatisticas = useMemo(() => {
    const total = mensagensComRemetente.length;
    const empresa = mensagensComRemetente.filter(m => m.remetente === 'empresa').length;
    const cliente = total - empresa;
    const primeiraData = mensagensComRemetente[0]?.data_mensagem;
    const ultimaData = mensagensComRemetente[mensagensComRemetente.length - 1]?.data_mensagem;
    
    return {
      total,
      empresa,
      cliente,
      primeiraData: primeiraData ? format(new Date(primeiraData), 'dd/MM/yyyy', { locale: ptBR }) : '-',
      ultimaData: ultimaData ? format(new Date(ultimaData), 'dd/MM/yyyy', { locale: ptBR }) : '-',
    };
  }, [mensagensComRemetente]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivo(file);
    setIsParsing(true);
    setErroParser(null);
    setMensagensParseadas([]);

    try {
      const conteudo = await file.text();
      const mensagens = parseWhatsAppExport(conteudo);
      
      if (mensagens.length === 0) {
        setErroParser('Não foi possível extrair mensagens do arquivo. Verifique se é uma exportação válida do WhatsApp.');
      } else {
        setMensagensParseadas(mensagens);
      }
    } catch (error) {
      console.error('Erro ao parsear arquivo:', error);
      setErroParser('Erro ao processar o arquivo. Verifique se é um arquivo de texto válido.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportar = async () => {
    if (!contatoSelecionado || mensagensComRemetente.length === 0) return;

    const contato = contatos.find(c => c.id === contatoSelecionado);
    
    await importarMutation.mutateAsync({
      contatoId: contatoSelecionado,
      telefone: contato?.telefone || telefoneDetectado,
      mensagens: mensagensComRemetente.map(m => ({
        data_mensagem: m.data_mensagem,
        remetente: m.remetente,
        conteudo: m.conteudo,
        tipo_midia: m.tipo_midia,
      })),
      nomeEmpresa,
    });

    resetState();
    onOpenChange(false);
  };

  const resetState = () => {
    setArquivo(null);
    setMensagensParseadas([]);
    setNomeEmpresa('');
    setContatoSelecionado('');
    setTelefoneDetectado('');
    setErroParser(null);
    setParticipantes([]);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetState();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Importar Conversas do WhatsApp
          </DialogTitle>
          <DialogDescription>
            Faça upload de uma exportação de conversa do WhatsApp (.txt) para análise de IA
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Upload de arquivo */}
          <div className="space-y-2">
            <Label>Arquivo de Conversa</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".txt,.zip"
                onChange={handleFileChange}
                className="flex-1"
              />
              {isParsing && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              {mensagensParseadas.length > 0 && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </div>
            <p className="text-xs text-muted-foreground">
              No WhatsApp, vá em Configurações da conversa → Mais → Exportar conversa → Sem mídia
            </p>
          </div>

          {/* Erro de parsing */}
          {erroParser && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{erroParser}</span>
            </div>
          )}

          {/* Estatísticas e configuração */}
          {mensagensParseadas.length > 0 && (
            <>
              {/* Estatísticas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{estatisticas.total}</div>
                  <div className="text-xs text-muted-foreground">Mensagens</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-500">{estatisticas.cliente}</div>
                  <div className="text-xs text-muted-foreground">Do Cliente</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-500">{estatisticas.empresa}</div>
                  <div className="text-xs text-muted-foreground">Da Empresa</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-sm font-medium">{estatisticas.primeiraData}</div>
                  <div className="text-xs text-muted-foreground">até {estatisticas.ultimaData}</div>
                </div>
              </div>

              {/* Participantes detectados */}
              <div className="space-y-2">
                <Label>Participantes Detectados</Label>
                <div className="flex flex-wrap gap-2">
                  {participantes.map((p, i) => (
                    <Badge 
                      key={i} 
                      variant={nomeEmpresa && p.toLowerCase().includes(nomeEmpresa.toLowerCase()) ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => setNomeEmpresa(p)}
                    >
                      {nomeEmpresa && p.toLowerCase().includes(nomeEmpresa.toLowerCase()) ? (
                        <Building2 className="h-3 w-3 mr-1" />
                      ) : (
                        <User className="h-3 w-3 mr-1" />
                      )}
                      {p}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Clique no nome que representa sua empresa/escola
                </p>
              </div>

              {/* Nome da empresa */}
              <div className="space-y-2">
                <Label htmlFor="nomeEmpresa">Nome da Empresa/Escola no Chat</Label>
                <Input
                  id="nomeEmpresa"
                  value={nomeEmpresa}
                  onChange={(e) => setNomeEmpresa(e.target.value)}
                  placeholder="Ex: GoKite, Escola de Kite..."
                />
                <p className="text-xs text-muted-foreground">
                  Usado para identificar quais mensagens são da empresa vs cliente
                </p>
              </div>

              {/* Seleção de contato */}
              <div className="space-y-2">
                <Label>Vincular a Contato</Label>
                <Select value={contatoSelecionado} onValueChange={setContatoSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um contato da base" />
                  </SelectTrigger>
                  <SelectContent>
                    {contatos.map((contato) => (
                      <SelectItem key={contato.id} value={contato.id}>
                        {contato.nome || 'Sem nome'} - {contato.telefone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview das mensagens */}
              <div className="space-y-2">
                <Label>Preview das Mensagens</Label>
                <ScrollArea className="h-48 border rounded-lg p-3">
                  <div className="space-y-2">
                    {mensagensComRemetente.slice(0, 20).map((msg, i) => (
                      <div 
                        key={i}
                        className={`p-2 rounded-lg text-sm ${
                          msg.remetente === 'empresa' 
                            ? 'bg-primary/10 ml-8' 
                            : 'bg-muted mr-8'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <span className="font-medium">{msg.nomeRemetente}</span>
                          <span>•</span>
                          <span>{format(new Date(msg.data_mensagem), 'dd/MM HH:mm')}</span>
                          {msg.tipo_midia !== 'texto' && (
                            <Badge variant="outline" className="text-[10px] py-0">
                              {msg.tipo_midia}
                            </Badge>
                          )}
                        </div>
                        <p className="text-foreground line-clamp-2">{msg.conteudo}</p>
                      </div>
                    ))}
                    {mensagensComRemetente.length > 20 && (
                      <p className="text-center text-xs text-muted-foreground py-2">
                        ... e mais {mensagensComRemetente.length - 20} mensagens
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImportar}
            disabled={
              !contatoSelecionado || 
              !nomeEmpresa || 
              mensagensComRemetente.length === 0 || 
              importarMutation.isPending
            }
          >
            {importarMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar {mensagensComRemetente.length} Mensagens
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
