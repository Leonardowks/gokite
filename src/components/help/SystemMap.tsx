import { SystemArea } from "@/lib/helpContent";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";

interface SystemMapProps {
  areas: SystemArea[];
  onClose?: () => void;
}

export function SystemMap({ areas, onClose }: SystemMapProps) {
  const navigate = useNavigate();
  
  const handleNavigate = (pagina: string) => {
    onClose?.();
    navigate(pagina);
  };
  
  return (
    <div className="grid gap-3">
      {areas.map((area) => {
        const Icon = area.icone;
        
        return (
          <button
            key={area.pagina}
            onClick={() => handleNavigate(area.pagina)}
            className="group w-full p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 text-left"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-foreground text-sm">{area.nome}</h4>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <p className="text-xs text-muted-foreground mb-2">{area.acaoRapida}</p>
                
                {/* O que você vê */}
                <div className="flex flex-wrap gap-1">
                  {area.oqueVoceVe.map((item, idx) => (
                    <span 
                      key={idx}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
