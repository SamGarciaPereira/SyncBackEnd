# SYNC API

Backend do **SYNC — Projeto de Segurança na Medicação do Idoso**. API construída com Next.js (route handlers), Prisma e MySQL.

> Status: MVP em desenvolvimento.

## Sobre o projeto

O SYNC é um MVP para auxiliar idosos no controle e acompanhamento de medicamentos de uso contínuo, reduzindo problemas como esquecimentos, dúvidas sobre doses já tomadas, dificuldade para identificar medicamentos e falta de controle de estoque. O público principal são idosos que administram medicamentos diariamente e podem ter dificuldades de memória, visão, organização da rotina ou uso de tecnologias complexas.

O MVP permite identificar medicamentos e horários corretos, registrar a realização da dose e fornecer informações de acompanhamento a familiares ou cuidadores, com controle básico de estoque e avisos de medicamento próximo do fim.

**Fora de escopo:** não é um sistema médico completo, não realiza diagnósticos e não substitui profissionais de saúde. O sistema registra a **confirmação** da dose; não afirma que o medicamento foi ingerido, a menos que exista um mecanismo capaz de comprovar isso.

### Objetivos

- Reduzir esquecimentos de horários e dúvidas sobre doses já tomadas.
- Facilitar a identificação do medicamento correto.
- Aumentar a autonomia do idoso na rotina de medicação.
- Reduzir ligações constantes de familiares para confirmar a tomada.
- Facilitar o acompanhamento por familiares ou cuidadores e a comunicação entre responsáveis.
- Auxiliar no controle de estoque.
- Criar uma solução simples, acessível e fácil de usar.

### Como a solução resolve o problema

- Cada medicamento é associado a horários específicos, com alerta visual e/ou sonoro.
- O usuário confirma a dose; o histórico evita a dúvida "já tomei?".
- Familiares e cuidadores acompanham a rotina e podem ser avisados se uma dose não for registrada no período esperado.
- Controle básico de estoque, com aviso antecipado para reposição.

## Equipe

Abilio Pedro, Beatriz Cunha, Enzo Ceron, Pedro Muller e Samuel Garcia.

## Links

- Frontend: <https://github.com/SamGarciaPereira/sync-frontend>
- Backend: <https://github.com/SamGarciaPereira/sync-api>
- Trello: <https://trello.com/invite/b/6ac38803ef102d5af782a1cd/ATTI8fd35527940e1f6969f2c8a0dc48d3884ADA0F7F/sync>
- Protótipos de baixa fidelidade: <https://github.com/PedroVol/Prototipacao_Baixa_Fidelidade>
- Requisitos funcionais (imagens): <https://github.com/PedroVol/Requisitos_Funcionais_SYNC>

## Requisitos

### User stories

| Grupo               | User stories                                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cadastros           | US01 Cuidador · US08 Idoso · US26 Contato emergencial                                                                                              |
| Medicação           | US02 Medicamentos · US03 Horários · US04 Dosagem · US05 Alertas de utilização · US11 Check-in diário · US18 Medicação condicional                  |
| Estoque             | US07 Configuração de estoque · US30 Alertas de estoque baixo · US29 Integração com API de compra                                                   |
| Saúde               | US12 Glicose · US13 Pressão arterial · US14 Temperatura · US15 Oxigenação · US16 Frequência respiratória · US17 Alergias · US19 Dashboard de saúde |
| Acompanhamento      | US06 Dashboard de medicamentos · US09 Histórico · US10 Relatório semanal · US24 Exportação de PDF                                                  |
| Acesso e segurança  | US22 Login · US23 Controle de acesso                                                                                                               |
| IA                  | US20 IA para consulta e resumo · US21 IA com entrada por voz                                                                                       |
| Emergência e canais | US25 Botão de SOS · US27 Integração de e-mail · US28 Integração com WhatsApp                                                                       |

A IA nunca diagnostica, prescreve ou altera dosagens, e ações sensíveis (compra, SOS, salvar por voz) exigem confirmação do usuário.

### Requisitos não funcionais

- **RNF01 Usabilidade:** interface do idoso simples, com poucos passos.
- **RNF02 Acessibilidade visual:** textos e botões grandes, bom contraste.
- **RNF03 Confiabilidade:** horários e registros persistem após fechar/reiniciar o sistema.
- **RNF04 Segurança:** apenas usuários autorizados acessam os dados do idoso.
- **RNF05 Disponibilidade:** lembretes e identificação da medicação funcionam mesmo sem o acompanhamento remoto.

## Stack

