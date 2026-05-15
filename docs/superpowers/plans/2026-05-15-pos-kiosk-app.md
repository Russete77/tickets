# App POS dedicado (kiosk) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um app POS dedicado rodável (build variant `com.pulsepass.pos`) que reusa as telas `CashlessPOSScreen`/`CashlessTopupScreen`, com pareamento device↔POS por QR, device token revogável, boot offline-first, kiosk Android e heartbeat.

**Architecture:** Build variant via `app.config.ts` + EAS profile `pos`. Backend novo módulo `pos-devices` (pareamento/token/heartbeat/revogação) com middleware de auth de device de escopo mínimo. Web admin ganha pareamento QR + revogação. Mobile ganha stack `(pos)` offline-first reusando telas existentes.

**Tech Stack:** Express 5 + Prisma 7 + Vitest (API); React+Vite (web admin); Expo SDK 54 + expo-router + expo-secure-store + expo-camera (mobile). Convenções em `CONVENCOES_CODIGO.md`. Spec: `docs/superpowers/specs/2026-05-15-pos-kiosk-app-design.md`.

---

## File Structure

**API (`ticketeria-api/`):**
- Create `prisma/migrations/{ts}_add_pos_device/migration.sql` — tabela `pos_devices`
- Modify `prisma/schema.prisma` — model `PosDevice` + enum `PosDeviceStatus`
- Create `src/modules/pos-devices/pos-devices.validators.ts`
- Create `src/modules/pos-devices/pos-devices.service.ts`
- Create `src/modules/pos-devices/pos-devices.router.ts`
- Create `src/modules/pos-devices/__tests__/pos-devices.service.test.ts`
- Create `src/middleware/authenticateDevice.ts`
- Create `src/middleware/__tests__/authenticateDevice.test.ts`
- Modify `src/app.ts` — montar router
- Modify `src/shared/audit.ts` — AuditActions de device
- Modify `src/tests/setup.ts` — mock `posDevice`

**Web (`ticketeria-web/`):**
- Modify `src/features/admin/cashless/AdminPosPage.tsx` — pareamento + lista + revogar
- Create `src/features/admin/cashless/PosDevicesPanel.tsx`

**Mobile (`ticketeria-mobile/`):**
- Create `app.config.ts` (substitui `app.json` como fonte dinâmica)
- Modify `eas.json` — profile `pos`
- Create `src/lib/appVariant.ts`
- Create `src/lib/posDevice.ts` — pareamento/secure-store/heartbeat client
- Create `src/contexts/PosSessionProvider.tsx`
- Modify `app/_layout.tsx` — gate por variant
- Create `app/(pos)/_layout.tsx`, `app/(pos)/setup.tsx`, `app/(pos)/pin.tsx`, `app/(pos)/index.tsx`, `app/(pos)/topup.tsx`
- Create `plugins/withAndroidLockTask.js` — config plugin kiosk

---

## Task 1: Migration + modelo PosDevice

**Files:**
- Create: `ticketeria-api/prisma/migrations/20260603000000_add_pos_device/migration.sql`
- Modify: `ticketeria-api/prisma/schema.prisma`

- [ ] **Step 1: Adicionar enum + model ao schema**

Em `prisma/schema.prisma`, após o model `POSOperator` (linha ~1014+), adicionar:

```prisma
enum PosDeviceStatus {
  pending
  active
  revoked
}

model PosDevice {
  id                   String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  posId                String          @map("pos_id") @db.Uuid
  organizationId       String          @map("organization_id") @db.Uuid
  label                String          @db.VarChar(120)
  deviceTokenHash      String?         @map("device_token_hash") @db.VarChar(128)
  tokenPrefix          String?         @map("token_prefix") @db.VarChar(12)
  pairingCode          String?         @unique @map("pairing_code") @db.VarChar(8)
  pairingCodeExpiresAt DateTime?       @map("pairing_code_expires_at") @db.Timestamptz
  status               PosDeviceStatus @default(pending)
  pairedAt             DateTime?       @map("paired_at") @db.Timestamptz
  lastSeenAt           DateTime?       @map("last_seen_at") @db.Timestamptz
  appVersion           String?         @map("app_version") @db.VarChar(20)
  lastIp               String?         @map("last_ip") @db.VarChar(45)
  createdBy            String          @map("created_by") @db.Uuid
  revokedBy            String?         @map("revoked_by") @db.Uuid
  revokedAt            DateTime?       @map("revoked_at") @db.Timestamptz
  createdAt            DateTime        @default(now()) @map("created_at") @db.Timestamptz
  updatedAt            DateTime        @updatedAt @map("updated_at") @db.Timestamptz

  pos PointOfSale @relation(fields: [posId], references: [id], onDelete: Cascade)

  @@index([posId])
  @@index([organizationId])
  @@index([deviceTokenHash])
  @@map("pos_devices")
}
```

Adicionar relação inversa em `model PointOfSale` (achar o bloco, adicionar entre as relações existentes):

```prisma
  devices PosDevice[]
```

- [ ] **Step 2: Criar a migration SQL**

Criar `prisma/migrations/20260603000000_add_pos_device/migration.sql`:

```sql
CREATE TYPE "PosDeviceStatus" AS ENUM ('pending', 'active', 'revoked');

CREATE TABLE "pos_devices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pos_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "label" VARCHAR(120) NOT NULL,
  "device_token_hash" VARCHAR(128),
  "token_prefix" VARCHAR(12),
  "pairing_code" VARCHAR(8),
  "pairing_code_expires_at" TIMESTAMPTZ,
  "status" "PosDeviceStatus" NOT NULL DEFAULT 'pending',
  "paired_at" TIMESTAMPTZ,
  "last_seen_at" TIMESTAMPTZ,
  "app_version" VARCHAR(20),
  "last_ip" VARCHAR(45),
  "created_by" UUID NOT NULL,
  "revoked_by" UUID,
  "revoked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "pos_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pos_devices_pairing_code_key" ON "pos_devices"("pairing_code");
CREATE INDEX "pos_devices_pos_id_idx" ON "pos_devices"("pos_id");
CREATE INDEX "pos_devices_organization_id_idx" ON "pos_devices"("organization_id");
CREATE INDEX "pos_devices_device_token_hash_idx" ON "pos_devices"("device_token_hash");

ALTER TABLE "pos_devices" ADD CONSTRAINT "pos_devices_pos_id_fkey"
  FOREIGN KEY ("pos_id") REFERENCES "points_of_sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

> Nota: confirmar o `@@map` real de `PointOfSale` no schema (provavelmente `points_of_sale`); ajustar a FK se divergir.

- [ ] **Step 3: Regenerar client**

Run: `cd ticketeria-api && DATABASE_URL="postgresql://d:d@localhost:5432/d" npx prisma generate`
Expected: "Generated Prisma Client" sem erro.

- [ ] **Step 4: Commit**

```bash
git add ticketeria-api/prisma/schema.prisma ticketeria-api/prisma/migrations/20260603000000_add_pos_device
git commit -m "feat(api): PosDevice model + migration (pairing/token/revoke)"
```

---

## Task 2: Helpers de token + AuditActions + mock de teste

**Files:**
- Modify: `ticketeria-api/src/shared/audit.ts`
- Modify: `ticketeria-api/src/tests/setup.ts`

- [ ] **Step 1: Adicionar AuditActions de device**

Em `src/shared/audit.ts`, dentro do objeto `AuditActions`, após as ações LGPD:

```typescript
  // POS devices (app kiosk)
  POS_DEVICE_PAIR_CODE_ISSUED: 'pos_device.pair_code_issued',
  POS_DEVICE_PAIRED: 'pos_device.paired',
  POS_DEVICE_REVOKED: 'pos_device.revoked',
