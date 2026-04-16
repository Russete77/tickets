# Timelapse Design System v2.0
## Sistema de Design Completo — Ticketeria & Admin

> **Marca:** Timelapse (betimelapse.com.br)
> **Produto:** Plataforma de venda de ingressos para eventos
> **Versão:** 2.0 — Redesign Profissional
> **Data:** Abril 2026

---

## 1. Filosofia de Design

O Design System da Timelapse é construído sobre três pilares:

**Imersão** — A ticketeria (área do usuário final) utiliza dark mode para criar uma experiência cinematográfica que valoriza os banners e flyers dos eventos, remetendo ao ambiente noturno de festas e shows.

**Clareza** — As áreas administrativas (produtor, admin, checkin) utilizam light mode por padrão para facilitar leitura prolongada, reduzir fadiga visual e transmitir profissionalismo e confiança.

**Consistência** — Ambos os modos compartilham a mesma arquitetura de tokens, componentes e padrões de interação, garantindo uma experiência coesa em toda a plataforma.

---

## 2. Divisão de Modos

| Área | Modo Padrão | Toggle? | Justificativa |
|------|-------------|---------|---------------|
| Ticketeria (compra de ingressos) | **Dark** | Não | Experiência imersiva, foco nos eventos |
| Landing page / Home | **Dark** | Não | Continuidade da experiência do usuário |
| Página do evento | **Dark** | Não | Valoriza artwork e banners |
| Checkout | **Dark** | Não | Fluxo contínuo, menos atrito |
| Dashboard Admin | **Light** | Sim (dark opcional) | Leitura de dados, relatórios |
| Dashboard Produtor | **Light** | Sim (dark opcional) | Gestão de eventos, métricas |
| Lista de Check-in | **Light** | Sim (dark opcional) | Uso em campo, legibilidade ao sol |
| Validador de ingressos | **Light** | Sim (dark opcional) | Uso rápido, alto contraste |

---

## 3. Paleta de Cores

### 3.1 Cores da Marca (Brand)

```
brand-primary:      #00FF66    // Verde neon — cor principal da marca
brand-primary-rgb:  0, 255, 102
brand-dark:         #121212    // Preto profundo — background principal dark
brand-white:        #FFFFFF    // Branco puro
```

### 3.2 Dark Mode — Ticketeria

#### Backgrounds
```
dark-bg-primary:       #0A0A0A    // Background principal (body)
dark-bg-secondary:     #121212    // Superfícies elevadas (cards base)
dark-bg-tertiary:      #1A1A1A    // Cards, containers
dark-bg-elevated:      #222222    // Elementos elevados (dropdowns, modais)
dark-bg-surface:       #2A2A2A    // Superfícies interativas (hover states)
dark-bg-overlay:       rgba(0, 0, 0, 0.60)     // Overlay de modais
dark-bg-glass:         rgba(10, 10, 10, 0.96)   // Glassmorphism base
dark-bg-glass-light:   rgba(255, 255, 255, 0.08) // Glass sutil (inputs, cards)
```

#### Textos
```
dark-text-primary:     #FFFFFF                    // Títulos, texto principal
dark-text-secondary:   rgba(255, 255, 255, 0.70)  // Subtítulos, descrições
dark-text-tertiary:    rgba(255, 255, 255, 0.45)  // Placeholders, hints
dark-text-muted:       rgba(255, 255, 255, 0.30)  // Labels desabilitados
dark-text-accent:      #00FF66                     // Links, destaques
```

#### Bordas
```
dark-border-default:   rgba(255, 255, 255, 0.08)  // Bordas sutis
dark-border-medium:    rgba(255, 255, 255, 0.12)  // Bordas de inputs
dark-border-strong:    rgba(255, 255, 255, 0.20)  // Bordas em foco leve
dark-border-focus:     rgba(255, 255, 255, 0.40)  // Bordas com foco
dark-border-accent:    #00FF66                     // Bordas de destaque
```

### 3.3 Light Mode — Admin / Produtor

