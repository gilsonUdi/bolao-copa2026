import { db } from './firebase';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  arrayUnion, query, where, Timestamp,
} from 'firebase/firestore';
import { Grupo, MembroGrupo, Aposta, Vencedor } from '@/types';

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
  senhaAdmin: string;
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
    jogosAtivos: [],
    vencedores: [],
    senhaAdmin: dados.senhaAdmin,
    status: 'aberto',
    criadoEm: new Date(),
  };

  // Cria o grupo
  await setDoc(doc(db, 'grupos', id), {
    ...grupo,
    criadoEm: Timestamp.fromDate(grupo.criadoEm),
    membros: grupo.membros.map((m) => ({ ...m, entradaEm: Timestamp.fromDate(m.entradaEm) })),
  });

  // Registra no índice dev (falha silenciosa — não afeta o grupo)
  try {
    await updateDoc(doc(db, 'meta', 'grupos'), { ids: arrayUnion(id) });
  } catch {
    // Se meta/grupos não existe ainda, cria
    try {
      await setDoc(doc(db, 'meta', 'grupos'), { ids: [id] }, { merge: true });
    } catch { /* ignora */ }
  }

  return grupo;
}

export async function listarTodosGrupos(): Promise<Grupo[]> {
  // Usa documento índice (meta/grupos) para evitar precisar de permissão list na collection
  const metaSnap = await getDoc(doc(db, 'meta', 'grupos'));
  if (!metaSnap.exists()) return [];
  const ids: string[] = metaSnap.data().ids || [];
  const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, 'grupos', id))));
  return snaps
    .filter((s) => s.exists())
    .map((s) => {
      const data = s.data()!;
      return {
        ...data,
        jogosAtivos: data.jogosAtivos ?? [],
        vencedores: data.vencedores ?? [],
        criadoEm: data.criadoEm?.toDate?.() ?? new Date(),
        membros: (data.membros ?? []).map((m: MembroGrupo & { entradaEm: Timestamp }) => ({
          ...m,
          entradaEm: (m.entradaEm as unknown as Timestamp)?.toDate?.() ?? new Date(),
        })),
      } as Grupo;
    });
}

export async function listarTodasApostas(): Promise<Aposta[]> {
  const snap = await getDocs(collection(db, 'apostas'));
  return snap.docs.map((d) => {
    const data = d.data();
    return { ...data, id: d.id, criadaEm: data.criadaEm.toDate(), atualizadaEm: data.atualizadaEm.toDate() } as Aposta;
  });
}

