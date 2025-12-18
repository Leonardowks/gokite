import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Settings, 
  LogOut, 
  Keyboard, 
  HelpCircle,
  CheckCircle,
  ChevronDown
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 px-2 py-1.5 h-auto hover:bg-muted/50 rounded-xl"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-cyan/20 flex items-center justify-center border border-primary/20">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-medium text-foreground">Admin</p>
            <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">
              {user?.email}
            </p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden lg:block" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-56 rounded-xl p-1"
        sideOffset={8}
      >
        <DropdownMenuLabel className="px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-cyan/20 flex items-center justify-center border border-primary/20">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Admin</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => navigate("/configuracoes")}
          className="px-3 py-2.5 rounded-lg cursor-pointer"
        >
          <Settings className="mr-3 h-4 w-4 text-muted-foreground" />
          Configurações
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className="px-3 py-2.5 rounded-lg cursor-pointer"
          onClick={() => {
            setOpen(false);
            // Trigger command palette
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
          }}
        >
          <Keyboard className="mr-3 h-4 w-4 text-muted-foreground" />
          Atalhos
          <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="px-3 py-2.5 rounded-lg cursor-pointer">
          <HelpCircle className="mr-3 h-4 w-4 text-muted-foreground" />
          Ajuda
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3 w-3 text-success" />
            <span>Sistema operacional</span>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Versão 1.0.0
          </p>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          className="px-3 py-2.5 rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sair do sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
