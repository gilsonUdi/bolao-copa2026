import { NextRequest, NextResponse } from 'next/server';
import { salvarChavePix } from '@/lib/grupos';

export async function POST(req: NextRequest) {
  try {
    const { grupoId, usuarioId, chavePix, tipoChavePix } = await req.json();
    if (!grupoId || !usuarioId || !chavePix || !tipoChavePix) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    await salvarChavePix(grupoId, usuarioId, chavePix, tipoChavePix);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao salvar chave PIX' }, { status: 500 });
  }
}
