import { NextResponse } from 'next/server';
import { buscarJogosCopa } from '@/lib/football-api';

export async function GET() {
  try {
    const jogos = await buscarJogosCopa();
    return NextResponse.json({ jogos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao buscar jogos' }, { status: 500 });
  }
}