```

- [ ] **Step 2: Espelhar no mock de teste**

Em `src/tests/setup.ts`, no objeto `AuditActions` do `vi.mock('../shared/audit', ...)`, adicionar as mesmas 3 chaves com os mesmos valores string:

```typescript
    POS_DEVICE_PAIR_CODE_ISSUED: 'pos_device.pair_code_issued',
    POS_DEVICE_PAIRED: 'pos_device.paired',
    POS_DEVICE_REVOKED: 'pos_device.revoked',
```

- [ ] **Step 3: Adicionar mock prisma.posDevice**

Em `src/tests/setup.ts`, no objeto `mockPrisma`, após o bloco `organizationMember`:

```typescript
  posDevice: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
```

- [ ] **Step 4: Commit**

```bash
git add ticketeria-api/src/shared/audit.ts ticketeria-api/src/tests/setup.ts
git commit -m "feat(api): AuditActions + test mock for pos-devices"
```

---

## Task 3: Validators

**Files:**
- Create: `ticketeria-api/src/modules/pos-devices/pos-devices.validators.ts`

- [ ] **Step 1: Criar validators (named exports, padrão CONVENCOES §2)**

```typescript
import { z } from 'zod';

export const issuePairCodeSchema = z.object({
  label: z.string().trim().min(1).max(120),
});

export const posIdParamSchema = z.object({
  posId: z.string().uuid(),
});

export const deviceParamsSchema = z.object({
  posId: z.string().uuid(),
  deviceId: z.string().uuid(),
});

export const redeemSchema = z.object({
  pairingCode: z.string().trim().regex(/^[A-Z0-9]{8}$/),
});

export const heartbeatSchema = z.object({
  appVersion: z.string().trim().max(20).optional(),
  online: z.boolean().optional(),
  pendingQueue: z.number().int().min(0).optional(),
  battery: z.number().int().min(0).max(100).optional(),
});

export const operatorLoginSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/),
});

export type IssuePairCodeInput = z.infer<typeof issuePairCodeSchema>;
export type RedeemInput = z.infer<typeof redeemSchema>;
export type HeartbeatInput = z.infer<typeof heartbeatSchema>;
export type OperatorLoginInput = z.infer<typeof operatorLoginSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add ticketeria-api/src/modules/pos-devices/pos-devices.validators.ts
git commit -m "feat(api): pos-devices Zod validators"
```

---

## Task 4: PosDeviceService (TDD)

**Files:**
- Create: `ticketeria-api/src/modules/pos-devices/pos-devices.service.ts`
- Test: `ticketeria-api/src/modules/pos-devices/__tests__/pos-devices.service.test.ts`

- [ ] **Step 1: Escrever os testes (falhando)**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PosDeviceService } from '../pos-devices.service';
import { prisma } from '../../../config/database';
import { logAudit } from '../../../shared/audit';
import { NotFoundError, UnauthorizedError, BadRequestError } from '../../../shared/errors';

describe('PosDeviceService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('issuePairCode', () => {
    it('gera código de 8 chars com TTL e audita', async () => {
      vi.mocked(prisma.posDevice.create).mockResolvedValueOnce({ id: 'd1', pairingCode: 'ABCD1234' } as any);
      const r = await PosDeviceService.issuePairCode({
        posId: 'pos1', organizationId: 'org1', label: 'Bar 1', actorId: 'u1',
      });
      expect(r.pairingCode).toMatch(/^[A-Z0-9]{8}$/);
      expect(r.expiresAt).toBeInstanceOf(Date);
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'pos_device.pair_code_issued', actorId: 'u1' }),
      );
    });
  });

  describe('redeem', () => {
    it('troca código válido por deviceToken (cru retornado uma vez, só hash salvo)', async () => {
      const future = new Date(Date.now() + 60000);
      vi.mocked(prisma.posDevice.findUnique).mockResolvedValueOnce({
        id: 'd1', posId: 'pos1', organizationId: 'org1', status: 'pending',
        pairingCodeExpiresAt: future,
      } as any);
      vi.mocked(prisma.posDevice.update).mockResolvedValueOnce({ id: 'd1', posId: 'pos1' } as any);

      const r = await PosDeviceService.redeem('ABCD1234');

      expect(r.deviceToken).toMatch(/^pd_[A-Za-z0-9_-]+$/);
      expect(r.posId).toBe('pos1');
      const updateArg = vi.mocked(prisma.posDevice.update).mock.calls[0][0] as any;
      expect(updateArg.data.deviceTokenHash).toBeTruthy();
      expect(updateArg.data.deviceTokenHash).not.toBe(r.deviceToken);
      expect(updateArg.data.status).toBe('active');
      expect(updateArg.data.pairingCode).toBeNull();
    });

    it('rejeita código inexistente', async () => {
      vi.mocked(prisma.posDevice.findUnique).mockResolvedValueOnce(null);
      await expect(PosDeviceService.redeem('NOPE0000')).rejects.toThrow(NotFoundError);
    });

    it('rejeita código expirado', async () => {
      vi.mocked(prisma.posDevice.findUnique).mockResolvedValueOnce({
        id: 'd1', status: 'pending', pairingCodeExpiresAt: new Date(Date.now() - 1000),
      } as any);
      await expect(PosDeviceService.redeem('ABCD1234')).rejects.toThrow(BadRequestError);
    });

    it('rejeita device já revogado', async () => {
      vi.mocked(prisma.posDevice.findUnique).mockResolvedValueOnce({
        id: 'd1', status: 'revoked', pairingCodeExpiresAt: new Date(Date.now() + 60000),
      } as any);
      await expect(PosDeviceService.redeem('ABCD1234')).rejects.toThrow(BadRequestError);
    });
  });

  describe('authenticateByToken', () => {
    it('resolve device ativo pelo hash do token', async () => {
      vi.mocked(prisma.posDevice.findFirst).mockResolvedValueOnce({
        id: 'd1', posId: 'pos1', organizationId: 'org1', status: 'active',
      } as any);
      const d = await PosDeviceService.authenticateByToken('pd_abc');
      expect(d.posId).toBe('pos1');
    });

    it('rejeita token de device revogado', async () => {
      vi.mocked(prisma.posDevice.findFirst).mockResolvedValueOnce(null);
      await expect(PosDeviceService.authenticateByToken('pd_x')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('revoke', () => {
    it('marca revoked + audita', async () => {
      vi.mocked(prisma.posDevice.findFirst).mockResolvedValueOnce({ id: 'd1', posId: 'pos1' } as any);
      vi.mocked(prisma.posDevice.update).mockResolvedValueOnce({ id: 'd1' } as any);
      await PosDeviceService.revoke({ posId: 'pos1', organizationId: 'org1', deviceId: 'd1', actorId: 'u1' });
      const arg = vi.mocked(prisma.posDevice.update).mock.calls[0][0] as any;
      expect(arg.data.status).toBe('revoked');
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'pos_device.revoked' }),
      );
    });
  });

  describe('heartbeat', () => {
    it('atualiza lastSeenAt e telemetria', async () => {
      vi.mocked(prisma.posDevice.update).mockResolvedValueOnce({ id: 'd1' } as any);
      await PosDeviceService.heartbeat('d1', { appVersion: '1.0.0', online: true, pendingQueue: 2 });
      const arg = vi.mocked(prisma.posDevice.update).mock.calls[0][0] as any;
      expect(arg.where).toEqual({ id: 'd1' });
      expect(arg.data.lastSeenAt).toBeInstanceOf(Date);
      expect(arg.data.appVersion).toBe('1.0.0');
    });
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `cd ticketeria-api && npx vitest run src/modules/pos-devices`
Expected: FAIL ("Cannot find module '../pos-devices.service'").

- [ ] **Step 3: Implementar o service**

```typescript
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, UnauthorizedError } from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';

