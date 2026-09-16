import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';

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

// In-memory fallback cache for serverless lifetime
let memoryLinks: any[] = [];

function getStoragePath(): string {
  // Try /tmp/links.json in serverless environment, fallback to process.cwd()/data/links.json
  const tmpPath = path.join('/tmp', 'links.json');
  const localPath = path.join(process.cwd(), 'data', 'links.json');

  if (fs.existsSync(localPath)) {
    return localPath;
  }
  return tmpPath;
}

function readLinks(): any[] {
  try {
    const filePath = getStoragePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }
  return memoryLinks;
}

function writeLinks(links: any[]) {
  memoryLinks = links;
  try {
    const filePath = getStoragePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(links, null, 2), 'utf-8');
  } catch (e) {
    // In read-only environments, memoryLinks serves as cache
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ status: 'ok' });
    return;
  }

  // Parse body if needed
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  if (req.method === 'GET') {
    const links = readLinks();
    res.status(200).json({ success: true, links });
    return;
  }

  if (req.method === 'POST') {
    const links = readLinks();

    // Check if this is a sync call
    if (req.url?.includes('/sync') || body?.links) {
      const incoming = Array.isArray(body?.links) ? body.links : [];
      const map = new Map<string, any>();
      incoming.forEach((l: any) => {
        if (l && (l.id || l.slug)) {
          map.set(l.id || l.slug, l);
        }
      });
      links.forEach((l: any) => {
        if (l && (l.id || l.slug) && !map.has(l.id || l.slug)) {
          map.set(l.id || l.slug, l);
        }
      });
      const merged = Array.from(map.values());
      writeLinks(merged);
      res.status(200).json({ success: true, links: merged });
      return;
    }

    // Single link create
    const newLink = body;
    if (!newLink || !newLink.targetUrl) {
      res.status(400).json({ success: false, error: 'Target URL is required' });
      return;
    }

    const cleanSlug = (newLink.slug || 'link').toLowerCase().trim();
    const finalLink = {
      ...newLink,
      id: newLink.id || `link_${Date.now()}`,
      slug: cleanSlug,
      clicks: typeof newLink.clicks === 'number' ? newLink.clicks : 0,
      createdAt: newLink.createdAt || new Date().toLocaleDateString('ko-KR'),
    };

    const existingIndex = links.findIndex(
      (l) => l.slug?.toLowerCase() === cleanSlug || l.id === finalLink.id
    );

    if (existingIndex >= 0) {
      links[existingIndex] = { ...links[existingIndex], ...finalLink };
    } else {
      links.unshift(finalLink);
    }

    writeLinks(links);
    res.status(201).json({ success: true, link: finalLink });
    return;
  }

  if (req.method === 'DELETE') {
    writeLinks([]);
    res.status(200).json({ success: true, message: 'All links deleted' });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
