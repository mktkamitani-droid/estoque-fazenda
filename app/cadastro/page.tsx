"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Cadastro() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (senha.length < 6) {
      setErro("Senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setCarregando(true);
    const r = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, senha }),
    });
    const data = await r.json();
    if (r.ok) {
      setSucesso(true);
    } else {
      setErro(data.error || "Erro ao cadastrar.");
    }
    setCarregando(false);
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <span className="text-5xl">✅</span>
          <h2 className="text-xl font-bold text-green-700 mt-4">Cadastro realizado!</h2>
          <p className="text-gray-500 text-sm mt-2">Sua conta foi criada com sucesso.</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-6 w-full bg-green-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-800 transition-colors"
          >
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl">🌾</span>
          <h1 className="text-2xl font-bold text-green-700 mt-3">Kamitani Agro</h1>
          <p className="text-gray-500 text-sm mt-1">Criar nova conta</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={cadastrar} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Usuário</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Escolha um nome de usuário"
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
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar senha</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Repita a senha"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
              />
            </div>
            {erro && <p className="text-red-500 text-xs text-center">{erro}</p>}
            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-green-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-800 transition-colors disabled:opacity-60 mt-2"
            >
              {carregando ? "Cadastrando..." : "Criar conta"}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-4">
            Já tem conta?{" "}
            <a href="/login" className="text-green-700 font-medium hover:underline">
              Entrar
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
