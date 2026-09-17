import React, { useState, useEffect, useMemo } from 'react';
import { LinkItem, BannerPosition } from './types';
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
  getSlugFromCurrentUrl,
  copyTextToClipboard,
} from './utils/linkUtils';

// NoCodeBackend 설정 (Vercel 환경변수 및 고정 API 키)
const NCB_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_NCB_BASE_URL) ||
  'https://api.nocodebackend.com';
const NCB_KEY =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_NCB_KEY) ||
  'sk_live_4hgt7dx3zqndr4ek7m';

const ncbHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${NCB_KEY}`,
};

const STORAGE_KEY = 'user_overlay_links';

// 링크 객체 정규화 및 데이터 누락 방지 함수
function sanitizeLinkItem(item: any, fallbackIndex = 0): LinkItem {
  let cfg: any = {};
  if (item.cta_config) {
    try {
      cfg = typeof item.cta_config === 'string' ? JSON.parse(item.cta_config) : item.cta_config;
    } catch {}
  }

  const slug = String(item.short_id || item.slug || `link-${fallbackIndex}`);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return {
    id: String(item.id || item.short_id || `link_${slug}_${Date.now()}`),
    slug: slug,
    targetUrl: String(item.target_url || item.targetUrl || ''),
    headline: String(cfg.headline || item.headline || '제목 없음'),
    btnText: String(cfg.btnText || item.btnText || '보러가기'),
    btnUrl: String(cfg.btnUrl || item.btnUrl || ''),
    bgColor: String(cfg.bgColor || item.bgColor || '#ffffff'),
    btnColor: String(cfg.btnColor || item.btnColor || '#ef4444'),
    position: (cfg.position || item.position || 'card-bottom-left') as BannerPosition,
    badgeText: String(cfg.badgeText || item.badgeText || ''),
    subtext: String(cfg.subtext || item.subtext || ''),
    logoUrl: String(cfg.logoUrl || item.logoUrl || ''),
    clicks: Number(item.views ?? item.clicks ?? 0),
    createdAt: String(item.created_at || item.createdAt || new Date().toLocaleDateString('ko-KR')),
    shortUrl: `${origin}/l/${encodeURIComponent(slug)}`,
  };
}

export default function App() {
  const initialUrlInfo = getSlugFromCurrentUrl();

  // 1. 로컬스토리지에서 기존 링크 로드
  const [links, setLinks] = useState<LinkItem[]>(() => {
    let baseList: LinkItem[] = [];
    try {
      localStorage.removeItem('overlay_links');
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          baseList = parsed.map((l, i) => sanitizeLinkItem(l, i));
        }
      }
    } catch {}
    return baseList;
  });

  // 방문자 뷰어 여부 판별
  const [isPublicVisitor, setIsPublicVisitor] = useState<boolean>(() => initialUrlInfo.isPublicViewer);

  const [activeLinkId, setActiveLinkId] = useState<string | null>(() => {
    if (initialUrlInfo.isPublicViewer && initialUrlInfo.slug) {
      const match = links.find((l) => l.slug.toLowerCase() === initialUrlInfo.slug?.toLowerCase());
      if (match) return match.id;
      return null;
    }
    return links.length > 0 ? links[0].id : null;
  });

  const [isVisitorLoading, setIsVisitorLoading] = useState<boolean>(() => {
    if (!initialUrlInfo.isPublicViewer) return false;
    if (initialUrlInfo.slug) {
      return !links.some((l) => l.slug.toLowerCase() === initialUrlInfo.slug?.toLowerCase());
    }
    return false;
  });

  const [recentLink, setRecentLink] = useState<LinkItem | null>(() => (links.length > 0 ? links[0] : null));
  const [newlyCreatedLink, setNewlyCreatedLink] = useState<LinkItem | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [deleteConfirm, setDeleteConfirm] = useState<
    | { type: 'single'; id: string; title: string }
    | { type: 'all'; count: number }
    | null
  >(null);

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

  // 구형 해시(#d=...) 강제 제거 및 주소창 정리
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('d=')) {
      const urlInfo = getSlugFromCurrentUrl();
      const cleanPath = urlInfo.slug ? `/l/${encodeURIComponent(urlInfo.slug)}` : window.location.pathname;
      window.history.replaceState(null, '', cleanPath);
    }
  }, []);

  // 로컬스토리지 동기화
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [links]);

  // NoCodeBackend에서 최신 링크 목록 불러오기
  useEffect(() => {
    const fetchLinksFromNCB = async () => {
      try {
        const res = await fetch(`${NCB_BASE}/read/cta_links`, {
          method: 'GET',
          headers: ncbHeaders,
        });
        if (res.ok) {
          const records = await res.json();
          if (Array.isArray(records) && records.length > 0) {
            const mappedLinks = records.map((r: any, idx: number) => sanitizeLinkItem(r, idx));
            setLinks((prev) => {
              const ids = new Set(mappedLinks.map((m) => m.slug.toLowerCase()));
              const localOnly = prev.filter((p) => !ids.has(p.slug.toLowerCase()));
              return [...mappedLinks, ...localOnly];
            });
          }
        }
      } catch (err) {
        console.error('NoCodeBackend 로드 오류:', err);
      }
    };

    fetchLinksFromNCB();
  }, []);

  // 방문자 슬러그 확인 및 DB 데이터 매칭
  useEffect(() => {
    const resolveCurrentRoute = async () => {
      const urlInfo = getSlugFromCurrentUrl();
      if (!urlInfo.isPublicViewer) {
        setIsPublicVisitor(false);
        return;
      }

      setIsPublicVisitor(true);
      const targetSlug = urlInfo.slug ? urlInfo.slug.toLowerCase().trim() : '';
      if (!targetSlug) {
        setIsVisitorLoading(false);
        return;
      }

      // 1. 현재 메모리에 이미 존재하는지 확인
      const match = links.find((l) => l.slug.toLowerCase().trim() === targetSlug);
      if (match) {
        setActiveLinkId(match.id);
        setIsVisitorLoading(false);
        return;
      }

      // 2. NoCodeBackend 검색 API 호출
      try {
        const res = await fetch(`${NCB_BASE}/search/cta_links`, {
          method: 'POST',
          headers: ncbHeaders,
          body: JSON.stringify({ short_id: targetSlug }),
        });
        if (res.ok) {
          const result = await res.json();
          if (Array.isArray(result) && result.length > 0) {
            const fetched = sanitizeLinkItem(result[0]);
            setLinks((prev) => [fetched, ...prev.filter((p) => p.slug !== fetched.slug)]);
            setActiveLinkId(fetched.id);
            setIsVisitorLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error('NoCodeBackend 검색 오류:', e);
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

  const handleFormChange = (updates: Partial<FormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
    if (Object.keys(formErrors).length > 0) {
      setFormErrors((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(updates)) delete next[key];
        return next;
      });
    }
  };

  // 링크 생성 핸들러 (NoCodeBackend 영구 저장)
  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();

    const rawTarget = formState.targetUrl.trim();
    const rawHeadline = formState.headline.trim();
    const rawBtnText = formState.btnText.trim();
    const rawBtnUrl = formState.btnUrl.trim();

    const errors: Record<string, string> = {};
    if (!rawTarget) errors.targetUrl = '공유할 원본 글 링크(Target URL)를 입력해 주세요.';
    if (!rawHeadline) errors.headline = '메인 카피(배너 문구)를 입력해 주세요.';
    if (!rawBtnText) errors.btnText = '버튼 문구를 입력해 주세요.';
    if (!rawBtnUrl) errors.btnUrl = '버튼 클릭 시 이동할 제휴/랜딩 링크를 입력해 주세요.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      addToast('필수 입력 항목을 확인해 주세요.', 'error');
      return;
    }

    setFormErrors({});
    setIsCreating(true);

    try {
      const normalizedTargetUrl = normalizeUrl(rawTarget);
      const normalizedBtnUrl = normalizeUrl(rawBtnUrl);
      const normalizedLogoUrl = formState.logoUrl.trim() ? normalizeUrl(formState.logoUrl.trim()) : '';
      const slug = generateSmartSlug(normalizedTargetUrl, formState.customSlug);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      const configData = {
        headline: rawHeadline,
        subtext: formState.subtext.trim(),
        btnText: rawBtnText,
        btnUrl: normalizedBtnUrl,
        logoUrl: normalizedLogoUrl,
        bgColor: formState.bgColor,
        btnColor: formState.btnColor,
        position: formState.position,
        badgeText: formState.badgeText.trim(),
      };

      const newLink: LinkItem = {
        id: `link_${Date.now()}`,
        slug,
        targetUrl: normalizedTargetUrl,
        ...configData,
        clicks: 0,
        createdAt: new Date().toLocaleDateString('ko-KR'),
        shortUrl: `${origin}/l/${encodeURIComponent(slug)}`,
      };

      // 1. 화면에 즉시 등록
      setLinks((prev) => [newLink, ...prev.filter((l) => l.slug !== newLink.slug)]);
      setActiveLinkId(newLink.id);
      setRecentLink(newLink);
      setNewlyCreatedLink(newLink);

      // 2. NoCodeBackend DB로 영구 저장
      try {
        await fetch(`${NCB_BASE}/create/cta_links`, {
          method: 'POST',
          headers: ncbHeaders,
          body: JSON.stringify({
            short_id: slug,
            target_url: normalizedTargetUrl,
            cta_config: JSON.stringify(configData),
            views: 0,
          }),
        });
      } catch (syncErr) {
        console.error('NoCodeBackend 저장 실패:', syncErr);
      }

      addToast(`단축 CTA 링크가 성공적으로 생성되었습니다! (/l/${slug})`, 'success');
    } finally {
      setIsCreating(false);
    }
  };

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

  const handleClearAll = () => {
    if (links.length > 0) {
      setDeleteConfirm({
        type: 'all',
        count: links.length,
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === 'single') {
      const deletedId = deleteConfirm.id;
      setLinks((prev) => prev.filter((l) => l.id !== deletedId));
      if (activeLinkId === deletedId) {
        const remaining = links.filter((l) => l.id !== deletedId);
        setActiveLinkId(remaining.length > 0 ? remaining[0].id : null);
      }
      addToast('선택한 링크가 삭제되었습니다.');
    } else if (deleteConfirm.type === 'all') {
      setLinks([]);
      setActiveLinkId(null);
      addToast('모든 링크가 삭제되었습니다.');
    }
    setDeleteConfirm(null);
  };

  // 순수 단축 링크 복사 (해시 제거)
  const handleCopyShortUrl = async (linkOrIdOrSlug: LinkItem | string) => {
    let targetSlug = '';
    if (typeof linkOrIdOrSlug === 'object' && linkOrIdOrSlug !== null) {
      targetSlug = linkOrIdOrSlug.slug;
    } else {
      const found = links.find((l) => l.id === linkOrIdOrSlug || l.slug === linkOrIdOrSlug);
      targetSlug = found ? found.slug : String(linkOrIdOrSlug);
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const cleanUrl = `${origin}/l/${encodeURIComponent(targetSlug)}`;

    const copied = await copyTextToClipboard(cleanUrl);
    if (copied) {
      addToast(`단축 링크가 복사되었습니다! (${cleanUrl})`, 'success');
    } else {
      addToast(`단축 링크 주소: ${cleanUrl}`);
    }
  };

  const handleSelectLink = (link: LinkItem) => {
    setActiveLinkId(link.id);
    setRecentLink(link);
    setFormState({
      targetUrl: link.targetUrl,
      customSlug: link.slug,
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

  const handleCtaClick = (linkId: string, destinationUrl: string) => {
    setLinks((prev) =>
      prev.map((item) =>
        item.id === linkId ? { ...item, clicks: (item.clicks || 0) + 1 } : item
      )
    );
    window.open(destinationUrl, '_blank', 'noopener,noreferrer');
  };

  const activeLink = useMemo(() => {
    if (activeLinkId) {
      const found = links.find((l) => l.id === activeLinkId);
      if (found) return found;
    }
    return links.length > 0 ? links[0] : null;
  }, [links, activeLinkId]);

  const totalClicks = links.reduce((sum, item) => sum + (item.clicks || 0), 0);

  // 방문자 뷰어 화면
  if (isPublicVisitor) {
    if (isVisitorLoading) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
          <div className="w-9 h-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-medium text-slate-300">콘텐츠를 불러오는 중...</p>
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
              홈으로 이동
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

  // 관리자 / 빌더 메인 화면
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
      <Header totalLinks={links.length} totalClicks={totalClicks} />

      <main
        id="view-builder"
        className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
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

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}