const PAIR_CODE_TTL_MS = 10 * 60 * 1000;
const PAIR_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem O/0/I/1

function genPairCode(): string {
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) out += PAIR_ALPHABET[bytes[i] % PAIR_ALPHABET.length];
  return out;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class PosDeviceService {
  static async issuePairCode(input: {
    posId: string; organizationId: string; label: string; actorId: string;
  }): Promise<{ deviceId: string; pairingCode: string; expiresAt: Date }> {
    const pairingCode = genPairCode();
    const expiresAt = new Date(Date.now() + PAIR_CODE_TTL_MS);

    const device = await prisma.posDevice.create({
      data: {
        posId: input.posId,
        organizationId: input.organizationId,
        label: input.label,
        pairingCode,
        pairingCodeExpiresAt: expiresAt,
        status: 'pending',
        createdBy: input.actorId,
      },
    });

    await logAudit({
      actorId: input.actorId,
      action: AuditActions.POS_DEVICE_PAIR_CODE_ISSUED,
      entityType: 'pos_device',
      entityId: device.id,
      metadata: { posId: input.posId },
    });

    return { deviceId: device.id, pairingCode, expiresAt };
  }

  static async redeem(
    pairingCode: string,
    context?: { ipAddress?: string },
  ): Promise<{ deviceToken: string; posId: string }> {
    const device = await prisma.posDevice.findUnique({ where: { pairingCode } });
    if (!device) throw new NotFoundError('Código de pareamento inválido');
    if (device.status === 'revoked') throw new BadRequestError('Dispositivo revogado');
    if (!device.pairingCodeExpiresAt || device.pairingCodeExpiresAt < new Date()) {
      throw new BadRequestError('Código de pareamento expirado');
    }

    const deviceToken = `pd_${crypto.randomBytes(32).toString('base64url')}`;

    await prisma.posDevice.update({
      where: { id: device.id },
      data: {
        deviceTokenHash: hashToken(deviceToken),
        tokenPrefix: deviceToken.slice(0, 12),
        status: 'active',
        pairingCode: null,
        pairingCodeExpiresAt: null,
        pairedAt: new Date(),
        lastIp: context?.ipAddress ?? null,
      },
    });

    await logAudit({
      actorId: device.createdBy,
      action: AuditActions.POS_DEVICE_PAIRED,
      entityType: 'pos_device',
      entityId: device.id,
      metadata: { posId: device.posId },
      ipAddress: context?.ipAddress,
    });

    return { deviceToken, posId: device.posId };
  }

  static async authenticateByToken(
    deviceToken: string,
  ): Promise<{ id: string; posId: string; organizationId: string }> {
    const device = await prisma.posDevice.findFirst({
      where: { deviceTokenHash: hashToken(deviceToken), status: 'active' },
      select: { id: true, posId: true, organizationId: true },
    });
    if (!device) throw new UnauthorizedError('Dispositivo não autorizado');
    return device;
  }

  static async revoke(input: {
    posId: string; organizationId: string; deviceId: string; actorId: string;
  }): Promise<void> {
    const device = await prisma.posDevice.findFirst({
      where: { id: input.deviceId, posId: input.posId, organizationId: input.organizationId },
    });
    if (!device) throw new NotFoundError('Dispositivo não encontrado');

    await prisma.posDevice.update({
      where: { id: input.deviceId },
      data: { status: 'revoked', revokedAt: new Date(), revokedBy: input.actorId },
    });

    await logAudit({
      actorId: input.actorId,
      action: AuditActions.POS_DEVICE_REVOKED,
      entityType: 'pos_device',
      entityId: input.deviceId,
      metadata: { posId: input.posId },
    });
  }

  static async heartbeat(
    deviceId: string,
    data: { appVersion?: string; online?: boolean; pendingQueue?: number; battery?: number },
    ipAddress?: string,
  ): Promise<void> {
    await prisma.posDevice.update({
      where: { id: deviceId },
      data: {
        lastSeenAt: new Date(),
        appVersion: data.appVersion ?? undefined,
        lastIp: ipAddress ?? undefined,
      },
    });
  }

  static async listByPos(posId: string, organizationId: string) {
    return prisma.posDevice.findMany({
      where: { posId, organizationId },
      select: {
        id: true, label: true, status: true, lastSeenAt: true,
        appVersion: true, pairedAt: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `cd ticketeria-api && npx vitest run src/modules/pos-devices`
Expected: PASS (todos os testes verdes).

- [ ] **Step 5: Commit**

```bash
git add ticketeria-api/src/modules/pos-devices/pos-devices.service.ts ticketeria-api/src/modules/pos-devices/__tests__/pos-devices.service.test.ts
git commit -m "feat(api): PosDeviceService with TDD coverage (pair/redeem/auth/revoke/heartbeat)"
```

---

## Task 5: Middleware authenticateDevice (TDD)

**Files:**
- Create: `ticketeria-api/src/middleware/authenticateDevice.ts`
- Test: `ticketeria-api/src/middleware/__tests__/authenticateDevice.test.ts`

- [ ] **Step 1: Escrever o teste (falhando)**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateDevice } from '../authenticateDevice';
import { PosDeviceService } from '../../modules/pos-devices/pos-devices.service';
import { UnauthorizedError } from '../../shared/errors';

vi.mock('../../modules/pos-devices/pos-devices.service');

function mockReqRes(token?: string) {
  const req: any = { headers: token ? { 'x-device-token': token } : {} };
  const res: any = {};
  const next = vi.fn();
  return { req, res, next };
}

describe('authenticateDevice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('injeta req.posDevice quando token válido', async () => {
    vi.mocked(PosDeviceService.authenticateByToken).mockResolvedValueOnce({
      id: 'd1', posId: 'pos1', organizationId: 'org1',
    });
    const { req, res, next } = mockReqRes('pd_abc');
    await authenticateDevice(req, res, next);
    expect(req.posDevice).toEqual({ id: 'd1', posId: 'pos1', organizationId: 'org1' });
    expect(next).toHaveBeenCalledWith();
  });

  it('rejeita sem header', async () => {
    const { req, res, next } = mockReqRes();
    await authenticateDevice(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('rejeita token inválido/revogado', async () => {
    vi.mocked(PosDeviceService.authenticateByToken).mockRejectedValueOnce(new UnauthorizedError('x'));
    const { req, res, next } = mockReqRes('pd_bad');
    await authenticateDevice(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `cd ticketeria-api && npx vitest run src/middleware/__tests__/authenticateDevice.test.ts`
Expected: FAIL ("Cannot find module '../authenticateDevice'").

- [ ] **Step 3: Implementar o middleware**

```typescript
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../shared/errors';
import { PosDeviceService } from '../modules/pos-devices/pos-devices.service';

declare global {
  namespace Express {
    interface Request {
      posDevice?: { id: string; posId: string; organizationId: string };
    }
  }
}

export async function authenticateDevice(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.headers['x-device-token'];
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedError('Token de dispositivo não fornecido');
    }
    req.posDevice = await PosDeviceService.authenticateByToken(token);
    next();
  } catch (err) {
    next(err instanceof Error ? err : new UnauthorizedError('Dispositivo não autorizado'));
  }
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `cd ticketeria-api && npx vitest run src/middleware/__tests__/authenticateDevice.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ticketeria-api/src/middleware/authenticateDevice.ts ticketeria-api/src/middleware/__tests__/authenticateDevice.test.ts
git commit -m "feat(api): authenticateDevice middleware (min-scope device auth)"
```

---

## Task 6: Router pos-devices + wiring + operator-login por device

**Files:**
- Create: `ticketeria-api/src/modules/pos-devices/pos-devices.router.ts`
- Modify: `ticketeria-api/src/app.ts`

- [ ] **Step 1: Criar o router**

```typescript
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../../middleware/auth';
import { authenticateDevice } from '../../middleware/authenticateDevice';
import { validate } from '../../middleware/validate';
import { prisma } from '../../config/database';
import { UnauthorizedError } from '../../shared/errors';
import { PosDeviceService } from './pos-devices.service';
import {
  issuePairCodeSchema, posIdParamSchema, deviceParamsSchema,
  redeemSchema, heartbeatSchema, operatorLoginSchema,
} from './pos-devices.validators';

const router = Router();

// --- Admin (autenticação de usuário) ---
router.post(
  '/pos/:posId/devices/pair-code',
  authenticate,
  validate({ params: posIdParamSchema, body: issuePairCodeSchema }),
  async (req: Request, res: Response) => {
    // orgScope: deriva organizationId do POS
    const pos = await prisma.pointOfSale.findUnique({
      where: { id: req.params.posId as string },
      select: { organizationId: true },
    });
    if (!pos) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }); return; }
    const r = await PosDeviceService.issuePairCode({
      posId: req.params.posId as string,
      organizationId: pos.organizationId,
      label: req.body.label,
      actorId: req.user!.userId,
    });
    res.status(201).json({ success: true, data: r });
  },
);

router.get(
  '/pos/:posId/devices',
  authenticate,
  validate({ params: posIdParamSchema }),
  async (req: Request, res: Response) => {
    const pos = await prisma.pointOfSale.findUnique({
      where: { id: req.params.posId as string },
      select: { organizationId: true },
    });
    if (!pos) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }); return; }
    const devices = await PosDeviceService.listByPos(req.params.posId as string, pos.organizationId);
    res.json({ success: true, data: devices });
  },
);

router.delete(
  '/pos/:posId/devices/:deviceId',
  authenticate,
  validate({ params: deviceParamsSchema }),
  async (req: Request, res: Response) => {
    const pos = await prisma.pointOfSale.findUnique({
      where: { id: req.params.posId as string },
      select: { organizationId: true },
    });
    if (!pos) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }); return; }
    await PosDeviceService.revoke({
      posId: req.params.posId as string,
      organizationId: pos.organizationId,
      deviceId: req.params.deviceId as string,
      actorId: req.user!.userId,
    });
    res.status(204).end();
  },
);

