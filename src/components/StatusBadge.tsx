import { Badge } from "@/components/ui/badge";

type StatusType = 'pendente' | 'confirmada' | 'cancelada' | 'agendada';

interface StatusBadgeProps {
  status: StatusType | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants: Record<string, { icon: string; className: string }> = {
    pendente: { icon: '🟡', className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20' },
    agendada: { icon: '🔵', className: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' },
    confirmada: { icon: '🟢', className: 'bg-success/10 text-success border-success/20 hover:bg-success/20' },
    cancelada: { icon: '🔴', className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20' },
  };

  const variant = variants[status] || variants.pendente;

  return (
    <Badge variant="outline" className={variant.className}>
      <span className="mr-1">{variant.icon}</span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
