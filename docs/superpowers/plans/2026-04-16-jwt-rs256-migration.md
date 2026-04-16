# JWT RS256 Migration + Socket.IO Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate JWT signing from HS256 (symmetric) to RS256 (asymmetric) for access tokens, and implement real JWT verification in Socket.IO handshake.

**Architecture:** RSA key pair loaded from environment variables (base64-encoded PEM). Access tokens use RS256 (private key signs, public key verifies). Refresh tokens and internal-only tokens (email verification, password reset, 2FA temp) stay HS256 with a symmetric secret since they never leave the server. Socket.IO middleware verifies the access token JWT using the public key and attaches the user payload to the socket.

**Tech Stack:** jsonwebtoken (already installed), Node.js `crypto` module for key generation script, Zod for env validation, Vitest for tests.

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `ticketeria-api/scripts/generate-keys.ts` | One-time script to generate RSA key pair and output base64 for .env |
| Modify | `ticketeria-api/src/config/env.ts` | Add `JWT_PRIVATE_KEY_BASE64`, `JWT_PUBLIC_KEY_BASE64` env vars; keep `JWT_REFRESH_SECRET` |
| Create | `ticketeria-api/src/config/jwt.ts` | Decode base64 keys, export `jwtKeys` object with typed key access |
| Modify | `ticketeria-api/src/modules/auth/auth.service.ts` | Use RS256 + private key for access token signing; use public key for internal verify calls |
| Modify | `ticketeria-api/src/middleware/auth.ts` | Use RS256 + public key for access token verification |
| Modify | `ticketeria-api/src/server.ts` | Implement real JWT verification in Socket.IO middleware |
| Modify | `ticketeria-api/.env.example` | Add new env vars, document key generation |
| Modify | `ticketeria-api/src/tests/setup.ts` | Update jwt mock to handle `algorithm` option and key-based signing |
| Modify | `ticketeria-api/src/middleware/__tests__/auth.test.ts` | Update tests for RS256 verification |
| Modify | `ticketeria-api/src/modules/auth/__tests__/auth.service.test.ts` | Update tests for RS256 signing |
| Create | `ticketeria-api/src/config/__tests__/jwt.test.ts` | Test key loading and error handling |

---

### Task 1: RSA Key Generation Script

**Files:**
- Create: `ticketeria-api/scripts/generate-keys.ts`

- [ ] **Step 1: Create the key generation script**

```typescript
// ticketeria-api/scripts/generate-keys.ts
import { generateKeyPairSync } from 'crypto';

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const privateBase64 = Buffer.from(privateKey).toString('base64');
const publicBase64 = Buffer.from(publicKey).toString('base64');

console.log('=== Add these to your .env file ===\n');
console.log(`JWT_PRIVATE_KEY_BASE64=${privateBase64}\n`);
console.log(`JWT_PUBLIC_KEY_BASE64=${publicBase64}\n`);
```

- [ ] **Step 2: Run the script to verify it works**

Run: `cd ticketeria-api && npx tsx scripts/generate-keys.ts`
Expected: Two base64 strings printed to console, each starting with the encoded PEM header.

- [ ] **Step 3: Commit**

```bash
git add ticketeria-api/scripts/generate-keys.ts
git commit -m "feat: add RSA key pair generation script for JWT RS256"
```

---

### Task 2: JWT Key Configuration Module

**Files:**
- Create: `ticketeria-api/src/config/jwt.ts`
- Create: `ticketeria-api/src/config/__tests__/jwt.test.ts`
- Modify: `ticketeria-api/src/config/env.ts:23-26`

- [ ] **Step 1: Write the failing test for jwt config**

