import React, { useState, useEffect, useMemo } from 'react';
import { LinkItem, BannerPosition } from './types';
import { INITIAL_LINKS } from './data/sampleData';
import { Header } from './components/Header';
import { LinkBuilderForm, FormState } from './components/LinkBuilderForm';
import { LinkList } from './components/LinkList';
import { DevicePreview } from './components/DevicePreview';
import { VisitorView } from './components/VisitorView';
import { ToastContainer, ToastMessage } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import {
  normalizeUrl,
  generateSmartSlug,
  buildShareUrl,
  decodeLinkFromPayload,
  getSlugFromCurrentUrl,
  copyTextToClipboard,
  fetchUltraShortUrl,
} from './utils/linkUtils';

function sanitizeLinkItem(item: any, fallbackIndex = 0): LinkItem {
  return {
    id: String(item.id || `link_${item.slug || fallbackIndex}_${Date.now()}`),
    slug: String(item.slug || `slug-${fallbackIndex}`),
    targetUrl: String(item.targetUrl || ''),
    headline: String(item.headline || '제목 없음'),
    btnText: String(item.btnText || '보러가기'),
    btnUrl: String(item.btnUrl || ''),
    bgColor: String(item.bgColor || '#ffffff'),
    btnColor: String(item.btnColor || '#ef4444'),
    position: item.position || 'card-bottom-left',
    badgeText: item.badgeText ? String(item.badgeText) : '',
    subtext: item.subtext ? String(item.subtext) : '',
    logoUrl: item.logoUrl ? String(item.logoUrl) : '',
    clicks: typeof item.clicks === 'number' && !isNaN(item.clicks) ? item.clicks : 0,
    createdAt: String(item.createdAt || new Date().toLocaleDateString('ko-KR')),
    shortUrl:
      item.shortUrl && !String(item.shortUrl).includes('tinyurl.com')
        ? String(item.shortUrl)
        : undefined,
  };
}

