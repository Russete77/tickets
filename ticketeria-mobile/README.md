# Ticketeria Mobile

App mobile nativo para a plataforma Ticketeria Digital, construido com React Native + Expo.

## Requisitos

- Node.js 20+
- npm ou yarn
- Expo CLI (`npx expo`)
- iOS: Xcode 15+ (para simulador) ou Expo Go no iPhone
- Android: Android Studio (para emulador) ou Expo Go no celular

## Setup

```bash
# 1. Instalar dependencias
cd ticketeria-mobile
npm install

# 2. Rodar no celular via Expo Go
npx expo start

# 3. Ou rodar no simulador iOS
npx expo start --ios

# 4. Ou rodar no emulador Android
npx expo start --android
```

## Estrutura

```
ticketeria-mobile/
├── app/                    # Expo Router (file-based routing)
│   ├── _layout.tsx         # Root layout (providers)
│   ├── (tabs)/             # Tab navigation
│   │   ├── index.tsx       # Home
│   │   ├── search.tsx      # Busca
│   │   ├── tickets.tsx     # Meus Ingressos
│   │   └── profile.tsx     # Perfil
│   ├── (auth)/             # Auth stack
│   │   ├── login.tsx       # Login
│   │   └── register.tsx    # Cadastro
│   ├── event/[slug].tsx    # Detalhe do evento
│   ├── checkout/[eventId].tsx  # Checkout
│   └── checkin.tsx         # Scanner check-in
├── src/
│   ├── screens/            # Screen components (9 telas)
│   ├── components/         # Componentes reutilizaveis (10)
│   ├── lib/                # API client, TOTP, storage, formatters
│   ├── stores/             # Zustand (auth, cart, tickets)
│   ├── styles/             # Design tokens + theme
│   └── types/              # TypeScript types
├── app.json                # Expo config
├── package.json            # Dependencies
└── tsconfig.json           # TypeScript config
```

## Telas

| Tela | Rota | Descricao |
|------|------|-----------|
| Home | / | Descoberta de eventos, busca, categorias |
| Busca | /search | Busca com filtros por categoria |
| Evento | /event/[slug] | Detalhes, lotes, galeria, reviews |
| Checkout | /checkout/[eventId] | Compra com PIX/Cartao/Boleto |
| Meus Ingressos | /tickets | QR TOTP dinamico, transferencia |
| Login | /login | Autenticacao |
| Cadastro | /register | Registro com CPF |
| Perfil | /profile | Dados, historico, configuracoes |
| Check-in | /checkin | Scanner QR para operadores |

## Features

- QR Code dinamico TOTP (regenera a cada 30s)
- Anti-screenshot (expo-screen-capture)
- Push notifications (expo-notifications)
- Armazenamento seguro de tokens (expo-secure-store)
- Modo offline para ingressos
- Camera scanner para check-in
- Dark mode nativo
- Haptic feedback nos botoes
- Formatacao brasileira (R$, CPF, datas)

## API

O app consome a mesma API do backend (ticketeria-api). Configure a URL em:
- `src/lib/api.ts` > `BASE_URL`
- Para dev local: `http://localhost:3333/api`
- Para producao: `https://api.ticketeria.com.br/api`

## Build para producao

```bash
# Build iOS
npx expo run:ios --configuration Release

# Build Android
npx expo run:android --variant release

# Ou via EAS Build (recomendado)
npx eas build --platform all
```
