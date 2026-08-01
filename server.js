import 'dotenv/config';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4177;

app.use(express.json({ limit: '20mb' }));

async function loadAiBrainConfig() {
  const defaults = {
    provider: 'openai',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.75,
    maxOutputTokens: 700,
    systemInstruction: 'You are a game quest writer for a Rust XDQuest server. Write concise, punchy quest text with dry humor, but do not be cruel. Preserve XDQuest rich text tags such as <color=yellow>...</color> when useful. Return strict JSON only.',
    userInstruction: 'Generate improved quest title, description, and mission text for the provided quest. Use questContext to understand the uploaded Quest.json, nearby questline steps, group tone, permissions, rewards, and naming patterns. Keep the same quest mechanics, target, count, rewards, permission, repeatability, and part/questline intent. Do not invent unsupported rewards or requirements.',
    outputShape: {
      QuestDisplayName: 'string, may include XDQuest <color=#hex> tags',
      QuestDescription: 'string, player-facing description',
      QuestMissions: 'string, short objective text'
    }
  };
  try {
    const raw = await fs.readFile(path.join(__dirname, 'ai-brain.config.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed, outputShape: { ...defaults.outputShape, ...(parsed.outputShape || {}) } };
  } catch {
    return defaults;
  }
}

function sanitizeQuestForAi(q = {}) {
  const rewards = Array.isArray(q.PrizeList) ? q.PrizeList.slice(0, 12).map((r) => ({
    PrizeName: r.PrizeName || '',
    PrizeType: r.PrizeType,
    ItemAmount: r.ItemAmount,
    ItemShortName: r.ItemShortName || '',
    CustomItemName: r.CustomItemName || '',
    PrizeCommand: r.PrizeCommand || '',
    IsHidden: !!r.IsHidden
  })) : [];
  return {
    QuestID: q.QuestID,
    QuestDisplayName: q.QuestDisplayName || '',
    QuestDescription: q.QuestDescription || '',
    QuestMissions: q.QuestMissions || '',
    QuestType: q.QuestType,
    QuestPermission: q.QuestPermission || '',
    Target: q.Target || '',
    ActionCount: q.ActionCount,
    IsRepeatable: !!q.IsRepeatable,
    Cooldown: q.Cooldown,
    rewards
  };
}

function sanitizeQuestContextForAi(context = {}) {
  return {
    source: String(context.source || 'uploaded Quest.json').slice(0, 120),
    totalQuests: Number(context.totalQuests) || 0,
    selectedQuestId: context.selectedQuestId ?? null,
    selectedGroup: String(context.selectedGroup || '').slice(0, 120),
    selectedSeries: String(context.selectedSeries || '').slice(0, 180),
    graphLinks: Number(context.graphLinks) || 0,
    groupCounts: Array.isArray(context.groupCounts) ? context.groupCounts.slice(0, 20) : [],
    relatedQuestCount: Number(context.relatedQuestCount) || 0,
    relatedQuests: Array.isArray(context.relatedQuests) ? context.relatedQuests.slice(0, 28).map((q) => ({
      QuestID: q.QuestID,
      title: String(q.title || '').slice(0, 220),
      rawTitle: String(q.rawTitle || '').slice(0, 260),
      description: String(q.description || '').slice(0, 700),
      mission: String(q.mission || '').slice(0, 360),
      type: String(q.type || '').slice(0, 80),
      QuestType: q.QuestType,
      QuestPermission: String(q.QuestPermission || '').slice(0, 160),
      group: String(q.group || '').slice(0, 120),
      series: String(q.series || '').slice(0, 180),
      part: q.part ?? null,
      target: String(q.target || '').slice(0, 160),
      ActionCount: q.ActionCount,
      repeatable: !!q.repeatable,
      cooldown: q.cooldown,
      rewards: Array.isArray(q.rewards) ? q.rewards.slice(0, 8) : []
    })) : []
  };
}

function parseAiJson(text = '') {
  try { return JSON.parse(text); } catch {}
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) { try { return JSON.parse(fenced); } catch {} }
  const object = text.match(/\{[\s\S]*\}/)?.[0];
  if (object) return JSON.parse(object);
  throw new Error('AI response was not valid JSON');
}

app.get('/api/ai/status', async (req, res) => {
  const config = await loadAiBrainConfig();
  res.json({ enabled: !!process.env.OPENAI_API_KEY, provider: config.provider || 'openai', model: config.model, configFile: 'ai-brain.config.json' });
});

app.post('/api/ai/quest-text', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(400).json({ error: 'OPENAI_API_KEY is not set on the local server. Copy .env.example to .env and add your token locally.' });
  const config = await loadAiBrainConfig();
  if ((config.provider || 'openai') !== 'openai') return res.status(400).json({ error: `Unsupported AI provider: ${config.provider}` });
  const quest = sanitizeQuestForAi(req.body?.quest || {});
  const questContext = sanitizeQuestContextForAi(req.body?.questContext || {});
  const brief = String(req.body?.brief || '').slice(0, 2000);
  const mode = String(req.body?.mode || 'rewrite').slice(0, 80);
  const body = {
    model: config.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: Number.isFinite(Number(config.temperature)) ? Number(config.temperature) : 0.75,
    max_tokens: Number.isFinite(Number(config.maxOutputTokens)) ? Number(config.maxOutputTokens) : 700,
    messages: [
      { role: 'system', content: String(config.systemInstruction || '') },
      { role: 'user', content: JSON.stringify({ task: mode, userBrief: brief, instruction: config.userInstruction, outputShape: config.outputShape, quest, questContext }, null, 2) }
    ],
    response_format: { type: 'json_object' }
  };
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || `OpenAI request failed (${response.status})` });
    const content = data?.choices?.[0]?.message?.content || '';
    const parsed = parseAiJson(content);
    res.json({
      provider: 'openai',
      model: body.model,
      suggestion: {
        QuestDisplayName: String(parsed.QuestDisplayName || quest.QuestDisplayName || ''),
        QuestDescription: String(parsed.QuestDescription || quest.QuestDescription || ''),
        QuestMissions: String(parsed.QuestMissions || quest.QuestMissions || '')
      },
      raw: parsed
    });
  } catch (error) {
    res.status(502).json({ error: error.message || 'AI request failed' });
  }
});

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
