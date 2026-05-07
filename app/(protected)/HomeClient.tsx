"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

const BG      = "#070D07";
const SURFACE = "#0F1A0F";
const LIFT    = "#172417";
const LINE    = "#1F2F1F";
const LINE2   = "#2C4830";
const LINE3   = "#3C6244";

const GREEN   = "#4ADE80";
const G_DIM   = "#081F10";
const G_MID   = "#155228";

const GOLD    = "#F59E0B";
const GOLD_DIM= "#261400";

const RED     = "#F87171";
const RED_DIM = "#3C0A0A";

const BLUE    = "#60A5FA";
const BLUE_DIM= "#0E2A50";

const TEXT    = "#F0FFF0";
const TEXT2   = "#86EFAC";
const MUTED   = "#527A5C";

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

const iStyle = { background: SURFACE, color: TEXT, border: `1px solid ${LINE2}`, fontSize: 16 };

function parseGeoCoords(raw: string): { lat: number; lng: number } | null {
  const s = raw.trim();
  // Decimal: "-15.7802, -47.9291" or "-15.7802 -47.9291"
  const dec = s.match(/^(-?\d+[.,]\d+)\s*[,;]\s*(-?\d+[.,]\d+)$/)
           || s.match(/^(-?\d+[.,]\d+)\s+(-?\d+[.,]\d+)$/);
  if (dec) {
    const lat = parseFloat(dec[1].replace(",", "."));
    const lng = parseFloat(dec[2].replace(",", "."));
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
  }
  // DMS: e.g. "15°46'48.53"S 47°55'45.27"O" or "47°55'45.27"O 15°46'48.53"S"
  const parts = [...s.matchAll(/(\d+)[^\d]+(\d+)[^\d]+([\d.,]+)[^\d]+([NSnsEeWwOoLl])/gi)];
  if (parts.length === 2) {
    const toD = (g: RegExpMatchArray) => {
      const v = parseInt(g[1]) + parseInt(g[2]) / 60 + parseFloat(g[3].replace(",", ".")) / 3600;
      return /[SsWwOo]/i.test(g[4]) ? -v : v;
    };
    const a = toD(parts[0]);
    const b = toD(parts[1]);
    return /[NSns]/i.test(parts[0][4]) ? { lat: a, lng: b } : { lat: b, lng: a };
  }
  return null;
}

type Aba = "dashboard" | "estoque" | "historico" | "colheitas" | "chuvas" | "usuarios" | "admin" | "fazendas";
type Log = { id: number; usuario: string; acao: string; detalhes: string; fazenda: string; criado_em: string };

type DashFazenda = {
  nome: string;
  total: number;
  sem_estoque: number;
  por_categoria: { categoria: string; count: number; sem_estoque: number }[];
  ultima_mov: { criado_em: string; tipo: string; quantidade: number; produto: string; unidade: string } | null;
  colheitas_mes: { produto: string; total: number; unidade: string }[];
  chuva_semana: number;
  chuva_ano: number;
};