#### Backgrounds
```
light-bg-primary:      #FAFAFA    // Background principal (body)
light-bg-secondary:    #FFFFFF    // Cards, containers
light-bg-tertiary:     #F5F5F5    // Áreas agrupadas
light-bg-elevated:     #FFFFFF    // Modais, dropdowns (com shadow)
light-bg-surface:      #F0F0F0    // Hover states
light-bg-sidebar:      #FCFCFC    // Sidebar navigation
light-bg-overlay:      rgba(0, 0, 0, 0.40)       // Overlay de modais
light-bg-accent:       rgba(0, 255, 102, 0.08)    // Background de destaque sutil
```

#### Textos
```
light-text-primary:    #111111    // Títulos, texto principal
light-text-secondary:  #555555    // Subtítulos, descrições
light-text-tertiary:   #6B6B6B    // Placeholders, hints (WCAG AA 5.11:1)
light-text-muted:      #BBBBBB    // Labels desabilitados
light-text-accent:     #00803A    // Links, destaques (WCAG AA 4.85:1)
light-text-inverse:    #FFFFFF    // Texto sobre backgrounds escuros
```

#### Bordas
```
light-border-default:  #E8E8E8    // Bordas sutis
light-border-medium:   #D4D4D4    // Bordas de inputs
light-border-strong:   #B0B0B0    // Bordas em foco leve
light-border-focus:    #00803A    // Bordas com foco (verde acessível)
light-border-accent:   #00803A    // Bordas de destaque
```

### 3.4 Cores Semânticas (compartilhadas)

```
// Sucesso
semantic-success:         #00FF66    // Dark mode
semantic-success-light:   #00CC52    // Light mode
semantic-success-bg:      rgba(0, 255, 102, 0.12)  // Background sutil

// Erro / Perigo
semantic-error:           #FF3B30
semantic-error-hover:     #E8352B
semantic-error-bg:        rgba(255, 59, 48, 0.12)

// Aviso
semantic-warning:         #FFB800
semantic-warning-hover:   #E6A600
semantic-warning-bg:      rgba(255, 184, 0, 0.12)

// Informação
semantic-info:            #007AFF
semantic-info-hover:      #006AE0
semantic-info-bg:         rgba(0, 122, 255, 0.12)

// Ingressos — Status
ticket-available:         #00FF66
ticket-few-left:          #FFB800
ticket-sold-out:          #FF3B30
ticket-coming-soon:       #007AFF
ticket-cancelled:         #888888
```

### 3.5 Gradientes

```
// Gradiente principal da marca
gradient-brand:           linear-gradient(135deg, #00FF66 0%, #00CC52 100%)

// Gradiente para CTAs premium
gradient-premium:         linear-gradient(135deg, #FFD700 0%, #FFB800 100%)

// Gradiente dark para headers
gradient-dark-header:     linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)

// Gradiente para cards com overlay de texto
gradient-card-overlay:    linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.85) 100%)

// Shimmer / Loading
gradient-shimmer-dark:    linear-gradient(90deg, #1A1A1A 0%, #2A2A2A 50%, #1A1A1A 100%)
gradient-shimmer-light:   linear-gradient(90deg, #F0F0F0 0%, #E0E0E0 50%, #F0F0F0 100%)
```

---

## 4. Tipografia

### 4.1 Font Stack

```
// Display / Headings impactantes (logo, hero, titulos de seção)
font-display: 'Monument Extended', 'Helvetica Now Display', sans-serif;

// Body / Interface
font-body: 'Helvetica Now Display', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

// Monospace (dados, códigos, valores monetários)
font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
```

### 4.2 Escala Tipográfica

```
// Títulos — Display
text-display-xl:   3rem / 1.05  (48px)  — weight: 900  // Hero sections
text-display-lg:   2.25rem / 1.1 (36px) — weight: 800  // Títulos de página
text-display-md:   1.75rem / 1.15 (28px) — weight: 700  // Seções principais
text-display-sm:   1.25rem / 1.2 (20px) — weight: 700  // Sub-seções

// Corpo
text-body-lg:      1.125rem / 1.6 (18px) — weight: 400  // Texto destaque
text-body-md:      1rem / 1.5 (16px)     — weight: 400  // Texto padrão
text-body-sm:      0.875rem / 1.5 (14px) — weight: 400  // Texto auxiliar

// UI / Labels
text-label-lg:     0.875rem / 1.3 (14px) — weight: 600  // Labels fortes
text-label-md:     0.75rem / 1.3 (12px)  — weight: 600  // Labels padrão
text-label-sm:     0.6875rem / 1.3 (11px) — weight: 700 // Tags, badges
text-label-xs:     0.625rem / 1.2 (10px)  — weight: 800 // Micro-tags

// Preços
text-price-lg:     1.5rem / 1 (24px)     — weight: 800  // Preço destaque
text-price-md:     1.125rem / 1 (18px)   — weight: 700  // Preço padrão
text-price-sm:     0.875rem / 1 (14px)   — weight: 600  // Preço pequeno
```

