'use client';

import { useState } from 'react';

interface MembroStats {
  nome: string;
  telefone: string;
  pago: boolean;
  apostas: number;
  valorDevido: number;
}

interface GrupoStats {
  id: string;
  nome: string;
  codigo: string;
  adminNome: string;
  status: string;
  valorAposta: number;
  criadoEm: string;
  totalMembros: number;
  totalPageos: number;
  totalApostas: number;
  totalArrecadado: number;
  premioEstimado: number;
  membros: MembroStats[];
}

export default function DevPage() {
  const [senha, setSenha] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [grupos, setGrupos] = useState<GrupoStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const res = await fetch(`/api/dev/grupos?senha=${encodeURIComponent(senha)}`);
      const data = await res.json();
      if (!res.ok) { setErro(data.error || 'Senha incorreta'); return; }
      setGrupos(data.grupos || []);
      setAutenticado(true);
    } catch (err) {
      setErro(`Erro ao carregar: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  async function recarregar() {
    setLoading(true);
    try {
      const res = await fetch(`/api/dev/grupos?senha=${encodeURIComponent(senha)}`);
      const data = await res.json();
      if (res.ok) setGrupos(data.grupos || []);
    } finally {
      setLoading(false);
    }
  }

  const [migrando, setMigrando] = useState(false);
  const [msgMigracao, setMsgMigracao] = useState('');

  async function migrar() {
    if (!confirm('Registrar todos os grupos existentes no índice?')) return;
    setMigrando(true);
    setMsgMigracao('');
    try {
      const res = await fetch(`/api/dev/migrar?senha=${encodeURIComponent(senha)}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMsgMigracao(`✓ ${data.total} grupos indexados`);
        await recarregar();
      } else {
        setMsgMigracao(`Erro: ${data.error}`);
      }
    } finally {
      setMigrando(false);
    }
  }

  const totalGeral = grupos.reduce((acc, g) => acc + g.totalArrecadado, 0);
  const taxaGeral = totalGeral * 0.1;
  const premioGeral = totalGeral * 0.9;

  if (!autenticado) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center px-4">
        <div className="card-copa p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <p className="text-3xl mb-2">🛠️</p>
            <h1 className="font-black text-xl" style={{color:'#F4A81D'}}>Painel do Desenvolvedor</h1>
            <p className="text-white/40 text-sm mt-1">Bolão Copa 2026</p>
          </div>
          <form onSubmit={entrar} className="space-y-4">
            <input
              type="password"
              placeholder="Senha de acesso"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="input-copa w-full"
              autoFocus
            />
            {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}
            <button type="submit" className="btn-copa w-full" disabled={loading}>
              {loading ? 'Carregando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-gradient px-4 py-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-black text-2xl" style={{color:'#F4A81D'}}>🛠️ Dev Dashboard</h1>
            <p className="text-white/40 text-sm">{grupos.length} grupos · atualizado agora</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2">
              <button onClick={migrar} disabled={migrando || loading}
                className="text-sm px-3 py-2 rounded-lg font-bold transition-all"
                style={{background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.1)'}}>
                {migrando ? '...' : '⚙ Indexar'}
              </button>
              <button onClick={recarregar} disabled={loading}
                className="text-sm px-4 py-2 rounded-lg font-bold transition-all"
                style={{background:'rgba(244,168,29,0.15)', color:'#F4A81D', border:'1px solid rgba(244,168,29,0.3)'}}>
                {loading ? '...' : '↻ Atualizar'}
              </button>
            </div>
            {msgMigracao && <p className="text-xs" style={{color: msgMigracao.startsWith('✓') ? '#4ade80' : '#f87171'}}>{msgMigracao}</p>}
          </div>
        </div>

        {/* Resumo geral */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card-copa p-4 text-center">
            <p className="text-2xl font-black text-white">{grupos.length}</p>
            <p className="text-xs text-white/40 mt-1">Grupos</p>
          </div>
          <div className="card-copa p-4 text-center">
            <p className="text-2xl font-black" style={{color:'#4ade80'}}>
              R$ {totalGeral.toLocaleString('pt-BR', {minimumFractionDigits:2})}
            </p>
            <p className="text-xs text-white/40 mt-1">Total arrecadado</p>
          </div>
          <div className="card-copa p-4 text-center">
            <p className="text-2xl font-black" style={{color:'#F4A81D'}}>
              R$ {taxaGeral.toLocaleString('pt-BR', {minimumFractionDigits:2})}
            </p>
            <p className="text-xs text-white/40 mt-1">Sua taxa (10%)</p>
          </div>
        </div>

        {/* Lista de grupos */}
        <div className="space-y-4">
          {grupos.map((g) => (
            <div key={g.id} className="card-copa overflow-hidden">
              {/* Cabeçalho do grupo */}
              <button
                className="w-full p-4 text-left"
                onClick={() => setExpandido(expandido === g.id ? null : g.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-base text-white">{g.nome}</p>
                      <span className="text-xs font-mono px-2 py-0.5 rounded" style={{background:'rgba(244,168,29,0.15)', color:'#F4A81D'}}>
                        {g.codigo}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        g.status === 'aberto' ? 'bg-green-500/20 text-green-400' :
                        g.status === 'encerrado' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>{g.status}</span>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">
                      Admin: {g.adminNome} · R$ {g.valorAposta.toFixed(2)}/aposta · criado {new Date(g.criadoEm).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="text-white/30 text-lg flex-shrink-0">{expandido === g.id ? '▲' : '▼'}</span>
                </div>

                {/* Stats rápidos */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  <div className="text-center">
                    <p className="font-black text-white">{g.totalMembros}</p>
                    <p className="text-xs text-white/30">membros</p>
                  </div>
                  <div className="text-center">
                    <p className="font-black" style={{color:'#4ade80'}}>{g.totalPageos}</p>
                    <p className="text-xs text-white/30">pagos</p>
                  </div>
                  <div className="text-center">
                    <p className="font-black text-white">{g.totalApostas}</p>
                    <p className="text-xs text-white/30">apostas</p>
                  </div>
                  <div className="text-center">
                    <p className="font-black" style={{color:'#F4A81D'}}>
                      R$ {g.totalArrecadado.toLocaleString('pt-BR', {minimumFractionDigits:2})}
                    </p>
                    <p className="text-xs text-white/30">arrecadado</p>
                  </div>
                </div>
              </button>

              {/* Detalhes expandidos */}
              {expandido === g.id && (
                <div style={{borderTop:'1px solid rgba(255,255,255,0.08)'}}>
                  {/* Financeiro do grupo */}
                  <div className="px-4 py-3 grid grid-cols-2 gap-3" style={{background:'rgba(0,0,0,0.2)'}}>
                    <div>
                      <p className="text-xs text-white/40">Total arrecadado</p>
                      <p className="font-black" style={{color:'#4ade80'}}>R$ {g.totalArrecadado.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Prêmio (90%)</p>
                      <p className="font-black text-white">R$ {g.premioEstimado.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Sua taxa (10%)</p>
                      <p className="font-black" style={{color:'#F4A81D'}}>R$ {(g.totalArrecadado * 0.1).toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/40">Pendente de pagar</p>
                      <p className="font-black text-red-400">
                        {g.totalMembros - g.totalPageos} membro{g.totalMembros - g.totalPageos !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Membros */}
                  <div className="px-4 pb-4 pt-3">
                    <p className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">Membros</p>
                    <div className="space-y-1.5">
                      {g.membros.map((m, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5" style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                          <div>
                            <p className="text-sm font-medium text-white">{m.nome}</p>
                            <p className="text-xs text-white/30">{m.telefone} · {m.apostas} aposta{m.apostas !== 1 ? 's' : ''} · R$ {m.valorDevido.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
                          </div>
                          {m.pago ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex-shrink-0">✓ Pago</span>
                          ) : (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 flex-shrink-0">Pendente</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-white/20 text-xs mt-8">
          /dev · acesso restrito ao desenvolvedor
        </p>
      </div>
    </div>
  );
}
