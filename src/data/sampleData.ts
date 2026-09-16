import { LinkItem } from '../types';

export const SAMPLE_PRESETS: Omit<LinkItem, 'id' | 'slug' | 'clicks' | 'createdAt'>[] = [
  {
    targetUrl: 'https://blog.naver.com/htc1046/224410940058',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60',
    headline: '왜 너만 없어?',
    subtext: '화제의 필수템 지금 바로 확인하기',
    btnText: '구경하기',
    btnUrl: 'https://www.wadiz.io',
    bgColor: '#ffffff',
    btnColor: '#ef4444',
    position: 'card-bottom-left',
    badgeText: '인기'
  },
  {
    targetUrl: 'https://en.wikipedia.org/wiki/Special:Random',
    logoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    headline: '녹·찌든때 3초 컷! 러스티노 멀티 클리너',
    subtext: '선착순 한정 40% 얼리버드 특가 마감 임박',
    btnText: '특가 확인하기',
    btnUrl: 'https://smartstore.naver.com',
    bgColor: '#0f172a',
    btnColor: '#2563eb',
    position: 'bottom-floating',
    badgeText: '인기특가'
  },
  {
    targetUrl: 'https://ko.wikipedia.org/wiki/%EC%9D%B8%EA%B3%B5%EC%A7%80%EB%8A%A5',
    logoUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    headline: '화제의 생산성 AI 툴 전용 20% 할인 쿠폰',
    subtext: '지금 신청 시 프리미엄 템플릿 즉시 지급',
    btnText: '쿠폰 발급받기',
    btnUrl: 'https://google.com',
    bgColor: '#ffffff',
    btnColor: '#10b981',
    position: 'card-bottom-right',
    badgeText: '단독할인'
  }
];

export const INITIAL_LINKS: LinkItem[] = [
  {
    id: 'link_init_1',
    slug: 'why-not',
    targetUrl: 'https://blog.naver.com/htc1046/224410940058',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60',
    headline: '왜 너만 없어?',
    subtext: '화제의 필수템 지금 바로 확인하기',
    btnText: '구경하기',
    btnUrl: 'https://www.wadiz.io/web/campaign/detail/418074',
    bgColor: '#ffffff',
    btnColor: '#ef4444',
    position: 'card-bottom-left',
    badgeText: '추천',
    clicks: 28,
    createdAt: '2026. 9. 15.'
  },
  {
    id: 'link_init_2',
    slug: 'clean3s',
    targetUrl: 'https://en.wikipedia.org/wiki/Special:Random',
    logoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    headline: '녹·찌든때 3초 컷! 러스티노 멀티 클리너',
    subtext: '선착순 한정 40% 얼리버드 특가 마감 임박 | 제휴 수수료 포함',
    btnText: '특가 확인하기',
    btnUrl: 'https://smartstore.naver.com',
    bgColor: '#0f172a',
    btnColor: '#2563eb',
    position: 'bottom-floating',
    badgeText: '인기특가',
    clicks: 14,
    createdAt: '2026. 9. 14.'
  }
];
