import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, User, Mail, Phone, Clock, MapPin, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { agendamentoSchema, type AgendamentoFormData } from "@/lib/validations";
import { localStorageService } from "@/lib/localStorage";
import { calcularPreco, traduzirTipoAula, traduzirLocalizacao, formatarWhatsApp } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function AgendarAula() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [agendamentoId, setAgendamentoId] = useState("");

  const form = useForm<AgendamentoFormData>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: {
      experiencia: 'nunca',
    },
  });

  const tiposAula = [
    { valor: 'iniciante', nome: 'Iniciante', preco: 400, descricao: 'Primeira vez no kitesurf' },
    { valor: 'intermediario', nome: 'Intermediário', preco: 500, descricao: 'Já praticou algumas vezes' },
    { valor: 'avancado', nome: 'Avançado', preco: 600, descricao: 'Aperfeiçoamento de manobras' },
    { valor: 'wing_foil', nome: 'Wing Foil', preco: 700, descricao: 'Modalidade com foil' },
  ];

  const horarios = ['08:00', '10:00', '14:00', '16:00'];

  const onSubmit = async (data: AgendamentoFormData) => {
    try {
      console.log('[GoKite-Agendamento] Nova aula:', data);

      const agendamento = localStorageService.salvarAgendamento({
        tipo_aula: data.tipo_aula,
        localizacao: data.localizacao,
        data: data.data.toISOString(),
        horario: data.horario,
        cliente_nome: data.nome,
        cliente_email: data.email,
        cliente_whatsapp: data.whatsapp,
        experiencia: data.experiencia,
        status: 'pendente',
        valor: calcularPreco(data.tipo_aula),
      });

      setAgendamentoId(agendamento.id);
      setShowSuccessDialog(true);

      toast({
        title: "✅ Aula Agendada!",
        description: `Pedido ${agendamento.id} criado com sucesso.`,
      });

      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('[GoKite-Agendamento] Erro:', error);
      toast({
        title: "Erro ao agendar",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  const watchedValues = form.watch();
  const precoTotal = watchedValues.tipo_aula ? calcularPreco(watchedValues.tipo_aula) : 0;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-6xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Agendar Aula de Kitesurf</h1>
        <p className="text-muted-foreground">Preencha os dados abaixo para agendar sua aula</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário */}
        <div className="lg:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Tipo de Aula */}
              <Card>
                <CardHeader>
                  <CardTitle>Tipo de Aula</CardTitle>
                  <CardDescription>Selecione o nível mais adequado para você</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="tipo_aula"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                          >
                            {tiposAula.map((tipo) => (
                              <FormItem key={tipo.valor}>
                                <FormControl>
                                  <RadioGroupItem value={tipo.valor} id={tipo.valor} className="peer sr-only" />
                                </FormControl>
                                <FormLabel
                                  htmlFor={tipo.valor}
                                  className="flex flex-col items-start gap-3 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="font-semibold">{tipo.nome}</span>
                                    <span className="text-lg font-bold text-primary">R$ {tipo.preco}</span>
                                  </div>
                                  <span className="text-sm text-muted-foreground">{tipo.descricao}</span>
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Localização, Data e Horário */}
              <Card>
                <CardHeader>
                  <CardTitle>Local, Data e Horário</CardTitle>
                  <CardDescription>Quando e onde você quer sua aula?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Localização */}
                  <FormField
                    control={form.control}
                    name="localizacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Localização</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-2 gap-4"
                          >
                            <FormItem>
                              <FormControl>
                                <RadioGroupItem value="florianopolis" id="florianopolis" className="peer sr-only" />
                              </FormControl>
                              <FormLabel
                                htmlFor="florianopolis"
                                className="flex items-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                              >
                                <MapPin className="h-5 w-5" />
                                <span>Florianópolis</span>
                              </FormLabel>
                            </FormItem>
                            <FormItem>
                              <FormControl>
                                <RadioGroupItem value="taiba" id="taiba" className="peer sr-only" />
                              </FormControl>
                              <FormLabel
                                htmlFor="taiba"
                                className="flex items-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                              >
                                <MapPin className="h-5 w-5" />
                                <span>Taíba</span>
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Data */}
                  <FormField
                    control={form.control}
                    name="data"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data da Aula</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: ptBR })
                                ) : (
                                  <span>Selecione uma data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Horário */}
                  <FormField
                    control={form.control}
                    name="horario"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horário</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-4 gap-3">
                            {horarios.map((horario) => (
                              <Button
                                key={horario}
                                type="button"
                                variant={field.value === horario ? "default" : "outline"}
                                onClick={() => field.onChange(horario)}
                                className="transition-transform hover:scale-105"
                              >
                                <Clock className="h-4 w-4 mr-1" />
                                {horario}
                              </Button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Dados Pessoais */}
              <Card>
                <CardHeader>
                  <CardTitle>Seus Dados</CardTitle>
                  <CardDescription>Precisamos destas informações para confirmar sua aula</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Seu nome completo" className="pl-10" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input type="email" placeholder="seu@email.com" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="whatsapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder="48999887766" 
                                className="pl-10" 
                                {...field}
                                maxLength={11}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>Apenas números com DDD</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="experiencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Já praticou kitesurf?</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <div className="relative">
                              <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                              <SelectTrigger className="pl-10">
                                <SelectValue placeholder="Selecione sua experiência" />
                              </SelectTrigger>
                            </div>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="nunca">Nunca pratiquei</SelectItem>
                            <SelectItem value="poucas_vezes">Poucas vezes</SelectItem>
                            <SelectItem value="experiente">Sou experiente</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>

        {/* Resumo do Agendamento - Sticky */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Resumo do Agendamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Tipo:</span>
                  <p className="font-medium">
                    {watchedValues.tipo_aula ? traduzirTipoAula(watchedValues.tipo_aula) : '-'}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <span className="text-sm text-muted-foreground">Local:</span>
                  <p className="font-medium">
                    {watchedValues.localizacao ? traduzirLocalizacao(watchedValues.localizacao) : '-'}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <span className="text-sm text-muted-foreground">Data:</span>
                  <p className="font-medium">
                    {watchedValues.data ? format(watchedValues.data, "PPP", { locale: ptBR }) : '-'}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <span className="text-sm text-muted-foreground">Horário:</span>
                  <p className="font-medium">
                    {watchedValues.horario || '-'}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <span className="text-sm text-muted-foreground">Valor Total:</span>
                  <p className="text-3xl font-bold text-primary">
                    R$ {precoTotal.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <Button
                className="w-full mt-6"
                size="lg"
                onClick={form.handleSubmit(onSubmit)}
                disabled={!form.formState.isValid}
              >
                Confirmar Agendamento
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Você receberá uma confirmação por WhatsApp e email
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de Sucesso */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">✅ Aula Agendada!</DialogTitle>
            <DialogDescription className="text-center space-y-4 pt-4">
              <p className="text-lg">
                Seu agendamento foi realizado com sucesso!
              </p>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm font-medium">Pedido: <span className="text-primary font-bold">{agendamentoId}</span></p>
              </div>
              <p className="text-sm">
                Em breve entraremos em contato pelo WhatsApp para confirmar sua aula.
              </p>
              <p className="text-xs text-muted-foreground">
                Você será redirecionado em instantes...
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
