import { NextResponse } from 'next/server';
import { buscarJogosComResultados } from '@/lib/football-api';

export async function GET() {
  try {
    const jogos = await buscarJogosComResultados();
    return NextResponse.json({ jogos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao buscar jogos' }, { status: 500 });
  }
}