### 4.3 Letter Spacing

```
tracking-tight:    -0.02em    // Display headings
tracking-normal:    0         // Body text
tracking-wide:      0.02em   // Labels
tracking-wider:     0.05em   // Uppercase labels
tracking-widest:    0.1em    // Section labels, micro-tags
```

---

## 5. Espaçamento

### 5.1 Escala Base (8px grid)

```
space-0:     0
space-0.5:   2px
space-1:     4px
space-1.5:   6px
space-2:     8px
space-3:     12px
space-4:     16px
space-5:     20px
space-6:     24px
space-8:     32px
space-10:    40px
space-12:    48px
space-16:    64px
space-20:    80px
space-24:    96px
```

### 5.2 Container

```
container-max:     1220px     // Max-width do container principal
container-px:      16px       // Padding horizontal mobile
container-px-md:   24px       // Padding horizontal tablet
container-px-lg:   0          // Desktop (centralizado)
```

---

## 6. Border Radius

```
radius-none:    0
radius-xs:      4px     // Tags, badges, micro-elements
radius-sm:      8px     // Cards de imagem, thumbnails
radius-md:      12px    // Cards padrão, dropdowns
radius-lg:      16px    // Cards grandes
radius-xl:      20px    // Modais, painéis
radius-2xl:     24px    // Sheets, bottom sheets
radius-pill:    100px   // Inputs, botões pill, search bars
radius-full:    50%     // Avatares, ícones circulares
```

---

## 7. Sombras (Elevation)

### Dark Mode
```
shadow-dark-sm:     0 2px 8px rgba(0, 0, 0, 0.3)
shadow-dark-md:     0 4px 16px rgba(0, 0, 0, 0.4)
shadow-dark-lg:     0 10px 30px rgba(0, 0, 0, 0.5)
shadow-dark-xl:     0 20px 50px rgba(0, 0, 0, 0.8)
shadow-dark-glow:   0 0 20px rgba(0, 255, 102, 0.3)     // Glow verde neon
shadow-dark-glow-strong: 0 0 40px rgba(0, 255, 102, 0.6) // Glow forte
shadow-dark-inner:  inset 0 1px 1px rgba(255, 255, 255, 0.05)
```

### Light Mode
```
shadow-light-sm:    0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)
shadow-light-md:    0 4px 12px rgba(0, 0, 0, 0.08)
shadow-light-lg:    0 8px 24px rgba(0, 0, 0, 0.10)
shadow-light-xl:    0 16px 48px rgba(0, 0, 0, 0.12)
shadow-light-focus: 0 0 0 3px rgba(0, 204, 82, 0.25)     // Focus ring verde
shadow-light-inner: inset 0 1px 2px rgba(0, 0, 0, 0.05)
```

---

## 8. Efeitos & Glassmorphism

```
// Backdrop blur (glassmorphism)
blur-sm:       blur(8px)
blur-md:       blur(20px)
blur-lg:       blur(40px)
blur-header:   blur(24px)

// Saturação (header)
saturate-header:  saturate(1.8)

// Glass panels (dark)
glass-dark: {
  background: rgba(10, 10, 10, 0.96),
  backdrop-filter: blur(40px) saturate(180%),
  border: 1px solid rgba(255, 255, 255, 0.12),
  border-radius: 20px
}

// Glass panels (light)
glass-light: {
  background: rgba(255, 255, 255, 0.85),
  backdrop-filter: blur(40px) saturate(180%),
  border: 1px solid rgba(0, 0, 0, 0.06),
  border-radius: 20px
}

// Header bar
glass-header-dark: {
  background: rgba(0, 0, 0, 0.60),
  backdrop-filter: blur(24px) saturate(1.8),
  border-bottom: 1px solid rgba(255, 255, 255, 0.08)
}

glass-header-light: {
  background: rgba(255, 255, 255, 0.85),
  backdrop-filter: blur(24px) saturate(1.8),
  border-bottom: 1px solid rgba(0, 0, 0, 0.06)
}
```

