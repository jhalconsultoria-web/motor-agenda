import { useEffect, useState } from "react";
import { api } from "../api";

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
}

export function Clientes() {
  const [lista, setLista] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      api.clientes.listar(busca).then(setLista);
    }, 250);
    return () => clearTimeout(t);
  }, [busca]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-stone-900">Clientes</h1>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm w-64"
        />
      </div>

      <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
        {lista.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-stone-400">Nenhum cliente encontrado.</p>
        ) : (
          lista.map((c) => (
            <div key={c.id} className="px-5 py-4 flex items-center justify-between">
              <p className="font-medium text-stone-900">{c.nome}</p>
              <p className="text-sm text-stone-500 tabular-nums">{c.telefone}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
