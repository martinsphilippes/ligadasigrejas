# 🏆 Liga das Igrejas

Plataforma completa para administrar campeonatos esportivos entre igrejas: ligas, equipes, atletas, tabelas, resultados e classificação em tempo real.

## Como rodar

```bash
pnpm install
pnpm db:push    # cria o banco SQLite local
pnpm db:seed    # (opcional) dados de demonstração
pnpm dev        # http://localhost:3000
```

**Login de demonstração:** `admin@liga.com` / `123456` — inclui a liga *Copa das Igrejas 2026* com 8 equipes, 7 rodadas geradas e 5 rodadas de resultados registrados.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js (App Router, Server Components + Server Actions) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS v4 |
| Banco | Prisma + SQLite (portável para PostgreSQL trocando o datasource) |
| Autenticação | Sessão JWT em cookie httpOnly (jose) + bcrypt |
| Validação | Zod |

## Arquitetura

```
src/
├── app/                      # Rotas (apenas composição de telas)
│   ├── (auth)/               # Login, cadastro, recuperação de senha
│   └── (app)/                # Área autenticada
│       ├── igrejas/          # Cadastro global de igrejas, atletas e comissão
│       └── ligas/[slug]/     # Dashboard, classificação, rodadas, jogos,
│                             # minha equipe, equipes, atletas, quadras,
│                             # agenda, regras, sobre, organização
├── components/
│   ├── ui/                   # Kit de componentes reutilizáveis
│   ├── forms/                # Formulários compartilhados
│   └── layout/               # Topbar, navegação da liga
└── lib/
    ├── domain/               # ⭐ Regras de negócio puras (sem banco/UI):
    │   ├── standings.ts      #    motor de classificação com desempates configuráveis
    │   ├── fixtures.ts       #    geração de tabela round-robin (turnos configuráveis)
    │   ├── knockout.ts       #    chaveamento de mata-mata (bracket, agregado, pênaltis, W.O.)
    │   ├── rules.ts          #    parsing das regras da liga
    │   └── enums.ts          #    enums de domínio tipados
    ├── data/                 # Consultas (React cache por requisição)
    ├── actions/              # Server Actions (validação Zod + autorização)
    ├── auth/                 # Sessão e ações de autenticação
    ├── permissions.ts        # Papéis → capacidades (autorização por capacidade)
    └── db.ts                 # Cliente Prisma singleton
```

### Decisões-chave

- **Classificação calculada, nunca armazenada** — o motor em `lib/domain/standings.ts` recalcula a tabela a partir das partidas e das regras vigentes; alterar a pontuação nas Regras reflete imediatamente.
- **Regras 100% configuráveis por liga** — formato, pontuação, turnos, mata-mata, desempates ordenáveis, tempo de jogo, elenco e disciplina ficam em `LeagueRules`, sem mudança de código.
- **Formatos de campeonato funcionais** — pontos corridos, fase de grupos (round-robin por grupo, tabela por grupo), mata-mata puro e grupos + mata-mata. O chaveamento usa ordem de bracket padrão (1×8, 4×5…), respeita ida e volta, decide por agregado → pênaltis → W.O. e avança fase a fase até apontar o campeão.
- **Disciplina automática** — suspensos (vermelho ou acúmulo de amarelos conforme as regras) e pendurados aparecem na página da equipe.
- **Esporte como entidade** — Futsal é seed; novos esportes = nova linha em `Sport` + posições em `POSITIONS_BY_SPORT`.
- **Autorização por capacidade** — telas e ações consultam capacidades (`league.manage`, `results.record`…), não papéis; novos papéis não exigem mudanças espalhadas.
- **Igreja ≠ Equipe** — `Church` é global e participa de várias ligas via `LeagueTeam`, preparado para múltiplas categorias no futuro.
- **Eventos de partida** (`MatchEvent`) já alimentam artilharia e cartões — base das estatísticas individuais futuras.

## Papéis

**Na plataforma** (conta do usuário — gerenciados pelo admin em Usuários):

| Papel | Pode |
| --- | --- |
| Administrador | Tudo, incluindo promover/rebaixar usuários |
| Organizador | Criar ligas e cadastrar/gerenciar igrejas |
| Membro (padrão) | Participar e acompanhar — sem criar ligas ou igrejas |

A primeira conta criada na plataforma vira automaticamente o Administrador.

**Dentro de cada liga** (atribuídos na tela Organização):

| Papel | Pode |
| --- | --- |
| Dono / Organizador Geral | Tudo: liga, regras, equipes, agenda, resultados |
| Organizador da Igreja | Dados e elenco da sua igreja |
| Administrador da Equipe | Elenco: titulares, reservas, comissão |
| Mesário / Árbitro | Registrar placar, gols e cartões |

## Produção

Para PostgreSQL, altere `datasource db` em `prisma/schema.prisma` (`provider = "postgresql"`) e a `DATABASE_URL` no `.env`. Defina também um `AUTH_SECRET` forte.
