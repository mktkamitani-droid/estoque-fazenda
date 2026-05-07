"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const BG      = "#070D07";
const SURFACE = "#0F1A0F";
const LIFT    = "#172417";
const LINE    = "#1E3320";
const LINE2   = "#2C4830";
const LINE3   = "#3A6B46";
const GREEN   = "#4ADE80";
const G_DIM   = "#0D2B14";
const G_MID   = "#155228";
const TEXT    = "#F0FFF0";
const TEXT2   = "#86EFAC";
const MUTED   = "#527A5C";

const PERFIS = [
  { id: "produtor",   icon: "🌾", label: "Produtor Rural",       desc: "Gerencio minha própria fazenda" },
  { id: "consultor",  icon: "👨‍💼", label: "Consultor Agrícola",   desc: "Presto serviços para produtores" },
  { id: "estudante",  icon: "🎓", label: "Estudante / Pesquisador", desc: "Uso para fins acadêmicos" },
  { id: "cooperativa",icon: "🏢", label: "Cooperativa",           desc: "Represento uma organização" },
];

const ATIVIDADES = [
  { id: "graos",     icon: "🌱", label: "Grãos",     desc: "Soja, Milho, Trigo..." },
  { id: "cafe",      icon: "☕", label: "Café",       desc: "Café arábica ou robusta" },
  { id: "pecuaria",  icon: "🐄", label: "Pecuária",   desc: "Boi, Leite, Suíno..." },
  { id: "cana",      icon: "🎋", label: "Cana",       desc: "Cana-de-açúcar" },
  { id: "hortifruti",icon: "🥬", label: "Hortifruti", desc: "Frutas e vegetais" },
  { id: "misto",     icon: "🏡", label: "Misto",      desc: "Várias atividades" },
];

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export default function Onboarding() {
  const [step, setStep]           = useState(1);
  const [perfil, setPerfil]       = useState("");
  const [atividade, setAtividade] = useState("");
  const [nomeFaz, setNomeFaz]     = useState("");
  const [estado, setEstado]       = useState("");
  const [area, setArea]           = useState("");
  const [loading, setLoading]     = useState(false);
  const [erro, setErro]           = useState("");
  const router = useRouter();

  const iStyle: React.CSSProperties = {
    background: LIFT, color: TEXT, border: `1px solid ${LINE2}`,
    outline: "none", width: "100%", borderRadius: 10,
    padding: "0.75rem 1rem", fontSize: "1rem",
  };

  async function finalizar(e: React.FormEvent) {
    e.preventDefault();
    if (!nomeFaz.trim()) { setErro("Informe o nome da fazenda"); return; }
    setLoading(true); setErro("");
    const r = await fetch("/api/fazendas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeFaz.trim() }),
    });
    const d = await r.json();
    if (d.error) { setErro(d.error); setLoading(false); return; }
    router.push("/");
    router.refresh();
  }

  const progress = ((step - 1) / 3) * 100;

  return (
    <div style={{ minHeight:"100vh", background: BG, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}>
      <div style={{ width:"100%", maxWidth:480 }}>

        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:28, marginBottom:8 }}>
            {step === 1 ? "👋" : step === 2 ? "🌿" : "🏡"}
          </div>
          <h1 style={{ fontSize:"1.4rem", fontWeight:800, color:TEXT, margin:"0 0 6px" }}>
            {step === 1 ? "Bem-vindo ao FarmHub!" : step === 2 ? "Qual sua principal atividade?" : "Crie sua fazenda"}
          </h1>
          <p style={{ fontSize:"0.85rem", color:MUTED, margin:0 }}>
            {step === 1 ? "Como você se identifica?" : step === 2 ? "Isso nos ajuda a personalizar sua experiência." : "Você pode adicionar mais fazendas depois."}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ height:4, background: LINE, borderRadius:99, marginBottom:28, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${progress + 33}%`, background: GREEN, borderRadius:99, transition:"width 0.3s" }} />
        </div>

        {/* Step 1: Perfil */}
        {step === 1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {PERFIS.map(p => (
              <button key={p.id} onClick={() => { setPerfil(p.id); setStep(2); }} style={{
                display:"flex", alignItems:"center", gap:14,
                background: perfil === p.id ? G_DIM : SURFACE,
                border: `1px solid ${perfil === p.id ? LINE3 : LINE2}`,
                borderRadius:12, padding:"14px 16px", cursor:"pointer", textAlign:"left",
              }}>
                <span style={{ fontSize:28, flexShrink:0 }}>{p.icon}</span>
                <div>
                  <p style={{ fontSize:15, fontWeight:600, color:TEXT, margin:0 }}>{p.label}</p>
                  <p style={{ fontSize:13, color:MUTED, margin:0 }}>{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Atividade */}
        {step === 2 && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
              {ATIVIDADES.map(a => (
                <button key={a.id} onClick={() => { setAtividade(a.id); setStep(3); }} style={{
                  display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                  background: atividade === a.id ? G_DIM : SURFACE,
                  border: `1px solid ${atividade === a.id ? LINE3 : LINE2}`,
                  borderRadius:12, padding:"16px 12px", cursor:"pointer",
                }}>
                  <span style={{ fontSize:32 }}>{a.icon}</span>
                  <p style={{ fontSize:14, fontWeight:600, color:TEXT, margin:0 }}>{a.label}</p>
                  <p style={{ fontSize:12, color:MUTED, margin:0, textAlign:"center" }}>{a.desc}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} style={{ background:"transparent", border:"none", color:MUTED, cursor:"pointer", fontSize:13, display:"block", margin:"0 auto" }}>
              ← Voltar
            </button>
          </div>
        )}

        {/* Step 3: Fazenda */}
        {step === 3 && (
          <form onSubmit={finalizar} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ display:"block", fontSize:"0.8rem", fontWeight:600, color:TEXT2, marginBottom:6 }}>Nome da fazenda *</label>
              <input style={iStyle} placeholder="Ex: Fazenda São João" value={nomeFaz} onChange={e => setNomeFaz(e.target.value)} required autoFocus />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div>
                <label style={{ display:"block", fontSize:"0.8rem", fontWeight:600, color:TEXT2, marginBottom:6 }}>Estado</label>
                <select style={iStyle} value={estado} onChange={e => setEstado(e.target.value)}>
                  <option value="">Selecione</option>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:"block", fontSize:"0.8rem", fontWeight:600, color:TEXT2, marginBottom:6 }}>Área (ha)</label>
                <input style={iStyle} type="number" placeholder="Ex: 500" value={area} onChange={e => setArea(e.target.value)} min="0" step="0.1" />
              </div>
            </div>

            {erro && <p style={{ fontSize:13, color:"#F87171", background:"#3C0A0A", padding:"8px 12px", borderRadius:8, margin:0 }}>{erro}</p>}

            <button type="submit" disabled={loading} style={{
              width:"100%", padding:"0.85rem", borderRadius:12, fontWeight:700,
              fontSize:"1rem", background: GREEN, color:"#022c07",
              border:"none", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1, marginTop:4,
            }}>
              {loading ? "Criando..." : "Entrar no FarmHub →"}
            </button>
            <button type="button" onClick={() => setStep(2)} style={{ background:"transparent", border:"none", color:MUTED, cursor:"pointer", fontSize:13 }}>
              ← Voltar
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
