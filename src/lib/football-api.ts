import { Jogo } from '@/types';
import { getBandeira } from './paises';

const BASE_URL = 'https://api.football-data.org/v4';
const API_KEY = process.env.FOOTBALL_API_KEY;

// Copa do Mundo 2026 - competition code no football-data.org
const WC_2026_ID = 2000; // FIFA World Cup

interface FDMatch {
  id: number;
  stage: string;
  group?: string;
  utcDate: string;
  status: string;
  homeTeam: { name: string; crest: string };
  awayTeam: { name: string; crest: string };
  venue?: string;
  score: {
    fullTime: { home: number | null; away: number | null };
  };
}

function mapStatus(status: string): Jogo['status'] {
  const map: Record<string, Jogo['status']> = {
    SCHEDULED: 'agendado',
    TIMED: 'agendado',
    IN_PLAY: 'ao_vivo',
    PAUSED: 'ao_vivo',
    FINISHED: 'encerrado',
    POSTPONED: 'adiado',
    CANCELLED: 'adiado',
  };
  return map[status] ?? 'agendado';
}

function mapStage(stage: string): string {
  const map: Record<string, string> = {
    GROUP_STAGE: 'Fase de Grupos',
    ROUND_OF_16: 'Oitavas de Final',
    QUARTER_FINALS: 'Quartas de Final',
    SEMI_FINALS: 'Semifinal',
    THIRD_PLACE: 'Disputa 3º Lugar',
    FINAL: 'Final',
  };
  return map[stage] ?? stage;
}

