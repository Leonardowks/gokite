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
    mutationFn: async ({ tipoImportacao }: { tipoImportacao: "nota_nova" | "nota_antiga" }) => {
      if (!nfeData) throw new Error("Nenhuma NF-e carregada");
      
      const productsToUpdate = productMatches.filter(m => m.status === "found" && m.quantidadeEntrada > 0);
      const productsToCreate = productMatches.filter(m => m.status === "not_found");
      const duplicatasToCreate = tipoImportacao === "nota_nova" ? nfeData.duplicatas : [];
      
      const totalOperations = productsToUpdate.length + productsToCreate.length + duplicatasToCreate.length + 1;
      setProgress({ step: "importing", current: 0, total: totalOperations });
      
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
          qtd_produtos: productsToUpdate.length + productsToCreate.length,
          qtd_duplicatas: duplicatasToCreate.length,
          status: tipoImportacao === "nota_antiga" ? "cadastro_apenas" : "processado",
        })
        .select()
        .single();
      
      if (nfeError) throw nfeError;
      
      setProgress(p => ({ ...p, current: 1 }));
      let currentProgress = 1;
      
      // 2. Update stock for matched products (only add stock if nota_nova)
      for (let i = 0; i < productsToUpdate.length; i++) {
        const match = productsToUpdate[i];
        if (!match.equipamento) continue;
        
        if (tipoImportacao === "nota_nova") {
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
        }
        // For nota_antiga, we just skip stock updates - products already exist
        
        currentProgress++;
        setProgress(p => ({ ...p, current: currentProgress }));
      }
      
      // 3. Create new products that were not found
      let produtosCriados = 0;
      for (let i = 0; i < productsToCreate.length; i++) {
        const match = productsToCreate[i];
        const produto = match.produto;
        
        // Infer tipo from product name/category
        let tipo = "produto";
        const nomeLower = produto.xProd.toLowerCase();
        if (nomeLower.includes("kite") || nomeLower.includes("asa")) tipo = "kite";
        else if (nomeLower.includes("prancha") || nomeLower.includes("board")) tipo = "prancha";
        else if (nomeLower.includes("barra") || nomeLower.includes("bar")) tipo = "barra";
        else if (nomeLower.includes("trapezio") || nomeLower.includes("harness")) tipo = "trapezio";
        
        // Create new equipment
        const { data: novoEquipamento, error: createError } = await supabase
          .from("equipamentos")
          .insert({
            nome: produto.xProd,
            tipo,
            ean: produto.cEAN && produto.cEAN !== "SEM GTIN" ? produto.cEAN : null,
            supplier_sku: produto.cProd,
            cost_price: produto.vUnCom,
            sale_price: Math.round(produto.vUnCom * 1.4), // 40% margin
            // DIFERENÇA PRINCIPAL: estoque depende do tipo de importação
            quantidade_fisica: tipoImportacao === "nota_nova" ? match.quantidadeEntrada : 0,
            status: tipoImportacao === "nota_antiga" ? "cadastro_pendente" : "disponivel",
            source_type: "owned",
            fiscal_category: "venda_produto",
            preco_aluguel_dia: 0,
          })
          .select()
          .single();
        
        if (createError) {
          console.error("Erro ao criar equipamento:", createError);
        } else if (novoEquipamento) {
          produtosCriados++;
          
          // Register movement only if nota_nova (actual stock entry)
          if (tipoImportacao === "nota_nova") {
            await supabase.from("movimentacoes_estoque").insert({
              equipamento_id: novoEquipamento.id,
              tipo: "entrada",
              quantidade: match.quantidadeEntrada,
              origem: "nfe",
              nfe_id: nfeRecord.id,
              notas: `Novo produto via NF-e ${nfeData.nNF}`,
            });
          }
        }
        
        currentProgress++;
        setProgress(p => ({ ...p, current: currentProgress }));
      }
      
      // 4. Create accounts payable entries for duplicatas (only for nota_nova)
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
        
        currentProgress++;
        setProgress(p => ({ ...p, current: currentProgress }));
      }
      
      setProgress({ step: "done", current: 0, total: 0 });
      
      return {
        nfeId: nfeRecord.id,
        produtosAtualizados: productsToUpdate.length,
        produtosCriados,
        duplicatasCriadas: duplicatasToCreate.length,
        tipoImportacao,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes"] });
      queryClient.invalidateQueries({ queryKey: ["contas-a-pagar"] });
      
      if (result.tipoImportacao === "nota_antiga") {
        toast.success(
          `Catálogo atualizado! ${result.produtosCriados} produtos cadastrados. Use o Scanner para confirmar estoque físico.`
        );
      } else {
        toast.success(
          `NF-e importada! ${result.produtosAtualizados} atualizados, ${result.produtosCriados} criados, ${result.duplicatasCriadas} faturas.`
        );
      }
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
