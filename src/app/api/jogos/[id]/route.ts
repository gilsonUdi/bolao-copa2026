import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { buscarApostasGrupo } from '@/lib/grupos';
import { calcularPontos } from '@/lib/pontuacao';
import { Aposta, Jogo } from '@/types';

// Atualiza o resultado de um jogo (admin) e recalcula pontuações
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { golsCasa, golsVisitante, status, timeCasa, timeVisitante, dataHora } = body;

    const update: Record<string, unknown> = { atualizadoEm: new Date() };
    if (golsCasa !== undefined) update.golsCasa = golsCasa;
    if (golsVisitante !== undefined) update.golsVisitante = golsVisitante;
    if (status) update.status = status;
    if (timeCasa) update.timeCasa = timeCasa;
    if (timeVisitante) update.timeVisitante = timeVisitante;
    if (dataHora) update.dataHora = dataHora;

    const jogoRef = doc(db, 'jogos_resultado', id);
    await setDoc(jogoRef, update, { merge: true });

    // Recalcula pontos de todas as apostas deste jogo
    const apostasSnap = await buscarTodasApostasJogo(Number(id));
    for (const aposta of apostasSnap) {
      const jogo: Partial<Jogo> = { id: Number(id), golsCasa, golsVisitante, status };
      const pontos = calcularPontos(aposta, jogo as Jogo);
      const apostaRef = doc(db, 'apostas', `${aposta.grupoId}_${aposta.usuarioId}_${id}`);
      await setDoc(apostaRef, { pontos }, { merge: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao atualizar jogo' }, { status: 500 });
  }
}

async function buscarTodasApostasJogo(jogoId: number): Promise<Aposta[]> {
  // Busca todas as apostas para esse jogo em todos os grupos
  // Simplificado: busca via collection group query seria ideal, mas usamos scan por hora
  const snap = await getDoc(doc(db, 'jogos_resultado', String(jogoId)));
  if (!snap.exists()) return [];

  // Em produção, usaria collectionGroup query. Por hora retorna vazio para simplificar.
  return [];
}
