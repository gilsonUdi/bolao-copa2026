const BASE_URL = process.env.ASAAS_BASE_URL || 'https://api.asaas.com/v3';
const API_KEY = process.env.ASAAS_API_KEY || '';

async function asaasRequest(path: string, method = 'GET', body?: object) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Asaas ${method} ${path} → ${res.status}: ${err}`);
  }

  return res.json();
}

export async function criarOuBuscarCliente(nome: string, cpfCnpj: string, email?: string) {
  // Tenta buscar cliente existente pelo CPF/CNPJ
  const busca = await asaasRequest(`/customers?cpfCnpj=${cpfCnpj}`);
  if (busca.data?.length > 0) return busca.data[0];

  return asaasRequest('/customers', 'POST', {
    name: nome,
    cpfCnpj,
    email,
    notificationDisabled: false,
  });
}

export interface CriarCobrancaParams {
  customerId: string;
  valor: number;
  descricao: string;
  externalReference?: string;
  dueDate?: string; // YYYY-MM-DD, default amanhã
}

export async function criarCobrancaPix(params: CriarCobrancaParams) {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 3);
  const dueDate = params.dueDate || amanha.toISOString().split('T')[0];

  const cobranca = await asaasRequest('/payments', 'POST', {
    customer: params.customerId,
    billingType: 'PIX',
    value: params.valor,
    dueDate,
    description: params.descricao,
    externalReference: params.externalReference,
  });

  // Busca QR code Pix — tenta 3x com delay (Asaas pode demorar para gerar)
  let pix: { payload?: string; encodedImage?: string } = {};
  for (let i = 0; i < 3; i++) {
    try {
      await new Promise(r => setTimeout(r, i * 1000)); // 0s, 1s, 2s
      pix = await asaasRequest(`/payments/${cobranca.id}/pixQrCode`);
      console.log(`[Asaas] pixQrCode tentativa ${i+1}:`, { payload: !!pix.payload, encodedImage: !!pix.encodedImage });
      if (pix.payload || pix.encodedImage) break;
    } catch (e) {
      console.warn(`[Asaas] pixQrCode tentativa ${i+1} falhou:`, e);
    }
  }

  return {
    paymentId: cobranca.id,
    invoiceUrl: cobranca.invoiceUrl,
    pixCopiaECola: pix.payload || '',
    pixQrCodeImage: pix.encodedImage || '',
    status: cobranca.status,
    valor: cobranca.value,
  };
}

export async function consultarPagamento(paymentId: string) {
  return asaasRequest(`/payments/${paymentId}`);
}

export async function webhookConfirmado(paymentId: string): Promise<boolean> {
  const pagamento = await consultarPagamento(paymentId);
  return pagamento.status === 'RECEIVED' || pagamento.status === 'CONFIRMED';
}
