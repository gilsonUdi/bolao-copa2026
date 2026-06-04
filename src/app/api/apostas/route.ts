import { NextRequest, NextResponse } from 'next/server';
import { salvarAposta, buscarApostasGrupo, buscarApostasUsuario } from '@/lib/grupos';
import { Aposta } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { grupoId, usuarioId, usuarioNome, jogoId, golsCasaPrevisto, golsVisitantePrevisto } = body;

    if (!grupoId || !usuarioId || jogoId == null) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const aposta: Omit<Aposta, 'id' | 'pontos'> = {
      grupoId,
      usuarioId,
      usuarioNome,
      jogoId: Number(jogoId),
      golsCasaPrevisto: Number(golsCasaPrevisto),
      golsVisitantePrevisto: Number(golsVisitantePrevisto),
      criadaEm: new Date(),
      atualizadaEm: new Date(),
    };

    const id = await salvarAposta(aposta);
    return NextResponse.json({ id, aposta });
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
