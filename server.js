import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4177;

app.use(express.json({ limit: '20mb' }));

app.get('/api/steam/workshop', async (req, res) => {
  const ids = String(req.query.ids || '')
    .split(/[\s,;]+/)
    .map((x) => x.trim())
    .filter((x) => /^\d{6,20}$/.test(x))
    .slice(0, 100);

  if (!ids.length) return res.json({ items: [] });

  const params = new URLSearchParams();
  params.set('itemcount', String(ids.length));
  ids.forEach((id, i) => params.set(`publishedfileids[${i}]`, id));

  try {
    const response = await fetch('https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const data = await response.json();
    const raw = data?.response?.publishedfiledetails || [];
    const items = raw.map((it) => ({
      id: String(it.publishedfileid || ''),
      ok: it.result === 1,
      result: it.result,
      title: it.title || `Workshop ${it.publishedfileid}`,
      preview: it.preview_url || '',
      url: it.file_url || `https://steamcommunity.com/sharedfiles/filedetails/?id=${it.publishedfileid}`,
      creator: it.creator || '',
      description: it.file_description || '',
      timeCreated: it.time_created || null,
      timeUpdated: it.time_updated || null,
      tags: it.tags || [],
    }));
    res.json({ items });
  } catch (error) {
    res.status(502).json({ error: error.message, items: [] });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Quest JSON Editor listening on http://0.0.0.0:${PORT}`);
});
