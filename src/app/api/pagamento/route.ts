import { NextRequest, NextResponse } from 'next/server';
import { criarOuBuscarCliente, criarCobrancaPix, consultarPagamento } from '@/lib/asaas';
import { buscarGrupo, marcarPago, buscarApostasUsuario } from '@/lib/grupos';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { grupoId, usuarioId, nome, cpf, email } = body;

    if (!grupoId || !usuarioId || !nome || !cpf) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const grupo = await buscarGrupo(grupoId.replace('grupo_', ''));
    if (!grupo) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });

    const membro = grupo.membros.find((m) => m.usuarioId === usuarioId);
    const apostasUsuario = await buscarApostasUsuario(grupoId, usuarioId);

    let totalApostas: number;
    if (membro?.pago) {
      const jaPatias = membro.apostasPatias ?? membro.apostasNoPagamento ?? 0;
      totalApostas = Math.max(0, apostasUsuario.length - jaPatias);
      if (totalApostas === 0) {
        return NextResponse.json({ error: 'Nenhuma aposta pendente de pagamento' }, { status: 400 });
      }
    } else {
      totalApostas = apostasUsuario.length > 0 ? apostasUsuario.length : 1;
    }

    const valorTotal = totalApostas * grupo.valorAposta;

    const cliente = await criarOuBuscarCliente(nome, cpf.replace(/\D/g, ''), email);

    const qtdLabel = totalApostas > 1 ? `${totalApostas} apostas` : `1 aposta`;
    const descricao = `Bolão Copa 2026 - ${grupo.nome} (${qtdLabel})`;
    const cobranca = await criarCobrancaPix({
      customerId: cliente.id,
      valor: valorTotal,
      descricao,
      externalReference: `${grupoId}_${usuarioId}`,
    });

    await marcarPago(grupoId, usuarioId, cobranca.paymentId, cobranca.invoiceUrl, false, apostasUsuario.length);

    return NextResponse.json({
      paymentId: cobranca.paymentId,
      invoiceUrl: cobranca.invoiceUrl,
      pixCopiaECola: cobranca.pixCopiaECola,
      pixQrCodeImage: cobranca.pixQrCodeImage,
      valor: cobranca.valor,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao gerar cobrança' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get('id');
  if (!paymentId) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  const pagamento = await consultarPagamento(paymentId);
  return NextResponse.json({
    status: pagamento.status,
    pago: pagamento.status === 'RECEIVED' || pagamento.status === 'CONFIRMED',
  });
}
