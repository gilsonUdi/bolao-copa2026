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
  const brCode = charge.brCode || '';

  // Normaliza a imagem do QR code:
  // - se vier base64 puro, envolve no data URL
  // - se vier vazio, gera via serviço público a partir do brCode
  let pixQrCodeImage = '';
  if (charge.qrCodeImage) {
    pixQrCodeImage = charge.qrCodeImage.startsWith('data:') || charge.qrCodeImage.startsWith('http')
      ? charge.qrCodeImage
      : `data:image/png;base64,${charge.qrCodeImage}`;
  } else if (brCode) {
    pixQrCodeImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(brCode)}`;
  }

  return {
    paymentId: charge.correlationID || params.correlationID,
    invoiceUrl: charge.paymentLinkUrl || '',
    pixCopiaECola: brCode,
    pixQrCodeImage,
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
