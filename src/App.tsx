import { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout";
import { LayoutSkeleton } from "./components/LayoutSkeleton";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { localStorageService } from "./lib/localStorage";

// Code Splitting - Lazy load all pages except Login (LCP optimization)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Aulas = lazy(() => import("./pages/Aulas"));
const Aluguel = lazy(() => import("./pages/Aluguel"));
const Ecommerce = lazy(() => import("./pages/Ecommerce"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Vendas = lazy(() => import("./pages/admin/Vendas"));
const Estoque = lazy(() => import("./pages/admin/Estoque"));
const Financeiro = lazy(() => import("./pages/admin/Financeiro"));
const ConfiguracoesFinanceiras = lazy(() => import("./pages/admin/ConfiguracoesFinanceiras"));
const RelatorioDRE = lazy(() => import("./pages/admin/RelatorioDRE"));
const ContasAPagar = lazy(() => import("./pages/admin/ContasAPagar"));
const Assistente = lazy(() => import("./pages/Assistente"));

const queryClient = new QueryClient();

const App = () => {
  // Inicializar dados mock na primeira carga
  useEffect(() => {
    localStorageService.inicializarMockCompleto();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster />
        <Sonner />
        <Routes>
          {/* LOGIN - Loaded immediately for LCP */}
          <Route path="/login" element={<Login />} />

          {/* ROTAS CRM (Protegidas) com Suspense */}
          <Route
            element={
              <AdminLayout>
                <Suspense fallback={<LayoutSkeleton />}>
                  <Outlet />
                </Suspense>
              </AdminLayout>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/aulas" element={<Aulas />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/aluguel" element={<Aluguel />} />
            <Route path="/ecommerce" element={<Ecommerce />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/financeiro/configuracoes" element={<ConfiguracoesFinanceiras />} />
            <Route path="/financeiro/dre" element={<RelatorioDRE />} />
            <Route path="/financeiro/contas" element={<ContasAPagar />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/assistente" element={<Assistente />} />
          </Route>

          {/* Redirect old /admin routes */}
          <Route path="/admin" element={<Navigate to="/" replace />} />
          <Route path="/admin/*" element={<Navigate to="/" replace />} />

          {/* CATCH-ALL */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
