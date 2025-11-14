import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { PublicLayout } from "./components/PublicLayout";
import { AdminLayout } from "./components/AdminLayout";
import LandingPage from "./pages/LandingPage";
import AgendarAula from "./pages/AgendarAula";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Aulas from "./pages/Aulas";
import Aluguel from "./pages/Aluguel";
import Ecommerce from "./pages/Ecommerce";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { localStorageService } from "./lib/localStorage";

const queryClient = new QueryClient();

const App = () => {
  // Inicializar dados mock na primeira carga
  useEffect(() => {
    localStorageService.inicializarMock();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* ROTAS PÚBLICAS */}
            <Route element={<PublicLayout><Outlet /></PublicLayout>}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/agendar-aula" element={<AgendarAula />} />
            </Route>

            {/* LOGIN ADMIN */}
            <Route path="/admin/login" element={<Login />} />

            {/* ROTAS ADMIN (Protegidas) */}
            <Route path="/admin" element={<AdminLayout><Outlet /></AdminLayout>}>
              <Route index element={<Dashboard />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="aulas" element={<Aulas />} />
              <Route path="aluguel" element={<Aluguel />} />
              <Route path="ecommerce" element={<Ecommerce />} />
              <Route path="relatorios" element={<Relatorios />} />
              <Route path="configuracoes" element={<Configuracoes />} />
            </Route>

            {/* CATCH-ALL */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
