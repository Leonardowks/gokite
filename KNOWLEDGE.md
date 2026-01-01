# GoKite CRM - Base de Conhecimento

> Sistema de gestão operacional completo para escola de kitesurf, consolidando todas as operações em uma única plataforma.

---

## 📋 Visão Geral do Projeto

### Propósito
O GoKite CRM foi desenvolvido para resolver três problemas críticos do negócio:

1. **Agendamento Automático** - Eliminar 1000+ mensagens diárias no WhatsApp permitindo que clientes agendem aulas online
2. **Filtro de Vendas** - Identificar e priorizar leads através de pontuação automática de urgência
3. **Gestão de Estoque** - Rastreamento de equipamentos em tempo real com alertas de devolução

### Arquitetura
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Lovable Cloud (Supabase) - autenticação, banco de dados, edge functions
- **Armazenamento**: Supabase (PostgreSQL) + localStorage para dados de sessão
- **Estilo**: Design system premium com shadcn/ui customizado

### Estrutura de URLs
```
/login              → Autenticação
/                   → Dashboard (redireciona para login se não autenticado)
/clientes           → Gestão de clientes
/aulas              → Agendamento e confirmação de aulas
/vendas             → ERP comercial unificado
/estoque            → Inventário de equipamentos
/aluguel            → Gestão de aluguéis
/ecommerce          → Integração Nuvemshop
/financeiro         → Dashboard financeiro
/financeiro/dre     → Relatório DRE mensal
/financeiro/contas  → Contas a pagar
/financeiro/configuracoes → Taxas e configurações
/relatorios         → Relatórios gerais
/configuracoes      → Configurações do sistema
/assistente         → Assistente de voz Jarvis
/agendar-aula       → Página pública de agendamento
```

---

## 🎨 Design System

### Identidade Visual
- **Cor Primária**: Teal (`--primary`)
- **Cor de Destaque**: Premium Gold (`--accent`)
- **Fontes**: Inter (body), Plus Jakarta Sans (display)
- **Bordas**: `rounded-xl` para cards, `rounded-lg` para botões
- **Sombras**: Escala de `shadow-sm` a `shadow-xl`

### Componentes Premium
- `PremiumCard` - Cards com gradientes, brilho e estados featured
- `PremiumBadge` - Badges com variantes (success, warning, urgent, info, neutral) e efeito pulse
- `AnimatedNumber` - Números animados com formatação (currency, percentage)
- `SkeletonPremium` - Estados de loading com shimmer

### Animações
- `fadeInUp` - Entrada suave de baixo para cima
- `slideInRight` - Entrada lateral
- `shimmer` - Efeito de brilho
- `pulse-soft` - Pulsação suave para alertas
- `float` - Flutuação para ícones de destaque

### Tokens de Cor (usar sempre variáveis semânticas)
```css
--background, --foreground
--primary, --primary-foreground
--secondary, --secondary-foreground
--muted, --muted-foreground
--accent, --accent-foreground
--destructive, --success, --warning
--chart-1 até --chart-5
```

---

## 🗄️ Esquema do Banco de Dados

### Tabelas Principais

#### `clientes`
```sql
id UUID PRIMARY KEY
nome TEXT NOT NULL
email TEXT
telefone TEXT
tipo TEXT -- 'lead' | 'cliente'
origem TEXT -- 'website' | 'whatsapp' | 'indicacao'
nivel_experiencia TEXT
data_cadastro TIMESTAMP
ultima_interacao TIMESTAMP
observacoes TEXT
```

#### `aulas`
```sql
id UUID PRIMARY KEY
cliente_id UUID REFERENCES clientes
instrutor TEXT
tipo_aula TEXT -- 'iniciante' | 'intermediario' | 'avancado'
data DATE
horario TIME
duracao INTEGER -- em minutos
valor DECIMAL
status TEXT -- 'pendente' | 'confirmada' | 'concluida' | 'cancelada'
localizacao TEXT
created_at TIMESTAMP
```

