import { ReactNode, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Phone, Instagram, Facebook, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled 
          ? "bg-background shadow-md" 
          : "bg-background/90 backdrop-blur-sm"
      )}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-primary-foreground font-bold text-xl">G</span>
              </div>
              <span className="font-bold text-xl text-foreground">Gokite</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-foreground hover:text-primary transition-colors font-medium">
                Início
              </Link>
              <Link to="/agendar-aula" className="text-foreground hover:text-primary transition-colors font-medium">
                Agendar Aula
              </Link>
              <a 
                href="https://wa.me/5548999887766" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                WhatsApp
              </a>
              <Link to="/admin" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                Área Admin
              </Link>
            </nav>

            {/* CTA Button */}
            <Button asChild className="hidden md:flex">
              <Link to="/agendar-aula">
                Agendar Agora
              </Link>
            </Button>

            {/* Mobile Menu Button */}
            <Button asChild variant="outline" size="sm" className="md:hidden">
              <Link to="/agendar-aula">
                Agendar
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border mt-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Logo e Descrição */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl">G</span>
                </div>
                <span className="font-bold text-xl text-foreground">Gokite</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Escola de kitesurf em Florianópolis e Taíba. Aulas com instrutores certificados e equipamentos de qualidade.
              </p>
            </div>

            {/* Links */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Links Rápidos</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Início
                  </Link>
                </li>
                <li>
                  <Link to="/agendar-aula" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Agendar Aula
                  </Link>
                </li>
                <li>
                  <a 
                    href="https://wa.me/5548999887766" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    WhatsApp
                  </a>
                </li>
              </ul>
            </div>

            {/* Contato */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Contato</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>(48) 99988-7766</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>contato@gokite.com</span>
                </li>
              </ul>
            </div>

            {/* Redes Sociais */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Redes Sociais</h3>
              <div className="flex gap-3">
                <a 
                  href="https://instagram.com/gokite" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a 
                  href="https://facebook.com/gokite" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 pt-8 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Gokite. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
