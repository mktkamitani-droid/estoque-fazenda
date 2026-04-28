"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl">🌾</span>
          <h1 className="text-2xl font-bold text-green-700 mt-3">Kamitani Agro</h1>
          <p className="text-gray-500 text-sm mt-1">Controle de estoque</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={entrar} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Usuário</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Digite seu usuário"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Senha</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
            {erro && <p className="text-red-500 text-xs text-center">{erro}</p>}
            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-green-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-800 transition-colors disabled:opacity-60 mt-2"
            >
              {carregando ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