// --- Device (sem auth de usuário) ---
router.post(
  '/redeem',
  validate({ body: redeemSchema }),
  async (req: Request, res: Response) => {
    const r = await PosDeviceService.redeem(req.body.pairingCode, { ipAddress: req.ip });
    res.json({ success: true, data: r });
  },
);

router.get('/me', authenticateDevice, async (req: Request, res: Response) => {
  const pos = await prisma.pointOfSale.findUnique({
    where: { id: req.posDevice!.posId },
    select: { id: true, name: true, organizationId: true, eventId: true },
  });
  res.json({ success: true, data: { device: req.posDevice, pos } });
});

router.post(
  '/heartbeat',
  authenticateDevice,
  validate({ body: heartbeatSchema }),
  async (req: Request, res: Response) => {
    await PosDeviceService.heartbeat(req.posDevice!.id, req.body, req.ip);
    res.json({ success: true });
  },
);

// Operator login dentro do device (PIN -> sessão de turno)
router.post(
  '/operator-login',
  authenticateDevice,
  validate({ body: operatorLoginSchema }),
  async (req: Request, res: Response) => {
    const operators = await prisma.pOSOperator.findMany({
      where: {
        posId: req.posDevice!.posId,
        isActive: true,
        isArchived: false,
        pinHash: { not: null },
      },
    });
    for (const op of operators) {
      if (op.pinHash && (await bcrypt.compare(req.body.pin, op.pinHash))) {
        res.json({ success: true, data: { operatorId: op.id, name: op.name } });
        return;
      }
    }
    throw new UnauthorizedError('PIN inválido');
  },
);