---

## 9. Animações & Transitions

### 9.1 Easing Curves

```
ease-default:    cubic-bezier(0.25, 1, 0.5, 1)       // Suave, natural
ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1)   // Bounce sutil
ease-smooth:     cubic-bezier(0.4, 0, 0.2, 1)        // Material
ease-sharp:      cubic-bezier(0.4, 0, 0.6, 1)        // Rápido
```

### 9.2 Durações

```
duration-instant:   100ms   // Micro-interações (hover de cor)
duration-fast:      200ms   // Transições rápidas (botões, badges)
duration-normal:    300ms   // Transições padrão (modais, menus)
duration-slow:      400ms   // Animações de entrada (slides)
duration-slower:    500ms   // Animações complexas
```

### 9.3 Keyframes Padrão

```css
/* Entrada por baixo */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Entrada pela direita */
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(50px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* Fade in com escala */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

/* Pulse para loading */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.5; }
}

/* Shimmer para skeletons */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Marquee scroll contínuo */
@keyframes marqueeScroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
```

---

## 10. Breakpoints (Responsivo)

```
screen-xs:     0       // Mobile small
screen-sm:     360px   // Mobile
screen-md:     768px   // Tablet
screen-lg:     1024px  // Desktop
screen-xl:     1280px  // Desktop wide
screen-2xl:    1440px  // Desktop ultra-wide
```

---

## 11. Componentes

### 11.1 Botões

#### Variantes

**Primary (Verde neon)**
```
Dark Mode:
  bg: #00FF66, text: #121212, weight: 800
  hover: bg #00E65C, shadow glow
  active: scale(0.97)

Light Mode:
  bg: #00CC52, text: #121212, weight: 700   // Dark text para contraste 8.71:1
  hover: bg #00B548
  active: scale(0.97)
```

**Secondary (Outline)**
```
Dark Mode:
  bg: transparent, border: 2px solid #FFFFFF, text: #FFFFFF
  hover: bg #FFFFFF, text: #000000

Light Mode:
  bg: transparent, border: 2px solid #111111, text: #111111
  hover: bg #111111, text: #FFFFFF
```

**Ghost (Transparente)**
```
Dark Mode:
  bg: rgba(255,255,255,0.08), text: #FFFFFF
  hover: bg rgba(255,255,255,0.12)

Light Mode:
  bg: rgba(0,0,0,0.04), text: #111111
  hover: bg rgba(0,0,0,0.08)
```

**Danger**
```
bg: #FF3B30, text: #FFFFFF
hover: bg #E8352B
```

#### Tamanhos

```
btn-xs:   h-32px,  px-12px,  text-11px, radius-pill, gap-4px
btn-sm:   h-36px,  px-16px,  text-12px, radius-pill, gap-6px
btn-md:   h-44px,  px-20px,  text-14px, radius-pill, gap-8px
btn-lg:   h-52px,  px-28px,  text-16px, radius-pill, gap-10px
btn-xl:   h-60px,  px-36px,  text-18px, radius-pill, gap-12px
```

#### Estados

```
:disabled  → opacity: 0.4, cursor: not-allowed, pointer-events: none
:loading   → opacity: 0.7, spinner substituindo texto
:focus     → focus-ring (shadow-light-focus ou shadow-dark-glow)
```

---

### 11.2 Inputs

**Search Bar (Pill)**
```
Dark Mode:
  bg: rgba(255,255,255,0.08)
  border: 1px solid rgba(255,255,255,0.12)
  radius: 100px
  padding: 16px 55px 16px 24px
  text: #FFFFFF, placeholder: rgba(255,255,255,0.45)
  focus: bg rgba(20,20,20,0.95), border rgba(255,255,255,0.40)

Light Mode:
  bg: #F5F5F5
  border: 1px solid #E8E8E8
  radius: 100px
  padding: 16px 55px 16px 24px
  text: #111111, placeholder: #BBBBBB
  focus: bg #FFFFFF, border #00CC52, shadow focus-ring
```

