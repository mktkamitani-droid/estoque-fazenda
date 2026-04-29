"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BG = "#0d1117";
const CARD = "#161b22";
const BORDER = "#30363d";
const GREEN = "#3fb950";
const GREEN_DIM = "#1a3a1e";
const RED = "#f85149";
const RED_DIM = "#3a1a1a";
const AMBER = "#e3b341";
const AMBER_DIM = "#2d2200";
const TEXT = "#e6edf3";
const MUTED = "#8b949e";

type Produto = {
  id: number;
  nome: string;
  unidade: string;
  quantidade: number;
  categoria: string;
};

type Movimentacao = {
  id: number;
  tipo: string;
  quantidade: number;
  observacao: string;
  responsavel: string;
  criadoEm: string;
  produto: { nome: string; unidade: string };
};

const FAZENDAS = ["Dom", "Tinguara", "Santa Rosa", "Santa Rita", "Copasul"];
const ORDEM_CATEGORIAS = ["Grãos", "Semente", "Ração", "Adubo", "Inseticida", "Herbicida", "Fungicida", "Medicamentos", "Diesel", "Peças", "Geral"];
const CATEGORIAS_COM_BULA = ["Inseticida", "Herbicida", "Fungicida", "Medicamentos"];

const iStyle = {
  background: BG,
  color: TEXT,
  border: `1px solid ${BORDER}`,
};

