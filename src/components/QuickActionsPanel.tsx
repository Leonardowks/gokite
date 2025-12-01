import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, CheckCircle, DollarSign, Package } from "lucide-react";

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  badge?: number;
}

interface QuickActionsPanelProps {
  actions: QuickAction[];
}

export function QuickActionsPanel({ actions }: QuickActionsPanelProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <Card className="quick-actions-panel hover-lift">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
          ⚡ Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              onClick={action.onClick}
              variant={action.variant || 'outline'}
              className="w-full justify-start h-auto py-2 sm:py-3 relative"
            >
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                <div className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 text-primary shrink-0">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-xs sm:text-sm truncate">{action.title}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{action.subtitle}</div>
                </div>
                {action.badge !== undefined && action.badge > 0 && (
                  <Badge variant="destructive" className="ml-auto text-[10px] sm:text-xs">
                    {action.badge}
                  </Badge>
                )}
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