export default router;
```

> Nota: confirmar nomes de model no client gerado — `prisma.pointOfSale` e `prisma.pOSOperator` (vistos em `cashless.router.ts`). Ajustar se o client expuser nomes diferentes.

- [ ] **Step 2: Montar no app.ts**

Em `src/app.ts`, após `import lgpdRouter ...`:

```typescript
import posDevicesRouter from './modules/pos-devices/pos-devices.router';
```

Após `app.use(`${apiPrefix}/lgpd`, lgpdRouter);`:

```typescript
  app.use(`${apiPrefix}/pos-devices`, posDevicesRouter);
```

- [ ] **Step 3: Typecheck**

Run: `cd ticketeria-api && npx tsc --noEmit 2>&1 | grep -E "pos-devices|authenticateDevice|app.ts"`
Expected: sem saída (sem erros nesses arquivos).

- [ ] **Step 4: Rodar a suíte do módulo + middleware**

Run: `cd ticketeria-api && npx vitest run src/modules/pos-devices src/middleware/__tests__/authenticateDevice.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ticketeria-api/src/modules/pos-devices/pos-devices.router.ts ticketeria-api/src/app.ts
git commit -m "feat(api): pos-devices router + wiring + operator-login via device token"
```

---

## Task 7: Web admin — painel de devices (parear/listar/revogar)

**Files:**
- Create: `ticketeria-web/src/features/admin/cashless/PosDevicesPanel.tsx`
- Modify: `ticketeria-web/src/features/admin/cashless/AdminPosPage.tsx`

- [ ] **Step 1: Confirmar helper de API e padrão de query**

Run: `grep -n "cashlessApi\|useQuery\|useMutation\|useToastStore" ticketeria-web/src/features/admin/cashless/AdminPosPage.tsx | head`
Expected: identificar o cliente `cashlessApi<T>()` e o store de toast (CONVENCOES §11). Use os mesmos.

- [ ] **Step 2: Criar PosDevicesPanel**

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashlessApi } from '../api';
import { useToastStore } from '../../../shared/stores/toastStore';

interface PosDevice {
  id: string; label: string; status: 'pending' | 'active' | 'revoked';
  lastSeenAt: string | null; appVersion: string | null; pairedAt: string | null;
}

export function PosDevicesPanel({ posId }: { posId: string }) {
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [pairing, setPairing] = useState<{ pairingCode: string; expiresAt: string } | null>(null);
  const [label, setLabel] = useState('');

  const { data: devices = [] } = useQuery({
    queryKey: ['pos-devices', posId],
    queryFn: () => cashlessApi<PosDevice[]>(`/pos-devices/pos/${posId}/devices`),
  });

  const pairMut = useMutation({
    mutationFn: () =>
      cashlessApi<{ pairingCode: string; expiresAt: string }>(
        `/pos-devices/pos/${posId}/devices/pair-code`,
        { method: 'POST', body: JSON.stringify({ label }) },
      ),
    onSuccess: (d) => { setPairing(d); qc.invalidateQueries({ queryKey: ['pos-devices', posId] }); },
    onError: () => addToast({ type: 'error', message: 'Falha ao gerar código' }),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) =>
      cashlessApi(`/pos-devices/pos/${posId}/devices/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Dispositivo revogado' });
      qc.invalidateQueries({ queryKey: ['pos-devices', posId] });
    },
  });

  return (
    <section>
      <h3>Dispositivos POS</h3>
      <div>
        <input
          placeholder="Rótulo (ex: Bar Principal — Tablet 3)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <button disabled={!label || pairMut.isPending} onClick={() => pairMut.mutate()}>
          Parear dispositivo
        </button>
      </div>

      {pairing && (
        <div role="dialog">
          <p>Código de pareamento (válido até {new Date(pairing.expiresAt).toLocaleTimeString()}):</p>
          <strong style={{ fontSize: 28, letterSpacing: 4 }}>{pairing.pairingCode}</strong>
          <p>No app POS, escaneie o QR ou digite este código.</p>
          <img
            alt="QR de pareamento"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pairing.pairingCode)}`}
          />
          <button onClick={() => setPairing(null)}>Fechar</button>
        </div>
      )}

      <ul>
        {devices.map((d) => (
          <li key={d.id}>
            <strong>{d.label}</strong> — {d.status}
            {' · '}último contato: {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : '—'}
            {d.status !== 'revoked' && (
              <button onClick={() => revokeMut.mutate(d.id)}>Revogar</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

> Nota: confirmar o caminho real de `cashlessApi` e `useToastStore` (Step 1) e ajustar imports. Se o gerador de QR externo não for permitido pela CSP, trocar por lib `qrcode.react` (adicionar dep) — decidir no momento conforme CSP atual.

- [ ] **Step 3: Embutir no AdminPosPage**

Em `AdminPosPage.tsx`, importar e renderizar `<PosDevicesPanel posId={selectedPosId} />` na visão de detalhe de um POS (onde o POS selecionado já existe no estado da página).

- [ ] **Step 4: Typecheck web**

Run: `cd ticketeria-web && npx tsc --noEmit 2>&1 | grep -E "PosDevicesPanel|AdminPosPage"`
Expected: sem saída.

- [ ] **Step 5: Commit**

```bash
git add ticketeria-web/src/features/admin/cashless/PosDevicesPanel.tsx ticketeria-web/src/features/admin/cashless/AdminPosPage.tsx
git commit -m "feat(web): POS devices panel (pair via QR + list + revoke)"
```

---

## Task 8: Mobile — build variant (app.config.ts + eas profile + appVariant)

**Files:**
- Create: `ticketeria-mobile/app.config.ts`
- Delete: `ticketeria-mobile/app.json` (conteúdo migrado)
- Modify: `ticketeria-mobile/eas.json`
- Create: `ticketeria-mobile/src/lib/appVariant.ts`

- [ ] **Step 1: Ler o app.json atual**

Run: `cat ticketeria-mobile/app.json`
Expected: capturar o objeto `expo` inteiro para migrar fielmente.

- [ ] **Step 2: Criar app.config.ts**

```typescript
import { ExpoConfig } from 'expo/config';

const IS_POS = process.env.APP_VARIANT === 'pos';

const config: ExpoConfig = {
  name: IS_POS ? 'PulsePass POS' : 'Ticketeria Digital',
  slug: 'ticketeria-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './src/assets/icon.png',
  scheme: IS_POS ? 'pulsepasspos' : 'ticketeria',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './src/assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0A0A0F',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTabletMode: true,
    bundleIdentifier: IS_POS ? 'com.pulsepass.pos' : 'com.ticketeria.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './src/assets/adaptive-icon.png',
      backgroundColor: '#0A0A0F',
    },
    package: IS_POS ? 'com.pulsepass.pos' : 'com.ticketeria.app',
  },
  web: { bundler: 'metro', output: 'static', favicon: './src/assets/favicon.png' },
  plugins: [
    ['expo-camera', { cameraPermission: 'Permitir acesso à câmera para leitura de QR.' }],
    ['expo-notifications', {
      icon: './src/assets/notification-icon.png',
      color: '#ffffff',
      sounds: ['./src/assets/notification-sound.wav'],
    }],
    ...(IS_POS ? ['./plugins/withAndroidLockTask.js'] : []),
  ],
  extra: { appVariant: IS_POS ? 'pos' : 'consumer' },
};

