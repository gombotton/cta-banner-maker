import React from 'react';
import {
  Sparkles,
  Globe,
  Image as ImageIcon,
  PlusCircle,
  Palette,
  LayoutTemplate,
  Tag,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { BannerPosition, LinkItem } from '../types';
import { buildShareUrl, copyTextToClipboard } from '../utils/linkUtils';

export interface FormState {
  targetUrl: string;
  customSlug?: string;
  logoUrl: string;
  headline: string;
  subtext: string;
  btnText: string;
  btnUrl: string;
  bgColor: string;
  btnColor: string;
  position: BannerPosition;
  badgeText: string;
}

interface LinkBuilderFormProps {
  formState: FormState;
  onChange: (updates: Partial<FormState>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onApplyPreset?: (presetIndex: number) => void;
  isCreating?: boolean;
  errors?: Record<string, string | undefined>;
  newlyCreatedLink?: LinkItem | null;
  onCopyCreatedLink?: (url: string) => void;
  onOpenOverlay?: (link: LinkItem) => void;
}

const COLOR_PRESETS = [
  { name: '로열 블루', value: '#2563eb' },
  { name: '에메랄드 그린', value: '#10b981' },
  { name: '앰버 오렌지', value: '#f59e0b' },
  { name: '루비 레드', value: '#ef4444' },
  { name: '바이올렛', value: '#8b5cf6' },
  { name: '비비드 핑크', value: '#ec4899' },
];

const PRESET_LOGOS = [
  { label: '아바타 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' },
  { label: '아바타 2', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80' },
  { label: '추천 배지', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60' },
  { label: '스토어 아이콘', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=100&auto=format&fit=crop&q=80' },
];

export const LinkBuilderForm: React.FC<LinkBuilderFormProps> = ({
  formState,
  onChange,
  onSubmit,
  isCreating = false,
  errors = {} as Record<string, string | undefined>,
  newlyCreatedLink,
  onCopyCreatedLink,
  onOpenOverlay,
}) => {
  const [createdCopied, setCreatedCopied] = React.useState(false);
  const currentSlugPreview = formState.customSlug?.trim()
    ? formState.customSlug.trim().toLowerCase()
    : (formState.targetUrl ? '자동생성' : 'slug');

  const handleCopyNewLink = async () => {
    if (!newlyCreatedLink) return;
    const url = buildShareUrl(newlyCreatedLink);
    const success = await copyTextToClipboard(url);
    if (success) {
      setCreatedCopied(true);
      setTimeout(() => setCreatedCopied(false), 2000);
    }
    if (onCopyCreatedLink) onCopyCreatedLink(url);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            새로운 CTA 배너 링크 생성
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            외부 유용한 콘텐츠에 내 브랜드 또는 제휴 마케팅 배너를 오버레이로 부착합니다.
          </p>
        </div>
      </div>

      <form id="cta-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {/* 1) Target URL & Custom Slug */}
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-target-url" className="block text-xs font-semibold text-slate-700">
                공유할 원본 글 링크 (Target URL) <span className="text-rose-500">*</span>
              </label>
              {formState.targetUrl && (
                <a
                  href={formState.targetUrl.startsWith('http') ? formState.targetUrl : `https://${formState.targetUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  원본 링크 열기 <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                id="input-target-url"
                value={formState.targetUrl}
                onChange={(e) => onChange({ targetUrl: e.target.value })}
                placeholder="예: https://blog.naver.com/htc1046/224410940058 또는 news.daum.net/..."
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:ring-2 focus:outline-none transition ${
                  errors.targetUrl
                    ? 'bg-rose-50/50 border border-rose-400 focus:ring-rose-500'
                    : 'bg-slate-50 border border-slate-300 focus:bg-white focus:ring-blue-500'
                }`}
              />
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            {errors.targetUrl ? (
              <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.targetUrl}</p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">
                * 방문자가 보게 될 원본 블로그, 뉴스 기사, 웹페이지 주소 (http:// 미입력 시 https:// 자동 적용)
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-custom-slug" className="block text-xs font-medium text-slate-600">
                단축 링크 경로 / 슬러그 (선택)
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                생성될 주소: /l/{currentSlugPreview}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-xs text-slate-500 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg px-2.5 py-2 select-none font-mono">
                /l/
              </span>
              <input
                type="text"
                id="input-custom-slug"
                value={formState.customSlug || ''}
                onChange={(e) => onChange({ customSlug: e.target.value.replace(/[^a-zA-Z0-9가-힣_-]/g, '') })}
                placeholder="비워두면 타깃 링크 기반 자동 생성 (예: my-deal, 청소기추천)"
                maxLength={40}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-r-lg focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              * 영문, 숫자, 한글, 하이픈(-) 사용 가능 (비워두면 타깃 사이트명으로 자동 생성)
            </p>
          </div>
        </div>

        {/* 2) Logo image URL */}
        <div>
          <label htmlFor="input-logo-url" className="block text-xs font-semibold text-slate-700 mb-1">
            로고/프로필 이미지 URL (선택)
          </label>
          <div className="relative mb-1.5">
            <input
              type="text"
              id="input-logo-url"
              value={formState.logoUrl}
              onChange={(e) => onChange({ logoUrl: e.target.value })}
              placeholder="https://example.com/my-logo.png"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
            <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Quick preset avatar selector */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="text-[11px] text-slate-400">빠른 이미지 선택:</span>
            <div className="flex items-center gap-1.5">
              {PRESET_LOGOS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChange({ logoUrl: p.url })}
                  className="w-6 h-6 rounded-full overflow-hidden border border-slate-300 hover:border-blue-500 transition shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title={p.label}
                >
                  <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                </button>
              ))}
              {formState.logoUrl && (
                <button
                  type="button"
                  onClick={() => onChange({ logoUrl: '' })}
                  className="text-[11px] text-slate-400 hover:text-rose-500 ml-1"
                >
                  지우기
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3) Headline & Subtext */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="input-headline" className="block text-xs font-semibold text-slate-700 mb-1">
              메인 카피 (배너 문구) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="input-headline"
              value={formState.headline}
              onChange={(e) => onChange({ headline: e.target.value })}
              placeholder="글 속 추천 1위 청소기 오늘만 35% 할인!"
              maxLength={80}
              className={`w-full px-3 py-2 text-sm rounded-lg focus:ring-2 focus:outline-none transition ${
                errors.headline
                  ? 'bg-rose-50/50 border border-rose-400 focus:ring-rose-500'
                  : 'bg-slate-50 border border-slate-300 focus:bg-white focus:ring-blue-500'
              }`}
            />
            {errors.headline && (
              <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.headline}</p>
            )}
          </div>
          <div>
            <label htmlFor="input-subtext" className="block text-xs font-semibold text-slate-700 mb-1">
              보조 설명 (서브 텍스트)
            </label>
            <input
              type="text"
              id="input-subtext"
              value={formState.subtext}
              onChange={(e) => onChange({ subtext: e.target.value })}
              placeholder="선착순 쿠폰 마감 임박 | 제휴 수수료 포함"
              maxLength={100}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            />
          </div>
        </div>

        {/* 4) Button Text & Affiliate Target URL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="input-btn-text" className="block text-xs font-semibold text-slate-700 mb-1">
              버튼 문구 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="input-btn-text"
              value={formState.btnText}
              onChange={(e) => onChange({ btnText: e.target.value })}
              placeholder="최저가 보러가기"
              maxLength={25}
              className={`w-full px-3 py-2 text-sm rounded-lg focus:ring-2 focus:outline-none transition ${
                errors.btnText
                  ? 'bg-rose-50/50 border border-rose-400 focus:ring-rose-500'
                  : 'bg-slate-50 border border-slate-300 focus:bg-white focus:ring-blue-500'
              }`}
            />
            {errors.btnText && (
              <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.btnText}</p>
            )}
          </div>
          <div>
            <label htmlFor="input-btn-url" className="block text-xs font-semibold text-slate-700 mb-1">
              버튼 이동 링크 (제휴/랜딩 URL) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="input-btn-url"
              value={formState.btnUrl}
              onChange={(e) => onChange({ btnUrl: e.target.value })}
              placeholder="https://link.coupang.com/a/xxx 또는 스마트스토어"
              className={`w-full px-3 py-2 text-sm rounded-lg focus:ring-2 focus:outline-none transition ${
                errors.btnUrl
                  ? 'bg-rose-50/50 border border-rose-400 focus:ring-rose-500'
                  : 'bg-slate-50 border border-slate-300 focus:bg-white focus:ring-blue-500'
              }`}
            />
            {errors.btnUrl ? (
              <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.btnUrl}</p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1">
                * 방문자가 CTA 버튼 클릭 시 이동할 링크 (https:// 자동 보정)
              </p>
            )}
          </div>
        </div>

        {/* 5) Banner Design & Colors */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Palette className="w-3.5 h-3.5 text-blue-600" />
            배너 디자인 & 컬러
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Background Theme */}
            <div>
              <label htmlFor="input-bg-theme" className="block text-xs font-semibold text-slate-600 mb-1">
                배경 테마:
              </label>
              <select
                id="input-bg-theme"
                value={formState.bgColor}
                onChange={(e) => onChange({ bgColor: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
              >
                <option value="#0f172a">다크 네이비 (#0f172a)</option>
                <option value="#18181b">매트 블랙 (#18181b)</option>
                <option value="#ffffff">화이트 (#ffffff)</option>
                <option value="#064e3b">딥 에메랄드 (#064e3b)</option>
                <option value="#312e81">로열 인디고 (#312e81)</option>
              </select>
            </div>

            {/* Button Color with presets */}
            <div>
              <label htmlFor="input-btn-color" className="block text-xs font-semibold text-slate-600 mb-1">
                버튼 컬러:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="input-btn-color"
                  value={formState.btnColor}
                  onChange={(e) => onChange({ btnColor: e.target.value })}
                  className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
                />
                <div className="flex items-center gap-1">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => onChange({ btnColor: color.value })}
                      className="w-5 h-5 rounded-full border border-slate-200 transition transform hover:scale-110 shrink-0"
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Banner Layout Position */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                배너 위치 & 형태:
              </label>
              <select
                value={formState.position}
                onChange={(e) => onChange({ position: e.target.value as BannerPosition })}
                className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-800"
              >
                <optgroup label="카드형 (3번 이미지 스타일 - 세로 스택형)">
                  <option value="card-bottom-left">카드형 - 좌측 하단 (추천 ⭐️)</option>
                  <option value="card-bottom-right">카드형 - 우측 하단</option>
                  <option value="card-top-left">카드형 - 좌측 상단</option>
                  <option value="card-top-right">카드형 - 우측 상단</option>
                </optgroup>
                <optgroup label="가로 바형 (전체 가로 너비)">
                  <option value="bottom-floating">하단 중앙 플로팅 바 (기본형)</option>
                  <option value="bottom-bar">하단 전체 고정 바</option>
                  <option value="top-bar">상단 전체 고정 바</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Optional Badge Tag */}
          <div className="flex items-center gap-2 pt-1">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-600 font-medium">강조 배지 문구 (선택):</span>
            <input
              type="text"
              value={formState.badgeText}
              onChange={(e) => onChange({ badgeText: e.target.value })}
              placeholder="예: 오늘만특가, 단독혜택"
              maxLength={10}
              className="text-xs px-2 py-1 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:ring-1 focus:ring-blue-500 max-w-[160px]"
            />
          </div>
        </div>

        {/* Submit button with loading state */}
        <button
          type="submit"
          disabled={isCreating}
          className="w-full mt-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>배포용 CTA 단축 링크 생성 중...</span>
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>배포용 CTA 단축 링크 생성하기</span>
            </>
          )}
        </button>

        {/* Newly Created Link Notification */}
        {newlyCreatedLink && (
          <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="text-xs font-bold text-emerald-900 truncate">
                  🎉 CTA 단축 링크가 성공적으로 생성되었습니다!
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                /{newlyCreatedLink.slug}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-100">
              <button
                type="button"
                onClick={handleCopyNewLink}
                className="flex-1 min-w-[120px] py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                {createdCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {createdCopied ? '복사 완료!' : '단축 링크 복사'}
              </button>
              <a
                href={buildShareUrl(newlyCreatedLink)}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 shadow-2xs"
                title="새 탭에서 실제 화면 열기"
              >
                <span>새 탭에서 열기</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
              {onOpenOverlay && (
                <button
                  type="button"
                  onClick={() => onOpenOverlay(newlyCreatedLink)}
                  className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                  title="이 창에서 즉시 오버레이 화면 확인"
                >
                  <span>오버레이 보기</span>
                </button>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
