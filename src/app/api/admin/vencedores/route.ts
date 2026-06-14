import { NextRequest, NextResponse } from 'next/server';
import { buscarGrupo, buscarApostasGrupo, salvarVencedores, marcarVencedorPago } from '@/lib/grupos';
import { pagarVencedorPix } from '@/lib/asaas';
import { calcularPontos } from '@/lib/pontuacao';
import { buscarJogosComResultados } from '@/lib/football-api';
import { Vencedor, Ranking } from '@/types';

// GET — calcula e retorna o ranking atual do grupo
export async function GET(req: NextRequest) {
  const grupoId = req.nextUrl.searchParams.get('grupoId');
  if (!grupoId) return NextResponse.json({ error: 'grupoId obrigatório' }, { status: 400 });

  const [grupo, apostas, jogos] = await Promise.all([
    buscarGrupo(grupoId.replace('grupo_', '')),
    buscarApostasGrupo(grupoId),
    buscarJogosComResultados(),
  ]);
  if (!grupo) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });

  const pontosMap: Record<string, { pontos: number; exatos: number; vencedores: number; total: number; nome: string; telefone: string }> = {};
  grupo.membros.forEach((m) => {
    pontosMap[m.usuarioId] = { pontos: 0, exatos: 0, vencedores: 0, total: 0, nome: m.nome, telefone: m.telefone };
  });

  apostas.forEach((a) => {
    const jogo = jogos.find((j) => j.id === a.jogoId);
    if (!jogo || jogo.status !== 'encerrado') return;
    const pts = calcularPontos(a, jogo);
    if (!pontosMap[a.usuarioId]) pontosMap[a.usuarioId] = { pontos: 0, exatos: 0, vencedores: 0, total: 0, nome: a.usuarioNome, telefone: '' };
    pontosMap[a.usuarioId].pontos += pts;
    pontosMap[a.usuarioId].total += 1;
    if (pts === 10) pontosMap[a.usuarioId].exatos += 1;
    else if (pts > 0) pontosMap[a.usuarioId].vencedores += 1;
  });

  const ranking: Ranking[] = Object.entries(pontosMap)
    .map(([id, v], i) => ({ usuarioId: id, nome: v.nome, pontos: v.pontos, acertosExatos: v.exatos, acertosVencedor: v.vencedores, apostasTotal: v.total, posicao: i + 1 }))
    .sort((a, b) => b.pontos - a.pontos)
    .map((r, i) => ({ ...r, posicao: i + 1 }));

  // Soma apostas reais de cada membro pago (não apenas 1 por pessoa)
  const totalPago = grupo.membros
    .filter((m) => m.pago)
    .reduce((acc, m) => {
      const qtd = apostas.filter((a) => a.usuarioId === m.usuarioId).length;
      return acc + (qtd > 0 ? qtd : 1) * grupo.valorAposta;
    }, 0);
  const premioTotal = totalPago * 0.9;

  return NextResponse.json({ ranking, premioTotal, vencedoresDeclarados: grupo.vencedores || [] });
}

// POST — declara vencedores e/ou paga via PIX
export async function POST(req: NextRequest) {
  try {
    const { grupoId, acao, vencedores, posicao } = await req.json();

    if (acao === 'declarar') {
      // Salva os vencedores declarados pelo admin
      await salvarVencedores(grupoId, vencedores as Vencedor[]);
      return NextResponse.json({ ok: true });
    }

    if (acao === 'pagar') {
      // Paga o vencedor de uma posição via PIX usando a chave cadastrada
      const grupo = await buscarGrupo(grupoId.replace('grupo_', ''));
      if (!grupo) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });

      const vencedor = grupo.vencedores.find((v) => v.posicao === posicao);
      if (!vencedor) return NextResponse.json({ error: 'Vencedor não encontrado' }, { status: 404 });
      if (vencedor.premioPago) return NextResponse.json({ error: 'Prêmio já pago' }, { status: 400 });

      // Busca a chave PIX do membro
      const membro = grupo.membros.find((m) => m.usuarioId === vencedor.usuarioId);
      if (!membro?.chavePix) {
        return NextResponse.json({ error: `${vencedor.nome} não cadastrou chave PIX` }, { status: 400 });
      }

      const transferencia = await pagarVencedorPix({
        chavePix: membro.chavePix,
        tipoChavePix: membro.tipoChavePix || 'PHONE',
        valor: vencedor.premioValor,
        descricao: `Prêmio ${posicao}º lugar - Bolão Copa 2026 - ${grupo.nome}`,
      });

      await marcarVencedorPago(grupoId, posicao, transferencia.id);
      return NextResponse.json({ ok: true, transferenciaId: transferencia.id });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
