import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  helpCategories,
  commercialFlows,
  automations,
  integrations,
  systemAreas,
  faqItems,
  searchHelpContent,
  type HelpCategory
} from "@/lib/helpContent";
import { FlowDiagram } from "./FlowDiagram";
import { AutomationCard } from "./AutomationCard";
import { IntegrationCard } from "./IntegrationCard";
import { SystemMap } from "./SystemMap";
import { FAQAccordion } from "./FAQAccordion";

interface HelpCenterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpCenterSheet({ open, onOpenChange }: HelpCenterSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const handleClose = () => onOpenChange(false);
  
  const handleBack = () => {
    setActiveCategory(null);
    setSearchQuery("");
  };
  
  // Search results
  const searchResults = searchQuery.length >= 2 
    ? searchHelpContent(searchQuery)
    : null;
  
  const hasSearchResults = searchResults && (
    searchResults.flows.length > 0 ||
    searchResults.automations.length > 0 ||
    searchResults.integrations.length > 0 ||
    searchResults.areas.length > 0 ||
    searchResults.faq.length > 0
  );
  
  const renderCategoryContent = (categoryId: string) => {
    switch (categoryId) {
      case "dinamica":
        return (
          <div className="space-y-4">
            {commercialFlows.map((flow) => (
              <div key={flow.id} className="p-4 rounded-xl border border-border/50 bg-card">
                <FlowDiagram flow={flow} />
              </div>
            ))}
          </div>
        );
      
      case "automacoes":
        return (
          <div className="grid gap-3">
            {automations.map((auto) => (
              <AutomationCard key={auto.id} automation={auto} />
            ))}
          </div>
        );
      
      case "integracoes":
        return (
          <div className="grid gap-3">
            {integrations.map((integ) => (
              <IntegrationCard key={integ.id} integration={integ} onClose={handleClose} />
            ))}
          </div>
        );
      
      case "mapa":
        return <SystemMap areas={systemAreas} onClose={handleClose} />;
      
      case "faq":
        return <FAQAccordion items={faqItems} />;
      
      default:
        return null;
    }
  };
  
  const activeCategoryData = helpCategories.find(c => c.id === activeCategory);
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-lg p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            {activeCategory && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 -ml-2"
                onClick={handleBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1">
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {activeCategory ? activeCategoryData?.titulo : "Central de Ajuda"}
              </SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                {activeCategory 
                  ? activeCategoryData?.descricao 
                  : "Entenda como o GoKite funciona"
                }
              </SheetDescription>
            </div>
          </div>
          
          {/* Search */}
          {!activeCategory && (
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-muted/50"
              />
            </div>
          )}
        </SheetHeader>
        
        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {/* Search Results */}
            {searchQuery.length >= 2 && searchResults && (
              <div className="space-y-6">
                {!hasSearchResults && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum resultado para "{searchQuery}"</p>
                  </div>
                )}
                
                {searchResults.flows.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      Dinâmica Comercial
                    </h3>
                    <div className="space-y-3">
                      {searchResults.flows.map((flow) => (
                        <div key={flow.id} className="p-4 rounded-xl border border-border/50 bg-card">
                          <FlowDiagram flow={flow} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {searchResults.automations.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      Automações
                    </h3>
                    <div className="grid gap-3">
                      {searchResults.automations.map((auto) => (
                        <AutomationCard key={auto.id} automation={auto} />
                      ))}
                    </div>
                  </div>
                )}
                
                {searchResults.integrations.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      Integrações
                    </h3>
                    <div className="grid gap-3">
                      {searchResults.integrations.map((integ) => (
                        <IntegrationCard key={integ.id} integration={integ} onClose={handleClose} />
                      ))}
                    </div>
                  </div>
                )}
                
                {searchResults.areas.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      Onde Encontrar
                    </h3>
                    <SystemMap areas={searchResults.areas} onClose={handleClose} />
                  </div>
                )}
                
                {searchResults.faq.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      Perguntas Frequentes
                    </h3>
                    <FAQAccordion items={searchResults.faq} searchQuery={searchQuery} />
                  </div>
                )}
              </div>
            )}
            
            {/* Category List */}
            {!searchQuery && !activeCategory && (
              <div className="space-y-2">
                {helpCategories.map((category) => {
                  const Icon = category.icone;
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className="group w-full p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 text-left flex items-center gap-4"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        "bg-muted group-hover:bg-primary/10 transition-colors"
                      )}>
                        <Icon className={cn("h-5 w-5", category.cor)} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground text-sm">{category.titulo}</h3>
                        <p className="text-xs text-muted-foreground">{category.descricao}</p>
                      </div>
                      
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* Active Category Content */}
            {activeCategory && !searchQuery && (
              renderCategoryContent(activeCategory)
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
