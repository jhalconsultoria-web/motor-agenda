import { useEffect, useState } from "react";
import { api } from "../api";

interface Servico {
  id: string;
  nome: string;
  categoria: string;
  duracaoMinutos: number;
  preco: number;
  ativo: boolean;
}

export function Servicos({ cor }: { cor: string }) {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("Geral");
  const [duracao, setDuracao] = useState(30);
  const [preco, setPreco] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setServicos(await api.servicos.listar());
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      await api.servicos.criar({ nome, categoria, duracaoMinutos: duracao, preco });
      setNome("");
      setPreco(0);
      setMostrarForm(false);
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar serviço");
    }
  }

  async function alternar(id: string, ativo: boolean) {
    await api.servicos.alternarAtivo(id, !ativo);
    carregar();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-stone-900">Serviços</h1>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="text-sm font-medium text-white px-4 py-2 rounded-lg"
          style={{ background: cor }}
        >
          {mostrarForm ? "Cancelar" : "+ Novo serviço"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={criar} className="bg-white rounded-xl border border-stone-200 p-5 mb-6 grid grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Categoria</label>
            <input value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Duração (min)</label>
            <input type="number" value={duracao} onChange={(e) => setDuracao(Number(e.target.value))} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Preço (R$)</label>
            <input type="number" step="0.01" value={preco} onChange={(e) => setPreco(Number(e.target.value))} className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          </div>
          {erro && <p className="col-span-4 text-sm text-red-600">{erro}</p>}
          <button type="submit" className="col-span-4 text-sm font-medium text-white py-2 rounded-lg" style={{ background: cor }}>
            Salvar serviço
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-4">
        {servicos.map((s) => (
          <div key={s.id} className={`bg-white rounded-xl border border-stone-200 p-4 flex items-center justify-between ${!s.ativo ? "opacity-50" : ""}`}>
            <div>
              <p className="font-medium text-stone-900">{s.nome}</p>
              <p className="text-xs text-stone-500">{s.categoria} · {s.duracaoMinutos} min</p>
            </div>
            <div className="text-right">
              <p className="font-medium tabular-nums text-stone-900">R$ {s.preco.toFixed(2).replace(".", ",")}</p>
              <button onClick={() => alternar(s.id, s.ativo)} className="text-xs text-stone-400 hover:text-stone-700">
                {s.ativo ? "desativar" : "reativar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
