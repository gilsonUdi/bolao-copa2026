import { Aposta, Jogo } from '@/types';

export const PONTOS_EXATO = 10;
export const PONTOS_VENCEDOR_PLACAR = 7;
export const PONTOS_VENCEDOR = 5;

function resultado(gols1: number, gols2: number): 'casa' | 'empate' | 'visitante' {
  if (gols1 > gols2) return 'casa';
  if (gols1 < gols2) return 'visitante';
  return 'empate';
}

export function calcularPontos(aposta: Aposta, jogo: Jogo): number {
  if (jogo.golsCasa == null || jogo.golsVisitante == null) return 0;

  const realCasa = jogo.golsCasa;
  const realVisitante = jogo.golsVisitante;
  const prevCasa = aposta.golsCasaPrevisto;
  const prevVisitante = aposta.golsVisitantePrevisto;

  // Placar exato
  if (prevCasa === realCasa && prevVisitante === realVisitante) {
    return PONTOS_EXATO;
  }

  const resultadoReal = resultado(realCasa, realVisitante);
  const resultadoPrev = resultado(prevCasa, prevVisitante);

  if (resultadoReal !== resultadoPrev) return 0;

  // Acertou vencedor + um dos placares
  if (prevCasa === realCasa || prevVisitante === realVisitante) {
    return PONTOS_VENCEDOR_PLACAR;
  }

  // Acertou só o vencedor/empate
  return PONTOS_VENCEDOR;
}

export function calcularPrêmio(totalArrecadado: number): number {
  const taxa = Number(process.env.TAXA_PROPRIETARIO || 10) / 100;
  return totalArrecadado * (1 - taxa);
}
