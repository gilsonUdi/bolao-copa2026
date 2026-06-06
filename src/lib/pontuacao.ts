import { Aposta, Jogo } from '@/types';

// Pontuação simplificada: apenas placar exato conta
export const PONTOS_EXATO = 10;

export function calcularPontos(aposta: Aposta, jogo: Jogo): number {
  if (jogo.golsCasa == null || jogo.golsVisitante == null) return 0;

  // Só pontua se acertar o placar exato dos dois times
  if (aposta.golsCasaPrevisto === jogo.golsCasa && aposta.golsVisitantePrevisto === jogo.golsVisitante) {
    return PONTOS_EXATO;
  }

  return 0;
}

export function calcularPrêmio(totalArrecadado: number): number {
  const taxa = Number(process.env.TAXA_PROPRIETARIO || 10) / 100;
  return totalArrecadado * (1 - taxa);
}
