import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  X,
  Share2,
  MousePointerClick,
  FileText,
  Globe,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { LinkItem } from '../types';
import { getEmbedTargetUrl } from '../utils/linkUtils';

interface VisitorViewProps {
  activeLink: LinkItem | null;
  links: LinkItem[];
  isPublicVisitor?: boolean;
  onSelectLink: (id: string) => void;
  onBackToBuilder: () => void;
  onCtaClick: (linkId: string, targetUrl: string) => void;
  onCopyShortUrl: (slug: string) => void;
}

export const VisitorView: React.FC<VisitorViewProps> = ({
  activeLink,
  links,
  isPublicVisitor = false,
  onSelectLink,
  onBackToBuilder,
  onCtaClick,
  onCopyShortUrl,
}) => {
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const [viewMode, setViewMode] = useState<'iframe' | 'reader'>('iframe');
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  // Safety fallback: dismiss loading spinner after 4.5s so users can interact immediately
  React.useEffect(() => {
    setIframeLoading(true);
    setIframeError(false);
    const timer = setTimeout(() => {
      setIframeLoading(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, [activeLink?.targetUrl]);

  if (!activeLink) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-100 min-h-[600px]">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md shadow-sm">
          <Globe className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">선택된 링크가 없습니다</h3>
          <p className="text-xs text-slate-500 mb-4">
            먼저 링크 빌더에서 새 링크를 생성하거나 목록에서 링크를 선택해 주세요.
          </p>
          <button
            onClick={onBackToBuilder}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition"
          >
            링크 빌더로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const isLightBg = activeLink.bgColor === '#ffffff';
  const textColor = isLightBg ? '#0f172a' : '#ffffff';
  const subtextColor = isLightBg ? '#64748b' : '#cbd5e1';

  // Format short URL
  const shortUrl = `${window.location.origin}/#${activeLink.slug}`;

  // Extract domain for display
  let domain = '';
  try {
    domain = new URL(activeLink.targetUrl).hostname;
  } catch {
    domain = 'target-site.com';
  }

  const containerClass = isPublicVisitor
    ? 'relative w-full h-screen overflow-hidden bg-white flex flex-col'
    : 'flex-1 relative w-full h-[calc(100vh-64px)] overflow-hidden bg-slate-900 flex flex-col';

  return (
    <section id="view-viewer" className={containerClass}>
      {/* Simulation Top Bar - ONLY shown for internal builder preview, NOT for public visitors */}
      {!isPublicVisitor && (
        <div className="bg-slate-900 text-slate-200 border-b border-slate-800 px-4 py-2 flex items-center justify-between gap-3 text-xs z-40 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToBuilder}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-1 font-medium transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              빌더로 돌아가기
            </button>

            {/* Quick link switcher */}
            {links.length > 1 && (
              <div className="hidden sm:flex items-center gap-1">
                <span className="text-slate-400 text-[11px] ml-1">다른 링크:</span>
                <select
                  value={activeLink.id}
                  onChange={(e) => {
                    onSelectLink(e.target.value);
                    setIsBannerVisible(true);
                    setIframeError(false);
                    setIframeLoading(true);
                  }}
                  className="bg-slate-800 border border-slate-700 text-white text-[11px] rounded-lg px-2 py-1 focus:outline-none"
                >
                  {links.map((l, idx) => (
                    <option key={l.id || `link_${l.slug || idx}`} value={l.id}>
                      /{l.slug} - {(l.headline || '').substring(0, 20)}...
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* View Mode & Actions */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-0.5 rounded-lg flex border border-slate-700">
              <button
                onClick={() => setViewMode('iframe')}
                className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition ${
                  viewMode === 'iframe'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="원본 웹페이지 직접 임베드"
              >
                <Globe className="w-3 h-3" />
                웹 임베드
              </button>
              <button
                onClick={() => setViewMode('reader')}
                className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition ${
                  viewMode === 'reader'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="보안 정책으로 웹페이지가 임베드 차단될 경우 리더 뷰로 확인"
              >
                <FileText className="w-3 h-3" />
                리더 뷰
              </button>
            </div>

            <button
              onClick={() => onCopyShortUrl(activeLink.slug)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1 font-medium text-[11px] border border-slate-700 transition"
              title="공유용 단축 링크 복사"
            >
              <Share2 className="w-3 h-3 text-blue-400" />
              링크 복사
            </button>

            <a
              href={activeLink.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1 font-medium text-[11px] border border-slate-700 transition hidden md:flex"
              title="원본 사이트 새 탭에서 열기"
            >
              <ExternalLink className="w-3 h-3" />
              새 탭
            </a>

            <div className="bg-blue-950/60 border border-blue-800/80 px-2 py-1 rounded-lg text-blue-300 text-[11px] flex items-center gap-1">
              <MousePointerClick className="w-3 h-3 text-blue-400" />
              <span>클릭: <strong>{typeof activeLink.clicks === 'number' && !isNaN(activeLink.clicks) ? activeLink.clicks : 0}</strong>회</span>
            </div>
          </div>
        </div>
      )}

      {/* Target Content Area */}
      <div className="flex-1 relative w-full h-full overflow-hidden bg-white">
        {viewMode === 'iframe' ? (
          <div className="w-full h-full relative">
            {iframeLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/80 backdrop-blur-xs transition-opacity duration-300">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-medium text-slate-600">
                    타깃 웹페이지 전문을 불러오는 중...
                  </span>
                </div>
              </div>
            )}
            <iframe
              id="live-target-frame"
              key={getEmbedTargetUrl(activeLink.targetUrl)}
              src={getEmbedTargetUrl(activeLink.targetUrl)}
              className="w-full h-full border-none bg-white"
              title="Target Site Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-modals allow-downloads"
              onLoad={() => {
                setIframeLoading(false);
                setIframeError(false);
              }}
              onError={() => {
                setIframeLoading(false);
                setIframeError(true);
              }}
            />

            {/* If iframe fails to load */}
            {iframeError && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-50 p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <Globe className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h4 className="text-base font-bold text-slate-900">타깃 웹페이지 로드 안내</h4>
                  <p className="text-xs text-slate-500">
                    외부 사이트의 보안 설정 또는 응답 지연 시 아래 버튼을 통해 타깃 페이지로 즉시 이동할 수 있습니다.
                  </p>
                </div>
                <a
                  href={activeLink.targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>원본 타깃 사이트 열기</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        ) : (
          /* Reader View simulation */
          <div className="w-full h-full overflow-y-auto bg-slate-50 p-6 md:p-12">
            <div className="max-w-2xl mx-auto bg-white p-8 md:p-12 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{domain}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-400 font-normal">스마트 리더 모드</span>
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 leading-snug">
                  {activeLink.headline ? `관련 아티클: ${activeLink.headline}` : '추천 정보 아티클 원본 콘텐츠'}
                </h1>
                <p className="text-xs text-slate-400 mt-2">
                  원본 URL: <a href={activeLink.targetUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{activeLink.targetUrl}</a>
                </p>
              </div>

              <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700 space-y-4">
                <p className="text-base text-slate-800 font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  💡 이 화면은 방문자가 보게 되는 원본 콘텐츠(블로그, 뉴스 기사, 리뷰 글)를 보여주는 시뮬레이션입니다.
                  하단에 떠 있는 플로팅 배너를 통해 원하는 제휴 상품 또는 랜딩 페이지로 트래픽을 전환시킬 수 있습니다.
                </p>

                <p>
                  온라인 제휴 마케팅이나 브랜드 홍보 시, 신뢰도 높은 외부 전문 칼럼이나 유용한 통계 기사에 자신의 제품 배너를 부착하여 공유하면 자연스러운 신뢰 형성과 함께 높은 전환율(CTR)을 달성할 수 있습니다.
                </p>

                <div className="my-6 p-6 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900">핵심 요약 및 팁</h3>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                    <li>관련성 높은 타깃 글에 어울리는 배너 문구(Headline)를 매칭하세요.</li>
                    <li>시각적 주목도를 높이기 위해 로고와 고대비 버튼 컬러를 활용하세요.</li>
                    <li>방문자가 아래 배너의 버튼을 누르면 설정하신 제휴 링크로 즉시 연결됩니다.</li>
                  </ul>
                </div>

                <p>
                  하단의 플로팅 배너는 스크롤 위치와 관계없이 화면에 항상 유지되어 방문자의 시선을 사로잡으며, 클릭 시 설정된 제휴 페이지로 즉시 연결됩니다.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>타깃 도메인: {domain}</span>
                <a
                  href={activeLink.targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                >
                  원본 사이트 직접 열기 <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actual Live Floating CTA Banner */}
      {isBannerVisible ? (
        activeLink.position.startsWith('card-') ? (
          /* 3번 이미지 카드형 배너 (세로 스택 컴팩트 팝업 카드) */
          <div
            id="live-cta-banner"
            className={`fixed z-[999999] w-[260px] sm:w-[280px] p-4 rounded-2xl shadow-2xl border flex flex-col gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
              activeLink.position === 'card-bottom-left'
                ? 'bottom-6 left-6'
                : activeLink.position === 'card-bottom-right'
                ? 'bottom-6 right-6'
                : activeLink.position === 'card-top-left'
                ? 'top-16 left-6'
                : 'top-16 right-6'
            }`}
            style={{
              backgroundColor: activeLink.bgColor,
              color: textColor,
              borderColor: isLightBg ? '#e2e8f0' : '#334155',
            }}
          >
            {/* Top Row: Brand Logo & Close Button */}
            <div className="flex items-center justify-between">
              {activeLink.logoUrl ? (
                <img
                  id="live-logo"
                  src={activeLink.logoUrl}
                  alt="Logo"
                  className="w-9 h-9 rounded-xl object-cover bg-slate-800 shrink-0 border border-black/10 shadow-xs"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-xs"
                  style={{ backgroundColor: activeLink.btnColor }}
                >
                  CTA
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsBannerVisible(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-black/5 transition cursor-pointer"
                title="배너 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Middle: Badge & Headline & Subtext */}
            <div className="space-y-1">
              {activeLink.badgeText && (
                <span className="inline-block bg-amber-400 text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded mb-0.5">
                  {activeLink.badgeText}
                </span>
              )}
              <p
                id="live-headline"
                className="text-sm sm:text-base font-extrabold leading-snug break-keep"
                style={{ color: textColor }}
              >
                {activeLink.headline}
              </p>
              {activeLink.subtext && (
                <p
                  id="live-subtext"
                  className="text-xs leading-relaxed line-clamp-2"
                  style={{ color: subtextColor }}
                >
                  {activeLink.subtext}
                </p>
              )}
            </div>

            {/* Bottom: 100% Full Width CTA Button */}
            <button
              id="live-btn-link"
              type="button"
              onClick={() => onCtaClick(activeLink.id, activeLink.btnUrl)}
              className="w-full py-2.5 px-4 text-xs sm:text-sm font-bold text-white rounded-xl shadow-md transition hover:opacity-95 active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: activeLink.btnColor }}
            >
              <span id="live-btn-text">{activeLink.btnText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* 기존 가로형 바 배너 (bottom-floating, bottom-bar, top-bar) */
          <div
            id="live-cta-banner"
            className={`fixed left-1/2 -translate-x-1/2 w-[94%] max-w-xl p-3.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 z-[999999] transition-all duration-300 ${
              activeLink.position === 'top-bar'
                ? 'top-14 rounded-b-2xl border-t-0'
                : activeLink.position === 'bottom-bar'
                ? 'bottom-0 rounded-t-2xl border-b-0 w-full max-w-none left-0 translate-x-0'
                : 'bottom-4 rounded-2xl border'
            }`}
            style={{
              backgroundColor: activeLink.bgColor,
              color: textColor,
              borderColor: isLightBg ? '#e2e8f0' : '#334155',
            }}
          >
            {/* Logo & Headline */}
            <div className="flex items-center gap-3 overflow-hidden min-w-0">
              {activeLink.logoUrl ? (
                <img
                  id="live-logo"
                  src={activeLink.logoUrl}
                  alt="Logo"
                  className="w-9 h-9 rounded-full object-cover bg-slate-700 shrink-0 border border-black/10"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : null}
              <div className="overflow-hidden min-w-0">
                <div className="flex items-center gap-1.5">
                  {activeLink.badgeText && (
                    <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded shrink-0">
                      {activeLink.badgeText}
                    </span>
                  )}
                  <p
                    id="live-headline"
                    className="text-xs md:text-sm font-bold truncate leading-tight"
                    style={{ color: textColor }}
                  >
                    {activeLink.headline}
                  </p>
                </div>
                {activeLink.subtext && (
                  <p
                    id="live-subtext"
                    className="text-[11px] truncate mt-0.5"
                    style={{ color: subtextColor }}
                  >
                    {activeLink.subtext}
                  </p>
                )}
              </div>
            </div>

            {/* Action Button & Close */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                id="live-btn-link"
                type="button"
                onClick={() => onCtaClick(activeLink.id, activeLink.btnUrl)}
                className="px-4 py-2 text-xs md:text-sm font-bold text-white rounded-xl shadow-md transition hover:opacity-90 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: activeLink.btnColor }}
              >
                <span id="live-btn-text">{activeLink.btnText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsBannerVisible(false)}
                className="text-slate-400 hover:text-white p-1 transition cursor-pointer"
                title="배너 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      ) : (
        /* Reopen Floating Trigger */
        <button
          onClick={() => setIsBannerVisible(true)}
          className="fixed bottom-4 right-4 bg-slate-900/95 text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-xl border border-slate-700 flex items-center gap-1.5 z-[999999] hover:bg-slate-800 transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          배너 다시 보기
        </button>
      )}
    </section>
  );
};
