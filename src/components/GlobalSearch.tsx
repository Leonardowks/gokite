import { useState, useRef, useEffect } from "react";
import { Search, Users, Calendar, Package, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  type: "cliente" | "aula" | "equipamento";
  title: string;
  subtitle: string;
  url: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Mock search - in production would query actual data
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    // Simulated search results
    const mockResults: SearchResult[] = ([
      { type: "cliente" as const, title: "João Silva", subtitle: "joao@email.com", url: "/clientes" },
      { type: "cliente" as const, title: "Maria Santos", subtitle: "maria@email.com", url: "/clientes" },
      { type: "aula" as const, title: "Aula Kitesurf", subtitle: "Hoje às 10:00", url: "/aulas" },
      { type: "equipamento" as const, title: "Kite Duotone Neo", subtitle: "Disponível", url: "/estoque" },
    ]).filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase())
    );

    setResults(mockResults.slice(0, 5));
  }, [query]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "cliente": return Users;
      case "aula": return Calendar;
      case "equipamento": return Package;
      default: return Search;
    }
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.url);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Buscar clientes, aulas, equipamentos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10 h-10 bg-muted/50 border-transparent focus:border-primary/30 focus:bg-background rounded-xl"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in">
          {results.map((result, index) => {
            const Icon = getIcon(result.type);
            return (
              <button
                key={index}
                onClick={() => handleSelect(result)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
