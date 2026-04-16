/**
 * Icon Component Usage Examples
 *
 * This file demonstrates common usage patterns for the Icon component.
 * These are examples and can be used as a reference during implementation.
 */

import { Icon } from './Icon';

/**
 * Basic usage with default size (20px)
 */
export function BasicIconExample() {
  return (
    <div>
      <Icon name="search" />
      <Icon name="menu" />
      <Icon name="check" />
    </div>
  );
}

/**
 * Icons with custom sizes
 */
export function SizedIconsExample() {
  return (
    <div>
      <Icon name="search" size={16} /> {/* Small */}
      <Icon name="search" size={20} /> {/* Medium (default) */}
      <Icon name="search" size={24} /> {/* Large */}
      <Icon name="search" size={32} /> {/* Extra large */}
    </div>
  );
}

/**
 * Icons with color inheritance from parent
 */
export function ColorInheritanceExample() {
  return (
    <div>
      {/* Icon inherits red color */}
      <div style={{ color: 'red' }}>
        <Icon name="heart" />
      </div>

      {/* Icon inherits green color */}
      <div style={{ color: 'green' }}>
        <Icon name="check" />
      </div>

      {/* Icon inherits blue color */}
      <div style={{ color: 'blue' }}>
        <Icon name="info" />
      </div>
    </div>
  );
}

/**
 * Icons with CSS classes for styling
 */
export function ClassNameExample() {
  return (
    <div>
      {/* Using inline styles */}
      <Icon name="search" className="text-blue-500" />

      {/* Using CSS variables */}
      <Icon name="menu" className="text-accent" />

      {/* Using custom classes */}
      <Icon name="check" className="icon-success" />
    </div>
  );
}

/**
 * Icons in buttons
 */
export function IconButtonExample() {
  return (
    <div>
      {/* Icon button for search */}
      <button className="btn-icon" title="Search">
        <Icon name="search" size={20} />
      </button>

      {/* Icon button for menu */}
      <button className="btn-icon" title="Menu">
        <Icon name="menu" size={24} />
      </button>

      {/* Icon button for close */}
      <button className="btn-icon" title="Close">
        <Icon name="close" size={20} />
      </button>
    </div>
  );
}

/**
 * Icons in form fields
 */
export function IconInFormExample() {
  return (
    <div className="form-group">
      <div className="input-wrapper">
        <Icon name="search" size={20} className="input-icon" />
        <input type="text" placeholder="Search..." />
      </div>

      <div className="input-wrapper">
        <Icon name="edit" size={20} className="input-icon" />
        <input type="password" placeholder="Password..." />
      </div>
    </div>
  );
}

/**
 * Icons with accessibility attributes
 */
export function AccessibleIconExample() {
  return (
    <div>
      {/* With aria-label for screen readers */}
      <button>
        <Icon name="search" aria-label="Search products" />
      </button>

      {/* With aria-description for accessibility */}
      <div>
        <Icon name="info" aria-describedby="info-text" />
        <span id="info-text">Information</span>
      </div>

      {/* With role and aria-label */}
      <div role="img" aria-label="Success">
        <Icon name="check-circle" />
      </div>
    </div>
  );
}

/**
 * Status indicators using icons
 */
export function StatusIndicatorExample() {
  return (
    <div className="status-list">
      {/* Success status */}
      <div className="status-item">
        <Icon name="check-circle" className="text-green-500" />
        <span>Order confirmed</span>
      </div>

      {/* Warning status */}
      <div className="status-item">
        <Icon name="warning" className="text-yellow-500" />
        <span>Action required</span>
      </div>

      {/* Error status */}
      <div className="status-item">
        <Icon name="error" className="text-red-500" />
        <span>Payment failed</span>
      </div>

      {/* Info status */}
      <div className="status-item">
        <Icon name="info" className="text-blue-500" />
        <span>New update available</span>
      </div>
    </div>
  );
}

/**
 * Navigation menu with icons
 */
export function NavigationMenuExample() {
  return (
    <nav className="navbar">
      <ul className="nav-list">
        <li className="nav-item">
          <Icon name="ticket" />
          <span>Tickets</span>
        </li>

        <li className="nav-item">
          <Icon name="calendar" />
          <span>Events</span>
        </li>

        <li className="nav-item">
          <Icon name="user" />
          <span>Profile</span>
        </li>

        <li className="nav-item">
          <Icon name="shopping-bag" />
          <span>Cart</span>
        </li>
      </ul>
    </nav>
  );
}

/**
 * Icon with text inline
 */
export function IconWithTextExample() {
  return (
    <div>
      {/* Icon before text */}
      <p>
        <Icon name="map-pin" size={16} className="mr-2" />
        <span>New York, NY</span>
      </p>

      {/* Icon after text */}
      <button>
        <span>Download</span>
        <Icon name="download" size={16} className="ml-2" />
      </button>

      {/* Inline icon */}
      <label>
        <Icon name="check" size={16} className="mr-2" />
        <span>I agree to the terms</span>
      </label>
    </div>
  );
}

/**
 * Dynamic icon selection
 */
export function DynamicIconExample() {
  const getStatusIcon = (status: 'success' | 'error' | 'warning' | 'info') => {
    const iconMap = {
      success: 'check-circle' as const,
      error: 'x-circle' as const,
      warning: 'warning' as const,
      info: 'info' as const,
    };
    return iconMap[status];
  };

  return (
    <div className="notification">
      <Icon name={getStatusIcon('success')} size={24} />
      <p>Your changes have been saved!</p>
    </div>
  );
}

/**
 * Icon grid showcase
 */
export function IconGridExample() {
  const icons = [
    'menu', 'search', 'check', 'plus', 'logout',
    'eye', 'edit', 'trash', 'download', 'heart',
    'info', 'warning', 'error', 'calendar', 'user',
  ] as const;

  return (
    <div className="icon-grid">
      {icons.map((iconName) => (
        <div key={iconName} className="icon-cell">
          <Icon name={iconName} size={32} />
          <p>{iconName}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Icon with loading animation (example with CSS)
 */
export function IconLoadingExample() {
  return (
    <div>
      {/* Spinning icon for loading */}
      <div className="spinner-icon">
        <Icon name="dashboard" size={32} />
      </div>

      {/* Pulsing icon for attention */}
      <div className="pulse-icon">
        <Icon name="warning" size={32} />
      </div>
    </div>
  );
}

/**
 * Icons in data table
 */
export function IconInTableExample() {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Event</th>
          <th>Date</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Summer Concert</td>
          <td>
            <Icon name="calendar" size={16} /> 06/15/2024
          </td>
          <td>
            <Icon name="check-circle" size={16} className="text-green-500" />
          </td>
          <td>
            <button className="icon-btn">
              <Icon name="edit" size={16} />
            </button>
            <button className="icon-btn">
              <Icon name="trash" size={16} />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