#### `equipamentos`
```sql
id UUID PRIMARY KEY
nome TEXT NOT NULL
tipo TEXT -- 'kite' | 'prancha' | 'trapezio' | 'wetsuit'
tamanho TEXT
estado TEXT -- 'disponivel' | 'alugado' | 'manutencao'
localizacao TEXT -- 'Floripa' | 'Taíba'
valor_diaria DECIMAL
data_aquisicao DATE
ultima_manutencao DATE
```

#### `aluguel`
```sql
id UUID PRIMARY KEY
cliente_id UUID REFERENCES clientes
equipamento_id UUID REFERENCES equipamentos
data_inicio DATE
data_fim DATE
valor_total DECIMAL
status TEXT -- 'ativo' | 'concluido' | 'atrasado'
created_at TIMESTAMP
```

#### `transacoes`
```sql
id UUID PRIMARY KEY
tipo TEXT -- 'receita' | 'despesa'
origem TEXT -- 'aula' | 'aluguel' | 'venda_produto' | 'trade_in' | 'pacote' | 'ecommerce'
descricao TEXT
valor_bruto DECIMAL
custo_produto DECIMAL
taxa_cartao_estimada DECIMAL
imposto_provisionado DECIMAL
lucro_liquido DECIMAL -- calculado automaticamente
centro_de_custo TEXT -- 'Escola' | 'Loja' | 'Administrativo' | 'Pousada'
forma_pagamento TEXT -- 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'trade_in'
parcelas INTEGER
equipamento_id UUID
cliente_id UUID
referencia_id UUID
data_transacao DATE
created_at TIMESTAMP
```

#### `contas_a_pagar`
```sql
id UUID PRIMARY KEY
descricao TEXT NOT NULL
valor DECIMAL NOT NULL
data_vencimento DATE NOT NULL
categoria TEXT -- 'fornecedor' | 'aluguel' | 'salario' | 'imposto' | 'outros'
status TEXT -- 'pendente' | 'pago' | 'vencido'
data_pagamento DATE
observacoes TEXT
created_at TIMESTAMP
```

#### `config_financeiro`
```sql
id UUID PRIMARY KEY
taxa_cartao_credito DECIMAL DEFAULT 3.5
taxa_cartao_debito DECIMAL DEFAULT 2.0
taxa_pix DECIMAL DEFAULT 0.0
taxa_imposto_padrao DECIMAL DEFAULT 6.0
meta_mensal DECIMAL DEFAULT 15000
```

#### `trade_ins`
```sql
id UUID PRIMARY KEY
cliente_id UUID
equipamento_recebido TEXT
valor_entrada DECIMAL
valor_saida DECIMAL
lucro_trade_in DECIMAL
status TEXT -- 'recebido' | 'vendido'
created_at TIMESTAMP
```

#### `despesas`
```sql
id UUID PRIMARY KEY
descricao TEXT
valor DECIMAL
categoria TEXT
data DATE
observacoes TEXT
created_at TIMESTAMP
```

#### `pacotes`
```sql
id UUID PRIMARY KEY
nome TEXT
tipo TEXT
quantidade_aulas INTEGER
valor DECIMAL
validade_dias INTEGER
created_at TIMESTAMP
```

#### `pedidos_ecommerce`
```sql
id UUID PRIMARY KEY
pedido_externo_id TEXT
plataforma TEXT -- 'nuvemshop'
cliente_nome TEXT
cliente_email TEXT
valor_total DECIMAL
status TEXT
itens JSONB
created_at TIMESTAMP
synced_at TIMESTAMP
```

---

## 📊 Módulo Financeiro

### KPIs Principais
- **Receita Mês** - Total de receitas do período
- **Margem Bruta** - (Receita - Custos) / Receita × 100
- **Margem Líquida** - Lucro Líquido / Receita × 100
- **Lucro Líquido** - Receita - Custos - Taxas - Impostos
- **Ticket Médio** - Receita / Quantidade de transações
- **Contas a Pagar** - Total pendente com alertas de vencimento

### Cálculos Automáticos
Ao registrar uma transação de receita:
```typescript
taxa_cartao_estimada = valor_bruto × taxa_cartao (baseado na forma de pagamento)
imposto_provisionado = valor_bruto × taxa_imposto_padrao
lucro_liquido = valor_bruto - custo_produto - taxa_cartao_estimada - imposto_provisionado
```

