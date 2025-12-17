import { ReactNode, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Phone, Instagram, Facebook, Mail, Shield, Menu, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface PublicLayoutProps {
  children: ReactNode;
}

const WHATSAPP_NUMBER = "5548984091618";

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
              <div className="flex flex-col">
                <span className="font-bold text-xl text-foreground leading-tight">GoKite</span>
                <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">20+ anos de experiência</span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
                Início
              </Link>
              <Link to="/agendar-aula" className="text-sm font-medium hover:text-primary transition-colors">
                Agendar Aula
              </Link>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')}
                className="gap-2"
              >
                <Phone className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="sm"
                className="gap-2"
              >
                <Link to="/admin/login">
                  <Shield className="h-4 w-4" />
                  Área Admin
                </Link>
              </Button>
              <Button asChild>
                <Link to="/agendar-aula">Agendar Agora</Link>
              </Button>
            </nav>

            {/* Mobile Menu */}
            <div className="flex items-center gap-2 md:hidden">
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')}
              >
                <Phone className="h-4 w-4" />
              </Button>
              
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <nav className="flex flex-col gap-4 mt-8">
                    <Link 
                      to="/" 
                      className="text-lg font-medium hover:text-primary transition-colors"
                    >
                      Início
                    </Link>
                    <Link 
                      to="/agendar-aula" 
                      className="text-lg font-medium hover:text-primary transition-colors"
                    >
                      Agendar Aula
                    </Link>
                    <Button 
                      variant="outline"
                      className="w-full gap-2 justify-start"
                      onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')}
                    >
                      <Phone className="h-4 w-4" />
                      WhatsApp
                    </Button>
                    <Separator />
                    <Button
                      asChild
                      variant="ghost"
                      className="w-full gap-2 justify-start"
                    >
                      <Link to="/admin/login">
                        <Shield className="h-4 w-4" />
                        Área Admin
                      </Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link to="/agendar-aula">Agendar Aula</Link>
                    </Button>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
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
                <span className="font-bold text-xl text-foreground">GoKite</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Award className="h-4 w-4 text-primary" />
                <span>20+ anos de experiência</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Escola de kitesurf em Florianópolis e Taíba. Estrutura completa com barco de apoio, equipamentos Duotone e instrutores certificados IKO.
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
                    href="https://gokite.com.br" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Loja Online
                  </a>
                </li>
                <li>
                  <a 
                    href={`https://wa.me/${WHATSAPP_NUMBER}`}
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
              
              <Button
                variant="default"
                size="lg"
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')}
              >
                <Phone className="h-5 w-5" />
                Fale no WhatsApp
              </Button>
              
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:+${WHATSAPP_NUMBER}`} className="hover:text-foreground transition-colors">
                    (48) 98409-1618
                  </a>
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <a href="mailto:contato@gokite.com.br" className="hover:text-foreground transition-colors">
                    contato@gokite.com.br
                  </a>
                </li>
              </ul>
            </div>

            {/* Redes Sociais */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Redes Sociais</h3>
              <div className="flex gap-3">
                <a 
                  href="https://instagram.com/gokitebrasil" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a 
                  href="https://facebook.com/gokitebrasil" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              </div>
              
              <div className="pt-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Localizações</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>📍 Lagoa da Conceição - Florianópolis/SC</li>
                  <li>📍 Praia da Taíba - São Gonçalo do Amarante/CE</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 pt-8 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} GoKite - Escola de Kitesurf. Todos os direitos reservados.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Equipamentos Duotone | Instrutores IKO | Barco de Apoio
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
