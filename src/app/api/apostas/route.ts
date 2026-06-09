import { NextRequest, NextResponse } from 'next/server';
import { salvarAposta, buscarApostasGrupo, buscarApostasUsuario, buscarGrupo, contarApostasJogo, marcarApostaPaga, excluirAposta } from '@/lib/grupos';
import { criarOuBuscarCliente, criarCobrancaPix } from '@/lib/asaas';
import { Aposta } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { grupoId, usuarioId, usuarioNome, jogoId, golsCasaPrevisto, golsVisitantePrevisto, cpf, apostaId } = body;

    if (!grupoId || !usuarioId || jogoId == null) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    // Se for edição de aposta existente (antes do jogo), apenas atualiza o placar
    if (apostaId) {
      const aposta: Partial<Aposta> = {
        golsCasaPrevisto: Number(golsCasaPrevisto),
        golsVisitantePrevisto: Number(golsVisitantePrevisto),
        atualizadaEm: new Date(),
      };
      await salvarAposta({ grupoId, usuarioId, usuarioNome, jogoId: Number(jogoId), numero: Number(body.numero), golsCasaPrevisto: Number(golsCasaPrevisto), golsVisitantePrevisto: Number(golsVisitantePrevisto), pago: body.pago, criadaEm: new Date(body.criadaEm), atualizadaEm: new Date() });
      return NextResponse.json({ ok: true });
    }

    // Nova aposta — determina o número sequencial
    const totalApostas = await contarApostasJogo(grupoId, usuarioId, Number(jogoId));
    const numero = totalApostas + 1;

    // Busca grupo para saber o valor
    const grupo = await buscarGrupo(grupoId.replace('grupo_', ''));
    if (!grupo) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });

    // Salva a aposta como não paga
    const aposta: Omit<Aposta, 'id' | 'pontos'> = {
      grupoId,
      usuarioId,
      usuarioNome,
      jogoId: Number(jogoId),
      numero,
      golsCasaPrevisto: Number(golsCasaPrevisto),
      golsVisitantePrevisto: Number(golsVisitantePrevisto),
      pago: false,
      criadaEm: new Date(),
      atualizadaEm: new Date(),
    };
    const id = await salvarAposta(aposta);

    // Gera cobrança Asaas para esta aposta (se CPF fornecido)
    let cobranca = null;
    if (cpf && grupo.valorAposta > 0) {
      try {
        const cliente = await criarOuBuscarCliente(usuarioNome, cpf.replace(/\D/g, ''));
        cobranca = await criarCobrancaPix({
          customerId: cliente.id,
          valor: grupo.valorAposta,
          descricao: `Aposta ${numero} - Jogo ${jogoId} - Bolão ${grupo.nome}`,
          externalReference: `aposta_${id}`,
        });
        await marcarApostaPaga(id, cobranca.paymentId, cobranca.invoiceUrl);
        // Na verdade, marca como pago só após confirmação do webhook
        // Por ora, deixa pago=false e aguarda webhook
        await salvarAposta({ ...aposta, asaasPaymentId: cobranca.paymentId, asaasInvoiceUrl: cobranca.invoiceUrl, pago: false });
      } catch (e) {
        console.warn('Asaas opcional:', e);
      }
    }

    return NextResponse.json({
      id,
      numero,
      cobranca: cobranca ? {
        invoiceUrl: cobranca.invoiceUrl,
        pixCopiaECola: cobranca.pixCopiaECola,
        pixQrCodeImage: cobranca.pixQrCodeImage,
        valor: cobranca.valor,
      } : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao salvar aposta' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const grupoId = req.nextUrl.searchParams.get('grupoId');
  const usuarioId = req.nextUrl.searchParams.get('usuarioId');

  if (!grupoId) return NextResponse.json({ error: 'grupoId obrigatório' }, { status: 400 });

  const apostas = usuarioId
    ? await buscarApostasUsuario(grupoId, usuarioId)
    : await buscarApostasGrupo(grupoId);

  return NextResponse.json({ apostas });
}

export async function DELETE(req: NextRequest) {
  try {
    const apostaId = req.nextUrl.searchParams.get('id');
    if (!apostaId) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    await excluirAposta(apostaId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao excluir aposta' }, { status: 500 });
  }
}
