"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  criadoEm: string;
  produto: { nome: string; unidade: string };
};

export default function Home() {
  const [aba, setAba] = useState<"estoque" | "historico">("estoque");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);

  const [modalNovo, setModalNovo] = useState(false);
  const [modalMov, setModalMov] = useState<Produto | null>(null);

  const [novoProduto, setNovoProduto] = useState({ nome: "", unidade: "kg", categoria: "Geral", quantidadeInicial: "" });
  const [novaMov, setNovaMov] = useState({ tipo: "ENTRADA", quantidade: "", observacao: "" });

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function carregarProdutos() {
    const r = await fetch("/api/produtos");
    setProdutos(await r.json());
  }

  async function carregarHistorico() {
    const r = await fetch("/api/movimentacoes");
    setMovimentacoes(await r.json());
  }

  useEffect(() => {
    carregarProdutos();
    carregarHistorico();
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
      setNovoProduto({ nome: "", unidade: "kg", categoria: "Geral", quantidadeInicial: "" });
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
    const r = await fetch("/api/movimentacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produtoId: modalMov.id, ...novaMov }),
    });
    if (r.ok) {
      await carregarProdutos();
      await carregarHistorico();
      setModalMov(null);
      setNovaMov({ tipo: "ENTRADA", quantidade: "", observacao: "" });
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-700 text-white px-4 py-4 shadow">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌾</span>
            <div>
              <h1 className="text-xl font-bold leading-tight">Kamitani Agro</h1>
              <p className="text-green-200 text-xs">Controle de estoque</p>
            </div>
          </div>
          <button
            onClick={sair}
            className="text-green-200 hover:text-white text-xs underline"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Cards resumo */}
      <div className="max-w-3xl mx-auto px-4 pt-4 grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Produtos</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{totalItens}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Sem estoque</p>
          <p className={`text-3xl font-bold mt-1 ${estoqueBaixo > 0 ? "text-red-500" : "text-gray-400"}`}>
            {estoqueBaixo}
          </p>
        </div>
      </div>

      {/* Abas */}
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-gray-200 p-1 rounded-xl">
          <button
            onClick={() => setAba("estoque")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              aba === "estoque" ? "bg-white text-green-700 shadow-sm" : "text-gray-500"
            }`}
          >
            Estoque
          </button>
          <button
            onClick={() => setAba("historico")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              aba === "historico" ? "bg-white text-green-700 shadow-sm" : "text-gray-500"
            }`}
          >
            Histórico
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        {aba === "estoque" && (
          <div className="space-y-3">
            <button
              onClick={() => setModalNovo(true)}
              className="w-full bg-green-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-800 transition-colors"
            >
              + Novo Produto
            </button>

            {produtos.length === 0 && (
              <div className="text-center text-gray-400 py-12 text-sm">
                Nenhum produto cadastrado ainda.
              </div>
            )}

            {produtos.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{p.nome}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.categoria}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${p.quantidade <= 0 ? "text-red-500" : "text-green-700"}`}>
                      {p.quantidade % 1 === 0 ? p.quantidade : p.quantidade.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">{p.unidade}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setModalMov(p); setNovaMov({ tipo: "ENTRADA", quantidade: "", observacao: "" }); }}
                    className="flex-1 bg-green-50 text-green-700 py-1.5 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                  >
                    + Entrada
                  </button>
                  <button
                    onClick={() => { setModalMov(p); setNovaMov({ tipo: "SAIDA", quantidade: "", observacao: "" }); }}
                    className="flex-1 bg-red-50 text-red-600 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                  >
                    − Saída
                  </button>
                  <button
                    onClick={() => excluirProduto(p.id)}
                    className="bg-gray-100 text-gray-400 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-200 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {aba === "historico" && (
          <div className="space-y-2">
            {movimentacoes.length === 0 && (
              <div className="text-center text-gray-400 py-12 text-sm">
                Nenhuma movimentação registrada.
              </div>
            )}
            {movimentacoes.map((m) => (
              <div key={m.id} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-3">
                <span className={`text-lg ${m.tipo === "ENTRADA" ? "text-green-600" : "text-red-500"}`}>
                  {m.tipo === "ENTRADA" ? "↑" : "↓"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{m.produto.nome}</p>
                  {m.observacao && <p className="text-xs text-gray-400 truncate">{m.observacao}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold text-sm ${m.tipo === "ENTRADA" ? "text-green-600" : "text-red-500"}`}>
                    {m.tipo === "ENTRADA" ? "+" : "−"}{m.quantidade} {m.produto.unidade}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(m.criadoEm).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Novo Produto */}
      {modalNovo && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-gray-900">Novo Produto</h2>
            <form onSubmit={criarProduto} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome do produto</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: Milho, Ração, Fertilizante..."
                  value={novoProduto.nome}
                  onChange={(e) => setNovoProduto({ ...novoProduto, nome: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unidade</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={novoProduto.unidade}
                    onChange={(e) => setNovoProduto({ ...novoProduto, unidade: e.target.value })}
                  >
                    <option value="kg">kg</option>
                    <option value="ton">ton</option>
                    <option value="L">L</option>
                    <option value="sc">sc (saca)</option>
                    <option value="un">un</option>
                    <option value="cx">cx</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={novoProduto.categoria}
                    onChange={(e) => setNovoProduto({ ...novoProduto, categoria: e.target.value })}
                  >
                    <option>Geral</option>
                    <option>Ração</option>
                    <option>Grãos</option>
                    <option>Inseticida</option>
                    <option>Herbicida</option>
                    <option>Fungicida</option>
                    <option>Medicamentos</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade inicial (opcional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0"
                  value={novoProduto.quantidadeInicial}
                  onChange={(e) => setNovoProduto({ ...novoProduto, quantidadeInicial: e.target.value })}
                />
              </div>
              {erro && <p className="text-red-500 text-xs">{erro}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalNovo(false); setErro(""); }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={carregando}
                  className="flex-1 bg-green-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                >
                  {carregando ? "Salvando..." : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Movimentação */}
      {modalMov && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-bold mb-1 text-gray-900">
              {novaMov.tipo === "ENTRADA" ? "Entrada de estoque" : "Saída de estoque"}
            </h2>
            <p className="text-sm text-gray-500 mb-4">{modalMov.nome}</p>
            <form onSubmit={registrarMovimentacao} className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNovaMov({ ...novaMov, tipo: "ENTRADA" })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    novaMov.tipo === "ENTRADA"
                      ? "bg-green-600 text-white border-green-600"
                      : "border-gray-200 text-gray-500"
                  }`}
                >
                  + Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setNovaMov({ ...novaMov, tipo: "SAIDA" })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    novaMov.tipo === "SAIDA"
                      ? "bg-red-500 text-white border-red-500"
                      : "border-gray-200 text-gray-500"
                  }`}
                >
                  − Saída
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Quantidade ({modalMov.unidade})
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0"
                  value={novaMov.quantidade}
                  onChange={(e) => setNovaMov({ ...novaMov, quantidade: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observação (opcional)</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: Compra fornecedor X..."
                  value={novaMov.observacao}
                  onChange={(e) => setNovaMov({ ...novaMov, observacao: e.target.value })}
                />
              </div>
              {erro && <p className="text-red-500 text-xs">{erro}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalMov(null); setErro(""); }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={carregando}
                  className={`flex-1 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 ${
                    novaMov.tipo === "ENTRADA" ? "bg-green-700" : "bg-red-500"
                  }`}
                >
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