export default config;
```

> Replicar fielmente quaisquer chaves adicionais vistas no Step 1 (ex: `plugins` extra, `extra`, `owner`, `runtimeVersion`). Não perder configuração existente.

- [ ] **Step 3: Remover app.json**

Run: `rm ticketeria-mobile/app.json`
(Expo prioriza `app.config.ts`; manter ambos gera ambiguidade.)

- [ ] **Step 4: Adicionar profile `pos` no eas.json**

Em `eas.json`, dentro de `build`, adicionar:

```json
    "pos": {
      "extends": "preview",
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": { "APP_VARIANT": "pos" }
    }
```

- [ ] **Step 5: Criar src/lib/appVariant.ts**

```typescript
import Constants from 'expo-constants';

export const IS_POS =
  (Constants.expoConfig?.extra?.appVariant ?? 'consumer') === 'pos';
```

- [ ] **Step 6: Sanity typecheck**

Run: `cd ticketeria-mobile && npx tsc --noEmit 2>&1 | grep -E "app.config|appVariant"`
Expected: sem saída.

- [ ] **Step 7: Commit**

```bash
git add ticketeria-mobile/app.config.ts ticketeria-mobile/eas.json ticketeria-mobile/src/lib/appVariant.ts
git rm ticketeria-mobile/app.json
git commit -m "feat(mobile): build variant via app.config.ts + EAS profile pos"
```

---

## Task 9: Mobile — client de device + PosSessionProvider

**Files:**
- Create: `ticketeria-mobile/src/lib/posDevice.ts`
- Create: `ticketeria-mobile/src/contexts/PosSessionProvider.tsx`

- [ ] **Step 1: Criar posDevice.ts (pareamento + secure-store + heartbeat)**

```typescript
import * as SecureStore from 'expo-secure-store';

const KEY_DEVICE_TOKEN = 'POS_DEVICE_TOKEN';
const KEY_POS_ID = 'POS_DEVICE_POSID';
const API_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3333/api') + '/v1';

export async function getStoredDeviceToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_DEVICE_TOKEN);
}

export async function getStoredPosId(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_POS_ID);
}

export async function clearDevice(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_DEVICE_TOKEN);
  await SecureStore.deleteItemAsync(KEY_POS_ID);
}

export async function redeemPairingCode(
  pairingCode: string,
): Promise<{ deviceToken: string; posId: string }> {
  const res = await fetch(`${API_BASE}/pos-devices/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pairingCode }),
  });
  if (!res.ok) throw new Error(`Pareamento falhou (${res.status})`);
  const { data } = (await res.json()) as { data: { deviceToken: string; posId: string } };
  await SecureStore.setItemAsync(KEY_DEVICE_TOKEN, data.deviceToken);
  await SecureStore.setItemAsync(KEY_POS_ID, data.posId);
  return data;
}

export async function deviceFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getStoredDeviceToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-Device-Token': token } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401) {
    await clearDevice();
    throw new Error('DEVICE_REVOKED');
  }
  if (!res.ok) throw new Error(`${res.status}`);
  const json = (await res.json()) as { data: T };
  return json.data;
}

export async function sendHeartbeat(payload: {
  appVersion?: string; online?: boolean; pendingQueue?: number; battery?: number;
}): Promise<void> {
  try {
    await deviceFetch('/pos-devices/heartbeat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch {
    // best-effort: heartbeat nunca bloqueia operação
  }
}

export async function operatorLogin(
  pin: string,
): Promise<{ operatorId: string; name: string }> {
  return deviceFetch('/pos-devices/operator-login', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
}
```

- [ ] **Step 2: Criar PosSessionProvider**

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getStoredDeviceToken, getStoredPosId } from '../lib/posDevice';

interface PosSession {
  ready: boolean;
  paired: boolean;
  posId: string | null;
  operator: { operatorId: string; name: string } | null;
  setOperator: (op: { operatorId: string; name: string } | null) => void;
  refreshPaired: () => Promise<void>;
}

const Ctx = createContext<PosSession | null>(null);

export function PosSessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [posId, setPosId] = useState<string | null>(null);
  const [operator, setOperator] = useState<PosSession['operator']>(null);

  const refreshPaired = async () => {
    const [token, pid] = await Promise.all([getStoredDeviceToken(), getStoredPosId()]);
    setPosId(token ? pid : null);
  };

  useEffect(() => {
    refreshPaired().finally(() => setReady(true));
  }, []);

  return (
    <Ctx.Provider
      value={{ ready, paired: !!posId, posId, operator, setOperator, refreshPaired }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePosSession(): PosSession {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePosSession fora do PosSessionProvider');
  return v;
}
```

- [ ] **Step 3: Typecheck**

Run: `cd ticketeria-mobile && npx tsc --noEmit 2>&1 | grep -E "posDevice|PosSessionProvider"`
Expected: sem saída.

- [ ] **Step 4: Commit**

```bash
git add ticketeria-mobile/src/lib/posDevice.ts ticketeria-mobile/src/contexts/PosSessionProvider.tsx
git commit -m "feat(mobile): posDevice client + PosSessionProvider (offline-first)"
```

---

## Task 10: Mobile — gate no _layout + stack (pos)

**Files:**
- Modify: `ticketeria-mobile/app/_layout.tsx`
- Create: `ticketeria-mobile/app/(pos)/_layout.tsx`
- Create: `ticketeria-mobile/app/(pos)/setup.tsx`
- Create: `ticketeria-mobile/app/(pos)/pin.tsx`
- Create: `ticketeria-mobile/app/(pos)/index.tsx`
- Create: `ticketeria-mobile/app/(pos)/topup.tsx`

- [ ] **Step 1: Gate por variant no RootLayout**

Em `app/_layout.tsx`, importar no topo:

```typescript
import { IS_POS } from '../src/lib/appVariant';
import { PosSessionProvider } from '../src/contexts/PosSessionProvider';
```

Dentro de `RootLayout`, logo após abrir `<SafeAreaProvider>`, ramificar:

```tsx
        {IS_POS ? (
          <PosSessionProvider>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
              <Stack.Screen name="(pos)" />
            </Stack>
          </PosSessionProvider>
        ) : (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.bg },
              animation: 'slide_from_right',
            }}
          >
            {/* ...todas as <Stack.Screen> de consumidor existentes, inalteradas... */}
          </Stack>
        )}
