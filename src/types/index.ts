export interface Usuario {
  id: string;
  nome: string;
  telefone: string;
  criadoEm: Date;
}

export interface Grupo {
  id: string;
  nome: string;
  codigo: string;
  adminId: string;
  adminNome: string;
  valorAposta: number;
  descricao?: string;
  membros: MembroGrupo[];
  jogosAtivos: number[];
  vencedores: Vencedor[];
  senhaAdmin: string; // hash da senha do admin
  status: 'aberto' | 'fechado' | 'encerrado';
  criadoEm: Date;
}

export interface Vencedor {
  posicao: number; // 1, 2, 3
  usuarioId: string;
  nome: string;
  telefone: string;
  pontos: number;
  premioValor: number;
  premioPago: boolean;
  asaasTransferId?: string;
}

export interface MembroGrupo {
  usuarioId: string;
  nome: string;
  telefone: string;
  pago: boolean;
  apostasNoPagamento?: number; // qtd de apostas cobertas no primeiro pagamento
  apostasPatias?: number;       // total acumulado de apostas já pagas (incluindo adicionais)
  chavePix?: string;
  tipoChavePix?: 'CPF' | 'PHONE' | 'EMAIL' | 'EVP';
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
  numero: number;        // nº da aposta: 1, 2, 3...
  golsCasaPrevisto: number;
  golsVisitantePrevisto: number;
  pago: boolean;         // pagamento desta aposta confirmado
  asaasPaymentId?: string;
  asaasInvoiceUrl?: string;
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
