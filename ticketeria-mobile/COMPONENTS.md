# Ticketeria Mobile - Reusable Components

This document summarizes all the reusable components created for the Ticketeria Mobile app.

## Components Overview

All components are located in `src/components/` and can be imported from the central export file:

```typescript
import {
  EventCard,
  Button,
  Input,
  Badge,
  QRTicket,
  CategoryChip,
  Skeleton,
  EmptyState,
  PaymentMethodSelector,
  Header,
} from '@/components';
```

### 1. EventCard.tsx
Reusable event card component for displaying event summaries.

**Props:**
- `event: EventSummary` - Event data
- `onPress: (event: EventSummary) => void` - Press handler
- `size?: 'normal' | 'large'` - Card size variant

**Features:**
- Image with border radius and fallback
- Title, date, venue, price display
- 5-star rating system with review count
- Category badge
- "Ultimos ingressos" urgency badge (when <20% tickets remaining)
- Material shadow/elevation
- Large variant (280x380) for horizontal scrolling
- Normal variant full-width for vertical lists
- Original price with strikethrough when on sale

### 2. Button.tsx
Flexible button component with multiple variants and states.

**Props:**
- `title: string` - Button text
- `onPress: () => void | Promise<void>` - Press handler
- `variant?: 'primary' | 'secondary' | 'danger' | 'ghost'` - Button style
- `size?: 'sm' | 'md' | 'lg'` - Button size
- `loading?: boolean` - Loading state with ActivityIndicator
- `disabled?: boolean` - Disabled state
- `icon?: React.ReactNode` - Optional icon
- `style?: ViewStyle` - Additional styles

**Features:**
- Primary (accent color), Secondary, Danger, and Ghost variants
- Loading state with spinner
- Haptic feedback on press (expo-haptics)
- Disabled state styling
- Responsive sizing (sm: 32px, md: 44px, lg: 52px)

### 3. Input.tsx
Text input component with error states and validation feedback.

**Props:**
- `label?: string` - Input label
- `placeholder?: string` - Placeholder text
- `value: string` - Current value
- `onChangeText: (text: string) => void` - Change handler
- `error?: string` - Error message
- `secureTextEntry?: boolean` - Password field
- `keyboardType?: KeyboardTypeOptions` - Keyboard type
- `icon?: React.ReactNode` - Leading icon
- `disabled?: boolean` - Disabled state
- `style?: ViewStyle` - Additional styles

**Features:**
- Dark-themed styling with light background
- Focus border color change (primary color)
- Error state with red text below input
- Optional leading icon
- Secure text entry for passwords
- Disabled state support

### 4. Badge.tsx
Small status badge component for categorization and status indication.

**Props:**
- `text: string` - Badge text
- `variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral'` - Badge style
- `style?: ViewStyle` - Additional styles

**Features:**
- Five color-coded variants
- Rounded pill shape
- Color tokens:
  - success: Green
  - danger: Red
  - warning: Yellow
  - info: Blue
  - neutral: Gray

### 5. QRTicket.tsx
Interactive QR code ticket component with time-based code rotation.

**Props:**
- `ticketHash: string` - Unique ticket identifier
- `totpSecret: string` - TOTP secret for code generation
- `holderName?: string` - Ticket holder name
- `batchId?: string` - Batch identifier
- `style?: ViewStyle` - Additional styles
- `onScreenshotAttempt?: () => void` - Screenshot detection callback

**Features:**
- Dynamic QR code combining ticket hash and TOTP code
- TOTP (Time-based One-Time Password) generation every 30 seconds
- Circular countdown timer animation (0-30 seconds)
- Animated timer using Animated API
- 6-digit TOTP display
- Holder name and batch information
- Anti-screenshot warning message
- Header: "Seu ingresso digital"
- Responsive design with shadows

### 6. CategoryChip.tsx
Filter chip component for category selection.

**Props:**
- `label: string` - Chip label
- `selected?: boolean` - Selection state
- `onPress: () => void` - Press handler
- `style?: ViewStyle` - Additional styles

**Features:**
- Toggle selection on press
- Selected state: Primary color background, white text
- Unselected state: Surface color with border
- Rounded pill shape
- Used for filtering events by category

### 7. Skeleton.tsx
Loading skeleton component with shimmer animation.

**Props:**
- `width?: number | string` - Skeleton width (default: '100%')
- `height: number` - Skeleton height (required)
- `borderRadius?: number` - Border radius
- `style?: ViewStyle` - Additional styles

**Features:**
- Animated shimmer effect using Animated API
- Pulse opacity from 0.3 to 0.7
- 2-second animation cycle
- Used during content loading
- Customizable dimensions and border radius

### 8. EmptyState.tsx
Empty state display component for no results/data states.

**Props:**
- `title: string` - Main title
- `description?: string` - Description text
- `icon?: React.ReactNode` - Optional icon
- `style?: ViewStyle` - Additional styles

**Features:**
- Centered layout
- Customizable icon (e.g., SVG)
- Large title (h4) and body description
- Used for empty lists, no results, etc.

### 9. PaymentMethodSelector.tsx
Radio group component for payment method selection.

**Props:**
- `selected: PaymentMethodType` - Currently selected method
- `onSelect: (method: PaymentMethodType) => void` - Selection handler
- `style?: ViewStyle` - Additional styles

**Type Definition:**
```typescript
type PaymentMethodType = 'pix' | 'credit_card' | 'boleto';
```

**Features:**
- Three payment methods: PIX, Cartao de Credito, Boleto
- Radio button selection
- Custom icons for each method
- "Recomendado" badge on PIX option
- Descriptions:
  - PIX: "Instantaneo"
  - Credit Card: "Parcelado em ate 12x"
  - Boleto: "Bancario"
- Selected state styling with primary color
- Material shadows

### 10. Header.tsx
Custom navigation header with safe area support.

**Props:**
- `title: string` - Header title
- `showBack?: boolean` - Show back button
- `onBackPress?: () => void` - Back button handler
- `rightAction?: React.ReactNode` - Right action component
- `style?: ViewStyle` - Additional styles

**Features:**
- Safe area aware (top, left, right insets)
- Centered title
- Left-aligned back arrow button (← character)
- Right action button area
- Proper hit slop for touch targets
- Bottom border separator
- Professional spacing and typography

## Styling Strategy

All components use:
- **Color Tokens:** From `src/styles/tokens.ts` (primary, secondary, status colors)
- **Spacing:** Standardized spacing scale (xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32)
- **Typography:** Predefined font sizes and weights (h1-h5, body, caption)
- **Border Radius:** Consistent radius values (sm: 4, md: 8, lg: 12, xl: 16, xxl: 24, full: 9999)
- **Shadows:** Predefined elevation shadows (none, sm, md, lg)

All components use `StyleSheet.create()` for performance optimization.

## Installation Requirements

While npm install is not used, ensure your project has these dependencies already installed:

- `react-native`
- `react-native-safe-area-context` (for Header)
- `expo-haptics` (for Button feedback)
- `expo` (Expo framework)
- `react-native-qrcode-svg` (for QRTicket)

## Language

All text content in components is in Portuguese (pt-BR):
- "Ultimos ingressos" (Last tickets)
- "Seu ingresso digital" (Your digital ticket)
- "Portador" (Holder)
- "Lote" (Batch)
- "Nao compartilhe seu ingresso" (Don't share your ticket)
- "Codigo temporal" (Time-based code)
- And payment method labels

## Type Definitions

Core types used across components are defined in `src/types/index.ts`:
- `EventSummary` - Event summary for cards
- `Ticket` - Full ticket information
- And many more...

See `src/types/index.ts` for complete type definitions.
