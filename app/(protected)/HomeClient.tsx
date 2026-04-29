"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BG      = "#060C06";
const SURFACE = "#0C180C";
const LIFT    = "#132013";
const LINE    = "#1C3020";
const LINE2   = "#2C4A32";
const LINE3   = "#3A6642";

const GREEN   = "#4ADE80";
const G_DIM   = "#052E16";
const G_MID   = "#166534";

const GOLD    = "#FCD34D";
const GOLD_DIM= "#3B1B00";

const RED     = "#FCA5A5";
const RED_DIM = "#450A0A";

const BLUE    = "#93C5FD";
const BLUE_DIM= "#1E3A5F";

const TEXT    = "#F0FDF4";
const TEXT2   = "#86EFAC";
const MUTED   = "#6B7280";

const CAT_ICON: Record<string, string> = {
  "Grãos": "🌾", "Semente": "🌱", "Ração": "🥜", "Adubo": "♻️",
  "Inseticida": "🧪", "Herbicida": "🌿", "Fungicida": "🍄",
  "Medicamentos": "💊", "Diesel": "⛽", "Peças": "🔧", "Geral": "📦",
};

const ORDEM_CATEGORIAS = [
  "Grãos","Semente","Ração","Adubo","Inseticida",
  "Herbicida","Fungicida","Medicamentos","Diesel","Peças","Geral",
];
const CATEGORIAS_COM_BULA = ["Inseticida","Herbicida","Fungicida","Medicamentos"];

const iStyle = { background: SURFACE, color: TEXT, border: `1px solid ${LINE2}` };

type Aba = "dashboard" | "estoque" | "historico" | "colheitas" | "usuarios";

type DashFazenda = {
  nome: string;
  total: number;
  sem_estoque: number;
  por_categoria: { categoria: string; count: number; sem_estoque: number }[];
  ultima_mov: { criado_em: string; tipo: string; quantidade: number; produto: string; unidade: string } | null;
  colheitas_mes: { produto: string; total: number; unidade: string }[];
};

type Produto = {
  id: number; nome: string; unidade: string;
  quantidade: number; categoria: string; recomendacao: string;
};
type Fazenda = {
  id: number; nome: string; total_produtos: number; sem_estoque: number;
};
type Movimentacao = {
  id: number; tipo: string; quantidade: number;
  observacao: string; responsavel: string; criadoEm: string;
  produto: { nome: string; unidade: string };
};
type Colheita = {
  id: number; fazenda: string; produto: string; quantidade: number;
  unidade: string; destino: string; placa: string; observacao: string; data: string;
};
type Usuario = { id: number; usuario: string; role: string; criado_em: string };

