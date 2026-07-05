import { NextRequest, NextResponse } from 'next/server';
import { criarCobrancaPix, consultarPagamento } from '@/lib/openpix';
import { buscarGrupo, marcarPago, buscarApostasUsuario } from '@/lib/grupos';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { grupoId, usuarioId, nome, cpf } = body;

    if (!grupoId || !usuarioId || !nome || !cpf) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const grupo = await buscarGrupo(grupoId.replace('grupo_', ''));
    if (!grupo) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });

    if (grupo.pagamentoBloqueado) {
      return NextResponse.json({ error: 'Pagamentos encerrados para este grupo' }, { status: 403 });
    }

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
      if (apostasUsuario.length === 0) {
        return NextResponse.json({ error: 'Faça pelo menos uma aposta antes de pagar' }, { status: 400 });
      }
      totalApostas = apostasUsuario.length;
    }

    const valorTotal = totalApostas * grupo.valorAposta;
    const qtdLabel = totalApostas > 1 ? `${totalApostas} apostas` : `1 aposta`;
    const descricao = `Bolão Copa 2026 - ${grupo.nome} (${qtdLabel})`;
    const correlationID = `${grupoId}_${usuarioId}_${Date.now()}`;

    const cobranca = await criarCobrancaPix({
      valor: valorTotal,
      descricao,
      correlationID,
    });

    await marcarPago(grupoId, usuarioId, correlationID, cobranca.invoiceUrl, false, apostasUsuario.length);

    return NextResponse.json({
      paymentId: correlationID,
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
  return NextResponse.json(pagamento);
}