### Relatório DRE
- Receita bruta por categoria
- (-) Custos dos produtos vendidos
- (=) Lucro bruto
- (-) Taxas de cartão
- (-) Impostos provisionados
- (=) Lucro operacional
- Breakdown por centro de custo e forma de pagamento
- Comparativo mensal

### Rentabilidade por Categoria
Análise de margem por origem de receita:
- Aulas (tipicamente alta margem: 70-85%)
- Aluguel (margem média: 50-70%)
- Loja/Produtos (margem variável: 20-40%)
- E-commerce (similar à loja)
- Trade-in (margem variável)

---

## 🎤 Assistente de Voz (Jarvis)

### Ativação
- Botão flutuante de microfone
- Atalho: `Ctrl+J`
- Página dedicada: `/assistente`

### Tecnologias
- ElevenLabs para síntese de voz
- Lovable AI para processamento de linguagem natural
- Tool calling para execução de ações

### Comandos Suportados
```
"Gastei 200 de gasolina pro bote"
→ registrar_despesa(valor: 200, categoria: "combustivel", descricao: "gasolina bote")

"Cadastra cliente João, telefone 11999999999"
→ criar_cliente(nome: "João", telefone: "11999999999")

"Agenda aula com Maria amanhã às 10"
→ agendar_aula(cliente: "Maria", data: "amanhã", horario: "10:00")

"Quanto faturei hoje?"
→ consultar_faturamento(periodo: "hoje")

"Registra venda de 1500 reais, custo 800"
→ registrar_venda(valor: 1500, custo: 800)

"Quais contas vencem essa semana?"
→ consultar_contas_a_pagar(periodo: "semana")
```

### Edge Functions
- `voice-assistant` - Processamento principal com tool calling
- `elevenlabs-stt` - Speech-to-text
- `elevenlabs-tts` - Text-to-speech
- `openai-stt` / `openai-tts` - Alternativas OpenAI

---

## 📅 Workflow de Aulas

### Fluxo Público (Agendamento)
1. Cliente acessa `/agendar-aula`
2. Preenche formulário (tipo, local, data, hora, dados pessoais)
3. Validação com Zod schema
4. Salva no Supabase com status `pendente`
5. Email/WhatsApp automático para cliente
6. Notificação para admin

### Fluxo Admin (Confirmação)
1. Aulas pendentes aparecem com badge 🟡
2. Operador clica em "Confirmar"
3. WhatsApp automático enviado ao aluno
4. Status atualiza para `confirmada` 🟢
5. Transação financeira criada automaticamente

### Separação Visual
- **Precisam de Atenção Agora** - Atrasadas/pendentes
- **Confirmadas Próximas** - Confirmadas para os próximos dias
- **Agendadas Futuras** - Agendadas para o futuro

---

## 📦 Gestão de Equipamentos e Aluguel

### Estados de Equipamento
- `disponivel` 🟢 - Pronto para aluguel
- `alugado` 🟡 - Em uso por cliente
- `manutencao` 🔴 - Fora de operação

### Alertas de Devolução
- 🔴 Vermelho: Devolução vencida ou hoje
- 🟠 Laranja: Devolução esta semana
- Widget de ocupação por localização (Floripa/Taíba)

### Ações Rápidas
- "Cobrar Aluguel" → Dispara WhatsApp de cobrança
- Sugestão de transferência entre locais baseada em demanda

---

## 🛒 Integração E-commerce (Nuvemshop)

### Configuração
Página `/configuracoes` → Aba "Integrações"
- User ID da loja
- Access Token
- Webhook URL

### Sincronização
- **Manual**: Botão "Sincronizar Agora"
- **Automática**: Webhooks para novos pedidos

### Edge Functions
- `nuvemshop-sync` - Sincronização de produtos e pedidos
- `nuvemshop-webhook` - Recebimento de webhooks

---

## 📸 OCR de Notas Fiscais

### Fluxo
1. Upload ou captura de imagem da nota
2. Edge function `extract-receipt` processa com Vision AI
3. Extração automática: valor, descrição, categoria, data, fornecedor
4. Usuário confirma/edita dados
5. Despesa registrada no sistema

