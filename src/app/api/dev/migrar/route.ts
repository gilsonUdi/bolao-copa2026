import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

// Popula meta/grupos com os IDs de todos os grupos existentes no Firestore
export async function POST(req: NextRequest) {
  const senha = req.nextUrl.searchParams.get('senha');
  if (!senha || senha !== process.env.DEV_PASSWORD) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const snap = await getDocs(collection(db, 'grupos'));
    const ids = snap.docs.map((d) => d.id);

    await setDoc(doc(db, 'meta', 'grupos'), { ids }, { merge: false });

    return NextResponse.json({ ok: true, total: ids.length, ids });
  } catch (err) {
    console.error('Erro na migração:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
