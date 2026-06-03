# Oficina Mecânica - Sistema de Gestão

Plataforma completa de gestão para oficinas mecânicas, construída com Next.js 16, Prisma 7, e Auth.js.

## Stack Tecnológico

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Base de Dados**: PostgreSQL (Neon ou Supabase recomendados)
- **ORM**: Prisma 7 com adapter `pg`
- **Autenticação**: Auth.js (NextAuth) v5
- **UI**: Tailwind CSS 4, Radix UI, Lucide Icons
- **Formulários**: React Hook Form + Zod v4
- **PDF**: jsPDF + jspdf-autotable
- **Upload OCR**: Endpoint mock pronto para integração com OpenAI Vision / Google Vision / Azure OCR

## Funcionalidades

- Dashboard com KPIs
- Gestão de Clientes
- Gestão de Veículos com histórico completo
- Gestão de Stock com alertas de stock baixo/esgotado
- Orçamentos com materiais, mão de obra e exportação PDF
- Histórico de Manutenções
- **OCR de Faturas**: Upload de faturas → extração automática de artigos → atribuição multi-destino
- Configurações da oficina

## Pré-requisitos

- Node.js 20.9+
- PostgreSQL (Neon, Supabase, ou local)

## Instalação

### 1. Clonar e instalar dependências

```bash
git clone <repo-url>
cd oficina-mecanica
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` com as suas credenciais:

```env
# Neon PostgreSQL (recomendado para Vercel)
DATABASE_URL="postgresql://user:password@host.neon.tech/oficina_mecanica?sslmode=require"

# Auth.js - gerar com: openssl rand -base64 32
AUTH_SECRET="your-secret-here"
AUTH_URL="http://localhost:3000"
```

### 3. Gerar o cliente Prisma e criar a base de dados

```bash
# Gerar o cliente Prisma
npm run db:generate

# Criar as tabelas (desenvolvimento)
npm run db:push

# Ou usar migrations (produção)
npm run db:migrate
```

### 4. Popular com dados de teste (opcional)

```bash
npm run db:seed
```

Cria:
- Utilizador admin: `admin@oficina.pt` / `admin123`
- 2 clientes, 2 veículos, 3 itens de stock, 1 orçamento, 1 manutenção

### 5. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Aceda a `http://localhost:3000`

## Deploy na Vercel

### 1. Base de dados recomendada: Neon

1. Crie conta em [neon.tech](https://neon.tech)
2. Crie uma base de dados
3. Copie a connection string para `DATABASE_URL`

### 2. Configurar variáveis de ambiente na Vercel

No dashboard da Vercel, em **Settings → Environment Variables**:

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | URL PostgreSQL (Neon/Supabase) |
| `AUTH_SECRET` | Segredo aleatório (32+ chars) |
| `AUTH_URL` | URL do site em produção |

### 3. Comando de build

No painel da Vercel, defina o **Build Command** como:
```
npx prisma generate && next build
```

## Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run db:generate  # Gerar cliente Prisma
npm run db:push      # Aplicar schema (desenvolvimento)
npm run db:migrate   # Criar migration (produção)
npm run db:studio    # Abrir Prisma Studio
```

## Estrutura do Projeto

```
oficina-mecanica/
├── app/
│   ├── (auth)/           # Login e registo
│   ├── (dashboard)/      # Módulos principais
│   │   ├── dashboard/
│   │   ├── clientes/
│   │   ├── veiculos/
│   │   ├── stock/
│   │   ├── orcamentos/
│   │   ├── manutencoes/
│   │   ├── pecas-por-atribuir/
│   │   └── configuracoes/
│   ├── actions/          # Server Actions
│   └── api/
│       ├── auth/         # NextAuth
│       ├── ocr/invoice/  # OCR endpoint
│       └── pdf/quote/    # PDF generation
├── components/
│   ├── ui/               # Componentes base
│   ├── layout/           # Sidebar, BottomNav, Header
│   └── [feature]/        # Componentes por módulo
├── lib/
│   ├── db.ts             # Prisma client (Prisma 7 + pg adapter)
│   ├── utils.ts
│   └── validations.ts    # Schemas Zod
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── proxy.ts              # Route protection (Next.js 16)
```

## Integração OCR Real

Substitua `mockOcrExtract` em `/app/api/ocr/invoice/route.ts`:

### OpenAI Vision (GPT-4o)

```typescript
const base64 = Buffer.from(await file.arrayBuffer()).toString("base64")
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: [
    { type: "image_url", image_url: { url: `data:${file.type};base64,${base64}` } },
    { type: "text", text: "Extract invoice line items as JSON: [{description, reference, quantity, unitPrice, taxRate, total}]" }
  ]}]
})
return JSON.parse(response.choices[0].message.content!)
```

## Notas Técnicas

- **Prisma 7**: Usa `@prisma/adapter-pg` (sem `url` no schema.prisma)
- **Next.js 16**: `proxy.ts` em vez de `middleware.ts`; `params` são Promises nas páginas
- **Tailwind 4**: Config via `globals.css` com `@theme`, sem `tailwind.config.ts`
- **OCR**: Peças de uma fatura podem ser atribuídas individualmente a diferentes orçamentos/serviços

## Perfis de Utilizador

| Perfil | Acesso |
|--------|--------|
| ADMIN | Total |
| MECHANIC | CRUD em todos os módulos |
| VIEWER | Apenas leitura |
# garagem_amorim
