import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, Upload, Package, CreditCard, Check, AlertCircle, 
  ArrowLeft, ArrowRight, X, Building2, Calendar, Loader2,
  CheckCircle2, XCircle, MinusCircle, Truck, ClipboardList
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EstoqueSubmenu } from "@/components/EstoqueSubmenu";
import { PremiumCard } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useNFeImport, ProductMatch } from "@/hooks/useNFeImport";
import { formatCNPJ, formatCurrency } from "@/lib/nfeParser";
import { cn } from "@/lib/utils";

export default function ImportarNFe() {
  const navigate = useNavigate();
  const {
    nfeData,
    productMatches,
    progress,
    parseXML,
    matchProducts,
    importNFe,
    isImporting,
    updateMatchStatus,
    updateMatchQuantity,
    reset,
  } = useNFeImport();

  const [isDragging, setIsDragging] = useState(false);
  const [currentStep, setCurrentStep] = useState<"upload" | "review" | "confirm">("upload");
  const [tipoImportacao, setTipoImportacao] = useState<"nota_nova" | "nota_antiga">("nota_nova");

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".xml")) {
      toast.error("Por favor, selecione um arquivo XML");
      return;
    }

    try {
      const data = await parseXML(file);
      await matchProducts(data);
      setCurrentStep("review");
      toast.success(`NF-e ${data.nNF} carregada com ${data.produtos.length} produtos`);
    } catch (error) {
      console.error("Erro ao processar XML:", error);
      toast.error("Erro ao processar XML: " + (error as Error).message);
    }
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, []);

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  // Handle import confirmation
  const handleConfirmImport = () => {
    importNFe({ tipoImportacao });
  };

  // Stats
  const matchedCount = productMatches.filter(m => m.status === "found").length;
  const skippedCount = productMatches.filter(m => m.status === "skip").length;
  const notFoundCount = productMatches.filter(m => m.status === "not_found").length;

  // Render step content
  const renderStepContent = () => {
    if (progress.step === "parsing" || progress.step === "matching") {
      return (
        <PremiumCard className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">
              {progress.step === "parsing" ? "Processando XML..." : "Buscando produtos..."}
            </p>
            <Progress 
              value={(progress.current / Math.max(progress.total, 1)) * 100} 
              className="w-64" 
            />
            <p className="text-sm text-muted-foreground">
              {progress.current} de {progress.total}
            </p>
          </div>
        </PremiumCard>
      );
    }

    if (progress.step === "importing") {
      return (
        <PremiumCard className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Importando NF-e...</p>
            <Progress 
              value={(progress.current / Math.max(progress.total, 1)) * 100} 
              className="w-64" 
            />
            <p className="text-sm text-muted-foreground">
              {progress.current} de {progress.total} itens processados
            </p>
          </div>
        </PremiumCard>
      );
    }

    if (progress.step === "done") {
      return (
        <PremiumCard className="p-8">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold">Importação Concluída!</h3>
              <p className="text-muted-foreground mt-2">
                NF-e {nfeData?.nNF} importada com sucesso
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => { reset(); setCurrentStep("upload"); }}>
                Importar Outra
              </Button>
              <Button onClick={() => navigate("/estoque")}>
                Ir para Estoque
              </Button>
            </div>
          </div>
        </PremiumCard>
      );
    }

    // Upload step
    if (currentStep === "upload") {
      return (
        <PremiumCard className="p-8">
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-12 text-center transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-border"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Arraste o arquivo XML aqui</h3>
                <p className="text-muted-foreground mt-1">ou clique para selecionar</p>
              </div>
              <input
                type="file"
                accept=".xml"
                onChange={handleInputChange}
                className="hidden"
                id="xml-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="xml-upload" className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  Selecionar Arquivo XML
                </label>
              </Button>
            </div>
          </div>
        </PremiumCard>
      );
    }

    // Review step
    if (currentStep === "review" && nfeData) {
      return (
        <div className="space-y-6">
          {/* Tipo de Importação */}
          <PremiumCard className="p-6 border-primary/30">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Tipo de Importação</h3>
              </div>
              <RadioGroup 
                value={tipoImportacao} 
                onValueChange={(v) => setTipoImportacao(v as "nota_nova" | "nota_antiga")}
                className="grid gap-4 sm:grid-cols-2"
              >
                <label 
                  htmlFor="nota_nova" 
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    tipoImportacao === "nota_nova" 
                      ? "border-green-500 bg-green-500/10" 
                      : "border-border hover:border-green-500/50"
                  )}
                >
                  <RadioGroupItem value="nota_nova" id="nota_nova" className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Entrada de Mercadoria</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Nota nova - adiciona estoque e cria contas a pagar
                    </p>
                  </div>
                </label>
                <label 
                  htmlFor="nota_antiga" 
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    tipoImportacao === "nota_antiga" 
                      ? "border-blue-500 bg-blue-500/10" 
                      : "border-border hover:border-blue-500/50"
                  )}
                >
                  <RadioGroupItem value="nota_antiga" id="nota_antiga" className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Apenas Cadastro</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Nota antiga - cadastra produtos sem alterar estoque
                    </p>
                  </div>
                </label>
              </RadioGroup>

              {tipoImportacao === "nota_antiga" && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Produtos serão cadastrados com estoque zerado e status "Pendente Verificação". 
                    Use o Scanner para confirmar a existência física.
                  </p>
                </div>
              )}
            </div>
          </PremiumCard>

          {/* NF-e Info */}
          <PremiumCard className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Número da NF-e</p>
                  <p className="font-semibold">{nfeData.nNF}</p>
                  {nfeData.chNFe && (
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      Chave: {nfeData.chNFe}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Fornecedor</p>
                  <p className="font-semibold">{nfeData.fornecedor.xNome}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCNPJ(nfeData.fornecedor.CNPJ)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Data de Emissão</p>
                  <p className="font-semibold">
                    {nfeData.dhEmi ? new Date(nfeData.dhEmi).toLocaleDateString("pt-BR") : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Valor: {formatCurrency(nfeData.vNF)}
                  </p>
                </div>
              </div>
            </div>
          </PremiumCard>

          {/* Products Table */}
          <PremiumCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Produtos ({productMatches.length})
              </h3>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {matchedCount} encontrados
                </Badge>
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {notFoundCount} não encontrados
                </Badge>
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                  <MinusCircle className="h-3 w-3 mr-1" />
                  {skippedCount} ignorados
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>EAN</TableHead>
                    <TableHead className="text-right">Qtd NF-e</TableHead>
                    <TableHead className="text-right">Entrada</TableHead>
                    <TableHead className="text-right">Valor Unit.</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productMatches.map((match, index) => (
                    <TableRow 
                      key={index}
                      className={cn(match.status === "skip" && "opacity-50")}
                    >
                      <TableCell>
                        {match.status === "found" && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {match.status === "not_found" && (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                        {match.status === "skip" && (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium truncate max-w-[200px]">
                            {match.produto.xProd}
                          </p>
                          {match.equipamento && (
                            <p className="text-xs text-green-600">
                              → {match.equipamento.nome}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            SKU: {match.produto.cProd}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {match.produto.cEAN || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {match.produto.qCom} {match.produto.uCom}
                      </TableCell>
                      <TableCell className="text-right">
                        {match.status === "found" ? (
                          <Input
                            type="number"
                            min={0}
                            value={match.quantidadeEntrada}
                            onChange={(e) => updateMatchQuantity(index, parseInt(e.target.value) || 0)}
                            className="w-20 h-8 text-right"
                          />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(match.produto.vUnCom)}
                      </TableCell>
                      <TableCell>
                        {match.status !== "skip" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateMatchStatus(index, "skip")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {match.status === "skip" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateMatchStatus(index, match.equipamento ? "found" : "not_found")}
                          >
                            Restaurar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </PremiumCard>

          {/* Duplicatas (Accounts Payable) */}
          {nfeData.duplicatas.length > 0 && (
            <PremiumCard className="p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5" />
                Faturas para Contas a Pagar ({nfeData.duplicatas.length})
              </h3>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Duplicata</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nfeData.duplicatas.map((dup, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{dup.nDup}</TableCell>
                        <TableCell>
                          {new Date(dup.dVenc + "T12:00:00").toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(dup.vDup)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </PremiumCard>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => { reset(); setCurrentStep("upload"); }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button 
              onClick={handleConfirmImport}
              disabled={matchedCount === 0}
            >
              <Check className="h-4 w-4 mr-2" />
              Confirmar Importação
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Importar NF-e"
            description="Upload de XML de Nota Fiscal Eletrônica"
          />
          <Button variant="outline" onClick={() => navigate("/estoque")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>

        <EstoqueSubmenu />

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 py-4">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full",
            currentStep === "upload" ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full",
            currentStep === "review" ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Revisão</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full",
            progress.step === "done" ? "bg-green-500 text-white" : "bg-muted"
          )}>
            <Check className="h-4 w-4" />
            <span className="hidden sm:inline">Concluído</span>
          </div>
        </div>

        {renderStepContent()}
      </div>
    </AdminLayout>
  );
}