```typescript
// ticketeria-api/src/config/__tests__/jwt.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateKeyPairSync } from 'crypto';

// Generate a real key pair for testing
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const privateBase64 = Buffer.from(privateKey).toString('base64');
const publicBase64 = Buffer.from(publicKey).toString('base64');

describe('JWT Key Config', () => {
  it('should decode base64 keys to PEM strings', () => {
    const { decodeJwtKeys } = require('../jwt');
    const keys = decodeJwtKeys(privateBase64, publicBase64);

    expect(keys.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    expect(keys.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
  });

  it('should throw if private key base64 is invalid', () => {
    const { decodeJwtKeys } = require('../jwt');

    expect(() => decodeJwtKeys('not-valid-base64!!!', publicBase64)).toThrow(
      'JWT_PRIVATE_KEY_BASE64 is not valid base64 or does not contain a PEM private key'
    );
  });

  it('should throw if public key base64 is invalid', () => {
    const { decodeJwtKeys } = require('../jwt');

    expect(() => decodeJwtKeys(privateBase64, 'not-valid-base64!!!')).toThrow(
      'JWT_PUBLIC_KEY_BASE64 is not valid base64 or does not contain a PEM public key'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ticketeria-api && npx vitest run src/config/__tests__/jwt.test.ts`
Expected: FAIL — module `../jwt` does not exist.

- [ ] **Step 3: Implement the jwt config module**

```typescript
// ticketeria-api/src/config/jwt.ts

export interface JwtKeys {
  privateKey: string;
  publicKey: string;
}

export function decodeJwtKeys(privateBase64: string, publicBase64: string): JwtKeys {
  let privateKey: string;
  try {
    privateKey = Buffer.from(privateBase64, 'base64').toString('utf-8');
  } catch {
    throw new Error('JWT_PRIVATE_KEY_BASE64 is not valid base64 or does not contain a PEM private key');
  }

  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('JWT_PRIVATE_KEY_BASE64 is not valid base64 or does not contain a PEM private key');
  }

  let publicKey: string;
  try {
    publicKey = Buffer.from(publicBase64, 'base64').toString('utf-8');
  } catch {
    throw new Error('JWT_PUBLIC_KEY_BASE64 is not valid base64 or does not contain a PEM public key');
  }

  if (!publicKey.includes('-----BEGIN PUBLIC KEY-----')) {
    throw new Error('JWT_PUBLIC_KEY_BASE64 is not valid base64 or does not contain a PEM public key');
  }

  return { privateKey, publicKey };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ticketeria-api && npx vitest run src/config/__tests__/jwt.test.ts`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Update env.ts to add new env vars**

In `ticketeria-api/src/config/env.ts`, replace the JWT section (lines 23-26):

```typescript
  // JWT - RS256 asymmetric keys (base64-encoded PEM)
  JWT_PRIVATE_KEY_BASE64: z.string().min(1),
  JWT_PUBLIC_KEY_BASE64: z.string().min(1),
  // JWT - symmetric secret for refresh tokens only
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
```

This removes `JWT_ACCESS_SECRET` and adds `JWT_PRIVATE_KEY_BASE64` + `JWT_PUBLIC_KEY_BASE64`.

- [ ] **Step 6: Add key initialization to jwt.ts**

Append to the bottom of `ticketeria-api/src/config/jwt.ts`:

```typescript
import { env } from './env';

export const jwtKeys = decodeJwtKeys(env.JWT_PRIVATE_KEY_BASE64, env.JWT_PUBLIC_KEY_BASE64);
```

- [ ] **Step 7: Update test setup mockEnv**

In `ticketeria-api/src/tests/setup.ts`, update `mockEnv` (lines 104-126). Replace `JWT_ACCESS_SECRET` with the new key vars. Generate a test key pair at the top of the file:

```typescript
import { generateKeyPairSync } from 'crypto';

// Generate test RSA keys for JWT RS256 tests
const testKeyPair = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const TEST_PRIVATE_KEY_BASE64 = Buffer.from(testKeyPair.privateKey).toString('base64');
const TEST_PUBLIC_KEY_BASE64 = Buffer.from(testKeyPair.publicKey).toString('base64');
```

Then in `mockEnv`, replace:
```
JWT_ACCESS_SECRET: 'test-access-secret-minimum-32-characters-length-here',
```
With:
```
JWT_PRIVATE_KEY_BASE64: TEST_PRIVATE_KEY_BASE64,
JWT_PUBLIC_KEY_BASE64: TEST_PUBLIC_KEY_BASE64,
```

Also add the jwt.ts mock right after the env mock:

