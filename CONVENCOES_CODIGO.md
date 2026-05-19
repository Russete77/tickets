# CONVENÇÕES DE CÓDIGO — Ticketeria/PulsePass

**Fonte:** Extraído do código mergeado em `master` @ `2aca046`, com foco nos módulos consolidados (`auth`, `events`, `tickets`, `payments`, `gateways`, `organizations`) e nos recém-mergeados (`cashless/products`, `cashless/operators`, `cashless/pos`, `cashless/stock`, `cashless/categories`).

**Propósito:** Garantir que qualquer código novo siga o padrão já estabelecido. Use este documento como referência ao adicionar módulos, services, validators, migrations ou telas.

---

## 1. Estrutura de módulo (backend)

```
src/modules/{dominio}/{submodulo}/
├── {submodulo}.router.ts        # Express Router — define rotas, monta middlewares
├── {submodulo}.service.ts        # Classe estática com regra de negócio
├── {submodulo}.validators.ts     # Schemas Zod (named exports)
├── __tests__/
│   └── {submodulo}.service.test.ts  # Vitest + mock prisma in-memory
└── (sem controller separado — router chama service direto)
```

Submódulos compartilhados ficam em `{dominio}/shared/` (ex.: `cashless/shared/orgScope.ts`, `cashless/shared/catalogEvents.ts`, `cashless/shared/audit.ts` — quando há especificidades do domínio).

**Naming de arquivo:** sempre kebab/snake minúsculo (`products.service.ts`, nunca `ProductsService.ts`).

**Wiring:** o router agregador (`cashless.router.ts`) importa sub-routers e monta em paths nested. O `app.ts` monta o agregador em `/api/v1/{dominio}`.

---

## 2. Validators (Zod)

- Named exports — sem default, sem barrel
- Schema nomenclado por ação: `create{Entity}Schema`, `update{Entity}Schema`, `{entity}ParamsSchema`, `{entity}QuerySchema`
- Update via `.partial()` sobre o create — só cria schema separado se a lógica divergir
- Validação acontece no middleware `validate()`, que converte `z.ZodError` em `BadRequestError`. Service nunca pega `z.ZodError`.

```typescript
export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(255),
  priceCents: z.number().int().min(0),
  categoryId: z.string().uuid().nullable(),
});
export const updateProductSchema = createProductSchema.partial();
export const orgProductParamsSchema = z.object({
  organizationId: z.string().uuid(),
  productId: z.string().uuid(),
});
```

---

## 3. Services

- **Sempre classe com métodos estáticos.** Sem instanciação, sem DI container
- Prisma importado uma vez (`import { prisma } from '../../../config/database'`)
- Erros: lançar subclasses de `AppError` (`BadRequestError`, `NotFoundError`, `ConflictError`). HTTP fica fora do service
- Transação `prisma.$transaction()` só pra múltiplos updates ACID. Operação single não embrulha
- Logger: `import { logger } from '../../../shared/logger'`. Child logger sob demanda

```typescript
export class ProductsService {
  static async create({ organizationId, posId, actorId, data }: CreateInput) {
    await assertPosBelongsToOrg(posId, organizationId);
    const product = await prisma.pOSProduct.create({ data: { posId, ...data } });
    await emitCatalogUpdated(posId);
    await logAudit({ actorId, action: AuditActions.CASHLESS_PRODUCT_CREATED, ... });
    return product;
  }
}
```

---

## 4. Testes (Vitest)

- In-memory Prisma mock via `vi.mock()` com `Map<string, any>` simulando tabela
- `beforeEach`: clear das maps + `vi.clearAllMocks()`
- Cobertura obrigatória: happy path, error path (incluindo IDOR/org scope), edge case
- Mensagens em português; assertions via `expect().toBe()`, `expect().rejects.toThrow(/regex/)`

```typescript
const products = new Map<string, any>();
vi.mock('../../../../config/database', () => ({ prisma: { pOSProduct: { ... } } }));

describe('ProductsService', () => {
  beforeEach(() => { products.clear(); vi.clearAllMocks(); });
  it('cria produto, emite catalog:updated', async () => { ... });
  it('rejeita quando POS é de outra org', async () => { ... });
});
```

---

## 5. Schema Prisma

- IDs: `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid`
- camelCase no Prisma + `@map("snake_case")` no DB
- Timestamps sempre: `createdAt @db.Timestamptz`, `updatedAt @db.Timestamptz` (com `@updatedAt`)
- Soft delete: `isArchived Boolean @default(false)` + `archivedAt DateTime?` (não deleta de fato)
- Multi-tenant: `organizationId` em toda tabela cross-org, sempre validado via `orgScope` antes de query
- FK termina em `Id` (`posId`, `organizationId`, `eventId`). Relation field plural se for 1:N
- Enums em PascalCase; `@@map()` se nome do enum Prisma divergir do DB

```prisma
model POSProduct {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  posId          String   @map("pos_id") @db.Uuid
  organizationId String   @map("organization_id") @db.Uuid
  name           String
  priceCents     Int      @map("price_cents")
  isArchived     Boolean  @default(false) @map("is_archived")
  archivedAt     DateTime? @map("archived_at") @db.Timestamptz
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz
  
  pos PointOfSale @relation(fields: [posId], references: [id], onDelete: Cascade)
  @@index([organizationId])
}
```

---

## 6. Migrations

