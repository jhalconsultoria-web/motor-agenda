const BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:3333"}/api/public`;

async function request(slug: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}/${slug}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.erro ?? `Erro ${res.status}`);
  return body;
}

export interface Empresa {
  nome: string;
  corPrimaria: string;
  logoUrl: string | null;
}

export interface Servico {
  id: string;
  nome: string;
  categoria: string;
  duracaoMinutos: number;
  preco: number;
}

export interface Profissional {
  id: string;
  nome: string;
  especialidades: string | null;
}

export const api = {
  empresa: (slug: string): Promise<Empresa> => request(slug, "/empresa"),
  servicos: (slug: string): Promise<Servico[]> => request(slug, "/servicos"),
  profissionais: (slug: string): Promise<Profissional[]> => request(slug, "/profissionais"),
  horariosDisponiveis: (slug: string, profissionalId: string, servicoId: string, data: string): Promise<{ horarios: string[] }> =>
    request(slug, `/horarios-disponiveis?profissionalId=${profissionalId}&servicoId=${servicoId}&data=${data}`),
  agendar: (
    slug: string,
    dados: {
      clienteNome: string;
      clienteTelefone: string;
      profissionalId: string;
      servicoId: string;
      data: string;
      horaInicio: string;
    }
  ) => request(slug, "/agendamentos", { method: "POST", body: JSON.stringify(dados) }),
};
