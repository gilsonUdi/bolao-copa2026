import { NextRequest, NextResponse } from 'next/server';
import { buscarGrupo } from '@/lib/grupos';

export async function POST(req: NextRequest) {
  try {
    const { codigo, senha } = await req.json();
    if (!codigo || !senha) return NextResponse.json({ ok: false }, { status: 400 });

    const grupo = await buscarGrupo(codigo);
    if (!grupo) return NextResponse.json({ ok: false, error: 'Grupo não encontrado' }, { status: 404 });

    const senhaCorreta = grupo.senhaAdmin === senha;
    return NextResponse.json({ ok: senhaCorreta });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
