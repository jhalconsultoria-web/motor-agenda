import { useState } from "react";
import { api } from "../api";
import type { SessaoAtiva } from "../api";

function arquivoParaBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result as string);
    leitor.onerror = reject;
    leitor.readAsDataURL(arquivo);
  });
}

export function Configuracoes({
  sessao,
  onAtualizarEmpresa,
}: {
  sessao: SessaoAtiva;
  onAtualizarEmpresa: (empresa: SessaoAtiva["empresa"]) => void;
}) {
  const [nome, setNome] = useState(sessao.empresa.nome);
  const [corPrimaria, setCorPrimaria] = useState(sessao.empresa.corPrimaria);
  const [logoUrl, setLogoUrl] = useState(sessao.empresa.logoUrl ?? undefined);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (arquivo.size > 500_000) {
      setErro("Logo muito grande — use uma imagem de até 500KB");
      return;
    }
    setLogoUrl(await arquivoParaBase64(arquivo));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    setSalvo(false);
    try {
      const empresaAtualizada = await api.empresa.atualizar({ nome, corPrimaria, logoUrl });
      onAtualizarEmpresa(empresaAtualizada);
      setSalvo(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-stone-900 mb-6">Configurações da marca</h1>

      <form onSubmit={salvar} className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Nome do negócio</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium text-stone-700 mb-1">Logo</label>
            <input type="file" accept="image/*" onChange={handleLogo} className="text-xs" />
          </div>
        </div>

        {logoUrl && (
          <div className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg border border-stone-200">
            <img src={logoUrl} alt="Logo atual" className="w-10 h-10 rounded-full object-cover" />
            <span className="text-xs text-stone-500">Logo atual</span>
          </div>
        )}

        <div className="pt-2 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            style={{ background: corPrimaria }}
          >
            {nome.slice(0, 1).toUpperCase()}
          </div>
          <p className="text-xs text-stone-400">Prévia de como sua marca aparece no painel e no link de agendamento</p>
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="text-sm font-medium text-white rounded-lg px-5 py-2.5 disabled:opacity-50"
          style={{ background: corPrimaria }}
        >
          {salvando ? "Salvando..." : salvo ? "Salvo!" : "Salvar alterações"}
        </button>
      </form>

      <div className="mt-6 bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="text-sm font-semibold text-stone-900 mb-2">Link do seu mini-site de agendamento</h2>
        <code className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 block break-all">
          agenda.seudominio.com/{sessao.empresa.slug}
        </code>
      </div>
    </div>
  );
}
