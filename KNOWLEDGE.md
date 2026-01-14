# GoKite CRM - Base de Conhecimento

> Plataforma de gestão comercial inteligente para escolas de kitesurf, centralizando operações com automações financeiras e inteligência de negócios.

**Última atualização:** Janeiro 2026

---

## 📋 Propósito

O GoKite CRM é uma **plataforma de gestão comercial inteligente** que:

1. **Centraliza Operações** - Aulas, vendas, aluguel, trade-ins e e-commerce em um só lugar
2. **Automatiza o Financeiro** - Cálculo automático de taxas, impostos e margens reais
3. **Integra Canais** - WhatsApp, Nuvemshop e fornecedores trabalhando juntos
4. **Gera Inteligência** - Análise de leads, scoring automático e insights de vendas

### A Dinâmica Comercial
O sistema segue uma lógica central: **toda ação comercial** (aula, venda, aluguel, trade-in) **gera automaticamente uma transação financeira** com taxas e impostos calculados, atualizando em tempo real o DRE e as métricas de saúde do negócio.

---

## 💰 Dinâmica Comercial

### Como o Dinheiro Flui no Sistema

#### Venda de Aula
```
Cliente agenda (site/WhatsApp) → Admin confirma no sistema
                                        ↓
                              ╔═══════════════════════╗
                              ║    AUTOMÁTICO         ║
                              ╠═══════════════════════╣
                              ║ • Transação criada    ║
                              ║ • Lead → Aluno        ║
                              ║ • Taxas calculadas    ║
                              ║ • Impostos provisionados ║
                              ║ • WhatsApp confirmação ║
                              ╚═══════════════════════╝
                                        ↓
                              Lucro líquido no DRE
```

#### Venda de Produto (Loja ou E-commerce)
1. Venda registrada em `/vendas` (ou via webhook Nuvemshop)
2. Custo do produto informado
3. **AUTOMÁTICO:** Margem bruta calculada
4. **AUTOMÁTICO:** Taxa de cartão provisionada
5. **AUTOMÁTICO:** Imposto provisionado (Simples Nacional)
6. Lucro real visível no DRE

#### Trade-in (Equipamento Usado)
1. Cliente traz equipamento para troca
2. Admin registra valor do crédito oferecido
3. **AUTOMÁTICO:** Store Credit adicionado ao cadastro do cliente
4. Cliente usa crédito em próximas compras
5. **AUTOMÁTICO:** Desconto aplicado automaticamente
6. Ao vender o trade-in: lucro registrado

#### Aluguel de Equipamento
1. Aluguel registrado com cliente e equipamento
2. **AUTOMÁTICO:** Estado do equipamento → "alugado"
3. **AUTOMÁTICO:** Alertas de devolução gerados
4. Na devolução: transação de receita criada

---

## ⚡ Automações do Sistema

O sistema executa as seguintes ações **automaticamente**:

| Automação | Quando dispara | O que faz | Resultado |
|-----------|----------------|-----------|-----------|
| **Taxas de Cartão** | Ao registrar receita | Aplica % por forma de pagamento | Taxa descontada do lucro |
| **Impostos** | Ao registrar receita | Provisiona % do Simples Nacional | Valor separado no DRE |
| **Lead → Aluno** | Aula confirmada/venda | Atualiza status do cliente | CRM organizado |
| **Store Credit** | Trade-in registrado | Cria crédito na ficha do cliente | Desconto futuro |
| **WhatsApp** | Aula confirmada | Envia mensagem via Evolution API | Cliente notificado |
| **Sync E-commerce** | Pedido pago na Nuvemshop | Cria transação automática | Venda integrada |
| **Análise IA** | Nova conversa/foto | Classifica urgência e extrai dados | Insights automáticos |
| **Cálculo de Margem** | Ao salvar transação | Calcula lucro líquido real | DRE atualizado |

### Configuração das Automações
- **Taxas de cartão:** `/financeiro/configuracoes`
- **Impostos por categoria:** `/financeiro/configuracoes` → Regras Fiscais
- **WhatsApp:** `/configuracoes` → WhatsApp
- **Nuvemshop:** `/configuracoes` → Integrações

---

## 🔗 Integrações

### WhatsApp (Evolution API)
- **Função:** Hub de comunicação bidirecional
- **Capacidades:**
  - Sincronizar histórico de conversas
  - Enviar mensagens e confirmações
  - Publicar trade-ins no Status
  - Análise de leads com IA
- **Configuração:** `/configuracoes` → WhatsApp
- **Edge Functions:** `evolution-webhook`, `send-message`, `fetch-recent-chats`

### Nuvemshop
- **Função:** Integração com loja online
- **Capacidades:**
  - Sincronização automática de pedidos
  - Criação de transações via webhook
  - Identificação de origem (estoque loja vs fornecedor)
- **Configuração:** `/configuracoes` → Integrações
- **Edge Functions:** `nuvemshop-sync`, `nuvemshop-webhook`

