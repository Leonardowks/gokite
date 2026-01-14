import { createContext, useContext, ReactNode, useEffect, useState, useRef } from "react";
import Joyride, { CallBackProps, STATUS } from "react-joyride";
import { useLocation } from "react-router-dom";
import { useTour } from "@/hooks/useTour";
import { toast } from "sonner";

interface TourContextType {
  startTour: () => void;
  hasTourAvailable: boolean;
  resetAllTours: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function useTourContext() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTourContext must be used within TourProvider");
  }
  return context;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { 
    isRunning, 
    currentTour, 
    startTour, 
    stopTour, 
    hasSeenTour, 
    hasTourAvailable,
    markTourAsSeen,
    resetAllTours,
  } = useTour();
  
  const shownToastsRef = useRef<Set<string>>(new Set());

  // Mostrar toast discreto na primeira visita a uma tela com tour
  useEffect(() => {
    const currentPath = location.pathname;
    
    if (hasTourAvailable && !hasSeenTour && !shownToastsRef.current.has(currentPath)) {
      shownToastsRef.current.add(currentPath);
      
      // Delay para garantir que a página carregou
      const timer = setTimeout(() => {
        toast.info("Primeira vez aqui?", {
          description: "Clique para um tour guiado desta tela.",
          action: {
            label: "Iniciar Tour",
            onClick: startTour,
          },
          duration: 8000,
        });
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [location.pathname, hasTourAvailable, hasSeenTour, startTour]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as typeof STATUS.FINISHED)) {
      stopTour();
      markTourAsSeen();
      
      if (status === STATUS.FINISHED) {
        toast.success("Tour concluído! 🎉", {
          description: "Você pode reiniciar a qualquer momento pelo botão ?",
        });
      }
    }
  };

  return (
    <TourContext.Provider value={{ startTour, hasTourAvailable, resetAllTours }}>
      {children}
      
      {currentTour && (
        <Joyride
          steps={currentTour.steps}
          run={isRunning}
          continuous
          showSkipButton
          showProgress
          scrollToFirstStep
          spotlightClicks
          callback={handleJoyrideCallback}
          styles={{
            options: {
              primaryColor: "hsl(var(--primary))",
              textColor: "hsl(var(--foreground))",
              backgroundColor: "hsl(var(--background))",
              arrowColor: "hsl(var(--background))",
              zIndex: 10000,
            },
            buttonNext: {
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              borderRadius: "0.5rem",
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: 500,
            },
            buttonBack: {
              color: "hsl(var(--muted-foreground))",
              marginRight: 8,
            },
            buttonSkip: {
              color: "hsl(var(--muted-foreground))",
            },
            tooltip: {
              borderRadius: "0.75rem",
              padding: "16px",
              boxShadow: "0 10px 40px -10px rgba(0,0,0,0.2)",
            },
            tooltipContent: {
              padding: "8px 0",
            },
            spotlight: {
              borderRadius: "0.5rem",
            },
            overlay: {
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            },
          }}
          locale={{
            back: "Voltar",
            close: "Fechar",
            last: "Finalizar",
            next: "Próximo",
            skip: "Pular Tour",
          }}
          floaterProps={{
            disableAnimation: false,
          }}
        />
      )}
    </TourContext.Provider>
  );
}
