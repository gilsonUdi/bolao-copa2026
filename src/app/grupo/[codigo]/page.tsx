'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Grupo, Jogo, Aposta, Ranking } from '@/types';
import { calcularPontos } from '@/lib/pontuacao';
import { EMOJI_BANDEIRAS } from '@/lib/paises';

type Tab = 'apostas' | 'ranking' | 'pagamento';

interface Usuario { id: string; nome: string; telefone: string; }

function formatarData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

function StatusBadge({ status }: { status: Jogo['status'] }) {
  const map = {
    agendado: { label: 'Agendado', color: '#94a3b8' },
    ao_vivo: { label: '🔴 Ao Vivo', color: '#f87171' },
    encerrado: { label: 'Encerrado', color: '#4ade80' },
    adiado: { label: 'Adiado', color: '#fbbf24' },
  };
  const s = map[status];
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{background:`${s.color}20`, color: s.color}}>{s.label}</span>;
}

export default function GrupoPage() {
  const params = useParams();
  const router = useRouter();
  const codigo = params.codigo as string;

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [apostas, setApostas] = useState<Aposta[]>([]); // apostas do usuário atual (para o form)
  const [todasApostas, setTodasApostas] = useState<Aposta[]>([]); // todas apostas do grupo (para ranking)
  const [tab, setTab] = useState<Tab>('apostas');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<number | null>(null);
  const [previsoes, setPrevisoes] = useState<Record<number, { casa: string; visitante: string }>>({});
  const [faseAtiva, setFaseAtiva] = useState<string>('Todos');

  // Pagamento
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [tipoChavePix, setTipoChavePix] = useState<'CPF'|'PHONE'|'EMAIL'|'EVP'>('CPF');
  const [salvandoChave, setSalvandoChave] = useState(false);
  const [chavePixSalva, setChavePixSalva] = useState(false);
  const [pixData, setPixData] = useState<{ pixCopiaECola: string; pixQrCodeImage: string; invoiceUrl: string; valor: number } | null>(null);
  const [gerandoPix, setGerandoPix] = useState(false);
  const [erroPag, setErroPag] = useState('');

  // Formulário de entrada para novos membros
  const [nomeEntrada, setNomeEntrada] = useState('');
  const [telefoneEntrada, setTelefoneEntrada] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erroEntrada, setErroEntrada] = useState('');
  const [grupoPreview, setGrupoPreview] = useState<{nome:string; valorAposta:number} | null>(null);

  useEffect(() => {
    const u = localStorage.getItem('bolao_usuario');
    if (u) {
      setUsuario(JSON.parse(u));
    } else {
      // Busca só o preview do grupo para mostrar na tela de entrada
      fetch(`/api/grupos?codigo=${codigo}`)
        .then(r => r.json())
        .then(d => { if (d.grupo) setGrupoPreview({ nome: d.grupo.nome, valorAposta: d.grupo.valorAposta }); })
        .catch(() => {});
    }
  }, [codigo]);

  async function entrarNoGrupo(e: React.FormEvent) {
    e.preventDefault();
    setErroEntrada('');
    setEntrando(true);
    try {
      const res = await fetch(`/api/grupos?codigo=${codigo}`);
      if (!res.ok) throw new Error('Grupo não encontrado');
      const usuarioId = `user_${telefoneEntrada.replace(/\D/g, '')}`;
      const data = await res.json();
      const jaMembro = data.grupo?.membros?.find((m: {usuarioId: string}) => m.usuarioId === usuarioId);
      if (!jaMembro) {
        await fetch(`/api/grupos/${codigo}/membros`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuarioId, nome: nomeEntrada, telefone: telefoneEntrada }),
        });
      }
      const novoUsuario = { id: usuarioId, nome: nomeEntrada, telefone: telefoneEntrada };
      localStorage.setItem('bolao_usuario', JSON.stringify(novoUsuario));
      setUsuario(novoUsuario);
    } catch (err: unknown) {
      setErroEntrada(err instanceof Error ? err.message : 'Erro ao entrar no grupo');
    } finally {
      setEntrando(false);
    }
  }

  const carregarDados = useCallback(async () => {
    if (!usuario) return;
    try {
      const [gRes, jRes, aRes, allARes] = await Promise.all([
        fetch(`/api/grupos?codigo=${codigo}`),
        fetch('/api/jogos'),
        fetch(`/api/apostas?grupoId=grupo_${codigo}&usuarioId=${usuario.id}`),
        fetch(`/api/apostas?grupoId=grupo_${codigo}`), // todas as apostas para o ranking
      ]);
      const gData = await gRes.json();
      const jData = await jRes.json();
      const aData = await aRes.json();
      const allAData = await allARes.json();

      setGrupo(gData.grupo);
      setJogos(jData.jogos || []);
      setApostas(aData.apostas || []);
      setTodasApostas(allAData.apostas || []);

      // Pré-preenche apostas existentes
      const prev: Record<number, { casa: string; visitante: string }> = {};
      (aData.apostas || []).forEach((a: Aposta) => {
        prev[a.jogoId] = { casa: String(a.golsCasaPrevisto), visitante: String(a.golsVisitantePrevisto) };
      });
      setPrevisoes(prev);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [codigo, usuario]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const [pixAposta, setPixAposta] = useState<{jogoId: number; invoiceUrl: string; pixCopiaECola: string} | null>(null);

  function jogoEstaAberto(jogo: Jogo): boolean {
    const agora = new Date();
    const inicio = new Date(jogo.dataHora);
    return agora < inicio && jogo.status === 'agendado';
  }

  async function novaAposta(jogo: Jogo) {
    if (!usuario || !grupo) return;
    const prev = previsoes[jogo.id];
    if (!prev || prev.casa === '' || prev.visitante === '') return;

    setSalvando(jogo.id);
    try {
      const res = await fetch('/api/apostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grupoId: `grupo_${codigo}`,
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          jogoId: jogo.id,
          golsCasaPrevisto: Number(prev.casa),
          golsVisitantePrevisto: Number(prev.visitante),
          cpf: '', // sem CPF aqui — pagamento via aba pagamento separada
        }),
      });
      const data = await res.json();
      if (data.cobranca?.invoiceUrl) {
        setPixAposta({ jogoId: jogo.id, invoiceUrl: data.cobranca.invoiceUrl, pixCopiaECola: data.cobranca.pixCopiaECola });
      }
      // Limpa preview após salvar para permitir nova aposta
      setPrevisoes(p => { const n = {...p}; delete n[jogo.id]; return n; });
      await carregarDados();
    } finally {
      setSalvando(null);
    }
  }

  async function editarAposta(aposta: typeof apostas[0]) {
    if (!usuario) return;
    const prev = previsoes[`edit_${aposta.id}`];
    if (!prev || prev.casa === '' || prev.visitante === '') return;
    setSalvando(aposta.jogoId);
    try {
      await fetch('/api/apostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grupoId: aposta.grupoId,
          usuarioId: aposta.usuarioId,
          usuarioNome: aposta.usuarioNome,
          jogoId: aposta.jogoId,
          numero: aposta.numero,
          golsCasaPrevisto: Number(prev.casa),
          golsVisitantePrevisto: Number(prev.visitante),
          pago: aposta.pago,
          criadaEm: aposta.criadaEm,
          apostaId: aposta.id,
        }),
      });
      setPrevisoes(p => { const n = {...p}; delete n[`edit_${aposta.id}`]; return n; });
      await carregarDados();
    } finally {
      setSalvando(null);
    }
  }

  function calcularRanking(): Ranking[] {
    if (!grupo) return [];
    const pontosMap: Record<string, { pontos: number; exatos: number; vencedores: number; total: number; nome: string }> = {};

    grupo.membros.forEach((m) => {
      pontosMap[m.usuarioId] = { pontos: 0, exatos: 0, vencedores: 0, total: 0, nome: m.nome };
    });

    todasApostas.forEach((a) => {
      const jogo = jogos.find((j) => j.id === a.jogoId);
      if (!jogo || jogo.status !== 'encerrado') return;
      const pts = calcularPontos(a, jogo);
      if (!pontosMap[a.usuarioId]) pontosMap[a.usuarioId] = { pontos: 0, exatos: 0, vencedores: 0, total: 0, nome: a.usuarioNome };
      pontosMap[a.usuarioId].pontos += pts;
      pontosMap[a.usuarioId].total += 1;
      if (pts === 10) pontosMap[a.usuarioId].exatos += 1;
      else if (pts > 0) pontosMap[a.usuarioId].vencedores += 1;
    });

    return Object.entries(pontosMap)
      .map(([id, v], i) => ({ usuarioId: id, nome: v.nome, pontos: v.pontos, acertosExatos: v.exatos, acertosVencedor: v.vencedores, apostasTotal: v.total, posicao: i + 1 }))
      .sort((a, b) => b.pontos - a.pontos)
      .map((r, i) => ({ ...r, posicao: i + 1 }));
  }

  async function gerarPix(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario || !grupo) return;
    setGerandoPix(true);
    setErroPag('');
    try {
      // Salva chave PIX primeiro
      await fetch('/api/pix-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grupoId: `grupo_${codigo}`, usuarioId: usuario.id, chavePix, tipoChavePix }),
      });
      // Gera cobrança Asaas
      const res = await fetch('/api/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grupoId: `grupo_${codigo}`, usuarioId: usuario.id, nome: usuario.nome, cpf, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPixData(data);
    } catch (err: unknown) {
      setErroPag(err instanceof Error ? err.message : 'Erro ao gerar PIX');
    } finally {
      setGerandoPix(false);
    }
  }

  // Tela de entrada — aparece para quem ainda não se identificou
  if (!usuario) {
    return (
      <div className="min-h-screen hero-gradient flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Cabeçalho */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">⚽</div>
            <h1 className="text-2xl font-black" style={{color:'#F4A81D'}}>Bolão Copa 2026</h1>
            {grupoPreview ? (
              <>
                <p className="text-white font-bold text-lg mt-1">{grupoPreview.nome}</p>
                <p className="text-white/50 text-sm mt-1">
                  Entrada: <strong className="text-white">R$ {grupoPreview.valorAposta.toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong>
                </p>
              </>
            ) : (
              <p className="text-white/50 text-sm mt-1">Código: <span className="font-mono font-bold text-white">{codigo}</span></p>
            )}
          </div>

          <form onSubmit={entrarNoGrupo} className="card-copa p-6 flex flex-col gap-4">
            <h2 className="font-bold text-lg" style={{color:'#F4A81D'}}>Entrar no Bolão</h2>

            <div>
              <label className="text-white/60 text-xs block mb-1 uppercase tracking-wide">Seu Nome *</label>
              <input
                className="input-copa"
                placeholder="Como você quer ser chamado"
                value={nomeEntrada}
                onChange={e => setNomeEntrada(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-white/60 text-xs block mb-1 uppercase tracking-wide">Seu WhatsApp *</label>
              <input
                className="input-copa"
                placeholder="(11) 99999-9999"
                type="tel"
                value={telefoneEntrada}
                onChange={e => setTelefoneEntrada(e.target.value)}
                required
              />
            </div>

            {erroEntrada && (
              <p className="text-red-400 text-sm bg-red-500/10 rounded-lg p-2 text-center">{erroEntrada}</p>
            )}

            <button type="submit" className="btn-copa" disabled={entrando || !nomeEntrada || !telefoneEntrada}>
              {entrando ? '⏳ Entrando...' : '🏆 Entrar no Bolão'}
            </button>
          </form>

        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">⚽</div>
          <p className="text-white/60">Carregando bolão...</p>
        </div>
      </div>
    );
  }

  if (!grupo) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <div className="text-center card-copa p-8">
          <p className="text-red-400 text-lg">Grupo não encontrado</p>
          <button className="btn-copa mt-4" onClick={() => router.push('/')}>Voltar</button>
        </div>
      </div>
    );
  }

  // Apenas jogos liberados pelo admin — se nenhum foi liberado, não mostra nada
  const jogosAtivos = grupo.jogosAtivos || [];
  const jogosLiberados = jogos.filter(j => jogosAtivos.includes(j.id));
  const fases = ['Todos', ...Array.from(new Set(jogosLiberados.map((j) => j.fase)))];
  const jogosFiltrados = faseAtiva === 'Todos' ? jogosLiberados : jogosLiberados.filter((j) => j.fase === faseAtiva);
  const membroAtual = grupo.membros.find((m) => m.usuarioId === usuario?.id);
  const jaPagou = membroAtual?.pago ?? false;
  const totalArrecadado = grupo.membros.filter((m) => m.pago).length * grupo.valorAposta;
  const premioEstimado = totalArrecadado * 0.9;
  const ranking = calcularRanking();

  return (
    <div className="min-h-screen hero-gradient flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3" style={{background:'rgba(13,31,60,0.95)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(244,168,29,0.2)'}}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-black text-lg leading-none" style={{color:'#F4A81D'}}>{grupo.nome}</h1>
            <p className="text-white/40 text-xs mt-0.5">Código: <span className="font-mono font-bold text-white/60">{codigo}</span></p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40">Prêmio estimado</p>
            <p className="font-black text-lg" style={{color:'#4ade80'}}>
              R$ {premioEstimado.toLocaleString('pt-BR', {minimumFractionDigits:2})}
            </p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-[60px] z-10 px-4" style={{background:'rgba(13,31,60,0.95)', borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
        <div className="max-w-2xl mx-auto flex">
          {(['apostas','ranking','pagamento'] as Tab[]).map((t) => {
            const labels = { apostas: '⚽ Apostas', ranking: '🏆 Ranking', pagamento: '💳 Pagamento' };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-3 text-sm font-bold transition-all"
                style={tab === t
                  ? { color:'#F4A81D', borderBottom:'2px solid #F4A81D' }
                  : { color:'rgba(255,255,255,0.35)' }
                }
              >
                {labels[t]}
              </button>
            );
          })}
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">

        {/* Tab Apostas */}
        {tab === 'apostas' && (
          <div>
            {/* Filtro de fase */}
            <div className="flex gap-2 flex-wrap mb-4">
              {fases.map((fase) => (
                <button
                  key={fase}
                  onClick={() => setFaseAtiva(fase)}
                  className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                  style={faseAtiva === fase
                    ? { background:'#F4A81D', color:'#0D1F3C' }
                    : { background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)' }
                  }
                >
                  {fase}
                </button>
              ))}
            </div>

            {jogosFiltrados.length === 0 && (
              <div className="text-center py-12 text-white/40">
                <div className="text-4xl mb-2">🔒</div>
                <p>Nenhum jogo liberado pelo organizador ainda</p>
                <p className="text-xs mt-1">Aguarde o administrador liberar os jogos para apostas</p>
              </div>
            )}

            {jogosFiltrados.map((jogo) => {
              const apostasJogo = apostas.filter((a) => a.jogoId === jogo.id).sort((a,b) => a.numero - b.numero);
              const prev = previsoes[jogo.id] || { casa: '', visitante: '' };
              const aberto = jogoEstaAberto(jogo);
              const bloqueado = !aberto;

              return (
                <div key={jogo.id} className="card-copa mb-4 overflow-hidden animate-slide-up">
                  {/* Cabeçalho do jogo */}
                  <div className="px-4 pt-3 pb-2 flex items-center justify-between" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                    <div className="flex items-center gap-2">
                      {jogo.grupo && <span className="badge-fase">{jogo.grupo}</span>}
                      <span className="text-white/40 text-xs">{jogo.fase}</span>
                    </div>
                    <StatusBadge status={jogo.status} />
                  </div>

                  {/* Times e placar */}
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Time Casa */}
                      <div className="flex-1 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <p className="font-bold text-sm leading-tight">{jogo.timeCasa}</p>
                          {jogo.bandeiraCasa
                            ? <img src={jogo.bandeiraCasa} alt={jogo.timeCasa} className="w-8 h-6 object-cover rounded-sm flex-shrink-0" />
                            : <span className="text-xl flex-shrink-0">{EMOJI_BANDEIRAS[jogo.timeCasa] || '🏳️'}</span>
                          }
                        </div>
                      </div>

                      {/* Placar */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {jogo.status === 'encerrado' ? (
                          <div className="flex items-center gap-1">
                            <span className="text-2xl font-black" style={{color:'#F4A81D'}}>{jogo.golsCasa}</span>
                            <span className="text-white/30 font-bold">x</span>
                            <span className="text-2xl font-black" style={{color:'#F4A81D'}}>{jogo.golsVisitante}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              className="placar-input"
                              value={prev.casa}
                              disabled={bloqueado}
                              onChange={(e) => setPrevisoes((p) => ({ ...p, [jogo.id]: { ...prev, casa: e.target.value } }))}
                            />
                            <span className="text-white/30 font-bold text-xl">x</span>
                            <input
                              type="number"
                              min="0"
                              max="20"
                              className="placar-input"
                              value={prev.visitante}
                              disabled={bloqueado}
                              onChange={(e) => setPrevisoes((p) => ({ ...p, [jogo.id]: { ...prev, visitante: e.target.value } }))}
                            />
                          </div>
                        )}
                      </div>

                      {/* Time Visitante */}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          {jogo.bandeiraVisitante
                            ? <img src={jogo.bandeiraVisitante} alt={jogo.timeVisitante} className="w-8 h-6 object-cover rounded-sm flex-shrink-0" />
                            : <span className="text-xl flex-shrink-0">{EMOJI_BANDEIRAS[jogo.timeVisitante] || '🏳️'}</span>
                          }
                          <p className="font-bold text-sm leading-tight">{jogo.timeVisitante}</p>
                        </div>
                      </div>
                    </div>

                    {/* Data e local */}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-white/30 text-xs">{formatarData(jogo.dataHora)}</span>
                      <span className="text-white/30 text-xs">{jogo.local}</span>
                    </div>

                    {/* Minhas apostas existentes */}
                    {apostasJogo.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {apostasJogo.map((ap) => {
                          const editKey = `edit_${ap.id}`;
                          const editPrev = previsoes[editKey];
                          const pts = jogo.status === 'encerrado' ? calcularPontos(ap, jogo) : null;
                          return (
                            <div key={ap.id} className="rounded-lg p-2" style={{background:'rgba(0,0,0,0.25)'}}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-white/40">Aposta #{ap.numero}</span>
                                <div className="flex items-center gap-2">
                                  {ap.pago
                                    ? <span className="text-xs px-1.5 py-0.5 rounded" style={{background:'rgba(74,222,128,0.2)', color:'#4ade80'}}>✓ Pago</span>
                                    : <span className="text-xs px-1.5 py-0.5 rounded" style={{background:'rgba(251,191,36,0.2)', color:'#fbbf24'}}>Pendente</span>
                                  }
                                  {pts !== null && (
                                    <span className="font-black text-sm" style={{color: pts > 0 ? '#4ade80' : '#f87171'}}>+{pts}pts</span>
                                  )}
                                </div>
                              </div>

                              {/* Modo edição (antes do jogo) */}
                              {aberto && editPrev ? (
                                <div className="flex items-center gap-2">
                                  <input type="number" min="0" max="20" className="placar-input" style={{width:50, fontSize:20}}
                                    value={editPrev.casa}
                                    onChange={e => setPrevisoes(p => ({...p, [editKey]: {...editPrev, casa: e.target.value}}))} />
                                  <span className="text-white/30">x</span>
                                  <input type="number" min="0" max="20" className="placar-input" style={{width:50, fontSize:20}}
                                    value={editPrev.visitante}
                                    onChange={e => setPrevisoes(p => ({...p, [editKey]: {...editPrev, visitante: e.target.value}}))} />
                                  <button className="btn-verde px-3 py-1 text-xs ml-auto" disabled={salvando === jogo.id}
                                    onClick={() => editarAposta(ap)}>
                                    {salvando === jogo.id ? '⏳' : '✓ Salvar'}
                                  </button>
                                  <button className="text-white/30 text-xs px-2"
                                    onClick={() => setPrevisoes(p => { const n={...p}; delete n[editKey]; return n; })}>✕</button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-sm">{ap.golsCasaPrevisto} x {ap.golsVisitantePrevisto}</span>
                                  {aberto && (
                                    <button className="text-xs text-white/40 hover:text-white/70 transition-colors"
                                      onClick={() => setPrevisoes(p => ({...p, [editKey]: {casa: String(ap.golsCasaPrevisto), visitante: String(ap.golsVisitantePrevisto)}}))}>
                                      ✏️ Editar
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Nova aposta (só antes do início) */}
                    {aberto && (
                      <div className="mt-3">
                        <p className="text-xs text-white/40 mb-2">
                          {apostasJogo.length === 0 ? 'Sua aposta:' : `Nova aposta (#${apostasJogo.length + 1}):`}
                        </p>
                        <div className="flex items-center gap-2">
                          <input type="number" min="0" max="20" className="placar-input"
                            value={prev.casa}
                            onChange={(e) => setPrevisoes((p) => ({ ...p, [jogo.id]: { ...prev, casa: e.target.value } }))} />
                          <span className="text-white/30 font-bold text-xl">x</span>
                          <input type="number" min="0" max="20" className="placar-input"
                            value={prev.visitante}
                            onChange={(e) => setPrevisoes((p) => ({ ...p, [jogo.id]: { ...prev, visitante: e.target.value } }))} />
                          <button
                            className="btn-verde px-4 py-2 text-sm ml-auto"
                            disabled={salvando === jogo.id || prev.casa === '' || prev.visitante === ''}
                            onClick={() => novaAposta(jogo)}
                          >
                            {salvando === jogo.id ? '⏳' : apostasJogo.length === 0 ? '💾 Apostar' : '➕ Nova Aposta'}
                          </button>
                        </div>
                        {apostasJogo.length > 0 && grupo && (
                          <p className="text-xs mt-1.5" style={{color:'#fbbf24'}}>
                            ⚠️ Cada nova aposta = R$ {grupo.valorAposta.toLocaleString('pt-BR',{minimumFractionDigits:2})} adicional
                          </p>
                        )}
                      </div>
                    )}

                    {/* Aviso de jogo travado */}
                    {bloqueado && apostasJogo.length === 0 && jogo.status !== 'encerrado' && (
                      <div className="mt-3 text-center py-2">
                        <p className="text-white/30 text-xs">🔒 Apostas encerradas — jogo iniciou</p>
                      </div>
                    )}

                    {/* PIX gerado para aposta */}
                    {pixAposta?.jogoId === jogo.id && (
                      <div className="mt-3 p-3 rounded-lg" style={{background:'rgba(244,168,29,0.1)', border:'1px solid rgba(244,168,29,0.3)'}}>
                        <p className="text-xs font-bold mb-2" style={{color:'#F4A81D'}}>💳 Pague sua aposta:</p>
                        <a href={pixAposta.invoiceUrl} target="_blank" rel="noopener noreferrer"
                          className="btn-copa block text-center text-sm" style={{textDecoration:'none', padding:10, borderRadius:8}}>
                          🔗 Abrir PIX
                        </a>
                        <button className="text-white/30 text-xs w-full text-center mt-2"
                          onClick={() => setPixAposta(null)}>Fechar</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab Ranking */}
        {tab === 'ranking' && (
          <div>
            <div className="card-copa p-4 mb-4 flex justify-between text-center">
              <div>
                <p className="text-white/40 text-xs">Participantes</p>
                <p className="font-black text-2xl">{grupo.membros.length}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs">Pagos</p>
                <p className="font-black text-2xl" style={{color:'#4ade80'}}>{grupo.membros.filter(m=>m.pago).length}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs">Prêmio</p>
                <p className="font-black text-xl" style={{color:'#F4A81D'}}>R$ {premioEstimado.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
              </div>
            </div>

            {ranking.map((r) => (
              <div key={r.usuarioId} className={`card-copa mb-3 p-4 flex items-center gap-4 ${r.usuarioId === usuario?.id ? 'border-yellow-400/40' : ''}`}
                style={r.usuarioId === usuario?.id ? {borderColor:'rgba(244,168,29,0.4)'} : {}}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0"
                  style={{ background: r.posicao === 1 ? '#F4A81D' : r.posicao === 2 ? '#C0C0C0' : r.posicao === 3 ? '#CD7F32' : 'rgba(255,255,255,0.1)', color: r.posicao <= 3 ? '#0D1F3C' : 'white' }}>
                  {r.posicao <= 3 ? ['🥇','🥈','🥉'][r.posicao-1] : r.posicao}
                </div>
                <div className="flex-1">
                  <p className="font-bold">{r.nome} {r.usuarioId === usuario?.id && <span className="text-xs text-white/40">(você)</span>}</p>
                  <p className="text-white/40 text-xs">{r.acertosExatos} exatos · {r.acertosVencedor} vencedores · {r.apostasTotal} apostas</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-xl" style={{color:'#F4A81D'}}>{r.pontos}</p>
                  <p className="text-white/40 text-xs">pontos</p>
                </div>
              </div>
            ))}

            {ranking.every(r => r.pontos === 0) && (
              <div className="text-center py-8 text-white/40">
                <div className="text-3xl mb-2">⏳</div>
                <p>O ranking será atualizado conforme os jogos forem encerrados</p>
              </div>
            )}
          </div>
        )}

        {/* Tab Pagamento */}
        {tab === 'pagamento' && (
          <div>
            <div className="card-copa p-6 mb-4">
              <h2 className="font-bold text-lg mb-1" style={{color:'#F4A81D'}}>Confirmação de Participação</h2>
              <p className="text-white/60 text-sm mb-4">
                Valor da entrada: <strong className="text-white">R$ {grupo.valorAposta.toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong>
              </p>

              {jaPagou ? (
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="font-bold" style={{color:'#4ade80'}}>Pagamento confirmado!</p>
                  <p className="text-white/40 text-sm mt-1">Você está participando do bolão</p>
                </div>
              ) : pixData ? (
                <div className="text-center">
                  <p className="font-bold mb-3" style={{color:'#4ade80'}}>✅ Cobrança gerada!</p>
                  <p className="text-white/60 text-sm mb-4">
                    Valor: <strong className="text-white">R$ {pixData.valor?.toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong>
                  </p>

                  {/* QR Code — exibe se disponível */}
                  {pixData.pixQrCodeImage ? (
                    <div className="mb-4">
                      <p className="text-white/50 text-xs mb-2">Escaneie com o app do banco:</p>
                      <img
                        src={`data:image/png;base64,${pixData.pixQrCodeImage}`}
                        alt="QR Code PIX"
                        className="mx-auto rounded-xl"
                        style={{width:220, height:220, background:'white', padding:8}}
                      />
                    </div>
                  ) : null}

                  {/* PIX Copia e Cola */}
                  {pixData.pixCopiaECola && (
                    <div className="mb-3">
                      <p className="text-white/50 text-xs mb-2">Código PIX (copia e cola):</p>
                      <div className="p-3 rounded-lg text-xs text-left break-all mb-2" style={{background:'rgba(0,0,0,0.3)', color:'rgba(255,255,255,0.6)'}}>
                        {pixData.pixCopiaECola.substring(0,80)}...
                      </div>
                      <button className="btn-verde w-full" onClick={() => { navigator.clipboard.writeText(pixData.pixCopiaECola); alert('Código PIX copiado!'); }}>
                        📋 Copiar Código PIX
                      </button>
                    </div>
                  )}

                  {/* Link da fatura — sempre funciona */}
                  {pixData.invoiceUrl && (
                    <a href={pixData.invoiceUrl} target="_blank" rel="noopener noreferrer"
                      className="btn-copa block mt-3 text-center" style={{textDecoration:'none', padding:'12px', borderRadius:8}}>
                      🔗 Abrir fatura para pagar
                    </a>
                  )}
                </div>
              ) : (
                <form onSubmit={gerarPix} className="flex flex-col gap-4">
                  <div>
                    <label className="text-white/60 text-xs block mb-1 uppercase tracking-wide">CPF *</label>
                    <input className="input-copa" placeholder="000.000.000-00" value={cpf} onChange={e => setCpf(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-white/60 text-xs block mb-1 uppercase tracking-wide">E-mail (opcional)</label>
                    <input className="input-copa" placeholder="seu@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>

                  {/* Chave PIX para receber prêmio */}
                  <div className="p-3 rounded-lg" style={{background:'rgba(244,168,29,0.08)', border:'1px solid rgba(244,168,29,0.2)'}}>
                    <p className="text-xs font-bold mb-2" style={{color:'#F4A81D'}}>🏆 Chave PIX para receber prêmio</p>
                    <div className="flex gap-2 mb-2">
                      {(['CPF','PHONE','EMAIL','EVP'] as const).map(tipo => (
                        <button key={tipo} type="button"
                          onClick={() => setTipoChavePix(tipo)}
                          className="flex-1 py-1 rounded text-xs font-bold transition-all"
                          style={tipoChavePix === tipo
                            ? {background:'#F4A81D', color:'#0D1F3C'}
                            : {background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)'}
                          }>
                          {tipo === 'PHONE' ? 'Tel' : tipo === 'EVP' ? 'Aleatória' : tipo}
                        </button>
                      ))}
                    </div>
                    <input
                      className="input-copa"
                      placeholder={
                        tipoChavePix === 'CPF' ? '000.000.000-00' :
                        tipoChavePix === 'PHONE' ? '(11) 99999-9999' :
                        tipoChavePix === 'EMAIL' ? 'seu@email.com' :
                        'Cole sua chave aleatória aqui'
                      }
                      value={chavePix}
                      onChange={e => setChavePix(e.target.value)}
                      required
                    />
                    <p className="text-white/30 text-xs mt-1">Necessário para receber o prêmio caso ganhe</p>
                  </div>

                  {erroPag && <p className="text-red-400 text-sm bg-red-500/10 rounded p-2 text-center">{erroPag}</p>}
                  <button type="submit" className="btn-copa" disabled={gerandoPix || !chavePix}>
                    {gerandoPix ? '⏳ Gerando PIX...' : '💳 Gerar PIX para Pagamento'}
                  </button>
                </form>
              )}
            </div>

            {/* Lista de membros e status de pagamento */}
            <div className="card-copa p-4">
              <h3 className="font-bold text-sm mb-3 text-white/60 uppercase tracking-wide">Participantes</h3>
              {grupo.membros.map((m) => (
                <div key={m.usuarioId} className="flex items-center justify-between py-2" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{background:'rgba(255,255,255,0.1)'}}>
                      {m.nome[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.nome}</p>
                      {m.usuarioId === grupo.adminId && <p className="text-xs" style={{color:'#F4A81D'}}>Organizador</p>}
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.pago ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {m.pago ? '✓ Pago' : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Botão discreto de acesso admin — aparece para todos mas pede senha */}
      <div className="text-center pb-6">
        <button
          onClick={() => router.push(`/grupo/${codigo}/admin`)}
          className="text-white/20 hover:text-white/50 text-xs transition-colors"
        >
          👑 Admin
        </button>
      </div>
    </div>
  );
}
