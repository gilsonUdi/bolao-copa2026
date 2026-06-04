'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Grupo, Jogo } from '@/types';

interface Usuario { id: string; nome: string; telefone: string; }

export default function AdminPage() {
  const params = useParams();
  const router = useRouter();
  const codigo = params.codigo as string;

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [atualizandoJogo, setAtualizandoJogo] = useState<number | null>(null);
  const [placarEdit, setPlacarEdit] = useState<Record<number, { casa: string; visitante: string }>>({});

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const linkGrupo = `${siteUrl}/grupo/${codigo}`;

  useEffect(() => {
    const u = localStorage.getItem('bolao_usuario');
    if (!u) { router.push('/'); return; }
    setUsuario(JSON.parse(u));
  }, [router]);

  const carregarDados = useCallback(async () => {
    try {
      const [gRes, jRes] = await Promise.all([
        fetch(`/api/grupos?codigo=${codigo}`),
        fetch('/api/jogos'),
      ]);
      const gData = await gRes.json();
      const jData = await jRes.json();
      setGrupo(gData.grupo);
      setJogos(jData.jogos || []);
    } finally {
      setLoading(false);
    }
  }, [codigo]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // Verifica se é admin
  useEffect(() => {
    if (grupo && usuario && grupo.adminId !== usuario.id) {
      router.push(`/grupo/${codigo}`);
    }
  }, [grupo, usuario, codigo, router]);

  function copiarLink() {
    navigator.clipboard.writeText(linkGrupo);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2000);
  }

  function mensagemWhatsApp() {
    const totalPago = grupo?.membros.filter(m => m.pago).length || 0;
    const premioEstimado = ((grupo?.membros.length || 0) * (grupo?.valorAposta || 0) * 0.9).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const msg = encodeURIComponent(
      `🏆 *Bolão Copa 2026 - ${grupo?.nome}*\n\n` +
      `⚽ Entre no nosso bolão da Copa!\n` +
      `💰 Valor: R$ ${grupo?.valorAposta},00 por pessoa\n` +
      `🎁 Prêmio estimado: R$ ${premioEstimado}\n\n` +
      `📲 Acesse agora:\n${linkGrupo}\n\n` +
      `Código do grupo: *${codigo}*`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  async function atualizarPlacar(jogo: Jogo) {
    const p = placarEdit[jogo.id];
    if (!p || p.casa === '' || p.visitante === '') return;
    setAtualizandoJogo(jogo.id);
    try {
      await fetch(`/api/jogos/${jogo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ golsCasa: Number(p.casa), golsVisitante: Number(p.visitante), status: 'encerrado' }),
      });
      await carregarDados();
    } finally {
      setAtualizandoJogo(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <div className="text-5xl animate-bounce">⚽</div>
      </div>
    );
  }

  if (!grupo || !usuario) return null;

  const membrosPageos = grupo.membros.filter(m => m.pago);
  const totalArrecadado = membrosPageos.length * grupo.valorAposta;
  const premioEstimado = totalArrecadado * 0.9;

  return (
    <div className="min-h-screen hero-gradient flex flex-col">
      {/* Header Admin */}
      <header className="px-4 py-4" style={{background:'rgba(13,31,60,0.95)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(244,168,29,0.3)'}}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:'rgba(244,168,29,0.2)', color:'#F4A81D'}}>👑 ADMIN</span>
            </div>
            <h1 className="font-black text-xl mt-1" style={{color:'#F4A81D'}}>{grupo.nome}</h1>
          </div>
          <button
            className="text-white/50 hover:text-white text-sm transition-colors"
            onClick={() => router.push(`/grupo/${codigo}`)}
          >
            Ver como membro →
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">

        {/* Cards de stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card-copa p-3 text-center">
            <p className="text-2xl font-black">{grupo.membros.length}</p>
            <p className="text-white/40 text-xs mt-1">Membros</p>
          </div>
          <div className="card-copa p-3 text-center">
            <p className="text-2xl font-black" style={{color:'#4ade80'}}>{membrosPageos.length}</p>
            <p className="text-white/40 text-xs mt-1">Pagos</p>
          </div>
          <div className="card-copa p-3 text-center">
            <p className="text-lg font-black" style={{color:'#F4A81D'}}>R${premioEstimado.toLocaleString('pt-BR',{maximumFractionDigits:0})}</p>
            <p className="text-white/40 text-xs mt-1">Prêmio</p>
          </div>
        </div>

        {/* Compartilhar link */}
        <div className="card-copa p-5 mb-5">
          <h2 className="font-bold mb-3" style={{color:'#F4A81D'}}>🔗 Compartilhar Bolão</h2>
          <div className="flex items-center gap-2 mb-3 p-3 rounded-lg" style={{background:'rgba(0,0,0,0.3)'}}>
            <code className="flex-1 text-xs text-white/70 break-all">{linkGrupo}</code>
          </div>
          <div className="flex gap-2">
            <button className="btn-copa flex-1 py-2 text-sm" onClick={copiarLink}>
              {linkCopiado ? '✅ Copiado!' : '📋 Copiar Link'}
            </button>
            <button className="btn-verde flex-1 py-2 text-sm" onClick={mensagemWhatsApp}>
              📲 Enviar via WhatsApp
            </button>
          </div>
          <div className="mt-3 text-center">
            <p className="text-white/40 text-xs">Código do grupo:</p>
            <p className="font-mono font-black text-2xl tracking-widest mt-1" style={{color:'#F4A81D'}}>{codigo}</p>
          </div>
        </div>

        {/* Pagamentos */}
        <div className="card-copa p-5 mb-5">
          <h2 className="font-bold mb-3" style={{color:'#F4A81D'}}>💰 Financeiro</h2>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Total arrecadado ({membrosPageos.length} pagos)</span>
              <span className="font-bold">R$ {totalArrecadado.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Prêmio (90%)</span>
              <span className="font-bold" style={{color:'#4ade80'}}>R$ {premioEstimado.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
            </div>
          </div>

          <h3 className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Status por membro</h3>
          {grupo.membros.map((m) => (
            <div key={m.usuarioId} className="flex items-center justify-between py-2" style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <div>
                <p className="text-sm font-medium">{m.nome}</p>
                <p className="text-xs text-white/30">{m.telefone}</p>
              </div>
              <div className="flex items-center gap-2">
                {m.pago ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">✓ Pago</span>
                ) : (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">Pendente</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Atualizar placares */}
        <div className="card-copa p-5">
          <h2 className="font-bold mb-1" style={{color:'#F4A81D'}}>⚽ Atualizar Resultados</h2>
          <p className="text-white/40 text-xs mb-4">Informe o placar final dos jogos para calcular a pontuação</p>

          {jogos.filter(j => j.status !== 'encerrado').slice(0, 10).map((jogo) => {
            const p = placarEdit[jogo.id] || { casa: '', visitante: '' };
            return (
              <div key={jogo.id} className="mb-3 p-3 rounded-lg" style={{background:'rgba(255,255,255,0.04)'}}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{jogo.timeCasa} x {jogo.timeVisitante}</span>
                  {jogo.status === 'ao_vivo' && <span className="text-xs text-red-400 font-bold">🔴 AO VIVO</span>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" max="20"
                    className="placar-input"
                    placeholder="0"
                    value={p.casa}
                    onChange={e => setPlacarEdit(prev => ({...prev, [jogo.id]: {...p, casa: e.target.value}}))}
                  />
                  <span className="text-white/30">x</span>
                  <input
                    type="number" min="0" max="20"
                    className="placar-input"
                    placeholder="0"
                    value={p.visitante}
                    onChange={e => setPlacarEdit(prev => ({...prev, [jogo.id]: {...p, visitante: e.target.value}}))}
                  />
                  <button
                    className="btn-copa px-4 py-2 text-sm ml-auto"
                    disabled={atualizandoJogo === jogo.id || p.casa === '' || p.visitante === ''}
                    onClick={() => atualizarPlacar(jogo)}
                  >
                    {atualizandoJogo === jogo.id ? '⏳' : '✓ Confirmar'}
                  </button>
                </div>
              </div>
            );
          })}

          {jogos.filter(j => j.status === 'encerrado').length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Jogos encerrados</h3>
              {jogos.filter(j => j.status === 'encerrado').map((jogo) => (
                <div key={jogo.id} className="flex items-center justify-between py-2 text-sm" style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                  <span className="text-white/60">{jogo.timeCasa} x {jogo.timeVisitante}</span>
                  <span className="font-bold" style={{color:'#4ade80'}}>{jogo.golsCasa} x {jogo.golsVisitante}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
