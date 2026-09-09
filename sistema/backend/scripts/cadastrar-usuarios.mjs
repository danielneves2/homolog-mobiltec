import 'dotenv/config';
import { PrismaClient, PapelUsuario } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const NOVOS_USUARIOS = [
  { email: 'rcordeiro@mobiltec.com.br', nome: 'R Cordeiro', cargo: 'Responsável Técnico' },
  { email: 'amarinho@mobiltec.com.br', nome: 'A Marinho', cargo: 'Responsável Técnico' },
  { email: 'maraujo@mobiltec.com.br', nome: 'M Araujo', cargo: 'Responsável Técnico' },
  { email: 'juliasantos@mobiltec.com.br', nome: 'Julia Santos', cargo: 'Responsável Técnico' },
  { email: 'dvalente@mobiltec.com.br', nome: 'D Valente', cargo: 'Responsável Técnico' },
  { email: 'davidmorais@mobiltec.com.br', nome: 'David Morais', cargo: 'Responsável Técnico' },
];

const SENHA_PADRAO = 'Mobiltec@2026';

async function main() {
  console.log('--- Cadastrando novos usuários administradores ---');
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);

  for (const u of NOVOS_USUARIOS) {
    const usuario = await prisma.usuario.upsert({
      where: { email: u.email },
      update: {
        nome: u.nome,
        cargo: u.cargo,
        senhaHash,
        papel: PapelUsuario.ADMIN,
        empresa: 'Mobiltec',
        dominioCorporativo: 'mobiltec.com.br',
        ativo: true,
      },
      create: {
        nome: u.nome,
        email: u.email,
        cargo: u.cargo,
        senhaHash,
        papel: PapelUsuario.ADMIN,
        empresa: 'Mobiltec',
        dominioCorporativo: 'mobiltec.com.br',
        ativo: true,
      },
    });

    console.log(`✅ Usuário criado/atualizado: ${usuario.email} (${usuario.nome}) - Papel: ${usuario.papel}`);
  }

  console.log('\n--- Validando login de todos os usuários cadastrados na API em produção ---');
  for (const u of NOVOS_USUARIOS) {
    try {
      const res = await fetch('https://homolog-mobiltec.vercel.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email, senha: SENHA_PADRAO }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        console.log(`🎉 Login em Produção OK: ${u.email} | Nome: ${data.usuario?.nome} | Papel: ${data.usuario?.papel}`);
      } else {
        console.error(`❌ Falha no login de ${u.email}:`, data);
      }
    } catch (err) {
      console.error(`❌ Erro de rede ao testar ${u.email}:`, err.message);
    }
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