export default function Home() {
  const [aba, setAba] = useState<"estoque" | "historico">("estoque");
  const [fazenda, setFazenda] = useState(FAZENDAS[0]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);

  const [modalNovo, setModalNovo] = useState(false);
  const [modalMov, setModalMov] = useState<Produto | null>(null);

  const [novoProduto, setNovoProduto] = useState({ nome: "", unidade: "kg", categoria: "Geral", fazenda: FAZENDAS[0], quantidadeInicial: "" });
  const [novaMov, setNovaMov] = useState({ tipo: "ENTRADA", quantidade: "", observacao: "", responsavel: "" });
  const [nomeResponsavel, setNomeResponsavel] = useState("");

  const [busca, setBusca] = useState("");
  const [categoriasAbertas, setCategoriasAbertas] = useState<Record<string, boolean>>({});
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function carregarProdutos(faz = fazenda) {
    const r = await fetch(`/api/produtos?fazenda=${encodeURIComponent(faz)}`);
    setProdutos(await r.json());
  }

  async function carregarHistorico() {
    const r = await fetch("/api/movimentacoes");
    setMovimentacoes(await r.json());
  }

  useEffect(() => {
    carregarProdutos(fazenda);
    carregarHistorico();
  }, [fazenda]);

  useEffect(() => {
    const nome = localStorage.getItem("kamitani_responsavel") || "";
    setNomeResponsavel(nome);
    setNovaMov(m => ({ ...m, responsavel: nome }));
  }, []);

  async function criarProduto(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro("");
    const r = await fetch("/api/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novoProduto),
    });
    if (r.ok) {
      const produto = await r.json();
      if (novoProduto.quantidadeInicial && Number(novoProduto.quantidadeInicial) > 0) {
        await fetch("/api/movimentacoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            produtoId: produto.id,
            tipo: "ENTRADA",
            quantidade: novoProduto.quantidadeInicial,
            observacao: "Estoque inicial",
          }),
        });
      }
      await carregarProdutos();
      await carregarHistorico();
      setModalNovo(false);
      setNovoProduto({ nome: "", unidade: "kg", categoria: "Geral", fazenda, quantidadeInicial: "" });
    } else {
      setErro("Erro ao cadastrar produto.");
    }
    setCarregando(false);
  }

  async function registrarMovimentacao(e: React.FormEvent) {
    e.preventDefault();
    if (!modalMov) return;
    setCarregando(true);
    setErro("");
    if (nomeResponsavel) localStorage.setItem("kamitani_responsavel", nomeResponsavel);
    const r = await fetch("/api/movimentacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produtoId: modalMov.id, ...novaMov, responsavel: nomeResponsavel }),
    });
    if (r.ok) {
      await carregarProdutos();
      await carregarHistorico();
      setModalMov(null);
      setNovaMov({ tipo: "ENTRADA", quantidade: "", observacao: "", responsavel: nomeResponsavel });
    } else {
      setErro("Erro ao registrar movimentação.");
    }
    setCarregando(false);
  }

  async function excluirProduto(id: number) {
    if (!confirm("Excluir produto e todo seu histórico?")) return;
    await fetch(`/api/produtos/${id}`, { method: "DELETE" });
    await carregarProdutos();
    await carregarHistorico();
  }

  const totalItens = produtos.length;
  const estoqueBaixo = produtos.filter((p) => p.quantidade <= 0).length;
  const produtosFiltrados = busca.trim()
    ? produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))
    : produtos;

  const categorias = ORDEM_CATEGORIAS.filter(cat => produtosFiltrados.some(p => p.categoria === cat));
  const outrasCateg = [...new Set(produtosFiltrados.map(p => p.categoria))].filter(c => !ORDEM_CATEGORIAS.includes(c)).sort();
  const todasCategorias = [...categorias, ...outrasCateg];

  return (
    <div className="min-h-screen" style={{ background: BG, color: TEXT }}>
      {/* Header */}
      <header className="px-4 py-4 shadow-lg" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌾</span>
            <div>
              <h1 className="text-xl font-bold leading-tight" style={{ color: GREEN }}>Kamitani Agro</h1>
              <p className="text-xs" style={{ color: MUTED }}>Controle de estoque</p>
            </div>
          </div>
          <button onClick={sair} className="text-xs underline" style={{ color: MUTED }}>Sair</button>
        </div>
      </header>

      {/* Seletor de fazendas */}
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FAZENDAS.map(f => (
            <button
              key={f}
              onClick={() => setFazenda(f)}
              className="whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors shrink-0"
              style={{
                background: fazenda === f ? GREEN : CARD,
                color: fazenda === f ? "#0d1117" : MUTED,
                border: `1px solid ${fazenda === f ? GREEN : BORDER}`,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Cards resumo */}
      <div className="max-w-3xl mx-auto px-4 pt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: MUTED }}>Produtos</p>
          <p className="text-3xl font-bold mt-1" style={{ color: GREEN }}>{totalItens}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: MUTED }}>Sem estoque</p>
          <p className="text-3xl font-bold mt-1" style={{ color: estoqueBaixo > 0 ? AMBER : MUTED }}>{estoqueBaixo}</p>
        </div>
      </div>

      {/* Abas */}
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: CARD }}>
          {(["estoque", "historico"] as const).map(a => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: aba === a ? GREEN_DIM : "transparent",
                color: aba === a ? GREEN : MUTED,
              }}
            >
              {a === "estoque" ? "Estoque" : "Histórico"}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        {aba === "estoque" && (
          <div className="space-y-4">
            <input
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              style={{ ...iStyle, background: CARD }}
              placeholder="Buscar produto..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            <button
              onClick={() => { setNovoProduto({ nome: "", unidade: "kg", categoria: "Geral", fazenda, quantidadeInicial: "" }); setModalNovo(true); }}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-colors"
              style={{ background: GREEN_DIM, color: GREEN, border: `1px solid ${GREEN}` }}
            >
              + Novo Produto
            </button>

            {produtos.length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: MUTED }}>
                Nenhum produto cadastrado ainda.
              </div>
            )}

            {todasCategorias.map(cat => {
              const prods = produtosFiltrados
                .filter(p => p.categoria === cat)
                .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
              const aberta = categoriasAbertas[cat] !== false;
              return (
                <div key={cat}>
                  <button
                    onClick={() => setCategoriasAbertas(prev => ({ ...prev, [cat]: !aberta }))}
                    className="w-full flex items-center gap-2 mb-1.5"
                  >
                    <div className="h-px flex-1" style={{ background: BORDER }} />
                    <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ color: GREEN, background: GREEN_DIM }}>
                      {cat} <span style={{ color: MUTED }}>{aberta ? "▲" : "▼"}</span>
                    </span>
                    <div className="h-px flex-1" style={{ background: BORDER }} />
                  </button>
                  {aberta && <div className="space-y-1">
                    {prods.map(p => (
                      <div key={p.id} className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                        <p className="font-medium text-sm flex-1 min-w-0 truncate" style={{ color: TEXT }}>{p.nome}</p>
                        <span className="font-bold text-sm shrink-0" style={{ fontFamily: "monospace", color: p.quantidade < 0 ? RED : p.quantidade === 0 ? AMBER : GREEN }}>
                          {p.quantidade % 1 === 0 ? p.quantidade : p.quantidade.toFixed(2)}
                          <span className="text-xs font-normal ml-1" style={{ fontFamily: "inherit", color: MUTED }}>{p.unidade}</span>
                        </span>
                        <div className="flex gap-1 shrink-0">
                          {CATEGORIAS_COM_BULA.includes(p.categoria) && (
                            <a
                              href={`https://www.google.com/search?q=${encodeURIComponent(p.nome + " bula")}&as_sitesearch=gov.br`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-md text-xs"
                              style={{ background: "#1a2a3a", color: "#58a6ff" }}
                              title="Ver bula"
                            >
                              📋
                            </a>
                          )}
                          <button onClick={() => { setModalMov(p); setNovaMov({ tipo: "ENTRADA", quantidade: "", observacao: "", responsavel: nomeResponsavel }); }}
                            className="px-2 py-1 rounded-md text-xs font-bold" style={{ background: GREEN_DIM, color: GREEN }}>+</button>
                          <button onClick={() => { setModalMov(p); setNovaMov({ tipo: "SAIDA", quantidade: "", observacao: "", responsavel: nomeResponsavel }); }}
                            className="px-2 py-1 rounded-md text-xs font-bold" style={{ background: RED_DIM, color: RED }}>−</button>
                          <button onClick={() => excluirProduto(p.id)}
                            className="px-2 py-1 rounded-md text-xs" style={{ background: BORDER, color: MUTED }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>}
                </div>
              );
            })}
          </div>
        )}

        {aba === "historico" && (
          <div className="space-y-2">
            {movimentacoes.length === 0 && (
              <div className="text-center py-12 text-sm" style={{ color: MUTED }}>
                Nenhuma movimentação registrada.
              </div>
            )}
            {movimentacoes.map((m) => (
              <div key={m.id} className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <span className="text-lg" style={{ color: m.tipo === "ENTRADA" ? GREEN : RED }}>
                  {m.tipo === "ENTRADA" ? "↑" : "↓"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: TEXT }}>{m.produto.nome}</p>
                  <p className="text-xs truncate" style={{ color: MUTED }}>
                    {m.responsavel && <span className="font-medium" style={{ color: "#58a6ff" }}>{m.responsavel}</span>}
                    {m.responsavel && m.observacao && " · "}
                    {m.observacao}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm" style={{ color: m.tipo === "ENTRADA" ? GREEN : RED }}>
                    {m.tipo === "ENTRADA" ? "+" : "−"}{m.quantidade} {m.produto.unidade}
                  </p>
                  <p className="text-xs" style={{ color: MUTED }}>
                    {new Date(m.criadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Novo Produto */}
      {modalNovo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl overflow-y-auto" style={{ background: CARD, border: `1px solid ${BORDER}`, maxHeight: "90vh" }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: TEXT }}>Novo Produto</h2>
            <form onSubmit={criarProduto} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Nome do produto</label>
                <input
                  className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                  style={iStyle}
                  placeholder="Ex: Milho, Ração, Fertilizante..."
                  value={novoProduto.nome}
                  onChange={(e) => setNovoProduto({ ...novoProduto, nome: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Unidade</label>
                  <select className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={iStyle}
                    value={novoProduto.unidade} onChange={(e) => setNovoProduto({ ...novoProduto, unidade: e.target.value })}>
                    <option value="kg">kg</option>
                    <option value="ton">ton</option>
                    <option value="L">L</option>
                    <option value="sc">sc (saca)</option>
                    <option value="un">un</option>
                    <option value="cx">cx</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Categoria</label>
                  <select className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={iStyle}
                    value={novoProduto.categoria} onChange={(e) => setNovoProduto({ ...novoProduto, categoria: e.target.value })}>
                    <option>Grãos</option>
                    <option>Semente</option>
                    <option>Ração</option>
                    <option>Adubo</option>
                    <option>Inseticida</option>
                    <option>Herbicida</option>
                    <option>Fungicida</option>
                    <option>Medicamentos</option>
                    <option>Diesel</option>
                    <option>Peças</option>
                    <option>Geral</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Fazenda</label>
                <select className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={iStyle}
                  value={novoProduto.fazenda} onChange={(e) => setNovoProduto({ ...novoProduto, fazenda: e.target.value })}>
                  {FAZENDAS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Quantidade inicial (opcional)</label>
                <input
                  type="number" min="0" step="0.01"
                  className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                  style={iStyle}
                  placeholder="0"
                  value={novoProduto.quantidadeInicial}
                  onChange={(e) => setNovoProduto({ ...novoProduto, quantidadeInicial: e.target.value })}
                />
              </div>
              {erro && <p className="text-xs" style={{ color: RED }}>{erro}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setModalNovo(false); setErro(""); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: BORDER, color: MUTED }}>
                  Cancelar
                </button>
                <button type="submit" disabled={carregando}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                  style={{ background: GREEN_DIM, color: GREEN, border: `1px solid ${GREEN}` }}>
                  {carregando ? "Salvando..." : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Movimentação */}
      {modalMov && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <h2 className="text-lg font-bold mb-1" style={{ color: TEXT }}>
              {novaMov.tipo === "ENTRADA" ? "Entrada de estoque" : "Saída de estoque"}
            </h2>
            <p className="text-sm mb-4" style={{ color: MUTED }}>{modalMov.nome}</p>
            <form onSubmit={registrarMovimentacao} className="space-y-3">
              <div className="flex gap-2">
                <button type="button" onClick={() => setNovaMov({ ...novaMov, tipo: "ENTRADA" })}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={{ background: novaMov.tipo === "ENTRADA" ? GREEN_DIM : "transparent", color: novaMov.tipo === "ENTRADA" ? GREEN : MUTED, borderColor: novaMov.tipo === "ENTRADA" ? GREEN : BORDER }}>
                  + Entrada
                </button>
                <button type="button" onClick={() => setNovaMov({ ...novaMov, tipo: "SAIDA" })}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={{ background: novaMov.tipo === "SAIDA" ? RED_DIM : "transparent", color: novaMov.tipo === "SAIDA" ? RED : MUTED, borderColor: novaMov.tipo === "SAIDA" ? RED : BORDER }}>
                  − Saída
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>
                  Quantidade ({modalMov.unidade})
                </label>
                <input type="number" min="0.01" step="0.01"
                  className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                  style={iStyle}
                  placeholder="0"
                  value={novaMov.quantidade}
                  onChange={(e) => setNovaMov({ ...novaMov, quantidade: e.target.value })}
                  required autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Responsável</label>
                <input
                  className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                  style={iStyle}
                  placeholder="Seu nome"
                  value={nomeResponsavel}
                  onChange={(e) => setNomeResponsavel(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Observação (opcional)</label>
                <input
                  className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                  style={iStyle}
                  placeholder="Ex: Compra fornecedor X..."
                  value={novaMov.observacao}
                  onChange={(e) => setNovaMov({ ...novaMov, observacao: e.target.value })}
                />
              </div>
              {erro && <p className="text-xs" style={{ color: RED }}>{erro}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setModalMov(null); setErro(""); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: BORDER, color: MUTED }}>
                  Cancelar
                </button>
                <button type="submit" disabled={carregando}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                  style={{
                    background: novaMov.tipo === "ENTRADA" ? GREEN_DIM : RED_DIM,
                    color: novaMov.tipo === "ENTRADA" ? GREEN : RED,
                    border: `1px solid ${novaMov.tipo === "ENTRADA" ? GREEN : RED}`,
                  }}>
                  {carregando ? "Salvando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