### Componente
`ReceiptScanner.tsx` - Interface de captura e confirmação

---

## 🔔 Sistema de Notificações

### NotificationCenter
Ícone de sino no header com dropdown de alertas:
- Aulas pendentes de confirmação
- Aluguéis com devolução hoje/amanhã
- Leads sem contato há 2+ dias
- Contas vencidas ou vencendo

### Indicadores Visuais
- 🔴 Crítico - Ação imediata necessária
- 🟠 Importante - Atenção em breve
- 🟡 Atenção - Monitorar

---

## 🚀 Funcionalidades Futuras (Planejadas)

### Módulo Financeiro
- [ ] Gráfico de evolução mensal de margens (6 meses)
- [ ] Alertas automáticos de margem baixa (<15% líquida, <40% bruta)
- [ ] Análise de margem por instrutor
- [ ] Projeção de fluxo de caixa
- [ ] Integração bancária via Open Finance
- [ ] Conciliação automática de cartões

### Módulo de Aulas
- [ ] Drag-and-drop para reagendamento
- [ ] Calendário visual de instrutores
- [ ] Pacotes de aulas com controle de saldo
- [ ] Rating de alunos pós-aula
- [ ] Fotos/vídeos por aula

### Módulo de Vendas
- [ ] Pipeline de leads visual (Kanban)
- [ ] Automação de follow-up
- [ ] Score de leads com ML
- [ ] Integração WhatsApp Business API

### Módulo de Equipamentos
- [ ] QR Code para rastreamento
- [ ] Histórico de manutenção detalhado
- [ ] Depreciação automática
- [ ] Alertas de reposição de estoque

### Mobile & PWA
- [ ] App nativo (React Native)
- [ ] Notificações push
- [ ] Modo offline completo
- [ ] Geolocalização de equipamentos

### Relatórios & Analytics
- [ ] Dashboard de BI customizável
- [ ] Exportação para Excel/PDF
- [ ] Métricas de NPS
- [ ] Análise de sazonalidade

### Integrações
- [ ] Google Calendar sync
- [ ] Mailchimp/Brevo para email marketing
- [ ] Stripe/PagSeguro para pagamentos
- [ ] Contabilidade (Omie, ContaAzul)

---

## 🛠️ Padrões Técnicos

### Hooks Customizados
```typescript
// Query hooks (leitura)
useTransacoes(filters?)
useTransacoesSummary(periodo)
useContasAPagar(filters?)
useContasAPagarSummary()
useSupabaseClientes()
useSupabaseEquipamentos()
useSupabaseAulas()
useSupabaseAlugueis()

// Mutation hooks (escrita)
useCreateTransacao()
useUpdateTransacaoCusto()
useDeleteTransacao()
```

### Estrutura de Componentes
```
src/
├── components/
│   ├── ui/          # shadcn/ui customizado
│   ├── clientes/    # Componentes específicos
│   └── dre/         # Componentes do DRE
├── hooks/           # React Query hooks
├── pages/
│   └── admin/       # Páginas administrativas
├── lib/             # Utilitários
└── integrations/    # Supabase client
```

### Convenções
- Componentes em PascalCase
- Hooks com prefixo `use`
- Arquivos de página em PascalCase
- Utilitários em camelCase
- CSS classes via Tailwind + tokens do design system
- Nunca usar cores diretas (text-white, bg-black) - sempre tokens

---

## 📝 Notas de Implementação

### Criação de Transações Automáticas
Sempre que uma aula é confirmada, aluguel finalizado ou trade-in vendido, uma transação é criada automaticamente no sistema financeiro com todos os cálculos de margem.

### RLS (Row Level Security)
Todas as tabelas devem ter RLS habilitado com políticas apropriadas para o usuário autenticado.

### Validações
- Formulários usam Zod schemas
- Toast notifications para feedback
- Estados de loading com Skeleton components

### Performance
- React Query para cache e invalidação
- Seleção específica de campos nas queries (não usar `select('*')` em listagens)
- Índices no banco para campos de busca frequente

---

*Última atualização: Janeiro 2026*
