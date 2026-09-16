import React, { useState } from 'react';
import {
  List,
  Eye,
  Trash2,
  Copy,
  Check,
  MousePointerClick,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { LinkItem } from '../types';
import { buildShareUrl, buildCleanShareUrl } from '../utils/linkUtils';

interface LinkListProps {
  links: LinkItem[];
  selectedLinkId?: string | null;
  onSelectLink: (link: LinkItem) => void;
  onDeleteLink: (id: string) => void;
  onClearAll: () => void;
  onCopyShortUrl: (item: LinkItem) => void;
  onLoadSample?: () => void;
}

export const LinkList: React.FC<LinkListProps> = ({
  links,
  selectedLinkId,
  onSelectLink,
  onDeleteLink,
  onClearAll,
  onCopyShortUrl,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (item: LinkItem) => {
    onCopyShortUrl(item);
    setCopiedId(item.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <List className="w-4 h-4 text-blue-600" />
          생성된 링크 목록 (<span id="link-count" className="text-blue-600 font-bold">{links.length}</span>개)
        </h3>
        {links.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 px-2.5 py-1 rounded-lg border border-rose-200/80 transition font-semibold cursor-pointer shadow-2xs"
            title="모든 링크 한 번에 삭제"
          >
            <Trash2 className="w-3 h-3" />
            전체 삭제
          </button>
        )}
      </div>

      <div id="link-list" className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
        {links.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
            <p className="text-slate-600 text-xs font-semibold">
              생성된 링크 목록이 비어 있습니다.
            </p>
            <p className="text-slate-400 text-[11px]">
              위 입력 폼에 정보를 입력하고 배포용 CTA 단축 링크를 생성해 보세요.
            </p>
          </div>
        ) : (
          links.map((item, index) => {
            const itemKey = item.id || `link_${item.slug || 'item'}_${index}`;
            const clickCount = typeof item.clicks === 'number' && !isNaN(item.clicks) ? item.clicks : 0;
            const isCopied = copiedId === item.id;
            const isSelected = selectedLinkId === item.id;
            const shareUrl = buildShareUrl(item);
            const cleanDisplayUrl = buildCleanShareUrl(item);

            return (
              <div
                key={itemKey}
                className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-blue-50/40 border-blue-300 shadow-2xs'
                    : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {/* Info Column */}
                <div className="overflow-hidden min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                      /{item.slug}
                    </span>
                    {item.badgeText && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {item.badgeText}
                      </span>
                    )}
                    <p className="text-xs font-bold text-slate-800 truncate" title={item.headline}>
                      {item.headline || '제목 없음'}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1" title={cleanDisplayUrl}>
                      <span className="text-slate-400 font-medium">단축주소:</span>
                      <span className="font-mono text-blue-700 truncate">{cleanDisplayUrl}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1" title={item.targetUrl}>
                      <span className="text-slate-400 font-medium">연결원본:</span>
                      <span className="truncate">{item.targetUrl}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <MousePointerClick className="w-3 h-3 text-blue-500" />
                      <strong>{clickCount}</strong>회 클릭
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.createdAt}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleCopy(item)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95 ${
                      isCopied
                        ? 'bg-emerald-600 text-white shadow-emerald-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    title="배포 링크(공유 URL) 복사"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>복사됨!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>링크 복사</span>
                      </>
                    )}
                  </button>

                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 text-xs bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-blue-600 rounded-lg font-medium flex items-center gap-1 transition shadow-xs"
                    title="새 창에서 실제 화면 열기"
                  >
                    <span>열기</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>

                  <button
                    type="button"
                    onClick={() => onSelectLink(item)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1 transition shadow-xs cursor-pointer ${
                      isSelected
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                    title="우측 스마트폰 미리보기에 적용"
                  >
                    <Eye className="w-3 h-3" />
                    <span>{isSelected ? '선택됨' : '미리보기'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteLink(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition cursor-pointer"
                    title="이 링크 삭제"
                    aria-label="링크 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
