const BASE = `http://localhost:${process.env.PORT ?? 3333}/api`;

let falhas = 0;
function checar(condicao: boolean, descricao: string) {
  if (condicao) {
    console.log(`OK   - ${descricao}`);
  } else {
    console.log(`FAIL - ${descricao}`);
    falhas++;
  }
}

async function login(email: string, senha: string) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
  const body = (await r.json()) as any;
  return { status: r.status, body };
}

async function main() {
  const joao = await login("joao@barbeariadojoao.com.br", "demo123");
  checar(joao.status === 200 && !!joao.body.token, "login do dono da barbearia funciona");
  const tokenJoao = joao.body.token;

  const marcia = await login("marcia@amigofiel.com.br", "demo123");
  checar(marcia.status === 200 && !!marcia.body.token, "login do dono do petshop funciona");
  const tokenMarcia = marcia.body.token;

  const servicosBarbearia = await fetch(`${BASE}/servicos`, {
    headers: { Authorization: `Bearer ${tokenJoao}` },
  }).then((r) => r.json() as Promise<any>);
  checar(
    servicosBarbearia.length === 2 && servicosBarbearia.every((s: any) => s.nome.includes("Corte")),
    "barbearia só vê os próprios serviços (isolamento de tenant)"
  );

  const servicosPetshop = await fetch(`${BASE}/servicos`, {
    headers: { Authorization: `Bearer ${tokenMarcia}` },
  }).then((r) => r.json() as Promise<any>);
  checar(
    servicosPetshop.length === 2 && servicosPetshop.every((s: any) => s.nome.includes("Banho")),
    "petshop só vê os próprios serviços (isolamento de tenant)"
  );

  const clientesBarbearia = await fetch(`${BASE}/clientes`, {
    headers: { Authorization: `Bearer ${tokenJoao}` },
  }).then((r) => r.json() as Promise<any>);
  checar(
    clientesBarbearia.length === 1 && clientesBarbearia[0].nome === "Pedro Alves",
    "barbearia não enxerga cliente do petshop"
  );

  // fluxo público — mini-site da barbearia
  const empresaPublica = await fetch(`${BASE}/public/barbearia-do-joao/empresa`).then((r) => r.json() as Promise<any>);
  checar(empresaPublica.nome === "Barbearia do João", "rota pública resolve empresa pelo slug");

  const servicosPublicos = await fetch(`${BASE}/public/barbearia-do-joao/servicos`).then((r) => r.json() as Promise<any>);
  const corteSimples = servicosPublicos.find((s: any) => s.nome === "Corte simples");
  const profissionais = await fetch(`${BASE}/public/barbearia-do-joao/profissionais`).then((r) => r.json() as Promise<any>);
  const joaoProfissionalId = profissionais[0].id;

  const amanha = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  const horarios = await fetch(
    `${BASE}/public/barbearia-do-joao/horarios-disponiveis?profissionalId=${joaoProfissionalId}&servicoId=${corteSimples.id}&data=${amanha}`
  ).then((r) => r.json() as Promise<any>);
  checar(horarios.horarios.length > 0, "motor calcula horários livres pro dia seguinte");

  const horaEscolhida = horarios.horarios[0];

  // Pedro tem assinatura ativa com 2 créditos de corte simples — primeiro agendamento deve consumir crédito
  const agendamento1 = await fetch(`${BASE}/public/barbearia-do-joao/agendamentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clienteNome: "Pedro Alves",
      clienteTelefone: "11999990001",
      profissionalId: joaoProfissionalId,
      servicoId: corteSimples.id,
      data: amanha,
      horaInicio: horaEscolhida,
    }),
  }).then((r) => r.json() as Promise<any>);
  checar(agendamento1.cobranca?.tipo === "credito_assinatura", "1º agendamento do assinante consome crédito, não cobra avulso");

  // reservar o mesmo horário de novo deve dar conflito
  const conflito = await fetch(`${BASE}/public/barbearia-do-joao/agendamentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clienteNome: "Outro Cliente",
      clienteTelefone: "11999990099",
      profissionalId: joaoProfissionalId,
      servicoId: corteSimples.id,
      data: amanha,
      horaInicio: horaEscolhida,
    }),
  });
  checar(conflito.status === 409, "motor rejeita agendamento em horário já ocupado do mesmo profissional");

  // cliente sem assinatura ativa: agendamento avulso deve gerar cobrança Pix (simulada, sem chave real da Asaas)
  const horarios2 = await fetch(
    `${BASE}/public/barbearia-do-joao/horarios-disponiveis?profissionalId=${joaoProfissionalId}&servicoId=${corteSimples.id}&data=${amanha}`
  ).then((r) => r.json() as Promise<any>);
  const outroHorario = horarios2.horarios.find((h: string) => h !== horaEscolhida);

  const agendamentoAvulso = await fetch(`${BASE}/public/barbearia-do-joao/agendamentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clienteNome: "Cliente Avulso",
      clienteTelefone: "11999990088",
      profissionalId: joaoProfissionalId,
      servicoId: corteSimples.id,
      data: amanha,
      horaInicio: outroHorario,
    }),
  }).then((r) => r.json() as Promise<any>);
  checar(
    agendamentoAvulso.cobranca?.tipo === "avulso" && !!agendamentoAvulso.cobranca?.pixCopiaCola,
    "cliente sem assinatura gera cobrança Pix avulsa (modo simulado)"
  );

  // assinar plano exige CPF/CNPJ
  const assinarSemCpf = await fetch(`${BASE}/planos/assinar`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenJoao}` },
    body: JSON.stringify({ clienteId: "qualquer", planoId: "qualquer", metodoPagamento: "PIX" }),
  });
  checar(assinarSemCpf.status === 400, "assinar plano sem CPF/CNPJ é rejeitado");

  console.log(falhas === 0 ? "\nTodos os testes passaram." : `\n${falhas} teste(s) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