**Text Input (Retangular)**
```
Dark Mode:
  bg: rgba(255,255,255,0.06)
  border: 1px solid rgba(255,255,255,0.12)
  radius: 12px
  padding: 14px 16px
  focus: border rgba(0,255,102,0.60)

Light Mode:
  bg: #FFFFFF
  border: 1px solid #D4D4D4
  radius: 12px
  padding: 14px 16px
  focus: border #00CC52, shadow focus-ring
```

**Select / Dropdown**
```
Mesmos estilos do Text Input, com ícone chevron-down à direita
Dropdown panel segue o estilo glass-dark ou glass-light
```

---

### 11.3 Cards de Evento

**Aspect Ratio:** 3:4 (retrato) — padrão para flyers de festa

```
Dark Mode:
  Container:
    bg: transparent
    radius: 12px (imagem) / nenhum (container)
    overflow: hidden

  Imagem:
    aspect-ratio: 3/4
    radius: 12px
    object-fit: cover
    transition: scale 300ms ease
    hover: scale(1.05)

  Overlay (hover):
    gradient-card-overlay no bottom
    padding: 12px

  Badge de status:
    position: absolute top-8 left-8
    bg: rgba(0,255,102,0.15)
    text: #00FF66
    radius: 4px
    padding: 2px 8px
    font: text-label-xs, weight 800, uppercase

  Info:
    title: text-body-md, weight 700, #FFFFFF, 1 line truncate
    date: text-label-md, #AAAAAA, uppercase
    city: text-body-sm, #777777, 1 line truncate
    price: text-price-sm, #00FF66, weight 700

Light Mode:
  Container:
    bg: #FFFFFF
    radius: 12px
    shadow: shadow-light-sm
    border: 1px solid #E8E8E8
    hover: shadow-light-md, translateY(-2px)

  Imagem: mesmos estilos
  Info: cores ajustadas para light-text-*
```

**Grid Layout:**
```
Mobile:   3 colunas, gap 12px
Tablet:   4 colunas, gap 16px
Desktop:  6 colunas, gap 16px
```

---

### 11.4 Header / Navbar

```
Dark Mode:
  Position: sticky top-0
  Glass effect: glass-header-dark
  Height: ~70px desktop, ~60px mobile
  Logo: max-width 160px desktop, 110px mobile
  z-index: 99

Light Mode:
  Glass effect: glass-header-light
  Mesma estrutura

Elementos:
  - Logo (left)
  - Search bar (center, hidden on mobile)
  - CTA "Acessar Canal" (right, bg brand-primary)
  - Menu hamburger (right, circle button)
```

---

### 11.5 Sidebar / Drawer Menu

```
Position: fixed right, fullscreen overlay
Width: 90% mobile, 40vw desktop (max 520px)
Border-radius: 25px left (mobile), 40px left (desktop)
Glass: glass-dark / glass-light
Animation: slide-in from right, 350ms ease-spring
Overlay: bg-overlay com blur(5px)

Navigation:
  Font: font-display
  Size: 1.5rem desktop, 1.2rem mobile
  Uppercase, weight 400
  Underline on hover (bottom, 2px, 400ms)
  Border-bottom: dark-border-default entre items
```

---

### 11.6 Marquee / Banner Promo

```
Background: #00FF66 (brand-primary)
Text: #121212 (brand-dark)
Height: ~40px
Font: text-label-md, uppercase
Animation: marqueeScroll 30s linear infinite (20s mobile)
Hover: animation-play-state paused
Fade edges: gradient mask 4% width on both sides
```

---

### 11.7 Badges & Tags

