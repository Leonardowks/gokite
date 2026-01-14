import { useState } from "react";
import { HelpCircle, RotateCcw, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTourContext } from "@/components/TourProvider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { HelpCenterSheet } from "@/components/help/HelpCenterSheet";

export function HelpButton() {
  const { startTour, hasTourAvailable, resetAllTours } = useTourContext();
  const [helpCenterOpen, setHelpCenterOpen] = useState(false);

  const handleResetTours = () => {
    resetAllTours();
    toast.success("Tours resetados!", {
      description: "Você verá os tours novamente ao navegar pelas telas.",
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-9 w-9 rounded-xl hover:bg-muted/50"
            aria-label="Ajuda"
          >
            <HelpCircle className="h-4 w-4" />
            {hasTourAvailable && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56 rounded-xl">
          <DropdownMenuItem 
            onClick={() => setHelpCenterOpen(true)}
            className="cursor-pointer gap-2"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Central de Ajuda</span>
            <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0 bg-primary/10 text-primary">
              Novo
            </Badge>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={startTour}
            disabled={!hasTourAvailable}
            className="cursor-pointer gap-2"
          >
            <BookOpen className="h-4 w-4" />
            <span>Tour desta tela</span>
            {hasTourAvailable && (
              <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0">
                Disponível
              </Badge>
            )}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleResetTours}
            className="cursor-pointer gap-2 text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Resetar todos os tours</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <HelpCenterSheet 
        open={helpCenterOpen} 
        onOpenChange={setHelpCenterOpen} 
      />
    </>
  );
}