function qtyColor(q: number) { return q < 0 ? RED : q === 0 ? GOLD : GREEN; }
function fmtQty(q: number)   { return q % 1 === 0 ? String(q) : q.toFixed(2); }
function fmtDate(d: string)  {
  return new Date(d).toLocaleString("pt-BR", {
    day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit",
  });
}
function initials(nome: string) {
  return nome.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const UNIDADES = ["kg","ton","L","sc","un","cx"];
const CATEGORIAS = ["Grãos","Semente","Ração","Adubo","Inseticida","Herbicida","Fungicida","Medicamentos","Diesel","Peças","Geral"];

export default function Home() {
  const [aba, setAba] = useState<Aba>("dashboard");
  const [dashData, setDashData] = useState<DashFazenda[]>([]);
  const [fazendas, setFazendas]   = useState<Fazenda[]>([]);
  const [fazenda, setFazenda]     = useState("");
  const [produtos, setProdutos]   = useState<Produto[]>([]);
  const [movs, setMovs]           = useState<Movimentacao[]>([]);
  const [colheitas, setColheitas] = useState<Colheita[]>([]);
  const [usuarios, setUsuarios]   = useState<Usuario[]>([]);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [busca, setBusca]         = useState("");
  const [catAberta, setCatAberta] = useState<Record<string, boolean>>({});
  const [filtroCol, setFiltroCol] = useState("");
  const [loading, setLoading]     = useState(false);
  const [erro, setErro]           = useState("");
  const [nomeResp, setNomeResp]   = useState("");

  const [modalNovo,    setModalNovo]    = useState(false);
  const [modalMov,     setModalMov]     = useState<Produto | null>(null);
  const [modalEdit,    setModalEdit]    = useState<Produto | null>(null);
  const [modalCarga,   setModalCarga]   = useState(false);
  const [menuAberto,   setMenuAberto]   = useState(false);

  const novoProdutoDefault = { nome:"", unidade:"kg", categoria:"Geral", fazenda:"", quantidadeInicial:"", recomendacao:"" };
  const novaMovDefault     = { tipo:"ENTRADA", quantidade:"", observacao:"", responsavel:"" };
  const novaCargaDefault   = { fazenda:"", produto:"", quantidade:"", unidade:"sc", destino:"", placa:"", observacao:"", data: new Date().toISOString().slice(0,10) };

  const [formProduto, setFormProduto] = useState(novoProdutoDefault);
  const [formMov,     setFormMov]     = useState(novaMovDefault);
  const [formEdit,    setFormEdit]    = useState({ nome:"", unidade:"kg", categoria:"Geral", fazenda:"", recomendacao:"" });
  const [formCarga,   setFormCarga]   = useState(novaCargaDefault);

  const router = useRouter();

  async function loadProdutos(faz = fazenda) {
    const [rp, rf] = await Promise.all([
      fetch(`/api/produtos?fazenda=${encodeURIComponent(faz)}`),
      fetch("/api/fazendas"),
    ]);
    setProdutos(await rp.json());
    setFazendas(await rf.json());
  }
  async function loadMovs()     { const r = await fetch("/api/movimentacoes"); setMovs(await r.json()); }
  async function loadUsuarios() { const r = await fetch("/api/usuarios"); if (r.ok) setUsuarios(await r.json()); }
  async function loadDashboard() {
    const r = await fetch("/api/dashboard");
    if (r.ok) setDashData(await r.json());
  }
  async function loadColheitas(faz?: string) {
    const url = faz ? `/api/colheitas?fazenda=${encodeURIComponent(faz)}` : "/api/colheitas";
    const r = await fetch(url); setColheitas(await r.json());
  }

  useEffect(() => {
    async function init() {
      const nome = localStorage.getItem("kamitani_responsavel") || "";
      setNomeResp(nome);
      const [rme, rf] = await Promise.all([fetch("/api/auth/me"), fetch("/api/fazendas")]);
      const me = await rme.json();
      const admin = me.role === "admin";
      setIsAdmin(admin);
      const lista: Fazenda[] = await rf.json();
      setFazendas(lista);
      if (lista.length > 0) {
        setFazenda(lista[0].nome);
        setFormProduto(p => ({ ...p, fazenda: lista[0].nome }));
        setFormCarga(c => ({ ...c, fazenda: lista[0].nome }));
      }
      if (admin) loadUsuarios();
      loadDashboard();
    }
    init();
  }, []);

  useEffect(() => {
    if (fazenda) { loadProdutos(fazenda); loadMovs(); }
  }, [fazenda]);

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function criarProduto(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErro("");
    const r = await fetch("/api/produtos", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(formProduto),
    });
    if (r.ok) {
      const p = await r.json();
      if (formProduto.quantidadeInicial && Number(formProduto.quantidadeInicial) > 0) {
        await fetch("/api/movimentacoes", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ produtoId: p.id, tipo:"ENTRADA", quantidade: formProduto.quantidadeInicial, observacao:"Estoque inicial" }),
        });
      }
      await loadProdutos(); await loadMovs();
      setModalNovo(false);
      setFormProduto({ ...novoProdutoDefault, fazenda });
    } else { setErro("Erro ao cadastrar produto."); }
    setLoading(false);
  }

  async function registrarMov(e: React.FormEvent) {
    e.preventDefault();
    if (!modalMov) return;
    setLoading(true); setErro("");
    if (nomeResp) localStorage.setItem("kamitani_responsavel", nomeResp);
    const r = await fetch("/api/movimentacoes", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ produtoId: modalMov.id, ...formMov, responsavel: nomeResp }),
    });
    if (r.ok) {
      await loadProdutos(); await loadMovs();
      setModalMov(null);
      setFormMov({ ...novaMovDefault, responsavel: nomeResp });
    } else { setErro("Erro ao registrar movimentação."); }
    setLoading(false);
  }

  async function salvarEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!modalEdit) return;
    setLoading(true); setErro("");
    const r = await fetch(`/api/produtos/${modalEdit.id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(formEdit),
    });
    if (r.ok) { await loadProdutos(); setModalEdit(null); }
    else { setErro("Erro ao salvar."); }
    setLoading(false);
  }

  async function excluirProduto(id: number) {
    if (!confirm("Excluir produto e todo seu histórico?")) return;
    await fetch(`/api/produtos/${id}`, { method:"DELETE" });
    await loadProdutos(); await loadMovs();
  }

  async function registrarCarga(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErro("");
    const r = await fetch("/api/colheitas", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(formCarga),
    });
    if (r.ok) {
      await loadColheitas(filtroCol || undefined);
      setModalCarga(false);
      setFormCarga({ ...novaCargaDefault, fazenda: fazenda || "" });
    } else { setErro("Erro ao registrar carga."); }
    setLoading(false);
  }

  async function excluirCarga(id: number) {
    if (!confirm("Excluir esta carga?")) return;
    await fetch("/api/colheitas", { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id }) });
    await loadColheitas(filtroCol || undefined);
  }

  async function excluirUsuario(id: number) {
    if (!confirm("Excluir este usuário?")) return;
    await fetch("/api/usuarios", { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id }) });
    await loadUsuarios();
  }

  const totalItens   = produtos.length;
  const semEstoque   = produtos.filter(p => p.quantidade <= 0).length;
  const filtrados    = busca.trim() ? produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase())) : produtos;
  const cats         = ORDEM_CATEGORIAS.filter(c => filtrados.some(p => p.categoria === c));
  const outrosCats   = [...new Set(filtrados.map(p => p.categoria))].filter(c => !ORDEM_CATEGORIAS.includes(c)).sort();
  const todasCats    = [...cats, ...outrosCats];

  const navItems: { id: Aba; label: string; icon: string }[] = [
    { id: "dashboard",  label: "Início",    icon: "◈" },
    { id: "estoque",    label: "Estoque",   icon: "▤" },
    { id: "historico",  label: "Histórico", icon: "↕" },
    { id: "colheitas",  label: "Colheitas", icon: "🌾" },
    ...(isAdmin ? [{ id: "usuarios" as Aba, label: "Usuários", icon: "◍" }] : []),
  ];

  function mudarAba(id: Aba) {
    setAba(id);
    if (id === "colheitas") loadColheitas(filtroCol || undefined);
    if (id === "usuarios")  loadUsuarios();
  }

  const abaLabel: Record<Aba, string> = {
    dashboard: "Kamitani Agro",
    estoque: "Estoque",
    historico: "Histórico",
    colheitas: "Colheitas",
    usuarios: "Usuários",
  };

  return (
    <div style={{ minHeight:"100dvh", background: BG, color: TEXT, fontFamily:"system-ui,-apple-system,sans-serif", display:"flex", flexDirection:"column" }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={{
        position:"sticky", top:0, zIndex:20,
        height:52, padding:"0 16px",
        background: SURFACE, borderBottom:`1px solid ${LINE}`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:32, height:32, borderRadius:8, flexShrink:0,
            background:`linear-gradient(135deg, ${G_MID}, ${GREEN})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:800, fontSize:11, color:"#050A05",
          }}>KA</div>
          <span style={{ fontSize:14, fontWeight:600, color: TEXT }}>{abaLabel[aba]}</span>
        </div>

        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {aba === "estoque" && (
            <button onClick={() => { setFormProduto({ ...novoProdutoDefault, fazenda }); setModalNovo(true); }} style={{
              padding:"0 14px", height:32, borderRadius:8, fontSize:12, fontWeight:600,
              background: G_DIM, color: GREEN, border:`1px solid ${LINE3}`,
              cursor:"pointer",
            }}>+ Produto</button>
          )}
          {aba === "colheitas" && (
            <button onClick={() => { setFormCarga(c => ({ ...c, fazenda: fazenda || "" })); setModalCarga(true); }} style={{
              padding:"0 14px", height:32, borderRadius:8, fontSize:12, fontWeight:600,
              background: G_DIM, color: GREEN, border:`1px solid ${LINE3}`,
              cursor:"pointer",
            }}>+ Carga</button>
          )}
          {aba === "dashboard" && (
            <button onClick={loadDashboard} style={{
              padding:"0 12px", height:32, borderRadius:8, fontSize:12,
              background:"transparent", color: MUTED, border:`1px solid ${LINE2}`,
              cursor:"pointer",
            }}>↺</button>
          )}
          {/* Menu conta */}
          <div style={{ position:"relative" }}>
            <button onClick={() => setMenuAberto(v => !v)} style={{
              width:32, height:32, borderRadius:8, border:`1px solid ${LINE2}`,
              background: LIFT, color: TEXT2, fontSize:13, fontWeight:700,
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              {nomeResp ? initials(nomeResp) : "≡"}
            </button>
            {menuAberto && (
              <>
                <div onClick={() => setMenuAberto(false)} style={{ position:"fixed", inset:0, zIndex:30 }} />
                <div style={{
                  position:"absolute", top:40, right:0, zIndex:40,
                  background: SURFACE, border:`1px solid ${LINE2}`,
                  borderRadius:10, padding:8, minWidth:160,
                  boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
                }}>
                  {nomeResp && (
                    <p style={{ fontSize:11, color: MUTED, padding:"4px 10px 8px", borderBottom:`1px solid ${LINE}`, marginBottom:4 }}>
                      {nomeResp}
                    </p>
                  )}
                  <button onClick={() => { sair(); setMenuAberto(false); }} style={{
                    width:"100%", textAlign:"left", padding:"8px 10px",
                    background:"transparent", border:"none", color: RED,
                    fontSize:13, cursor:"pointer", borderRadius:6,
                  }}>Sair da conta →</button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────── */}
      <div style={{ flex:1, padding:"16px 16px 80px", maxWidth:720, width:"100%", margin:"0 auto", boxSizing:"border-box" }}>

        {/* ── DASHBOARD ─────────────────────────────────────── */}
        {aba === "dashboard" && (
          <div>
            <p style={{ fontSize:11, color: MUTED, marginBottom:16 }}>
              {new Date().toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" })}
            </p>

            {dashData.length === 0 && (
              <div style={{ textAlign:"center", padding:"60px 0", color: MUTED }}>
                <div style={{ fontSize:36, marginBottom:8 }}>◈</div>
                <p style={{ fontSize:14 }}>Carregando dados...</p>
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {dashData.map(faz => {
                const pct = faz.total > 0 ? Math.round(((faz.total - faz.sem_estoque) / faz.total) * 100) : 0;
                const statusColor = faz.sem_estoque === 0 ? GREEN : faz.sem_estoque / faz.total > 0.3 ? RED : GOLD;
                const topCats = [...faz.por_categoria].sort((a,b) => b.count - a.count).slice(0, 5);

                return (
                  <div key={faz.nome} style={{
                    background: SURFACE, border:`1px solid ${LINE2}`,
                    borderLeft:`3px solid ${statusColor}`,
                    borderRadius:"0 12px 12px 0", overflow:"hidden",
                  }}>
                    {/* Card header */}
                    <div style={{ padding:"12px 14px 10px", display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <p style={{ fontSize:15, fontWeight:700, color: TEXT }}>{faz.nome}</p>
                          {faz.sem_estoque > 0 && (
                            <span style={{ fontSize:10, color: statusColor, background: statusColor === RED ? RED_DIM : GOLD_DIM, padding:"1px 7px", borderRadius:99, fontWeight:700 }}>
                              ⚠ {faz.sem_estoque}
                            </span>
                          )}
                        </div>
                        {/* Progress bar */}
                        <div style={{ marginTop:6 }}>
                          <div style={{ height:3, background: LINE2, borderRadius:99, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background: statusColor, borderRadius:99 }} />
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
                            <span style={{ fontSize:10, color: MUTED }}>{faz.total} produtos</span>
                            <span style={{ fontSize:10, fontWeight:600, color: statusColor }}>{pct}% em estoque</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => { setFazenda(faz.nome); mudarAba("estoque"); }}
                        style={{
                          padding:"6px 12px", borderRadius:8, fontSize:11, fontWeight:600,
                          background: G_DIM, color: GREEN, border:`1px solid ${LINE3}`,
                          cursor:"pointer", whiteSpace:"nowrap", flexShrink:0,
                        }}
                      >Ver →</button>
                    </div>

                    {/* Categories */}
                    {topCats.length > 0 && (
                      <div style={{ padding:"0 14px 10px", display:"flex", flexWrap:"wrap", gap:4 }}>
                        {topCats.map(cat => (
                          <span key={cat.categoria} style={{
                            fontSize:11, padding:"2px 8px", borderRadius:99,
                            background: LIFT, color: cat.sem_estoque > 0 ? GOLD : TEXT2,
                            border:`1px solid ${cat.sem_estoque > 0 ? GOLD_DIM : LINE}`,
                          }}>
                            {CAT_ICON[cat.categoria] || "📦"} {cat.categoria} <span style={{ color: MUTED }}>({cat.count})</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Bottom panels */}
                    <div style={{ display:"grid", gridTemplateColumns: faz.colheitas_mes.length > 0 ? "1fr 1fr" : "1fr", gap:0, borderTop:`1px solid ${LINE}` }}>
                      <div style={{ padding:"10px 14px", borderRight: faz.colheitas_mes.length > 0 ? `1px solid ${LINE}` : "none" }}>
                        <p style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.07em", color: MUTED, marginBottom:4 }}>Última mov.</p>
                        {faz.ultima_mov ? (
                          <>
                            <p style={{ fontSize:12, fontWeight:600, color: faz.ultima_mov.tipo === "ENTRADA" ? GREEN : RED }}>
                              {faz.ultima_mov.tipo === "ENTRADA" ? "↑" : "↓"} {fmtQty(faz.ultima_mov.quantidade)} {faz.ultima_mov.unidade}
                            </p>
                            <p style={{ fontSize:11, color: TEXT2, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{faz.ultima_mov.produto}</p>
                            <p style={{ fontSize:10, color: MUTED, marginTop:1 }}>{new Date(faz.ultima_mov.criado_em).toLocaleDateString("pt-BR")}</p>
                          </>
                        ) : (
                          <p style={{ fontSize:11, color: MUTED }}>Nenhuma ainda</p>
                        )}
                      </div>

                      {faz.colheitas_mes.length > 0 && (
                        <div style={{ padding:"10px 14px" }}>
                          <p style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.07em", color: MUTED, marginBottom:4 }}>
                            Colheitas {new Date().toLocaleDateString("pt-BR", { month:"short" }).replace(".","").toUpperCase()}
                          </p>
                          {faz.colheitas_mes.slice(0,3).map(c => (
                            <div key={c.produto} style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:2 }}>
                              <span style={{ fontSize:11, color: TEXT2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{c.produto}</span>
                              <span style={{ fontSize:11, fontWeight:700, color: GREEN, marginLeft:8, fontFamily:"ui-monospace,monospace", flexShrink:0 }}>
                                {fmtQty(c.total)}<span style={{ fontSize:10, fontWeight:400, color: MUTED }}> {c.unidade}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ESTOQUE ───────────────────────────────────────── */}
        {aba === "estoque" && (
          <div>
            {/* Farm selector */}
            <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:14, paddingBottom:2, scrollbarWidth:"none" }}>
              {fazendas.map(f => {
                const ativa = fazenda === f.nome;
                return (
                  <button key={f.id} onClick={() => setFazenda(f.nome)} style={{
                    padding:"6px 14px", borderRadius:99, fontSize:12, fontWeight:600,
                    whiteSpace:"nowrap", cursor:"pointer", flexShrink:0,
                    background: ativa ? G_DIM : "transparent",
                    color: ativa ? GREEN : MUTED,
                    border:`1px solid ${ativa ? LINE3 : LINE2}`,
                    transition:"all .15s",
                  }}>
                    {f.nome}
                    {f.sem_estoque > 0 && (
                      <span style={{ color: GOLD, marginLeft:5, fontSize:10 }}>⚠{f.sem_estoque}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Stats */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
              <div style={{ background: SURFACE, border:`1px solid ${LINE}`, borderRadius:10, padding:"12px 14px" }}>
                <p style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", color: MUTED }}>Produtos</p>
                <p style={{ fontSize:26, fontWeight:800, color: GREEN, marginTop:2, fontVariantNumeric:"tabular-nums" }}>{totalItens}</p>
              </div>
              <div style={{ background: SURFACE, border:`1px solid ${semEstoque > 0 ? GOLD_DIM : LINE}`, borderRadius:10, padding:"12px 14px" }}>
                <p style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", color: MUTED }}>Sem estoque</p>
                <p style={{ fontSize:26, fontWeight:800, color: semEstoque > 0 ? GOLD : MUTED, marginTop:2, fontVariantNumeric:"tabular-nums" }}>{semEstoque}</p>
              </div>
            </div>

            {/* Search */}
            <div style={{ position:"relative", marginBottom:12 }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color: MUTED, fontSize:13, pointerEvents:"none" }}>⌕</span>
              <input
                style={{ ...iStyle, width:"100%", borderRadius:10, padding:"9px 12px 9px 34px", fontSize:13, boxSizing:"border-box", outline:"none" }}
                placeholder="Buscar produto..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>

            {produtos.length === 0 && (
              <div style={{ textAlign:"center", padding:"48px 0", color: MUTED }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📦</div>
                <p style={{ fontSize:14 }}>Nenhum produto cadastrado.</p>
                <p style={{ fontSize:12, marginTop:4 }}>Toque em + Produto para começar.</p>
              </div>
            )}

            {todasCats.map(cat => {
              const prods  = filtrados.filter(p => p.categoria === cat).sort((a,b) => a.nome.localeCompare(b.nome,"pt-BR"));
              const aberta = catAberta[cat] !== false;
              if (prods.length === 0) return null;
              const emFalta = prods.filter(p => p.quantidade <= 0).length;

              return (
                <div key={cat} style={{ marginBottom:8 }}>
                  <button
                    onClick={() => setCatAberta(prev => ({ ...prev, [cat]: !aberta }))}
                    style={{
                      width:"100%", display:"flex", alignItems:"center", gap:8,
                      padding:"6px 4px", background:"transparent", border:"none", cursor:"pointer",
                      marginBottom: aberta ? 4 : 0,
                    }}
                  >
                    <span style={{ fontSize:14 }}>{CAT_ICON[cat] || "📦"}</span>
                    <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color: TEXT2 }}>{cat}</span>
                    <span style={{ fontSize:11, color: MUTED, background: LIFT, padding:"0 6px", borderRadius:99 }}>{prods.length}</span>
                    {emFalta > 0 && (
                      <span style={{ fontSize:10, fontWeight:700, color: GOLD, background: GOLD_DIM, padding:"0 6px", borderRadius:99 }}>⚠ {emFalta}</span>
                    )}
                    <div style={{ flex:1, height:1, background: LINE, marginLeft:4 }} />
                    <span style={{ fontSize:10, color: MUTED }}>{aberta ? "▲" : "▼"}</span>
                  </button>

                  {aberta && (
                    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                      {prods.map(p => (
                        <div key={p.id} style={{
                          display:"flex", alignItems:"center", gap:8,
                          background: SURFACE, border:`1px solid ${LINE}`,
                          borderLeft:`3px solid ${qtyColor(p.quantidade)}`,
                          borderRadius:"0 8px 8px 0", padding:"10px 12px",
                        }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:13, fontWeight:500, color: TEXT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.nome}</p>
                            {p.recomendacao && (
                              <p style={{ fontSize:11, color: MUTED, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.recomendacao}</p>
                            )}
                          </div>

                          <span style={{ fontFamily:"ui-monospace,monospace", fontSize:13, fontWeight:700, color: qtyColor(p.quantidade), flexShrink:0 }}>
                            {fmtQty(p.quantidade)}<span style={{ fontSize:11, fontWeight:400, color: MUTED, marginLeft:3 }}>{p.unidade}</span>
                          </span>

                          <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                            {CATEGORIAS_COM_BULA.includes(p.categoria) && (
                              <a href={`https://www.google.com/search?q=${encodeURIComponent(p.nome+" bula")}&as_sitesearch=gov.br`}
                                target="_blank" rel="noopener noreferrer"
                                style={{ padding:"4px 8px", borderRadius:6, fontSize:11, background: BLUE_DIM, color: BLUE, textDecoration:"none" }}
                                title="Ver bula">📋</a>
                            )}
                            <button onClick={() => { setModalMov(p); setFormMov({ tipo:"ENTRADA", quantidade:"", observacao:"", responsavel: nomeResp }); }}
                              style={{ padding:"4px 8px", borderRadius:6, fontSize:12, fontWeight:700, background: G_DIM, color: GREEN, border:"none", cursor:"pointer" }}>+</button>
                            <button onClick={() => { setModalMov(p); setFormMov({ tipo:"SAIDA", quantidade:"", observacao:"", responsavel: nomeResp }); }}
                              style={{ padding:"4px 8px", borderRadius:6, fontSize:12, fontWeight:700, background: RED_DIM, color: RED, border:"none", cursor:"pointer" }}>−</button>
                            <button onClick={() => { setFormEdit({ nome:p.nome, unidade:p.unidade, categoria:p.categoria, fazenda, recomendacao:p.recomendacao||"" }); setModalEdit(p); }}
                              style={{ padding:"4px 8px", borderRadius:6, fontSize:12, background: LIFT, color: MUTED, border:`1px solid ${LINE2}`, cursor:"pointer" }}>✎</button>
                            <button onClick={() => excluirProduto(p.id)}
                              style={{ padding:"4px 8px", borderRadius:6, fontSize:12, background: LIFT, color: MUTED, border:`1px solid ${LINE2}`, cursor:"pointer" }}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── HISTÓRICO ─────────────────────────────────────── */}
        {aba === "historico" && (
          <div>
            {/* Farm selector */}
            <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:14, paddingBottom:2, scrollbarWidth:"none" }}>
              {fazendas.map(f => {
                const ativa = fazenda === f.nome;
                return (
                  <button key={f.id} onClick={() => setFazenda(f.nome)} style={{
                    padding:"6px 14px", borderRadius:99, fontSize:12, fontWeight:600,
                    whiteSpace:"nowrap", cursor:"pointer", flexShrink:0,
                    background: ativa ? G_DIM : "transparent",
                    color: ativa ? GREEN : MUTED,
                    border:`1px solid ${ativa ? LINE3 : LINE2}`,
                    transition:"all .15s",
                  }}>
                    {f.nome}
                  </button>
                );
              })}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {movs.length === 0 && (
                <div style={{ textAlign:"center", padding:"48px 0", color: MUTED }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>↕</div>
                  <p style={{ fontSize:14 }}>Nenhuma movimentação registrada.</p>
                </div>
              )}
              {movs.map(m => {
                const entrada = m.tipo === "ENTRADA";
                return (
                  <div key={m.id} style={{
                    display:"flex", alignItems:"center", gap:12,
                    background: SURFACE, border:`1px solid ${LINE}`,
                    borderLeft:`3px solid ${entrada ? GREEN : RED}`,
                    borderRadius:"0 10px 10px 0", padding:"12px 14px",
                  }}>
                    <div style={{
                      width:32, height:32, borderRadius:8,
                      background: entrada ? G_DIM : RED_DIM,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:16, color: entrada ? GREEN : RED, flexShrink:0,
                    }}>{entrada ? "↑" : "↓"}</div>

                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:500, color: TEXT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.produto.nome}</p>
                      <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2, flexWrap:"wrap" }}>
                        {m.responsavel && <span style={{ fontSize:11, color: BLUE, fontWeight:600 }}>{m.responsavel}</span>}
                        {m.responsavel && m.observacao && <span style={{ fontSize:11, color: MUTED }}>·</span>}
                        {m.observacao && <span style={{ fontSize:11, color: MUTED }}>{m.observacao}</span>}
                      </div>
                    </div>

                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <p style={{ fontSize:13, fontWeight:700, color: entrada ? GREEN : RED, fontFamily:"ui-monospace,monospace" }}>
                        {entrada ? "+" : "−"}{m.quantidade} {m.produto.unidade}
                      </p>
                      <p style={{ fontSize:10, color: MUTED, marginTop:2 }}>{fmtDate(m.criadoEm)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── COLHEITAS ─────────────────────────────────────── */}
        {aba === "colheitas" && (
          <div>
            {/* Farm filter pills */}
            <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:14, paddingBottom:2, scrollbarWidth:"none" }}>
              <button onClick={() => { setFiltroCol(""); loadColheitas(undefined); }} style={{
                padding:"6px 14px", borderRadius:99, fontSize:12, fontWeight:600,
                whiteSpace:"nowrap", cursor:"pointer", flexShrink:0,
                background: !filtroCol ? G_DIM : "transparent",
                color: !filtroCol ? GREEN : MUTED,
                border:`1px solid ${!filtroCol ? LINE3 : LINE2}`,
              }}>Todas</button>
              {fazendas.map(f => (
                <button key={f.id} onClick={() => { setFiltroCol(f.nome); loadColheitas(f.nome); }} style={{
                  padding:"6px 14px", borderRadius:99, fontSize:12, fontWeight:600,
                  whiteSpace:"nowrap", cursor:"pointer", flexShrink:0,
                  background: filtroCol === f.nome ? G_DIM : "transparent",
                  color: filtroCol === f.nome ? GREEN : MUTED,
                  border:`1px solid ${filtroCol === f.nome ? LINE3 : LINE2}`,
                }}>{f.nome}</button>
              ))}
            </div>

            {colheitas.length === 0 && (
              <div style={{ textAlign:"center", padding:"48px 0", color: MUTED }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🌾</div>
                <p style={{ fontSize:14 }}>Nenhuma carga registrada.</p>
              </div>
            )}

            {colheitas.length > 0 && (() => {
              const totais: Record<string, { qtd:number; un:string }> = {};
              colheitas.forEach(c => {
                if (!totais[c.produto]) totais[c.produto] = { qtd:0, un: c.unidade };
                totais[c.produto].qtd += c.quantidade;
              });
              return (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:8, marginBottom:14 }}>
                  {Object.entries(totais).map(([prod, { qtd, un }]) => (
                    <div key={prod} style={{ background: SURFACE, border:`1px solid ${LINE2}`, borderRadius:10, padding:"10px 12px" }}>
                      <p style={{ fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", color: MUTED }}>{prod}</p>
                      <p style={{ fontSize:20, fontWeight:800, color: GREEN, marginTop:4, fontFamily:"ui-monospace,monospace" }}>
                        {fmtQty(qtd)}<span style={{ fontSize:11, fontWeight:400, color: MUTED, marginLeft:4 }}>{un}</span>
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {colheitas.map(c => (
                <div key={c.id} style={{
                  display:"flex", alignItems:"flex-start", gap:12,
                  background: SURFACE, border:`1px solid ${LINE}`,
                  borderLeft:`3px solid ${GREEN}`,
                  borderRadius:"0 10px 10px 0", padding:"12px 14px",
                }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontSize:13, fontWeight:600, color: TEXT }}>{c.produto}</span>
                      <span style={{ fontSize:12, fontWeight:700, color: GREEN, fontFamily:"ui-monospace,monospace" }}>{fmtQty(c.quantidade)} {c.unidade}</span>
                      <span style={{ fontSize:10, color: GREEN, background: G_DIM, padding:"1px 7px", borderRadius:99, fontWeight:600 }}>{c.fazenda}</span>
                    </div>
                    <p style={{ fontSize:11, color: MUTED, marginTop:4 }}>
                      {new Date(c.data+"T12:00:00").toLocaleDateString("pt-BR")}
                      {c.destino    && ` · ${c.destino}`}
                      {c.placa      && ` · ${c.placa}`}
                      {c.observacao && ` · ${c.observacao}`}
                    </p>
                  </div>
                  <button onClick={() => excluirCarga(c.id)} style={{
                    padding:"4px 8px", borderRadius:6, fontSize:11,
                    background: RED_DIM, color: RED, border:"none", cursor:"pointer", flexShrink:0,
                  }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── USUÁRIOS ──────────────────────────────────────── */}
        {aba === "usuarios" && isAdmin && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <p style={{ fontSize:13, fontWeight:600, color: TEXT2 }}>Usuários cadastrados</p>
              <a href="/cadastro" target="_blank" style={{
                padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:600,
                background: G_DIM, color: GREEN, border:`1px solid ${LINE3}`, textDecoration:"none",
              }}>+ Novo</a>
            </div>
            {usuarios.length === 0 && (
              <div style={{ textAlign:"center", padding:"48px 0", color: MUTED }}>
                <div style={{ fontSize:32, marginBottom:8 }}>◍</div>
                <p style={{ fontSize:14 }}>Nenhum usuário cadastrado.</p>
              </div>
            )}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {usuarios.map(u => (
                <div key={u.id} style={{
                  display:"flex", alignItems:"center", gap:12,
                  background: SURFACE, border:`1px solid ${LINE}`, borderRadius:10, padding:"12px 14px",
                }}>
                  <div style={{
                    width:34, height:34, borderRadius:8,
                    background: LIFT, border:`1px solid ${LINE2}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:12, fontWeight:700, color: TEXT2, flexShrink:0,
                  }}>{initials(u.usuario)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:500, color: TEXT }}>{u.usuario}</p>
                    <p style={{ fontSize:11, color: MUTED, marginTop:1 }}>
                      {u.role === "admin" ? "Administrador" : "Usuário"} · desde {new Date(u.criado_em).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <button onClick={() => excluirUsuario(u.id)} style={{
                    padding:"5px 10px", borderRadius:6, fontSize:11, fontWeight:600,
                    background: RED_DIM, color: RED, border:"none", cursor:"pointer",
                  }}>Excluir</button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── Bottom Navigation ──────────────────────────────── */}
      <nav style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:20,
        height:60, background: SURFACE, borderTop:`1px solid ${LINE}`,
        display:"flex",
      }}>
        {navItems.map(item => {
          const ativo = aba === item.id;
          return (
            <button key={item.id} onClick={() => mudarAba(item.id)} style={{
              flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:3, background:"transparent", border:"none", cursor:"pointer",
              color: ativo ? GREEN : MUTED,
              borderTop: ativo ? `2px solid ${GREEN}` : "2px solid transparent",
              transition:"all .15s",
            }}>
              <span style={{ fontSize:15, lineHeight:1 }}>{item.icon}</span>
              <span style={{ fontSize:10, fontWeight: ativo ? 700 : 400, letterSpacing:"0.02em" }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Modal: Registrar Carga ──────────────────────────── */}
      {modalCarga && (
        <Modal title="Registrar Carga" onClose={() => { setModalCarga(false); setErro(""); }}>
          <form onSubmit={registrarCarga} style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="Fazenda">
                <select style={iStyle} value={formCarga.fazenda} onChange={e => setFormCarga({ ...formCarga, fazenda: e.target.value })}>
                  {fazendas.map(f => <option key={f.id}>{f.nome}</option>)}
                </select>
              </Field>
              <Field label="Data">
                <input type="date" style={iStyle} value={formCarga.data} onChange={e => setFormCarga({ ...formCarga, data: e.target.value })} required />
              </Field>
            </div>
            <Field label="Produto (grão)">
              <input style={iStyle} placeholder="Ex: Soja, Milho, Trigo..." value={formCarga.produto} onChange={e => setFormCarga({ ...formCarga, produto: e.target.value })} required autoFocus />
            </Field>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="Quantidade">
                <input type="number" min="0" step="0.01" style={iStyle} placeholder="0" value={formCarga.quantidade} onChange={e => setFormCarga({ ...formCarga, quantidade: e.target.value })} required />
              </Field>
              <Field label="Unidade">
                <select style={iStyle} value={formCarga.unidade} onChange={e => setFormCarga({ ...formCarga, unidade: e.target.value })}>
                  <option value="sc">sc (saca)</option>
                  <option value="ton">ton</option>
                  <option value="kg">kg</option>
                </select>
              </Field>
            </div>
            <Field label="Destino / Silo">
              <input style={iStyle} placeholder="Ex: Silo Bunge, Armazém..." value={formCarga.destino} onChange={e => setFormCarga({ ...formCarga, destino: e.target.value })} />
            </Field>
            <Field label="Placa do caminhão (opcional)">
              <input style={iStyle} placeholder="Ex: ABC-1234" value={formCarga.placa} onChange={e => setFormCarga({ ...formCarga, placa: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Observação (opcional)">
              <input style={iStyle} placeholder="Notas adicionais..." value={formCarga.observacao} onChange={e => setFormCarga({ ...formCarga, observacao: e.target.value })} />
            </Field>
            {erro && <p style={{ fontSize:12, color: RED }}>{erro}</p>}
            <ModalActions loading={loading} labelOk="Registrar carga" colorOk={GREEN} bgOk={G_DIM} borderOk={LINE3} onCancel={() => { setModalCarga(false); setErro(""); }} />
          </form>
        </Modal>
      )}

      {/* ── Modal: Novo Produto ─────────────────────────────── */}
      {modalNovo && (
        <Modal title="Novo Produto" onClose={() => { setModalNovo(false); setErro(""); }}>
          <form onSubmit={criarProduto} style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="Nome do produto">
              <input style={iStyle} placeholder="Ex: Milho, Ração, Fertilizante..." value={formProduto.nome} onChange={e => setFormProduto({ ...formProduto, nome: e.target.value })} required autoFocus />
            </Field>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="Unidade">
                <select style={iStyle} value={formProduto.unidade} onChange={e => setFormProduto({ ...formProduto, unidade: e.target.value })}>
                  {UNIDADES.map(u => <option key={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Categoria">
                <select style={iStyle} value={formProduto.categoria} onChange={e => setFormProduto({ ...formProduto, categoria: e.target.value })}>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Fazenda">
              <select style={iStyle} value={formProduto.fazenda} onChange={e => setFormProduto({ ...formProduto, fazenda: e.target.value })}>
                {fazendas.map(f => <option key={f.id}>{f.nome}</option>)}
              </select>
            </Field>
            <Field label="Quantidade inicial (opcional)">
              <input type="number" min="0" step="0.01" style={iStyle} placeholder="0" value={formProduto.quantidadeInicial} onChange={e => setFormProduto({ ...formProduto, quantidadeInicial: e.target.value })} />
            </Field>
            <Field label="Recomendação de aplicação (opcional)">
              <input style={iStyle} placeholder="Ex: 0,5 L/ha após emergência" value={formProduto.recomendacao} onChange={e => setFormProduto({ ...formProduto, recomendacao: e.target.value })} />
            </Field>
            {erro && <p style={{ fontSize:12, color: RED }}>{erro}</p>}
            <ModalActions loading={loading} labelOk="Cadastrar" colorOk={GREEN} bgOk={G_DIM} borderOk={LINE3} onCancel={() => { setModalNovo(false); setErro(""); }} />
          </form>
        </Modal>
      )}

      {/* ── Modal: Editar Produto ───────────────────────────── */}
      {modalEdit && (
        <Modal title={`Editar · ${modalEdit.nome}`} onClose={() => { setModalEdit(null); setErro(""); }}>
          <form onSubmit={salvarEdit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Field label="Nome do produto">
              <input style={iStyle} value={formEdit.nome} onChange={e => setFormEdit({ ...formEdit, nome: e.target.value })} required autoFocus />
            </Field>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="Unidade">
                <select style={iStyle} value={formEdit.unidade} onChange={e => setFormEdit({ ...formEdit, unidade: e.target.value })}>
                  {UNIDADES.map(u => <option key={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Categoria">
                <select style={iStyle} value={formEdit.categoria} onChange={e => setFormEdit({ ...formEdit, categoria: e.target.value })}>
                  {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Fazenda">
              <select style={iStyle} value={formEdit.fazenda} onChange={e => setFormEdit({ ...formEdit, fazenda: e.target.value })}>
                {fazendas.map(f => <option key={f.id}>{f.nome}</option>)}
              </select>
            </Field>
            <Field label="Recomendação de aplicação (opcional)">
              <input style={iStyle} placeholder="Ex: 0,5 L/ha após emergência" value={formEdit.recomendacao} onChange={e => setFormEdit({ ...formEdit, recomendacao: e.target.value })} />
            </Field>
            {erro && <p style={{ fontSize:12, color: RED }}>{erro}</p>}
            <ModalActions loading={loading} labelOk="Salvar alterações" colorOk={GREEN} bgOk={G_DIM} borderOk={LINE3} onCancel={() => { setModalEdit(null); setErro(""); }} />
          </form>
        </Modal>
      )}

      {/* ── Modal: Movimentação ─────────────────────────────── */}
      {modalMov && (
        <Modal title={modalMov.nome} onClose={() => { setModalMov(null); setErro(""); }}>
          <form onSubmit={registrarMov} style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {(["ENTRADA","SAIDA"] as const).map(t => {
                const ativo = formMov.tipo === t;
                const col   = t === "ENTRADA" ? GREEN : RED;
                const bg    = t === "ENTRADA" ? G_DIM  : RED_DIM;
                return (
                  <button key={t} type="button" onClick={() => setFormMov({ ...formMov, tipo: t })} style={{
                    padding:"10px", borderRadius:8, fontSize:13, fontWeight:600,
                    background: ativo ? bg : "transparent",
                    color: ativo ? col : MUTED,
                    border:`1px solid ${ativo ? col : LINE2}`,
                    cursor:"pointer", transition:"all .15s",
                  }}>
                    {t === "ENTRADA" ? "↑ Entrada" : "↓ Saída"}
                  </button>
                );
              })}
            </div>

            <Field label={`Quantidade (${modalMov.unidade})`}>
              <input type="number" min="0.01" step="0.01" style={iStyle} placeholder="0" value={formMov.quantidade} onChange={e => setFormMov({ ...formMov, quantidade: e.target.value })} required autoFocus />
            </Field>
            <Field label="Responsável">
              <input style={iStyle} placeholder="Seu nome" value={nomeResp} onChange={e => setNomeResp(e.target.value)} />
            </Field>
            <Field label="Observação (opcional)">
              <input style={iStyle} placeholder="Ex: Compra fornecedor X..." value={formMov.observacao} onChange={e => setFormMov({ ...formMov, observacao: e.target.value })} />
            </Field>
            {erro && <p style={{ fontSize:12, color: RED }}>{erro}</p>}
            <ModalActions
              loading={loading}
              labelOk={formMov.tipo === "ENTRADA" ? "Registrar entrada" : "Registrar saída"}
              colorOk={formMov.tipo === "ENTRADA" ? GREEN : RED}
              bgOk={formMov.tipo === "ENTRADA" ? G_DIM : RED_DIM}
              borderOk={formMov.tipo === "ENTRADA" ? LINE3 : RED}
              onCancel={() => { setModalMov(null); setErro(""); }}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"flex-end", justifyContent:"center", padding:16, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width:"100%", maxWidth:440, background: SURFACE, border:`1px solid ${LINE}`,
        borderRadius:16, padding:24, maxHeight:"90dvh", overflowY:"auto",
        boxShadow:"0 24px 64px rgba(0,0,0,0.6)",
      }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <h2 style={{ fontSize:16, fontWeight:700, color: TEXT, margin:0 }}>{title}</h2>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:6, background: LIFT, border:"none", color: MUTED, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <label style={{ fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", color: MUTED }}>{label}</label>
      <div style={{ display:"contents" }}>{children}</div>
    </div>
  );
}

function ModalActions({ loading, labelOk, colorOk, bgOk, borderOk, onCancel }: {
  loading: boolean; labelOk: string;
  colorOk: string; bgOk: string; borderOk: string;
  onCancel: () => void;
}) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, paddingTop:4 }}>
      <button type="button" onClick={onCancel} style={{
        padding:"11px", borderRadius:10, fontSize:13, fontWeight:500,
        background:"transparent", border:`1px solid ${LINE2}`, color: MUTED, cursor:"pointer",
      }}>Cancelar</button>
      <button type="submit" disabled={loading} style={{
        padding:"11px", borderRadius:10, fontSize:13, fontWeight:600,
        background: bgOk, color: colorOk, border:`1px solid ${borderOk}`,
        cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
      }}>{loading ? "Salvando..." : labelOk}</button>
    </div>
  );
}
