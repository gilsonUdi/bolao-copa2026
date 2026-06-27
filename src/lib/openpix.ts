const BASE_URL = 'https://api.openpix.com.br/api/v1';
const APP_ID = process.env.OPENPIX_APP_ID || '';

async function openpixRequest(path: string, method = 'GET', body?: object) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': APP_ID,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenPix ${method} ${path} → ${res.status}: ${err}`);
  }

  return res.json();
}

export interface CriarCobrancaParams {
  valor: number;
  descricao: string;
  correlationID: string;
}

export async function criarCobrancaPix(params: CriarCobrancaParams) {
  const data = await openpixRequest('/charge', 'POST', {
    correlationID: params.correlationID,
    value: Math.round(params.valor * 100), // OpenPix usa centavos
    comment: params.descricao,
  });

  const charge = data.charge || {};

  return {
    paymentId: charge.correlationID || params.correlationID,
    invoiceUrl: charge.paymentLinkUrl || '',
    pixCopiaECola: charge.brCode || '',
    pixQrCodeImage: charge.qrCodeImage || '',
    status: charge.status,
    valor: params.valor,
  };
}

export async function consultarPagamento(correlationID: string) {
  const data = await openpixRequest(`/charge/${correlationID}`);
  const charge = data.charge || {};
  return {
    status: charge.status,
    pago: charge.status === 'COMPLETED',
  };
}
