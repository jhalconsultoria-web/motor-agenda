import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.creditoAssinatura.deleteMany();
  await prisma.assinaturaCliente.deleteMany();
  await prisma.planoServico.deleteMany();
  await prisma.planoAssinatura.deleteMany();
  await prisma.agendamento.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.servico.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.empresa.deleteMany();

  const senhaHash = await bcrypt.hash("demo123", 10);

  // ---- Barbearia do João ----
  const barbearia = await prisma.empresa.create({
    data: { nome: "Barbearia do João", slug: "barbearia-do-joao", corPrimaria: "#C4870F" },
  });

  const joao = await prisma.usuario.create({
    data: {
      empresaId: barbearia.id,
      nome: "João Silva",
      email: "joao@barbeariadojoao.com.br",
      senhaHash,
      papel: "ADMIN",
      horarioInicio: "09:00",
      horarioFim: "19:00",
    },
  });

  const corteSimples = await prisma.servico.create({
    data: { empresaId: barbearia.id, nome: "Corte simples", duracaoMinutos: 30, preco: 40, categoria: "Corte" },
  });
  await prisma.servico.create({
    data: { empresaId: barbearia.id, nome: "Corte + barba", duracaoMinutos: 50, preco: 65, categoria: "Combo" },
  });

  const planoBarbearia = await prisma.planoAssinatura.create({
    data: {
      empresaId: barbearia.id,
      nome: "Clube do Corte",
      precoMensal: 70,
      cicloDias: 30,
      itens: { create: [{ servicoId: corteSimples.id, quantidadePorCiclo: 2 }] },
    },
  });

  const clientePedro = await prisma.cliente.create({
    data: { empresaId: barbearia.id, nome: "Pedro Alves", telefone: "11999990001" },
  });

  await prisma.assinaturaCliente.create({
    data: {
      empresaId: barbearia.id,
      clienteId: clientePedro.id,
      planoId: planoBarbearia.id,
      metodoPagamento: "PIX",
      proximaCobrancaEm: new Date(Date.now() + 30 * 86_400_000),
    },
  });

  await prisma.agendamento.create({
    data: {
      empresaId: barbearia.id,
      clienteId: clientePedro.id,
      profissionalId: joao.id,
      servicoId: corteSimples.id,
      data: new Date().toISOString().slice(0, 10),
      horaInicio: "10:00",
      horaFim: "10:30",
      valorCobrado: 40,
      status: "AGENDADO",
    },
  });

  // ---- Petshop Amigo Fiel ----
  const petshop = await prisma.empresa.create({
    data: { nome: "Petshop Amigo Fiel", slug: "amigo-fiel", corPrimaria: "#2F6E5B" },
  });

  const marcia = await prisma.usuario.create({
    data: {
      empresaId: petshop.id,
      nome: "Márcia Souza",
      email: "marcia@amigofiel.com.br",
      senhaHash,
      papel: "ADMIN",
      horarioInicio: "08:00",
      horarioFim: "18:00",
    },
  });

  await prisma.servico.create({
    data: { empresaId: petshop.id, nome: "Banho", duracaoMinutos: 40, preco: 45, categoria: "Higiene" },
  });
  await prisma.servico.create({
    data: { empresaId: petshop.id, nome: "Banho + tosa", duracaoMinutos: 60, preco: 70, categoria: "Higiene" },
  });

  await prisma.cliente.create({
    data: { empresaId: petshop.id, nome: "Ana Costa", telefone: "11999990002" },
  });

  console.log("Seed concluído:");
  console.log(`  Barbearia do João — login joao@barbeariadojoao.com.br / demo123`);
  console.log(`  Petshop Amigo Fiel — login marcia@amigofiel.com.br / demo123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
