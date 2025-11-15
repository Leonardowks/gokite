import { useNavigate } from "react-router-dom";
import { Calendar, Users, Award, Shield, Clock, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
export default function LandingPage() {
  const navigate = useNavigate();
  const pacotes = [{
    nome: "Aula Avulsa",
    preco: 400,
    descricao: "1 hora de aula",
    beneficios: ["Instrutor certificado", "Equipamento completo", "Seguro incluído"],
    tipo: "avulsa",
    destaque: false
  }, {
    nome: "Pacote 5 Aulas",
    preco: 1800,
    economia: 200,
    descricao: "5 horas de aula",
    beneficios: ["Tudo do pacote avulso", "Evolução garantida", "Economia de R$ 200"],
    tipo: "pacote5",
    destaque: true,
    badge: "Mais Popular"
  }, {
    nome: "Pacote 10 Aulas",
    preco: 3200,
    economia: 800,
    descricao: "10 horas de aula",
    beneficios: ["Tudo do pacote avulso", "Máxima evolução", "Economia de R$ 800"],
    tipo: "pacote10",
    destaque: false,
    badge: "Melhor Custo"
  }];
  return <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 text-center bg-cover bg-center" style={{
      backgroundImage: "url('https://images.unsplash.com/photo-1502933691298-84fc14542831?auto=format&fit=crop&w=1920&q=80')"
    }}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        
        <div className="relative z-10 max-w-4xl space-y-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight animate-scale-in">
            Aprenda Kitesurf com os Melhores
          </h1>
          
          <p className="text-xl sm:text-2xl md:text-3xl text-white/90 font-medium">
            Florianópolis e Taíba | Aulas a partir de: R$ 400
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button size="lg" onClick={() => navigate('/agendar-aula')} className="text-lg px-8 py-6 transition-transform hover:scale-105">
              Agendar Agora
            </Button>
            <Button size="lg" variant="outline" onClick={() => window.open('https://wa.me/5548999887766', '_blank')} className="text-lg px-8 py-6 bg-white/10 backdrop-blur-sm text-white border-white hover:bg-white hover:text-primary transition-all">
              Falar no WhatsApp
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-8 border-t border-white/20">
            <div className="text-white">
              <div className="text-3xl font-bold">500+</div>
              <div className="text-sm text-white/80">Alunos Formados</div>
            </div>
            <div className="text-white">
              <div className="text-3xl font-bold">10+</div>
              <div className="text-sm text-white/80">Anos de Experiência</div>
            </div>
            <div className="text-white">
              <div className="text-3xl font-bold">2</div>
              <div className="text-sm text-white/80">Localizações</div>
            </div>
            <div className="text-white">
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm text-white/80">Segurança</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pacotes Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Escolha Seu Pacote
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Oferecemos aulas personalizadas para todos os níveis, do iniciante ao avançado
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {pacotes.map(pacote => <Card key={pacote.tipo} className={`hover-lift relative ${pacote.destaque ? 'border-primary border-2 shadow-lg' : ''}`}>
              {pacote.badge && <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold shadow-md">
                    {pacote.badge}
                  </span>
                </div>}
              
              <CardHeader className="text-center pt-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">{pacote.nome}</CardTitle>
                <CardDescription>{pacote.descricao}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">
                    R$ {pacote.preco.toLocaleString('pt-BR')}
                  </div>
                  {pacote.economia && <p className="text-sm text-success mt-2">
                      Economize R$ {pacote.economia}
                    </p>}
                </div>

                <ul className="space-y-3">
                  {pacote.beneficios.map((beneficio, index) => <li key={index} className="flex items-start gap-2">
                      <Shield className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{beneficio}</span>
                    </li>)}
                </ul>
              </CardContent>

              <CardFooter>
                <Button className="w-full" variant={pacote.destaque ? "default" : "outline"} onClick={() => navigate('/agendar-aula')}>
                  Escolher Pacote
                </Button>
              </CardFooter>
            </Card>)}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Por Que Escolher a Gokite?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="hover-lift text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Instrutores Certificados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Equipe com certificação internacional e anos de experiência no ensino de kitesurf
                </p>
              </CardContent>
            </Card>

            <Card className="hover-lift text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Equipamentos Premium</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Kites, pranchas e equipamentos de segurança das melhores marcas do mercado
                </p>
              </CardContent>
            </Card>

            <Card className="hover-lift text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Melhores Spots</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Aulas em Florianópolis e Taíba, dois dos melhores destinos de kite do Brasil
                </p>
              </CardContent>
            </Card>

            <Card className="hover-lift text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Segurança em Primeiro Lugar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Seguros completos, rádio comunicadores e equipe de apoio sempre presente
                </p>
              </CardContent>
            </Card>

            <Card className="hover-lift text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Horários Flexíveis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Aulas nos melhores horários, de acordo com as condições de vento
                </p>
              </CardContent>
            </Card>

            <Card className="hover-lift text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Turmas Reduzidas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Máximo de 3 alunos por instrutor para garantir atenção individualizada
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Pronto para Voar?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Agende sua primeira aula agora e descubra a emoção de voar sobre as ondas
            </p>
            <Button size="lg" onClick={() => navigate('/agendar-aula')} className="text-lg px-8 py-6">
              Agendar Minha Aula
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Botão WhatsApp Flutuante - Mobile Only */}
      <a href="https://wa.me/5548999887766" target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-50 md:hidden">
        <Button size="lg" className="h-14 w-14 rounded-full shadow-2xl bg-green-600 hover:bg-green-700 animate-pulse hover:animate-none">
          <Phone className="h-6 w-6" />
        </Button>
      </a>
    </div>;
}