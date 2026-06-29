import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';

// Webhook da OpenPix — chamado quando um pagamento PIX é confirmado
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // OpenPix envia OPENPIX:CHARGE_COMPLETED quando pago
    if (body.event !== 'OPENPIX:CHARGE_COMPLETED') {
      return NextResponse.json({ ok: true });
    }

    const charge = body.charge;
    if (!charge?.correlationID) return NextResponse.json({ ok: true });

    // correlationID = "grupo_CODIGO_user_TELEFONE_TIMESTAMP"
    const ref: string = charge.correlationID;
    const userIdx = ref.indexOf('_user_');
    if (userIdx === -1) return NextResponse.json({ ok: true });

    const grupoId = ref.substring(0, userIdx);
    // Extrai usuarioId: remove o timestamp final (último _DIGITOS)
    const restante = ref.substring(userIdx + 1); // "user_TELEFONE_TIMESTAMP"
    const lastUnderscore = restante.lastIndexOf('_');
    const usuarioId = lastUnderscore > 4 ? restante.substring(0, lastUnderscore) : restante;

    if (!grupoId || !usuarioId) return NextResponse.json({ ok: true });

    // Marca membro como pago no grupo
    const grupoSnap = await getDoc(doc(db, 'grupos', grupoId));
    if (grupoSnap.exists()) {
      const grupo = grupoSnap.data();
      const membros = grupo.membros.map((m: { usuarioId: string; pago: boolean }) =>
        m.usuarioId === usuarioId ? { ...m, pago: true, asaasPaymentId: charge.correlationID } : m
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
        updateDoc(d.ref, { pago: true, asaasPaymentId: charge.correlationID })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