export async function buscarGrupo(codigo: string): Promise<Grupo | null> {
  const id = codigo.startsWith('grupo_') ? codigo : `grupo_${codigo}`;
  const snap = await getDoc(doc(db, 'grupos', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    jogosAtivos: data.jogosAtivos ?? [],
    vencedores: data.vencedores ?? [],
    criadoEm: data.criadoEm?.toDate?.() ?? new Date(),
    membros: (data.membros ?? []).map((m: MembroGrupo & { entradaEm: Timestamp }) => ({
      ...m,
      entradaEm: (m.entradaEm as unknown as Timestamp)?.toDate?.() ?? new Date(),
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
  // ID único por número de aposta — permite múltiplas por jogo
  const id = `${aposta.grupoId}_${aposta.usuarioId}_${aposta.jogoId}_${aposta.numero}`;
  await setDoc(doc(db, 'apostas', id), {
    ...aposta,
    criadaEm: Timestamp.fromDate(aposta.criadaEm),
    atualizadaEm: Timestamp.fromDate(aposta.atualizadaEm),
  }, { merge: true });
  return id;
}

export async function contarApostasJogo(grupoId: string, usuarioId: string, jogoId: number): Promise<number> {
  const q = query(
    collection(db, 'apostas'),
    where('grupoId', '==', grupoId),
    where('usuarioId', '==', usuarioId),
    where('jogoId', '==', jogoId),
  );
  const snap = await getDocs(q);
  return snap.size;
}

export async function marcarApostaPaga(apostaId: string, paymentId: string, invoiceUrl: string): Promise<void> {
  await setDoc(doc(db, 'apostas', apostaId), {
    pago: true,
    asaasPaymentId: paymentId,
    asaasInvoiceUrl: invoiceUrl,
    atualizadaEm: Timestamp.fromDate(new Date()),
  }, { merge: true });
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

export async function excluirAposta(apostaId: string): Promise<void> {
  await deleteDoc(doc(db, 'apostas', apostaId));
}

// pago=false: só salva o ID da cobrança (ainda não confirmado)
// pago=true: confirma o pagamento (chamado pelo webhook do Asaas)
// apostasCount: total de apostas no momento do pagamento — salvo para detectar apostas adicionais depois
export async function marcarPago(grupoId: string, usuarioId: string, asaasPaymentId: string, link: string, pago = false, apostasCount?: number): Promise<void> {
  const grupo = await buscarGrupo(grupoId.replace('grupo_', ''));
  if (!grupo) return;

  const membrosAtualizados = grupo.membros.map((m) => {
    if (m.usuarioId !== usuarioId) {
      return { ...m, entradaEm: Timestamp.fromDate(m.entradaEm) };
    }
    const atualizado: Record<string, unknown> = {
      ...m,
      pago: m.pago || pago, // nunca rebaixa de true para false
      asaasPaymentId,
      asaasPaymentLink: link,
      entradaEm: Timestamp.fromDate(m.entradaEm),
    };
    if (apostasCount !== undefined) {
      if (!m.pago) {
        // Primeiro pagamento: salva quantas apostas foram cobertas
        atualizado.apostasNoPagamento = apostasCount;
      } else {
        // Pagamento adicional: atualiza o total de apostas já pagas
        atualizado.apostasPatias = apostasCount;
      }
    }
    return atualizado;
  });

  await updateDoc(doc(db, 'grupos', grupoId), { membros: membrosAtualizados });
}

// Membro cadastra sua chave PIX
export async function salvarChavePix(grupoId: string, usuarioId: string, chavePix: string, tipoChavePix: string): Promise<void> {
  const grupo = await buscarGrupo(grupoId.replace('grupo_', ''));
  if (!grupo) return;
  const membrosAtualizados = grupo.membros.map((m) =>
    m.usuarioId === usuarioId
      ? { ...m, chavePix, tipoChavePix, entradaEm: Timestamp.fromDate(m.entradaEm) }
      : { ...m, entradaEm: Timestamp.fromDate(m.entradaEm) }
  );
  await updateDoc(doc(db, 'grupos', grupoId), { membros: membrosAtualizados });
}

// Admin ativa ou desativa um jogo para apostas
export async function toggleJogoAtivo(grupoId: string, jogoId: number, ativar: boolean): Promise<void> {
  const grupoRef = doc(db, 'grupos', grupoId);
  const snap = await getDoc(grupoRef);
  if (!snap.exists()) return;
  const jogosAtivos: number[] = snap.data().jogosAtivos || [];
  const novos = ativar
    ? [...new Set([...jogosAtivos, jogoId])]
    : jogosAtivos.filter((id) => id !== jogoId);
  await updateDoc(grupoRef, { jogosAtivos: novos });
}

// Admin declara os vencedores e distribui o prêmio
export async function salvarVencedores(grupoId: string, vencedores: Vencedor[]): Promise<void> {
  await updateDoc(doc(db, 'grupos', grupoId), { vencedores });
}

// Marca vencedor como pago
export async function marcarVencedorPago(grupoId: string, posicao: number, asaasTransferId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'grupos', grupoId));
  if (!snap.exists()) return;
  const vencedores: Vencedor[] = snap.data().vencedores || [];
  const atualizados = vencedores.map((v) =>
    v.posicao === posicao ? { ...v, premioPago: true, asaasTransferId } : v
  );
  await updateDoc(doc(db, 'grupos', grupoId), { vencedores: atualizados });
}
