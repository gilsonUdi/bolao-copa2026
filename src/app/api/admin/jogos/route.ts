import { NextRequest, NextResponse } from 'next/server';
import { toggleJogoAtivo } from '@/lib/grupos';

export async function POST(req: NextRequest) {
  try {
    const { grupoId, jogoId, ativar } = await req.json();
    if (!grupoId || jogoId == null) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    await toggleJogoAtivo(grupoId, Number(jogoId), Boolean(ativar));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao atualizar jogo' }, { status: 500 });
  }
}
