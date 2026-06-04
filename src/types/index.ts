export interface Usuario {
  id: string;
  nome: string;
  telefone: string;
  criadoEm: Date;
}

export interface Grupo {
  id: string;
  nome: string;
  codigo: string; // código único de 6 chars para join
  adminId: string;
  adminNome: string;
  valorAposta: number; // valor por participante
  descricao?: string;
  membros: MembroGrupo[];
  status: 'aberto' | 'fechado' | 'encerrado';
  criadoEm: Date;
}

export interface MembroGrupo {
  usuarioId: string;
  nome: string;
  telefone: string;
  pago: boolean;
  asaasPaymentId?: string;
  asaasPaymentLink?: string;
  entradaEm: Date;
}

export interface Jogo {
  id: number;
  fase: string; // 'Fase de Grupos' | 'Oitavas' | 'Quartas' | 'Semifinal' | 'Final'
  grupo?: string; // 'A', 'B', etc — apenas na fase de grupos
  timeCasa: string;
  timeVisitante: string;
  bandeiraCasa: string;
  bandeiraVisitante: string;
  dataHora: string; // ISO string
  local: string;
  golsCasa?: number;
  golsVisitante?: number;
  status: 'agendado' | 'ao_vivo' | 'encerrado' | 'adiado';
}

export interface Aposta {
  id: string;
  grupoId: string;
  usuarioId: string;
  usuarioNome: string;
  jogoId: number;
  golsCasaPrevisto: number;
  golsVisitantePrevisto: number;
  pontos?: number;
  criadaEm: Date;
  atualizadaEm: Date;
}

export interface Ranking {
  usuarioId: string;
  nome: string;
  pontos: number;
  acertosExatos: number;
  acertosVencedor: number;
  apostasTotal: number;
  posicao: number;
}

export interface Pagamento {
  id: string;
  grupoId: string;
  usuarioId: string;
  asaasId: string;
  valor: number;
  link: string;
  status: 'pendente' | 'confirmado' | 'cancelado';
  criadoEm: Date;
}