```typescript
vi.mock('../config/jwt', () => ({
  jwtKeys: {
    privateKey: testKeyPair.privateKey,
    publicKey: testKeyPair.publicKey,
  },
  decodeJwtKeys: vi.fn((priv: string, pub: string) => ({
    privateKey: Buffer.from(priv, 'base64').toString('utf-8'),
    publicKey: Buffer.from(pub, 'base64').toString('utf-8'),
  })),
}));
```

- [ ] **Step 8: Commit**

```bash
git add ticketeria-api/src/config/jwt.ts ticketeria-api/src/config/__tests__/jwt.test.ts ticketeria-api/src/config/env.ts ticketeria-api/src/tests/setup.ts
git commit -m "feat: add JWT RS256 key config module and update env schema"
```

---

### Task 3: Migrate Auth Service to RS256

**Files:**
- Modify: `ticketeria-api/src/modules/auth/auth.service.ts`
- Modify: `ticketeria-api/src/modules/auth/__tests__/auth.service.test.ts`

- [ ] **Step 1: Update auth.service.test.ts for RS256 signing**

In `ticketeria-api/src/modules/auth/__tests__/auth.service.test.ts`, add the import:

```typescript
import { jwtKeys } from '../../../config/jwt';
```

Update the `generateTokens` describe block to verify RS256 algorithm:

```typescript
  describe('generateTokens', () => {
    it('should sign access token with RS256 and private key', async () => {
      const mockUser = createMockUser();

      vi.mocked(redis.setex).mockResolvedValueOnce('OK');
      vi.mocked(jwt.sign).mockReturnValueOnce('access-token');
      vi.mocked(jwt.sign).mockReturnValueOnce('refresh-token');

      const result = (authService as any).generateTokens(mockUser);

      // First call is access token — must use RS256 + private key
      const accessCall = vi.mocked(jwt.sign).mock.calls[0];
      expect(accessCall[1]).toBe(jwtKeys.privateKey);
      expect(accessCall[2]).toEqual(
        expect.objectContaining({ algorithm: 'RS256' })
      );

      // Second call is refresh token — stays HS256 + symmetric secret
      const refreshCall = vi.mocked(jwt.sign).mock.calls[1];
      expect(refreshCall[1]).toBe(env.JWT_REFRESH_SECRET);
      expect(refreshCall[2]).not.toEqual(
        expect.objectContaining({ algorithm: 'RS256' })
      );
    });

    it('should generate access and refresh tokens', async () => {
      const mockUser = createMockUser();

      vi.mocked(redis.setex).mockResolvedValueOnce('OK');
      vi.mocked(jwt.sign).mockReturnValueOnce('access-token');
      vi.mocked(jwt.sign).mockReturnValueOnce('refresh-token');

      const result = (authService as any).generateTokens(mockUser);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.expiresIn).toBe(900);
    });

    it('should store refresh token in Redis with TTL', async () => {
      const mockUser = createMockUser();

      vi.mocked(redis.setex).mockResolvedValueOnce('OK');

      (authService as any).generateTokens(mockUser);

      expect(redis.setex).toHaveBeenCalled();
      const call = vi.mocked(redis.setex).mock.calls[0];
      expect(call[0]).toContain('refresh_token');
      expect(call[1]).toBe(7 * 24 * 60 * 60);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ticketeria-api && npx vitest run src/modules/auth/__tests__/auth.service.test.ts`
Expected: FAIL — access token is still signed with `env.JWT_ACCESS_SECRET`, not `jwtKeys.privateKey`.

- [ ] **Step 3: Update auth.service.ts to use RS256**

In `ticketeria-api/src/modules/auth/auth.service.ts`:

Add import at the top (after the env import on line 6):

```typescript
import { jwtKeys } from '../../config/jwt';
```

Replace the `generateTokens` method (lines 433-467):

