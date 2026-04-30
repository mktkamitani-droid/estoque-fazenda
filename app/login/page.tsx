"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const BG      = "#070D07";
const SURFACE = "#0F1A0F";
const LIFT    = "#172417";
const LINE2   = "#2C4830";
const GREEN   = "#4ADE80";
const G_MID   = "#155228";
const TEXT    = "#F0FFF0";
const TEXT2   = "#86EFAC";
const MUTED   = "#527A5C";
const RED     = "#F87171";
const RED_DIM = "#3C0A0A";

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro("");
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, senha }),
    });
    if (r.ok) {
      router.push("/");
      router.refresh();
    } else {
      setErro("Usuário ou senha incorretos");
    }
    setCarregando(false);
  }

  const iStyle: React.CSSProperties = {
    background: LIFT,
    color: TEXT,
    border: `1px solid ${LINE2}`,
    outline: "none",
    width: "100%",
    borderRadius: 8,
    padding: "0.7rem 1rem",
    fontSize: "0.875rem",
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 1rem" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: "0 auto 16px",
            background: `linear-gradient(135deg, ${G_MID} 0%, #22863a 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, boxShadow: `0 0 32px ${GREEN}33`,
          }}>🌾</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: TEXT, letterSpacing: "-0.5px", margin: 0 }}>
            Kamitani Agro
          </h1>
          <p style={{ fontSize: "0.75rem", color: MUTED, marginTop: 4 }}>Controle de estoque</p>
        </div>

        <div style={{ background: SURFACE, border: `1px solid ${LINE2}`, borderRadius: 16, padding: "1.5rem" }}>
          <form onSubmit={entrar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: TEXT2, marginBottom: 6 }}>
                Usuário
              </label>
              <input
                style={iStyle}
                placeholder="Digite seu usuário"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: TEXT2, marginBottom: 6 }}>
                Senha
              </label>
              <input
                type="password"
                style={iStyle}
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
            {erro && (
              <p style={{ fontSize: "0.75rem", textAlign: "center", padding: "8px 12px", borderRadius: 8, background: RED_DIM, color: RED, margin: 0 }}>
                {erro}
              </p>
            )}
            <button
              type="submit"
              disabled={carregando}
              style={{
                width: "100%", padding: "0.75rem", borderRadius: 12, fontWeight: 700,
                fontSize: "0.875rem", background: GREEN, color: "#022c07",
                border: "none", cursor: carregando ? "not-allowed" : "pointer",
                opacity: carregando ? 0.6 : 1, marginTop: 4,
              }}
            >
              {carregando ? "Entrando..." : "Entrar"}
            </button>
          </form>
          <p style={{ textAlign: "center", fontSize: "0.75rem", color: MUTED, marginTop: 14 }}>
            Não tem conta?{" "}
            <a href="/cadastro" style={{ color: GREEN, fontWeight: 600, textDecoration: "none" }}>
              Criar conta
            </a>
          </p>
        </div>

        <p style={{ textAlign: "center", fontSize: "0.7rem", color: MUTED, marginTop: 16, opacity: 0.5 }}>
          &copy; {new Date().getFullYear()} Kamitani Agro
        </p>
      </div>
    </div>
  );
}
