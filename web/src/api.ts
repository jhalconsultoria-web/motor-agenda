const BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:3333"}/api`;

export interface SessaoAtiva {
  token: string;
  usuario: { id: string; nome: string; papel: "ADMIN" | "PROFISSIONAL" };
  empresa: { id: string; nome: string; slug: string; corPrimaria: string; logoUrl?: string | null };
}

function getToken(): string | null {
  return localStorage.getItem("motor_agenda_token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.erro ?? `Erro ${res.status}`);
  return body;
}

export const api = {
  login: (email: string, senha: string): Promise<SessaoAtiva> =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, senha }) }),

  registrar: (dados: {
    nomeEmpresa: string;
    corPrimaria: string;
    logoUrl?: string;
    nomeAdmin: string;
    email: string;
    senha: string;
  }): Promise<SessaoAtiva> => request("/auth/registrar", { method: "POST", body: JSON.stringify(dados) }),

  empresa: {
    atualizar: (dados: { nome?: string; corPrimaria?: string; logoUrl?: string | null }) =>
      request("/empresa", { method: "PATCH", body: JSON.stringify(dados) }),
  },

  servicos: {
    listar: () => request("/servicos"),
    criar: (dados: { nome: string; categoria: string; duracaoMinutos: number; preco: number }) =>
      request("/servicos", { method: "POST", body: JSON.stringify(dados) }),
    alternarAtivo: (id: string, ativo: boolean) =>
      request(`/servicos/${id}/ativo`, { method: "PATCH", body: JSON.stringify({ ativo }) }),
  },

  profissionais: {
    listar: () => request("/profissionais"),
  },

  clientes: {
    listar: (busca?: string) => request(`/clientes${busca ? `?busca=${encodeURIComponent(busca)}` : ""}`),
  },

  agendamentos: {
    listar: (params: { dataInicio?: string; dataFim?: string; status?: string } = {}) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request(`/agendamentos${qs ? `?${qs}` : ""}`);
    },
    atualizarStatus: (id: string, status: string) =>
      request(`/agendamentos/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  },

  planos: {
    listar: () => request("/planos"),
  },
};

export function salvarSessao(sessao: SessaoAtiva) {
  localStorage.setItem("motor_agenda_token", sessao.token);
  localStorage.setItem("motor_agenda_empresa", JSON.stringify(sessao.empresa));
  localStorage.setItem("motor_agenda_usuario", JSON.stringify(sessao.usuario));
}

export function limparSessao() {
  localStorage.removeItem("motor_agenda_token");
  localStorage.removeItem("motor_agenda_empresa");
  localStorage.removeItem("motor_agenda_usuario");
}

export function lerSessao(): SessaoAtiva | null {
  const token = getToken();
  const empresa = localStorage.getItem("motor_agenda_empresa");
  const usuario = localStorage.getItem("motor_agenda_usuario");
  if (!token || !empresa || !usuario) return null;
  return { token, empresa: JSON.parse(empresa), usuario: JSON.parse(usuario) };
}