- [Next.js](https://nextjs.org/) 16 (route handlers) e TypeScript
- [Prisma](https://www.prisma.io/) 7 com adapter MariaDB
- MySQL 8.0 via Docker Compose
- `bcryptjs` (hash de senha) e `jose`
- Jest, ESLint e Prettier
- Husky, commitlint e commitizen (Conventional Commits)

## Estrutura do projeto

```
app/
  api/
    status/route.ts      # GET /api/status
    users/route.ts       # GET e POST /api/users
  models/                # regras de negócio (user, password)
  __tests__/             # testes de integração
infra/
  compose.yaml           # MySQL para desenvolvimento
  controller.ts          # tratamento de erros dos handlers
  errors.ts              # erros customizados
  prisma.ts              # cliente Prisma
  webserver.ts
  schema.prisma          # configuração do Prisma
  schema/user.prisma     # modelo User
  migrations/            # migrations SQL
  scripts/wait-for-database.js
```

## Como rodar

### Pré-requisitos

- Node.js 24.x
- Docker e Docker Compose

### Passo a passo

```bash
npm install
cp .env.example .env
cp .env.example .env.development
```

Ajuste `DATABASE_URL` e `DATABASE_NAME` nos arquivos `.env`. Para o login, defina também `SESSION_SECRET` (segredo que assina a sessão) e `CORS_ORIGIN` (endereço do front, padrão `http://localhost:5173`). O banco de desenvolvimento definido em [`infra/compose.yaml`](infra/compose.yaml) é exposto na porta **15606** do host (e não 3306), então a URL deve apontar para essa porta.

```bash
npm run dev
```

O comando sobe o MySQL, aguarda o banco ficar disponível, aplica as migrations e inicia a API em <http://localhost:3001>.

### Scripts

| Script                                        | Descrição                                      |
| --------------------------------------------- | ---------------------------------------------- |
| `npm run dev`                                 | Sobe o banco, aplica migrations e inicia a API |
| `npm run build` / `npm start`                 | Build e execução em produção (porta 3001)      |
| `npm test`                                    | Sobe o banco e roda os testes                  |
| `npm run test:watch`                          | Testes em modo watch                           |
| `npm run services:up` / `stop` / `down`       | Gerencia o container do MySQL                  |
| `npm run migrations:dev`                      | Cria/aplica migration em desenvolvimento       |
| `npm run migrations:up` / `migrations:up:dev` | Aplica migrations existentes                   |
| `npm run migrations:reset`                    | Reseta o banco de desenvolvimento              |
| `npm run prisma:generate` / `prisma:studio`   | Gera o cliente / abre o Prisma Studio          |
| `npm run lint:prettier:check` / `fix`         | Verifica / corrige formatação                  |
| `npm run lint:eslint:check`                   | Verifica o código com ESLint                   |
| `npm run commit`                              | Commit guiado (commitizen)                     |

## Endpoints

| Método | Rota                               | Descrição                                                                                      |
| ------ | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| GET    | `/api/status`                      | Verifica se a API está no ar                                                                   |
| GET    | `/api/users`                       | Lista usuários                                                                                 |
| POST   | `/api/users`                       | Cadastro: `name`, `email`, `password` (mín. 6) e `birthDate` (`AAAA-MM-DD`)                    |
| POST   | `/api/sessions`                    | Login (`email`, `password`): grava o cookie de sessão `sync_session`                           |
| DELETE | `/api/sessions`                    | Logout: apaga o cookie de sessão                                                               |
| GET    | `/api/user`                        | Dados do usuário logado 🔒                                                                     |
| GET    | `/api/medications?catalog=true&q=` | Busca no catálogo de medicamentos (autocomplete)                                               |
| GET    | `/api/medications`                 | Lista os medicamentos ativos do usuário logado 🔒 (`includeInactive=true` inclui os removidos) |
| POST   | `/api/medications`                 | Cadastra um medicamento para o usuário logado 🔒                                               |
| GET    | `/api/medications/:id`             | Detalha um medicamento do usuário logado 🔒                                                    |
| PATCH  | `/api/medications/:id`             | Edita um medicamento (parcial; `schedules` substitui os horários) 🔒                           |
| DELETE | `/api/medications/:id`             | Remove da lista (soft delete: `isActive = false`) 🔒                                           |
| GET    | `/api/history`                     | Histórico 🔒: resumo e eventos (`type`, `from`, `to`, `limit`, `offset`)                       |
| GET    | `/api/history/report`              | Relatório em PDF do histórico 🔒 (mesmos filtros `type`, `from`, `to`)                         |

🔒 Exige login: sem o cookie de sessão a resposta é `401`. Medicamentos de outro usuário respondem `404`.

## Contribuindo

Os commits seguem [Conventional Commits](https://www.conventionalcommits.org/) e são validados por commitlint via Husky. Use `npm run commit` para um fluxo guiado.
