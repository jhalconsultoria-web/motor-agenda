import { useState } from "react";
import { api, salvarSessao } from "../api";
import type { SessaoAtiva } from "../api";

function arquivoParaBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result as string);
    leitor.onerror = reject;
    leitor.readAsDataURL(arquivo);
  });
}

export function Registrar({ onEntrar, onVoltarLogin }: { onEntrar: (sessao: SessaoAtiva) => void; onVoltarLogin: () => void }) {
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [corPrimaria, setCorPrimaria] = useState("#1F8F63");
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [nomeAdmin, setNomeAdmin] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (arquivo.size > 500_000) {
      setErro("Logo muito grande — use uma imagem de até 500KB");
      return;
    }
    setLogoUrl(await arquivoParaBase64(arquivo));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const sessao = await api.registrar({ nomeEmpresa, corPrimaria, logoUrl, nomeAdmin, email, senha });
      salvarSessao(sessao);
      onEntrar(sessao);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
        <h1 className="text-xl font-semibold text-stone-900 mb-1">Criar sua conta</h1>
        <p className="text-sm text-stone-500 mb-6">30 dias grátis, sem cartão de crédito.</p>

        <label className="block text-sm font-medium text-stone-700 mb-1">Nome do seu negócio</label>
        <input
          required
          value={nomeEmpresa}
          onChange={(e) => setNomeEmpresa(e.target.value)}
          className="w-full mb-4 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Barbearia do João"
        />

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Cor da marca</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={corPrimaria}
                onChange={(e) => setCorPrimaria(e.target.value)}
                className="w-10 h-9 rounded border border-stone-300 cursor-pointer"
              />
              <span className="text-xs text-stone-500 font-mono">{corPrimaria}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Logo (opcional)</label>
            <input type="file" accept="image/*" onChange={handleLogo} className="text-xs" />
          </div>
        </div>

        {logoUrl && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-stone-50 rounded-lg border border-stone-200">
            <img src={logoUrl} alt="Pré-visualização da logo" className="w-9 h-9 rounded-full object-cover" />
            <span className="text-xs text-stone-500">Prévia da logo</span>
          </div>
        )}

        <hr className="my-4 border-stone-100" />

        <label className="block text-sm font-medium text-stone-700 mb-1">Seu nome</label>
        <input
          required
          value={nomeAdmin}
          onChange={(e) => setNomeAdmin(e.target.value)}
          className="w-full mb-4 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="João Silva"
        />

        <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="joao@seunegocio.com.br"
        />

        <label className="block text-sm font-medium text-stone-700 mb-1">Senha</label>
        <input
          type="password"
          required
          minLength={6}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full mb-4 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="mínimo 6 caracteres"
        />

        {erro && <p className="text-sm text-red-600 mb-4">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-stone-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
        >
          {carregando ? "Criando..." : "Criar conta grátis"}
        </button>

        <button type="button" onClick={onVoltarLogin} className="w-full text-center text-xs text-stone-400 hover:text-stone-700 mt-4">
          Já tem conta? Entrar
        </button>
      </form>
    </div>
  );
}