```typescript
  private generateTokens(user: User): TokenPair {
    const accessPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const refreshPayload = {
      userId: user.id,
    };

    // Access token: RS256 with private key (verifiable by public key)
    const accessToken = jwt.sign(
      accessPayload,
      jwtKeys.privateKey,
      { algorithm: 'RS256', expiresIn: env.JWT_ACCESS_EXPIRES_IN }
    );

    // Refresh token: HS256 with symmetric secret (server-side only)
    const refreshToken = jwt.sign(
      refreshPayload,
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
    );

    // Armazenar refresh token em Redis para invalidacao
    const refreshExpiresIn = 7 * 24 * 60 * 60; // 7 dias
    redis.setex(`refresh_token:${user.id}`, refreshExpiresIn, refreshToken).catch((err) => {
      console.error('Erro ao armazenar refresh token em Redis:', err);
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutos
    };
  }
```

Also update the internal token signing calls that use `env.JWT_ACCESS_SECRET` for email verification (line 67-71), 2FA pending (line 124-128), password reset (line 268-272), email verify check (line 234), and password reset check (line 293). These are internal-only tokens so they should use `env.JWT_REFRESH_SECRET` (the remaining symmetric secret) instead of the now-removed `JWT_ACCESS_SECRET`:

Replace every occurrence of `env.JWT_ACCESS_SECRET` in auth.service.ts with `env.JWT_REFRESH_SECRET`. There are 4 occurrences:
- Line 69: email verification token signing
- Line 127: 2FA pending token signing  
- Line 234: email verification verify
- Line 269: password reset token signing
- Line 293: password reset verify

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ticketeria-api && npx vitest run src/modules/auth/__tests__/auth.service.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add ticketeria-api/src/modules/auth/auth.service.ts ticketeria-api/src/modules/auth/__tests__/auth.service.test.ts
git commit -m "feat: migrate access token signing to RS256 with private key"
```

---

### Task 4: Migrate Auth Middleware to RS256 Verification

**Files:**
- Modify: `ticketeria-api/src/middleware/auth.ts`
- Modify: `ticketeria-api/src/middleware/__tests__/auth.test.ts`

- [ ] **Step 1: Update auth.test.ts for RS256 verification**

In `ticketeria-api/src/middleware/__tests__/auth.test.ts`:

Add import:

```typescript
import { jwtKeys } from '../../config/jwt';
```

Add a new test in the `authenticate` describe block:

```typescript
    it('should verify token with RS256 public key and algorithms option', () => {
      const payload: AuthPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.consumer,
      };

      const token = `token_${JSON.stringify(payload)}`;

      const req = {
        headers: { authorization: `Bearer ${token}` },
        user: undefined,
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      authenticate(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(
        token,
        jwtKeys.publicKey,
        { algorithms: ['RS256'] }
      );
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ticketeria-api && npx vitest run src/middleware/__tests__/auth.test.ts`
Expected: FAIL — `jwt.verify` is called with `env.JWT_ACCESS_SECRET` not `jwtKeys.publicKey`.

- [ ] **Step 3: Update auth.ts middleware**

Replace the full content of `ticketeria-api/src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtKeys } from '../config/jwt';
import { UnauthorizedError, ForbiddenError } from '../shared/errors';
import { UserRole } from '../generated/prisma/client';

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Middleware de autenticacao JWT (RS256)
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token de acesso nao fornecido');
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, jwtKeys.publicKey, { algorithms: ['RS256'] }) as AuthPayload;
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expirado');
    }
    throw new UnauthorizedError('Token invalido');
  }
}

