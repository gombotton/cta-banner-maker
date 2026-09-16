import type { IncomingMessage, ServerResponse } from 'http';

interface VercelRequest extends IncomingMessage {
  query: Record<string, string | string[]>;
  body: any;
  method?: string;
  url?: string;
}

interface VercelResponse extends ServerResponse {
  status: (statusCode: number) => VercelResponse;
  json: (body: any) => void;
  send: (body: any) => void;
  setHeader: (name: string, value: string | number | readonly string[]) => this;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).send('OK');
    return;
  }

  const targetUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;

  if (!targetUrl || typeof targetUrl !== 'string') {
    res.status(400).send('Missing target url query parameter');
    return;
  }

  try {
    let fetchUrl = targetUrl.trim();

    // 1. Handle Naver Blog post URLs -> fetch clean authentic article view
    const naverPostMatch =
      fetchUrl.match(/(?:m\.)?blog\.naver\.com\/([a-zA-Z0-9_-]+)\/(\d+)/i) ||
      fetchUrl.match(
        /blog\.naver\.com\/PostView\.naver\?.*?(?:blogId=([a-zA-Z0-9_-]+).*?logNo=(\d+)|logNo=(\d+).*?blogId=([a-zA-Z0-9_-]+))/i
      ) ||
      fetchUrl.match(
        /section\.blog\.naver\.com\/.*?(?:blogId=([a-zA-Z0-9_-]+).*?logNo=(\d+)|logNo=(\d+).*?blogId=([a-zA-Z0-9_-]+))/i
      );

    if (naverPostMatch) {
      const blogId = naverPostMatch[1] || naverPostMatch[4];
      const logNo = naverPostMatch[2] || naverPostMatch[3];
      if (blogId && logNo && !['PostView', 'BlogHome', 'Recommendation'].includes(blogId)) {
        fetchUrl = `https://m.blog.naver.com/${blogId}/${logNo}`;
      }
    } else if (fetchUrl.includes('section.blog.naver.com')) {
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

    const contentType = response.headers.get('content-type') || 'text/html';

    // If target is not HTML (images, styles, json, etc.), stream directly
    if (!contentType.includes('text/html')) {
      res.setHeader('Content-Type', contentType);
      const buffer = await response.arrayBuffer();
      res.status(response.status).send(Buffer.from(buffer));
      return;
    }

    let html = await response.text();
    const parsedUrl = new URL(fetchUrl);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

    // 1. Strip any existing relative or absolute <base> tags that break relative scripts/styles
    html = html.replace(/<base[^>]*>/gi, '');

    // 2. Inject high-priority absolute <base> tag to correctly resolve all images, fonts, and stylesheets
    const baseTag = `<base href="${baseUrl}/">`;
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n  ${baseTag}`);
    } else if (html.includes('<head ')) {
      html = html.replace(/(<head[^>]*>)/i, `$1\n  ${baseTag}`);
    } else {
      html = `${baseTag}\n${html}`;
    }

    // 3. Replace Naver SmartEditor lazy-loaded blur thumbnails with high-res full images
    html = html.replace(
      /src="([^"]*w80_blur[^"]*)"\s+data-lazy-src="([^"]+)"/gi,
      'src="$2" data-lazy-src="$2"'
    );
    html = html.replace(
      /data-lazy-src="([^"]+)"\s+src="([^"]*w80_blur[^"]*)"/gi,
      'src="$1" data-lazy-src="$1"'
    );

    // 4. Neutralize aggressive frame-busting scripts (top.location, window.top, parent.location)
    html = html.replace(/top\.location\.href\s*=/gi, 'void(0); /* neutralized */ window.__dummy =');
    html = html.replace(/top\.location\.replace/gi, 'void /* neutralized */');
    html = html.replace(/top\.location\s*=/gi, 'void(0); /* neutralized */ window.__dummy =');
    html = html.replace(/window\.top\.location/gi, 'window.self.location');
    html = html.replace(/parent\.location\.href\s*=/gi, 'void(0); /* neutralized */ window.__dummy =');
    html = html.replace(/if\s*\(\s*top\s*!==\s*self\s*\)/gi, 'if (false)');
    html = html.replace(/if\s*\(\s*window\s*!==\s*window\.top\s*\)/gi, 'if (false)');
    html = html.replace(/if\s*\(\s*top\.location\s*!==\s*self\.location\s*\)/gi, 'if (false)');

    // 5. Inject client-side anti-framebuster patch into the page head
    const antiFrameBustScript = `
    <script>
      try {
        window.onbeforeunload = null;
        Object.defineProperty(window, 'top', { get: function() { return window.self; } });
        Object.defineProperty(window, 'parent', { get: function() { return window.self; } });
      } catch(e) {}
    </script>
    `;
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n${antiFrameBustScript}`);
    }

    // Set permissive headers for embedding inside iframe
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(html);
  } catch (err: any) {
    console.error('Vercel proxy error:', err);
    res.status(502).send(`Proxy fetch failed: ${err?.message || 'Unknown error'}`);
  }
}