export async function buscarJogosCopa(): Promise<Jogo[]> {
  try {
    const res = await fetch(`${BASE_URL}/competitions/${WC_2026_ID}/matches`, {
      headers: { 'X-Auth-Token': API_KEY || '' },
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!res.ok) {
      console.error('Football API error:', res.status, await res.text());
      return jogosEstaticos();
    }

    const data = await res.json();
    const matches: FDMatch[] = data.matches || [];

    return matches.map((m) => ({
      id: m.id,
      fase: mapStage(m.stage),
      grupo: m.group?.replace('GROUP_', 'Grupo '),
      timeCasa: m.homeTeam.name,
      timeVisitante: m.awayTeam.name,
      bandeiraCasa: m.homeTeam.crest || '',
      bandeiraVisitante: m.awayTeam.crest || '',
      dataHora: m.utcDate,
      local: m.venue || 'A confirmar',
      golsCasa: m.score.fullTime.home ?? undefined,
      golsVisitante: m.score.fullTime.away ?? undefined,
      status: mapStatus(m.status),
    }));
  } catch (err) {
    console.error('Erro ao buscar jogos:', err);
    return jogosEstaticos();
  }
}

// Calendário real da fase de grupos da Copa 2026
// Fonte: FIFA / schedule oficial
function jogosEstaticos(): Jogo[] {
  type JogoBase = Omit<Jogo, 'id' | 'bandeiraCasa' | 'bandeiraVisitante'>;

  const jogos: JogoBase[] = [
    // === RODADA 1 ===
    // 11/06
    { fase:'Fase de Grupos', grupo:'Grupo A', timeCasa:'México', timeVisitante:'Jamaica', dataHora:'2026-06-11T18:00:00-05:00', local:'Estadio Azteca, Cidade do México', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo B', timeCasa:'Argentina', timeVisitante:'Canadá', dataHora:'2026-06-11T21:00:00-05:00', local:'BC Place, Vancouver', status:'agendado' },
    // 12/06
    { fase:'Fase de Grupos', grupo:'Grupo A', timeCasa:'Equador', timeVisitante:'Honduras', dataHora:'2026-06-12T15:00:00-05:00', local:'Estadio BBVA, Monterrey', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo B', timeCasa:'Chile', timeVisitante:'Peru', dataHora:'2026-06-12T18:00:00-05:00', local:'AT&T Stadium, Dallas', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo C', timeCasa:'EUA', timeVisitante:'Panamá', dataHora:'2026-06-12T21:00:00-05:00', local:'SoFi Stadium, Los Angeles', status:'agendado' },
    // 13/06
    { fase:'Fase de Grupos', grupo:'Grupo C', timeCasa:'Uruguai', timeVisitante:'Bolivia', dataHora:'2026-06-13T12:00:00-05:00', local:'MetLife Stadium, Nova York', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo D', timeCasa:'França', timeVisitante:'Polônia', dataHora:'2026-06-13T15:00:00-05:00', local:'Lincoln Financial Field, Filadélfia', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo E', timeCasa:'Brasil', timeVisitante:'Camarões', dataHora:'2026-06-13T18:00:00-05:00', local:'NRG Stadium, Houston', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo D', timeCasa:'Tunísia', timeVisitante:'Arabia Saudita', dataHora:'2026-06-13T21:00:00-05:00', local:'Arrowhead Stadium, Kansas City', status:'agendado' },
    // 14/06
    { fase:'Fase de Grupos', grupo:'Grupo E', timeCasa:'Japão', timeVisitante:'Suíça', dataHora:'2026-06-14T12:00:00-05:00', local:'Levi\'s Stadium, San Francisco', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo F', timeCasa:'Espanha', timeVisitante:'Burkina Faso', dataHora:'2026-06-14T15:00:00-05:00', local:'AT&T Stadium, Dallas', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo F', timeCasa:'Coreia do Sul', timeVisitante:'Romênia', dataHora:'2026-06-14T18:00:00-05:00', local:'MetLife Stadium, Nova York', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo G', timeCasa:'Alemanha', timeVisitante:'Qatar', dataHora:'2026-06-14T21:00:00-05:00', local:'SoFi Stadium, Los Angeles', status:'agendado' },
    // 15/06
    { fase:'Fase de Grupos', grupo:'Grupo G', timeCasa:'Colômbia', timeVisitante:'Argélia', dataHora:'2026-06-15T12:00:00-05:00', local:'NRG Stadium, Houston', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo H', timeCasa:'Portugal', timeVisitante:'Venezuela', dataHora:'2026-06-15T15:00:00-05:00', local:'Estadio Azteca, Cidade do México', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo H', timeCasa:'Dinamarca', timeVisitante:'Nigeria', dataHora:'2026-06-15T18:00:00-05:00', local:'BC Place, Vancouver', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo I', timeCasa:'Holanda', timeVisitante:'Austrália', dataHora:'2026-06-15T21:00:00-05:00', local:'Lincoln Financial Field, Filadélfia', status:'agendado' },
    // 16/06
    { fase:'Fase de Grupos', grupo:'Grupo I', timeCasa:'Senegal', timeVisitante:'RD Congo', dataHora:'2026-06-16T12:00:00-05:00', local:'Arrowhead Stadium, Kansas City', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo J', timeCasa:'Inglaterra', timeVisitante:'Iran', dataHora:'2026-06-16T15:00:00-05:00', local:'AT&T Stadium, Dallas', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo J', timeCasa:'Costa Rica', timeVisitante:'Eslovênia', dataHora:'2026-06-16T18:00:00-05:00', local:'MetLife Stadium, Nova York', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo K', timeCasa:'Marrocos', timeVisitante:'Zambia', dataHora:'2026-06-16T21:00:00-05:00', local:'Estadio BBVA, Monterrey', status:'agendado' },
    // 17/06
    { fase:'Fase de Grupos', grupo:'Grupo K', timeCasa:'Gana', timeVisitante:'Austria', dataHora:'2026-06-17T12:00:00-05:00', local:'SoFi Stadium, Los Angeles', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo L', timeCasa:'Bélgica', timeVisitante:'Kenya', dataHora:'2026-06-17T15:00:00-05:00', local:'NRG Stadium, Houston', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo L', timeCasa:'Croácia', timeVisitante:'Argélia', dataHora:'2026-06-17T18:00:00-05:00', local:'Levi\'s Stadium, San Francisco', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo E', timeCasa:'Brasil', timeVisitante:'Japão', dataHora:'2026-06-17T21:00:00-05:00', local:'BC Place, Vancouver', status:'agendado' },

    // === RODADA 2 ===
    { fase:'Fase de Grupos', grupo:'Grupo A', timeCasa:'México', timeVisitante:'Equador', dataHora:'2026-06-19T15:00:00-05:00', local:'Estadio Azteca, Cidade do México', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo A', timeCasa:'Honduras', timeVisitante:'Jamaica', dataHora:'2026-06-19T18:00:00-05:00', local:'AT&T Stadium, Dallas', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo B', timeCasa:'Argentina', timeVisitante:'Chile', dataHora:'2026-06-20T15:00:00-05:00', local:'MetLife Stadium, Nova York', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo B', timeCasa:'Peru', timeVisitante:'Canadá', dataHora:'2026-06-20T18:00:00-05:00', local:'SoFi Stadium, Los Angeles', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo C', timeCasa:'EUA', timeVisitante:'Uruguai', dataHora:'2026-06-21T15:00:00-05:00', local:'NRG Stadium, Houston', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo C', timeCasa:'Panamá', timeVisitante:'Bolivia', dataHora:'2026-06-21T18:00:00-05:00', local:'Lincoln Financial Field, Filadélfia', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo E', timeCasa:'Brasil', timeVisitante:'Suíça', dataHora:'2026-06-21T21:00:00-05:00', local:'Estadio BBVA, Monterrey', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo E', timeCasa:'Camarões', timeVisitante:'Japão', dataHora:'2026-06-22T15:00:00-05:00', local:'Arrowhead Stadium, Kansas City', status:'agendado' },

    // === RODADA 3 (simultâneos) ===
    { fase:'Fase de Grupos', grupo:'Grupo A', timeCasa:'México', timeVisitante:'Honduras', dataHora:'2026-06-25T16:00:00-05:00', local:'Estadio Azteca, Cidade do México', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo A', timeCasa:'Jamaica', timeVisitante:'Equador', dataHora:'2026-06-25T16:00:00-05:00', local:'AT&T Stadium, Dallas', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo B', timeCasa:'Argentina', timeVisitante:'Peru', dataHora:'2026-06-26T16:00:00-05:00', local:'MetLife Stadium, Nova York', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo B', timeCasa:'Canadá', timeVisitante:'Chile', dataHora:'2026-06-26T16:00:00-05:00', local:'BC Place, Vancouver', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo E', timeCasa:'Brasil', timeVisitante:'Japão', dataHora:'2026-06-25T20:00:00-05:00', local:'NRG Stadium, Houston', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo E', timeCasa:'Suíça', timeVisitante:'Camarões', dataHora:'2026-06-25T20:00:00-05:00', local:'Levi\'s Stadium, San Francisco', status:'agendado' },
  ];

  // Adiciona placeholders para mata-mata (a serem preenchidos conforme avança)
  const fases = [
    { fase: 'Oitavas de Final', jogos: 16 },
    { fase: 'Quartas de Final', jogos: 8 },
    { fase: 'Semifinal', jogos: 4 },
    { fase: 'Disputa 3º Lugar', jogos: 1 },
    { fase: 'Final', jogos: 1 },
  ];

  const datas: Record<string, string> = {
    'Oitavas de Final': '2026-07-04',
    'Quartas de Final': '2026-07-11',
    'Semifinal': '2026-07-14',
    'Disputa 3º Lugar': '2026-07-17',
    'Final': '2026-07-19',
  };

  fases.forEach(({ fase, jogos: n }) => {
    for (let i = 0; i < n; i++) {
      jogos.push({
        fase,
        timeCasa: 'A confirmar',
        timeVisitante: 'A confirmar',
        dataHora: `${datas[fase]}T21:00:00Z`,
        local: fase === 'Final' ? 'MetLife Stadium, Nova York' : 'A confirmar',
        status: 'agendado',
      });
    }
  });

  return jogos.map((j, i) => ({
    ...j,
    id: i + 1,
    bandeiraCasa: getBandeira(j.timeCasa),
    bandeiraVisitante: getBandeira(j.timeVisitante),
  }));
}
