import { WifiOff, QrCode, Smartphone, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ConnectionRequiredOverlayProps {
  status: 'desconectado' | 'conectando' | 'qrcode';
  className?: string;
}

export function ConnectionRequiredOverlay({ status, className }: ConnectionRequiredOverlayProps) {
  const navigate = useNavigate();

  const statusConfig = {
    desconectado: {
      icon: WifiOff,
      title: 'WhatsApp Desconectado',
      description: 'Conecte seu WhatsApp para visualizar suas conversas e insights de IA.',
      showButton: true,
    },
    conectando: {
      icon: Smartphone,
      title: 'Conectando...',
      description: 'Aguarde enquanto estabelecemos a conexão com o WhatsApp.',
      showButton: false,
    },
    qrcode: {
      icon: QrCode,
      title: 'Escaneie o QR Code',
      description: 'Abra o WhatsApp no seu celular e escaneie o QR Code nas configurações.',
      showButton: true,
    },
  };

  const config = statusConfig[status] || statusConfig.desconectado;
  const Icon = config.icon;

  return (
    <div className={cn(
      'h-full flex flex-col items-center justify-center p-8 relative',
      className
    )}>
      {/* Background blur effect */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* Animated icon */}
        <div className={cn(
          'w-20 h-20 rounded-full flex items-center justify-center mb-6',
          'bg-muted/50 border border-border/50',
          status === 'conectando' && 'animate-pulse'
        )}>
          <Icon className={cn(
            'h-10 w-10',
            status === 'desconectado' && 'text-muted-foreground',
            status === 'conectando' && 'text-primary animate-spin',
            status === 'qrcode' && 'text-primary'
          )} />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold mb-2 text-foreground">
          {config.title}
        </h2>

        {/* Description */}
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          {config.description}
        </p>

        {/* Action button */}
        {config.showButton && (
          <Button
            onClick={() => navigate('/configuracoes')}
            className="gap-2"
          >
            {status === 'qrcode' ? 'Ver QR Code' : 'Conectar WhatsApp'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        {/* Privacy notice */}
        <p className="text-xs text-muted-foreground/70 mt-8 max-w-xs">
          Seus dados são privados e só aparecem quando conectado.
        </p>
      </div>
    </div>
  );
}
