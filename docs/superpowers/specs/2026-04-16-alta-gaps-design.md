# ALTA Gaps Design: Anti-replay + Excel 9 abas + Push Notifications

**Date:** 2026-04-16
**Author:** Erick Berberian + Claude
**Status:** Approved

---

## 1. Anti-replay Redis (Checkin)

### Problem
QR validation relies on database atomic transactions only. No Redis-based fast-path rejection exists. Two devices scanning the same QR simultaneously can race before DB commit.

### Solution
- Before any validation, attempt `redis.set(checkin:qr:{hash}:{totp}, "1", "EX", 300, "NX")`
- NX = only set if not exists. Returns null if key already exists (replay detected)
- TTL 300s (5-minute anti-replay window per PRD)
- On validation failure (cancelled ticket, wrong event, etc), delete the Redis key to allow legitimate retry
- Add rate limiter on `/checkin/validate` — 20 req/s per operator (via user ID from JWT)

### Files
- Modify: `src/modules/checkin/checkin.service.ts` — add Redis SET NX before validation
- Modify: `src/modules/checkin/checkin.router.ts` — add rate limiter
- Modify: `src/modules/checkin/__tests__/checkin.service.test.ts` — update tests

---

## 2. Relatorio Excel 9 Abas

### Problem
Only basic CSV export exists. PRD requires professional 9-tab Excel report with charts, formatting, color scales.

### Solution
- Install `exceljs@^4.4.0`
- New service `reports.excel.service.ts` with `ExcelReportBuilder` class
- Each tab is a dedicated method receiving pre-aggregated data
- New endpoint `GET /reports/:eventId/excel` returning direct download stream
- Expand `reports.service.ts` with new aggregation queries for guest lists, promoters, staff, cashless

### 9 Tabs Specification

**Tab 1 — Resumo Executivo:**
- Event info header (title, date, venue, capacity)
- 4 KPI cards: total vendido, checkins, receita bruta, taxa conversao
- Top 3 rankings: promoters, listas, lotes

**Tab 2 — Lista de Convidados:**
- All GuestEntry rows: name, cpf, phone, email, list name, list type (color badge), status (checked in / no show), checkedInAt
- Frozen header row, auto-filter, auto-width
- Green fill for checked-in, red for no-show

**Tab 3 — Por Promoter:**
- Promoter name, total guests, checked in, conversion %, score
- Sorted by conversion rate descending
- Data bars on conversion column
- Embedded bar chart: top 10 promoters by check-ins

**Tab 4 — Por Lista:**
- Guest list name, type, total, checked in, no-show, conversion %
- Color scale on conversion (red→yellow→green)
- Embedded pie chart: distribution by list type

**Tab 5 — Por Hostess:**
- EventStaff with role=hostess: name, check-ins performed, participation %, first/last checkin time
- Purple data bars on check-in count

**Tab 6 — Analise Temporal:**
- Hourly breakdown: hour, check-ins, cumulative total
- Peak hour highlighted with gold fill
- Embedded line chart: check-ins per hour + cumulative

**Tab 7 — Por Genero:**
- Gender breakdown by list (from EventFormField responses where label contains 'genero'/'sexo'/'gender')
- Columns: list name, male, female, other/unidentified, total
- Fallback: if no gender data, show "Dados nao disponveis" message

**Tab 8 — Cashless e Financeiro:**
- Total revenue, avg ticket price, refunds, net revenue
- Revenue by payment method (PIX, card, boleto)
- Cashless: total recharges, total spent, avg wallet balance
- Revenue by POS (if cashless active)
- Green color scale on revenue columns

**Tab 9 — KPIs Avancados:**
- General: sell-through rate, avg time-to-purchase, overbooking margin
- Promoters: avg conversion, best/worst, guests-per-promoter distribution
- Lists: avg fill rate, most popular type, time-to-fill
- Check-in: peak rate (checkins/min), avg queue time estimate, device distribution
- Financial: revenue per head, ARPU, cost per acquisition estimate

### Design Palette
- Primary: #7C3AED (PulsePass purple)
- Header bg: #7C3AED with white text
- Alternating rows: #F5F3FF / white
- Success: #10B981 (green)
- Danger: #EF4444 (red)
- Warning: #F59E0B (gold)
- Data bars: #8B5CF6 (lighter purple)

### Files
- Install: `exceljs@^4.4.0` in ticketeria-api
- Create: `src/modules/reports/reports.excel.service.ts`
- Create: `src/modules/reports/reports.data.service.ts` (data aggregation queries)
- Modify: `src/modules/reports/reports.router.ts` — add Excel endpoint
- Modify: `src/modules/reports/reports.controller.ts` — add handler
- Create: `src/modules/reports/__tests__/reports.excel.service.test.ts`

---

## 3. Push Notifications (Expo Push API)

### Problem
`push.service.ts` only logs to console. No device token storage, no real push delivery, no mobile integration.

### Solution

#### Backend
- Install `expo-server-sdk@^3.10.0`
- Add `expoPushToken String?` field to User model (Prisma migration)
- New endpoint `PUT /users/push-token` — saves Expo push token
- Rewrite `push.service.ts` with real Expo SDK integration
- Implement push worker (existing stub) with Expo batch sending
- Save sent notifications to Notification table
- Integrate push into existing event flows: order confirmed, ticket issued, transfer, checkin, event reminder

#### Mobile
- New hook `useNotifications()`: request permissions, get token, register with backend, handle incoming notifications
- Initialize in `_layout.tsx` on app start
- Deep link handling from notification payload

#### Push Events
| Event | Title | Body | When |
|-------|-------|------|------|
| order_confirmed | Compra confirmada! | Seu ingresso para {event} esta pronto | After payment webhook |
| ticket_issued | Ingresso disponivel | Acesse seu QR code para {event} | After ticket activation |
| transfer_request | Transferencia recebida | {sender} quer transferir um ingresso | On transfer initiation |
| transfer_completed | Transferencia concluida | Voce recebeu um ingresso para {event} | On transfer confirmation |
| checkin_success | Check-in realizado | Bem-vindo ao {event}! | After successful checkin |
| event_reminder | Evento amanha! | {event} comeca amanha as {time} | 24h before event |

### Files

**Backend:**
- Migration: add `expoPushToken` to User
- Create: `src/config/expo.ts` — Expo SDK client
- Modify: `src/modules/notifications/push.service.ts` — real implementation
- Modify: `src/jobs/workers/push.worker.ts` — real worker
- Modify: `src/modules/users/users.router.ts` — add push-token endpoint
- Modify: `src/modules/users/users.controller.ts` — add handler
- Create: `src/modules/users/users.validators.ts` — push token schema (if not exists)

**Mobile:**
- Create: `src/hooks/useNotifications.ts`
- Modify: `app/_layout.tsx` — initialize notifications
- Modify: `src/lib/api.ts` — add push token API call
