import { useState } from "react";
import { api, salvarSessao } from "../api";
import type { SessaoAtiva } from "../api";

export function Login({ onEntrar, onCriarConta }: { onEntrar: (sessao: SessaoAtiva) => void; onCriarConta: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const sessao = await api.login(email, senha);
      salvarSessao(sessao);
      onEntrar(sessao);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
        <h1 className="text-xl font-semibold text-stone-900 mb-1">Motor de Agenda</h1>
        <p className="text-sm text-stone-500 mb-6">Entre com sua conta do negócio</p>

        <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="joao@barbeariadojoao.com.br"
        />

        <label className="block text-sm font-medium text-stone-700 mb-1">Senha</label>
        <input
          type="password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full mb-4 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="••••••••"
        />

        {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-stone-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>

        <button type="button" onClick={onCriarConta} className="w-full text-center text-sm text-stone-600 hover:text-stone-900 mt-5 font-medium">
          Criar conta grátis
        </button>

        <p className="text-xs text-stone-400 mt-4 text-center">
          Demo: joao@barbeariadojoao.com.br / demo123
        </p>
      </form>
    </div>
  );
}
