import React from 'react';
import { Link2, MousePointerClick } from 'lucide-react';

interface HeaderProps {
  totalLinks: number;
  totalClicks: number;
}

export const Header: React.FC<HeaderProps> = ({
  totalLinks,
  totalClicks,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-slate-900 tracking-tight">LinkOverlay</span>
              <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold border border-blue-200">
                제휴 마케팅 CTA 빌더
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              외부 웹 콘텐츠에 내 제휴 배너를 결합한 초단축 링크 생성기
            </p>
          </div>
        </div>

        {/* Right Status & Metrics */}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>등록 링크 <strong>{typeof totalLinks === 'number' && !isNaN(totalLinks) ? totalLinks : 0}</strong>개</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 text-slate-700">
              <MousePointerClick className="w-3.5 h-3.5 text-blue-600" />
              <span>총 클릭 <strong>{typeof totalClicks === 'number' && !isNaN(totalClicks) ? totalClicks : 0}</strong>회</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
