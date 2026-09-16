import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  Check,
  Copy,
  Globe,
  Share2,
  ShieldCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  buildShareUrl,
  copyTextToClipboard,
  getSavedDomain,
  setSavedDomain,
  isDevContainerOrigin,
  getRecommendedPublicDomain,
} from '../utils/linkUtils';
import { LinkItem } from '../types';

interface ShortUrlBoxProps {
  link: LinkItem;
  onCopy?: (url: string) => void;
  className?: string;
  compact?: boolean;
}

export const ShortUrlBox: React.FC<ShortUrlBoxProps> = ({
  link,
  onCopy,
  className = '',
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeDomain, setActiveDomain] = useState<string>(getSavedDomain());
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [preDomainLive, setPreDomainLive] = useState<boolean | null>(null);

  useEffect(() => {
    setActiveDomain(getSavedDomain());
  }, []);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const recommendedPublic = getRecommendedPublicDomain();

  // Test if ais-pre is published by AI Studio [Share]
  const checkPublicDeployment = async (domainToTest: string) => {
    if (!domainToTest) return;
    setCheckingDomain(true);
    try {
      const res = await fetch(`/api/check-domain?domain=${encodeURIComponent(domainToTest)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.reachable) {
          setPreDomainLive(true);
          setSavedDomain(domainToTest);
          setActiveDomain(domainToTest);
        } else {
          setPreDomainLive(false);
        }
      } else {
        setPreDomainLive(false);
      }
    } catch {
      setPreDomainLive(false);
    } finally {
      setCheckingDomain(false);
    }
  };

  useEffect(() => {
    if (recommendedPublic && isDevContainerOrigin(currentOrigin)) {
      checkPublicDeployment(recommendedPublic);
    }
  }, [recommendedPublic, currentOrigin]);

  // Determine effective share URL
  const effectiveOrigin = activeDomain || (preDomainLive && recommendedPublic ? recommendedPublic : currentOrigin);
  const shareUrl = buildShareUrl(link, effectiveOrigin);
  const isDev = isDevContainerOrigin(effectiveOrigin);

  const handleCopyLink = async () => {
    const success = await copyTextToClipboard(shareUrl);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
    if (onCopy) onCopy(shareUrl);
  };

  return (
    <div
      id={`short-url-box-${link.id}`}
      className={`bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4 ${className}`}
    >
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              배포용 단축 링크
            </h4>
            <p className="text-[11px] text-slate-500">
              클릭 시 원본 사이트와 함께 등록하신 CTA 제휴 배너가 노출됩니다
            </p>
          </div>
        </div>

        <div>
          {preDomainLive ? (
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              공개 배포됨 (Cookie check 없음)
            </span>
          ) : (
            <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              /{link.slug}
            </span>
          )}
        </div>
      </div>

      {/* 2. URL Input & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 flex items-center">
          <input
            type="text"
            readOnly
            value={shareUrl}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="w-full bg-transparent text-xs sm:text-sm font-mono text-slate-800 focus:outline-none select-all truncate"
            title="클릭 시 전체 선택"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95 ${
              copiedLink
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4" />
                <span>복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>링크 복사</span>
              </>
            )}
          </button>

          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 flex items-center justify-center gap-1 transition shadow-xs"
            title="새 창에서 실제 화면 열기"
          >
            <span>열기</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* 3. Target Destination Info */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-slate-500 shrink-0 font-medium">연결 원본:</span>
          <span className="font-mono text-slate-700 truncate" title={link.targetUrl}>
            {link.targetUrl}
          </span>
        </div>
        <a
          href={link.targetUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5 font-semibold text-[11px]"
        >
          <span>원본 보기</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* 4. Why "Cookie check" appears & How to resolve */}
      {isDev && !preDomainLive && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-950">
                카카오톡에 링크를 올릴 때 「Cookie check」가 나타나는 이유
              </p>
              <p className="text-[11px] leading-relaxed text-amber-900">
                현재 주소(<code>ais-dev-</code>)는 <strong>구글이 잠궈둔 '개발자 본인 전용' 비공개 주소</strong>입니다.
                외부인이나 카카오톡 로봇이 접속하면 구글 로그인 검사(<code>Cookie check</code>) 화면으로 막히게 됩니다.
              </p>
            </div>
          </div>

          <div className="bg-white/80 border border-amber-200 rounded-lg p-2.5 text-[11px] text-slate-700 space-y-1">
            <p className="font-semibold text-amber-950">
              👉 「Cookie check」 완전히 없애는 2가지 방법:
            </p>
            <p>
              <strong>1. [공식 방법]</strong> 화면 맨 위 오른쪽(AI Studio 상단 바)의 파란색 <strong>[Share (공유)]</strong> 버튼을 클릭하세요. 구글이 잠금을 해제하여 누구나 열 수 있는 공식 주소로 자동 연결됩니다.
            </p>
            <p>
              <strong>2. [지금 당장 카톡 전송 시]</strong> 카톡에 링크를 붙여넣었을 때 아래에 뜨는 작은 미리보기 카드의 <strong>[✕ (닫기)]</strong> 버튼을 누르고 글을 전송하시면, 이상한 'Cookie check' 상자 없이 깔끔한 링크만 전송됩니다.
            </p>
          </div>

          <div className="pt-0.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => checkPublicDeployment(recommendedPublic)}
              disabled={checkingDomain}
              className="text-[11px] text-amber-800 hover:text-amber-950 underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${checkingDomain ? 'animate-spin' : ''}`} />
              <span>{checkingDomain ? '배포 상태 확인 중...' : '상단 [Share] 클릭 후 배포 완료 확인'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
