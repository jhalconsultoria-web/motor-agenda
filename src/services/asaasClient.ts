const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL ?? "https://sandbox.asaas.com/api/v3";

// Sem chave configurada, o cliente roda em modo simulado: mesma forma de
// retorno da API real, mas sem cobrar ninguém de verdade. Isso permite
// desenvolver e testar o fluxo completo sem depender de uma conta Asaas.
const SIMULADO = !ASAAS_API_KEY;

if (SIMULADO) {
  console.warn("[asaasClient] ASAAS_API_KEY não configurada — rodando em modo SIMULADO (nenhuma cobrança real é gerada).");
}

async function chamar(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", access_token: ASAAS_API_KEY!, ...options.headers },
  });
  const body: any = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.errors?.[0]?.description ?? `Erro Asaas ${res.status}`);
  return body;
}

export interface ClienteGateway {
  id: string;
}

export async function criarOuBuscarCliente(dados: { nome: string; cpfCnpj?: string; telefone: string }): Promise<ClienteGateway> {
  if (SIMULADO) {
    return { id: `sim_cliente_${dados.cpfCnpj ?? dados.telefone}` };
  }

  if (dados.cpfCnpj) {
    const existentes = await chamar(`/customers?cpfCnpj=${dados.cpfCnpj}`);
    if (existentes.data?.length) return { id: existentes.data[0].id };
  }

  // Cobrança avulsa via Pix não exige CPF na Asaas do mesmo jeito que assinatura
  // recorrente exige — por isso cpfCnpj é opcional aqui. Se a conta Asaas em uso
  // exigir CPF mesmo para Pix avulso, essa chamada retorna erro e precisa ajustar
  // o formulário do mini-site/WhatsApp pra coletar o CPF antes de chegar aqui.
  const criado = await chamar("/customers", {
    method: "POST",
    body: JSON.stringify({ name: dados.nome, cpfCnpj: dados.cpfCnpj, mobilePhone: dados.telefone }),
  });
  return { id: criado.id };
}

export interface AssinaturaGateway {
  id: string;
  status: string;
}

export async function criarAssinaturaRecorrente(dados: {
  customerId: string;
  valor: number;
  cicloDias: number;
  billingType: "PIX" | "CREDIT_CARD";
  proximoVencimento: string; // YYYY-MM-DD
  descricao: string;
}): Promise<AssinaturaGateway> {
  if (SIMULADO) {
    return { id: `sim_assinatura_${Date.now()}`, status: "ACTIVE" };
  }

  // Asaas trabalha com ciclos fixos (WEEKLY, MONTHLY etc.) — cicloDias custom
  // é aproximado para o ciclo suportado mais próximo. Para 30 dias, MONTHLY.
  const cycle = dados.cicloDias <= 7 ? "WEEKLY" : dados.cicloDias <= 30 ? "MONTHLY" : "YEARLY";

  const criada = await chamar("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: dados.customerId,
      billingType: dados.billingType,
      cycle,
      value: dados.valor,
      nextDueDate: dados.proximoVencimento,
      description: dados.descricao,
    }),
  });
  return { id: criada.id, status: criada.status };
}

export interface CobrancaPix {
  id: string;
  pixCopiaCola: string | null;
  invoiceUrl: string | null;
}

export async function criarCobrancaPixAvulsa(dados: {
  customerId?: string;
  valor: number;
  descricao: string;
  vencimento: string; // YYYY-MM-DD
}): Promise<CobrancaPix> {
  if (SIMULADO) {
    return {
      id: `sim_cobranca_${Date.now()}`,
      pixCopiaCola: "00020126SIMULADO-SEM-CHAVE-ASAAS-CONFIGURADA5204000053039865802BR",
      invoiceUrl: null,
    };
  }

  const pagamento = await chamar("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: dados.customerId,
      billingType: "PIX",
      value: dados.valor,
      dueDate: dados.vencimento,
      description: dados.descricao,
    }),
  });

  const qrCode = await chamar(`/payments/${pagamento.id}/pixQrCode`).catch(() => null);

  return {
    id: pagamento.id,
    pixCopiaCola: qrCode?.payload ?? null,
    invoiceUrl: pagamento.invoiceUrl ?? null,
  };
}

export const asaasEmModoSimulado = SIMULADO;
