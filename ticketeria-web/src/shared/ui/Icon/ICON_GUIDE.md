# Icon Component Guide

The `Icon` component is a lightweight, reusable SVG icon system for the Ticketeria web app. It provides 34 carefully designed Lucide-style icons with full TypeScript support.

## Usage

### Basic Import

```typescript
import { Icon } from '@shared/ui';
```

### Basic Example

```tsx
import { Icon } from '@shared/ui';

export function MyComponent() {
  return (
    <div>
      <Icon name="search" size={24} />
      <Icon name="menu" />
      <Icon name="check" className="text-green-500" />
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `IconName` | Required | The icon identifier (e.g., 'search', 'menu') |
| `size` | `number` | 20 | Width and height in pixels |
| `className` | `string` | - | Additional CSS classes to apply |
| `...props` | `SVGAttributes` | - | Any valid SVG attributes (aria-label, title, etc.) |

## Color Handling

Icons use `currentColor` for stroke/fill, so they inherit the text color from their parent:

```tsx
// Icon inherits red color from parent
<div style={{ color: 'red' }}>
  <Icon name="heart" />
</div>

// Override with Tailwind
<Icon name="star" className="text-blue-500" />

// Or inline style
<Icon name="check" style={{ color: '#10b981' }} />
```

## Complete Icon List

### Navigation/UI (8 icons)
- `menu` - Hamburger menu icon
- `close` - Close/dismiss icon (alternative: `x`)
- `x` - Close/dismiss icon (alias for `close`)
- `chevron-left` - Left arrow/chevron
- `chevron-right` - Right arrow/chevron
- `check` - Checkmark
- `plus` - Plus/add icon
- `logout` - Logout/exit icon

### Content (6 icons)
- `search` - Search/magnifying glass
- `eye` - Show/visibility icon
- `eye-off` - Hide/visibility off icon
- `edit` - Edit/pencil icon
- `trash` - Delete/trash icon
- `download` - Download icon

### Status/Feedback (9 icons)
- `heart` - Heart/like icon (outline)
- `heart-filled` - Heart/like icon (filled)
- `info` - Information/help icon
- `warning` - Warning/alert icon
- `error` - Error icon (alternative: `x-circle`)
- `x-circle` - Error icon (alias for `error`)
- `ban` - Ban/prohibited icon
- `success` - Success/checkmark icon (alternative: `check-circle`)
- `check-circle` - Success/checkmark icon (alias for `success`)

### Domain (11 icons)
- `calendar` - Calendar/date icon
- `map-pin` - Location/pin icon
- `ticket` - Ticket/event icon
- `users` - Multiple users/team icon
- `user` - Single user/profile icon
- `dollar-sign` - Currency/money icon
- `bar-chart` - Chart/analytics icon
- `shopping-bag` - Shopping/cart icon
- `dashboard` - Dashboard/grid icon
- `qr-code` - QR code icon
- `credit-card` - Payment/card icon
- `file-text` - Document/text file icon

## Size Guidelines

```tsx
// Small (16px) - for inline text or compact layouts
<Icon name="check" size={16} />

// Regular (20px) - default, suitable for most UI elements
<Icon name="menu" />

// Medium (24px) - for button icons
<Icon name="search" size={24} />

// Large (32px) - for prominent UI elements
<Icon name="home" size={32} />
```

## Type Safety

The component exports an `IconName` type union for full TypeScript support:

```typescript
import { Icon, type IconName } from '@shared/ui';

type MyIconProps = {
  icon: IconName;
  size?: number;
};

export function IconButton({ icon, size = 20 }: MyIconProps) {
  return <Icon name={icon} size={size} />;
}
```

## With Accessibility

Add accessible labels using standard SVG attributes:

```tsx
// With aria-label
<Icon name="search" aria-label="Search products" />

// With title attribute (shows on hover)
<Icon name="heart" title="Add to favorites" />

// For screen readers
<Icon name="warning" role="img" aria-label="Warning: Check your input" />
```

## In Buttons

Common pattern with button components:

```tsx
import { Button } from '@shared/ui';
import { Icon } from '@shared/ui';

export function IconButton() {
  return (
    <Button variant="ghost" size="sm">
      <Icon name="menu" size={24} />
    </Button>
  );
}
```

## Performance Notes

- All icons are rendered as inline SVG elements
- Icons inherit CSS variables for theming (via currentColor)
- No external dependencies (Lucide-react not required)
- Tree-shakeable - only used icons are included in the bundle
- Minimal CSS footprint (only flex/layout properties)

## Icon Structure

Each icon is defined as a React element with proper SVG attributes:
- `viewBox="0 0 24 24"` - Standard icon canvas
- `fill="none"` - No fill by default (use stroke)
- `stroke="currentColor"` - Inherits text color
- `strokeWidth="2"` - Consistent line weight
- `strokeLinecap="round"` - Rounded line endings
- `strokeLinejoin="round"` - Rounded line joins

Special icons use `fill="currentColor"` for filled shapes:
- `heart-filled`
- `user`

## CSS Module

The component uses a minimal CSS module (`Icon.module.css`):

```css
.icon {
  display: inline-flex;
  vertical-align: middle;
  flex-shrink: 0;
}
```

This ensures:
- Icons render as flex items for proper alignment
- Vertical centering in text contexts
- Prevention of icon shrinking in flex containers

## Adding New Icons

To add a new icon:

1. Add the icon name to the `IconName` type union
2. Add the SVG path/elements to the `icons` object
3. Follow the SVG format (viewBox 0 0 24 24, stroke/fill properties)
4. Test in the component with different sizes and colors

Example:

```typescript
// In IconName type
| 'new-icon-name'

// In icons object
'new-icon-name': (
  <path d="M..." />
),
```