```

Manter o bloco consumidor **exatamente** como está hoje (zero regressão). Só envolver numa condicional.

- [ ] **Step 2: Criar app/(pos)/_layout.tsx**

```tsx
import { Stack, Redirect } from 'expo-router';
import { usePosSession } from '../../src/contexts/PosSessionProvider';
import { View, ActivityIndicator } from 'react-native';

export default function PosLayout() {
  const { ready, paired } = usePosSession();
  if (!ready) {
    return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  }
  if (!paired) return <Redirect href="/(pos)/setup" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="setup" />
      <Stack.Screen name="pin" />
      <Stack.Screen name="index" />
      <Stack.Screen name="topup" />
    </Stack>
  );
}
```

- [ ] **Step 3: Criar setup.tsx (pareamento)**

```tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { redeemPairingCode } from '../../src/lib/posDevice';
import { usePosSession } from '../../src/contexts/PosSessionProvider';

export default function Setup() {
  const router = useRouter();
  const { refreshPaired } = usePosSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (value: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await redeemPairingCode(value.trim().toUpperCase());
      await refreshPaired();
      router.replace('/(pos)/pin');
    } catch {
      Alert.alert('Erro', 'Código inválido ou expirado');
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 16 }}>
        Parear este dispositivo
      </Text>
      {permission?.granted ? (
        <View style={{ height: 280, marginBottom: 16 }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => submit(data)}
          />
        </View>
      ) : (
        <TouchableOpacity onPress={requestPermission}>
          <Text>Permitir câmera para escanear o QR</Text>
        </TouchableOpacity>
      )}
      <Text style={{ marginVertical: 8 }}>ou digite o código:</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        maxLength={8}
        style={{ borderBottomWidth: 2, fontSize: 28, letterSpacing: 6, textAlign: 'center' }}
      />
      <TouchableOpacity
        disabled={code.length !== 8 || busy}
        onPress={() => submit(code)}
        style={{ marginTop: 24, backgroundColor: '#000', padding: 14, borderRadius: 8 }}
      >
        <Text style={{ color: '#fff', textAlign: 'center' }}>Parear</Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 4: Criar pin.tsx**

```tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { operatorLogin } from '../../src/lib/posDevice';
import { usePosSession } from '../../src/contexts/PosSessionProvider';

export default function Pin() {
  const router = useRouter();
  const { setOperator } = usePosSession();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const op = await operatorLogin(pin);
      setOperator(op);
      router.replace('/(pos)');
    } catch {
      Alert.alert('PIN inválido');
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, marginBottom: 24 }}>PIN do operador</Text>
      <TextInput
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        style={{ fontSize: 32, letterSpacing: 12, borderBottomWidth: 2, width: 200, textAlign: 'center' }}
      />
      <TouchableOpacity
        disabled={pin.length < 4 || busy}
        onPress={submit}
        style={{ marginTop: 24, backgroundColor: '#000', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 8 }}
      >
        <Text style={{ color: '#fff' }}>Entrar</Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 5: Criar index.tsx e topup.tsx (reuso das telas)**

`app/(pos)/index.tsx`:

```tsx
import { Redirect } from 'expo-router';
import { CashlessPOSScreen } from '../../src/screens/CashlessPOSScreen';
import { usePosSession } from '../../src/contexts/PosSessionProvider';
import { getStoredDeviceToken } from '../../src/lib/posDevice';
import { useEffect, useState } from 'react';

export default function PosHome() {
  const { posId, operator } = usePosSession();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { getStoredDeviceToken().then(setToken); }, []);
  if (!operator) return <Redirect href="/(pos)/pin" />;
  if (!posId || !token) return null;
  return <CashlessPOSScreen posId={posId} operatorJwt={token} />;
}
```

`app/(pos)/topup.tsx`:

```tsx
import { Redirect } from 'expo-router';
import { CashlessTopupScreen } from '../../src/screens/CashlessTopupScreen';
import { usePosSession } from '../../src/contexts/PosSessionProvider';

