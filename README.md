# 🌟 Life OS - Sistema Operacional de Produtividade & Gestão Pessoal

<div align="center">

![Life OS Banner](https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=1200&q=80)

**Uma plataforma completa, inteligente e minimalista para centralizar sua vida pessoal, acadêmica, profissional e financeira.**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-3.6%20Flash-8E75B2?style=for-the-badge&logo=google)](https://ai.google.dev/)

</div>

---

## 📑 Sumário

- [Visão Geral](#-visão-geral)
- [Principais Funcionalidades](#-principais-funcionalidades)
  - [1. Dashboard Central & Métricas](#1-dashboard-central--métricas)
  - [2. Gestão de Tarefas (Inbox, Hoje, Próximos)](#2-gestão-de-tarefas-inbox-hoje-próximos)
  - [3. Assistente de IA com Gemini 3.6 Flash & NLP](#3-assistente-de-ia-com-gemini-36-flash--nlp)
  - [4. Sincronização com Google Agenda](#4-sincronização-com-google-agenda)
  - [5. Biblioteca Pessoal com ISBN & Upload de Capas](#5-biblioteca-pessoal-com-isbn--upload-de-capas)
  - [6. Projetos & Gestão de Metas](#6-projetos--gestão-de-metas)
  - [7. Estudos & Acompanhamento Acadêmico](#7-estudos--acompanhamento-acadêmico)
  - [8. Finanças & Contas a Pagar](#8-finanças--contas-a-pagar)
  - [9. Gestão de Usuários & Painel Admin](#9-gestão-de-usuários--painel-admin)
- [Arquitetura & Estrutura de Diretórios](#-arquitetura--estrutura-de-diretórios)
- [Modelagem do Banco de Dados (Prisma Schema)](#-modelagem-do-banco-de-dados-prisma-schema)
- [Segurança & Multi-inquilino (Multi-Tenancy)](#-segurança--multi-inquilino-multi-tenancy)
- [Instalação & Configuração Local](#-instalação--configuração-local)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Como Hospedar Online Gratuitamente](#-como-hospedar-online-gratuitamente)

---

## 🧭 Visão Geral

O **Life OS** foi desenvolvido para resolver a sobrecarga mental de alternar entre múltiplos aplicativos para gerenciar tarefas, anotações de estudo, controle de livros, contas a pagar e calendário. 

Construído sobre o framework moderno **Next.js 14 (App Router)**, ele combina um design limpo e fluido com o poder da **Inteligência Artificial (Google Gemini 3.6 Flash)** para que você possa agendar compromissos, registrar leituras e cadastrar finanças em linguagem natural em uma única conversa.

---

## ✨ Principais Funcionalidades

### 1. Dashboard Central & Métricas
- **Saudação Dinâmica:** Identifica o usuário autenticado e a hora do dia para apresentar um resumo personalizado.
- **Cartões de Estatísticas:** Tarefas pendentes, concluídas, projetos em andamento, livros em leitura e contas a pagar do mês.
- **Visão Rápida:** Lista de tarefas do dia e atalhos rápidos com atalhos de teclado (`Ctrl+K` para busca global).

### 2. Gestão de Tarefas (Inbox, Hoje, Próximos)
- **Inbox:** Caixa de entrada estilo GTD (Getting Things Done) para descarregar ideias rapidamente sem atrito.
- **Hoje:** Foco nas atividades prioritárias do dia atual com indicação de horário.
- **Próximos 7 Dias:** Planejamento semanal visual para antecipar prazos e compromissos.
- **Prioridades & Recorrência:** Tarefas com suporte a prioridade (`BAIXA`, `MÉDIA`, `ALTA`, `URGENTE`) e repetição automática (`DIÁRIA`, `SEMANAL`, `MENSAL`).

### 3. Assistente de IA com Gemini 3.6 Flash & NLP
- **Interpretação Semântica Profunda:** A IA não apenas copia a frase digitada; ela extrai o título limpo e conciso da ação (ex: *"Levar o Rex ao Veterinário"*), move detalhes adicionais para a descrição e infere a categoria correta (`Saúde`, `Faculdade`, `Freelance`, `Compras`, `Finanças`).
- **Cálculo Cronológico Preciso:** Interpreta termos relativos em português (*"amanhã às 14h30"*, *"na próxima terça"*, *"sexta às 23:59"*), calculando o timestamp exato.
- **Resiliência Multi-modelo:** Fallback automático entre `gemini-3.6-flash`, `gemini-3.5-flash` e `gemini-3.1-flash-lite`, além de um motor local determinístico de NLP caso o serviço esteja temporariamente sem conexão.

### 4. Sincronização com Google Agenda
- Todas as tarefas com data/horário geram um link direto no padrão oficial do **Google Agenda**, permitindo sincronizar eventos com um único clique com início, término, título e descrição pré-preenchidos.

### 5. Biblioteca Pessoal com ISBN & Upload de Capas
- **Busca por ISBN & Título:** Consulta automática às APIs do Google Books e Open Library para preencher autor, total de páginas e capa oficial em alta definição.
- **Upload de Imagem Local:** Envio de imagens diretamente do computador (`PNG`, `JPG`, `WEBP`) com prévia instantânea e salvamento em `/public/uploads/covers`.
- **Link Direto:** Suporte a inserção de URL externa de capa.
- **Controle de Páginas:** Botões de avanço rápido (+5 págs, +20 págs) e cálculo de porcentagem lida.

### 6. Projetos & Gestão de Metas
- Organização em projetos com barra de progresso calculada automaticamente com base nas tarefas filhas concluídas.
- Data de entrega, nível de prioridade e notas de planejamento.

### 7. Estudos & Acompanhamento Acadêmico
- Controle de cursos e certificações com progresso por módulos.
- Vínculo com tarefas e matérias acadêmicas (`academicSubject`).

### 8. Finanças & Contas a Pagar
- Acompanhamento de despesas, boletos, contas de consumo e faturas.
- **Cálculo Dinâmico:** Painel com **Total Pendente** e **Total Pago** atualizado em tempo real.
- Suporte a contas recorrentes mensais (avança o ciclo ao marcar como paga).

### 9. Gestão de Usuários & Painel Admin
- **Isolamento de Dados (Multi-tenancy):** Cada usuário possui seus próprios registros de tarefas, projetos, livros e finanças. Novos usuários iniciam com perfil 100% limpo.
- **Painel Administrativo (`/admin/users`):** Usuários com papel de Administrador podem criar novas contas, redefinir senhas e excluir usuários.
- **Validação Estrita de Login:** Nomes de usuário não aceitam espaços nem caracteres especiais (apenas letras, números e `.`).

---

## 🏗️ Arquitetura & Estrutura de Diretórios

```
projeto/
├── prisma/
│   ├── schema.prisma       # Definição do esquema do banco de dados SQLite
│   └── seed.ts             # Dados iniciais e criação do usuário administrador
├── public/
│   ├── uploads/covers/     # Armazenamento local das capas de livros enviadas
│   └── icons/              # Ícones da aplicação
├── src/
│   ├── app/                # App Router do Next.js 14
│   │   ├── admin/users/    # Painel de gestão de usuários
│   │   ├── api/            # Rotas de API REST
│   │   │   ├── admin/      # CRUD de administração de usuários
│   │   │   ├── auth/       # Login, Logout, Me, Troca de Senha
│   │   │   ├── books/isbn/ # Consulta de ISBN (Google Books / Open Library)
│   │   │   ├── categories/ # Gerenciamento de categorias
│   │   │   ├── chat/       # Processamento e confirmação de IA
│   │   │   ├── finance/    # CRUD financeiro e métricas
│   │   │   ├── projects/   # CRUD de projetos
│   │   │   ├── reading/    # CRUD de livros e progresso
│   │   │   ├── stats/      # Métricas do dashboard
│   │   │   ├── studies/    # CRUD de cursos e estudos
│   │   │   ├── tasks/      # CRUD de tarefas e filtros temporais
│   │   │   └── upload/     # Upload de arquivos de imagem
│   │   ├── calendar/       # Visão de calendário
│   │   ├── chat/           # Interface do Chat com IA
│   │   ├── dashboard/      # Painel principal
│   │   ├── finance/        # Tela de finanças & contas
│   │   ├── inbox/          # Caixa de entrada GTD
│   │   ├── login/          # Tela de autenticação
│   │   ├── projects/       # Tela de projetos
│   │   ├── reading/        # Biblioteca pessoal de livros
│   │   ├── settings/       # Configurações e chaves de API
│   │   ├── studies/        # Cursos e estudos
│   │   ├── today/          # Tarefas de hoje
│   │   └── upcoming/       # Tarefas dos próximos 7 dias
│   ├── components/         # Componentes React reutilizáveis (Layout, Modais, Cards)
│   ├── lib/                # Módulos de lógica de negócios
│   │   ├── ai/             # Integração Gemini, NLP Fallback, Sanitizer e Tools
│   │   ├── auth.ts         # Autenticação JWT, Cookies e Validações
│   │   ├── db.ts           # Cliente singleton do Prisma
│   │   ├── googleCalendar.ts # Construtor de links do Google Agenda
│   │   ├── notifications.ts  # Notificações sonoras e no navegador
│   │   └── utils.ts        # Formatadores de moeda, data e classes
│   ├── middleware.ts       # Middleware de proteção de rotas privadas
│   └── types/              # Definições de tipos TypeScript
├── .env.example            # Exemplo de variáveis de ambiente
├── next.config.mjs         # Configurações e cabeçalhos de segurança HTTP
├── package.json            # Dependências e scripts do projeto
└── tsconfig.json           # Configuração do TypeScript
```

---

## 🗄️ Modelagem do Banco de Dados (Prisma Schema)

O banco relacional modela os seguintes recursos, todos isolados por `userId`:

- **User:** Contas de usuário com senha criptografada (`bcryptjs`), papéis (`ADMIN`, `USER`) e status ativo.
- **Task:** Tarefas com suporte a subtarefas, projetos, categorias, cursos, datas, horários e vínculo com Google Agenda.
- **Project:** Projetos com cálculo de progresso automático e tarefas vinculadas.
- **Course:** Cursos com rastreamento de módulos e instituição de ensino.
- **Book:** Livros com páginas totais/lidas, ISBN, e capa (URL externa ou arquivo local).
- **FinancialReminder:** Lembretes de contas a pagar, com regras de recorrência e status (`PENDING`, `PAID`, `OVERDUE`).
- **Category:** Categorização transversal com cores e ícones personalizáveis.
- **ChatSession & ChatMessage:** Histórico de conversas com a IA e registro de ações executadas.

---

## 🔒 Segurança & Multi-inquilino (Multi-Tenancy)

1. **Proteção JWT em Cookies HTTP-Only:** Os tokens de sessão são assinados com `AUTH_SECRET` e trafegam em cookies seguros protegidos contra acessos JavaScript maliciosos (XSS).
2. **Isolamento Total (`userId`):** Toda query Prisma em rotas de API injeta obrigatoriamente `where: { userId: user.id }`. Nenhum usuário tem acesso às tarefas ou finanças de outro.
3. **Cabeçalhos de Segurança HTTP:**
   - `X-Content-Type-Options: nosniff` (impede MIME sniffing).
   - `X-Frame-Options: DENY` (protege contra ataques de Clickjacking).
   - `Referrer-Policy: strict-origin-when-cross-origin` (privacidade de navegação).
4. **Validação de Entrada:** Nomes de usuário não aceitam espaços nem caracteres especiais.

---

## ⚙️ Instalação & Configuração Local

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Git](https://git-scm.com/)

### Passo a Passo:

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/LipehSanttos/life-os.git
   cd life-os
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz do projeto com base no `.env.example`:
   ```env
   DATABASE_URL="file:./dev.db"
   AUTH_SECRET="sua-chave-secreta-aleatoria-de-32-caracteres"
   GEMINI_API_KEY="sua-chave-da-api-do-google-gemini"
   ```

4. **Execute as Migrações do Banco de Dados & Seed Inicial:**
   ```bash
   npx prisma migrate dev --name init
   npm run seed
   ```

5. **Inicie o Servidor de Desenvolvimento:**
   ```bash
   npm run dev
   ```

6. **Acesse no Navegador:**
   Abra [http://localhost:3000](http://localhost:3000)
   - **Login Padrão Admin:** `eduardo.felipe` (ou `eduardo.felipe@lifeos.com`)
   - **Senha Inicial:** `123456`

---

## 🌍 Como Hospedar Online Gratuitamente

### Opção A: Acesso Instantâneo via Túnel Seguro (10 segundos)
Se o servidor estiver rodando no seu computador e você quiser acessar no celular:
```bash
npx localtunnel --port 3000
```
*(Gera um endereço `https://...` seguro com certificado SSL gratuito).*

### Opção B: Deploy Completo na Nuvem (24h no Ar)
1. **Frontend + API:** Crie uma conta no [Vercel](https://vercel.com) e importe o repositório do GitHub.
2. **Banco na Nuvem:** Conecte um banco SQLite compatível na nuvem gratuito como o [Turso](https://turso.tech) ou PostgreSQL via [Neon.tech / Supabase](https://neon.tech).
3. **Variáveis de Ambiente:** Adicione `DATABASE_URL`, `AUTH_SECRET` e `GEMINI_API_KEY` nas configurações da Vercel.
4. **Deploy:** Seu Life OS estará disponível em `https://seu-projeto.vercel.app`.

---

## 📄 Licença

Este projeto é desenvolvido para uso pessoal e profissional sob a licença MIT. Sinta-se livre para customizar e aprimorar.

<div align="center">
Feito com dedicação para maximizar foco, clareza e produtividade. 🚀
</div>