```
// Tag de categoria
tag-category: {
  bg: rgba(0,255,102,0.15),
  text: #00FF66 (dark) / #00CC52 (light),
  radius: 4px,
  padding: 2px 8px,
  font: text-label-xs, weight 800, uppercase
}

// Badge de status
badge-status: {
  bg: varies by status color (12% opacity),
  text: status color,
  radius: pill,
  padding: 4px 12px,
  font: text-label-sm, weight 700
}

// Counter badge (notificações)
badge-counter: {
  bg: #FF3B30,
  text: #FFFFFF,
  radius: full,
  min-width: 20px,
  height: 20px,
  font: text-label-xs, weight 800
}
```

---

### 11.8 Modais

```
Dark Mode:
  Overlay: rgba(0,0,0,0.60) + blur(5px)
  Panel: glass-dark
  Padding: 24px mobile, 32px desktop
  Max-width: 520px (small), 720px (medium), 960px (large)
  Animation: scaleIn 300ms ease-spring

Light Mode:
  Overlay: rgba(0,0,0,0.40) + blur(5px)
  Panel: glass-light, shadow-light-xl
  Demais: mesma estrutura
```

---

### 11.9 WhatsApp Floating Button

```
Position: fixed bottom-20 right-20
Size: 56px mobile, 60px desktop
Background: #25D366
Radius: full
Shadow: shadow-dark-md
Animation: pulse sutil no idle
Hover: scale(1.1)
z-index: 9990
```

---

### 11.10 Skeletons (Loading States)

```
Dark Mode:
  bg: #1A1A1A
  animation: pulse 2s ease infinite
  radius: segue o componente que está sendo carregado

Light Mode:
  bg: #F0F0F0
  animation: shimmer 1.5s ease infinite
  background-size: 200% 100%
```

---

### 11.11 Tabelas (Admin/Produtor — Light Mode)

```
Header:
  bg: #F5F5F5
  text: light-text-secondary
  font: text-label-md, weight 600, uppercase
  padding: 12px 16px

Row:
  bg: #FFFFFF
  border-bottom: 1px solid #E8E8E8
  padding: 14px 16px
  hover: bg #F9F9F9

Striped (alternativa):
  Row odd: #FFFFFF
  Row even: #FAFAFA
```

---

### 11.12 Sidebar Admin (Light Mode)

```
Width: 260px collapsed icon-only 72px
bg: light-bg-sidebar (#FCFCFC)
border-right: 1px solid #E8E8E8

Nav Item:
  padding: 10px 16px
  radius: 8px
  text: light-text-secondary
  icon: 20px, light-text-tertiary
  hover: bg #F0F0F0, text light-text-primary
  active: bg rgba(0,128,58,0.08), text #00803A, font-weight 600

Logo area: padding 20px, border-bottom #E8E8E8
```

---

### 11.13 Cards de Métricas (Dashboard Admin)

```
Container:
  bg: light-bg-secondary
  radius: 16px
  padding: 24px
  border: 1px solid #E8E8E8
  shadow: shadow-light-sm

Label: text-label-md, light-text-tertiary, uppercase
Value: text-display-md, light-text-primary, weight 800, font-mono
Trend: text-label-md, semantic-success (positivo) ou semantic-error (negativo)
Icon: 40px bg accent-bg, radius 12px
```

---

### 11.14 Formulário de Checkout (Dark)

```
Container:
  max-width: 600px centered
  bg: dark-bg-tertiary
  radius: 20px
  padding: 32px
  border: 1px solid dark-border-default

Stepper:
  Step circle: 32px, bg dark-bg-surface, text dark-text-tertiary
  Step active: bg #00FF66, text #121212
  Step completed: bg #00FF66, check icon
  Line: 2px solid dark-border-default (active: #00FF66)

Summary card:
  bg: dark-bg-elevated
  radius: 12px
  padding: 16px
  Event image: 48x64px, radius 8px
  Title: text-body-md, weight 600
  Details: text-body-sm, dark-text-secondary
  Price: text-price-lg, #00FF66, weight 800

CTA "Finalizar Compra":
  btn-xl, variant primary
  width: 100%
```

---

## 12. Iconografia

```
Biblioteca:     Lucide React (lucide-react)
Tamanho padrão: 20px (interface), 24px (navigation), 16px (inline)
Stroke:         2px
Style:          Outline (padrão), preenchido para estados ativos
```

---

## 13. Imagens & Mídia

