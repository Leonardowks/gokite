import { WifiOff, QrCode, Smartphone, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useConnectEvolution } from '@/hooks/useEvolutionConfig';

interface ConnectionRequiredOverlayProps {
  status: 'desconectado' | 'conectando' | 'qrcode';
  qrcode?: string | null;
  className?: string;
}

export function ConnectionRequiredOverlay({ status, qrcode, className }: ConnectionRequiredOverlayProps) {
  const navigate = useNavigate();
  const connectMutation = useConnectEvolution();

  const statusConfig = {
    desconectado: {
      icon: WifiOff,
      title: 'WhatsApp Desconectado',
      description: 'Conecte seu WhatsApp para visualizar suas conversas e insights de IA.',
      showButton: true,
      buttonLabel: 'Conectar WhatsApp',
    },
    conectando: {
      icon: Smartphone,
      title: 'Conectando...',
      description: 'Aguarde enquanto estabelecemos a conexão com o WhatsApp.',
      showButton: false,
      buttonLabel: '',
    },
    qrcode: {
      icon: QrCode,
      title: 'Escaneie o QR Code',
      description: 'Abra o WhatsApp no seu celular → Configurações → Dispositivos conectados → Conectar dispositivo',
      showButton: false,
      buttonLabel: '',
    },
  };

  const config = statusConfig[status] || statusConfig.desconectado;
  const Icon = config.icon;

  const handleConnect = () => {
    connectMutation.mutate(undefined);
  };

  return (
    <div className={cn(
      'h-full flex flex-col items-center justify-center p-8 relative',
      className
    )}>
      {/* Background blur effect */}
      <div className="absolute inset-0 bg-background/90 backdrop-blur-md" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* QR Code Display */}
        {status === 'qrcode' && qrcode ? (
          <div className="mb-6 p-4 bg-white rounded-2xl shadow-xl">
            <img 
              src={qrcode.startsWith('data:') ? qrcode : `data:image/png;base64,${qrcode}`}
              alt="QR Code WhatsApp"
              className="w-64 h-64 object-contain"
            />
          </div>
        ) : (
          /* Animated icon */
          <div className={cn(
            'w-24 h-24 rounded-full flex items-center justify-center mb-6',
            'bg-muted/50 border-2 border-border/50',
            status === 'conectando' && 'animate-pulse'
          )}>
            {status === 'conectando' ? (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            ) : (
              <Icon className={cn(
                'h-12 w-12',
                status === 'desconectado' && 'text-muted-foreground',
                status === 'qrcode' && 'text-primary'
              )} />
            )}
          </div>
        )}

        {/* Title */}
        <h2 className="text-2xl font-bold mb-3 text-foreground">
          {config.title}
        </h2>

        {/* Description */}
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed max-w-sm">
          {config.description}
        </p>

        {/* Action buttons */}
        {status === 'desconectado' && (
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleConnect}
              className="gap-2 px-6"
              size="lg"
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4" />
                  {config.buttonLabel}
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/configuracoes')}
              className="gap-1.5 text-muted-foreground"
            >
              Configurações avançadas
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {status === 'qrcode' && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Aguardando leitura do QR Code...</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnect}
              className="mt-2"
              disabled={connectMutation.isPending}
            >
              Gerar novo QR Code
            </Button>
          </div>
        )}

        {/* Privacy notice */}
        <p className="text-xs text-muted-foreground/70 mt-8 max-w-xs">
          Seus dados são privados. As conversas só aparecem quando conectado ao seu WhatsApp.
        </p>
      </div>
    </div>
  );
}
