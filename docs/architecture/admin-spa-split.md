# Admin SPA Split — Plano de Execução

> Auditoria CTO 2026-05 — gap 4.8
> **Objetivo:** mover `features/admin/*` de `ticketeria-web` para um pacote separado `ticketeria-admin`, reduzindo o bundle do app público em ~60% e permitindo deploys independentes.

## Justificativa

Hoje `ticketeria-web` serve homepage pública + checkout + área do usuário + **todo o painel admin do produtor**. Mesmo com `lazy()`, o roteamento principal e os providers carregam código admin. Em produção:

- Bundle público transfere componentes admin que cliente final nunca usa.
- Mudança no admin força redeploy do site público.
- CSP do admin é mais restritiva que do site público (queremos permitir uploads, embeds Asaas etc) — fica tudo no mesmo bundle por padrão.
- LCP do `event/:slug` (página crítica de conversão) é prejudicado pelo peso do core.

`env.ts` já tem `ADMIN_URL` separado de `FRONTEND_URL` — a split é natural.

## Estrutura final do monorepo

```
ticket-real/
├── ticketeria-api/
├── ticketeria-types/         (já existe)
├── ticketeria-ui/            ← NOVO: kit de componentes compartilhado (ui/, hooks/, stores/lib/)
├── ticketeria-web/           ← APENAS público + checkout + área usuário
│   └── src/features/         (sem subpasta admin/)
├── ticketeria-admin/         ← NOVO: painel produtor / organization
│   └── src/features/
└── ticketeria-mobile/
```

## Roteiro técnico (5 sprints)

### Sprint 1 — extrair UI compartilhada
1. Criar `ticketeria-ui/` (workspace npm).
2. Mover `ticketeria-web/src/shared/ui/`, `hooks/`, `stores/`, `lib/`, `styles/` para `ticketeria-ui/src/`.
3. Exportar via `package.json#exports`.
4. Atualizar `ticketeria-web` para importar de `@ticketeria/ui`.
5. CI verde.

### Sprint 2 — scaffolding ticketeria-admin
1. Copiar `ticketeria-web` como template (Vite 7 + React 19).
2. Apontar `vite.config.ts` para porta 5174.
3. Importar `@ticketeria/ui` e `@ticketeria/types`.
4. Criar router próprio só com `/login`, `/admin/*`.
5. Configurar `VITE_ADMIN_BASE_URL`.

### Sprint 3 — mover features admin
1. Mover `ticketeria-web/src/features/admin/` para `ticketeria-admin/src/features/`.
2. Mover routes admin de `router.tsx`.
3. Ajustar imports.
4. Confirmar Playwright passa em ambos.

### Sprint 4 — deploy
1. Pipeline `deploy-admin.yml` para `admin.pulsepass.com.br` no Cloudflare Pages.
2. CSP separada (mais permissiva para iframes Asaas).
3. CORS no API: aceitar tanto FRONTEND_URL quanto ADMIN_URL.
4. Sentry projetos separados.

### Sprint 5 — limpeza
1. Remover lazy-loads admin do bundle público.
2. Validar bundle público < 400 KB gz no main chunk.
3. Documentar no README.

## Critérios de saída

- `ticketeria-web/dist/assets/index-*.js` < 400 KB gzipped (hoje estimado ~700 KB).
- Tempo de TTI no `event/:slug` < 2s em rede 4G.
- Admin pode ser redeployed sem afetar o público.
- Single sign-on entre web e admin via cookie httpOnly compartilhado em `*.pulsepass.com.br`.

## Riscos

- Duplicação de código se UI compartilhada não for bem-feita. Mitigação: ticketeria-ui sólido antes de copiar admin.
- Auth state shared — Zustand persistido em localStorage chaveado igual nos dois.
- TanStack Query cache: cada SPA tem o seu, mas as queries devem ter mesmo `queryKey` formato para facilitar manutenção.