```
// Aspect ratios
ratio-event-card:    3 / 4     // Cards de evento (retrato)
ratio-banner:        16 / 9    // Banners desktop
ratio-banner-wide:   21 / 9    // Hero banners
ratio-avatar:        1 / 1     // Avatares (artistas)
ratio-thumbnail:     16 / 9    // Thumbnails genéricos

// Placeholder backgrounds
placeholder-dark:    #1A1A1A
placeholder-light:   #F0F0F0

// Image treatment
object-fit: cover (padrão)
hover: scale(1.05) com transition 300ms
Lazy loading: IntersectionObserver com skeleton
```

---

## 14. Z-Index Scale

```
z-base:       0
z-dropdown:   10
z-sticky:     20
z-fixed:      30
z-overlay:    40
z-modal:      50
z-toast:      60
z-tooltip:    70
z-header:     99
z-sidebar:    9999
z-whatsapp:   9990
```

---

## 15. Acessibilidade

```
// Contraste mínimo
WCAG AA: 4.5:1 (texto normal), 3:1 (texto grande)

// Focus visible
Dark:  box-shadow 0 0 0 2px #00FF66
Light: box-shadow 0 0 0 3px rgba(0, 204, 82, 0.25)

// Reduzir movimento
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

// Min touch target
min-height: 44px, min-width: 44px (botões interativos mobile)
```

---

## 16. CSS Custom Properties (Implementação)

```css
:root {
  /* Brand */
  --tl-brand-primary: #00FF66;
  --tl-brand-dark: #121212;

  /* Spacing */
  --tl-space-1: 4px;
  --tl-space-2: 8px;
  --tl-space-3: 12px;
  --tl-space-4: 16px;
  --tl-space-6: 24px;
  --tl-space-8: 32px;

  /* Radius */
  --tl-radius-xs: 4px;
  --tl-radius-sm: 8px;
  --tl-radius-md: 12px;
  --tl-radius-lg: 16px;
  --tl-radius-xl: 20px;
  --tl-radius-pill: 100px;

  /* Typography */
  --tl-font-display: 'Monument Extended', 'Helvetica Now Display', sans-serif;
  --tl-font-body: 'Helvetica Now Display', 'Inter', -apple-system, sans-serif;
  --tl-font-mono: 'JetBrains Mono', 'SF Mono', monospace;

  /* Transitions */
  --tl-ease-default: cubic-bezier(0.25, 1, 0.5, 1);
  --tl-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --tl-duration-fast: 200ms;
  --tl-duration-normal: 300ms;

  /* Container */
  --tl-container-max: 1220px;
}

/* Dark Mode (default for ticketeria) */
[data-theme="dark"], .dark {
  --tl-bg-primary: #0A0A0A;
  --tl-bg-secondary: #121212;
  --tl-bg-tertiary: #1A1A1A;
  --tl-bg-elevated: #222222;
  --tl-bg-surface: #2A2A2A;

  --tl-text-primary: #FFFFFF;
  --tl-text-secondary: rgba(255, 255, 255, 0.70);
  --tl-text-tertiary: rgba(255, 255, 255, 0.45);
  --tl-text-accent: #00FF66;

  --tl-border-default: rgba(255, 255, 255, 0.08);
  --tl-border-medium: rgba(255, 255, 255, 0.12);
  --tl-border-focus: rgba(255, 255, 255, 0.40);

  --tl-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --tl-shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
  --tl-shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.5);
}

/* Light Mode (default for admin) */
[data-theme="light"], .light {
  --tl-bg-primary: #FAFAFA;
  --tl-bg-secondary: #FFFFFF;
  --tl-bg-tertiary: #F5F5F5;
  --tl-bg-elevated: #FFFFFF;
  --tl-bg-surface: #F0F0F0;

  --tl-text-primary: #111111;
  --tl-text-secondary: #555555;
  --tl-text-tertiary: #888888;
  --tl-text-accent: #00803A;

  --tl-border-default: #E8E8E8;
  --tl-border-medium: #D4D4D4;
  --tl-border-focus: #00803A;

  --tl-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
  --tl-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --tl-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.10);
}
```

---