export default function PosTopup() {
  const { posId, operator } = usePosSession();
  if (!operator) return <Redirect href="/(pos)/pin" />;
  if (!posId) return null;
  return <CashlessTopupScreen posId={posId} />;
}
```

> Nota: `CashlessPOSScreen` recebe `posId` + `operatorJwt`. Aqui passamos o **device token** como credencial (o backend `operator-login`/charge é autenticado por device token, não por JWT de usuário). Verificar a assinatura real de `CashlessTopupScreen` e ajustar props conforme o componente existente.

- [ ] **Step 6: Typecheck**

Run: `cd ticketeria-mobile && npx tsc --noEmit 2>&1 | grep -E "app/\(pos\)|_layout"`
Expected: sem saída nos arquivos novos (erros pré-existentes não relacionados podem existir noutros arquivos).

- [ ] **Step 7: Commit**

```bash
git add ticketeria-mobile/app/_layout.tsx "ticketeria-mobile/app/(pos)"
git commit -m "feat(mobile): (pos) stack + variant gate (setup/pin/pos/topup)"
```

---

## Task 11: Mobile — heartbeat + config plugin lock-task (kiosk)

**Files:**
- Create: `ticketeria-mobile/src/hooks/usePosHeartbeat.ts`
- Modify: `ticketeria-mobile/app/(pos)/_layout.tsx`
- Create: `ticketeria-mobile/plugins/withAndroidLockTask.js`

- [ ] **Step 1: Criar usePosHeartbeat**

```typescript
import { useEffect } from 'react';
import Constants from 'expo-constants';
import { sendHeartbeat } from '../lib/posDevice';

export function usePosHeartbeat(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const tick = () =>
      sendHeartbeat({
        appVersion: Constants.expoConfig?.version,
        online: true,
      });
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [enabled]);
}
```

- [ ] **Step 2: Ligar o heartbeat no (pos)/_layout.tsx**

No `PosLayout`, após obter `paired`:

```tsx
import { usePosHeartbeat } from '../../src/hooks/usePosHeartbeat';
// ...
  usePosHeartbeat(paired);
```

- [ ] **Step 3: Criar o config plugin lock-task**

`ticketeria-mobile/plugins/withAndroidLockTask.js`:

```javascript
const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Habilita lock task (screen pinning / kiosk) na Activity principal.
 * Operador de bar não pode sair do app num device que move dinheiro.
 */
module.exports = function withAndroidLockTask(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;
    const activity = (app.activity || []).find(
      (a) => a.$['android:name'] === '.MainActivity',
    );
    if (activity) {
      activity.$['android:lockTaskMode'] = 'if_whitelisted';
    }
    return cfg;
  });
};
```

> Nota: ativar o lock task em runtime (`startLockTask`) requer que o device tenha o app na allowlist (provisioning) ou screen pinning manual. Para BYOD sem MDM, o pin é confirmado uma vez pelo admin no setup do device (screen pinning nativo do Android). Documentar no `pos-hardware-spec.md` como follow-up a camada MDM/Sunmi.

- [ ] **Step 4: Typecheck**

Run: `cd ticketeria-mobile && npx tsc --noEmit 2>&1 | grep -E "usePosHeartbeat"`
Expected: sem saída.

- [ ] **Step 5: Commit**

```bash
git add ticketeria-mobile/src/hooks/usePosHeartbeat.ts "ticketeria-mobile/app/(pos)/_layout.tsx" ticketeria-mobile/plugins/withAndroidLockTask.js
git commit -m "feat(mobile): POS heartbeat + Android lock-task config plugin (kiosk)"
```

---

## Task 12: Validação final + atualização do doc de arquitetura

**Files:**
- Modify: `docs/architecture/pos-hardware-spec.md`

- [ ] **Step 1: Backend — suíte completa**

Run: `cd ticketeria-api && npx vitest run src/modules/pos-devices src/middleware/__tests__/authenticateDevice.test.ts`
Expected: PASS, todos verdes.

- [ ] **Step 2: Backend — typecheck dos arquivos tocados**

Run: `cd ticketeria-api && npx tsc --noEmit 2>&1 | grep -E "pos-devices|authenticateDevice|app.ts" ; echo done`
Expected: só "done" (sem erros nesses arquivos).

- [ ] **Step 3: Regressão geral backend**

Run: `cd ticketeria-api && npx vitest run 2>&1 | grep -E "Tests "`
Expected: contagem de `passed` ≥ baseline (300+); nenhuma regressão nova introduzida por este plano (4 fails events/gateway pré-existentes permanecem, integração depende de DB).

- [ ] **Step 4: Mobile — typecheck dos arquivos novos**

Run: `cd ticketeria-mobile && npx tsc --noEmit 2>&1 | grep -E "app.config|appVariant|posDevice|PosSession|app/\(pos\)|usePosHeartbeat" ; echo done`
Expected: só "done" (arquivos novos limpos; 73 erros pré-existentes não relacionados continuam fora de escopo).

- [ ] **Step 5: Anotar follow-ups no doc de arquitetura**

Em `docs/architecture/pos-hardware-spec.md`, adicionar seção ao final:

```markdown
## Status de implementação (2026-05-15)

Entregue (software, build variant — ver spec/plan superpowers):
- App POS variant `com.pulsepass.pos` (EAS profile `pos`)
- Pareamento device↔POS por QR + device token revogável (kill-switch)
- Boot offline-first; heartbeat de telemetria; kiosk lock-task Android

Follow-up (não nesta entrega):
- Stone SDK / Pagar.me Tap (cartão presencial)
- Impressora Bluetooth (Elgin/Bematech)
- Sunmi DeviceManager (status bar, auto-boot, watchdog) + MDM/allowlist
- Reconciliação offline last-write-wins avançada (schema pending_tx §schema)
- POC hardware Sunmi V2s Plus + leasing
```

- [ ] **Step 6: Commit**

```bash
git add docs/architecture/pos-hardware-spec.md
git commit -m "docs: POS app implementation status + follow-ups"
```

---

## Self-Review (preenchido)

**Spec coverage:** §3.1 variant→Task 8; §3.2 offline-first→Task 9/10; §3.3 kiosk→Task 11; §4 backend→Tasks 1-6; §5 web→Task 7; §6 app POS→Tasks 9-11; §8 erros→Tasks 9 (DEVICE_REVOKED)/10 (redirects); §9 testes→Tasks 4,5,12. Sem lacunas.

**Placeholders:** nenhum TBD/TODO; "Nota:" são checagens de verificação contra o codebase real (nomes de model/paths), não placeholders de implementação — o código está completo em cada step.

**Type consistency:** `PosDeviceService` métodos (`issuePairCode`/`redeem`/`authenticateByToken`/`revoke`/`heartbeat`/`listByPos`) iguais em Tasks 4, 5, 6. `req.posDevice {id,posId,organizationId}` consistente (middleware Task 5 ↔ router Task 6). `deviceToken` `pd_`-prefixado consistente (service Task 4 ↔ posDevice.ts Task 9). `IS_POS` (Task 8) usado em Task 10. `usePosSession` shape consistente (Task 9 ↔ 10 ↔ 11).
