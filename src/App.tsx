import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Aulas from "./pages/Aulas";
import Aluguel from "./pages/Aluguel";
import Ecommerce from "./pages/Ecommerce";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Vendas from "./pages/admin/Vendas";
import Estoque from "./pages/admin/Estoque";
import Financeiro from "./pages/admin/Financeiro";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { localStorageService } from "./lib/localStorage";

const queryClient = new QueryClient();

const App = () => {
  // Inicializar dados mock na primeira carga
  useEffect(() => {
    localStorageService.inicializarMockCompleto();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* LOGIN */}
            <Route path="/login" element={<Login />} />

            {/* ROTAS CRM (Protegidas) */}
            <Route element={<AdminLayout><Outlet /></AdminLayout>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/aulas" element={<Aulas />} />
              <Route path="/vendas" element={<Vendas />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/aluguel" element={<Aluguel />} />
              <Route path="/ecommerce" element={<Ecommerce />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>

            {/* Redirect old /admin routes */}
            <Route path="/admin" element={<Navigate to="/" replace />} />
            <Route path="/admin/*" element={<Navigate to="/" replace />} />

            {/* CATCH-ALL */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
