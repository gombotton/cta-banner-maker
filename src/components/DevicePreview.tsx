import React, { useState } from 'react';
import {
  CheckCircle2,
  Lock,
  Smartphone,
  Monitor,
  ExternalLink,
  Sparkles,
  X
} from 'lucide-react';
import { FormState } from './LinkBuilderForm';

interface DevicePreviewProps {
  formState: FormState;
  activeSlug?: string;
  onTestClick?: () => void;
}

export const DevicePreview: React.FC<DevicePreviewProps> = ({
  formState,
  activeSlug = 'sample',
  onTestClick,
}) => {
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  const headline = formState.headline.trim() || '배너 메인 카피를 입력하세요';
  const subtext = formState.subtext.trim() || '보조 설명 문구가 여기에 들어갑니다';
  const btnText = formState.btnText.trim() || '보러가기';
  const logoUrl =
    formState.logoUrl.trim() ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60';
  const isLightBg = formState.bgColor === '#ffffff';
  const textColor = isLightBg ? '#0f172a' : '#ffffff';
  const subtextColor = isLightBg ? '#64748b' : '#94a3b8';

  const previewShortUrl = `https://linkoverlay.app/r/${activeSlug}`;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full max-w-[360px] sticky top-20">
        {/* Preview Toolbar */}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <span>실시간 미리보기</span>
            <div className="flex bg-slate-200/80 p-0.5 rounded-md ml-1">
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1 rounded transition ${
                  previewDevice === 'mobile'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="모바일 뷰"
              >
                <Smartphone className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1 rounded transition ${
                  previewDevice === 'desktop'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="데스크톱 뷰"
              >
                <Monitor className="w-3 h-3" />
              </button>
            </div>
          </div>
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Live
          </span>
        </div>

        {/* Device Mockup Shell */}
        {previewDevice === 'mobile' ? (
          /* Mobile Phone Mockup */
          <div className="w-full aspect-[9/18.5] bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-800 relative flex flex-col overflow-hidden">
            {/* Top Speaker Notch */}
            <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-2 shrink-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-slate-900 mr-2"></div>
              <div className="w-8 h-1 bg-slate-700 rounded-full"></div>
            </div>

            {/* Screen Inner */}
            <div className="w-full flex-1 bg-white rounded-[26px] overflow-hidden flex flex-col relative border border-slate-100 shadow-inner">
              {/* Browser URL Bar */}
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center gap-1.5 text-[10px] text-slate-500 shrink-0">
                <Lock className="w-2.5 h-2.5 text-emerald-600" />
                <span id="preview-url-bar" className="truncate font-mono">
                  {previewShortUrl}
                </span>
              </div>

              {/* Mock Article Content */}
              <div className="p-3.5 space-y-2.5 overflow-y-auto flex-1 select-none opacity-85">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-16 bg-blue-100 text-blue-600 text-[8px] font-bold rounded flex items-center justify-center px-1">
                    TECH ISSUE
                  </div>
                  <div className="text-[9px] text-slate-400">2026. 09. 15</div>
                </div>

                <div className="h-4 w-5/6 bg-slate-800 rounded font-bold text-[11px] text-transparent leading-none">
                  title placeholder
                </div>
                <div className="h-3 w-1/2 bg-slate-200 rounded"></div>

                <div className="w-full h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex flex-col items-center justify-center text-[10px] text-slate-500 border border-slate-200 p-2 text-center">
                  <span className="font-semibold text-slate-700 mb-0.5">[ 원본 정보성 기사 본문 영역 ]</span>
                  <span className="text-[9px] text-slate-400">방문자가 읽고 있는 웹사이트 콘텐츠</span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="h-2 w-full bg-slate-100 rounded"></div>
                  <div className="h-2 w-full bg-slate-100 rounded"></div>
                  <div className="h-2 w-4/5 bg-slate-100 rounded"></div>
                  <div className="h-2 w-full bg-slate-100 rounded"></div>
                  <div className="h-2 w-3/4 bg-slate-100 rounded"></div>
                </div>
              </div>

              {/* Floating CTA Banner inside Mobile Phone */}
              {!isBannerDismissed ? (
                formState.position.startsWith('card-') ? (
                  /* 3번 이미지 카드형 배너 (세로 스택 컴팩트 팝업) */
                  <div
                    id="preview-banner"
                    className={`absolute transition-all duration-300 z-10 w-[172px] p-3 rounded-2xl shadow-2xl border flex flex-col gap-2 ${
                      formState.position === 'card-bottom-left'
                        ? 'bottom-3 left-2.5'
                        : formState.position === 'card-bottom-right'
                        ? 'bottom-3 right-2.5'
                        : formState.position === 'card-top-left'
                        ? 'top-9 left-2.5'
                        : 'top-9 right-2.5'
                    }`}
                    style={{
                      backgroundColor: formState.bgColor,
                      color: textColor,
                      borderColor: isLightBg ? '#e2e8f0' : '#334155',
                    }}
                  >
                    {/* Top Row: Logo & Close Button */}
                    <div className="flex items-center justify-between">
                      <img
                        id="preview-logo"
                        src={logoUrl}
                        alt="logo"
                        className="w-7 h-7 rounded-xl object-cover bg-slate-800 shadow-xs border border-black/10 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setIsBannerDismissed(true)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md transition"
                        title="배너 닫기 테스트"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Middle: Badge & Headline */}
                    <div className="space-y-0.5">
                      {formState.badgeText && (
                        <span className="inline-block bg-amber-400 text-slate-900 text-[8px] font-black px-1 rounded mb-0.5">
                          {formState.badgeText}
                        </span>
                      )}
                      <div
                        id="preview-headline"
                        className="text-[12px] font-extrabold leading-snug line-clamp-2 break-keep"
                        style={{ color: textColor }}
                      >
                        {headline}
                      </div>
                      {subtext && (
                        <div
                          id="preview-subtext"
                          className="text-[9px] line-clamp-2 leading-tight mt-0.5"
                          style={{ color: subtextColor }}
                        >
                          {subtext}
                        </div>
                      )}
                    </div>

                    {/* Bottom: 100% Full Width CTA Button */}
                    <button
                      id="preview-btn"
                      type="button"
                      onClick={onTestClick}
                      className="w-full text-white text-[11px] font-bold py-2 px-2 rounded-xl text-center shadow-md hover:opacity-95 active:scale-98 transition cursor-pointer"
                      style={{ backgroundColor: formState.btnColor }}
                    >
                      {btnText}
                    </button>
                  </div>
                ) : (
                  /* 가로형 바 배너 (bottom-floating, bottom-bar, top-bar) */
                  <div
                    id="preview-banner"
                    className={`absolute transition-all duration-300 z-10 p-2.5 shadow-xl border flex items-center justify-between gap-2 ${
                      formState.position === 'top-bar'
                        ? 'top-8 left-0 right-0 rounded-b-xl border-t-0'
                        : formState.position === 'bottom-bar'
                        ? 'bottom-0 left-0 right-0 rounded-t-xl border-b-0'
                        : 'bottom-2.5 left-2 right-2 rounded-xl border-slate-700/40'
                    }`}
                    style={{
                      backgroundColor: formState.bgColor,
                      color: textColor,
                      borderColor: isLightBg ? '#e2e8f0' : '#334155',
                    }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden min-w-0">
                      <img
                        id="preview-logo"
                        src={logoUrl}
                        alt="logo"
                        className="w-7 h-7 rounded-full object-cover bg-slate-800 shrink-0 border border-black/10"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60';
                        }}
                      />
                      <div className="overflow-hidden min-w-0">
                        <div className="flex items-center gap-1">
                          {formState.badgeText && (
                            <span className="bg-amber-400 text-slate-900 text-[8px] font-black px-1 rounded">
                              {formState.badgeText}
                            </span>
                          )}
                          <div
                            id="preview-headline"
                            className="text-[11px] font-bold truncate leading-tight"
                            style={{ color: textColor }}
                          >
                            {headline}
                          </div>
                        </div>
                        <div
                          id="preview-subtext"
                          className="text-[9px] truncate mt-0.5 leading-none"
                          style={{ color: subtextColor }}
                        >
                          {subtext}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        id="preview-btn"
                        type="button"
                        onClick={onTestClick}
                        className="text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-sm hover:opacity-90 active:scale-95 transition"
                        style={{ backgroundColor: formState.btnColor }}
                      >
                        {btnText}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsBannerDismissed(true)}
                        className="text-slate-400 hover:text-slate-200 p-0.5"
                        title="배너 닫기 테스트"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => setIsBannerDismissed(false)}
                  className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[9px] px-2 py-1 rounded-full backdrop-blur-xs flex items-center gap-1 shadow z-20"
                >
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  배너 다시 열기
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Desktop Browser Mockup */
          <div className="w-full bg-slate-900 rounded-2xl p-2.5 shadow-2xl border-2 border-slate-800 flex flex-col h-[480px]">
            {/* Window Controls & URL Bar */}
            <div className="flex items-center gap-2 pb-2 px-1">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              </div>
              <div className="bg-slate-800 text-slate-300 px-3 py-1 rounded text-[10px] flex items-center gap-1.5 flex-1 font-mono">
                <Lock className="w-2.5 h-2.5 text-emerald-400" />
                <span className="truncate">{previewShortUrl}</span>
              </div>
            </div>

            {/* Desktop Screen Inner */}
            <div className="w-full flex-1 bg-white rounded-xl overflow-hidden flex flex-col relative border border-slate-100 p-4">
              <div className="space-y-3 opacity-80 select-none">
                <div className="h-5 w-2/3 bg-slate-800 rounded"></div>
                <div className="h-3 w-1/3 bg-slate-200 rounded"></div>
                <div className="w-full h-36 bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400 border border-slate-200">
                  [ 데스크톱 웹 콘텐츠 영역 ]
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-slate-100 rounded"></div>
                  <div className="h-2 w-5/6 bg-slate-100 rounded"></div>
                  <div className="h-2 w-full bg-slate-100 rounded"></div>
                </div>
              </div>

              {/* Desktop Floating Banner */}
              {!isBannerDismissed && (
                formState.position.startsWith('card-') ? (
                  <div
                    className={`absolute z-10 w-[210px] p-3.5 rounded-2xl shadow-2xl border flex flex-col gap-2.5 transition-all ${
                      formState.position === 'card-bottom-left'
                        ? 'bottom-4 left-4'
                        : formState.position === 'card-bottom-right'
                        ? 'bottom-4 right-4'
                        : formState.position === 'card-top-left'
                        ? 'top-4 left-4'
                        : 'top-4 right-4'
                    }`}
                    style={{
                      backgroundColor: formState.bgColor,
                      color: textColor,
                      borderColor: isLightBg ? '#e2e8f0' : '#334155',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <img
                        src={logoUrl}
                        alt="logo"
                        className="w-8 h-8 rounded-xl object-cover shrink-0 border border-black/10 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setIsBannerDismissed(true)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      {formState.badgeText && (
                        <span className="inline-block bg-amber-400 text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded mb-1">
                          {formState.badgeText}
                        </span>
                      )}
                      <div className="text-xs font-bold leading-snug line-clamp-2" style={{ color: textColor }}>
                        {headline}
                      </div>
                      {subtext && (
                        <div className="text-[10px] mt-0.5 line-clamp-2" style={{ color: subtextColor }}>
                          {subtext}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={onTestClick}
                      className="w-full text-white text-xs font-bold py-2 rounded-xl text-center shadow-md hover:opacity-95 transition cursor-pointer"
                      style={{ backgroundColor: formState.btnColor }}
                    >
                      {btnText}
                    </button>
                  </div>
                ) : (
                  <div
                    className={`absolute p-3 shadow-xl flex items-center justify-between gap-3 border z-10 transition-all ${
                      formState.position === 'top-bar'
                        ? 'top-0 left-0 right-0 rounded-b-xl border-t-0'
                        : formState.position === 'bottom-bar'
                        ? 'bottom-0 left-0 right-0 rounded-t-xl border-b-0'
                        : 'bottom-4 left-4 right-4 rounded-xl'
                    }`}
                    style={{
                      backgroundColor: formState.bgColor,
                      color: textColor,
                      borderColor: isLightBg ? '#e2e8f0' : '#334155',
                    }}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <img
                        src={logoUrl}
                        alt="logo"
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold truncate">{headline}</div>
                        <div className="text-[10px] truncate" style={{ color: subtextColor }}>
                          {subtext}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={onTestClick}
                        className="text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow"
                        style={{ backgroundColor: formState.btnColor }}
                      >
                        {btnText}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsBannerDismissed(true)}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        <div className="text-center mt-2">
          <p className="text-[11px] text-slate-400">
            * 입력 폼을 수정하면 스마트폰 화면에 실시간으로 반영됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};
