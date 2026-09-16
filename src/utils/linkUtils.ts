import { LinkItem, BannerPosition } from '../types';

/**
 * Ensures URL starts with http:// or https://
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Checks if the position is a card-style layout (like image 3)
 */
export function isCardPosition(position: BannerPosition): boolean {
  return (
    position === 'card-bottom-left' ||
    position === 'card-bottom-right' ||
    position === 'card-top-left' ||
    position === 'card-top-right'
  );
}

/**
 * Generate a smart slug based on target URL or custom slug
 * Supports alphanumeric and Korean characters, hyphens, and underscores
 */
export function generateSmartSlug(targetUrl: string, customSlug?: string): string {
  if (customSlug && customSlug.trim()) {
    const sanitized = customSlug.trim().replace(/[^a-zA-Z0-9가-힣_-]/g, '').toLowerCase();
    if (sanitized) return sanitized;
  }

  try {
    const urlObj = new URL(normalizeUrl(targetUrl));
    const hostParts = urlObj.hostname.replace('www.', '').split('.');
    const domainPrefix = hostParts[0] || 'link';
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${domainPrefix}-${randomSuffix}`;
  } catch {
    return Math.random().toString(36).substring(2, 8);
  }
}

/**
 * Encode a LinkItem to a shareable hash parameter string
 * This ensures that ANY user in ANY browser/device can open the link
 * and see the exact target URL and banner, even without local storage!
 */
export function encodeLinkToPayload(link: LinkItem): string {
  const payload = {
    s: link.slug,
    t: link.targetUrl,
    l: link.logoUrl || '',
    h: link.headline,
    st: link.subtext || '',
    bt: link.btnText,
    bu: link.btnUrl,
    bg: link.bgColor,
    bc: link.btnColor,
    b: link.badgeText || '',
    p: link.position,
  };

  try {
    const jsonStr = JSON.stringify(payload);
    // URL-safe base64
    const base64 = btoa(encodeURIComponent(jsonStr));
    return base64;
  } catch {
    return link.slug;
  }
}

/**
 * Get optimized URL for embedding inside an iframe
 * Passes all external URLs through our secure server proxy to strip X-Frame-Options,
 * Content-Security-Policy frame-ancestors, and frame-busting scripts.
 */
export function getEmbedTargetUrl(targetUrl: string): string {
  const normalized = normalizeUrl(targetUrl);
  if (!normalized) return '';

  // All external URLs must be proxied so browsers will not block them with "refused to connect"
  return `/api/proxy?url=${encodeURIComponent(normalized)}`;
}

/**
 * Decode a LinkItem from hash payload or query (legacy fallback support)
 */
export function decodeLinkFromPayload(raw: string): Partial<LinkItem> | null {
  try {
    // Clean up if encoded or contains spaces from + signs
    let sanitized = decodeURIComponent(raw.trim());
    if (sanitized.includes('&')) {
      sanitized = sanitized.split('&')[0];
    }
    // Base64 decoding
    const decoded = decodeURIComponent(atob(sanitized));
    const data = JSON.parse(decoded);
    if (!data.t || !data.h) return null;

    return {
      slug: data.s || 'link',
      targetUrl: normalizeUrl(data.t),
      logoUrl: data.l ? normalizeUrl(data.l) : '',
      headline: data.h,
      subtext: data.st || '',
      btnText: data.bt || '보러가기',
      btnUrl: normalizeUrl(data.bu || ''),
      bgColor: data.bg || '#ffffff',
      btnColor: data.bc || '#ef4444',
      badgeText: data.b || '',
      position: (data.p as BannerPosition) || 'card-bottom-left',
    };
  } catch {
    return null;
  }
}

/**
 * Get slug from current URL (supports /l/:slug, /r/:slug, and #slug)
 */
export function getSlugFromCurrentUrl(): { slug: string | null; isPublicViewer: boolean } {
  if (typeof window === 'undefined') {
    return { slug: null, isPublicViewer: false };
  }

  let pathname = window.location.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {}
  let hash = window.location.hash;
  try {
    hash = decodeURIComponent(hash);
  } catch {}

  // Path check: /l/:slug
  const lMatch = pathname.match(/^\/l\/([^/?#]+)/i);
  if (lMatch && lMatch[1]) {
    return { slug: lMatch[1].toLowerCase().trim(), isPublicViewer: true };
  }

  // Path check: /r/:slug
  const rMatch = pathname.match(/^\/r\/([^/?#]+)/i);
  if (rMatch && rMatch[1]) {
    return { slug: rMatch[1].toLowerCase().trim(), isPublicViewer: true };
  }

  // Direct path check: /:slug (e.g. /en-b2cr, excluding reserved root/system paths)
  const directMatch = pathname.match(/^\/([^/?#]+)$/i);
  if (directMatch && directMatch[1]) {
    const candidate = directMatch[1].toLowerCase().trim();
    const reserved = [
      '',
      'api',
      'assets',
      'favicon.ico',
      'builder',
      'admin',
      'home',
      'dashboard',
      'index.html',
      'robots.txt',
      'sitemap.xml',
    ];
    if (!reserved.includes(candidate)) {
      return { slug: candidate, isPublicViewer: true };
    }
  }

  // Hash check: /#slug, /#l/slug, /#/l/slug
  if (hash && hash.length > 1) {
    const cleanHash = hash.replace(/^#\/?/, '').split('&')[0].split('?')[0].trim().toLowerCase();
    const reserved = ['builder', 'home', 'dashboard', 'admin', ''];
    if (cleanHash && !reserved.includes(cleanHash)) {
      const slug = cleanHash.replace(/^(l|r|v|view|visitor|preview)\//i, '');
      if (slug) {
        return { slug, isPublicViewer: true };
      }
    }
  }

  return { slug: null, isPublicViewer: false };
}

export const CUSTOM_DOMAIN_STORAGE_KEY = 'linkoverlay_custom_domain';

/**
 * Checks if current origin is an internal AI Studio developer preview domain
 * (which requires Google developer login cookies and triggers "Cookie check" on external scrapers/users)
 */
export function isDevContainerOrigin(origin?: string): boolean {
  const target = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return target.includes('ais-dev-');
}

/**
 * Gets the user-saved public base domain (e.g. https://ais-pre-... or custom domain)
 */
export function getSavedDomain(): string {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem(CUSTOM_DOMAIN_STORAGE_KEY) || '').trim().replace(/\/+$/, '');
}

/**
 * Sets or clears the saved public base domain
 */
export function setSavedDomain(domain: string): void {
  if (typeof window === 'undefined') return;
  const clean = domain.trim().replace(/\/+$/, '');
  if (clean) {
    localStorage.setItem(CUSTOM_DOMAIN_STORAGE_KEY, clean);
  } else {
    localStorage.removeItem(CUSTOM_DOMAIN_STORAGE_KEY);
  }
}

/**
 * Suggests the public shared domain if currently in ais-dev-
 */
export function getRecommendedPublicDomain(): string {
  if (typeof window === 'undefined') return '';
  const current = window.location.origin;
  if (current.includes('ais-dev-')) {
    return current.replace('ais-dev-', 'ais-pre-');
  }
  return current;
}

/**
 * Gets effective public base origin for link generation
 */
export function getEffectiveBaseOrigin(): string {
  const saved = getSavedDomain();
  if (saved) return saved;
  return typeof window !== 'undefined' ? window.location.origin : '';
}

/**
 * Build the shareable banner short URL based on current domain (window.location.origin).
 * Produces clean, short URLs like: https://your-domain.vercel.app/l/blog-hamr
 */
export function buildShareUrl(link: LinkItem, customOrigin?: string): string {
  let origin = customOrigin;
  if (!origin && typeof window !== 'undefined') {
    origin = window.location.origin;
  }
  if (!origin) {
    origin = getEffectiveBaseOrigin();
  }
  origin = (origin || '').trim().replace(/\/+$/, '');
  const cleanSlug = (link.slug || 'link').trim().replace(/^\/+/, '');
  return `${origin}/l/${cleanSlug}`;
}

/**
 * Clean short URL without data payload query string (for display)
 */
export function buildCleanShareUrl(link: LinkItem, customOrigin?: string): string {
  return buildShareUrl(link, customOrigin);
}

/**
 * Returns the direct share URL (/l/:slug) without external shortening services
 */
export async function fetchUltraShortUrl(
  fullUrl: string,
  alias?: string,
  _linkId?: string
): Promise<string | null> {
  if (alias) {
    return `${getEffectiveBaseOrigin()}/l/${alias}`;
  }
  return fullUrl;
}

/**
 * Robust copy-to-clipboard function supporting both modern navigator.clipboard
 * and legacy fallback (essential inside iframe sandboxes).
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // proceed to fallback
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

