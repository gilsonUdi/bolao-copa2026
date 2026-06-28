import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';

// Webhook do Asaas — chamado quando um pagamento é confirmado
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(body.event)) {
      return NextResponse.json({ ok: true });
    }

    const payment = body.payment;
    if (!payment?.externalReference) return NextResponse.json({ ok: true });

    // externalReference = "grupo_CODIGO_user_TELEFONE"
    const ref: string = payment.externalReference;
    const userIdx = ref.indexOf('_user_');
    if (userIdx === -1) return NextResponse.json({ ok: true });

    const grupoId = ref.substring(0, userIdx);
    const usuarioId = ref.substring(userIdx + 1); // inclui "user_"

    if (!grupoId || !usuarioId) return NextResponse.json({ ok: true });

    // Marca membro como pago no grupo
    const grupoSnap = await getDoc(doc(db, 'grupos', grupoId));
    if (grupoSnap.exists()) {
      const grupo = grupoSnap.data();
      const membros = grupo.membros.map((m: { usuarioId: string; pago: boolean }) =>
        m.usuarioId === usuarioId ? { ...m, pago: true, asaasPaymentId: payment.id } : m
      );
      await updateDoc(grupoSnap.ref, { membros });
    }

    // Marca todas as apostas não pagas deste usuário/grupo como pagas
    const apostasSnap = await getDocs(
      query(
        collection(db, 'apostas'),
        where('grupoId', '==', grupoId),
        where('usuarioId', '==', usuarioId),
        where('pago', '==', false),
      )
    );
    await Promise.all(
      apostasSnap.docs.map((d) =>
        updateDoc(d.ref, { pago: true, asaasPaymentId: payment.id })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
