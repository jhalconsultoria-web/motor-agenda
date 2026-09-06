import { useEffect, useState } from "react";
import { api } from "../api";

interface Profissional {
  id: string;
  nome: string;
  email: string;
  papel: string;
  especialidades: string | null;
  horarioInicio: string;
  horarioFim: string;
  ativo: boolean;
}

export function Profissionais() {
  const [lista, setLista] = useState<Profissional[]>([]);

  useEffect(() => {
    api.profissionais.listar().then(setLista);
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold text-stone-900 mb-6">Profissionais</h1>
      <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
        {lista.map((p) => (
          <div key={p.id} className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-stone-900">{p.nome}</p>
              <p className="text-xs text-stone-500">{p.email} · {p.papel === "ADMIN" ? "Administrador" : "Profissional"}</p>
            </div>
            <p className="text-sm text-stone-500 tabular-nums">{p.horarioInicio} – {p.horarioFim}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
