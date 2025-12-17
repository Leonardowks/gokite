import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Waves, Wind } from "lucide-react";
import gokiteLogo from "@/assets/gokite-logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const success = login(email, password);
      
      if (success) {
        toast({ title: "Login realizado com sucesso!" });
        navigate("/");
      } else {
        toast({
          title: "Credenciais inválidas",
          description: "Email ou senha incorretos.",
          variant: "destructive",
        });
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Ocean Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(200,50%,8%)] via-[hsl(195,85%,20%)] to-[hsl(25,95%,35%)]" />
      
      {/* Animated Wave Pattern */}
      <div className="absolute inset-0 opacity-30">
        <svg className="absolute bottom-0 w-full h-64" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path 
            fill="hsl(195, 85%, 45%)" 
            fillOpacity="0.3"
            d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            className="animate-wave"
          />
        </svg>
        <svg className="absolute bottom-0 w-full h-48" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path 
            fill="hsl(185, 100%, 50%)" 
            fillOpacity="0.2"
            d="M0,256L48,240C96,224,192,192,288,181.3C384,171,480,181,576,197.3C672,213,768,235,864,234.7C960,235,1056,213,1152,197.3C1248,181,1344,171,1392,165.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            className="animate-wave"
            style={{ animationDelay: '-1s' }}
          />
        </svg>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 text-cyan/20 animate-float-gentle">
        <Wind className="h-16 w-16" />
      </div>
      <div className="absolute top-40 right-20 text-accent/20 animate-float-gentle" style={{ animationDelay: '-2s' }}>
        <Waves className="h-12 w-12" />
      </div>
      <div className="absolute bottom-40 left-20 text-primary/20 animate-float-gentle" style={{ animationDelay: '-4s' }}>
        <Waves className="h-10 w-10" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">
        <div className="glass-ocean rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/10">
          {/* Logo Section */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan/30 blur-xl rounded-full animate-pulse-soft" />
                <img 
                  src={gokiteLogo} 
                  alt="GoKite" 
                  loading="eager"
                  fetchPriority="high"
                  className="relative h-16 w-auto drop-shadow-2xl"
                />
              </div>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
              GoKite <span className="text-gradient-aurora">CRM</span>
            </h1>
            <p className="text-white/60 text-sm sm:text-base">
              Gestão completa para sua escola de kitesurf
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@gokite.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="min-h-[48px] bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-cyan focus:ring-cyan/30 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80 font-medium">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="min-h-[48px] bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-cyan focus:ring-cyan/30 rounded-xl"
              />
            </div>
            <Button 
              type="submit" 
              variant="ocean"
              className="w-full min-h-[52px] gap-2 text-base font-semibold rounded-xl mt-6" 
              disabled={loading}
            >
              <LogIn className="h-5 w-5" />
              {loading ? "Entrando..." : "Entrar no Sistema"}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-cyan animate-pulse-soft" />
              <p className="text-xs text-white/50 uppercase tracking-wider font-medium">Credenciais Demo</p>
            </div>
            <p className="text-sm text-white/70 font-mono">
              admin@gokite.com / admin123
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-xs mt-6">
          © 2024 GoKite · Kitesurf School Management
        </p>
      </div>
    </div>
  );
}