## 17. Tailwind Config Tokens

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#00FF66',
          'primary-hover': '#00E65C',
          dark: '#121212',
        },
        dark: {
          bg: { primary: '#0A0A0A', secondary: '#121212', tertiary: '#1A1A1A', elevated: '#222222', surface: '#2A2A2A' },
          text: { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.70)', tertiary: 'rgba(255,255,255,0.45)' },
          border: { DEFAULT: 'rgba(255,255,255,0.08)', medium: 'rgba(255,255,255,0.12)', focus: 'rgba(255,255,255,0.40)' },
        },
        light: {
          bg: { primary: '#FAFAFA', secondary: '#FFFFFF', tertiary: '#F5F5F5', elevated: '#FFFFFF', surface: '#F0F0F0' },
          text: { primary: '#111111', secondary: '#555555', tertiary: '#888888' },
          border: { DEFAULT: '#E8E8E8', medium: '#D4D4D4', focus: '#00803A' },
        },
        semantic: {
          success: '#00FF66',
          error: '#FF3B30',
          warning: '#FFB800',
          info: '#007AFF',
        },
        ticket: {
          available: '#00FF66',
          'few-left': '#FFB800',
          'sold-out': '#FF3B30',
          'coming-soon': '#007AFF',
        },
      },
      fontFamily: {
        display: ['Monument Extended', 'Helvetica Now Display', 'sans-serif'],
        body: ['Helvetica Now Display', 'Inter', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        pill: '100px',
      },
      maxWidth: {
        container: '1220px',
      },
      aspectRatio: {
        'event-card': '3 / 4',
        'banner': '16 / 9',
        'banner-wide': '21 / 9',
      },
      transitionTimingFunction: {
        'tl-default': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'tl-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        slideUp: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: 0, transform: 'scale(0.95)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'slide-up': 'slideUp 0.4s ease-out both',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        shimmer: 'shimmer 1.5s ease infinite',
      },
    },
  },
}
```

---

## 18. Mapeamento de Telas

### Ticketeria (Dark Mode)
| Tela | Rota | Status |
|------|------|--------|
| Home | `/` | Novo |
| Lista de Eventos | `/eventos` | Novo |
| Evento por Tipo | `/tipos-de-evento/:slug` | Novo |
| Detalhe do Evento | `/evento/:slug` | Novo |
| Checkout | `/checkout/:id` | Novo |
| Meus Ingressos | `/meus-ingressos` | Novo |
| Busca | `/busca` | Novo |
| Login / Cadastro | `/login` | Novo |
| Perfil | `/perfil` | Novo |
| FAQ | `/faq` | Novo |
| Contato | `/contato` | Novo |
| Validador | `/validador` | Novo |

### Admin / Produtor (Light Mode + toggle dark)
| Tela | Rota | Status |
|------|------|--------|
| Dashboard | `/admin/dashboard` | Novo |
| Lista de Eventos | `/admin/eventos` | Novo |
| Criar/Editar Evento | `/admin/eventos/novo` | Novo |
| Vendas & Relatórios | `/admin/vendas` | Novo |
| Financeiro | `/admin/financeiro` | Novo |
| Check-in App | `/admin/checkin/:eventoId` | Novo |
| Gestão de Cupons | `/admin/cupons` | Novo |
| Usuários | `/admin/usuarios` | Novo |
| Configurações | `/admin/configuracoes` | Novo |
| Produtores | `/admin/produtores` | Novo |
| Time de Divulgação | `/admin/divulgacao` | Novo |

---

## 19. Checklist de Implementação

1. Configurar Tailwind com tokens acima
2. Implementar CSS custom properties para tema dinâmico
3. Criar componentes base: Button, Input, Card, Modal, Badge, Table
4. Implementar toggle de tema (localStorage + data-theme attribute)
5. Área ticketeria: forçar `data-theme="dark"`
6. Área admin: default `data-theme="light"`, toggle disponível
7. Testar contraste WCAG em todos os pares cor/fundo
8. Implementar prefers-reduced-motion
9. Validar touch targets (44px mínimo)
10. Performance: lazy loading de imagens, skeleton states

---

*Design System gerado a partir da análise completa do site betimelapse.com.br e código-fonte fornecido. Otimizado para uso profissional em produção.*
