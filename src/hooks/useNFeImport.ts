import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseNFeXML, NFeData, NFeProduto } from "@/lib/nfeParser";
import { toast } from "sonner";

export interface ProductMatch {
  produto: NFeProduto;
  equipamento?: {
    id: string;
    nome: string;
    quantidade_fisica: number;
    ean?: string;
  };
  status: "found" | "not_found" | "skip";
  quantidadeEntrada: number;
}

export interface ImportProgress {
  step: "upload" | "parsing" | "matching" | "review" | "importing" | "done";
  current: number;
  total: number;
}

export function useNFeImport() {
  const queryClient = useQueryClient();
  const [nfeData, setNfeData] = useState<NFeData | null>(null);
  const [productMatches, setProductMatches] = useState<ProductMatch[]>([]);
  const [progress, setProgress] = useState<ImportProgress>({ step: "upload", current: 0, total: 0 });

  // Parse XML file
  const parseXML = async (file: File): Promise<NFeData> => {
    setProgress({ step: "parsing", current: 0, total: 1 });
    
    const text = await file.text();
    const data = parseNFeXML(text);
    
    setNfeData(data);
    setProgress({ step: "parsing", current: 1, total: 1 });
    
    return data;
  };

  // Match products with existing inventory
  const matchProducts = async (data: NFeData): Promise<ProductMatch[]> => {
    setProgress({ step: "matching", current: 0, total: data.produtos.length });
    
    const matches: ProductMatch[] = [];
    
    for (let i = 0; i < data.produtos.length; i++) {
      const produto = data.produtos[i];
      
      // Try to find by EAN first, then by SKU
      let equipamento = null;
      
      if (produto.cEAN) {
        const { data: found } = await supabase
          .from("equipamentos")
          .select("id, nome, quantidade_fisica, ean")
          .eq("ean", produto.cEAN)
          .limit(1)
          .single();
        equipamento = found;
      }
      
      if (!equipamento && produto.cProd) {
        const { data: found } = await supabase
          .from("equipamentos")
          .select("id, nome, quantidade_fisica, ean")
          .eq("supplier_sku", produto.cProd)
          .limit(1)
          .single();
        equipamento = found;
      }
      
      matches.push({
        produto,
        equipamento: equipamento || undefined,
        status: equipamento ? "found" : "not_found",
        quantidadeEntrada: produto.qCom,
      });
      
      setProgress({ step: "matching", current: i + 1, total: data.produtos.length });
    }
    
    setProductMatches(matches);
    setProgress({ step: "review", current: 0, total: 0 });
    
    return matches;
  };

  // Process the import
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!nfeData) throw new Error("Nenhuma NF-e carregada");
      
      const productsToImport = productMatches.filter(m => m.status === "found" && m.quantidadeEntrada > 0);
      const duplicatasToCreate = nfeData.duplicatas;
      
      setProgress({ step: "importing", current: 0, total: productsToImport.length + duplicatasToCreate.length + 1 });
      
      // 1. Create NF-e record
      const { data: nfeRecord, error: nfeError } = await supabase
        .from("importacoes_nfe")
        .insert({
          numero_nfe: nfeData.nNF,
          chave_acesso: nfeData.chNFe,
          fornecedor_cnpj: nfeData.fornecedor.CNPJ,
          fornecedor_nome: nfeData.fornecedor.xNome,
          data_emissao: nfeData.dhEmi ? nfeData.dhEmi.split("T")[0] : null,
          valor_total: nfeData.vNF,
          qtd_produtos: productsToImport.length,
          qtd_duplicatas: duplicatasToCreate.length,
          status: "processado",
        })
        .select()
        .single();
      
      if (nfeError) throw nfeError;
      
      setProgress(p => ({ ...p, current: 1 }));
      
      // 2. Update stock for matched products
      for (let i = 0; i < productsToImport.length; i++) {
        const match = productsToImport[i];
        if (!match.equipamento) continue;
        
        const novaQuantidade = (match.equipamento.quantidade_fisica || 0) + match.quantidadeEntrada;
        
        // Update equipment quantity
        await supabase
          .from("equipamentos")
          .update({ quantidade_fisica: novaQuantidade })
          .eq("id", match.equipamento.id);
        
        // Register movement
        await supabase.from("movimentacoes_estoque").insert({
          equipamento_id: match.equipamento.id,
          tipo: "entrada",
          quantidade: match.quantidadeEntrada,
          origem: "nfe",
          nfe_id: nfeRecord.id,
          notas: `NF-e ${nfeData.nNF} - ${nfeData.fornecedor.xNome}`,
        });
        
        setProgress(p => ({ ...p, current: 1 + i + 1 }));
      }
      
      // 3. Create accounts payable entries for duplicatas
      for (let i = 0; i < duplicatasToCreate.length; i++) {
        const dup = duplicatasToCreate[i];
        
        await supabase.from("contas_a_pagar").insert({
          descricao: `NF-e ${nfeData.nNF} - Dup ${dup.nDup}`,
          valor: dup.vDup,
          data_vencimento: dup.dVenc,
          categoria: "fornecedores",
          centro_de_custo: "Loja",
          fornecedor: nfeData.fornecedor.xNome,
          status: "pendente",
          nfe_id: nfeRecord.id,
          notas: `Importado de NF-e. Chave: ${nfeData.chNFe || "N/A"}`,
        });
        
        setProgress(p => ({ ...p, current: 1 + productsToImport.length + i + 1 }));
      }
      
      setProgress({ step: "done", current: 0, total: 0 });
      
      return {
        nfeId: nfeRecord.id,
        produtosImportados: productsToImport.length,
        duplicatasCriadas: duplicatasToCreate.length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes"] });
      queryClient.invalidateQueries({ queryKey: ["contas-a-pagar"] });
      
      toast.success(
        `NF-e importada! ${result.produtosImportados} produtos atualizados, ${result.duplicatasCriadas} faturas criadas.`
      );
    },
    onError: (error) => {
      console.error("Erro ao importar NF-e:", error);
      toast.error("Erro ao importar NF-e: " + (error as Error).message);
    },
  });

  // Update match status
  const updateMatchStatus = (index: number, status: "found" | "not_found" | "skip") => {
    setProductMatches(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status };
      return updated;
    });
  };

  // Update quantity
  const updateMatchQuantity = (index: number, quantidade: number) => {
    setProductMatches(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantidadeEntrada: quantidade };
      return updated;
    });
  };

  // Reset state
  const reset = () => {
    setNfeData(null);
    setProductMatches([]);
    setProgress({ step: "upload", current: 0, total: 0 });
  };

  return {
    nfeData,
    productMatches,
    progress,
    parseXML,
    matchProducts,
    importNFe: importMutation.mutate,
    isImporting: importMutation.isPending,
    updateMatchStatus,
    updateMatchQuantity,
    reset,
  };
}
