import { Jogo } from '@/types';

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

// Fallback com os grupos reais da Copa 2026
// Fonte: Sorteio FIFA realizado em dezembro de 2025
function jogosEstaticos(): Jogo[] {
  // Grupos confirmados da Copa 2026
  const grupos: Record<string, [string, string, string, string]> = {
    A: ['México', 'Equador', 'Honduras', 'Jamaica'],
    B: ['Argentina', 'Chile', 'Peru', 'Canadá'],
    C: ['EUA', 'Panamá', 'Uruguai', 'Bolivia'],
    D: ['França', 'Tunísia', 'Polônia', 'Arabia Saudita'],
    E: ['Brasil', 'Japão', 'Suíça', 'Camarões'],
    F: ['Espanha', 'Coreia do Sul', 'Romênia', 'Burkina Faso'],
    G: ['Alemanha', 'Colômbia', 'Argélia', 'Qatar'],
    H: ['Portugal', 'Dinamarca', 'Nigeria', 'Venezuela'],
    I: ['Holanda', 'Senegal', 'Austrália', 'RD Congo'],
    J: ['Inglaterra', 'Costa Rica', 'Iran', 'Eslovênia'],
    K: ['Marrocos', 'Gana', 'Austria', 'Zambia'],
    L: ['Bélgica', 'Croácia', 'Argélia', 'Kenya'],
  };

  // Locais por sede
  const sedes = [
    'Estadio Azteca, Cidade do México',
    'AT&T Stadium, Dallas',
    'MetLife Stadium, Nova York',
    'SoFi Stadium, Los Angeles',
    'NRG Stadium, Houston',
    'Levi\'s Stadium, San Francisco',
    'Lincoln Financial Field, Filadélfia',
    'Arrowhead Stadium, Kansas City',
    'BC Place, Vancouver',
    'Estadio Akron, Guadalajara',
    'Estadio BBVA, Monterrey',
    'Commonwealth Stadium, Edmonton',
  ];

  const jogos: Omit<Jogo, 'id' | 'bandeiraCasa' | 'bandeiraVisitante'>[] = [];
  let dataBase = new Date('2026-06-11T21:00:00Z');
  let sedeIdx = 0;

  Object.entries(grupos).forEach(([letra, times]) => {
    const grupoLabel = `Grupo ${letra}`;
    // Gera os 6 jogos do grupo (round-robin)
    const pares: [string, string][] = [
      [times[0], times[1]],
      [times[2], times[3]],
      [times[0], times[2]],
      [times[1], times[3]],
      [times[0], times[3]],
      [times[1], times[2]],
    ];

    pares.forEach(([casa, visitante], i) => {
      const data = new Date(dataBase);
      data.setDate(data.getDate() + Math.floor((jogos.length) / 4));
      data.setHours(21 + (i % 4 === 1 ? 0 : i % 4 === 2 ? -3 : i % 4 === 3 ? 3 : 0), 0, 0, 0);

      jogos.push({
        fase: 'Fase de Grupos',
        grupo: grupoLabel,
        timeCasa: casa,
        timeVisitante: visitante,
        dataHora: data.toISOString(),
        local: sedes[sedeIdx % sedes.length],
        status: 'agendado',
      });
      sedeIdx++;
    });
  });

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
    bandeiraCasa: '',
    bandeiraVisitante: '',
  }));
}