### IA (Lovable AI / Gemini)
- **Função:** Inteligência artificial nativa
- **Capacidades:**
  - Analisar fotos de equipamentos (trade-in)
  - Classificar leads por temperatura
  - Extrair dados de notas fiscais (OCR)
  - Processar comandos de voz (Jarvis)
- **Configuração:** Automático (não requer API key)
- **Edge Functions:** `voice-assistant`, `analyze-equipment`, `extract-receipt`, `analyze-conversation`

### Duotone (Fornecedor Virtual)
- **Função:** Estoque híbrido físico + virtual
- **Capacidades:**
  - Importar catálogo de fornecedor via Google Sheets
  - Vender sob demanda (cross-docking)
  - Cálculo automático de margem 40%
  - Badge "Sob Encomenda" vs "Pronta Entrega"
- **Configuração:** `/estoque/duotone`
- **Edge Function:** `sync-supplier`

---

## ❓ Central de Ajuda

O sistema possui uma Central de Ajuda interativa acessível pelo botão "?" no header:

### Tours Guiados (react-joyride)
- Ativados automaticamente na primeira visita a cada página
- Guiam o usuário pelos elementos principais
- Progresso salvo no localStorage
- Podem ser resetados a qualquer momento

### Central de Ajuda Lógica (HelpCenterSheet)
Explica de forma interativa:
- **Dinâmica Comercial** - Fluxos de cada tipo de venda com diagramas
- **Automações** - O que o sistema faz sozinho
- **Integrações** - Conexões externas e configuração
- **Onde Encontrar** - Mapa navegável do sistema
- **FAQ** - Perguntas frequentes com busca

### Arquivos Relacionados
```
src/lib/tourConfig.ts       # Configuração de tours por rota
src/lib/helpContent.ts      # Conteúdo estruturado da Central
src/components/help/        # Componentes da Central de Ajuda
src/hooks/useTour.ts        # Hook de gerenciamento de tours
```

---

## 🗺️ Estrutura de URLs

```
/login                      → Autenticação
/                           → Dashboard (redireciona se não autenticado)
/clientes                   → Gestão de clientes e leads
/aulas                      → Agendamento e confirmação de aulas
/vendas                     → ERP comercial unificado
/estoque                    → Inventário de equipamentos
/estoque/trade-ins          → Gestão de trade-ins
/estoque/inventario         → Inventário e contagem
/estoque/duotone            → Sincronizador de fornecedor virtual
/aluguel                    → Gestão de aluguéis
/pedidos                    → Pedidos Nuvemshop
/conversas                  → Hub WhatsApp com análise IA
/inteligencia               → Painel de inteligência de leads
/financeiro                 → Dashboard financeiro
/financeiro/dre             → Relatório DRE mensal
/financeiro/contas          → Contas a pagar
/financeiro/impostos        → Provisão de impostos
/financeiro/configuracoes   → Taxas e regras fiscais
/relatorios                 → Relatórios gerais
/configuracoes              → Configurações do sistema
/assistente                 → Assistente de voz Jarvis
/agendar-aula               → Página pública de agendamento
/catalogo                   → Catálogo público de trade-ins
```

---

## 🎨 Design System

### Identidade Visual
- **Cor Primária:** Teal (`--primary`)
- **Cor de Destaque:** Premium Gold (`--accent`)
- **Fontes:** Inter (body), Plus Jakarta Sans (display)
- **Bordas:** `rounded-xl` para cards, `rounded-lg` para botões
- **Sombras:** Escala de `shadow-sm` a `shadow-xl`

### Componentes Premium
- `PremiumCard` - Cards com gradientes, brilho e estados featured
- `PremiumBadge` - Badges com variantes (success, warning, urgent, info) e efeito pulse
- `AnimatedNumber` - Números animados com formatação (currency, percentage)
- `SkeletonPremium` - Estados de loading com shimmer

### Tokens de Cor (usar SEMPRE variáveis semânticas)
```css
--background, --foreground
--primary, --primary-foreground
--secondary, --secondary-foreground
--muted, --muted-foreground
--accent, --accent-foreground
--destructive, --success, --warning
--chart-1 até --chart-5
```

**REGRA:** Nunca usar cores diretas (text-white, bg-black) - sempre tokens

---

## 🗄️ Banco de Dados

### Tabelas Principais

#### `clientes`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Primary key |
| nome | TEXT | Nome do cliente |
| email | TEXT | E-mail |
| telefone | TEXT | Telefone/WhatsApp |
| status | TEXT | 'lead', 'aluno', 'cliente' |
| store_credit | DECIMAL | Crédito de trade-in disponível |
| tags | TEXT[] | Tags de categorização |

