import { NextRequest, NextResponse } from 'next/server';
import { entrarNoGrupo } from '@/lib/grupos';

export async function POST(req: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  try {
    const { codigo } = await params;
    const body = await req.json();
    const { usuarioId, nome, telefone } = body;

    if (!usuarioId || !nome || !telefone) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    await entrarNoGrupo(codigo, { usuarioId, nome, telefone, pago: false });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao entrar no grupo' }, { status: 500 });
  }
}
