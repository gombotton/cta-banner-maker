export type BannerPosition =
  | 'card-bottom-left'
  | 'card-bottom-right'
  | 'card-top-left'
  | 'card-top-right'
  | 'bottom-floating'
  | 'bottom-bar'
  | 'top-bar';

export interface LinkItem {
  id: string;
  slug: string;
  targetUrl: string;
  logoUrl?: string;
  headline: string;
  subtext?: string;
  btnText: string;
  btnUrl: string;
  bgColor: string;
  btnColor: string;
  textColor?: string;
  badgeText?: string;
  position: BannerPosition;
  clicks: number;
  createdAt: string;
  shortUrl?: string;
}

export type ViewMode = 'builder' | 'viewer';
