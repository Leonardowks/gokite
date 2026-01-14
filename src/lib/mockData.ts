// Dados fictícios para popular o banco de dados em ambiente de teste
import { addDays, subDays, format } from "date-fns";

const today = new Date();

// Nomes brasileiros realistas
const nomesClientes = [
  "João Silva", "Maria Santos", "Pedro Oliveira", "Ana Costa", "Lucas Ferreira",
  "Juliana Lima", "Bruno Almeida", "Camila Souza", "Rafael Pereira", "Fernanda Rodrigues",
  "Thiago Martins", "Larissa Gomes", "Gustavo Ribeiro", "Beatriz Carvalho", "Diego Nascimento",
  "Amanda Barbosa", "Felipe Cardoso", "Isabela Rocha", "Rodrigo Mendes", "Letícia Araújo"
];

const tags = ["Iniciante", "Intermediário", "Avançado", "VIP", "Kitesurf", "Wing Foil", "Foil", "Downwind"];
const instrutores = ["Rafa", "Léo", "Bruno", "Thiago", "Pedro"];
const locais = ["Florianópolis", "Taíba"];
const tiposAula = ["kitesurf", "wing_foil", "foil", "downwind"];
const statusAula = ["agendada", "concluida", "cancelada"];
const formasPagamento = ["pix", "cartao_credito", "cartao_debito", "dinheiro", "trade_in"];
const centrosCusto = ["Escola", "Loja", "Pousada", "Administrativo"];
const origensReceita = ["aula", "venda_produto", "aluguel", "trade_in", "ecommerce", "pacote"];
const categoriasDespesa = ["funcionarios", "manutencao", "combustivel", "marketing", "aluguel_espaco", "fornecedores", "impostos", "outros"];
const marcasEquipamento = ["Duotone", "North", "Cabrinha", "Core", "F-One", "Ozone"];
const tiposEquipamento = ["kite", "wing", "prancha", "trapezio", "barra", "wetsuit"];
const tamanhos = ["7m", "9m", "10m", "12m", "14m", "M", "L", "XL", "140cm", "150cm"];
const condicoesTradeIn = ["usado_excelente", "usado_bom", "usado_regular"];

// Helpers
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const generatePhone = () => `48${randomInt(900000000, 999999999)}`;
const generateEmail = (nome: string) => {
  const suffix = Date.now().toString(36) + randomInt(100, 999);
  return `${nome.toLowerCase().replace(/ /g, '.')}.${suffix}@${randomItem(['gmail.com', 'hotmail.com', 'outlook.com'])}`;
};

// Geradores de dados
export const generateClientes = (count: number = 20) => {
  return nomesClientes.slice(0, count).map((nome, index) => ({
    nome,
    email: generateEmail(nome),
    telefone: generatePhone(),
    status: "ativo",
    tags: [randomItem(tags), randomItem(tags)].filter((v, i, a) => a.indexOf(v) === i),
    store_credit: index % 4 === 0 ? randomInt(500, 5000) : 0,
  }));
};

export const generateAulas = (clienteIds: string[], count: number = 40) => {
  const aulas = [];
  for (let i = 0; i < count; i++) {
    const data = randomDate(subDays(today, 30), addDays(today, 7));
    const status = data > today ? "agendada" : randomItem(["concluida", "cancelada"]);
    aulas.push({
      cliente_id: randomItem(clienteIds),
      data: format(data, "yyyy-MM-dd"),
      hora: `${randomInt(7, 17)}:00`,
      tipo: randomItem(tiposAula),
      instrutor: randomItem(instrutores),
      local: randomItem(locais),
      preco: randomInt(350, 600),
      status,
    });
  }
  return aulas;
};

export const generateTransacoes = (clienteIds: string[], count: number = 60) => {
  const transacoes = [];
  for (let i = 0; i < count; i++) {
    const isReceita = Math.random() > 0.3;
    const data = randomDate(subDays(today, 60), today);
    
    if (isReceita) {
      const origem = randomItem(origensReceita);
      const valorBase = origem === "aula" ? randomInt(350, 600) : 
                       origem === "venda_produto" ? randomInt(1500, 15000) :
                       origem === "aluguel" ? randomInt(100, 400) :
                       origem === "trade_in" ? randomInt(2000, 8000) :
                       randomInt(500, 3000);
      
      transacoes.push({
        tipo: "receita",
        origem,
        valor_bruto: valorBase,
        custo_produto: origem === "venda_produto" ? Math.round(valorBase * 0.6) : 0,
        forma_pagamento: randomItem(formasPagamento),
        parcelas: Math.random() > 0.7 ? randomInt(2, 12) : 1,
        centro_de_custo: origem === "aula" ? "Escola" : origem === "venda_produto" ? "Loja" : randomItem(centrosCusto),
        descricao: `${origem.replace("_", " ")} - ${randomItem(nomesClientes)}`,
        data_transacao: format(data, "yyyy-MM-dd"),
        cliente_id: randomItem(clienteIds),
      });
    } else {
      transacoes.push({
        tipo: "despesa",
        origem: "manual",
        valor_bruto: randomInt(50, 2000),
        custo_produto: 0,
        forma_pagamento: randomItem(["pix", "dinheiro", "cartao_debito"]),
        parcelas: 1,
        centro_de_custo: randomItem(centrosCusto),
        descricao: `${randomItem(categoriasDespesa).replace("_", " ")}`,
        data_transacao: format(data, "yyyy-MM-dd"),
      });
    }
  }
  return transacoes;
};