/**
 * Middleware de autorizacao por role
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Nao autenticado');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Sem permissao para acessar este recurso');
    }

    next();
  };
}

/**
 * Middleware opcional de autenticacao (nao exige token, mas extrai se presente)
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = jwt.verify(token, jwtKeys.publicKey, { algorithms: ['RS256'] }) as AuthPayload;
      req.user = payload;
    } catch {
      // Token invalido mas e opcional - continua sem user
    }
  }

  next();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ticketeria-api && npx vitest run src/middleware/__tests__/auth.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add ticketeria-api/src/middleware/auth.ts ticketeria-api/src/middleware/__tests__/auth.test.ts
git commit -m "feat: migrate auth middleware to RS256 public key verification"
```

---

### Task 5: Implement Socket.IO JWT Authentication

**Files:**
- Modify: `ticketeria-api/src/server.ts:31-38`

- [ ] **Step 1: Update Socket.IO middleware in server.ts**

Replace lines 30-38 of `ticketeria-api/src/server.ts` (the Socket.IO auth middleware):

```typescript
  // Socket.IO middleware de autenticacao (RS256)
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Token nao fornecido'));
    }

    try {
      const payload = jwt.verify(token, jwtKeys.publicKey, { algorithms: ['RS256'] }) as {
        userId: string;
        email: string;
        role: string;
      };
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Token invalido'));
    }
  });
```

Also add the required imports at the top of server.ts (after line 6 — the env import):

```typescript
import jwt from 'jsonwebtoken';
import { jwtKeys } from './config/jwt';
```

- [ ] **Step 2: Update the join:user event to use authenticated userId**

In `ticketeria-api/src/server.ts`, update the `join:user` handler (around line 64) to use the authenticated user instead of a client-supplied userId:

```typescript
    // Join room do usuario para notificacoes pessoais (usa userId autenticado)
    socket.on('join:user', () => {
      if (socket.data.user?.userId) {
        socket.join(`user:${socket.data.user.userId}`);
      }
    });
```

- [ ] **Step 3: Verify the server compiles**

Run: `cd ticketeria-api && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add ticketeria-api/src/server.ts
git commit -m "feat: implement JWT RS256 verification in Socket.IO handshake"
```

---

### Task 6: Update .env.example and Documentation

**Files:**
- Modify: `ticketeria-api/.env.example`

- [ ] **Step 1: Update .env.example**

Replace the JWT section (lines 24-29) of `ticketeria-api/.env.example`:

```env
# JWT - RS256 Asymmetric Keys
# Generate with: npx tsx scripts/generate-keys.ts
JWT_PRIVATE_KEY_BASE64=<run generate-keys.ts to get this>
JWT_PUBLIC_KEY_BASE64=<run generate-keys.ts to get this>
# JWT - Symmetric (refresh tokens + internal tokens only)
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

Remove the old `JWT_ACCESS_SECRET` line entirely.

- [ ] **Step 2: Commit**

```bash
git add ticketeria-api/.env.example
git commit -m "docs: update .env.example with RS256 key instructions"
```

---

### Task 7: Run Full Test Suite and Fix Any Breakage

- [ ] **Step 1: Run all unit tests**

Run: `cd ticketeria-api && npx vitest run`
Expected: All tests pass. If any fail, identify the failure — it will be tests that still reference `env.JWT_ACCESS_SECRET`. Fix them by replacing with `jwtKeys.publicKey` or `jwtKeys.privateKey` as appropriate.

- [ ] **Step 2: Check TypeScript compilation**

Run: `cd ticketeria-api && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Generate keys for local .env**

Run: `cd ticketeria-api && npx tsx scripts/generate-keys.ts`

Copy the output `JWT_PRIVATE_KEY_BASE64` and `JWT_PUBLIC_KEY_BASE64` values into the local `.env` file. Remove the old `JWT_ACCESS_SECRET` line.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete JWT RS256 migration — all tests passing"
```

---

### Task 8: Update INSTRUCOES_DESENVOLVIMENTO.md

**Files:**
- Modify: `ticketeria-api/../INSTRUCOES_DESENVOLVIMENTO.md`

- [ ] **Step 1: Update the gaps table**

In `INSTRUCOES_DESENVOLVIMENTO.md`, update the JWT RS256 row in the gaps table (line 103) to mark it as done:

```
| JWT RS256 (assimetrico) | RS256 implementado | - | CONCLUIDO |
```

Update the Socket.IO row (line 105):

```
| Socket.IO JWT auth | RS256 no handshake | - | CONCLUIDO |
```

Update the security checklist items (lines 686-687):

```
- [x] JWT RS256 com par de chaves publico/privado
```

And line 599:
```
- [x] Migrar JWT de HS256 para RS256 (par de chaves)
- [x] Implementar Socket.IO JWT auth no handshake
```

- [ ] **Step 2: Commit**

```bash
git add INSTRUCOES_DESENVOLVIMENTO.md
git commit -m "docs: mark JWT RS256 and Socket.IO auth as completed"
```
