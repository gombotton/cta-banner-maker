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

function getStoragePath(): string {
  const tmpPath = path.join('/tmp', 'links.json');
  const localPath = path.join(process.cwd(), 'data', 'links.json');
  if (fs.existsSync(localPath)) return localPath;
  return tmpPath;
}

function readLinks(): any[] {
  try {
    const filePath = getStoragePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,DELETE');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ status: 'ok' });
    return;
  }

  const rawSlug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  const slug = rawSlug ? decodeURIComponent(rawSlug).toLowerCase().trim() : '';

  if (!slug) {
    res.status(400).json({ success: false, error: 'Slug parameter is required' });
    return;
  }

  const links = readLinks();
  const link = links.find(
    (l) =>
      l.slug?.toLowerCase().trim() === slug ||
      l.id?.toLowerCase().trim() === slug ||
      encodeURIComponent(l.slug?.toLowerCase().trim() || '') === slug
  );

  if (link) {
    res.status(200).json({ success: true, link });
  } else {
    res.status(404).json({ success: false, error: 'Link not found' });
  }
}
