// Seed de demonstração: cria usuário admin, igrejas com elencos completos,
// uma liga com tabela gerada, resultados, gols, cartões e avisos.
// Executar: pnpm db:seed  (login demo: admin@liga.com / 123456)

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateRoundRobin } from "../src/lib/domain/fixtures";

const db = new PrismaClient();

// Pseudo-aleatório determinístico para o seed ser reproduzível
let seedState = 42;
function rand(max: number): number {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState % max;
}

const CHURCHES = [
  { name: "Igreja Batista Central", denomination: "Batista", district: "Centro" },
  { name: "Assembleia de Deus Vitória", denomination: "Assembleia de Deus", district: "Jardim América" },
  { name: "Igreja Presbiteriana Esperança", denomination: "Presbiteriana", district: "Vila Nova" },
  { name: "Comunidade Graça e Paz", denomination: "Comunidade Evangélica", district: "Santa Cecília" },
  { name: "Igreja Metodista Boas Novas", denomination: "Metodista", district: "Bela Vista" },
  { name: "Igreja Quadrangular Monte Sião", denomination: "Quadrangular", district: "Ipiranga" },
  { name: "Congregação Cristã Betel", denomination: "Congregação Cristã", district: "Mooca" },
  { name: "Igreja Adventista Luz do Mundo", denomination: "Adventista", district: "Penha" },
];

const FIRST_NAMES = [
  "Lucas", "Mateus", "João", "Pedro", "Tiago", "Gabriel", "Rafael", "Daniel",
  "Samuel", "Davi", "Felipe", "André", "Marcos", "Paulo", "Caleb", "Josué",
  "Elias", "Isaque", "Levi", "Noé",
];
const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Costa", "Pereira", "Almeida",
  "Ferreira", "Rodrigues", "Gomes", "Martins", "Barbosa", "Ribeiro", "Carvalho",
];

const POSITIONS = ["GOLEIRO", "FIXO", "ALA", "ALA", "PIVO"];

