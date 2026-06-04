import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

// Webhook do Asaas — chamado quando um pagamento é confirmado
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Asaas envia eventos como PAYMENT_RECEIVED, PAYMENT_CONFIRMED
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

    // Atualiza o grupo marcando o membro como pago
    const gruposSnap = await getDocs(
      query(collection(db, 'grupos'), where('__name__', '==', grupoId))
    );

    for (const doc of gruposSnap.docs) {
      const grupo = doc.data();
      const membros = grupo.membros.map((m: { usuarioId: string; pago: boolean }) =>
        m.usuarioId === usuarioId ? { ...m, pago: true, asaasPaymentId: payment.id } : m
      );
      await updateDoc(doc.ref, { membros });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
