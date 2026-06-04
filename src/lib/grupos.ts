import { db } from './firebase';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  arrayUnion, query, where, Timestamp,
} from 'firebase/firestore';
import { Grupo, MembroGrupo, Aposta } from '@/types';

function gerarCodigo(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function criarGrupo(dados: {
  nome: string;
  adminId: string;
  adminNome: string;
  adminTelefone: string;
  valorAposta: number;
  descricao?: string;
}): Promise<Grupo> {
  const codigo = gerarCodigo();
  const id = `grupo_${codigo}`;

  const membro: MembroGrupo = {
    usuarioId: dados.adminId,
    nome: dados.adminNome,
    telefone: dados.adminTelefone,
    pago: false,
    entradaEm: new Date(),
  };

  const grupo: Grupo = {
    id,
    nome: dados.nome,
    codigo,
    adminId: dados.adminId,
    adminNome: dados.adminNome,
    valorAposta: dados.valorAposta,
    descricao: dados.descricao,
    membros: [membro],
    status: 'aberto',
    criadoEm: new Date(),
  };

  await setDoc(doc(db, 'grupos', id), {
    ...grupo,
    criadoEm: Timestamp.fromDate(grupo.criadoEm),
    membros: grupo.membros.map((m) => ({ ...m, entradaEm: Timestamp.fromDate(m.entradaEm) })),
  });

  return grupo;
}

export async function buscarGrupo(codigo: string): Promise<Grupo | null> {
  const id = codigo.startsWith('grupo_') ? codigo : `grupo_${codigo}`;
  const snap = await getDoc(doc(db, 'grupos', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    criadoEm: data.criadoEm.toDate(),
    membros: data.membros.map((m: MembroGrupo & { entradaEm: Timestamp }) => ({
      ...m,
      entradaEm: (m.entradaEm as unknown as Timestamp).toDate(),
    })),
  } as Grupo;
}

export async function entrarNoGrupo(codigo: string, membro: Omit<MembroGrupo, 'entradaEm'>): Promise<void> {
  const id = `grupo_${codigo}`;
  const novoMembro = { ...membro, entradaEm: Timestamp.fromDate(new Date()) };
  await updateDoc(doc(db, 'grupos', id), {
    membros: arrayUnion(novoMembro),
  });
}

export async function salvarAposta(aposta: Omit<Aposta, 'id' | 'pontos'>): Promise<string> {
  const id = `${aposta.grupoId}_${aposta.usuarioId}_${aposta.jogoId}`;
  await setDoc(doc(db, 'apostas', id), {
    ...aposta,
    criadaEm: Timestamp.fromDate(aposta.criadaEm),
    atualizadaEm: Timestamp.fromDate(aposta.atualizadaEm),
  }, { merge: true });
  return id;
}

export async function buscarApostasGrupo(grupoId: string): Promise<Aposta[]> {
  const q = query(collection(db, 'apostas'), where('grupoId', '==', grupoId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      criadaEm: data.criadaEm.toDate(),
      atualizadaEm: data.atualizadaEm.toDate(),
    } as Aposta;
  });
}

export async function buscarApostasUsuario(grupoId: string, usuarioId: string): Promise<Aposta[]> {
  const q = query(
    collection(db, 'apostas'),
    where('grupoId', '==', grupoId),
    where('usuarioId', '==', usuarioId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return { ...data, id: d.id, criadaEm: data.criadaEm.toDate(), atualizadaEm: data.atualizadaEm.toDate() } as Aposta;
  });
}

// pago=false: só salva o ID da cobrança (ainda não confirmado)
// pago=true: confirma o pagamento (chamado pelo webhook do Asaas)
export async function marcarPago(grupoId: string, usuarioId: string, asaasPaymentId: string, link: string, pago = false): Promise<void> {
  const grupo = await buscarGrupo(grupoId.replace('grupo_', ''));
  if (!grupo) return;

  const membrosAtualizados = grupo.membros.map((m) =>
    m.usuarioId === usuarioId
      ? { ...m, pago, asaasPaymentId, asaasPaymentLink: link, entradaEm: Timestamp.fromDate(m.entradaEm) }
      : { ...m, entradaEm: Timestamp.fromDate(m.entradaEm) }
  );

  await updateDoc(doc(db, 'grupos', grupoId), { membros: membrosAtualizados });
}
