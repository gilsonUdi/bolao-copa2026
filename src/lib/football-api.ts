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
// Horários em BRT (UTC-3). Fontes: FIFA, ESPN, FOX Sports, NBC Sports
// Grupos: A=México/África do Sul/Coreia/Tchéquia | B=Canadá/Bósnia/Catar/Suíça
//         C=Brasil/Marrocos/Haiti/Escócia | D=EUA/Paraguai/Austrália/Turquia
//         E=Alemanha/Curaçao/Costa do Marfim/Equador | F=Holanda/Japão/Suécia/Tunísia
//         G=Bélgica/Egito/Irã/Nova Zelândia | H=Espanha/Cabo Verde/Arábia Saudita/Uruguai
//         I=França/Senegal/Iraque/Noruega | J=Argentina/Argélia/Áustria/Jordânia
//         K=Portugal/RD Congo/Uzbequistão/Colômbia | L=Inglaterra/Croácia/Gana/Panamá
function jogosEstaticos(): Jogo[] {
  type JogoBase = Omit<Jogo, 'id' | 'bandeiraCasa' | 'bandeiraVisitante'>;

  const jogos: JogoBase[] = [

    // ===== RODADA 1 =====
    // 11/06
    { fase:'Fase de Grupos', grupo:'Grupo A', timeCasa:'México', timeVisitante:'África do Sul', dataHora:'2026-06-11T16:00:00-03:00', local:'Estadio Azteca, Cidade do México', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo A', timeCasa:'Coreia do Sul', timeVisitante:'Tchéquia', dataHora:'2026-06-11T23:00:00-03:00', local:'Estadio Akron, Zapopan', status:'agendado' },
    // 12/06
    { fase:'Fase de Grupos', grupo:'Grupo B', timeCasa:'Canadá', timeVisitante:'Bósnia e Herzegovina', dataHora:'2026-06-12T16:00:00-03:00', local:'BMO Field, Toronto', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo D', timeCasa:'EUA', timeVisitante:'Paraguai', dataHora:'2026-06-12T22:00:00-03:00', local:'SoFi Stadium, Inglewood', status:'agendado' },
    // 13/06
    { fase:'Fase de Grupos', grupo:'Grupo B', timeCasa:'Catar', timeVisitante:'Suíça', dataHora:'2026-06-13T16:00:00-03:00', local:'MetLife Stadium, East Rutherford', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo C', timeCasa:'Brasil', timeVisitante:'Marrocos', dataHora:'2026-06-13T19:00:00-03:00', local:'NRG Stadium, Houston', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo C', timeCasa:'Haiti', timeVisitante:'Escócia', dataHora:'2026-06-13T22:00:00-03:00', local:'AT&T Stadium, Arlington', status:'agendado' },
    // 14/06
    { fase:'Fase de Grupos', grupo:'Grupo D', timeCasa:'Austrália', timeVisitante:'Turquia', dataHora:'2026-06-14T01:00:00-03:00', local:'BC Place, Vancouver', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo E', timeCasa:'Alemanha', timeVisitante:'Curaçao', dataHora:'2026-06-14T14:00:00-03:00', local:'NRG Stadium, Houston', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo F', timeCasa:'Holanda', timeVisitante:'Japão', dataHora:'2026-06-14T17:00:00-03:00', local:'AT&T Stadium, Arlington', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo E', timeCasa:'Costa do Marfim', timeVisitante:'Equador', dataHora:'2026-06-14T20:00:00-03:00', local:'Lincoln Financial Field, Philadelphia', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo F', timeCasa:'Suécia', timeVisitante:'Tunísia', dataHora:'2026-06-14T23:00:00-03:00', local:'Estadio Akron, Zapopan', status:'agendado' },
    // 15/06
    { fase:'Fase de Grupos', grupo:'Grupo H', timeCasa:'Espanha', timeVisitante:'Cabo Verde', dataHora:'2026-06-15T14:00:00-03:00', local:'Mercedes-Benz Stadium, Atlanta', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo G', timeCasa:'Bélgica', timeVisitante:'Egito', dataHora:'2026-06-15T19:00:00-03:00', local:'Lumen Field, Seattle', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo H', timeCasa:'Arábia Saudita', timeVisitante:'Uruguai', dataHora:'2026-06-15T19:00:00-03:00', local:'Hard Rock Stadium, Miami', status:'agendado' },
    // 16/06
    { fase:'Fase de Grupos', grupo:'Grupo G', timeCasa:'Irã', timeVisitante:'Nova Zelândia', dataHora:'2026-06-16T01:00:00-03:00', local:'SoFi Stadium, Inglewood', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo I', timeCasa:'França', timeVisitante:'Senegal', dataHora:'2026-06-16T16:00:00-03:00', local:'MetLife Stadium, East Rutherford', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo I', timeCasa:'Iraque', timeVisitante:'Noruega', dataHora:'2026-06-16T19:00:00-03:00', local:'Gillette Stadium, Foxborough', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo J', timeCasa:'Argentina', timeVisitante:'Argélia', dataHora:'2026-06-16T21:00:00-03:00', local:'Arrowhead Stadium, Kansas City', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo J', timeCasa:'Áustria', timeVisitante:'Jordânia', dataHora:'2026-06-17T00:00:00-03:00', local:'Levi\'s Stadium, Santa Clara', status:'agendado' },
    // 17/06
    { fase:'Fase de Grupos', grupo:'Grupo K', timeCasa:'Portugal', timeVisitante:'RD Congo', dataHora:'2026-06-17T14:00:00-03:00', local:'NRG Stadium, Houston', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo L', timeCasa:'Inglaterra', timeVisitante:'Croácia', dataHora:'2026-06-17T17:00:00-03:00', local:'AT&T Stadium, Arlington', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo L', timeCasa:'Gana', timeVisitante:'Panamá', dataHora:'2026-06-17T20:00:00-03:00', local:'BMO Field, Toronto', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo K', timeCasa:'Uzbequistão', timeVisitante:'Colômbia', dataHora:'2026-06-17T23:00:00-03:00', local:'Estadio Azteca, Cidade do México', status:'agendado' },

    // ===== RODADA 2 =====
    // 18/06
    { fase:'Fase de Grupos', grupo:'Grupo A', timeCasa:'Tchéquia', timeVisitante:'África do Sul', dataHora:'2026-06-18T13:00:00-03:00', local:'Mercedes-Benz Stadium, Atlanta', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo B', timeCasa:'Bósnia e Herzegovina', timeVisitante:'Suíça', dataHora:'2026-06-18T16:00:00-03:00', local:'AT&T Stadium, Arlington', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo B', timeCasa:'Canadá', timeVisitante:'Catar', dataHora:'2026-06-18T19:00:00-03:00', local:'BC Place, Vancouver', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo A', timeCasa:'México', timeVisitante:'Coreia do Sul', dataHora:'2026-06-18T22:00:00-03:00', local:'Estadio Akron, Zapopan', status:'agendado' },
    // 19/06
    { fase:'Fase de Grupos', grupo:'Grupo C', timeCasa:'Marrocos', timeVisitante:'Escócia', dataHora:'2026-06-19T16:00:00-03:00', local:'SoFi Stadium, Inglewood', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo D', timeCasa:'EUA', timeVisitante:'Austrália', dataHora:'2026-06-19T16:00:00-03:00', local:'Lumen Field, Seattle', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo C', timeCasa:'Brasil', timeVisitante:'Haiti', dataHora:'2026-06-19T19:00:00-03:00', local:'MetLife Stadium, East Rutherford', status:'agendado' },
    // 20/06
    { fase:'Fase de Grupos', grupo:'Grupo D', timeCasa:'Turquia', timeVisitante:'Paraguai', dataHora:'2026-06-20T01:00:00-03:00', local:'Levi\'s Stadium, Santa Clara', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo F', timeCasa:'Holanda', timeVisitante:'Suécia', dataHora:'2026-06-20T14:00:00-03:00', local:'NRG Stadium, Houston', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo E', timeCasa:'Alemanha', timeVisitante:'Costa do Marfim', dataHora:'2026-06-20T17:00:00-03:00', local:'BMO Field, Toronto', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo E', timeCasa:'Equador', timeVisitante:'Curaçao', dataHora:'2026-06-20T21:00:00-03:00', local:'Arrowhead Stadium, Kansas City', status:'agendado' },
    // 21/06
    { fase:'Fase de Grupos', grupo:'Grupo F', timeCasa:'Tunísia', timeVisitante:'Japão', dataHora:'2026-06-21T01:00:00-03:00', local:'Estadio Akron, Zapopan', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo H', timeCasa:'Espanha', timeVisitante:'Arábia Saudita', dataHora:'2026-06-21T14:00:00-03:00', local:'Lincoln Financial Field, Philadelphia', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo G', timeCasa:'Bélgica', timeVisitante:'Irã', dataHora:'2026-06-21T19:00:00-03:00', local:'Lumen Field, Seattle', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo H', timeCasa:'Cabo Verde', timeVisitante:'Uruguai', dataHora:'2026-06-21T22:00:00-03:00', local:'Hard Rock Stadium, Miami', status:'agendado' },
    // 22/06
    { fase:'Fase de Grupos', grupo:'Grupo G', timeCasa:'Egito', timeVisitante:'Nova Zelândia', dataHora:'2026-06-22T01:00:00-03:00', local:'SoFi Stadium, Inglewood', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo J', timeCasa:'Argentina', timeVisitante:'Áustria', dataHora:'2026-06-22T14:00:00-03:00', local:'AT&T Stadium, Arlington', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo I', timeCasa:'França', timeVisitante:'Iraque', dataHora:'2026-06-22T18:00:00-03:00', local:'Lincoln Financial Field, Philadelphia', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo I', timeCasa:'Noruega', timeVisitante:'Senegal', dataHora:'2026-06-22T21:00:00-03:00', local:'MetLife Stadium, East Rutherford', status:'agendado' },
    // 23/06
    { fase:'Fase de Grupos', grupo:'Grupo J', timeCasa:'Jordânia', timeVisitante:'Argélia', dataHora:'2026-06-23T00:00:00-03:00', local:'Levi\'s Stadium, Santa Clara', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo K', timeCasa:'Portugal', timeVisitante:'Uzbequistão', dataHora:'2026-06-23T14:00:00-03:00', local:'NRG Stadium, Houston', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo L', timeCasa:'Inglaterra', timeVisitante:'Gana', dataHora:'2026-06-23T17:00:00-03:00', local:'Gillette Stadium, Foxborough', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo L', timeCasa:'Panamá', timeVisitante:'Croácia', dataHora:'2026-06-23T20:00:00-03:00', local:'BMO Field, Toronto', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo K', timeCasa:'Colômbia', timeVisitante:'RD Congo', dataHora:'2026-06-23T23:00:00-03:00', local:'Estadio Akron, Zapopan', status:'agendado' },

    // ===== RODADA 3 (simultâneos por grupo) =====
    // 25/06
    { fase:'Fase de Grupos', grupo:'Grupo A', timeCasa:'México', timeVisitante:'Tchéquia', dataHora:'2026-06-25T16:00:00-03:00', local:'Estadio Azteca, Cidade do México', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo A', timeCasa:'África do Sul', timeVisitante:'Coreia do Sul', dataHora:'2026-06-25T16:00:00-03:00', local:'Mercedes-Benz Stadium, Atlanta', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo B', timeCasa:'Canadá', timeVisitante:'Suíça', dataHora:'2026-06-25T21:00:00-03:00', local:'BC Place, Vancouver', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo B', timeCasa:'Bósnia e Herzegovina', timeVisitante:'Catar', dataHora:'2026-06-25T21:00:00-03:00', local:'MetLife Stadium, East Rutherford', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo D', timeCasa:'Turquia', timeVisitante:'EUA', dataHora:'2026-06-25T23:00:00-03:00', local:'SoFi Stadium, Inglewood', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo D', timeCasa:'Paraguai', timeVisitante:'Austrália', dataHora:'2026-06-25T23:00:00-03:00', local:'Levi\'s Stadium, Santa Clara', status:'agendado' },
    // 26/06
    { fase:'Fase de Grupos', grupo:'Grupo C', timeCasa:'Brasil', timeVisitante:'Escócia', dataHora:'2026-06-26T19:00:00-03:00', local:'NRG Stadium, Houston', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo C', timeCasa:'Marrocos', timeVisitante:'Haiti', dataHora:'2026-06-26T19:00:00-03:00', local:'Gillette Stadium, Foxborough', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo E', timeCasa:'Alemanha', timeVisitante:'Equador', dataHora:'2026-06-26T16:00:00-03:00', local:'AT&T Stadium, Arlington', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo E', timeCasa:'Curaçao', timeVisitante:'Costa do Marfim', dataHora:'2026-06-26T16:00:00-03:00', local:'Hard Rock Stadium, Miami', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo F', timeCasa:'Holanda', timeVisitante:'Tunísia', dataHora:'2026-06-26T22:00:00-03:00', local:'Lincoln Financial Field, Philadelphia', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo F', timeCasa:'Japão', timeVisitante:'Suécia', dataHora:'2026-06-26T22:00:00-03:00', local:'Lumen Field, Seattle', status:'agendado' },
    // 27/06
    { fase:'Fase de Grupos', grupo:'Grupo G', timeCasa:'Bélgica', timeVisitante:'Nova Zelândia', dataHora:'2026-06-27T16:00:00-03:00', local:'Mercedes-Benz Stadium, Atlanta', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo G', timeCasa:'Egito', timeVisitante:'Irã', dataHora:'2026-06-27T16:00:00-03:00', local:'Hard Rock Stadium, Miami', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo H', timeCasa:'Espanha', timeVisitante:'Uruguai', dataHora:'2026-06-27T20:00:00-03:00', local:'MetLife Stadium, East Rutherford', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo H', timeCasa:'Cabo Verde', timeVisitante:'Arábia Saudita', dataHora:'2026-06-27T20:00:00-03:00', local:'SoFi Stadium, Inglewood', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo I', timeCasa:'França', timeVisitante:'Noruega', dataHora:'2026-06-27T16:00:00-03:00', local:'Gillette Stadium, Foxborough', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo I', timeCasa:'Senegal', timeVisitante:'Iraque', dataHora:'2026-06-27T16:00:00-03:00', local:'Arrowhead Stadium, Kansas City', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo J', timeCasa:'Jordânia', timeVisitante:'Argentina', dataHora:'2026-06-27T23:00:00-03:00', local:'AT&T Stadium, Arlington', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo J', timeCasa:'Argélia', timeVisitante:'Áustria', dataHora:'2026-06-27T23:00:00-03:00', local:'Arrowhead Stadium, Kansas City', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo K', timeCasa:'Colômbia', timeVisitante:'Portugal', dataHora:'2026-06-27T20:30:00-03:00', local:'Hard Rock Stadium, Miami', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo K', timeCasa:'RD Congo', timeVisitante:'Uzbequistão', dataHora:'2026-06-27T20:30:00-03:00', local:'Mercedes-Benz Stadium, Atlanta', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo L', timeCasa:'Panamá', timeVisitante:'Inglaterra', dataHora:'2026-06-27T18:00:00-03:00', local:'MetLife Stadium, East Rutherford', status:'agendado' },
    { fase:'Fase de Grupos', grupo:'Grupo L', timeCasa:'Croácia', timeVisitante:'Gana', dataHora:'2026-06-27T18:00:00-03:00', local:'Lincoln Financial Field, Philadelphia', status:'agendado' },
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
