import { useEffect, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";

interface OnboardingTourProps {
  onComplete?: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const tourCompleted = localStorage.getItem('tour_completed');
    if (!tourCompleted) {
      // Delay para garantir que os elementos estejam renderizados
      setTimeout(() => setRun(true), 500);
    }
  }, []);

  const steps: Step[] = [
    {
      target: '.metric-card-pendentes',
      content: '🔴 Aqui você vê as aulas que precisam de confirmação urgente! Clique para ver detalhes.',
      disableBeacon: true,
    },
    {
      target: '.daily-routine-widget',
      content: '🌅 Este é o seu guia diário! Veja exatamente o que fazer para não perder nenhuma oportunidade.',
    },
    {
      target: '.quick-actions-panel',
      content: '⚡ Use estas ações rápidas para resolver tarefas importantes com apenas 1 clique!',
    },
    {
      target: '.notification-center',
      content: '🔔 Suas notificações aparecem aqui. Nunca perca um aluguel vencendo ou um lead quente!',
    },
    {
      target: '[data-sidebar]',
      content: '🎯 Navegue entre as seções do CRM. Aulas, Vendas, Estoque - tudo a um clique de distância!',
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      localStorage.setItem('tour_completed', 'true');
      setRun(false);
      onComplete?.();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(210 100% 50%)',
          textColor: 'hsl(220 15% 20%)',
          backgroundColor: 'hsl(0 0% 100%)',
          arrowColor: 'hsl(0 0% 100%)',
          zIndex: 10000,
        },
        buttonNext: {
          backgroundColor: 'hsl(210 100% 50%)',
          color: 'white',
          borderRadius: '0.5rem',
        },
        buttonBack: {
          color: 'hsl(220 10% 45%)',
        },
        buttonSkip: {
          color: 'hsl(220 10% 45%)',
        },
      }}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular',
      }}
    />
  );
}
