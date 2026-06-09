import { NextRequest, NextResponse } from 'next/server';
import { criarGrupo, buscarGrupo } from '@/lib/grupos';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, adminNome, adminTelefone, valorAposta, descricao, senhaAdmin } = body;

    if (!nome || !adminNome || !adminTelefone || !valorAposta || !senhaAdmin) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const adminId = `user_${adminTelefone.replace(/\D/g, '')}`;

    const grupo = await criarGrupo({
      nome,
      adminId,
      adminNome,
      adminTelefone,
      valorAposta: Number(valorAposta),
      descricao,
      senhaAdmin,
    });

    return NextResponse.json({ grupo });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao criar grupo' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const codigo = req.nextUrl.searchParams.get('codigo');
  if (!codigo) return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 });

  try {
    const grupo = await buscarGrupo(codigo);
    if (!grupo) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    return NextResponse.json({ grupo });
  } catch (err) {
    console.error('Erro ao buscar grupo:', err);
    return NextResponse.json({ error: 'Erro interno ao buscar grupo' }, { status: 500 });
  }
}