async function main() {
  console.log("🌱 Iniciando seed...");

  // Usuário administrador
  const admin = await db.user.upsert({
    where: { email: "admin@liga.com" },
    update: { role: "ADMIN" },
    create: {
      name: "Administrador da Liga",
      email: "admin@liga.com",
      passwordHash: await bcrypt.hash("123456", 10),
      role: "ADMIN",
    },
  });

  const futsal = await db.sport.upsert({
    where: { slug: "futsal" },
    update: {},
    create: {
      slug: "futsal",
      name: "Futsal",
      playersOnField: 5,
      description: "4 jogadores de linha + 1 goleiro",
    },
  });

  const existing = await db.league.findUnique({ where: { slug: "copa-das-igrejas-2026" } });
  if (existing) {
    console.log("Seed já executado (liga demo existe). Nada a fazer.");
    return;
  }

  // Igrejas com elenco e comissão
  const churches = [];
  let usedNames = new Set<string>();
  for (const data of CHURCHES) {
    const church = await db.church.create({
      data: {
        ...data,
        city: "São Paulo",
        state: "SP",
        address: `Rua ${data.district}, ${100 + rand(900)}`,
        phone: `(11) 9${String(1000 + rand(9000))}-${String(1000 + rand(9000))}`,
        email: `contato@${data.name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12)}.com.br`,
        pastorName: `Pr. ${FIRST_NAMES[rand(FIRST_NAMES.length)]} ${LAST_NAMES[rand(LAST_NAMES.length)]}`,
        description: `Equipe de futsal da ${data.name}, participante da Copa das Igrejas.`,
      },
    });

    // 12 atletas: 5 titulares (1 goleiro, 4 linha) + 7 reservas
    for (let i = 0; i < 12; i++) {
      let athleteName = "";
      do {
        athleteName = `${FIRST_NAMES[rand(FIRST_NAMES.length)]} ${LAST_NAMES[rand(LAST_NAMES.length)]}`;
      } while (usedNames.has(`${church.id}:${athleteName}`));
      usedNames.add(`${church.id}:${athleteName}`);

      const isStarter = i < 5;
      await db.athlete.create({
        data: {
          churchId: church.id,
          name: athleteName,
          shirtNumber: i + 1,
          position: isStarter ? POSITIONS[i] : POSITIONS[rand(POSITIONS.length)],
          squadRole: isStarter ? "TITULAR" : "RESERVA",
          birthDate: new Date(1988 + rand(18), rand(12), 1 + rand(28)),
        },
      });
    }

    await db.staffMember.create({
      data: {
        churchId: church.id,
        name: `${FIRST_NAMES[rand(FIRST_NAMES.length)]} ${LAST_NAMES[rand(LAST_NAMES.length)]}`,
        role: "Técnico",
      },
    });

    churches.push(church);
  }

  // Liga demo
  const league = await db.league.create({
    data: {
      slug: "copa-das-igrejas-2026",
      name: "Copa das Igrejas",
      season: "2026",
      description:
        "Campeonato de futsal entre igrejas de São Paulo. Turno único de pontos corridos, com premiação para o campeão e o artilheiro da competição.",
      city: "São Paulo",
      state: "SP",
      status: "EM_ANDAMENTO",
      startDate: new Date("2026-07-04T12:00:00"),
      endDate: new Date("2026-10-24T12:00:00"),
      history:
        "A Copa das Igrejas nasceu em 2024 como um torneio amistoso entre quatro igrejas do centro de São Paulo. Em 2026 chega à terceira edição, reunindo oito equipes de diferentes denominações com o objetivo de promover comunhão e esporte.",
      organizers: "Comissão organizadora formada por representantes de cada igreja participante.",
      contact: "copa@ligadasigrejas.com.br · (11) 99999-0000",
      sportId: futsal.id,
      ownerId: admin.id,
      rules: { create: { legs: 1 } },
    },
  });

  // Quadras
  const venues = await Promise.all(
    [
      { name: "Ginásio Municipal Central", district: "Centro" },
      { name: "Quadra Poliesportiva Vila Nova", district: "Vila Nova" },
    ].map((v) =>
      db.venue.create({
        data: {
          leagueId: league.id,
          name: v.name,
          address: `Av. ${v.district}, ${100 + rand(900)}`,
          city: "São Paulo",
          state: "SP",
          description: "Piso de madeira, vestiários e arquibancada.",
        },
      }),
    ),
  );

  // Inscrição das equipes
  const teams = [];
  for (const church of churches) {
    teams.push(
      await db.leagueTeam.create({ data: { leagueId: league.id, churchId: church.id } }),
    );
  }

  // Tabela: turno único (7 rodadas x 4 jogos)
  const rounds = generateRoundRobin(teams.map((t) => t.id), 1);
  const startDate = new Date("2026-07-04T16:00:00");

  const athletesByTeam = new Map<string, { id: string }[]>();
  for (const team of teams) {
    athletesByTeam.set(
      team.id,
      await db.athlete.findMany({ where: { churchId: team.churchId }, select: { id: true } }),
    );
  }

  let playedRounds = 0;
  for (const round of rounds) {
    const dbRound = await db.round.create({
      data: {
        leagueId: league.id,
        number: round.number,
        name: `Rodada ${round.number}`,
      },
    });

    // Uma rodada por sábado, jogos a cada 1h30
    const roundDate = new Date(startDate);
    roundDate.setDate(roundDate.getDate() + (round.number - 1) * 7);
    const finished = round.number <= 5; // 5 rodadas realizadas, 2 futuras
    if (finished) playedRounds++;

    for (let i = 0; i < round.matches.length; i++) {
      const m = round.matches[i];
      const scheduledAt = new Date(roundDate);
      scheduledAt.setMinutes(scheduledAt.getMinutes() + i * 90);

      const homeScore = finished ? rand(7) : null;
      const awayScore = finished ? rand(6) : null;

      const match = await db.match.create({
        data: {
          leagueId: league.id,
          roundId: dbRound.id,
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
          venueId: venues[i % venues.length].id,
          scheduledAt,
          status: finished ? "FINALIZADO" : "AGENDADO",
          homeScore,
          awayScore,
        },
      });

      // Eventos: gols e cartões
      if (finished) {
        for (const [teamId, goals] of [
          [m.homeTeamId, homeScore!],
          [m.awayTeamId, awayScore!],
        ] as const) {
          const squad = athletesByTeam.get(teamId)!;
          for (let g = 0; g < goals; g++) {
            await db.matchEvent.create({
              data: {
                matchId: match.id,
                teamId,
                athleteId: squad[rand(Math.min(squad.length, 8))].id,
                type: "GOL",
                minute: 1 + rand(40),
              },
            });
          }
          if (rand(3) === 0) {
            await db.matchEvent.create({
              data: {
                matchId: match.id,
                teamId,
                athleteId: squad[rand(squad.length)].id,
                type: rand(6) === 0 ? "CARTAO_VERMELHO" : "CARTAO_AMARELO",
                minute: 1 + rand(40),
              },
            });
          }
        }
      }
    }
  }

  // Avisos
  await db.announcement.create({
    data: {
      leagueId: league.id,
      title: "Congresso técnico da fase final",
      content:
        "A reunião com os representantes das equipes acontece no dia 15/08 às 20h, no Ginásio Municipal Central. Presença obrigatória de um representante por igreja.",
      pinned: true,
    },
  });
  await db.announcement.create({
    data: {
      leagueId: league.id,
      title: "Prazo de inscrição de atletas",
      content:
        "As equipes podem inscrever novos atletas até o fim da 6ª rodada, respeitando o limite máximo definido nas regras.",
    },
  });

  console.log(
    `✅ Seed concluído: ${churches.length} igrejas, ${teams.length} equipes, ${rounds.length} rodadas (${playedRounds} realizadas).`,
  );
  console.log("   Login demo: admin@liga.com / 123456");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
