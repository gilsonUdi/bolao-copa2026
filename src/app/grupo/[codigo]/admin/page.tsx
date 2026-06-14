'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Grupo, Jogo, Ranking, Vencedor, Aposta } from '@/types';

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
  const [todasApostas, setTodasApostas] = useState<Aposta[]>([]);
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
    const u = localStorage.getItem(`bolao_${codigo}_usuario`);
    if (!u) { router.push('/'); return; }
    setUsuario(JSON.parse(u));
    // Verifica se já está autenticado nesta sessão
    if (sessionStorage.getItem(SESSION_KEY) === 'true') setAutenticado(true);
  }, [router, SESSION_KEY]);

  const carregarDados = useCallback(async () => {
    try {
      const [gRes, jRes, rRes, aRes] = await Promise.all([
        fetch(`/api/grupos?codigo=${codigo}&admin=1`),
        fetch('/api/jogos'),
        fetch(`/api/admin/vencedores?grupoId=grupo_${codigo}`),
        fetch(`/api/apostas?grupoId=grupo_${codigo}`),
      ]);
      const gData = await gRes.json();
      const jData = await jRes.json();
      const rData = await rRes.json();
      const aData = await aRes.json();
      setGrupo(gData.grupo);
      setJogos(jData.jogos || []);
      setRanking(rData.ranking || []);
      setPremioTotal(rData.premioTotal || 0);
      setVencedoresDeclarados(rData.vencedoresDeclarados || []);
      setTodasApostas(aData.apostas || []);
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

  // Calcula total real: soma das apostas de cada membro pago × valorAposta
  function calcularTotalArrecadado(): number {
    if (!grupo) return 0;
    return grupo.membros
      .filter(m => m.pago)
      .reduce((acc, m) => {
        const qtd = todasApostas.filter(a => a.usuarioId === m.usuarioId).length;
        return acc + (qtd > 0 ? qtd : 1) * grupo.valorAposta;
      }, 0);
  }

  function percentsParaVencedores(vencedores: Ranking[]): number[] {
    if (vencedores.length === 0) return [];
    if (vencedores.length === 1) return [1.0];
    // Empate: divide igualmente
    const maxPts = vencedores[0].pontos;
    if (vencedores.every(v => v.pontos === maxPts)) {
      return vencedores.map(() => 1 / vencedores.length);
    }
    // Posições diferentes: 60/30/10
    return [0.6, 0.3, 0.1].slice(0, vencedores.length);
  }

  function abrirAuditoria() {
    if (!grupo || ranking.length === 0) return;
    const totalPago = calcularTotalArrecadado() * 0.9;
    // Só quem pontuou — sem prêmio para quem errou tudo
    const comPontos = ranking.filter(r => r.pontos > 0).slice(0, 3);
    const percents = percentsParaVencedores(comPontos);
    const preview: Vencedor[] = comPontos.map((r, i) => {
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
    const totalPago = calcularTotalArrecadado() * 0.9;
    // Só quem pontuou — sem prêmio para quem errou tudo
    const comPontos = ranking.filter(r => r.pontos > 0).slice(0, 3);
    const percents = percentsParaVencedores(comPontos);
    const vencedores: Vencedor[] = comPontos.map((r, i) => {
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
    const msg = encodeURIComponent(
      `🏆 *Bolão Copa 2026 - ${grupo?.nome}*\n\n` +
      `⚽ Participe do nosso bolão da Copa do Mundo!\n\n` +
      `💰 *Valor por aposta:* R$ ${grupo?.valorAposta?.toLocaleString('pt-BR', {minimumFractionDigits:2})} por jogo\n` +
      `📊 *Pontuação:* apenas placar exato conta!\n` +
      `🏆 *Prêmio:* total arrecadado menos 10% de taxa administrativa\n\n` +
      `📲 *Acesse agora e faça suas apostas:*\n${linkGrupo}\n\n` +
      `_Código do grupo: *${codigo}*_`
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
                {senhaErro}
              </p>
            )}

            <button type="submit" className="btn-copa" disabled={verificandoSenha || !senhaInput}>
              {verificandoSenha ? 'Verificando...' : 'Entrar no Admin'}
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
  const totalArrecadado = calcularTotalArrecadado();
  const premioEstimado = totalArrecadado * 0.9;

  return (
    <div className="min-h-screen hero-gradient flex flex-col">
      {/* Header Admin */}
      <header className="px-4 py-4" style={{background:'rgba(13,31,60,0.95)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(244,168,29,0.3)'}}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:'rgba(244,168,29,0.2)', color:'#F4A81D'}}>ADMIN</span>
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
            {id:'compartilhar', label:'Link'},
            {id:'jogos', label:'Liberar Jogos'},
            {id:'vencedores', label:'Vencedores'},
            {id:'financeiro', label:'Financeiro'},
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
          <h2 className="font-bold mb-3" style={{color:'#F4A81D'}}>Compartilhar Bolão</h2>
          <div className="flex items-center gap-2 mb-3 p-3 rounded-lg" style={{background:'rgba(0,0,0,0.3)'}}>
            <code className="flex-1 text-xs text-white/70 break-all">{linkGrupo}</code>
          </div>
          <div className="flex gap-2">
            <button className="btn-copa flex-1 py-2 text-sm flex items-center justify-center gap-2" onClick={copiarLink}>
              {linkCopiado ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Copiado!
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
                    <rect x="9" y="2" width="6" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  </svg>
                  Copiar Link
                </>
              )}
            </button>
            <button className="btn-verde flex-1 py-2 text-sm flex items-center justify-center gap-2" onClick={mensagemWhatsApp}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
          </div>
          <div className="mt-3 text-center">
            <p className="text-white/40 text-xs">Código do grupo:</p>
            <p className="font-mono font-black text-2xl tracking-widest mt-1" style={{color:'#F4A81D'}}>{codigo}</p>
          </div>
        </div>}

        {/* ABA: Liberar Jogos */}
        {abaAdmin === 'jogos' && <div className="card-copa p-5 mb-5">
          <h2 className="font-bold mb-1" style={{color:'#F4A81D'}}>Liberar Jogos para Apostas</h2>
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
                  {togglingJogo === jogo.id ? 'Atualizando...' : ativo ? 'Liberado' : 'Liberar'}
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
          <h2 className="font-bold mb-1" style={{color:'#F4A81D'}}>Declarar Vencedores e Pagar Prêmio</h2>
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
                        <p className="font-bold text-sm">{v.posicao}º {v.nome}</p>
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
                          {pagandoVencedor === v.posicao ? 'Pagando...' : 'Pagar PIX'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : modoAuditoria ? (
                // Tela de AUDITORIA
                <div>
                  <div className="p-3 rounded-lg mb-4" style={{background:'rgba(244,168,29,0.1)', border:'1px solid rgba(244,168,29,0.3)'}}>
                    <p className="font-bold text-sm mb-1" style={{color:'#F4A81D'}}>Auditoria antes de confirmar</p>
                    <p className="text-white/50 text-xs">Verifique os dados abaixo. Após confirmar, os PIX serão enviados automaticamente.</p>
                  </div>

                  {vencedoresPreview.map((v) => {
                    const membro = grupo.membros.find(m => m.usuarioId === v.usuarioId);
                    const temChavePix = !!membro?.chavePix;
                    return (
                      <div key={v.posicao} className="mb-3 p-3 rounded-lg" style={{background:'rgba(255,255,255,0.04)', border: temChavePix ? '1px solid rgba(74,222,128,0.2)' : '1px solid rgba(239,68,68,0.3)'}}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold">{v.posicao}º {v.nome}</span>
                          <span className="font-black" style={{color:'#4ade80'}}>R$ {v.premioValor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                        </div>
                        <div className="text-xs space-y-1">
                          <p className="text-white/50">{v.pontos} pontos</p>
                          {temChavePix ? (
                            <p style={{color:'#4ade80'}}>Chave PIX: <span className="font-mono">{membro?.tipoChavePix} — {membro?.chavePix}</span></p>
                          ) : (
                            <p className="text-red-400">Sem chave PIX cadastrada — membro precisa cadastrar</p>
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
                      Confirmar e Declarar Vencedores
                    </button>
                  </div>
                  {vencedoresPreview.some(v => !grupo.membros.find(m => m.usuarioId === v.usuarioId)?.chavePix) && (
                    <p className="text-red-400 text-xs text-center mt-2">Todos os vencedores precisam ter chave PIX cadastrada</p>
                  )}
                </div>
              ) : (
                <button className="btn-copa w-full" onClick={abrirAuditoria}>
                  Calcular Vencedores e Auditar
                </button>
              )}
            </>
          )}
        </div>}

        {/* ABA: Financeiro */}
        {abaAdmin === 'financeiro' && <div className="card-copa p-5 mb-5">
          <h2 className="font-bold mb-3" style={{color:'#F4A81D'}}>Financeiro</h2>
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
          {grupo.membros.map((m) => {
            const qtdApostas = todasApostas.filter(a => a.usuarioId === m.usuarioId).length;
            const valorMembro = (qtdApostas > 0 ? qtdApostas : 1) * grupo.valorAposta;
            return (
              <div key={m.usuarioId} className="flex items-center justify-between py-2" style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                <div>
                  <p className="text-sm font-medium">{m.nome}</p>
                  <p className="text-xs text-white/30">{m.telefone}</p>
                  <p className="text-xs text-white/40">{qtdApostas} aposta{qtdApostas !== 1 ? 's' : ''} · R$ {valorMembro.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                </div>
                {m.pago ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">✓ Pago</span>
                ) : (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">Pendente</span>
                )}
              </div>
            );
          })}
        </div>}

        {/* Atualizar placares — dentro de Financeiro */}
        {abaAdmin === 'financeiro' && <div className="card-copa p-5">
          <h2 className="font-bold mb-1" style={{color:'#F4A81D'}}>Atualizar Resultados</h2>
          <p className="text-white/40 text-xs mb-4">Informe o placar final dos jogos para calcular a pontuação</p>

          {jogos.filter(j => j.status !== 'encerrado').slice(0, 10).map((jogo) => {
            const p = placarEdit[jogo.id] || { casa: '', visitante: '' };
            return (
              <div key={jogo.id} className="mb-3 p-3 rounded-lg" style={{background:'rgba(255,255,255,0.04)'}}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{jogo.timeCasa} x {jogo.timeVisitante}</span>
                  {jogo.status === 'ao_vivo' && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-400 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      AO VIVO
                    </span>
                  )}
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
                    {atualizandoJogo === jogo.id ? 'Salvando...' : 'Confirmar'}
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
