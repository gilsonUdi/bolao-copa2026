'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'criar' | 'entrar';

function mascaraTelefone(v: string): string {
  const n = v.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return n.length ? `(${n}` : '';
  if (n.length <= 7) return `(${n.slice(0,2)}) ${n.slice(2)}`;
  return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
}

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('criar');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  // Criar grupo
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [adminNome, setAdminNome] = useState('');
  const [adminTelefone, setAdminTelefone] = useState('');
  const [valorAposta, setValorAposta] = useState('');
  const [descricao, setDescricao] = useState('');
  const [senhaAdmin, setSenhaAdmin] = useState('');

  // Entrar no grupo
  const [codigoGrupo, setCodigoGrupo] = useState('');

  async function criarGrupo(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const res = await fetch('/api/grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeGrupo, adminNome, adminTelefone, valorAposta: Number(valorAposta), descricao, senhaAdmin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem(`bolao_${data.grupo.codigo}_usuario`, JSON.stringify({
        id: `user_${adminTelefone.replace(/\D/g, '')}`,
        nome: adminNome,
        telefone: adminTelefone,
      }));
      router.push(`/grupo/${data.grupo.codigo}/admin`);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar grupo');
    } finally {
      setLoading(false);
    }
  }

  function entrarGrupo(e: React.FormEvent) {
    e.preventDefault();
    const codigo = codigoGrupo.toUpperCase().trim();
    if (!codigo) return;
    router.push(`/grupo/${codigo}?identificar=1`);
  }

  return (
    <div className="min-h-screen hero-gradient flex flex-col">
      {/* Header */}
      <header className="flex flex-col items-center pt-10 pb-6 px-4">
        <div className="flex items-center gap-4 mb-3">
          <div className="text-6xl">⚽</div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-gold uppercase leading-none">Bolão Copa</h1>
            <p className="text-gold text-2xl font-black tracking-widest leading-none">2026</p>
          </div>
        </div>
        <p className="text-white/50 text-center text-sm">México · Estados Unidos · Canadá</p>
        <div className="flex gap-1 mt-3">
          {['#C8102E','#F4A81D','#009A44','#1B3A6B','#FFFFFF'].map((c, i) => (
            <span key={i} className="w-8 h-1.5 rounded-full" style={{background: c}} />
          ))}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pb-12">
        <div className="w-full max-w-md animate-slide-up">
          {/* Tabs */}
          <div className="flex mb-5 rounded-xl overflow-hidden border border-white/10">
            {(['criar','entrar'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setErro(''); }}
                className="flex-1 py-3 font-bold text-sm transition-all"
                style={tab === t
                  ? { background: 'rgba(244,168,29,0.15)', borderBottom: '2px solid #F4A81D', color: '#F4A81D' }
                  : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)' }
                }
              >
                {t === 'criar' ? 'Criar Grupo' : 'Entrar com Código'}
              </button>
            ))}
          </div>

          {/* Formulário Criar */}
          {tab === 'criar' && (
            <form onSubmit={criarGrupo} className="card-copa p-6 flex flex-col gap-4">
              <h2 className="font-bold text-lg mb-1" style={{color:'#F4A81D'}}>Novo Grupo de Bolão</h2>

              <div>
                <label className="text-white/60 text-xs block mb-1 uppercase tracking-wide">Nome do Grupo *</label>
                <input className="input-copa" placeholder="Ex: Bolão dos Amigos da Firma" value={nomeGrupo} onChange={e => setNomeGrupo(e.target.value)} required />
              </div>

              <div>
                <label className="text-white/60 text-xs block mb-1 uppercase tracking-wide">Seu Nome *</label>
                <input className="input-copa" placeholder="Seu nome completo" value={adminNome} onChange={e => setAdminNome(e.target.value)} required />
              </div>

              <div>
                <label className="text-white/60 text-xs block mb-1 uppercase tracking-wide">Seu WhatsApp *</label>
                <input className="input-copa" placeholder="(11) 99999-9999" value={adminTelefone} onChange={e => setAdminTelefone(mascaraTelefone(e.target.value))} required type="tel" />
              </div>

              <div>
                <label className="text-white/60 text-xs block mb-1 uppercase tracking-wide">Valor da Aposta por Pessoa *</label>
                <div className="flex items-center gap-2">
                  <span className="text-white/60 font-bold text-sm flex-shrink-0">R$</span>
                  <input
                    className="input-copa flex-1"
                    placeholder="50,00"
                    value={valorAposta}
                    onChange={e => setValorAposta(e.target.value)}
                    required
                    type="number"
                    min="1"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/60 text-xs block mb-1 uppercase tracking-wide">Descrição (opcional)</label>
                <textarea className="input-copa resize-none" rows={2} placeholder="Regras, informações do grupo..." value={descricao} onChange={e => setDescricao(e.target.value)} />
              </div>

              <div>
                <label className="text-white/60 text-xs block mb-1 uppercase tracking-wide">Senha do Admin *</label>
                <input
                  className="input-copa"
                  type="password"
                  placeholder="Senha para acessar o painel de admin"
                  value={senhaAdmin}
                  onChange={e => setSenhaAdmin(e.target.value)}
                  required
                  minLength={4}
                />
                <p className="text-white/30 text-xs mt-1">Guarde essa senha — ela dá acesso ao painel administrativo</p>
              </div>

              {erro && <p className="text-red-400 text-sm text-center bg-red-500/10 rounded-lg p-2">{erro}</p>}

              <button type="submit" className="btn-copa mt-2" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Grupo'}
              </button>
            </form>
          )}

          {/* Formulário Entrar */}
          {tab === 'entrar' && (
            <form onSubmit={entrarGrupo} className="card-copa p-6 flex flex-col gap-4">
              <h2 className="font-bold text-lg mb-1" style={{color:'#F4A81D'}}>Entrar no Bolão</h2>

              <div>
                <label className="text-white/60 text-xs block mb-1 uppercase tracking-wide">Código do Grupo *</label>
                <input
                  className="input-copa uppercase tracking-widest text-center text-2xl font-black"
                  placeholder="ABC123"
                  maxLength={6}
                  value={codigoGrupo}
                  onChange={e => setCodigoGrupo(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <button type="submit" className="btn-copa mt-2">
                Entrar no Bolão
              </button>
            </form>
          )}

        </div>
      </main>

      <footer className="text-center text-white/20 text-xs pb-6">
        Copa do Mundo FIFA 2026 · Bolão entre amigos
      </footer>
    </div>
  );
}
