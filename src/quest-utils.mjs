export function parseColorTags(input = '') {
  const text = String(input ?? '');
  const tokens = [];
  const re = /<\/?color(?:=([^>]+))?>/gi;
  let last = 0;
  let match;
  while ((match = re.exec(text))) {
    if (match.index > last) tokens.push({ type: 'text', text: text.slice(last, match.index) });
    const raw = match[0];
    const closing = /^<\//.test(raw);
    tokens.push({ type: 'tag', text: raw, closing, color: closing ? null : normalizeColor(match[1] || '') });
    last = re.lastIndex;
  }
  if (last < text.length) tokens.push({ type: 'text', text: text.slice(last) });
  return tokens;
}

export function stripTags(input = '') {
  return String(input ?? '').replace(/<\/?color(?:=[^>]+)?>/gi, '');
}

export function escapeHtml(input = '') {
  return String(input ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderTaggedTextHtml(input = '') {
  const stack = [];
  let out = '';
  for (const token of parseColorTags(input)) {
    if (token.type === 'text') {
      const color = stack.at(-1);
      const safe = escapeHtml(token.text).replaceAll('\n', '<br/>');
      out += color ? `<span style="color:${escapeHtml(color)}">${safe}</span>` : safe;
    } else if (token.closing) {
      stack.pop();
    } else {
      stack.push(token.color);
    }
  }
  return out;
}

export function normalizeColor(raw) {
  const v = String(raw || '').trim().replace(/^['"]|['"]$/g, '');
  const named = {
    yellow: '#facc15', orange: '#fb923c', purple: '#c084fc', red: '#f87171', green: '#4ade80',
    blue: '#60a5fa', cyan: '#22d3ee', white: '#ffffff', black: '#111827', grey: '#9ca3af', gray: '#9ca3af'
  };
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return v;
  return named[v.toLowerCase()] || v || '#f8fafc';
}

export function questTitle(q) {
  return stripTags(q?.QuestDisplayName || q?.Name || q?.name || `Quest ${q?.QuestID ?? ''}`).trim();
}

export function questCategoryPrefix(q) {
  const display = String(q?.QuestDisplayName || '');
  const match = display.match(/^<color=#(?<hex>[0-9a-f]{6,8})>(?<name>[^<]*?)\$<\/color>/i);
  if (!match?.groups?.name) return null;
  const name = stripTags(match.groups.name).trim();
  if (!name) return null;
  return { name, hex: match.groups.hex };
}

export function parseQuestCategoryDisplayName(input = '') {
  const raw = String(input || '');
  const category = questCategoryPrefix({ QuestDisplayName: raw });
  let rest = category ? raw.replace(/^<color=#[0-9a-f]{6,8}>[^<]*?\$<\/color>\s*/i, '') : raw;
  let lineLabel = category?.name || '';
  let lineColor = category?.hex ? `#${category.hex}` : '#00BCD4';
  const lineMatch = rest.match(/^<color=(?<color>[^>]+)>(?<label>[^<:]+):\s*<\/color>\s*/i);
  if (lineMatch?.groups?.label) {
    lineLabel = lineMatch.groups.label.trim();
    lineColor = lineMatch.groups.color.trim();
    rest = rest.slice(lineMatch[0].length);
  }
  return {
    category: category?.name || '',
    categoryColor: category?.hex ? `#${category.hex}` : '#00BCD4',
    lineLabel,
    lineColor,
    title: rest.trim()
  };
}

export function composeQuestCategoryDisplayName({ category = '', categoryColor = '#00BCD4', lineLabel = '', lineColor = '', title = '' } = {}) {
  const cat = String(category || '').trim();
  const catColor = String(categoryColor || '#00BCD4').trim();
  const label = String(lineLabel || cat).trim();
  const labelColor = String(lineColor || catColor).trim();
  const cleanTitle = String(title || '').trim();
  if (!cat) return cleanTitle;
  const hex = catColor.match(/^#?[0-9a-f]{6,8}$/i) ? (catColor.startsWith('#') ? catColor : `#${catColor}`) : '#00BCD4';
  const prefix = `<color=${hex}>${cat}$</color>`;
  const line = label ? `<color=${labelColor}>${label}: </color>` : '';
  return `${prefix}${line}${cleanTitle}`;
}

export function questGroup(q) {
  const display = String(q?.QuestDisplayName || 'Untagged');
  const category = questCategoryPrefix(q);
  if (category?.name) return category.name;
  const tagMatch = display.match(/<color=[^>]+>([^<$:]+)<\/color>/i);
  if (tagMatch?.[1]) return stripTags(tagMatch[1]).replace(/[:$]/g, '').trim() || 'Untagged';
  const plain = stripTags(display);
  if (plain.includes('$')) return plain.split('$')[0].trim() || 'Untagged';
  if (plain.includes(':')) return plain.split(':')[0].replace(/[$]/g, '').trim() || 'Untagged';
  if (q?.QuestPermission) return String(q.QuestPermission).replace(/\d+$/,'') || 'Untagged';
  return 'Untagged';
}

export function partNumber(q) {
  const t = questTitle(q);
  const m = t.match(/\bpart\s*(\d+)\s*([a-z])?\b|\bpart(\d+)\s*([a-z])?\b|[-–:]\s*(\d+)\s*([a-z])?\s*$/i);
  if (!m) return null;
  const n = Number(m[1] || m[3] || m[5]);
  const letter = (m[2] || m[4] || m[6] || '').toLowerCase();
  return n + (letter ? (letter.charCodeAt(0) - 96) / 10 : 0);
}

export function permissionStem(permission = '') {
  return String(permission || '')
    .toLowerCase()
    .replace(/[_-]?(part|pt)?[_-]?\d+[a-z]?$/i, '')
    .replace(/\d+[a-z]?$/i, '')
    .replace(/[_-]+$/,'')
    .trim();
}

function normalizeQuestPermission(permission = '') {
  return String(permission || '')
    .trim()
    .toLowerCase()
    .replace(/^xdquest\./, '')
    .replace(/^oxide\.permission\./, '');
}

function grantedQuestPermissions(q = {}) {
  const grants = new Set();
  for (const prize of q?.PrizeList || []) {
    const command = String(prize?.PrizeCommand || '');
    const grantPatterns = [
      /(?:^|\s)(?:o\.grant|oxide\.grant)\s+(?:user|group)\s+\S+\s+([^\s]+)/gi,
      /(?:^|\s)grantperm\s+\S+\s+([^\s]+)(?:\s+\S+)?/gi
    ];
    for (const re of grantPatterns) {
      let match;
      while ((match = re.exec(command))) {
        const permission = normalizeQuestPermission(match[1]);
        if (permission) grants.add(permission);
      }
    }
  }
  return [...grants];
}

export function questSeriesKey(q) {
  let t = questTitle(q).replace(/\s+/g, ' ').trim();
  if (t.includes('$')) t = t.split('$').slice(1).join('$').trim();
  const colon = t.indexOf(':');
  let head = colon >= 0 ? t.slice(0, colon).trim() : questGroup(q);
  let tail = colon >= 0 ? t.slice(colon + 1).trim() : t;

  const part = partNumber(q);
  if (part != null) {
    let before = tail
      .replace(/[-–:]?\s*\bpart\s*\d+\s*[a-z]?\b.*$/i, '')
      .replace(/[-–:]?\s*\bpart\d+\s*[a-z]?\b.*$/i, '')
      .replace(/[-–:]\s*\d+\s*[a-z]?\s*$/i, '')
      .trim();
    if (!before || before.length < 3) before = '';
    return `${questGroup(q)}:${head}${before ? ':' + before : ''}`.toLowerCase().replace(/[^a-z0-9åäö:]+/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  const permStem = permissionStem(q?.QuestPermission);
  if (permStem && permStem.length > 2) return `${questGroup(q)}:perm:${permStem}`;
  return `${questGroup(q)}:${head}:${tail}`.toLowerCase().slice(0, 80);
}

export function questSortKey(q) {
  const p = partNumber(q);
  return [questSeriesKey(q), p == null ? 999 : p, q?.QuestID ?? 0].join('|');
}

export function cleanDisplayNameMarkup(input = '') {
  return String(input ?? '').replace(/^\s*<color=[^>]+>[^<]*\$<\/color>\s*/i, '');
}

export function rewardSummary(prizeList = []) {
  return (prizeList || []).map((r) => {
    const name = r.PrizeName || r.CustomItemName || r.ItemShortName || r.PrizeCommand || 'Reward';
    const amount = r.ItemAmount && r.ItemAmount !== 1 ? ` ×${r.ItemAmount}` : '';
    const skin = Number(r.ItemSkinID) ? ` · skin ${r.ItemSkinID}` : '';
    return `${name}${amount}${skin}`;
  });
}

export function extractSkinIds(q) {
  const ids = new Set();
  const add = (v) => { if (/^\d{6,20}$/.test(String(v || '')) && String(v) !== '0') ids.add(String(v)); };
  add(q?.Target);
  for (const r of q?.PrizeList || []) add(r.ItemSkinID);
  return [...ids];
}

export function buildQuestGraph(quests = []) {
  const nodes = quests.map((q, index) => ({
    id: String(q.QuestID ?? index),
    index,
    quest: q,
    title: questTitle(q),
    group: questGroup(q),
    series: questSeriesKey(q),
    part: partNumber(q),
    permissionStem: permissionStem(q.QuestPermission),
    requiredPermission: normalizeQuestPermission(q.QuestPermission),
    grantedPermissions: grantedQuestPermissions(q),
  }));
  const bySeries = new Map();
  for (const n of nodes) {
    if (!bySeries.has(n.series)) bySeries.set(n.series, []);
    bySeries.get(n.series).push(n);
  }
  const linkKeys = new Set();
  const links = [];
  const shouldAddNamePartLink = (a, b) => {
    // A one-time intro quest can grant access into a repeatable loop, but that
    // relationship must be explicit in reward permissions. Plain title/part
    // matching is too weak here: domains often name the first repeatable step
    // like "Part 1.2" even though the real loopback is granted by the final
    // repeatable quest, not by the initial one-time quest.
    if (!a?.quest?.IsRepeatable && b?.quest?.IsRepeatable) return false;
    return true;
  };
  const addLink = (a, b, reason) => {
    if (!a || !b || a.id === b.id) return;
    if (reason === 'name-part' && !shouldAddNamePartLink(a, b)) return;
    const key = `${a.id}->${b.id}`;
    if (linkKeys.has(key)) return;
    linkKeys.add(key);
    links.push({ source: a.id, target: b.id, group: a.group, series: a.series, reason, inferred: true });
  };

  // Explicit prerequisite chain: a quest reward can grant the permission required by the next quest.
  const byRequiredPermission = new Map();
  for (const n of nodes) {
    if (!n.requiredPermission) continue;
    if (!byRequiredPermission.has(n.requiredPermission)) byRequiredPermission.set(n.requiredPermission, []);
    byRequiredPermission.get(n.requiredPermission).push(n);
  }
  for (const n of nodes) {
    for (const granted of n.grantedPermissions || []) {
      for (const target of byRequiredPermission.get(granted) || []) addLink(n, target, 'permission-grant');
    }
  }

  for (const [series, items] of bySeries) {
    const partItems = items.filter(n => n.part != null).sort((a, b) => a.part - b.part || a.index - b.index);
    if (partItems.length > 1) for (let i = 1; i < partItems.length; i++) addLink(partItems[i - 1], partItems[i], 'name-part');
  }

  // Permission fallback: quests with similar permission stems and sequential part names often belong together.
  const byPermStem = new Map();
  for (const n of nodes) {
    if (!n.permissionStem || n.permissionStem.length < 3) continue;
    if (!byPermStem.has(n.permissionStem)) byPermStem.set(n.permissionStem, []);
    byPermStem.get(n.permissionStem).push(n);
  }
  for (const [stem, items] of byPermStem) {
    const sorted = items.slice().sort((a,b) => (a.part ?? 999) - (b.part ?? 999) || a.index - b.index);
    if (sorted.length > 1) for (let i=1;i<sorted.length;i++) addLink(sorted[i-1], sorted[i], 'permission');
  }

  return { nodes, links, groups: [...new Set(nodes.map(n => n.group))].sort(), series: [...bySeries.keys()].sort() };
}

export function newQuestTemplate(existing = []) {
  const ids = existing.map((q) => Number(q.QuestID)).filter(Number.isFinite);
  return {
    QuestID: ids.length ? Math.max(...ids) + 1 : Math.floor(10000 + Math.random() * 89999),
    QuestDisplayName: '<color=#00BCD4>New$</color><color=#00BCD4>New: </color>Untitled Quest - Part 1',
    QuestDisplayNameMultiLanguage: '',
    QuestDescription: 'Describe the quest here. Use <color=yellow>colored text</color> if needed.',
    QuestDescriptionMultiLanguage: '',
    QuestMissions: 'Do <color=yellow>1</color> thing',
    QuestMissionsMultiLanguage: '',
    QuestPermission: 'new_part_1',
    QuestType: 24,
    Target: '',
    IsReturnItemsRequired: false,
    IsMultiLanguage: false,
    ActionCount: 1,
    IsRepeatable: false,
    Cooldown: 0,
    PrizeList: []
  };
}