export const generateEquipamentos = (count: number = 25) => {
  const equipamentos = [];
  for (let i = 0; i < count; i++) {
    const tipo = randomItem(tiposEquipamento);
    const marca = randomItem(marcasEquipamento);
    const tamanho = randomItem(tamanhos);
    
    equipamentos.push({
      nome: `${marca} ${tipo === 'kite' ? 'Evo' : tipo === 'wing' ? 'Slick' : tipo === 'prancha' ? 'Jaime' : ''} ${tamanho}`.trim(),
      tipo,
      tamanho,
      status: randomItem(["disponivel", "disponivel", "disponivel", "alugado", "manutencao"]),
      localizacao: randomItem(locais),
      preco_aluguel_dia: randomInt(80, 250),
      cost_price: randomInt(2000, 12000),
      sale_price: randomInt(3000, 18000),
      quantidade_fisica: randomInt(1, 3),
      source_type: "owned",
      fiscal_category: "venda_produto",
    });
  }
  return equipamentos;
};

export const generateTradeIns = (count: number = 10) => {
  const tradeIns = [];
  for (let i = 0; i < count; i++) {
    const isVendido = Math.random() > 0.6;
    const valorEntrada = randomInt(1500, 8000);
    const dataEntrada = randomDate(subDays(today, 90), subDays(today, 10));
    
    tradeIns.push({
      equipamento_recebido: `${randomItem(marcasEquipamento)} ${randomItem(['Evo', 'Rebel', 'Dice', 'Neo', 'Slick'])} ${randomItem(tamanhos)}`,
      descricao: `Equipamento usado em bom estado. ${randomItem(['Pequenos reparos', 'Sem danos', 'Costuras reforçadas', 'Original'])}`,
      valor_entrada: valorEntrada,
      categoria: randomItem(['kite', 'wing', 'prancha', 'trapezio']),
      marca: randomItem(marcasEquipamento),
      tamanho: randomItem(tamanhos),
      ano: randomInt(2020, 2024),
      condicao: randomItem(condicoesTradeIn),
      status: isVendido ? "vendido" : "em_estoque",
      data_entrada: format(dataEntrada, "yyyy-MM-dd"),
      data_saida: isVendido ? format(randomDate(dataEntrada, today), "yyyy-MM-dd") : null,
      valor_saida: isVendido ? valorEntrada + randomInt(500, 2000) : null,
      lucro_trade_in: isVendido ? randomInt(500, 2000) : null,
      fotos: [],
    });
  }
  return tradeIns;
};

export const generateContasAPagar = (count: number = 20) => {
  const contas = [];
  const descricoes = [
    { desc: "Aluguel espaço Floripa", cat: "aluguel_espaco", valor: 3500, recorrente: true },
    { desc: "Aluguel espaço Taíba", cat: "aluguel_espaco", valor: 2800, recorrente: true },
    { desc: "Salário instrutor Rafa", cat: "funcionarios", valor: 4500, recorrente: true },
    { desc: "Salário instrutor Léo", cat: "funcionarios", valor: 4200, recorrente: true },
    { desc: "Manutenção jet ski", cat: "manutencao", valor: 850, recorrente: false },
    { desc: "Combustível embarcação", cat: "combustivel", valor: 420, recorrente: false },
    { desc: "Google Ads", cat: "marketing", valor: 1200, recorrente: true },
    { desc: "Instagram Ads", cat: "marketing", valor: 800, recorrente: true },
    { desc: "Fornecedor Duotone", cat: "fornecedores", valor: 12500, recorrente: false },
    { desc: "Contador mensal", cat: "outros", valor: 650, recorrente: true },
    { desc: "Seguro equipamentos", cat: "outros", valor: 1800, recorrente: false },
    { desc: "Reparo prancha cliente", cat: "manutencao", valor: 280, recorrente: false },
    { desc: "Material escritório", cat: "outros", valor: 150, recorrente: false },
    { desc: "Energia elétrica", cat: "outros", valor: 380, recorrente: true },
    { desc: "Internet fibra", cat: "outros", valor: 200, recorrente: true },
  ];

  for (let i = 0; i < Math.min(count, descricoes.length + 5); i++) {
    const item = descricoes[i % descricoes.length];
    const vencimento = randomDate(subDays(today, 15), addDays(today, 30));
    const isPago = vencimento < today && Math.random() > 0.3;
    const isVencido = vencimento < today && !isPago;

    contas.push({
      descricao: item.desc,
      categoria: item.cat,
      valor: item.valor + randomInt(-100, 100),
      data_vencimento: format(vencimento, "yyyy-MM-dd"),
      status: isPago ? "pago" : isVencido ? "vencido" : "pendente",
      data_pagamento: isPago ? format(randomDate(vencimento, today), "yyyy-MM-dd") : null,
      recorrente: item.recorrente,
      frequencia_recorrencia: item.recorrente ? "mensal" : null,
      fornecedor: randomItem(["Duotone Sul", "North Brasil", "Posto Shell", "Google", "Meta", null]),
      centro_de_custo: randomItem(centrosCusto),
    });
  }
  return contas;
};
