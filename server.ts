import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), 'data', 'links.json');

// Helper to read links
function readLinks(): any[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const raw = JSON.parse(content) || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((l, idx) => ({
      ...l,
      id: l.id || `link_${l.slug || idx}_${Date.now()}`,
      clicks: typeof l.clicks === 'number' && !isNaN(l.clicks) ? l.clicks : 0,
      createdAt: l.createdAt || new Date().toLocaleDateString('ko-KR'),
      headline: l.headline || '제목 없음',
      btnText: l.btnText || '보러가기',
      btnUrl: l.btnUrl || '',
      bgColor: l.bgColor || '#ffffff',
      btnColor: l.btnColor || '#ef4444',
      position: l.position || 'card-bottom-left',
      badgeText: l.badgeText || '',
      subtext: l.subtext || '',
    }));
  } catch (err) {
    console.error('Error reading links file:', err);
    return [];
  }
}

// Helper to write links
function writeLinks(links: any[]): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(links, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing links file:', err);
  }
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '5mb' }));

  // Enable CORS for API requests so shared domains and previews can communicate smoothly
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Check if a shared domain is publicly reachable (200 OK) or still 404
  app.get('/api/check-domain', async (req, res) => {
    const domain = (req.query.domain as string) || '';
    if (!domain) {
      return res.status(400).json({ reachable: false, error: 'Domain is required' });
    }
    try {
      const target = domain.startsWith('http') ? domain : `https://${domain}`;
      const response = await fetch(target, {
        method: 'HEAD',
        signal: AbortSignal.timeout(3500),
      });
      return res.json({
        reachable: response.status < 400,
        statusCode: response.status,
      });
    } catch (err: any) {
      return res.json({
        reachable: false,
        error: err.message,
      });
    }
  });

  // Get all links
  app.get('/api/links', (req, res) => {
    const links = readLinks();
    res.json({ success: true, links });
  });

  // Get single link by slug
  app.get('/api/links/:slug', (req, res) => {
    const slug = req.params.slug.toLowerCase().trim();
    const links = readLinks();
    const link = links.find((l) => l.slug?.toLowerCase() === slug);

    if (!link) {
      return res.status(404).json({ success: false, message: 'Link not found' });
    }
    res.json({ success: true, link });
  });

  // Short URL endpoint: returns direct share link (/l/:slug) with no third-party redirection or cookie checks
  app.post('/api/shorten', (req, res) => {
    const { alias, linkId } = req.body;
    const forwardedHost = req.headers['x-forwarded-host'] as string;
    const forwardedProto = (req.headers['x-forwarded-proto'] as string) || 'https';
    const host =
      forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')
        ? `${forwardedProto}://${forwardedHost}`
        : 'https://ais-dev-l5ojttbanf7x2ilz4awgmy-194786970987.asia-northeast1.run.app';

    const slug = alias || linkId || 'link';
    const directUrl = `${host}/l/${slug}`;
    return res.json({ success: true, shortUrl: directUrl });
  });

  // Create or update link
  app.post('/api/links', async (req, res) => {
    const newLink = { ...req.body };
    if (!newLink || !newLink.targetUrl || !newLink.slug) {
      return res.status(400).json({ success: false, message: 'Missing targetUrl or slug' });
    }

    newLink.id = newLink.id || `link_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    newLink.clicks = typeof newLink.clicks === 'number' && !isNaN(newLink.clicks) ? newLink.clicks : 0;
    newLink.createdAt = newLink.createdAt || new Date().toLocaleDateString('ko-KR');

    // Generate direct share link (/l/:slug)
    let origin = req.body.origin;
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      const forwardedHost = req.headers['x-forwarded-host'] as string;
      const forwardedProto = (req.headers['x-forwarded-proto'] as string) || 'https';
      if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
        origin = `${forwardedProto}://${forwardedHost}`;
      } else {
        origin = 'https://ais-dev-l5ojttbanf7x2ilz4awgmy-194786970987.asia-northeast1.run.app';
      }
    }

    newLink.shortUrl = `${origin}/l/${newLink.slug}`;

    const links = readLinks();
    const idMatchIndex = links.findIndex((l) => l.id === newLink.id);

    if (idMatchIndex >= 0) {
      links[idMatchIndex] = { ...links[idMatchIndex], ...newLink };
    } else {
      // Ensure slug uniqueness across distinct links
      let uniqueSlug = newLink.slug.toLowerCase().trim();
      let counter = 1;
      while (links.some((l) => l.slug?.toLowerCase() === uniqueSlug && l.id !== newLink.id)) {
        uniqueSlug = `${newLink.slug}-${counter}`;
        counter++;
      }
      newLink.slug = uniqueSlug;
      links.unshift(newLink);
    }

    writeLinks(links);
    res.json({ success: true, link: newLink });
  });

  // Batch sync links from client (keeps browser links and server database in sync)
  app.post('/api/links/sync', (req, res) => {
    const clientLinks = req.body?.links;
    if (!Array.isArray(clientLinks)) {
      return res.status(400).json({ success: false, message: 'Expected array of links' });
    }

    const currentLinks = readLinks();
    const existingIds = new Set(currentLinks.map((l) => l.id));
    const existingSlugs = new Set(currentLinks.map((l) => l.slug?.toLowerCase()));

    let addedCount = 0;
    for (const cl of clientLinks) {
      if (cl && cl.targetUrl && cl.slug) {
        if (!existingIds.has(cl.id) && !existingSlugs.has(cl.slug.toLowerCase())) {
          currentLinks.push(cl);
          existingIds.add(cl.id);
          existingSlugs.add(cl.slug.toLowerCase());
          addedCount++;
        }
      }
    }

    if (addedCount > 0) {
      writeLinks(currentLinks);
    }
    res.json({ success: true, total: currentLinks.length, added: addedCount });
  });

  // Delete single link
  app.delete('/api/links/:id', (req, res) => {
    const { id } = req.params;
    const links = readLinks();
    const filtered = links.filter((l) => l.id !== id && l.slug !== id);
    writeLinks(filtered);
    res.json({ success: true, remaining: filtered.length });
  });

  // Delete all links
  app.delete('/api/links', (req, res) => {
    writeLinks([]);
    res.json({ success: true });
  });

  // Increment click count
  app.post('/api/links/:slug/click', (req, res) => {
    const slug = req.params.slug.toLowerCase().trim();
    const links = readLinks();
    const link = links.find((l) => l.slug?.toLowerCase() === slug || l.id === slug);

    if (link) {
      link.clicks = (link.clicks || 0) + 1;
      writeLinks(links);
      return res.json({ success: true, clicks: link.clicks });
    }
    res.status(404).json({ success: false, message: 'Link not found' });
  });

  // Proxy endpoint for sites with frame restrictions (removes X-Frame-Options & CSP)
  app.get('/api/proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send('Missing url query parameter');
    }

    try {
      let fetchUrl = targetUrl.trim();

      // 1. Handle Naver Blog post URLs (blog.naver.com/userId/logNo or PostView.naver) -> fetch clean authentic article view
      const naverPostMatch =
        fetchUrl.match(/(?:m\.)?blog\.naver\.com\/([a-zA-Z0-9_-]+)\/(\d+)/i) ||
        fetchUrl.match(/blog\.naver\.com\/PostView\.naver\?.*?(?:blogId=([a-zA-Z0-9_-]+).*?logNo=(\d+)|logNo=(\d+).*?blogId=([a-zA-Z0-9_-]+))/i) ||
        fetchUrl.match(/section\.blog\.naver\.com\/.*?(?:blogId=([a-zA-Z0-9_-]+).*?logNo=(\d+)|logNo=(\d+).*?blogId=([a-zA-Z0-9_-]+))/i);

      if (naverPostMatch) {
        const blogId = naverPostMatch[1] || naverPostMatch[4];
        const logNo = naverPostMatch[2] || naverPostMatch[3];
        if (blogId && logNo && !['PostView', 'BlogHome', 'Recommendation'].includes(blogId)) {
          fetchUrl = `https://m.blog.naver.com/${blogId}/${logNo}`;
        }
      } else if (fetchUrl.includes('section.blog.naver.com')) {
        // Section blog home portal -> Recommendation feed
        fetchUrl = 'https://m.blog.naver.com/Recommendation.naver';
      }

      const response = await fetch(fetchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
        },
      });

      let html = await response.text();

      // Ensure relative links, stylesheets, and assets resolve to original host
      const urlObj = new URL(fetchUrl);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

      // Remove any existing relative base tag (like <base href="/home" />) which breaks relative assets
      html = html.replace(/<base[^>]*>/gi, '');
      if (html.includes('<head>') || html.includes('<head ')) {
        html = html.replace(/<head([^>]*)>/i, `<head$1>\n<base href="${baseUrl}/">`);
      } else {
        html = `<base href="${baseUrl}/">\n` + html;
      }

      // Neutralize frame-busting scripts (top.location = ... / window.top !== window.self)
      html = html.replace(/([^\w$])(top|parent)\.location/g, '$1window.__safe_dummy_loc');
      html = html.replace(/([^\w$])window\.top([^\w$])/g, '$1window.self$2');

      // Replace Naver SmartEditor lazy-loaded blur thumbnails with high-res full images
      html = html.replace(
        /src="([^"]*w80_blur[^"]*)"\s+data-lazy-src="([^"]+)"/gi,
        'src="$2" data-lazy-src="$2"'
      );
      html = html.replace(
        /data-lazy-src="([^"]+)"\s+src="([^"]*w80_blur[^"]*)"/gi,
        'src="$1" data-lazy-src="$1"'
      );

      // Inject styling and smooth navigation script without altering original page logic
      const customInjections = `
        <script>
          (function() {
            // Ensure target page buttons, forms, and logins execute natively
            document.addEventListener('click', function(e) {
              var el = e.target;
              while (el && el.tagName !== 'A') {
                el = el.parentElement;
              }
              if (!el) return;

              var href = el.getAttribute('href');
              if (!href || href === '#' || href.indexOf('javascript:') === 0) {
                // Interactive in-page buttons (comments, likes, toggles, popups) - do not touch
                return;
              }

              var target = el.getAttribute('target');
              // If link already has explicit target (_top, _blank) or is auth/login, allow native behavior
              if (target === '_top' || target === '_blank' || href.indexOf('nid.naver.com') !== -1) {
                return;
              }

              // Standard content navigation links: open in new tab so visitor session & cookies are preserved
              // and cross-origin frame restrictions cannot block navigation
              el.setAttribute('target', '_blank');
            }, true);
          })();
        </script>
        <style id="cta-target-enhancement">
          html, body {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            height: auto !important;
            min-height: 100vh !important;
            background: #ffffff !important;
            padding-bottom: 90px !important;
            -webkit-overflow-scrolling: touch !important;
          }
          #ct, .ct_wrap, ._postView, .post_ct, .se-viewer, .se-main-container {
            overflow: visible !important;
            height: auto !important;
            min-height: 100vh !important;
            visibility: visible !important;
            display: block !important;
          }
          .se-main-container {
            margin: 0 auto !important;
          }
          img.se-image-resource, img.img {
            opacity: 1 !important;
            visibility: visible !important;
            max-width: 100% !important;
            height: auto !important;
          }
        </style>
      `;

      if (html.includes('</head>')) {
        html = html.replace('</head>', `${customInjections}\n</head>`);
      } else {
        html = customInjections + html;
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');
      res.send(html);
    } catch (err: any) {
      console.error('Proxy error:', err);
      res.status(500).send(`Failed to proxy target URL: ${err.message}`);
    }
  });

  // Direct redirect route: /r/:slug (instant direct jump to targetUrl)
  app.get('/r/:slug', (req, res) => {
    let slug = '';
    try {
      slug = decodeURIComponent(req.params.slug).toLowerCase().trim();
    } catch {
      slug = req.params.slug.toLowerCase().trim();
    }
    const links = readLinks();
    const matched = links.find((l) => l.slug?.toLowerCase() === slug || l.id === slug);
    if (matched && matched.targetUrl) {
      matched.clicks = (matched.clicks || 0) + 1;
      writeLinks(links);
      return res.redirect(302, matched.targetUrl);
    }
    res.redirect(302, '/');
  });

  // Helper to serve index.html with preloaded link injection
  const serveAppWithPreload = async (req: express.Request, res: express.Response, vite?: any) => {
    const url = req.originalUrl;
    try {
      let template = '';
      const prodPath = path.resolve(process.cwd(), 'dist/index.html');
      const devPath = path.resolve(process.cwd(), 'index.html');
      if (process.env.NODE_ENV === 'production' && fs.existsSync(prodPath)) {
        template = fs.readFileSync(prodPath, 'utf-8');
      } else if (fs.existsSync(devPath)) {
        template = fs.readFileSync(devPath, 'utf-8');
      } else if (fs.existsSync(prodPath)) {
        template = fs.readFileSync(prodPath, 'utf-8');
      } else {
        template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
      }

      // Check if this request is for a short link (/l/:slug)
      const cleanPath = req.path.split('?')[0];
      const slugMatch = cleanPath.match(/^\/l\/([^/?#]+)/i) || url.match(/^\/l\/([^/?#]+)/i);
      if (slugMatch && slugMatch[1]) {
        let slug = '';
        try {
          slug = decodeURIComponent(slugMatch[1]).toLowerCase().trim();
        } catch {
          slug = slugMatch[1].toLowerCase().trim();
        }
        const links = readLinks();
        const matched = links.find((l) => l.slug?.toLowerCase() === slug || l.id === slug);
        if (matched) {
          const script = `<script>window.__PRELOADED_LINK__ = ${JSON.stringify(matched)};</script>`;
          template = template.replace('</head>', `${script}\n</head>`);

          // Dynamically inject OpenGraph, Twitter, and Title tags for scrapers (KakaoTalk, Facebook, etc.)
          const pageTitle = matched.headline ? `${matched.headline}` : 'LinkOverlay';
          const pageDesc = matched.subtext || matched.headline || '콘텐츠와 제휴 배너를 확인하세요.';
          const safeTitle = pageTitle.replace(/"/g, '&quot;');
          const safeDesc = pageDesc.replace(/"/g, '&quot;');

          template = template.replace(/<title>.*?<\/title>/i, `<title>${safeTitle} - LinkOverlay</title>`);
          template = template.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${safeTitle}" />`);
          template = template.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${safeDesc}" />`);
          template = template.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${safeDesc}" />`);

          if (matched.logoUrl) {
            const safeImg = matched.logoUrl.replace(/"/g, '&quot;');
            const ogImgTag = `<meta property="og:image" content="${safeImg}" />\n<meta name="twitter:image" content="${safeImg}" />`;
            template = template.replace('</head>', `${ogImgTag}\n</head>`);
          }
        }
      }

      if (vite) {
        template = await vite.transformIndexHtml(url, template);
        const viteClientTag = '<script type="module" src="/@vite/client"></script>';
        if (template.includes(viteClientTag)) {
          template = template.replace(viteClientTag, '');
          template = template.replace('</head>', `${viteClientTag}\n</head>`);
        }
      }
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e: any) {
      res.status(500).send(e.message);
    }
  };

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'custom',
    });

    // Handle public short link routes first with injected preloaded data
    app.get('/l/:slug', async (req, res) => {
      await serveAppWithPreload(req, res, vite);
    });

    app.use(vite.middlewares);

    // Fallback for SPA routes
    app.use('*', async (req, res) => {
      await serveAppWithPreload(req, res, vite);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', async (req, res) => {
      await serveAppWithPreload(req, res);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