- Nome: `{timestamp}_{snake_case_descricao}` (Prisma auto-gera timestamp via `prisma migrate dev --name`)
- SQL em UPPERCASE pra keywords, NOT NULL explícito, defaults presentes
- Migração ofensiva (drop, alter NOT NULL em tabela com dados) **sempre** vem acompanhada de backfill script em `prisma/scripts/`
- Defensiva: usar `IF NOT EXISTS` / `IF EXISTS` em backfills
- Última migration mergeada: `20260508212947_cashless_admin_setup` — referência de qualidade

---

## 7. Anti-IDOR (`cashless/shared/orgScope.ts`)

- Funções `assert{Entity}BelongsToOrg(entityId, organizationId)` — lançam `NotFoundError` (nunca vazam existência via 403)
- Sempre chamadas no início do método de service, antes de qualquer query/mutação
- Retornam a entidade carregada pra usar em chaining (evita 2 SELECTs)

```typescript
static async update({ organizationId, productId, actorId, data }) {
  const existing = await assertProductBelongsToOrg(productId, organizationId);
  // existing já validado e disponível
}
```

---

## 8. Audit log (`shared/audit.ts`)

- `logAudit({ actorId, action, entityType, entityId, metadata, ipAddress?, userAgent? })`
- Fire-and-forget; erro de audit não pode crashar o app
- `action` é enum em `AuditActions` — formato `DOMINIO_ENTIDADE_ACAO` (ex.: `CASHLESS_PRODUCT_CREATED`, `LGPD_DATA_EXPORTED`)
- Sempre depois da mutação bem-sucedida

---

## 9. Socket.IO (`cashless/shared/catalogEvents.ts`)

- Wrapper por evento de domínio: `emitCatalogUpdated(posId)`, `emitStockLow(orgId, payload)`, `emitStockOut(...)`
- Mecanismo: `publishBroadcast()` → Redis pub/sub → Socket.IO rooms
- Naming de room: `pos:{posId}`, `org:{organizationId}`, `event:{eventId}`
- Payload tipado em interface dedicada

---

## 10. Storage R2 (`shared/storage/r2.ts` + `imageProcessor.ts`)

- Client S3-compatible, endpoint `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
- Key naming: `{tipo-entidade}/{entityId}/{hash16}.{ext}` (content-addressed → cacheável imutável 1 ano)
- Imagens: sharp 800×800 cover, JPEG quality 85 mozjpeg, strip EXIF, respeita orientação
- Erros de input → `BadRequestError` (não vazar internal do sharp)

---

## 11. Frontend Web

- Stack: React + TS + Vite + React Router + TanStack React Query + Zustand stores + CSS Modules
- Forms: `useState` local, validação server-side via Zod (sem RHF nas páginas admin atuais)
- API client por feature: `api.ts` exportando `cashlessApi<T>()` que envelopa `fetch` + `Bearer` + parse `data` do envelope
- React Query keys: array `['{domain}-{entity}', ...scopeIds]` (ex.: `['cashless-pos', orgId, eventId]`)
- Toast feedback via `useToastStore().addToast({ type, message })` — em mutations `onSuccess`/`onError`
- i18n: `useTranslation()` + `t('key')` — adoção atual mista (~40% no web). **Padrão novo: usar t() sempre**

---

## 12. Frontend Mobile

- Stack: RN 0.81 + Expo SDK 54 + Expo Router (file-based) + React Query + AsyncStorage
- API helper centralizado com injeção de Bearer
- Tema centralizado em `src/styles/theme.ts` — sem inline color hex
- Offline: SQLite via `expo-sqlite` (cache de tickets + sync queue de checkins)
- i18n: `useTranslation()` hook idem web

---

## 13. Domínio — quando usar cada termo

| Termo | Quando | Modelo |
|---|---|---|
| **User** | Identidade core (email/senha, roles) | `User` |
| **Operator** | Funcionário de PDV (PIN auth) | `POSOperator` |
| **Promoter** | Afiliado com tier/comissão | `Promoter` + `PromoterTier` |
| **Staff** | Equipe de evento (segurança, hostess, cashier) | `EventStaff` + `StaffRole` |
| **Producer** | **LEGADO** — usar `Organization` em código novo | `Producer` (migration drop em `20260601000000`) |
| **Organization** | Multi-tenant canônico | `Organization` + `OrganizationMember` |
| **Ticket** | Ingresso pago (active/used/transferred/cancelled/refunded) | `Ticket` |
| **GuestEntry** | Convidado de guest list (pending/confirmed/checked_in/no_show/rejected) | `GuestEntry` |

**Em código novo:** preferir `organizationId` a `producerId`. Se modelo já tem `producerId`, ainda mantém pra retro-compat até a migration `20260601000000_event_drop_legacy_producer` rodar em prod (esperando dual-state de 30d).

---

## 14. Checklist antes de mergear

- [ ] Service tem `assert{Entity}BelongsToOrg()` se cruza org
- [ ] `logAudit()` na ação relevante (Created/Updated/Deleted/Archived/Restored)
- [ ] `emit{Event}()` se a mudança afeta UI ao vivo
- [ ] Validator Zod cobre todos os campos com `.trim()`, `.min()`, `.max()`, `.uuid()`
- [ ] Teste vitest cobre happy + IDOR + edge case mínimo
- [ ] Migration tem nome descritivo + comentário no SQL se for complexa
- [ ] Backfill script se a migration mexe em dados existentes
- [ ] Strings de erro em português (i18n backend ainda não implementado)
- [ ] Frontend usa `t()` (não hardcoded) — começar agora padrão novo
- [ ] React Query key inclui todos os scope IDs (org, event)

---

**Este documento é vivo.** Atualizar quando uma nova convenção for estabelecida via PR aprovado. Em caso de conflito entre código antigo e este doc, **o doc tem prioridade** — código antigo é refactor backlog.
