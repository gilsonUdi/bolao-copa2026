import { NextRequest, NextResponse } from 'next/server';
import { listarTodosGrupos, listarTodasApostas } from '@/lib/grupos';

export async function GET(req: NextRequest) {
  const senha = req.nextUrl.searchParams.get('senha');
  if (!senha || senha !== process.env.DEV_PASSWORD) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const [grupos, apostas] = await Promise.all([
    listarTodosGrupos(),
    listarTodasApostas(),
  ]);

  const stats = grupos.map((g) => {
    const apostasGrupo = apostas.filter((a) => a.grupoId === g.id);
    const membrosPageos = g.membros.filter((m) => m.pago);
    const totalArrecadado = membrosPageos.reduce((acc, m) => {
      const qtd = apostasGrupo.filter((a) => a.usuarioId === m.usuarioId).length;
      return acc + (qtd > 0 ? qtd : 1) * g.valorAposta;
    }, 0);

    return {
      id: g.id,
      nome: g.nome,
      codigo: g.codigo,
      adminNome: g.adminNome,
      status: g.status,
      valorAposta: g.valorAposta,
      criadoEm: g.criadoEm,
      totalMembros: g.membros.length,
      totalPageos: membrosPageos.length,
      totalApostas: apostasGrupo.length,
      totalArrecadado,
      premioEstimado: totalArrecadado * 0.9,
      membros: g.membros.map((m) => ({
        nome: m.nome,
        telefone: m.telefone,
        pago: m.pago,
        apostas: apostasGrupo.filter((a) => a.usuarioId === m.usuarioId).length,
        valorDevido: (() => {
          const qtd = apostasGrupo.filter((a) => a.usuarioId === m.usuarioId).length;
          return (qtd > 0 ? qtd : 1) * g.valorAposta;
        })(),
      })),
    };
  }).sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());

  return NextResponse.json({ grupos: stats });
}
