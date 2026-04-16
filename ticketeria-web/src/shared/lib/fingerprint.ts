/**
 * Generate a simple browser fingerprint based on available signals.
 * Not as robust as FingerprintJS Pro, but sufficient for basic anti-fraud.
 */
export async function generateDeviceFingerprint(): Promise<string> {
  const components: string[] = [];

  // User agent
  components.push(navigator.userAgent);

  // Screen resolution
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform || 'unknown');

  // Hardware concurrency
  components.push(String(navigator.hardwareConcurrency || 0));

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('PulsePass', 2, 2);
      components.push(canvas.toDataURL().slice(-50));
    }
  } catch {
    components.push('no-canvas');
  }

  // Hash all components
  const raw = components.join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

let cachedFingerprint: string | null = null;

export async function getDeviceFingerprint(): Promise<string> {
  if (!cachedFingerprint) {
    cachedFingerprint = await generateDeviceFingerprint();
  }
  return cachedFingerprint;
}
