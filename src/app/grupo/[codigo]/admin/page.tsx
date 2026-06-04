'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Grupo, Jogo, Ranking, Vencedor } from '@/types';

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
  const [togglingJogo, setTogglingJogo] = useState<number | null>(null);
  const [ranking, setRanking] = useState<Ranking[]>([]);
  const [premioTotal, setPremioTotal] = useState(0);
  const [vencedoresDeclarados, setVencedoresDeclarados] = useState<Vencedor[]>([]);
  const [pagandoVencedor, setPagandoVencedor] = useState<number | null>(null);
  const [modoAuditoria, setModoAuditoria] = useState(false);
  const [vencedoresPreview, setVencedoresPreview] = useState<Vencedor[]>([]);
  const [abaAdmin, setAbaAdmin] = useState<'compartilhar'|'jogos'|'vencedores'|'financeiro'>('compartilhar');

  // Autenticação do admin
  const [autenticado, setAutenticado] = useState(false);
  const [senhaInput, setSenhaInput] = useState('');
  const [senhaErro, setSenhaErro] = useState('');
  const [verificandoSenha, setVerificandoSenha] = useState(false);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || '');
  const linkGrupo = `${siteUrl}/grupo/${codigo}`;
  const SESSION_KEY = `admin_auth_${codigo}`;

  useEffect(() => {
    const u = localStorage.getItem('bolao_usuario');
    if (!u) { router.push('/'); return; }
    setUsuario(JSON.parse(u));
    // Verifica se já está autenticado nesta sessão
    if (sessionStorage.getItem(SESSION_KEY) === 'true') setAutenticado(true);
  }, [router, SESSION_KEY]);

  const carregarDados = useCallback(async () => {
    try {
      const [gRes, jRes, rRes] = await Promise.all([
        fetch(`/api/grupos?codigo=${codigo}`),
        fetch('/api/jogos'),
        fetch(`/api/admin/vencedores?grupoId=grupo_${codigo}`),
      ]);
      const gData = await gRes.json();
      const jData = await jRes.json();
      const rData = await rRes.json();
      setGrupo(gData.grupo);
      setJogos(jData.jogos || []);
      setRanking(rData.ranking || []);
      setPremioTotal(rData.premioTotal || 0);
      setVencedoresDeclarados(rData.vencedoresDeclarados || []);
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

  async function toggleJogo(jogoId: number, ativar: boolean) {
    setTogglingJogo(jogoId);
    try {
      await fetch('/api/admin/jogos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grupoId: `grupo_${codigo}`, jogoId, ativar }),
      });
      await carregarDados();
    } finally {
      setTogglingJogo(null);
    }
  }

  function abrirAuditoria() {
    if (!grupo || ranking.length === 0) return;
    const membrosPageos = grupo.membros.filter(m => m.pago);
    const totalPago = membrosPageos.length * grupo.valorAposta * 0.9;
    const percents = [0.6, 0.3, 0.1];
    const top3 = ranking.slice(0, 3);
    const preview: Vencedor[] = top3.map((r, i) => {
      const membro = grupo.membros.find(m => m.usuarioId === r.usuarioId);
      return {
        posicao: i + 1,
        usuarioId: r.usuarioId,
        nome: r.nome,
        telefone: membro?.telefone || '',
        pontos: r.pontos,
        premioValor: Math.round(totalPago * percents[i] * 100) / 100,
        premioPago: false,
      };
    });
    setVencedoresPreview(preview);
    setModoAuditoria(true);
  }

  async function declararVencedores() {
    if (!grupo) return;
    const membrosPageos = grupo.membros.filter(m => m.pago);
    const totalPago = membrosPageos.length * grupo.valorAposta * 0.9;
    // Distribui: 60% 1º, 30% 2º, 10% 3º
    const top3 = ranking.slice(0, 3);
    const percents = [0.6, 0.3, 0.1];
    const vencedores: Vencedor[] = top3.map((r, i) => {
      const membro = grupo.membros.find(m => m.usuarioId === r.usuarioId);
      return {
        posicao: i + 1,
        usuarioId: r.usuarioId,
        nome: r.nome,
        telefone: membro?.telefone || '',
        pontos: r.pontos,
        premioValor: Math.round(totalPago * percents[i] * 100) / 100,
        premioPago: false,
      };
    });
    await fetch('/api/admin/vencedores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grupoId: `grupo_${codigo}`, acao: 'declarar', vencedores }),
    });
    await carregarDados();
  }

  async function pagarVencedor(posicao: number) {
    setPagandoVencedor(posicao);
    try {
      const res = await fetch('/api/admin/vencedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grupoId: `grupo_${codigo}`, acao: 'pagar', posicao }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`✅ PIX enviado! ID: ${data.transferenciaId}`);
      await carregarDados();
    } catch (err: unknown) {
      alert(`Erro: ${err instanceof Error ? err.message : 'Falha ao pagar'}`);
    } finally {
      setPagandoVencedor(null);
    }
  }

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

  async function verificarSenha(e: React.FormEvent) {
    e.preventDefault();
    setSenhaErro('');
    setVerificandoSenha(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, senha: senhaInput }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        setAutenticado(true);
      } else {
        setSenhaErro('Senha incorreta. Tente novamente.');
        setSenhaInput('');
      }
    } catch {
      setSenhaErro('Erro ao verificar senha.');
    } finally {
      setVerificandoSenha(false);
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

  // Tela de senha do admin
  if (!autenticado) {
    return (
      <div className="min-h-screen hero-gradient flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔐</div>
            <h1 className="text-2xl font-black" style={{color:'#F4A81D'}}>Painel do Admin</h1>
            <p className="text-white/50 text-sm mt-1">{grupo?.nome || codigo}</p>
          </div>

          <form onSubmit={verificarSenha} className="card-copa p-6 flex flex-col gap-4">
            <div>
              <label className="text-white/60 text-xs block mb-2 uppercase tracking-wide">Senha do Administrador</label>
              <input
                className="input-copa"
                type="password"
                placeholder="Digite a senha do admin"
                value={senhaInput}
                onChange={e => setSenhaInput(e.target.value)}
                autoFocus
                required
              />
            </div>

            {senhaErro && (
              <p className="text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-2">
                🚫 {senhaErro}
              </p>
            )}

            <button type="submit" className="btn-copa" disabled={verificandoSenha || !senhaInput}>
              {verificandoSenha ? '⏳ Verificando...' : '🔓 Entrar no Admin'}
            </button>

            <button
              type="button"
              className="text-white/30 text-sm text-center hover:text-white/60 transition-colors"
              onClick={() => router.push(`/grupo/${codigo}`)}
            >
              ← Voltar para o grupo
            </button>
          </form>
        </div>
      </div>
    );
  }

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
            onClick={() => {
              sessionStorage.removeItem(SESSION_KEY);
              router.push(`/grupo/${codigo}`);
            }}
          >
            Sair do admin →
          </button>
        </div>
      </header>

      {/* Abas admin */}
      <div className="px-4 pt-2" style={{background:'rgba(13,31,60,0.95)', borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
        <div className="max-w-2xl mx-auto flex overflow-x-auto">
          {([
            {id:'compartilhar', label:'🔗 Link'},
            {id:'jogos', label:'⚽ Liberar Jogos'},
            {id:'vencedores', label:'🏆 Vencedores'},
            {id:'financeiro', label:'💰 Financeiro'},
          ] as {id: typeof abaAdmin, label: string}[]).map(a => (
            <button key={a.id} onClick={() => setAbaAdmin(a.id)}
              className="flex-shrink-0 px-4 py-3 text-sm font-bold transition-all whitespace-nowrap"
              style={abaAdmin === a.id ? {color:'#F4A81D', borderBottom:'2px solid #F4A81D'} : {color:'rgba(255,255,255,0.35)'}}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

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

        {/* ABA: Compartilhar */}
        {abaAdmin === 'compartilhar' && <div className="card-copa p-5 mb-5">
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
        </div>}

        {/* ABA: Liberar Jogos */}
        {abaAdmin === 'jogos' && <div className="card-copa p-5 mb-5">
          <h2 className="font-bold mb-1" style={{color:'#F4A81D'}}>⚽ Liberar Jogos para Apostas</h2>
          <p className="text-white/40 text-xs mb-4">Ative os jogos que os membros poderão apostar. Apenas jogos liberados aparecem para eles.</p>

          {jogos.filter(j => j.status !== 'encerrado').map((jogo) => {
            const ativo = (grupo.jogosAtivos || []).includes(jogo.id);
            return (
              <div key={jogo.id} className="flex items-center justify-between py-3 gap-3" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{jogo.timeCasa} x {jogo.timeVisitante}</p>
                  <p className="text-xs text-white/30">{jogo.grupo} · {new Date(jogo.dataHora).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', timeZone:'America/Sao_Paulo'})}</p>
                </div>
                <button
                  disabled={togglingJogo === jogo.id}
                  onClick={() => toggleJogo(jogo.id, !ativo)}
                  className="flex-shrink-0 px-4 py-2 rounded-lg font-bold text-sm transition-all"
                  style={ativo
                    ? {background:'rgba(74,222,128,0.2)', color:'#4ade80', border:'1px solid rgba(74,222,128,0.4)'}
                    : {background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.1)'}
                  }
                >
                  {togglingJogo === jogo.id ? '⏳' : ativo ? '✅ Liberado' : '🔒 Liberar'}
                </button>
              </div>
            );
          })}
          <p className="text-xs text-white/30 mt-3">
            {(grupo.jogosAtivos || []).length} jogo(s) liberado(s) para apostas
          </p>
        </div>}

        {/* ABA: Vencedores */}
        {abaAdmin === 'vencedores' && <div className="card-copa p-5 mb-5">
          <h2 className="font-bold mb-1" style={{color:'#F4A81D'}}>🏆 Declarar Vencedores e Pagar Prêmio</h2>
          <p className="text-white/40 text-xs mb-4">
            Prêmio disponível: <strong className="text-white">R$ {premioTotal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong>
            {' '}(distribuído: 60% · 30% · 10%)
          </p>

          {ranking.length === 0 ? (
            <p className="text-white/30 text-center py-4">Nenhum jogo encerrado ainda — o ranking aparecerá conforme os placares forem registrados.</p>
          ) : (
            <>
              {/* Ranking atual */}
              <div className="mb-4">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Ranking atual</h3>
                {ranking.slice(0,5).map((r) => (
                  <div key={r.usuarioId} className="flex items-center justify-between py-2" style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-center font-black text-sm" style={{color: r.posicao===1?'#F4A81D':r.posicao===2?'#C0C0C0':r.posicao===3?'#CD7F32':'rgba(255,255,255,0.4)'}}>
                        {r.posicao}º
                      </span>
                      <span className="text-sm">{r.nome}</span>
                    </div>
                    <span className="font-bold text-sm" style={{color:'#F4A81D'}}>{r.pontos} pts</span>
                  </div>
                ))}
              </div>

              {/* Vencedores declarados ou botão de declarar */}
              {vencedoresDeclarados.length > 0 ? (
                <div>
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Vencedores declarados</h3>
                  {vencedoresDeclarados.map((v) => (
                    <div key={v.posicao} className="flex items-center justify-between py-3 gap-3" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                      <div>
                        <p className="font-bold text-sm">{['🥇','🥈','🥉'][v.posicao-1]} {v.nome}</p>
                        <p className="text-xs text-white/40">{v.pontos} pts · R$ {v.premioValor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
                      </div>
                      {v.premioPago ? (
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-500/20 text-green-400">✓ Pago</span>
                      ) : (
                        <button
                          className="btn-copa px-3 py-2 text-xs"
                          disabled={pagandoVencedor === v.posicao}
                          onClick={() => pagarVencedor(v.posicao)}
                        >
                          {pagandoVencedor === v.posicao ? '⏳' : '💸 Pagar PIX'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : modoAuditoria ? (
                // Tela de AUDITORIA
                <div>
                  <div className="p-3 rounded-lg mb-4" style={{background:'rgba(244,168,29,0.1)', border:'1px solid rgba(244,168,29,0.3)'}}>
                    <p className="font-bold text-sm mb-1" style={{color:'#F4A81D'}}>⚠️ Auditoria antes de confirmar</p>
                    <p className="text-white/50 text-xs">Verifique os dados abaixo. Após confirmar, os PIX serão enviados automaticamente.</p>
                  </div>

                  {vencedoresPreview.map((v) => {
                    const membro = grupo.membros.find(m => m.usuarioId === v.usuarioId);
                    const temChavePix = !!membro?.chavePix;
                    return (
                      <div key={v.posicao} className="mb-3 p-3 rounded-lg" style={{background:'rgba(255,255,255,0.04)', border: temChavePix ? '1px solid rgba(74,222,128,0.2)' : '1px solid rgba(239,68,68,0.3)'}}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold">{['🥇','🥈','🥉'][v.posicao-1]} {v.nome}</span>
                          <span className="font-black" style={{color:'#4ade80'}}>R$ {v.premioValor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="text-white/50">📊 {v.pontos} pontos</p>
                          {temChavePix ? (
                            <p style={{color:'#4ade80'}}>✅ Chave PIX: <span className="font-mono">{membro?.tipoChavePix} — {membro?.chavePix}</span></p>
                          ) : (
                            <p className="text-red-400">🚫 Sem chave PIX cadastrada — membro precisa cadastrar</p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex gap-2 mt-4">
                    <button
                      className="flex-1 py-2 rounded-lg text-sm font-bold text-white/50"
                      style={{background:'rgba(255,255,255,0.06)'}}
                      onClick={() => setModoAuditoria(false)}
                    >
                      ← Voltar
                    </button>
                    <button
                      className="btn-copa flex-1 py-2 text-sm"
                      disabled={vencedoresPreview.some(v => !grupo.membros.find(m => m.usuarioId === v.usuarioId)?.chavePix)}
                      onClick={async () => { setModoAuditoria(false); await declararVencedores(); }}
                    >
                      ✅ Confirmar e Declarar Vencedores
                    </button>
                  </div>
                  {vencedoresPreview.some(v => !grupo.membros.find(m => m.usuarioId === v.usuarioId)?.chavePix) && (
                    <p className="text-red-400 text-xs text-center mt-2">⚠️ Todos os vencedores precisam ter chave PIX cadastrada</p>
                  )}
                </div>
              ) : (
                <button className="btn-copa w-full" onClick={abrirAuditoria}>
                  🏆 Calcular Vencedores e Auditar
                </button>
              )}
            </>
          )}
        </div>}

        {/* ABA: Financeiro */}
        {abaAdmin === 'financeiro' && <div className="card-copa p-5 mb-5">
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
              {m.pago ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">✓ Pago</span>
              ) : (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">Pendente</span>
              )}
            </div>
          ))}
        </div>}

        {/* Atualizar placares — dentro de Financeiro */}
        {abaAdmin === 'financeiro' && <div className="card-copa p-5">
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
        </div>}
      </main>
    </div>
  );
}
