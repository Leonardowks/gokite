import { useEffect, useState } from "react";
import { Search, Mail, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { localStorageService, type ClienteAgregado } from "@/lib/localStorage";
import { formatarWhatsApp, formatarDataBR } from "@/lib/utils";

export default function Clientes() {
  const [clientes, setClientes] = useState<ClienteAgregado[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => { loadClientes(); }, []);

  const loadClientes = () => {
    try {
      setClientes(localStorageService.listarClientes());
    } catch (error) {
      console.error("Erro:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os clientes.", variant: "destructive" });
    }
  };

  const filteredClientes = clientes.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.whatsapp.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Clientes</h1>
        <p className="text-muted-foreground">Base de clientes que agendaram aulas</p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, email ou telefone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          {filteredClientes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{searchTerm ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Total de Aulas</TableHead>
                  <TableHead>Última Aula</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.map((cliente) => (
                  <TableRow key={cliente.email} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{cliente.nome}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {cliente.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {formatarWhatsApp(cliente.whatsapp)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{cliente.total_aulas} aulas</Badge>
                    </TableCell>
                    <TableCell>{formatarDataBR(cliente.ultima_aula)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
