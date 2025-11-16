import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { localStorageService } from "@/lib/localStorage";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'urgent' | 'important' | 'info';
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = () => {
    const notifs: Notification[] = [];
    
    // Aulas pendentes
    const aulas = localStorageService.listarAgendamentos();
    const aulasPendentes = aulas.filter(a => a.status === 'pendente');
    if (aulasPendentes.length > 0) {
      notifs.push({
        id: 'aulas-pendentes',
        title: `${aulasPendentes.length} aula(s) pendente(s)`,
        message: 'Aulas aguardando confirmação',
        type: 'urgent',
        timestamp: new Date(),
        read: false,
      });
    }

    // Equipamentos próximos de vencer
    const alugueis = localStorageService.listarAlugueis?.() || [];
    const alugueisAtivos = alugueis.filter(a => a.status === 'ativo');
    const vencendoHoje = alugueisAtivos.filter(a => {
      const dataFim = new Date(a.data_fim);
      const hoje = new Date();
      const diff = dataFim.getTime() - hoje.getTime();
      return diff > 0 && diff < 24 * 60 * 60 * 1000;
    });
    
    if (vencendoHoje.length > 0) {
      notifs.push({
        id: 'equipamentos-vencendo',
        title: `${vencendoHoje.length} aluguel(is) vencendo hoje`,
        message: 'Equipamentos próximos da devolução',
        type: 'important',
        timestamp: new Date(),
        read: false,
      });
    }

    // Leads urgentes
    const leads = localStorageService.listarLeads?.() || [];
    const leadsUrgentes = leads.filter(l => l.score === 'urgente');
    if (leadsUrgentes.length > 0) {
      notifs.push({
        id: 'leads-urgentes',
        title: `${leadsUrgentes.length} lead(s) urgente(s)`,
        message: 'Alta chance de conversão - contate agora!',
        type: 'urgent',
        timestamp: new Date(),
        read: false,
      });
    }

    setNotifications(notifs);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const typeConfig = {
    urgent: { color: 'border-l-destructive bg-destructive/5', icon: '🔴' },
    important: { color: 'border-l-warning bg-warning/5', icon: '🟠' },
    info: { color: 'border-l-primary bg-primary/5', icon: '🔵' }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative notification-center"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação no momento
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Você está em dia! 🎉
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => {
                const config = typeConfig[notif.type];
                return (
                  <div
                    key={notif.id}
                    className={`p-4 border-l-4 ${config.color} ${!notif.read ? 'bg-accent/5' : ''} hover:bg-accent/10 transition-colors cursor-pointer`}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{notif.title}</h4>
                          {!notif.read && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {notif.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(notif.timestamp, "HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
