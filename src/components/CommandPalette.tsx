import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home,
  Users,
  Calendar,
  Package,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  BarChart3,
  Settings,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: Home, keywords: ["home", "inicio"] },
  { title: "Clientes", url: "/clientes", icon: Users, keywords: ["customers", "pessoas"] },
  { title: "Aulas", url: "/aulas", icon: Calendar, keywords: ["classes", "agendamento"] },
  { title: "Vendas", url: "/vendas", icon: TrendingUp, keywords: ["leads", "pipeline"] },
  { title: "Estoque", url: "/estoque", icon: Package, keywords: ["inventory", "equipamentos"] },
  { title: "Aluguel", url: "/aluguel", icon: Package, keywords: ["rental"] },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign, keywords: ["finance", "money"] },
  { title: "E-commerce", url: "/ecommerce", icon: ShoppingCart, keywords: ["loja", "pedidos"] },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, keywords: ["reports", "analytics"] },
  { title: "Configurações", url: "/configuracoes", icon: Settings, keywords: ["settings", "config"] },
];

const quickActions = [
  { title: "Nova Aula", url: "/aulas?action=new", icon: Plus, keywords: ["agendar", "criar"] },
  { title: "Novo Cliente", url: "/clientes?action=new", icon: Plus, keywords: ["adicionar", "cadastrar"] },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-xl border border-border/50 transition-all duration-200 group"
      >
        <Search className="h-4 w-4" />
        <span className="hidden lg:inline">Busca rápida...</span>
        <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono bg-background border border-border rounded-md">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar páginas, ações..." />
        <CommandList>
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-6">
              <Search className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
            </div>
          </CommandEmpty>
          
          <CommandGroup heading="Ações Rápidas">
            {quickActions.map((action) => (
              <CommandItem
                key={action.url}
                onSelect={() => runCommand(() => navigate(action.url))}
                className="flex items-center gap-3 px-3 py-3 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <action.icon className="h-4 w-4 text-primary" />
                </div>
                <span>{action.title}</span>
                <Sparkles className="h-3 w-3 ml-auto text-primary/50" />
              </CommandItem>
            ))}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Navegação">
            {navigationItems.map((item) => (
              <CommandItem
                key={item.url}
                onSelect={() => runCommand(() => navigate(item.url))}
                className="flex items-center gap-3 px-3 py-3 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