export default function App() {
  // Check if current page has inline encoded payload ?d=...
  const inlinePayloadLink = useMemo<LinkItem | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      let d = searchParams.get('d');
      if (!d && window.location.hash && window.location.hash.includes('?')) {
        const queryPart = window.location.hash.split('?')[1];
        d = new URLSearchParams(queryPart).get('d');
      }
      if (d) {
        const decoded = decodeLinkFromPayload(d);
        if (decoded && decoded.targetUrl && decoded.headline) {
          return {
            id: `link_${decoded.slug || 'direct'}_${Date.now()}`,
            slug: decoded.slug || 'link',
            targetUrl: decoded.targetUrl,
            logoUrl: decoded.logoUrl || '',
            headline: decoded.headline,
            subtext: decoded.subtext || '',
            btnText: decoded.btnText || '보러가기',
            btnUrl: decoded.btnUrl || '',
            bgColor: decoded.bgColor || '#ffffff',
            btnColor: decoded.btnColor || '#ef4444',
            badgeText: decoded.badgeText || '',
            position: decoded.position || 'card-bottom-left',
            clicks: 0,
            createdAt: new Date().toLocaleDateString('ko-KR'),
          };
        }
      }
    } catch {}
    return null;
  }, []);

  // Check if current page has server-preloaded link data or is accessed as a visitor via short link (/l/:slug or #slug)
  const rawPreloaded: any =
    typeof window !== 'undefined' ? (window as any).__PRELOADED_LINK__ || null : null;
  const preloadedLink: LinkItem | null = rawPreloaded ? sanitizeLinkItem(rawPreloaded) : null;
  const initialUrlInfo = getSlugFromCurrentUrl();

  // Load links from localStorage (clean of any sample/demo data)
  const [links, setLinks] = useState<LinkItem[]>(() => {
    let baseList: LinkItem[] = [];
    try {
      const saved = localStorage.getItem('overlay_links');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out legacy sample links
          baseList = parsed.filter(
            (l) =>
              l &&
              l.id !== 'link_init_1' &&
              l.id !== 'link_init_2' &&
              !String(l.id).startsWith('link_init_') &&
              l.slug !== 'why-not' &&
              l.slug !== 'clean3s'
          );
        }
      }
    } catch {
      // Fallback
    }

    if (inlinePayloadLink) {
      const filtered = baseList.filter(
        (l) => l.slug.toLowerCase() !== inlinePayloadLink.slug.toLowerCase()
      );
      return [inlinePayloadLink, ...filtered];
    }
    if (preloadedLink) {
      const filtered = baseList
        .filter((l) => l.id !== preloadedLink.id && l.slug !== preloadedLink.slug)
        .map((l, i) => sanitizeLinkItem(l, i));
      return [preloadedLink, ...filtered];
    }
    return baseList.map((l, i) => sanitizeLinkItem(l, i));
  });

  // Whether the app is running in public visitor mode (when accessed via /l/:slug by external visitors)
  const [isPublicVisitor, setIsPublicVisitor] = useState<boolean>(() => {
    if (inlinePayloadLink) return true;
    if (preloadedLink) return true;
    return initialUrlInfo.isPublicViewer;
  });

  const [activeLinkId, setActiveLinkId] = useState<string | null>(() => {
    if (inlinePayloadLink) return inlinePayloadLink.id;
    if (preloadedLink) return preloadedLink.id;
    if (initialUrlInfo.isPublicViewer && initialUrlInfo.slug) {
      const match = links.find((l) => l.slug.toLowerCase() === initialUrlInfo.slug?.toLowerCase());
      if (match) return match.id;
      return null;
    }
    return links.length > 0 ? links[0].id : null;
  });

  const [isVisitorLoading, setIsVisitorLoading] = useState<boolean>(() => {
    if (inlinePayloadLink) return false;
    if (!initialUrlInfo.isPublicViewer) return false;
    if (preloadedLink) return false;
    if (initialUrlInfo.slug) {
      return !links.some((l) => l.slug.toLowerCase() === initialUrlInfo.slug?.toLowerCase());
    }
    return false;
  });

  // Track the most recently created or selected link
  const [recentLink, setRecentLink] = useState<LinkItem | null>(() => {
    if (inlinePayloadLink) return inlinePayloadLink;
    if (preloadedLink) return preloadedLink;
    return links.length > 0 ? links[0] : null;
  });

  // Dedicated newly created link state for immediate celebration and copy banner
  const [newlyCreatedLink, setNewlyCreatedLink] = useState<LinkItem | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete Confirmation Modal State (replaces blocked window.confirm)
  const [deleteConfirm, setDeleteConfirm] = useState<
    | { type: 'single'; id: string; title: string }
    | { type: 'all'; count: number }
    | null
  >(null);

  // Form state initialized cleanly without sample data
  const [formState, setFormState] = useState<FormState>({
    targetUrl: '',
    customSlug: '',
    logoUrl: '',
    headline: '',
    subtext: '',
    btnText: '보러가기',
    btnUrl: '',
    bgColor: '#ffffff',
    btnColor: '#ef4444',
    position: 'card-bottom-left',
    badgeText: '',
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync links to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('overlay_links', JSON.stringify(links));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [links]);

  // Load links from backend API on initial mount and sync local storage links
  useEffect(() => {
    // 1. Sync any existing local storage links to server database
    try {
      const saved = localStorage.getItem('overlay_links');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          fetch('/api/links/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ links: parsed }),
          }).catch(console.error);
        }
      }
    } catch {
      // Ignore
    }

    // 2. Fetch all persistent links from server
    fetch('/api/links')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.links) && data.links.length > 0) {
          setLinks((prev) => {
            const ids = new Set(prev.map((l) => l.id));
            const newFromBackend = data.links
              .map((l: any, i: number) => sanitizeLinkItem(l, i))
              .filter((l: LinkItem) => !ids.has(l.id));
            return [...prev, ...newFromBackend];
          });
        }
      })
      .catch((err) => console.error('Failed to load links from API:', err));
  }, []);

  // Handle URL changes & resolve target slug for public visitors
  useEffect(() => {
    const resolveCurrentRoute = async () => {
      const urlInfo = getSlugFromCurrentUrl();

      // Check if URL has ?d= or #d= payload
      let encodedData = '';
      try {
        const searchParams = new URLSearchParams(window.location.search);
        encodedData = searchParams.get('d') || '';
        if (!encodedData && window.location.hash && window.location.hash.includes('?')) {
          const queryPart = window.location.hash.split('?')[1];
          encodedData = new URLSearchParams(queryPart).get('d') || '';
        }
      } catch {}

      if (encodedData) {
        const decoded = decodeLinkFromPayload(encodedData);
        if (decoded && decoded.targetUrl && decoded.headline) {
          const restoredSlug = decoded.slug || urlInfo.slug || 'link';
          const restoredLink: LinkItem = {
            id: `link_${restoredSlug}_${Date.now()}`,
            slug: restoredSlug,
            targetUrl: decoded.targetUrl,
            logoUrl: decoded.logoUrl || '',
            headline: decoded.headline,
            subtext: decoded.subtext || '',
            btnText: decoded.btnText || '보러가기',
            btnUrl: decoded.btnUrl || '',
            bgColor: decoded.bgColor || '#ffffff',
            btnColor: decoded.btnColor || '#ef4444',
            badgeText: decoded.badgeText || '',
            position: decoded.position || 'card-bottom-left',
            clicks: 0,
            createdAt: new Date().toLocaleDateString('ko-KR'),
          };

          setLinks((prev) => {
            const existingIdx = prev.findIndex((l) => l.slug.toLowerCase() === restoredLink.slug.toLowerCase());
            if (existingIdx >= 0) {
              const updated = [...prev];
              updated[existingIdx] = restoredLink;
              return updated;
            }
            return [restoredLink, ...prev];
          });

          setActiveLinkId(restoredLink.id);
          setIsPublicVisitor(true);
          setIsVisitorLoading(false);
          try {
            window.history.replaceState(null, '', `/l/${restoredLink.slug}`);
          } catch {}
          return;
        }
      }

      if (!urlInfo.isPublicViewer) {
        setIsPublicVisitor(false);
        return;
      }

      // Public visitor mode: immediately activate visitor mode!
      setIsPublicVisitor(true);

      const targetSlug = urlInfo.slug ? urlInfo.slug.toLowerCase().trim() : '';
      if (!targetSlug) {
        setIsVisitorLoading(false);
        return;
      }

      // 1. Check local storage directly for freshest links
      let currentPool = [...links];
      try {
        const raw = localStorage.getItem('overlay_links');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized = parsed.map((item, idx) => sanitizeLinkItem(item, idx));
            currentPool = sanitized;
            setLinks(sanitized);
          }
        }
      } catch {}

      const localMatch = currentPool.find(
        (l) =>
          l.slug.toLowerCase().trim() === targetSlug ||
          l.id.toLowerCase().trim() === targetSlug
      );
      if (localMatch) {
        setActiveLinkId(localMatch.id);
        setIsVisitorLoading(false);
        return;
      }

      // 2. Try fetching from backend API if available (handles local/server environments)
      try {
        const res = await fetch(`/api/links/${encodeURIComponent(targetSlug)}`);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data && data.success && data.link) {
            const fetchedLink: LinkItem = sanitizeLinkItem(data.link);
            setLinks((prev) => {
              if (prev.some((l) => l.id === fetchedLink.id || l.slug.toLowerCase().trim() === fetchedLink.slug.toLowerCase().trim())) {
                return prev;
              }
              return [fetchedLink, ...prev];
            });
            setActiveLinkId(fetchedLink.id);
            setIsVisitorLoading(false);
            return;
          }
        }
      } catch {
        // Ignore backend fetch errors (e.g. static SPA hosting on Vercel)
      }

      // 3. Fallback: immediately resolve so user ALWAYS sees target page & overlay banner, never builder or 404
      if (currentPool.length > 0) {
        setActiveLinkId(currentPool[0].id);
      } else {
        const fallbackItem: LinkItem = {
          id: `link_${targetSlug}`,
          slug: targetSlug,
          targetUrl: 'https://m.blog.naver.com',
          logoUrl: '',
          headline: '추천 제휴 혜택 및 특별 프로모션 안내',
          subtext: '지금 방문하고 한정 특가 및 프로모션 혜택을 확인해 보세요.',
          btnText: '특별 혜택 보러가기',
          btnUrl: 'https://m.blog.naver.com',
          bgColor: '#ffffff',
          btnColor: '#ef4444',
          badgeText: 'HOT',
          position: 'card-bottom-left',
          clicks: 0,
          createdAt: new Date().toLocaleDateString('ko-KR'),
        };
        setLinks([fallbackItem]);
        setActiveLinkId(fallbackItem.id);
      }
      setIsVisitorLoading(false);
    };

    resolveCurrentRoute();

    window.addEventListener('popstate', resolveCurrentRoute);
    window.addEventListener('hashchange', resolveCurrentRoute);
    return () => {
      window.removeEventListener('popstate', resolveCurrentRoute);
      window.removeEventListener('hashchange', resolveCurrentRoute);
    };
  }, [links]);

  // Handle URL hash on initial load or change
  // Supports clean short slugs (#rinkle, #clean3s) and legacy payload links (#d=...)
  useEffect(() => {
    const handleHash = async () => {
      const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
      if (!rawHash) return;

      // Check if hash has legacy payload parameter: e.g. d=BASE64
      if (rawHash.includes('d=')) {
        let encodedData = '';
        try {
          const params = new URLSearchParams(rawHash);
          encodedData = params.get('d') || '';
        } catch {
          const match = rawHash.match(/d=([^&]+)/);
          if (match) encodedData = match[1];
        }

        if (encodedData) {
          const decoded = decodeLinkFromPayload(encodedData);
          if (decoded && decoded.targetUrl && decoded.headline) {
            const restoredLink: LinkItem = {
              id: `link_${decoded.slug || 'restored'}_${Date.now()}`,
              slug: decoded.slug || 'link',
              targetUrl: decoded.targetUrl,
              logoUrl: decoded.logoUrl || '',
              headline: decoded.headline,
              subtext: decoded.subtext || '',
              btnText: decoded.btnText || '보러가기',
              btnUrl: decoded.btnUrl || '',
              bgColor: decoded.bgColor || '#ffffff',
              btnColor: decoded.btnColor || '#ef4444',
              badgeText: decoded.badgeText || '',
              position: decoded.position || 'card-bottom-left',
              clicks: 0,
              createdAt: new Date().toLocaleDateString('ko-KR'),
            };

            // Save to backend API
            fetch('/api/links', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(restoredLink),
            }).catch(console.error);

            setLinks((prev) => {
              const existingIdx = prev.findIndex((l) => l.slug === restoredLink.slug);
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = restoredLink;
                return next;
              }
              return [restoredLink, ...prev];
            });

            setActiveLinkId(restoredLink.id);
            setRecentLink(restoredLink);

            // Clean up hash to concise short URL
            window.history.replaceState(null, '', `/#${restoredLink.slug}`);
            addToast(`타깃 링크('${decoded.headline}')가 정상 로드되었습니다!`, 'info');
            return;
          }
        }
      }

      // Simple clean slug check (e.g. #rinkle or #clean3s)
      const cleanSlug = rawHash.replace(/^(r\/)?/, '').split('&')[0].split('?')[0].trim().toLowerCase();
      if (!cleanSlug || cleanSlug === 'builder' || cleanSlug === 'home') return;

      const found = links.find((l) => l.slug.toLowerCase() === cleanSlug);
      if (found) {
        setActiveLinkId(found.id);
        setRecentLink(found);
        return;
      }

      // If not in local state, fetch from backend API
      try {
        const res = await fetch(`/api/links/${encodeURIComponent(cleanSlug)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.link) {
            const fetchedLink: LinkItem = data.link;
            setLinks((prev) => {
              if (prev.some((l) => l.id === fetchedLink.id || l.slug === fetchedLink.slug)) {
                return prev;
              }
              return [fetchedLink, ...prev];
            });
            setActiveLinkId(fetchedLink.id);
            setRecentLink(fetchedLink);
          }
        }
      } catch (err) {
        console.error('Failed to fetch link by slug:', err);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [links]);

  // Form change handler
  const handleFormChange = (updates: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
    // Clear field-specific error if user types
    if (Object.keys(formErrors).length > 0) {
      setFormErrors((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(updates)) {
          delete next[key];
        }
        return next;
      });
    }
  };

  // Handle Create Link
  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();

    const rawTarget = formState.targetUrl.trim();
    const rawHeadline = formState.headline.trim();
    const rawBtnText = formState.btnText.trim();
    const rawBtnUrl = formState.btnUrl.trim();

    const errors: Record<string, string> = {};
    if (!rawTarget) {
      errors.targetUrl = '공유할 원본 글 링크(Target URL)를 입력해 주세요.';
    }
    if (!rawHeadline) {
      errors.headline = '메인 카피(배너 문구)를 입력해 주세요.';
    }
    if (!rawBtnText) {
      errors.btnText = '버튼 문구를 입력해 주세요.';
    }
    if (!rawBtnUrl) {
      errors.btnUrl = '버튼 클릭 시 이동할 제휴/랜딩 링크를 입력해 주세요.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      addToast('필수 입력 항목(타깃 URL, 배너 문구, 버튼 문구, 이동 링크)을 확인해 주세요.', 'error');
      return;
    }

    setFormErrors({});
    setIsCreating(true);

    try {
      // Normalize URLs to ensure correct protocol (https://)
      const normalizedTargetUrl = normalizeUrl(rawTarget);
      const normalizedBtnUrl = normalizeUrl(rawBtnUrl);
      const normalizedLogoUrl = formState.logoUrl.trim() ? normalizeUrl(formState.logoUrl.trim()) : '';

      // Smart slug generation (supports English, numbers, and Korean)
      const slug = generateSmartSlug(normalizedTargetUrl, formState.customSlug);

      const newLink: LinkItem = {
        id: `link_${Date.now()}`,
        slug,
        targetUrl: normalizedTargetUrl,
        logoUrl: normalizedLogoUrl,
        headline: rawHeadline,
        subtext: formState.subtext.trim(),
        btnText: rawBtnText,
        btnUrl: normalizedBtnUrl,
        bgColor: formState.bgColor,
        btnColor: formState.btnColor,
        position: formState.position,
        badgeText: formState.badgeText.trim(),
        clicks: 0,
        createdAt: new Date().toLocaleDateString('ko-KR'),
      };

      let finalSavedLink = newLink;

      // Save to backend API and get confirmed unique link
      try {
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newLink,
            origin: typeof window !== 'undefined' ? window.location.origin : '',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.link) {
            finalSavedLink = data.link;
          }
        }
      } catch (err) {
        console.error('Failed to save to backend API:', err);
      }

      setLinks((prev) => [finalSavedLink, ...prev.filter((l) => l.id !== finalSavedLink.id)]);
      setActiveLinkId(finalSavedLink.id);
      setRecentLink(finalSavedLink);
      setNewlyCreatedLink(finalSavedLink);
      addToast(`단축 CTA 링크가 성공적으로 생성되었습니다! (/l/${finalSavedLink.slug})`, 'success');
    } finally {
      setIsCreating(false);
    }
  };

  // Trigger single link delete
  const handleDeleteLink = (id: string) => {
    const target = links.find((l) => l.id === id);
    if (target) {
      setDeleteConfirm({
        type: 'single',
        id,
        title: target.headline || target.slug,
      });
    }
  };

  // Trigger clear all links
  const handleClearAll = () => {
    if (links.length > 0) {
      setDeleteConfirm({
        type: 'all',
        count: links.length,
      });
    }
  };

  // Execute confirmed deletion
  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === 'single') {
      const deletedId = deleteConfirm.id;
      // Sync delete with backend
      fetch(`/api/links/${deletedId}`, { method: 'DELETE' }).catch(console.error);

      setLinks((prev) => prev.filter((l) => l.id !== deletedId));
      if (activeLinkId === deletedId) {
        const remaining = links.filter((l) => l.id !== deletedId);
        setActiveLinkId(remaining.length > 0 ? remaining[0].id : null);
      }
      addToast('선택한 링크가 삭제되었습니다.');
    } else if (deleteConfirm.type === 'all') {
      // Sync clear all with backend
      fetch('/api/links', { method: 'DELETE' }).catch(console.error);

      setLinks([]);
      setActiveLinkId(null);
      addToast('모든 링크가 성공적으로 전체 삭제되었습니다.');
    }

    setDeleteConfirm(null);
  };

  // Copy Share URL (direct visitor link: https://domain/l/:slug)
  const handleCopyShortUrl = async (linkOrIdOrSlug: LinkItem | string) => {
    let targetLink: LinkItem | undefined;
    if (typeof linkOrIdOrSlug === 'object' && linkOrIdOrSlug !== null) {
      targetLink = linkOrIdOrSlug;
    } else {
      targetLink = links.find((l) => l.id === linkOrIdOrSlug || l.slug === linkOrIdOrSlug);
    }

    const urlToCopy = targetLink
      ? buildShareUrl(targetLink)
      : `${window.location.origin}/l/${typeof linkOrIdOrSlug === 'string' ? linkOrIdOrSlug : ''}`;

    const copied = await copyTextToClipboard(urlToCopy);
    if (copied) {
      addToast(`배포 링크가 클립보드에 복사되었습니다! (${urlToCopy})`, 'success');
    } else {
      addToast(`배포 링크 주소: ${urlToCopy}`);
    }
  };

  // Select Link for prominent ShortUrlBox and DevicePreview
  const handleSelectLink = (link: LinkItem) => {
    setActiveLinkId(link.id);
    setRecentLink(link);
    setFormState({
      targetUrl: link.targetUrl,
      logoUrl: link.logoUrl || '',
      headline: link.headline || '',
      subtext: link.subtext || '',
      btnText: link.btnText || '',
      btnUrl: link.btnUrl || '',
      bgColor: link.bgColor || '#ffffff',
      btnColor: link.btnColor || '#ef4444',
      position: link.position || 'card-bottom-left',
      badgeText: link.badgeText || '',
    });
    addToast(`'${link.headline || link.slug}' 링크가 선택되었습니다.`, 'info');
  };

  // CTA Click handler in Visitor View
  const handleCtaClick = (linkId: string, destinationUrl: string) => {
    const link = links.find((l) => l.id === linkId);
    if (link) {
      fetch(`/api/links/${link.slug}/click`, { method: 'POST' }).catch(console.error);
    }

    // Increment clicks
    setLinks((prev) =>
      prev.map((item) =>
        item.id === linkId
          ? {
              ...item,
              clicks: (typeof item.clicks === 'number' && !isNaN(item.clicks) ? item.clicks : 0) + 1,
            }
          : item
      )
    );

    addToast('제휴 랜딩 페이지로 이동합니다. (클릭수 +1)', 'success');

    // Open target affiliate link in new window
    window.open(destinationUrl, '_blank', 'noopener,noreferrer');
  };

  const activeLink = React.useMemo(() => {
    if (preloadedLink && isPublicVisitor) {
      return preloadedLink;
    }
    if (activeLinkId) {
      const found = links.find((l) => l.id === activeLinkId);
      if (found) return found;
    }
    const currentSlug = getSlugFromCurrentUrl().slug;
    if (currentSlug) {
      const cleanSlug = currentSlug.toLowerCase().trim();
      const foundBySlug = links.find(
        (l) => l.slug.toLowerCase().trim() === cleanSlug || l.id.toLowerCase().trim() === cleanSlug
      );
      if (foundBySlug) return foundBySlug;
    }
    const currentHash =
      typeof window !== 'undefined'
        ? window.location.hash
            .replace(/^#\/?/, '')
            .split('&')[0]
            .split('?')[0]
            .trim()
            .toLowerCase()
        : '';
    if (currentHash && !currentHash.includes('d=')) {
      const foundByHash = links.find(
        (l) => l.slug.toLowerCase().trim() === currentHash || l.id.toLowerCase().trim() === currentHash
      );
      if (foundByHash) return foundByHash;
    }

    if (links.length > 0) {
      return links[0];
    }

    // When running in public visitor mode without links, construct a clean fallback link so target page and overlay banner render immediately
    if (isPublicVisitor) {
      const slug = currentSlug || 'partner';
      return {
        id: `link_${slug}`,
        slug: slug,
        targetUrl: 'https://m.blog.naver.com',
        logoUrl: '',
        headline: '추천 제휴 혜택 및 특별 프로모션 안내',
        subtext: '지금 방문하고 한정 특가 및 프로모션 혜택을 확인해 보세요.',
        btnText: '특별 혜택 보러가기',
        btnUrl: 'https://m.blog.naver.com',
        bgColor: '#ffffff',
        btnColor: '#ef4444',
        badgeText: 'HOT',
        position: 'card-bottom-left' as const,
        clicks: 0,
        createdAt: new Date().toLocaleDateString('ko-KR'),
      };
    }

    return null;
  }, [links, activeLinkId, isPublicVisitor, preloadedLink]);

  const totalClicks = links.reduce((sum, item) => {
    const count = typeof item.clicks === 'number' && !isNaN(item.clicks) ? item.clicks : 0;
    return sum + count;
  }, 0);

  // ----------------------------------------------------
  // PUBLIC VISITOR MODE: Immersive full-screen viewer
  // (Triggered when someone opens /l/:slug or #slug in a new window)
  // ----------------------------------------------------
  if (isPublicVisitor) {
    if (isVisitorLoading) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
          <div className="w-9 h-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-medium text-slate-300">타깃 웹페이지 전문을 불러오는 중...</p>
        </div>
      );
    }

    if (!activeLink) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">링크를 찾을 수 없습니다</h2>
            <p className="text-xs text-slate-400 mb-5">
              삭제되었거나 주소가 올바르지 않은 단축 링크입니다.
            </p>
            <a
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition"
            >
              CTA 링크 빌더 홈으로 이동
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="w-screen h-screen overflow-hidden bg-white">
        <VisitorView
          activeLink={activeLink}
          links={links}
          isPublicVisitor={true}
          onSelectLink={(id) => setActiveLinkId(id)}
          onBackToBuilder={() => {
            if (typeof window !== 'undefined') {
              try {
                window.history.pushState(null, '', '/');
                window.location.hash = '';
              } catch {}
            }
            setIsPublicVisitor(false);
          }}
          onCtaClick={handleCtaClick}
          onCopyShortUrl={handleCopyShortUrl}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // ----------------------------------------------------
  // ADMIN / BUILDER MODE: Permanent mainboard dashboard
  // ----------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
      {/* 1. Top Navigation Bar */}
      <Header
        totalLinks={links.length}
        totalClicks={totalClicks}
      />

      {/* 2. Mainboard: Builder Form & Device Preview */}
      <main
        id="view-builder"
        className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        {/* Left: Input Form & Saved Link List (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <LinkBuilderForm
            formState={formState}
            onChange={handleFormChange}
            onSubmit={handleCreateLink}
            isCreating={isCreating}
            errors={formErrors}
            newlyCreatedLink={newlyCreatedLink}
            onCopyCreatedLink={(url) => addToast(`단축 링크가 복사되었습니다!`, 'success')}
            onOpenOverlay={(link) => {
              setActiveLinkId(link.id);
              setIsPublicVisitor(true);
              try {
                window.history.pushState(null, '', `/l/${link.slug}`);
              } catch {}
            }}
          />

          <LinkList
            links={links}
            selectedLinkId={recentLink?.id || activeLinkId}
            onSelectLink={handleSelectLink}
            onDeleteLink={handleDeleteLink}
            onClearAll={handleClearAll}
            onCopyShortUrl={handleCopyShortUrl}
          />
        </div>

        {/* Right: Live Interactive Device Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <DevicePreview
            formState={formState}
            activeSlug={recentLink?.slug || activeLink?.slug || 'sample'}
            onTestClick={() => {
              if (formState.btnUrl) {
                window.open(normalizeUrl(formState.btnUrl), '_blank', 'noopener,noreferrer');
              } else {
                addToast('버튼 이동 링크가 아직 입력되지 않았습니다.', 'info');
              }
            }}
          />
        </div>
      </main>

      {/* Delete Confirmation Modal (Reliable in iframe sandbox) */}
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title={
          deleteConfirm?.type === 'single'
            ? '링크 삭제 확인'
            : '전체 링크 목록 삭제 확인'
        }
        message={
          deleteConfirm?.type === 'single'
            ? `선택하신 '${deleteConfirm.title}' 링크를 삭제하시겠습니까?`
            : `현재 저장된 총 ${deleteConfirm?.count ?? 0}개의 모든 링크가 삭제됩니다. 계속 진행하시겠습니까?`
        }
        confirmText={deleteConfirm?.type === 'single' ? '삭제하기' : '전체 삭제'}
        cancelText="취소"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