type Produto = {
  id: number; nome: string; unidade: string;
  quantidade: number; categoria: string; recomendacao: string;
};
type Fazenda = {
  id: number; nome: string; total_produtos: number; sem_estoque: number;
  latitude: number | null; longitude: number | null;
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
type Usuario = { id: number; usuario: string; role: string; criado_em: string; fazendas: string[] };
type Chuva = { id: number; fazenda: string; mm: number; data: string; observacao: string; criado_em: string };

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

const BASE_NAV: { id: Aba; label: string }[] = [
  { id: "dashboard",  label: "Home"      },
  { id: "estoque",    label: "Estoque"   },
  { id: "colheitas",  label: "Colheitas" },
  { id: "chuvas",     label: "Chuvas"    },
  { id: "fazendas",   label: "Fazendas"  },
];
const ABA_LABEL: Record<string, string> = {
  dashboard: "Home", estoque: "Estoque",
  historico: "Histórico", colheitas: "Colheitas",
  chuvas: "Chuvas", usuarios: "Usuários", admin: "Admin", fazendas: "Fazendas",
};

export default function Home() {
  const [aba, setAba] = useState<Aba>("dashboard");
  const [dashData, setDashData] = useState<DashFazenda[]>([]);
  const [dashLoading, setDashLoading] = useState(true);
  const [fazendas, setFazendas]   = useState<Fazenda[]>([]);
  const [fazenda, setFazenda]     = useState("");
  const [produtos, setProdutos]   = useState<Produto[]>([]);
  const [movs, setMovs]           = useState<Movimentacao[]>([]);
  const [colheitas, setColheitas] = useState<Colheita[]>([]);
  const [chuvas, setChuvas]       = useState<Chuva[]>([]);
  const [usuarios, setUsuarios]   = useState<Usuario[]>([]);
  const [logs, setLogs]           = useState<Log[]>([]);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [adminVista, setAdminVista] = useState<"usuarios" | "fazendas" | "logs" | "exportar" | "financeiro">("usuarios");
  const [busca, setBusca]         = useState("");
  const [catAberta, setCatAberta] = useState<Record<string, boolean>>({});
  const [filtroCol, setFiltroCol] = useState("");
  const [filtroChu, setFiltroChu] = useState("");
  const [loading, setLoading]     = useState(false);
  const [erro, setErro]           = useState("");
  const [nomeResp, setNomeResp]   = useState("");

  const [modalNovo,    setModalNovo]    = useState(false);
  const [modalMov,     setModalMov]     = useState<Produto | null>(null);
  const [modalEdit,    setModalEdit]    = useState<Produto | null>(null);
  const [modalCarga,   setModalCarga]   = useState(false);
  const [modalChuva,   setModalChuva]   = useState(false);
  const [menuAberto,   setMenuAberto]   = useState(false);
  const [importando,        setImportando]        = useState(false);
  const [importMsg,         setImportMsg]         = useState("");
  const [coordFazenda, setCoordFazenda] = useState<Record<number, { lat: string; lng: string }>>({});
  const [pasteCoords,  setPasteCoords]  = useState<Record<number, string>>({});
  const [coordOpen,    setCoordOpen]    = useState<Record<number, boolean>>({});
  const [mapFazenda,   setMapFazenda]   = useState<Fazenda | null>(null);
  const [chuvaVista,   setChuvaVista]   = useState<"acumulado" | "historico">("acumulado");
  const [anoSel,       setAnoSel]       = useState(new Date().getFullYear());
  const [estoqueVista, setEstoqueVista] = useState<"produtos" | "historico">("produtos");
  const [modalSenha, setModalSenha] = useState<{ usuario: string; isNew: boolean } | null>(null);
  const [formSenha, setFormSenha] = useState({ novoUsuario: "", senha: "", role: "user" });
  const [senhaMsg, setSenhaMsg] = useState("");

  const novoProdutoDefault = { nome:"", unidade:"kg", categoria:"Geral", fazenda:"", quantidadeInicial:"", recomendacao:"" };
  const novaMovDefault     = { tipo:"ENTRADA", quantidade:"", observacao:"", responsavel:"" };
  const novaCargaDefault   = { fazenda:"", produto:"", quantidade:"", unidade:"sc", destino:"", placa:"", observacao:"", data: new Date().toISOString().slice(0,10) };
  const novaChuvaDefault   = { fazenda:"", mm:"", data: new Date().toISOString().slice(0,10), observacao:"" };

  const [formProduto, setFormProduto] = useState(novoProdutoDefault);
  const [formMov,     setFormMov]     = useState(novaMovDefault);
  const [formEdit,    setFormEdit]    = useState({ nome:"", unidade:"kg", categoria:"Geral", fazenda:"", recomendacao:"" });
  const [formCarga,   setFormCarga]   = useState(novaCargaDefault);
  const [formChuva,   setFormChuva]   = useState(novaChuvaDefault);
  const [novaFazendaNome, setNovaFazendaNome] = useState("");
  const [novaFazendaErro, setNovaFazendaErro] = useState("");

  const router = useRouter();

  async function loadProdutos(faz = fazenda) {
    const [rp, rf] = await Promise.all([
      fetch(`/api/produtos?fazenda=${encodeURIComponent(faz)}`),
      fetch("/api/fazendas"),
    ]);
    setProdutos(await rp.json());
    setFazendas(await rf.json());
  }
  async function loadMovs(faz = fazenda) {
    const r = await fetch(`/api/movimentacoes?fazenda=${encodeURIComponent(faz)}`);
    setMovs(await r.json());
  }
  async function loadUsuarios() { const r = await fetch("/api/usuarios"); if (r.ok) setUsuarios(await r.json()); }
  async function loadLogs() { const r = await fetch("/api/logs"); if (r.ok) setLogs(await r.json()); }
  async function loadDashboard() {
    setDashLoading(true);
    const [rDash, rChuvas] = await Promise.all([fetch("/api/dashboard"), fetch("/api/chuvas")]);
    if (rDash.ok) setDashData(await rDash.json());
    if (rChuvas.ok) setChuvas(await rChuvas.json());
    setDashLoading(false);
  }
  async function loadColheitas(faz?: string) {
    const url = faz ? `/api/colheitas?fazenda=${encodeURIComponent(faz)}` : "/api/colheitas";
    const r = await fetch(url); setColheitas(await r.json());
  }
  async function loadChuvas(faz?: string) {
    const url = faz ? `/api/chuvas?fazenda=${encodeURIComponent(faz)}` : "/api/chuvas";
    const r = await fetch(url); if (r.ok) setChuvas(await r.json());
  }

  useEffect(() => {
    async function init() {
      const nome = localStorage.getItem("farmhub_responsavel") || "";
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
      } else if (!admin) {
        setAba("fazendas");
      }
      if (admin) loadUsuarios();
      loadDashboard();
    }
    init();
  }, []);

  useEffect(() => {
    if (fazenda) { loadProdutos(fazenda); loadMovs(fazenda); }
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
    if (nomeResp) localStorage.setItem("farmhub_responsavel", nomeResp);
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

  async function registrarChuva(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErro("");
    const r = await fetch("/api/chuvas", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(formChuva),
    });
    if (r.ok) {
      await loadChuvas(filtroChu || undefined);
      setModalChuva(false);
      setFormChuva({ ...novaChuvaDefault, fazenda: fazenda || "" });
    } else { setErro("Erro ao registrar chuva."); }
    setLoading(false);
  }

  async function excluirChuva(id: number) {
    if (!confirm("Excluir este registro?")) return;
    await fetch("/api/chuvas", { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id }) });
    await loadChuvas(filtroChu || undefined);
  }

  async function alterarUsuario(e: React.FormEvent) {
    e.preventDefault();
    if (!modalSenha) return;
    setSenhaMsg("");
    const usuario = modalSenha.isNew ? formSenha.novoUsuario.trim() : modalSenha.usuario;
    if (!usuario) { setSenhaMsg("Informe o usuário"); return; }
    const body: any = { usuario, role: formSenha.role };
    if (formSenha.senha) body.senha = formSenha.senha;
    if (modalSenha.isNew && !formSenha.senha) { setSenhaMsg("Informe a senha"); return; }
    const r = await fetch("/api/setup-user", {
      method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body),
    });
    const d = await r.json();
    if (d.ok) { setSenhaMsg("✓ Salvo!"); await loadUsuarios(); setTimeout(() => { setModalSenha(null); setSenhaMsg(""); }, 1200); }
    else { setSenhaMsg("Erro: " + d.error); }
  }

  async function excluirUsuario(id: number) {
    if (!confirm("Excluir este usuário?")) return;
    await fetch("/api/usuarios", { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id }) });
    await loadUsuarios();
  }

  async function criarFazenda(e: React.FormEvent) {
    e.preventDefault();
    setNovaFazendaErro("");
    const nome = novaFazendaNome.trim();
    if (!nome) return;
    const r = await fetch("/api/fazendas", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ nome }) });
    const d = await r.json();
    if (d.error) { setNovaFazendaErro(d.error); return; }
    setNovaFazendaNome("");
    const rf = await fetch("/api/fazendas");
    const lista: Fazenda[] = await rf.json();
    setFazendas(lista);
    if (lista.length === 1) { setFazenda(lista[0].nome); setAba("dashboard"); }
  }

  async function excluirFazenda(nome: string) {
    if (!confirm(`Excluir fazenda "${nome}"? Isso não apaga os produtos.`)) return;
    await fetch("/api/fazendas", { method:"DELETE", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ nome }) });
    const rf = await fetch("/api/fazendas");
    const lista: Fazenda[] = await rf.json();
    setFazendas(lista);
    if (fazenda === nome) setFazenda(lista[0]?.nome ?? "");
  }

  async function importarChuvas(ano?: number) {
    setImportando(true); setImportMsg("");
    const r = await fetch("/api/chuvas/importar", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(ano ? { ano } : {}),
    });
    const d = await r.json();
    if (d.error) { setImportMsg("Erro: " + d.error); }
    else if (d.aviso) { setImportMsg(d.aviso); }
    else { setImportMsg(`${d.importados} registro${d.importados !== 1 ? "s" : ""} importado${d.importados !== 1 ? "s" : ""}${ano ? ` de ${ano}` : ""}!`); }
    await loadChuvas(filtroChu || undefined);
    setImportando(false);
  }

  async function salvarCoordenadas(faz: Fazenda) {
    const coords = coordFazenda[faz.id];
    if (!coords) return;
    const lat = parseFloat(coords.lat.replace(",", "."));
    const lng = parseFloat(coords.lng.replace(",", "."));
    if (isNaN(lat) || isNaN(lng)) return;
    await fetch(`/api/fazendas/${faz.id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    });
    const [rme, rf] = await Promise.all([fetch("/api/auth/me"), fetch("/api/fazendas")]);
    setFazendas(await rf.json());
    setCoordOpen(prev => ({ ...prev, [faz.id]: false }));
  }

  function handlePasteCoords(fazId: number, text: string) {
    setPasteCoords(prev => ({ ...prev, [fazId]: text }));
    const parsed = parseGeoCoords(text);
    if (parsed) {
      setCoordFazenda(prev => ({
        ...prev,
        [fazId]: { lat: parsed.lat.toFixed(6), lng: parsed.lng.toFixed(6) },
      }));
    }
  }

  const totalItens   = produtos.length;
  const semEstoque   = produtos.filter(p => p.quantidade <= 0).length;
  const filtrados    = busca.trim() ? produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase())) : produtos;
  const cats         = ORDEM_CATEGORIAS.filter(c => filtrados.some(p => p.categoria === c));
  const outrosCats   = [...new Set(filtrados.map(p => p.categoria))].filter(c => !ORDEM_CATEGORIAS.includes(c)).sort();
  const todasCats    = [...cats, ...outrosCats];

  const navItems = isAdmin
    ? [...BASE_NAV, { id: "admin" as Aba, label: "Admin" }]
    : BASE_NAV;

  function mudarAba(id: Aba) {
    setAba(id);
    if (id === "colheitas") loadColheitas(filtroCol || undefined);
    if (id === "chuvas")    loadChuvas(filtroChu || undefined);
    if (id === "admin")     { loadUsuarios(); loadLogs(); }
  }

  return (
    <div style={{ minHeight:"100dvh", background: BG, color: TEXT, fontFamily:"system-ui,-apple-system,sans-serif", display:"flex", flexDirection:"column" }}>

      {mapFazenda && (
        <MapPicker
          nome={mapFazenda.nome}
          initialLat={mapFazenda.latitude}
          initialLng={mapFazenda.longitude}
          onSelect={(lat, lng) => {
            setCoordFazenda(prev => ({ ...prev, [mapFazenda.id]: { lat: String(lat), lng: String(lng) } }));
          }}
          onClose={() => setMapFazenda(null)}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={{
        position:"sticky", top:0, zIndex:20,
        height:58, padding:"0 16px",
        background: SURFACE, borderBottom:`1px solid ${LINE}`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => mudarAba("dashboard")} style={{
            width:36, height:36, borderRadius:8, flexShrink:0,
            background:`linear-gradient(135deg, ${G_MID}, ${GREEN})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:800, fontSize:12, color:"#050A05", border:"none", cursor:"pointer",
          }}>KA</button>
          <span style={{ fontSize:16, fontWeight:600, color: TEXT }}>{ABA_LABEL[aba]}</span>
        </div>

        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {aba === "estoque" && (
            <button onClick={() => { setFormProduto({ ...novoProdutoDefault, fazenda }); setModalNovo(true); }} style={{
              padding:"0 16px", height:36, borderRadius:8, fontSize:14, fontWeight:600,
              background: G_DIM, color: GREEN, border:`1px solid ${LINE3}`,
              cursor:"pointer",
            }}>+ Produto</button>
          )}
          {aba === "colheitas" && (
            <button onClick={() => { setFormCarga(c => ({ ...c, fazenda: fazenda || "" })); setModalCarga(true); }} style={{
              padding:"0 16px", height:36, borderRadius:8, fontSize:14, fontWeight:600,
              background: G_DIM, color: GREEN, border:`1px solid ${LINE3}`,
              cursor:"pointer",
            }}>+ Carga</button>
          )}
          {aba === "chuvas" && (
            <>
              <button onClick={() => importarChuvas()} disabled={importando} style={{
                padding:"0 14px", height:36, borderRadius:8, fontSize:14, fontWeight:600,
                background: BLUE_DIM, color: BLUE, border:`1px solid ${BLUE}44`,
                cursor: importando ? "not-allowed" : "pointer", opacity: importando ? 0.6 : 1,
              }}>{importando ? "..." : "Importar"}</button>
              <button onClick={() => { setFormChuva({ ...novaChuvaDefault, fazenda: fazenda || "" }); setModalChuva(true); }} style={{
                padding:"0 16px", height:36, borderRadius:8, fontSize:14, fontWeight:600,
                background: G_DIM, color: GREEN, border:`1px solid ${LINE3}`,
                cursor:"pointer",
              }}>+ Chuva</button>
            </>
          )}
          {aba === "dashboard" && (
            <button onClick={loadDashboard} style={{
              padding:"0 14px", height:36, borderRadius:8, fontSize:16,
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
                    <p style={{ fontSize:13, color: MUTED, padding:"4px 10px 8px", borderBottom:`1px solid ${LINE}`, marginBottom:4 }}>
                      {nomeResp}
                    </p>
                  )}
                  <button onClick={() => { sair(); setMenuAberto(false); }} style={{
                    width:"100%", textAlign:"left", padding:"10px 10px",
                    background:"transparent", border:"none", color: RED,
                    fontSize:15, cursor:"pointer", borderRadius:6,
                  }}>Sair da conta →</button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────── */}
      <div style={{ flex:1, padding:"16px 16px 72px", maxWidth:720, width:"100%", margin:"0 auto", boxSizing:"border-box" }}>

        {/* ── DASHBOARD ─────────────────────────────────────── */}
        {aba === "dashboard" && (
          <div>
            <p style={{ fontSize:13, color: MUTED, marginBottom:16 }}>
              {new Date().toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" })}
            </p>

            {dashLoading && (
              <div style={{ textAlign:"center", padding:"60px 0", color: MUTED }}>
                <div style={{ fontSize:36, marginBottom:8 }}>◈</div>
                <p style={{ fontSize:14 }}>Carregando dados...</p>
              </div>
            )}
            {!dashLoading && dashData.length === 0 && (
              <div style={{ textAlign:"center", padding:"60px 0", color: MUTED }}>
                <div style={{ fontSize:36, marginBottom:8 }}>🌱</div>
                <p style={{ fontSize:14 }}>Nenhuma fazenda com produtos ainda.</p>
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {(() => {
                const anoAtual = new Date().getFullYear();
                const mesAtual = new Date().getMonth();
                const rainMap: Record<string, { mes: number; ano: number }> = {};
                for (const c of chuvas) {
                  const d = new Date(String(c.data).slice(0,10) + "T12:00:00");
                  if (!rainMap[c.fazenda]) rainMap[c.fazenda] = { mes: 0, ano: 0 };
                  if (d.getFullYear() === anoAtual && d.getMonth() === mesAtual) rainMap[c.fazenda].mes += c.mm;
                  if (d.getFullYear() === anoAtual) rainMap[c.fazenda].ano += c.mm;
                }
                return fazendas.map(f => {
                const faz = dashData.find(d => d.nome === f.nome);
                const total = faz?.total ?? 0;
                const sem_estoque = faz?.sem_estoque ?? 0;
                const por_categoria = faz?.por_categoria ?? [];
                const ultima_mov = faz?.ultima_mov ?? null;
                const colheitas_mes = faz?.colheitas_mes ?? [];
                const pct = total > 0 ? Math.round(((total - sem_estoque) / total) * 100) : 0;
                const statusColor = sem_estoque === 0 ? GREEN : sem_estoque / total > 0.3 ? RED : GOLD;
                const topCats = [...por_categoria].sort((a,b) => b.count - a.count).slice(0, 5);
                const chuvaFaz = rainMap[f.nome] ?? { mes: 0, ano: 0 };

                return (
                  <div key={f.nome} style={{
                    background: SURFACE, border:`1px solid ${LINE2}`,
                    borderLeft:`3px solid ${statusColor}`,
                    borderRadius:"0 12px 12px 0", overflow:"hidden",
                  }}>
                    {/* Card header */}
                    <div style={{ padding:"12px 14px 10px", display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <p style={{ fontSize:17, fontWeight:700, color: TEXT }}>{f.nome}</p>
                          {sem_estoque > 0 && (
                            <span style={{ fontSize:11, color: statusColor, background: statusColor === RED ? RED_DIM : GOLD_DIM, padding:"2px 8px", borderRadius:99, fontWeight:700 }}>
                              ⚠ {sem_estoque}
                            </span>
                          )}
                        </div>
                        {/* Progress bar */}
                        <div style={{ marginTop:6 }}>
                          <div style={{ height:4, background: LINE2, borderRadius:99, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background: statusColor, borderRadius:99 }} />
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
                            <span style={{ fontSize:12, color: MUTED }}>{total} produtos</span>
                            <span style={{ fontSize:12, fontWeight:600, color: statusColor }}>{pct}% em estoque</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => { setFazenda(f.nome); mudarAba("estoque"); }}
                        style={{
                          padding:"10px 18px", borderRadius:10, fontSize:15, fontWeight:700,
                          background: G_DIM, color: GREEN, border:`1px solid ${LINE3}`,
                          cursor:"pointer", whiteSpace:"nowrap", flexShrink:0,
                        }}
                      >Fazendas</button>
                    </div>

                    {/* Categories */}
                    {topCats.length > 0 && (
                      <div style={{ padding:"0 14px 10px", display:"flex", flexWrap:"wrap", gap:4 }}>
                        {topCats.map(cat => (
                          <span key={cat.categoria} style={{
                            fontSize:13, padding:"3px 10px", borderRadius:99,
                            background: LIFT, color: cat.sem_estoque > 0 ? GOLD : TEXT2,
                            border:`1px solid ${cat.sem_estoque > 0 ? GOLD_DIM : LINE}`,
                          }}>
                            {CAT_ICON[cat.categoria] || "📦"} {cat.categoria} <span style={{ color: MUTED }}>({cat.count})</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Rain summary */}
                    <div
                      onClick={() => mudarAba("chuvas")}
                      style={{ padding:"8px 14px", borderTop:`1px solid ${LINE}`, display:"flex", gap:16, alignItems:"center", cursor:"pointer" }}
                    >
                      <span style={{ fontSize:14 }}>🌧️</span>
                      <span style={{ fontSize:13, color: chuvaFaz.mes > 0 ? BLUE : MUTED }}>
                        <span style={{ color: MUTED, fontWeight:500 }}>{["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][new Date().getMonth()]} </span>
                        <span style={{ fontWeight:800, fontFamily:"ui-monospace,monospace" }}>{fmtQty(chuvaFaz.mes)}mm</span>
                      </span>
                      <span style={{ fontSize:13, color: chuvaFaz.ano > 0 ? BLUE : MUTED }}>
                        <span style={{ color: MUTED, fontWeight:500 }}>{new Date().getFullYear()} </span>
                        <span style={{ fontWeight:800, fontFamily:"ui-monospace,monospace" }}>{fmtQty(chuvaFaz.ano)}mm</span>
                      </span>
                    </div>

                    {/* Bottom panels */}
                    <div style={{ display:"grid", gridTemplateColumns: colheitas_mes.length > 0 ? "1fr 1fr" : "1fr", gap:0, borderTop:`1px solid ${LINE}` }}>
                      <div style={{ padding:"10px 14px", borderRight: colheitas_mes.length > 0 ? `1px solid ${LINE}` : "none" }}>
                        <p style={{ fontSize:12, textTransform:"uppercase", letterSpacing:"0.07em", color: MUTED, marginBottom:4 }}>Última mov.</p>
                        {ultima_mov ? (
                          <>
                            <p style={{ fontSize:14, fontWeight:600, color: ultima_mov.tipo === "ENTRADA" ? GREEN : RED }}>
                              {ultima_mov.tipo === "ENTRADA" ? "↑" : "↓"} {fmtQty(ultima_mov.quantidade)} {ultima_mov.unidade}
                            </p>
                            <p style={{ fontSize:13, color: TEXT2, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ultima_mov.produto}</p>
                            <p style={{ fontSize:12, color: MUTED, marginTop:1 }}>{new Date(ultima_mov.criado_em).toLocaleDateString("pt-BR")}</p>
                          </>
                        ) : (
                          <p style={{ fontSize:13, color: MUTED }}>Nenhuma ainda</p>
                        )}
                      </div>

                      {colheitas_mes.length > 0 && (
                        <div style={{ padding:"10px 14px" }}>
                          <p style={{ fontSize:12, textTransform:"uppercase", letterSpacing:"0.07em", color: MUTED, marginBottom:4 }}>
                            Colheitas {new Date().toLocaleDateString("pt-BR", { month:"short" }).replace(".","").toUpperCase()}
                          </p>
                          {colheitas_mes.slice(0,3).map(c => (
                            <div key={c.produto} style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:2 }}>
                              <span style={{ fontSize:13, color: TEXT2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{c.produto}</span>
                              <span style={{ fontSize:13, fontWeight:700, color: GREEN, marginLeft:8, fontFamily:"ui-monospace,monospace", flexShrink:0 }}>
                                {fmtQty(c.total)}<span style={{ fontSize:11, fontWeight:400, color: MUTED }}> {c.unidade}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
              })()}
            </div>
          </div>
        )}

        {/* ── ESTOQUE ───────────────────────────────────────── */}
        {aba === "estoque" && (
          <div>
            <FarmChips fazendas={fazendas} ativa={fazenda} onSelect={f => { setFazenda(f); setEstoqueVista("produtos"); }} showBadge />

            {/* Sub-nav */}
            <div style={{ display:"flex", gap:6, marginBottom:14 }}>
              {(["produtos","historico"] as const).map(v => (
                <button key={v} onClick={() => setEstoqueVista(v)} style={{
                  padding:"7px 16px", borderRadius:8, fontSize:12, fontWeight:700,
                  cursor:"pointer", border:"none",
                  background: estoqueVista === v ? GREEN : LIFT,
                  color: estoqueVista === v ? "#050A05" : MUTED,
                }}>{{ produtos:"Produtos", historico:"Histórico" }[v]}</button>
              ))}
            </div>

            {estoqueVista === "produtos" && (
            <>
            {/* Stats */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
              <div style={{ background: SURFACE, border:`1px solid ${LINE}`, borderRadius:10, padding:"12px 14px" }}>
                <p style={{ fontSize:12, textTransform:"uppercase", letterSpacing:"0.08em", color: MUTED }}>Produtos</p>
                <p style={{ fontSize:30, fontWeight:800, color: GREEN, marginTop:2, fontVariantNumeric:"tabular-nums" }}>{totalItens}</p>
              </div>
              <div style={{ background: SURFACE, border:`1px solid ${semEstoque > 0 ? GOLD_DIM : LINE}`, borderRadius:10, padding:"12px 14px" }}>
                <p style={{ fontSize:12, textTransform:"uppercase", letterSpacing:"0.08em", color: MUTED }}>Sem estoque</p>
                <p style={{ fontSize:30, fontWeight:800, color: semEstoque > 0 ? GOLD : MUTED, marginTop:2, fontVariantNumeric:"tabular-nums" }}>{semEstoque}</p>
              </div>
            </div>

            {/* Search */}
            <div style={{ position:"relative", marginBottom:12 }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color: MUTED, fontSize:15, pointerEvents:"none" }}>⌕</span>
              <input
                style={{ ...iStyle, width:"100%", borderRadius:10, padding:"11px 12px 11px 36px", fontSize:15, boxSizing:"border-box", outline:"none" }}
                placeholder="Buscar produto..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
            </>
            )}

            {estoqueVista === "produtos" && produtos.length === 0 && (
              <div style={{ textAlign:"center", padding:"48px 0", color: MUTED }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📦</div>
                <p style={{ fontSize:14 }}>Nenhum produto cadastrado.</p>
                <p style={{ fontSize:12, marginTop:4 }}>Toque em + Produto para começar.</p>
              </div>
            )}

            {estoqueVista === "produtos" && todasCats.map(cat => {
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
                    <span style={{ fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color: TEXT2 }}>{cat}</span>
                    <span style={{ fontSize:13, color: MUTED, background: LIFT, padding:"0 7px", borderRadius:99 }}>{prods.length}</span>
                    {emFalta > 0 && (
                      <span style={{ fontSize:12, fontWeight:700, color: GOLD, background: GOLD_DIM, padding:"0 7px", borderRadius:99 }}>⚠ {emFalta}</span>
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
                            <p style={{ fontSize:15, fontWeight:500, color: TEXT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.nome}</p>
                            {p.recomendacao && (
                              <p style={{ fontSize:13, color: MUTED, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.recomendacao}</p>
                            )}
                          </div>

                          <span style={{ fontFamily:"ui-monospace,monospace", fontSize:15, fontWeight:700, color: qtyColor(p.quantidade), flexShrink:0 }}>
                            {fmtQty(p.quantidade)}<span style={{ fontSize:13, fontWeight:400, color: MUTED, marginLeft:3 }}>{p.unidade}</span>
                          </span>

                          <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                            {CATEGORIAS_COM_BULA.includes(p.categoria) && (
                              <a href={`https://www.google.com/search?q=${encodeURIComponent(p.nome+" bula")}&as_sitesearch=gov.br`}
                                target="_blank" rel="noopener noreferrer"
                                style={{ padding:"6px 10px", borderRadius:6, fontSize:13, background: BLUE_DIM, color: BLUE, textDecoration:"none" }}
                                title="Ver bula">📋</a>
                            )}
                            <button onClick={() => { setModalMov(p); setFormMov({ tipo:"ENTRADA", quantidade:"", observacao:"", responsavel: nomeResp }); }}
                              style={{ padding:"6px 10px", borderRadius:6, fontSize:14, fontWeight:700, background: G_DIM, color: GREEN, border:"none", cursor:"pointer" }}>+</button>
                            <button onClick={() => { setModalMov(p); setFormMov({ tipo:"SAIDA", quantidade:"", observacao:"", responsavel: nomeResp }); }}
                              style={{ padding:"6px 10px", borderRadius:6, fontSize:14, fontWeight:700, background: RED_DIM, color: RED, border:"none", cursor:"pointer" }}>−</button>
                            <button onClick={() => { setFormEdit({ nome:p.nome, unidade:p.unidade, categoria:p.categoria, fazenda, recomendacao:p.recomendacao||"" }); setModalEdit(p); }}
                              style={{ padding:"6px 10px", borderRadius:6, fontSize:13, background: LIFT, color: MUTED, border:`1px solid ${LINE2}`, cursor:"pointer" }}>✎</button>
                            <button onClick={() => excluirProduto(p.id)}
                              style={{ padding:"6px 10px", borderRadius:6, fontSize:13, background: LIFT, color: MUTED, border:`1px solid ${LINE2}`, cursor:"pointer" }}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {estoqueVista === "historico" && (
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
                      <p style={{ fontSize:15, fontWeight:500, color: TEXT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.produto.nome}</p>
                      <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2, flexWrap:"wrap" }}>
                        {m.responsavel && <span style={{ fontSize:13, color: BLUE, fontWeight:600 }}>{m.responsavel}</span>}
                        {m.responsavel && m.observacao && <span style={{ fontSize:13, color: MUTED }}>·</span>}
                        {m.observacao && <span style={{ fontSize:13, color: MUTED }}>{m.observacao}</span>}
                      </div>
                    </div>

                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <p style={{ fontSize:15, fontWeight:700, color: entrada ? GREEN : RED, fontFamily:"ui-monospace,monospace" }}>
                        {entrada ? "+" : "−"}{m.quantidade} {m.produto.unidade}
                      </p>
                      <p style={{ fontSize:12, color: MUTED, marginTop:2 }}>{fmtDate(m.criadoEm)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* ── COLHEITAS ─────────────────────────────────────── */}
        {aba === "colheitas" && (
          <div>
            <FarmChips
              fazendas={fazendas}
              ativa={filtroCol}
              onSelect={v => { setFiltroCol(v); loadColheitas(v || undefined); }}
              allOption
            />

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
                      <span style={{ fontSize:15, fontWeight:600, color: TEXT }}>{c.produto}</span>
                      <span style={{ fontSize:14, fontWeight:700, color: GREEN, fontFamily:"ui-monospace,monospace" }}>{fmtQty(c.quantidade)} {c.unidade}</span>
                      <span style={{ fontSize:12, color: GREEN, background: G_DIM, padding:"2px 8px", borderRadius:99, fontWeight:600 }}>{c.fazenda}</span>
                    </div>
                    <p style={{ fontSize:13, color: MUTED, marginTop:4 }}>
                      {new Date(String(c.data).slice(0,10)+"T12:00:00").toLocaleDateString("pt-BR")}
                      {c.destino    && ` · ${c.destino}`}
                      {c.placa      && ` · ${c.placa}`}
                      {c.observacao && ` · ${c.observacao}`}
                    </p>
                  </div>
                  <button onClick={() => excluirCarga(c.id)} style={{
                    padding:"6px 10px", borderRadius:6, fontSize:13,
                    background: RED_DIM, color: RED, border:"none", cursor:"pointer", flexShrink:0,
                  }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CHUVAS ────────────────────────────────────────── */}
        {aba === "chuvas" && (
          <div>
            <FarmChips
              fazendas={fazendas}
              ativa={filtroChu}
              onSelect={v => { setFiltroChu(v); loadChuvas(v || undefined); }}
              allOption
            />

            {importMsg && (
              <div style={{ background: BLUE_DIM, border:`1px solid ${BLUE}44`, borderRadius:8, padding:"10px 14px", fontSize:13, color: BLUE, marginBottom:12 }}>
                {importMsg}
              </div>
            )}

            {/* Vista toggle */}
            <div style={{ display:"flex", gap:6, marginBottom:14 }}>
              {(["acumulado","historico"] as const).map(v => (
                <button key={v} onClick={() => setChuvaVista(v)} style={{
                  padding:"7px 16px", borderRadius:8, fontSize:12, fontWeight:700,
                  cursor:"pointer", border:"none",
                  background: chuvaVista === v ? BLUE : LIFT,
                  color: chuvaVista === v ? "#050A1A" : MUTED,
                }}>{{acumulado:"Acumulado", historico:"Histórico"}[v]}</button>
              ))}
            </div>

            {chuvaVista === "acumulado" && (() => {
              const anoAtual = new Date().getFullYear();
              const mesAtual = new Date().getMonth();
              const chuvasFiltradas = filtroChu ? chuvas.filter(c => c.fazenda === filtroChu) : chuvas;

              const porFazenda: Record<string, { mes: number; ano: number }> = {};
              for (const c of chuvasFiltradas) {
                const d = new Date(c.data + "T12:00:00");
                if (!porFazenda[c.fazenda]) porFazenda[c.fazenda] = { mes: 0, ano: 0 };
                if (d.getFullYear() === anoAtual && d.getMonth() === mesAtual) porFazenda[c.fazenda].mes += c.mm;
                if (d.getFullYear() === anoAtual) porFazenda[c.fazenda].ano += c.mm;
              }

              const nomesMes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
              const mesNome = nomesMes[mesAtual];

              if (Object.keys(porFazenda).length === 0) {
                return (
                  <div style={{ textAlign:"center", padding:"48px 0", color: MUTED }}>
                    <div style={{ fontSize:36, marginBottom:8 }}>🌧️</div>
                    <p style={{ fontSize:14 }}>Nenhum registro de chuva.</p>
                    <p style={{ fontSize:13, marginTop:6, color: MUTED }}>Configure coordenadas na fazenda e use o botão Importar.</p>
                  </div>
                );
              }

              return (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {fazendas.map(f => {
                    const { mes = 0, ano = 0 } = porFazenda[f.nome] ?? {};
                    return (
                    <div key={f.nome} style={{ background: SURFACE, border:`1px solid ${LINE2}`, borderRadius:12, padding:"14px 16px" }}>
                      <p style={{ fontSize:15, fontWeight:700, color: TEXT, marginBottom:10 }}>{f.nome}</p>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                        <div style={{ background: LIFT, borderRadius:8, padding:"10px 14px", borderLeft:`3px solid ${BLUE}` }}>
                          <p style={{ fontSize:11, color: MUTED, fontWeight:600, letterSpacing:"0.07em" }}>{mesNome.toUpperCase()}</p>
                          <p style={{ fontSize:24, fontWeight:800, color: BLUE, fontFamily:"ui-monospace,monospace", marginTop:2 }}>
                            {fmtQty(mes)}<span style={{ fontSize:13, fontWeight:400, color: MUTED, marginLeft:4 }}>mm</span>
                          </p>
                        </div>
                        <div style={{ background: LIFT, borderRadius:8, padding:"10px 14px", borderLeft:`3px solid ${BLUE_DIM.replace("50","40")}` }}>
                          <p style={{ fontSize:11, color: MUTED, fontWeight:600, letterSpacing:"0.07em" }}>{anoAtual}</p>
                          <p style={{ fontSize:24, fontWeight:800, color: BLUE, fontFamily:"ui-monospace,monospace", marginTop:2 }}>
                            {fmtQty(ano)}<span style={{ fontSize:13, fontWeight:400, color: MUTED, marginLeft:4 }}>mm</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                  })}
                </div>
              );
            })()}


            {chuvaVista === "historico" && (() => {
              const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
              const todosAnos = [...new Set(chuvas.map(c => new Date(String(c.data).slice(0,10)+"T12:00:00").getFullYear()))].sort((a,b) => b-a);
              const anos = todosAnos.includes(new Date().getFullYear()) ? todosAnos : [new Date().getFullYear(), ...todosAnos];
              const fazNomes = fazendas.map(f => f.nome);

              // mm[mes][fazenda] for selected year
              const grid: Record<number, Record<string, number>> = {};
              for (let m = 0; m < 12; m++) grid[m] = {};
              chuvas.forEach(c => {
                const d = new Date(String(c.data).slice(0,10)+"T12:00:00");
                if (d.getFullYear() !== anoSel) return;
                const m = d.getMonth();
                grid[m][c.fazenda] = (grid[m][c.fazenda] || 0) + c.mm;
              });
              const totaisAno: Record<string, number> = {};
              fazNomes.forEach(f => { totaisAno[f] = 0; });
              for (let m = 0; m < 12; m++) fazNomes.forEach(f => { totaisAno[f] = (totaisAno[f] || 0) + (grid[m][f] || 0); });

              const allVals = Object.values(grid).flatMap(row => Object.values(row));
              const maxMm = Math.max(...allVals, 1);

              function cellBg(mm: number) {
                if (!mm) return "transparent";
                const t = Math.min(mm / maxMm, 1);
                return `rgba(96,165,250,${(0.15 + t * 0.75).toFixed(2)})`;
              }

              return (
                <div>
                  {/* Year selector + import button */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:14, flexWrap:"wrap" as const }}>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const }}>
                      {anos.map(a => (
                        <button key={a} onClick={() => setAnoSel(a)} style={{
                          padding:"6px 14px", borderRadius:8, fontSize:13, fontWeight:700,
                          cursor:"pointer", border:"none",
                          background: anoSel === a ? BLUE : LIFT,
                          color: anoSel === a ? "#050A1A" : MUTED,
                        }}>{a}</button>
                      ))}
                    </div>
                    <button onClick={() => importarChuvas(anoSel)} disabled={importando} style={{
                      padding:"7px 14px", borderRadius:8, fontSize:13, fontWeight:700,
                      background: BLUE_DIM, color: BLUE, border:`1px solid ${BLUE}44`,
                      cursor: importando ? "not-allowed" : "pointer", opacity: importando ? 0.6 : 1,
                      whiteSpace:"nowrap" as const,
                    }}>{importando ? "Buscando..." : `Importar ${anoSel}`}</button>
                  </div>

                  {chuvas.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"48px 0", color: MUTED }}>
                      <p style={{ fontSize:14 }}>Nenhum registro de chuva ainda.</p>
                    </div>
                  ) : (
                    <div style={{ overflowX:"auto" as const }}>
                      <table style={{ width:"100%", borderCollapse:"collapse" as const, fontSize:13 }}>
                        <thead>
                          <tr>
                            <th style={{ padding:"6px 10px", textAlign:"left" as const, color: MUTED, fontWeight:600, fontSize:11, letterSpacing:"0.06em" }}>MÊS</th>
                            {fazNomes.map(f => (
                              <th key={f} style={{ padding:"6px 8px", textAlign:"center" as const, color: TEXT2, fontWeight:700, fontSize:12, whiteSpace:"nowrap" as const }}>{f}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {MESES.map((mes, i) => {
                            const rowTotal = fazNomes.reduce((s, f) => s + (grid[i][f] || 0), 0);
                            return (
                              <tr key={mes} style={{ borderTop:`1px solid ${LINE}` }}>
                                <td style={{ padding:"8px 10px", color: rowTotal > 0 ? TEXT : MUTED, fontWeight: rowTotal > 0 ? 600 : 400 }}>{mes}</td>
                                {fazNomes.map(f => {
                                  const mm = grid[i][f] || 0;
                                  return (
                                    <td key={f} style={{ padding:"6px 8px", textAlign:"center" as const, background: cellBg(mm), borderRadius:4 }}>
                                      {mm > 0 ? (
                                        <span style={{ color: BLUE, fontWeight:700, fontFamily:"ui-monospace,monospace", fontSize:13 }}>
                                          {fmtQty(mm)}
                                        </span>
                                      ) : (
                                        <span style={{ color: LINE2, fontSize:11 }}>—</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                          <tr style={{ borderTop:`2px solid ${LINE2}` }}>
                            <td style={{ padding:"10px 10px", color: TEXT2, fontWeight:700, fontSize:12, letterSpacing:"0.06em" }}>TOTAL</td>
                            {fazNomes.map(f => (
                              <td key={f} style={{ padding:"8px 8px", textAlign:"center" as const }}>
                                <span style={{ color: totaisAno[f] > 0 ? BLUE : MUTED, fontWeight:800, fontFamily:"ui-monospace,monospace" }}>
                                  {totaisAno[f] > 0 ? fmtQty(totaisAno[f]) : "—"}
                                </span>
                                {totaisAno[f] > 0 && <span style={{ fontSize:10, color: MUTED, marginLeft:2 }}>mm</span>}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── FAZENDAS ─────────────────────────────────────── */}
        {aba === "fazendas" && (
          <div>
            <p style={{ fontSize:15, fontWeight:600, color: TEXT2, marginBottom:16 }}>
              {isAdmin ? "Todas as fazendas" : "Minhas fazendas"}
            </p>

            {/* Create farm form */}
            <form onSubmit={criarFazenda} style={{ display:"flex", gap:8, marginBottom:16 }}>
              <input
                style={{ ...iStyle, flex:1, padding:"10px 14px", borderRadius:10, fontSize:14 }}
                placeholder="Nome da nova fazenda"
                value={novaFazendaNome}
                onChange={e => setNovaFazendaNome(e.target.value)}
              />
              <button type="submit" style={{ padding:"10px 18px", borderRadius:10, fontSize:14, fontWeight:700, background: G_DIM, color: GREEN, border:`1px solid ${LINE3}`, cursor:"pointer" }}>
                + Criar
              </button>
            </form>
            {novaFazendaErro && <p style={{ fontSize:13, color: RED, marginBottom:12 }}>{novaFazendaErro}</p>}

            {fazendas.length === 0 && (
              <div style={{ textAlign:"center", padding:"48px 0", color: MUTED }}>
                <p style={{ fontSize:32, marginBottom:12 }}>🌾</p>
                <p style={{ fontSize:15, fontWeight:600, color: TEXT2 }}>Nenhuma fazenda ainda</p>
                <p style={{ fontSize:13, marginTop:4 }}>Crie sua primeira fazenda acima para começar.</p>
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {fazendas.map(f => {
                const open = coordOpen[f.id] ?? false;
                const paste = pasteCoords[f.id] ?? "";
                const parsed = parseGeoCoords(paste);
                const coords = coordFazenda[f.id] ?? { lat: f.latitude?.toFixed(6) ?? "", lng: f.longitude?.toFixed(6) ?? "" };
                const temCoords = f.latitude != null && f.longitude != null;
                return (
                  <div key={f.id} style={{ background: SURFACE, border:`1px solid ${LINE}`, borderRadius:10, overflow:"hidden" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px" }}>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:15, fontWeight:600, color: TEXT }}>{f.nome}</p>
                        {isAdmin && (f as any).owner && (
                          <p style={{ fontSize:12, color: MUTED }}>por {(f as any).owner}</p>
                        )}
                        <p style={{ fontSize:12, color: temCoords ? GREEN : MUTED, marginTop:2 }}>
                          {temCoords ? `📍 ${f.latitude?.toFixed(4)}, ${f.longitude?.toFixed(4)}` : `${f.total_produtos} produtos · sem localização`}
                        </p>
                      </div>
                      <button onClick={() => setCoordOpen(prev => ({ ...prev, [f.id]: !prev[f.id] }))} style={{ padding:"7px 12px", borderRadius:6, fontSize:13, fontWeight:600, background: open ? BLUE_DIM : LIFT, color: open ? BLUE : TEXT2, border:`1px solid ${open ? BLUE+"44" : LINE2}`, cursor:"pointer" }}>📍</button>
                      <button onClick={() => { setFazenda(f.nome); setAba("dashboard"); }} style={{ padding:"7px 12px", borderRadius:6, fontSize:13, fontWeight:600, background: G_DIM, color: GREEN, border:`1px solid ${LINE3}`, cursor:"pointer" }}>Ver</button>
                      <button onClick={() => excluirFazenda(f.nome)} style={{ padding:"7px 12px", borderRadius:6, fontSize:13, fontWeight:600, background: RED_DIM, color: RED, border:"none", cursor:"pointer" }}>✕</button>
                    </div>
                    {open && (
                      <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${LINE}`, paddingTop:12 }}>
                        <p style={{ fontSize:11, color: MUTED, marginBottom:6 }}>Cole as coordenadas do Google Maps ou Google Earth</p>
                        <div style={{ display:"flex", gap:6 }}>
                          <input
                            style={{ ...iStyle, flex:1, fontSize:13, padding:"8px 12px", borderRadius:8 }}
                            placeholder="-15.7802, -47.9291  ou  15°46'48&quot;S 47°55'45&quot;O"
                            value={paste}
                            onChange={e => handlePasteCoords(f.id, e.target.value)}
                          />
                          <button onClick={() => setMapFazenda(f)} style={{ padding:"8px 12px", borderRadius:8, fontSize:13, fontWeight:600, background: LIFT, color: TEXT2, border:`1px solid ${LINE2}`, cursor:"pointer" }}>🗺</button>
                          <button onClick={() => salvarCoordenadas(f)} disabled={!coords.lat || !coords.lng} style={{ padding:"8px 14px", borderRadius:8, fontSize:13, fontWeight:700, background: G_DIM, color: GREEN, border:`1px solid ${LINE3}`, cursor: (!coords.lat || !coords.lng) ? "not-allowed" : "pointer", opacity: (!coords.lat || !coords.lng) ? 0.5 : 1 }}>Salvar</button>
                        </div>
                        {parsed && (
                          <p style={{ fontSize:11, color: GREEN, marginTop:6 }}>✓ Lat {parsed.lat.toFixed(6)} · Lng {parsed.lng.toFixed(6)}</p>
                        )}
                        {paste && !parsed && (
                          <p style={{ fontSize:11, color: RED, marginTop:6 }}>Formato não reconhecido</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ADMIN ─────────────────────────────────────────── */}
        {aba === "admin" && isAdmin && (
          <div>
            {/* Sub-nav */}
            <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" as const }}>
              {(["usuarios","fazendas","logs","exportar","financeiro"] as const).map(v => (
                <button key={v} onClick={() => setAdminVista(v)} style={{
                  padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:700,
                  cursor:"pointer", border:"none",
                  background: adminVista === v ? GREEN : LIFT,
                  color: adminVista === v ? "#050A05" : MUTED,
                }}>{{ usuarios:"Usuários", fazendas:"Fazendas", logs:"Logs", exportar:"Exportar", financeiro:"Financeiro" }[v]}</button>
              ))}
            </div>

            {/* ── Usuários ── */}
            {adminVista === "usuarios" && (
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                  <p style={{ fontSize:15, fontWeight:600, color: TEXT2 }}>Usuários cadastrados</p>
                  <button onClick={() => { setModalSenha({ usuario:"", isNew:true }); setFormSenha({ novoUsuario:"", senha:"", role:"user" }); setSenhaMsg(""); }} style={{
                    padding:"8px 16px", borderRadius:8, fontSize:14, fontWeight:600,
                    background: G_DIM, color: GREEN, border:`1px solid ${LINE3}`, cursor:"pointer",
                  }}>+ Novo</button>
                </div>
                {usuarios.length === 0 && <div style={{ textAlign:"center", padding:"48px 0", color: MUTED }}><p style={{ fontSize:14 }}>Nenhum usuário.</p></div>}
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {usuarios.map(u => (
                    <div key={u.id} style={{ display:"flex", alignItems:"center", gap:12, background: SURFACE, border:`1px solid ${LINE}`, borderRadius:10, padding:"12px 14px" }}>
                      <div style={{ width:34, height:34, borderRadius:8, background: LIFT, border:`1px solid ${LINE2}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color: TEXT2, flexShrink:0 }}>{initials(u.usuario)}</div>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:15, fontWeight:500, color: TEXT }}>{u.usuario}</p>
                        <p style={{ fontSize:13, color: MUTED }}>
                          {{ admin:"Administrador", user:"Usuário", demo:"Demo" }[u.role] ?? u.role}
                          {" · "}{new Date(u.criado_em).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <button onClick={() => { setModalSenha({ usuario: u.usuario, isNew:false }); setFormSenha({ novoUsuario:"", senha:"", role: u.role }); setSenhaMsg(""); }} style={{ padding:"7px 12px", borderRadius:6, fontSize:13, fontWeight:600, background: LIFT, color: TEXT2, border:`1px solid ${LINE2}`, cursor:"pointer", marginRight:4 }}>✎</button>
                      <button onClick={() => excluirUsuario(u.id)} style={{ padding:"7px 12px", borderRadius:6, fontSize:13, fontWeight:600, background: RED_DIM, color: RED, border:"none", cursor:"pointer" }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Fazendas ── */}
            {adminVista === "fazendas" && (
              <div style={{ background: SURFACE, border:`1px solid ${LINE2}`, borderRadius:10, padding:"12px 14px" }}>
                <p style={{ fontSize:11, fontWeight:700, color: MUTED, letterSpacing:"0.08em", marginBottom:10 }}>COORDENADAS DAS FAZENDAS</p>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {fazendas.map(faz => {
                    const paste = pasteCoords[faz.id] ?? "";
                    const parsed = parseGeoCoords(paste);
                    const coords = coordFazenda[faz.id] ?? { lat: faz.latitude?.toFixed(6) ?? "", lng: faz.longitude?.toFixed(6) ?? "" };
                    const temCoords = faz.latitude != null && faz.longitude != null;
                    return (
                      <div key={faz.id}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                          <span style={{ fontSize:13, fontWeight:600, color: TEXT2, minWidth:90 }}>{faz.nome}</span>
                          {temCoords && <span style={{ fontSize:11, color: GREEN }}>✓ {faz.latitude?.toFixed(4)}, {faz.longitude?.toFixed(4)}</span>}
                        </div>
                        <div style={{ display:"flex", gap:6 }}>
                          <input
                            style={{ ...iStyle, flex:1, fontSize:13, padding:"6px 10px" }}
                            placeholder="Cole do Google Maps ou Google Earth"
                            value={paste}
                            onChange={e => handlePasteCoords(faz.id, e.target.value)}
                          />
                          <button onClick={() => setMapFazenda(faz)} style={{ padding:"6px 10px", borderRadius:6, fontSize:13, background: BLUE_DIM, color: BLUE, border:`1px solid ${BLUE}44`, cursor:"pointer" }}>🗺</button>
                          <button onClick={() => salvarCoordenadas(faz)} disabled={!coords.lat || !coords.lng} style={{ padding:"6px 12px", borderRadius:6, fontSize:13, fontWeight:600, background: G_DIM, color: GREEN, border:`1px solid ${LINE3}`, cursor: (!coords.lat || !coords.lng) ? "not-allowed" : "pointer", opacity: (!coords.lat || !coords.lng) ? 0.5 : 1 }}>Salvar</button>
                        </div>
                        {parsed && <p style={{ fontSize:11, color: GREEN, marginTop:3 }}>Lat {parsed.lat.toFixed(6)} · Lng {parsed.lng.toFixed(6)}</p>}
                        {paste && !parsed && <p style={{ fontSize:11, color: RED, marginTop:3 }}>Formato não reconhecido</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Logs ── */}
            {adminVista === "logs" && (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <p style={{ fontSize:13, color: MUTED }}>Últimas 500 ações</p>
                  <button onClick={loadLogs} style={{ padding:"6px 14px", borderRadius:8, fontSize:13, background:"transparent", color: MUTED, border:`1px solid ${LINE2}`, cursor:"pointer" }}>↺ Atualizar</button>
                </div>
                {logs.length === 0 && <div style={{ textAlign:"center", padding:"48px 0", color: MUTED }}><p style={{ fontSize:14 }}>Nenhum log ainda.</p></div>}
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {logs.map(l => (
                    <div key={l.id} style={{ background: SURFACE, border:`1px solid ${LINE}`, borderRadius:8, padding:"10px 14px", display:"flex", gap:10, alignItems:"flex-start" }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" as const }}>
                          <span style={{ fontSize:13, fontWeight:700, color: l.acao === "Entrada" ? GREEN : l.acao === "Saída" ? RED : TEXT2 }}>{l.acao}</span>
                          {l.detalhes && <span style={{ fontSize:13, color: TEXT }}>{l.detalhes}</span>}
                          {l.fazenda && <span style={{ fontSize:11, color: BLUE, background: BLUE_DIM, padding:"1px 7px", borderRadius:99 }}>{l.fazenda}</span>}
                        </div>
                        <p style={{ fontSize:12, color: MUTED, marginTop:2 }}>{l.usuario && <span style={{ color: TEXT2, marginRight:6 }}>{l.usuario}</span>}{new Date(l.criado_em).toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Exportar ── */}
            {adminVista === "exportar" && (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <p style={{ fontSize:13, color: MUTED, marginBottom:4 }}>Baixar dados em CSV (abre no Excel)</p>
                {([
                  { tipo:"estoque",       label:"Estoque",        desc:"Todos os produtos e quantidades"   },
                  { tipo:"movimentacoes", label:"Movimentações",  desc:"Histórico de entradas e saídas"    },
                  { tipo:"colheitas",     label:"Colheitas",      desc:"Cargas registradas"                },
                  { tipo:"chuvas",        label:"Chuvas",         desc:"Registros de precipitação"         },
                ] as const).map(({ tipo, label, desc }) => (
                  <a key={tipo} href={`/api/export?tipo=${tipo}`} download style={{ textDecoration:"none" }}>
                    <div style={{ background: SURFACE, border:`1px solid ${LINE2}`, borderRadius:10, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div>
                        <p style={{ fontSize:15, fontWeight:600, color: TEXT }}>{label}</p>
                        <p style={{ fontSize:13, color: MUTED, marginTop:2 }}>{desc}</p>
                      </div>
                      <span style={{ fontSize:20, color: GREEN }}>↓</span>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* ── Financeiro ── */}
            {adminVista === "financeiro" && (
              <div style={{ textAlign:"center", padding:"60px 0", color: MUTED }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📄</div>
                <p style={{ fontSize:16, fontWeight:600, color: TEXT2, marginBottom:8 }}>Módulo Financeiro</p>
                <p style={{ fontSize:14, color: MUTED }}>Em breve: importação de DANFEs, notas fiscais e lançamentos.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Bottom Navigation ──────────────────────────────── */}
      <nav style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:20,
        height:56, background: SURFACE, borderTop:`1px solid ${LINE}`,
        display:"flex", gap:6, padding:"0 8px",
      }}>
        {navItems.map(item => {
          const ativo = aba === item.id;
          return (
            <button key={item.id} onClick={() => mudarAba(item.id)} style={{
              flex:1, height:"100%", display:"flex", alignItems:"center", justifyContent:"center",
              background: ativo ? G_DIM : "transparent",
              border:"none", borderTop: ativo ? `2px solid ${GREEN}` : "2px solid transparent",
              borderRadius: ativo ? "0 0 6px 6px" : 0,
              cursor:"pointer", transition:"all .15s",
              color: ativo ? GREEN : MUTED,
              fontSize:13, fontWeight: ativo ? 700 : 500,
              letterSpacing:"0.02em",
            }}>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* ── Modal: Registrar Chuva ──────────────────────────── */}
      {modalChuva && (
        <Modal title="Registrar Chuva" onClose={() => { setModalChuva(false); setErro(""); }}>
          <form onSubmit={registrarChuva} style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="Fazenda">
                <select style={iStyle} value={formChuva.fazenda} onChange={e => setFormChuva({ ...formChuva, fazenda: e.target.value })}>
                  {fazendas.map(f => <option key={f.id}>{f.nome}</option>)}
                </select>
              </Field>
              <Field label="Data">
                <input type="date" style={iStyle} value={formChuva.data} onChange={e => setFormChuva({ ...formChuva, data: e.target.value })} required />
              </Field>
            </div>
            <Field label="Precipitação (mm)">
              <input type="number" min="0" step="0.1" style={iStyle} placeholder="0.0" value={formChuva.mm} onChange={e => setFormChuva({ ...formChuva, mm: e.target.value })} required autoFocus />
            </Field>
            <Field label="Observação (opcional)">
              <input style={iStyle} placeholder="Ex: chuva forte à tarde..." value={formChuva.observacao} onChange={e => setFormChuva({ ...formChuva, observacao: e.target.value })} />
            </Field>
            {erro && <p style={{ fontSize:14, color: RED }}>{erro}</p>}
            <ModalActions loading={loading} labelOk="Registrar" colorOk={BLUE} bgOk={BLUE_DIM} borderOk={BLUE} onCancel={() => { setModalChuva(false); setErro(""); }} />
          </form>
        </Modal>
      )}

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
            {erro && <p style={{ fontSize:14, color: RED }}>{erro}</p>}
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
            {erro && <p style={{ fontSize:14, color: RED }}>{erro}</p>}
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
            {erro && <p style={{ fontSize:14, color: RED }}>{erro}</p>}
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
            {erro && <p style={{ fontSize:14, color: RED }}>{erro}</p>}
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

      {/* ── Modal: Alterar Usuário ──────────────────────────── */}
      {modalSenha && (
        <Modal title={modalSenha.isNew ? "Novo Usuário" : `Editar · ${modalSenha.usuario}`} onClose={() => { setModalSenha(null); setSenhaMsg(""); }}>
          <form onSubmit={alterarUsuario} style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {modalSenha.isNew && (
              <Field label="Usuário">
                <input style={iStyle} placeholder="email ou nome" value={formSenha.novoUsuario} onChange={e => setFormSenha({ ...formSenha, novoUsuario: e.target.value })} required autoFocus />
              </Field>
            )}
            <Field label={modalSenha.isNew ? "Senha" : "Nova senha (deixe vazio para manter)"}>
              <input type="password" style={iStyle} placeholder={modalSenha.isNew ? "Senha" : "Nova senha"} value={formSenha.senha} onChange={e => setFormSenha({ ...formSenha, senha: e.target.value })} autoFocus={!modalSenha.isNew} />
            </Field>
            <Field label="Perfil">
              <select style={iStyle} value={formSenha.role} onChange={e => setFormSenha({ ...formSenha, role: e.target.value })}>
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
                <option value="demo">Demo (somente leitura)</option>
              </select>
            </Field>
            {senhaMsg && <p style={{ fontSize:14, color: senhaMsg.startsWith("✓") ? GREEN : RED }}>{senhaMsg}</p>}
            <ModalActions loading={false} labelOk="Salvar" colorOk={GREEN} bgOk={G_DIM} borderOk={LINE3} onCancel={() => { setModalSenha(null); setSenhaMsg(""); }} />
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
          <h2 style={{ fontSize:18, fontWeight:700, color: TEXT, margin:0 }}>{title}</h2>
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
      <label style={{ fontSize:13, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em", color: MUTED }}>{label}</label>
      {children}
    </div>
  );
}

function FarmChips({ fazendas, ativa, onSelect, showBadge = false, allOption = false }: {
  fazendas: Fazenda[];
  ativa: string;
  onSelect: (nome: string) => void;
  showBadge?: boolean;
  allOption?: boolean;
}) {
  const chip = (isAtiva: boolean) => ({
    padding:"8px 16px", borderRadius:99, fontSize:14, fontWeight:600,
    whiteSpace:"nowrap" as const, cursor:"pointer", flexShrink:0,
    background: isAtiva ? G_DIM : "transparent",
    color: isAtiva ? GREEN : MUTED,
    border:`1px solid ${isAtiva ? LINE3 : LINE2}`,
    transition:"all .15s",
  });
  return (
    <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:14, paddingBottom:2, scrollbarWidth:"none" as const }}>
      {allOption && (
        <button onClick={() => onSelect("")} style={chip(!ativa)}>Todas</button>
      )}
      {fazendas.map(f => (
        <button key={f.id} onClick={() => onSelect(f.nome)} style={chip(ativa === f.nome)}>
          {f.nome}
          {showBadge && f.sem_estoque > 0 && (
            <span style={{ color: GOLD, marginLeft:5, fontSize:10 }}>⚠{f.sem_estoque}</span>
          )}
        </button>
      ))}
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
        padding:"13px", borderRadius:10, fontSize:15, fontWeight:500,
        background:"transparent", border:`1px solid ${LINE2}`, color: MUTED, cursor:"pointer",
      }}>Cancelar</button>
      <button type="submit" disabled={loading} style={{
        padding:"13px", borderRadius:10, fontSize:15, fontWeight:600,
        background: bgOk, color: colorOk, border:`1px solid ${borderOk}`,
        cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
      }}>{loading ? "Salvando..." : labelOk}</button>
    </div>
  );
}