#### `transacoes`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Primary key |
| tipo | TEXT | 'receita' ou 'despesa' |
| origem | TEXT | 'aula', 'aluguel', 'venda_produto', 'trade_in', 'ecommerce' |
| valor_bruto | DECIMAL | Valor da venda |
| custo_produto | DECIMAL | Custo (para cálculo de margem) |
| taxa_cartao_estimada | DECIMAL | **Calculado automaticamente** |
| imposto_provisionado | DECIMAL | **Calculado automaticamente** |
| lucro_liquido | DECIMAL | **Calculado automaticamente** |
| centro_de_custo | TEXT | 'Escola', 'Loja', 'Pousada' |
| forma_pagamento | TEXT | 'pix', 'cartao_credito', 'cartao_debito' |

#### `trade_ins`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Primary key |
| equipamento_recebido | TEXT | Descrição do equipamento |
| valor_entrada | DECIMAL | Crédito dado ao cliente |
| valor_saida | DECIMAL | Valor de venda (se vendido) |
| lucro_trade_in | DECIMAL | Lucro da operação |
| status | TEXT | 'recebido', 'a_venda', 'vendido' |
| fotos | JSONB | Array de URLs de fotos |

#### `tax_rules`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| category | TEXT | 'aulas', 'aluguel', 'produtos', 'pousada' |
| estimated_tax_rate | DECIMAL | % de imposto por categoria |
| card_fee_rate | DECIMAL | % de taxa de cartão |
| label | TEXT | Nome amigável |

### Tabelas de Inteligência
- `contatos_inteligencia` - Leads com scoring de IA
- `conversas_whatsapp` - Histórico de mensagens
- `insights_conversas` - Análises de IA por contato

---

## 📊 Módulo Financeiro

### KPIs Principais
- **Receita Bruta** - Total de receitas do período
- **Margem Bruta** - (Receita - Custos) / Receita × 100
- **Margem Líquida** - Lucro Líquido / Receita × 100
- **Lucro Líquido** - Receita - Custos - Taxas - Impostos
- **Ticket Médio** - Receita / Quantidade de transações

### Cálculo Automático (Trigger no Banco)
```sql
-- Ao inserir/atualizar transação:
taxa_cartao_estimada = valor_bruto × taxa_forma_pagamento
imposto_provisionado = valor_bruto × taxa_categoria
lucro_liquido = valor_bruto - custo_produto - taxa_cartao - imposto
```

### Relatório DRE
- Receita bruta por categoria
- (-) Custos dos produtos vendidos
- (=) Lucro bruto
- (-) Taxas de cartão
- (-) Impostos provisionados
- (=) Lucro operacional
- Breakdown por centro de custo, forma de pagamento, instrutor

---

## 🎤 Assistente de Voz (Jarvis)

### Ativação
- Botão flutuante de microfone
- Atalho: `Ctrl+J`
- Página dedicada: `/assistente`

### Comandos Suportados
```
"Gastei 200 de gasolina pro bote"
→ registrar_despesa(valor: 200, categoria: "combustivel")

"Cadastra cliente João, telefone 11999999999"
→ criar_cliente(nome: "João", telefone: "11999999999")

"Quanto faturei hoje?"
→ consultar_faturamento(periodo: "hoje")

"Registra venda de 1500 reais, custo 800"
→ registrar_venda(valor: 1500, custo: 800)
```

---

## 🛠️ Padrões Técnicos

### Arquitetura
- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend:** Lovable Cloud (Supabase)
- **Banco:** PostgreSQL com RLS
- **Edge Functions:** Deno (serverless)
- **UI:** shadcn/ui customizado

### Hooks Customizados
```typescript
// Query hooks (leitura)
useTransacoes(filters?)
useTransacoesSummary(periodo)
useContasAPagar(filters?)
useSupabaseClientes()
useTradeIns()

// Mutation hooks (escrita)
useCreateTransacao()
useTransacaoAutomatica() // Hook central de automação
```

### Estrutura de Arquivos
```
src/
├── components/
│   ├── ui/              # shadcn/ui customizado
│   ├── help/            # Central de Ajuda
│   ├── clientes/        # Componentes de clientes
│   └── dre/             # Componentes do DRE
├── hooks/               # React Query hooks
├── pages/
│   └── admin/           # Páginas administrativas
├── lib/
│   ├── helpContent.ts   # Conteúdo da Central de Ajuda
│   └── tourConfig.ts    # Configuração de tours
└── integrations/        # Supabase client
```

---

## 🚀 Funcionalidades Futuras

### Módulo Financeiro
- [ ] Projeção de fluxo de caixa
- [ ] Integração bancária via Open Finance
- [ ] Conciliação automática de cartões

### Módulo de Aulas
- [ ] Calendário visual com drag-and-drop
- [ ] Pacotes de aulas com controle de saldo
- [ ] Rating de alunos pós-aula

### Módulo de Equipamentos
- [ ] QR Code para rastreamento
- [ ] Histórico de manutenção detalhado
- [ ] Depreciação automática

### Mobile & PWA
- [ ] Notificações push nativas
- [ ] Modo offline completo
- [ ] Geolocalização de equipamentos

### Integrações
- [ ] Google Calendar sync
- [ ] Stripe/PagSeguro para pagamentos online
- [ ] Contabilidade (Omie, ContaAzul)
