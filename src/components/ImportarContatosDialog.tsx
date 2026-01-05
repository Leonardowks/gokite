import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import { useImportarContatos } from '@/hooks/useContatosInteligencia';

interface ImportarContatosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedContato {
  nome?: string;
  telefone: string;
  email?: string;
}

export function ImportarContatosDialog({ open, onOpenChange }: ImportarContatosDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedContato[]>([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importarMutation = useImportarContatos();

  const parseCSV = useCallback((content: string): ParsedContato[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Detectar separador
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';

    // Primeira linha como cabeçalho
    const headers = firstLine.split(separator).map(h => h.trim().toLowerCase());

    // Encontrar índices das colunas
    const nomeIndex = headers.findIndex(h => 
      h.includes('nome') || h.includes('name') || h.includes('contato')
    );
    const telefoneIndex = headers.findIndex(h => 
      h.includes('telefone') || h.includes('phone') || h.includes('celular') || h.includes('whatsapp')
    );
    const emailIndex = headers.findIndex(h => 
      h.includes('email') || h.includes('e-mail')
    );

    // Se não encontrou telefone, assumir primeira coluna
    const phoneCol = telefoneIndex >= 0 ? telefoneIndex : 0;
    const nameCol = nomeIndex >= 0 ? nomeIndex : (phoneCol === 0 ? 1 : 0);
    const mailCol = emailIndex;

    const contatos: ParsedContato[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
      
      const telefone = values[phoneCol];
      if (!telefone || telefone.replace(/\D/g, '').length < 8) continue;

      contatos.push({
        nome: values[nameCol] || undefined,
        telefone,
        email: mailCol >= 0 ? values[mailCol] : undefined,
      });
    }

    return contatos;
  }, []);

  const parseVCard = useCallback((content: string): ParsedContato[] => {
    const contatos: ParsedContato[] = [];
    const vcards = content.split('END:VCARD');

    for (const vcard of vcards) {
      if (!vcard.includes('BEGIN:VCARD')) continue;

      let nome: string | undefined;
      let telefone: string | undefined;
      let email: string | undefined;

      const lines = vcard.split('\n');
      for (const line of lines) {
        if (line.startsWith('FN:')) {
          nome = line.substring(3).trim();
        } else if (line.startsWith('TEL') || line.includes('TEL:')) {
          const match = line.match(/[\d\s\-\+\(\)]+/);
          if (match) {
            telefone = match[0].replace(/\D/g, '');
          }
        } else if (line.startsWith('EMAIL')) {
          const parts = line.split(':');
          if (parts.length > 1) {
            email = parts[parts.length - 1].trim();
          }
        }
      }

      if (telefone && telefone.length >= 8) {
        contatos.push({ nome, telefone, email });
      }
    }

    return contatos;
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setParsing(true);

    try {
      const content = await selectedFile.text();
      let parsed: ParsedContato[] = [];

      if (selectedFile.name.endsWith('.vcf')) {
        parsed = parseVCard(content);
      } else {
        parsed = parseCSV(content);
      }

      if (parsed.length === 0) {
        setError('Nenhum contato válido encontrado no arquivo');
      } else {
        setPreview(parsed);
      }
    } catch (err) {
      setError('Erro ao processar arquivo');
      console.error(err);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    try {
      await importarMutation.mutateAsync(preview);
      onOpenChange(false);
      setFile(null);
      setPreview([]);
    } catch (err) {
      // Error handled by mutation
    }
  };

  const resetState = () => {
    setFile(null);
    setPreview([]);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Contatos
          </DialogTitle>
          <DialogDescription>
            Importe contatos de arquivos CSV, TXT ou vCard (.vcf)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          {!file && (
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">
                Arraste um arquivo ou clique para selecionar
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                Formatos: CSV, TXT, vCard (.vcf)
              </span>
              <input
                type="file"
                className="hidden"
                accept=".csv,.txt,.vcf"
                onChange={handleFileChange}
              />
            </label>
          )}

          {/* Parsing */}
          {parsing && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="ml-3 text-muted-foreground">Processando arquivo...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">{preview.length} contatos encontrados</span>
                </div>
                <Button variant="ghost" size="sm" onClick={resetState}>
                  Trocar arquivo
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-60 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">Nome</th>
                        <th className="text-left p-2 font-medium">Telefone</th>
                        <th className="text-left p-2 font-medium">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 50).map((contato, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{contato.nome || '-'}</td>
                          <td className="p-2 font-mono text-xs">{contato.telefone}</td>
                          <td className="p-2 text-muted-foreground">{contato.email || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.length > 50 && (
                  <div className="p-2 bg-muted text-center text-sm text-muted-foreground">
                    ... e mais {preview.length - 50} contatos
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import Progress */}
          {importarMutation.isPending && (
            <div className="space-y-2">
              <Progress value={undefined} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                Importando contatos...
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={preview.length === 0 || importarMutation.isPending}
          >
            {importarMutation.isPending ? 'Importando...' : `Importar ${preview.length} contatos`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
