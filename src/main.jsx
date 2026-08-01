import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { buildQuestGraph, cleanDisplayNameMarkup, extractSkinIds, newQuestTemplate, partNumber, questGroup, questSeriesKey, renderTaggedTextHtml, rewardSummary, stripTags } from './quest-utils.mjs';

const autosaveKey = 'quest-json-editor:last-config';
const backupsKey = 'quest-json-editor:local-backups';
const mapKey = (fileName) => `quest-json-editor-map:v3-cross-quest-access:${fileName || 'default'}`;
const APP_VERSION = 'v1.1.0-beta.1';
const CHANGELOG = [
  { version: 'v1.1.0-beta.1', date: '2026-08-01', items: [
    'Beta branch: added sidequest creation from any graph quest, including automatic permission reward wiring from source quest to new sidequest.',
    'Added a separated full in-game style quest preview panel in the fullscreen editor so preview and edit fields are easier to compare.'
  ] },
  { version: 'v1.0.17', date: '2026-08-01', items: [
    'Kept the graph navigation controls fixed in the viewport so Reset view, Center selected, zoom, and graph-mode actions remain visible while scrolling large maps.'
  ] },
  { version: 'v1.0.16', date: '2026-07-31', items: [
    'Added an edge detail card: click a graph line to see why it exists, source/target quests, strength, reward command evidence, and required permission.',
    'Selected graph edges are now highlighted so line debugging is easier on large quest maps.'
  ] },
  { version: 'v1.0.15', date: '2026-07-31', items: [
    'Renamed the graph edge legend entries to describe why each line exists, not just the internal inference type.',
    'Added short helper text under each legend entry so name/part, permission-name, reward-grant, cross-quest, manual, and loop/back links are easier to read.'
  ] },
  { version: 'v1.0.14', date: '2026-07-31', items: [
    'Fixed graph edge colors so rendered lines, arrowheads, and the edge legend use the same colors and labels.',
    'Added an explicit legend entry for permission grants instead of hiding them behind the generic permission-stem label.'
  ] },
  { version: 'v1.0.13', date: '2026-07-31', items: [
    'Fixed graph inference so one-time starter quests no longer auto-link into repeatable subloop quests by title/part name alone.',
    'Repeatable loop access is now shown only when an explicit reward permission/manual link exists, so final repeatable quests can loop back to the correct repeatable start.'
  ] },
  { version: 'v1.0.12', date: '2026-07-31', items: [
    'Removed the minimap from the graph because it did not add enough practical navigation value.',
    'Added a Graph boxes toggle with a Title-only mode for much smaller quest cards that make large grid views easier to scan.'
  ] },
  { version: 'v1.0.11', date: '2026-07-31', items: [
    'Redesigned the Add reward flow into a Quest Studio reward builder with card-style reward types, live preview, and less XDQuest-page-like layout.',
    'Added the 12G logo as the app icon, favicon, and header brand mark.'
  ] },
  { version: 'v1.0.10', date: '2026-07-31', items: [
    'Added Compact mode for dense graph nodes, tighter inspector spacing, and denser quest-list rows when editing large files.',
    'Compact mode is persisted in the browser autosave state so the editor stays in the chosen density after reload.'
  ] },
  { version: 'v1.0.9', date: '2026-07-31', items: [
    'Added Search related actions to Broken-chain helper rows so missing grantors, unused grants, and missing Part 1 warnings can jump straight to a focused quest-list search.',
    'Export diff details now include before/after value previews for changed fields instead of only listing the changed field names.'
  ] },
  { version: 'v1.0.8', date: '2026-07-31', items: [
    'Added a Broken-chain helper in Settings/export to flag missing Part 1 links, missing permission grantors, unused permission grants, and ambiguous permission grant chains.',
    'Expanded Export preview into clickable diff details so changed/added quests can be opened in the inspector or shown on the graph before download.'
  ] },
  { version: 'v1.0.7', date: '2026-07-31', items: [
    'Added Validation filters for errors, warnings, current quest, permission issues, reward issues, and map issues.',
    'Added a Graph edge legend that explains normal chains, permission links, reward unlocks, manual links, and loop/back edges.'
  ] },
  { version: 'v1.0.6', date: '2026-07-31', items: [
    'Added an Undo last action control for quest edits, saved modal edits, new/next quest creation, grid order changes, and local backup restores.'
  ] },
  { version: 'v1.0.5', date: '2026-07-31', items: [
    'Settings/export now includes an Export preview showing added, removed, changed, and reordered quests before downloading Quest.json.'
  ] },
  { version: 'v1.0.4', date: '2026-07-30', items: [
    'Inspector now shows changed-field badges for the selected quest compared with the latest loaded/downloaded baseline, making it easier to see what was edited before export.'
  ] },
  { version: 'v1.0.3', date: '2026-07-30', items: [
    'Quest list rows now include a Show on graph action that switches to the graph and centers the selected quest, matching the validation navigation flow.'
  ] },
  { version: 'v1.0.2', date: '2026-07-30', items: [
    'Validation issue clicks now switch to the graph and automatically center the affected quest, instead of leaving the user to hunt for the selected node manually.'
  ] },
  { version: 'v1.0.1', date: '2026-07-30', items: [
    'Fixed the header Save file / Download Quest.json button contrast so the primary export action remains visible in both enabled and disabled states.',
    'Kept the graph scroll viewport alive after quest edits by avoiding a full graph remount, so editing a quest no longer kicks the user back to another map position.',
    'Added Center selected to the graph controls so the current quest can be found again without resetting the whole map.'
  ] },
  { version: 'v1.0.0', date: '2026-07-30', items: [
    'Added an Export readiness panel in Settings/export so the editor shows whether the current file is ready to hand off.',
    'Save file / Download Quest.json now checks validation errors first and asks for confirmation before exporting a file with known errors.',
    'The readiness checklist reports file-loaded state, validation errors/warnings, local backup count, map sidecar status, autosave/download status, and current version filename.'
  ] },
  { version: 'v0.9.6', date: '2026-07-30', items: [
    'Apply grid order to JSON now automatically creates a local backup snapshot before it reorders the Quest.json array.',
    'Backup snapshots now show why they were created, so automatic safety backups are distinguishable from manual snapshots.'
  ] },
  { version: 'v0.9.5', date: '2026-07-29', items: [
    'Added local backup snapshots in Save info: create restore points before risky edits/reorders and restore them from browser localStorage.',
    'Backup snapshots include Quest.json data, current filename/version, selected quest, active view/filter/search, and map sidecar state.'
  ] },
  { version: 'v0.9.4', date: '2026-07-29', items: [
    'Browser tab title now shows the loaded filename and whether the current work still needs to be downloaded as a real Quest.json file.'
  ] },
  { version: 'v0.9.3', date: '2026-07-29', items: [
    'Added a browser-leave warning when current work is only browser-autosaved and has not been downloaded as a real Quest.json file yet.'
  ] },
  { version: 'v0.9.2', date: '2026-07-29', items: [
    'Made the file-save action clearer: the main export button now says Save file / Download instead of only Download Quest.json.',
    'Added a file status pill showing whether the current browser-autosaved work has been downloaded as a real file yet.'
  ] },
  { version: 'v0.9.1', date: '2026-07-29', items: [
    'Graph view now force-refreshes after quest edits/saves so newly added reward-permission links, changed requirements, summaries, and layout are rebuilt immediately.',
    'Clarified that adding a reward link updates after Save quest; draft changes inside the modal are not applied to the graph until saved.'
  ] },
  { version: 'v0.9.0', date: '2026-07-29', items: [
    'Added this version number and Changelog page.',
    'Added Save info overlay explaining local autosave, downloads, timestamped versions, map sidecar files, and that the editor does not upload Quest.json to a server.',
    'Added Apply grid order to JSON so the visual map order can intentionally reorder the exported Quest.json array.',
    'Changed downloads to timestamped filenames and removed the Load sample button from the visible UI.'
  ] },
  { version: 'v0.8.0', date: '2026-07-29', items: [
    'Search now shows directly connected quests outside the current search as dim context nodes instead of making matched quests look disconnected.',
    'Added mouse-drag panning on empty grid space, including while Move nodes is enabled.'
  ] },
  { version: 'v0.7.0', date: '2026-07-29', items: [
    'Reward permission unlocks now connect real quest nodes directly, affect layout, and use distinct amber reward-unlock arrows.',
    'Split one-time and repeatable questline summaries so rewards are not mixed together.'
  ] },
  { version: 'v0.6.0', date: '2026-07-28', items: [
    'Stabilized large graph dragging by clamping node positions, throttling node drag updates, and preventing the blue/blank map failure.',
    'Added explicit permission-grant inference, including grant command formats such as o.grant and grantperm.'
  ] }
];
const pad2 = (n) => String(n).padStart(2, '0');
const timestampForFile = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}_${pad2(d.getHours())}-${pad2(d.getMinutes())}-${pad2(d.getSeconds())}`;
};
const baseNameFromFile = (name) => {
  const raw = String(name || 'Quest').replace(/\.json$/i, '').trim() || 'Quest';
  const withoutKnownSuffix = raw.replace(/\.(edited|quest-map)$/i, '');
  return (withoutKnownSuffix
    .replace(/[._-]\d{4}-\d{2}-\d{2}[_-]\d{2}-\d{2}-\d{2}$/i, '')
    .replace(/[._-]\d{8}[_-]\d{6}$/i, '')
    .replace(/[^\w .()-]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()) || 'Quest';
};
const versionedFileName = (base, ext = 'json') => `${baseNameFromFile(base)}.${timestampForFile()}.${ext}`;
const QUEST_TYPES = [
  ['IQPlagueSkill', 'IQPlagueSkill'],
  ['IQHeadReward', 'IQHeadReward'],
  ['IQCases', 'IQCases'],
  ['OreBonus', 'OreBonus'],
  ['XDChinookIvent', 'XDChinookEvent'],
  ['Gather', 'Gather'],
  ['EntityKill', 'Kill'],
  ['Craft', 'Craft'],
  ['Research', 'Research'],
  ['Loot', 'Loot'],
  ['Grade', 'Upgrade Building'],
  ['Swipe', 'Use Access Card'],
  ['Deploy', 'Deploy'],
  ['PurchaseFromNpc', 'Purchase from NPC'],
  ['HackCrate', 'Hack the Locked Crate'],
  ['RecycleItem', 'Recycle Item'],
  ['Growseedlings', 'Grow and harvest anything (On the plantation)'],
  ['RaidableBases', 'Raidable Bases By Nivex'],
  ['Fishing', 'Fishing (To catch fish with a fishing rod)'],
  ['BossMonster', 'BossMonster'],
  ['HarborEvent', 'HarborEvent'],
  ['SatelliteDishEvent', 'SatelliteDishEvent'],
  ['Sputnik', 'Sputnik'],
  ['AbandonedBases', 'AbandonedBases'],
  ['Delivery', 'Delivery'],
  ['IQDronePatrol', 'IQDronePatrol'],
  ['GasStationEvent', 'GasStationEvent'],
  ['Triangulation', 'Triangulation'],
  ['FerryTerminalEvent', 'FerryTerminalEvent'],
  ['Convoy', 'Convoy'],
  ['Caravan', 'Caravan'],
  ['IQDefenderSupply', 'IQDefenderSupply']
].map(([code, name], id) => ({ id, code, name }));
const PRIZE_TYPES = ['Item', 'BluePrint', 'CustomItem', 'Command'].map((name, id) => ({ id, name }));
const questTypeName = (id) => QUEST_TYPES.find(t => t.id === Number(id))?.name || `Unknown type ${id}`;
const questTypeLabel = (id) => { const type = QUEST_TYPES.find(t => t.id === Number(id)); return type ? `${type.name}${type.code !== type.name ? ` (${type.code})` : ''}` : `Unknown type ${id}`; };
const prizeTypeName = (id) => PRIZE_TYPES.find(t => t.id === Number(id))?.name || `Unknown prize ${id}`;

function questTitle(q) { return cleanDisplayNameMarkup(q?.QuestDisplayName || `Quest ${q?.QuestID || ''}`); }
function rewardTitle(r, i = 0) { return r?.PrizeName || r?.CustomItemName || r?.ItemShortName || r?.PrizeCommand || `Reward ${i + 1}`; }
function rewardImage(r, steamItems = {}) { return Number(r?.ItemSkinID) ? steamItems[String(r.ItemSkinID)]?.preview : r?.CommandImageUrl; }
function parseAmountText(text = '') {
  const raw = String(text || '').replace(/,/g, '.');
  const match = raw.match(/(\d+(?:\.\d+)?)\s*([kKmM])?\b/);
  if (!match) return 0;
  const mult = match[2]?.toLowerCase() === 'm' ? 1000000 : match[2]?.toLowerCase() === 'k' ? 1000 : 1;
  return Math.round(Number(match[1]) * mult);
}
function rewardEconomy(r = {}) {
  const text = `${r.PrizeName || ''} ${r.CustomItemName || ''} ${r.PrizeCommand || ''}`;
  const command = String(r.PrizeCommand || '').toLowerCase();
  const shortname = String(r.ItemShortName || '').toLowerCase();
  let xp = 0, money = 0;
  const xpCommand = command.match(/givexp\s+%?steamid%?\s+(\d+)/i);
  if (xpCommand) xp += Number(xpCommand[1]);
  else if (/\bxp\b/i.test(text)) xp += parseAmountText(text);
  const moneyCommand = command.match(/money\.give\s+%?steamid%?\s+(\d+)/i);
  if (moneyCommand) money += Number(moneyCommand[1]);
  else if (/\b(money|cash|dollar|\$)\b/i.test(text)) money += parseAmountText(text);
  if (!money && shortname === 'paper' && /\bmoney\b/i.test(text)) money += Number(r.ItemAmount) || parseAmountText(text);
  return { xp, money };
}
function questlineEconomySummary(nodes = []) {
  return nodes.reduce((sum, node) => {
    (node.quest?.PrizeList || []).forEach(r => { const e = rewardEconomy(r); sum.xp += e.xp; sum.money += e.money; });
    return sum;
  }, { xp: 0, money: 0 });
}
function formatCompact(n) {
  if (!n) return '0';
  if (Math.abs(n) >= 1000000) return `${(n/1000000).toFixed(n % 1000000 ? 1 : 0)}M`;
  if (Math.abs(n) >= 1000) return `${Math.round(n/1000)}K`;
  return String(n);
}
function QuestlineSummaryBox({ nodes, externalCount = 0, title = 'Questline summary' }) {
  const summary = questlineEconomySummary(nodes);
  if (nodes.length < 2 && !externalCount) return null;
  const repeatables = nodes.filter(n => n.quest?.IsRepeatable).length;
  const oneTime = nodes.length - repeatables;
  return <div className={`lineSummary ${repeatables && !oneTime ? 'repeatSummary' : 'oneTimeSummary'}`}><span>{title}</span>{summary.xp ? <b>{formatCompact(summary.xp)} XP</b> : null}{summary.money ? <b>{formatCompact(summary.money)} money</b> : null}{!summary.xp && !summary.money ? <b>No XP/money total</b> : null}<small>{nodes.length} quests{oneTime ? ` · ${oneTime} one-time` : ''}{repeatables ? ` · ${repeatables} repeatable` : ''}{externalCount ? ` · ${externalCount} cross-quest unlock` : ''}</small></div>;
}
function validationIssues(quests, manualMap = {}) {
  const ids = new Map();
  const perms = new Map();
  quests.forEach((q, i) => {
    const id = String(q.QuestID ?? '');
    if (id) ids.set(id, [...(ids.get(id) || []), i]);
    const perm = String(q.QuestPermission || '').trim().toLowerCase();
    if (perm) perms.set(perm, [...(perms.get(perm) || []), i]);
  });
  const issues = [];
  quests.forEach((q, index) => {
    const add = (severity, field, message) => issues.push({ severity, field, message, quest: q, index });
    if (!q.QuestID && q.QuestID !== 0) add('error', 'QuestID', 'Quest is missing QuestID');
    if ((ids.get(String(q.QuestID)) || []).length > 1) add('error', 'QuestID', `Duplicate ID ${q.QuestID}`);
    if (!String(q.QuestDisplayName || '').trim()) add('error', 'QuestDisplayName', 'Missing name');
    if (!String(q.QuestDescription || '').trim()) add('warn', 'QuestDescription', 'Missing description');
    if (!String(q.QuestMissions || '').trim()) add('warn', 'QuestMissions', 'Missing mission text');
    if (!QUEST_TYPES.some(t => t.id === Number(q.QuestType))) add('error', 'QuestType', `Unknown QuestType ${q.QuestType}`);
    if (Number(q.ActionCount) <= 0) add('warn', 'ActionCount', 'ActionCount is 0 or lower');
    const perm = String(q.QuestPermission || '').trim().toLowerCase();
    if (perm && (perms.get(perm) || []).length > 1) add('warn', 'QuestPermission', `Shared permission: ${q.QuestPermission}`);
    (q.PrizeList || []).forEach((r, ri) => {
      if (!PRIZE_TYPES.some(t => t.id === Number(r.PrizeType))) add('error', 'PrizeType', `Reward ${ri + 1}: unknown PrizeType ${r.PrizeType}`);
      if (Number(r.PrizeType) === 3 && !String(r.PrizeCommand || '').trim()) add('error', 'PrizeCommand', `Reward ${ri + 1}: command is missing`);
      if (Number(r.PrizeType) !== 3 && !String(r.ItemShortName || '').trim()) add('warn', 'ItemShortName', `Reward ${ri + 1}: item shortname is missing`);
      if (Number(r.ItemAmount) <= 0) add('warn', 'ItemAmount', `Reward ${ri + 1}: amount is 0 or lower`);
    });
  });
  (manualMap.links || []).forEach((l, i) => {
    if (!ids.has(String(l.source)) || !ids.has(String(l.target))) issues.push({ severity: 'warn', field: 'Map', message: `Manual link ${i + 1} points to a missing quest`, quest: null, index: -1 });
  });
  return issues;
}

function changedQuestFields(current, baseline) {
  if (!current || !baseline) return [];
  const keys = [...new Set([...Object.keys(baseline), ...Object.keys(current)])]
    .filter(k => k !== 'QuestID')
    .sort((a, b) => a.localeCompare(b));
  return keys.filter(k => JSON.stringify(current?.[k] ?? null) !== JSON.stringify(baseline?.[k] ?? null));
}

function exportDiffSummary(current = [], baseline = []) {
  const currentById = new Map((current || []).map((q, index) => [String(q.QuestID), { quest: q, index }]));
  const baselineById = new Map((baseline || []).map((q, index) => [String(q.QuestID), { quest: q, index }]));
  const added = [];
  const removed = [];
  const changed = [];
  const fieldCounts = new Map();
  currentById.forEach(({ quest }, id) => {
    const before = baselineById.get(id)?.quest;
    if (!before) { added.push(quest); return; }
    const fields = changedQuestFields(quest, before);
    if (fields.length) {
      changed.push({ quest, before, fields });
      fields.forEach(field => fieldCounts.set(field, (fieldCounts.get(field) || 0) + 1));
    }
  });
  baselineById.forEach(({ quest }, id) => { if (!currentById.has(id)) removed.push(quest); });
  const commonCurrentOrder = current.filter(q => baselineById.has(String(q.QuestID))).map(q => String(q.QuestID));
  const commonBaselineOrder = baseline.filter(q => currentById.has(String(q.QuestID))).map(q => String(q.QuestID));
  const reorderedIds = commonCurrentOrder.filter((id, index) => id !== commonBaselineOrder[index]);
  const reordered = reorderedIds.length;
  const topFields = [...fieldCounts.entries()].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0])).slice(0, 6);
  return { added, removed, changed, reordered, reorderedIds, topFields, clean: !added.length && !removed.length && !changed.length && !reordered };
}

function brokenChainIssues(graph = { nodes: [], links: [] }) {
  const issues = [];
  const nodes = graph.nodes || [];
  const nodesById = new Map(nodes.map(n => [String(n.id), n]));
  const partOneBySeries = new Map();
  const grantsByPermission = new Map();
  const requiresByPermission = new Map();
  nodes.forEach(n => {
    if (n.part === 1) partOneBySeries.set(n.series, [...(partOneBySeries.get(n.series) || []), n]);
    if (n.requiredPermission) requiresByPermission.set(n.requiredPermission, [...(requiresByPermission.get(n.requiredPermission) || []), n]);
    (n.grantedPermissions || []).forEach(permission => grantsByPermission.set(permission, [...(grantsByPermission.get(permission) || []), n]));
  });
  nodes.forEach(n => {
    if ((n.part || 0) > 1 && !(partOneBySeries.get(n.series) || []).length) issues.push({ type: 'missing-part-1', severity: 'warn', quest: n.quest, title: 'Part exists without Part 1', detail: `Part ${n.part} has no Part 1 in the same inferred series.` });
    if (n.requiredPermission && !(grantsByPermission.get(n.requiredPermission) || []).filter(g => g.id !== n.id).length) issues.push({ type: 'missing-grantor', severity: 'warn', quest: n.quest, title: 'Permission has no grantor', detail: `Requires ${n.requiredPermission}, but no quest reward appears to grant it.` });
  });
  grantsByPermission.forEach((grantors, permission) => {
    const users = requiresByPermission.get(permission) || [];
    if (!users.length) grantors.forEach(n => issues.push({ type: 'unused-grant', severity: 'info', quest: n.quest, title: 'Reward grant is unused', detail: `Grants ${permission}, but no quest currently requires it.` }));
    if (grantors.length > 1 && users.length) grantors.forEach(n => issues.push({ type: 'ambiguous-grant', severity: 'info', quest: n.quest, title: 'Ambiguous permission grant', detail: `${grantors.length} quests grant ${permission}; ${users.length} quest(s) require it.` }));
  });
  (graph.links || []).forEach(l => {
    if (!nodesById.has(String(l.source)) || !nodesById.has(String(l.target))) issues.push({ type: 'broken-link', severity: 'warn', quest: nodesById.get(String(l.source))?.quest || null, title: 'Graph link points to missing quest', detail: `${l.source} → ${l.target}` });
  });
  return issues.sort((a, b) => (({warn: 0, info: 1}[a.severity] ?? 2) - ({warn: 0, info: 1}[b.severity] ?? 2))).slice(0, 80);
}

function chainIssueSearchText(issue = {}) {
  const permission = String(issue.detail || '').match(/(?:Requires|Grants)\s+([^,;\s]+)/i)?.[1];
  if (permission) return permission;
  const title = questTitle(issue.quest || {});
  if (issue.type === 'missing-part-1') return title.replace(/\bpart\s*\d+\s*[a-z]?\b|[-–:]\s*\d+\s*[a-z]?\s*$/ig, '').trim();
  return title || String(issue.quest?.QuestID || '');
}

function formatDiffValue(value) {
  if (value == null || value === '') return '—';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return String(text).replace(/\s+/g, ' ').trim().slice(0, 220) || '—';
}

function TaggedText({ value, className = '' }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: renderTaggedTextHtml(value || '') }} />;
}

function Field({ label, value, onChange, type = 'text', textarea = false, rows = 3 }) {
  return <label className="field"><span>{label}</span>{textarea ?
    <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={rows} /> :
    <input type={type} value={value ?? ''} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} />
  }</label>;
}
function BoolField({ label, value, onChange }) { return <label className="bool"><input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} /> {label}</label>; }

function useSteamItems(ids) {
  const clean = useMemo(() => [...new Set((ids || []).filter(Boolean))].slice(0, 80), [ids?.join('|')]);
  const [items, setItems] = useState({});
  const [status, setStatus] = useState('');
  useEffect(() => {
    let cancelled = false;
    if (!clean.length) { setStatus(''); return; }
    setStatus('Fetching Steam skins automatically…');
    fetch('/api/steam/workshop?ids=' + encodeURIComponent(clean.join(',')))
      .then(r => r.json())
      .then(data => { if (!cancelled) { setItems(Object.fromEntries((data.items || []).map(i => [i.id, i]))); setStatus(`${(data.items || []).filter(i => i.ok).length}/${clean.length} skins`); } })
      .catch(e => { if (!cancelled) setStatus('Steam error: ' + e.message); });
    return () => { cancelled = true; };
  }, [clean.join(',')]);
  return { items, status };
}

function Rewards({ quest, steamItems = {} }) {
  const rewards = quest?.PrizeList || [];
  if (!rewards.length) return <div className="emptyReward">No rewards</div>;
  return <div className="rewards">{rewards.map((r, i) => {
    const skin = Number(r.ItemSkinID) ? steamItems[String(r.ItemSkinID)] : null;
    const img = skin?.preview || r.CommandImageUrl;
    return <div className="reward" key={i}>{img ? <img src={img} /> : <div className="rewardIcon">{r.PrizeType ?? '?'}</div>}<div><b>{r.PrizeName || r.CustomItemName || r.ItemShortName || 'Reward'}</b><span>{r.ItemAmount || 1}× {r.ItemShortName || (r.PrizeCommand ? 'command' : 'item')}</span>{r.PrizeCommand && <code>{r.PrizeCommand}</code>}{Number(r.ItemSkinID) ? <em>skin {r.ItemSkinID}{skin?.title ? ` · ${skin.title}` : ''}</em> : null}</div></div>;
  })}</div>;
}

const rewardFromItem = (draft, prizeType = 0) => ({ PrizeName: draft.PrizeName || draft.ItemName || 'Item reward', PrizeType: prizeType, ItemShortName: draft.ItemShortName || '', ItemAmount: Number(draft.ItemAmount) || 1, CustomItemName: draft.CustomItemName || draft.ItemName || '', ItemSkinID: Number(draft.ItemSkinID) || 0, PrizeCommand: '', CommandImageUrl: '', IsHidden: !!draft.IsHidden });
const rewardFromCommand = (draft) => ({ PrizeName: draft.PrizeName || 'Command reward', PrizeType: 3, ItemShortName: '', ItemAmount: Number(draft.ItemAmount) || 1, CustomItemName: '', ItemSkinID: 0, PrizeCommand: draft.PrizeCommand || '', CommandImageUrl: draft.CommandImageUrl || '', IsHidden: !!draft.IsHidden });

function ItemPicker({ onPick, onClose }) {
  const [category, setCategory] = useState('Food');
  const [query, setQuery] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [catalog, setCatalog] = useState({ items: [], categories: [], loading: true, error: '' });
  useEffect(() => {
    let cancelled = false;
    fetch('/rust-items.json')
      .then(r => r.json())
      .then(data => { if (!cancelled) setCatalog({ items: data.items || [], categories: data.categories || [], loading: false, error: '' }); })
      .catch(e => { if (!cancelled) setCatalog({ items: [], categories: [], loading: false, error: e.message }); });
    return () => { cancelled = true; };
  }, []);
  const total = catalog.items.length || 1243;
  const items = catalog.items.filter(i => (showHidden || !i.hidden) && (!category || i.category === category) && (!query || (i.name + ' ' + i.shortname).toLowerCase().includes(query.toLowerCase())));
  return <div className="pickerBackdrop" onMouseDown={onClose}><div className="itemPicker" onMouseDown={e => e.stopPropagation()}>
    <div className="pickerTop"><h2>Select item</h2><input placeholder={`Search ${total} CarbonMod items...`} value={query} onChange={e => setQuery(e.target.value)} /><button onClick={onClose}>Close</button></div>
    <div className="pickerBody"><aside className="catList"><b>Category</b><button className={!category?'active':''} onClick={() => setCategory('')}>All</button>{catalog.categories.map(c => <button className={category===c?'active':''} key={c} onClick={() => setCategory(c)}>{c}</button>)}<label className="bool compact"><input type="checkbox" checked={showHidden} onChange={e=>setShowHidden(e.target.checked)} /> Show hidden</label></aside>
      <section className="itemGridWrap">{catalog.loading ? <p>Loading CarbonMod item catalog…</p> : catalog.error ? <p className="error">The item catalog could not be loaded: {catalog.error}</p> : <><p>{items.length} items from CarbonMod Rust meta. Select the item you want to add to the reward.</p><div className="itemGrid">{items.map(item => <button className="itemCard" key={item.shortname} onClick={() => onPick(item)}><img src={item.icon} onError={e => e.currentTarget.style.display='none'} /><span>{item.name}</span><small>{item.shortname}{item.hidden?' · hidden':''}</small></button>)}</div></>}</section></div>
  </div></div>;
}

function AddRewardDialog({ onAdd, onClose, steamItems }) {
  const rewardTypes = [
    { id: '0', icon: '📦', title: 'Item drop', note: 'A normal Rust item reward.' },
    { id: '1', icon: '📘', title: 'Blueprint', note: 'Unlock a blueprint item.' },
    { id: '2', icon: '✨', title: 'Custom item', note: 'Named/skinned item reward.' },
    { id: 'Command', icon: '⚡', title: 'Server command', note: 'XP, money, permission grants, kits.' },
  ];
  const [type, setType] = useState('0');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState({ PrizeName: '', ItemShortName: '', ItemName: '', ItemAmount: 1, CustomItemName: '', ItemSkinID: 0, PrizeCommand: '', CommandImageUrl: '', IsHidden: false });
  const activeType = rewardTypes.find(t => t.id === type) || rewardTypes[0];
  const set = (k,v) => setDraft(d => ({...d,[k]:v}));
  function pickItem(item){ setDraft(d => ({...d, ItemShortName:item.shortname, ItemName:item.name, PrizeName:d.PrizeName || item.name, CustomItemName:d.CustomItemName || item.name})); setPickerOpen(false); }
  function add(){ onAdd(type === 'Command' ? rewardFromCommand(draft) : rewardFromItem(draft, Number(type))); }
  const previewTitle = draft.PrizeName || draft.CustomItemName || draft.ItemName || draft.ItemShortName || (type === 'Command' ? 'Command reward' : activeType.title);
  return <div className="modalBackdrop" onMouseDown={onClose}><div className="addRewardModal rewardBuilder" onMouseDown={e => e.stopPropagation()}>
    <div className="rewardBuilderHero"><img src="/12g-logo.jpg" alt="12G" /><div><small>Quest Studio reward builder</small><h2>Add reward</h2><p>Build the reward once, then Quest Studio writes the XDQuest fields behind the curtain. Less copy-paste dungeon, more useful form.</p></div><button onClick={onClose}>×</button></div>
    <div className="rewardTypeCards" role="list" aria-label="Reward type">
      {rewardTypes.map(t => <button type="button" key={t.id} className={type === t.id ? 'active' : ''} onClick={() => setType(t.id)}><span>{t.icon}</span><b>{t.title}</b><small>{t.note}</small></button>)}
    </div>
    <div className="rewardBuilderBody">
      <section className="rewardFormCard">
        <div className="sectionHead"><div><h3>Reward details</h3><small>{activeType.note}</small></div>{type !== 'Command' ? <button type="button" className="cyan" onClick={() => setPickerOpen(true)}>Browse item catalog</button> : <button type="button" className="cyan" onClick={() => set('PrizeCommand', (draft.PrizeCommand || '') + '%STEAMID%')}>Insert %STEAMID%</button>}</div>
        <Field label="Display label" value={draft.PrizeName} onChange={v => set('PrizeName', v)} />
        {type !== 'Command' ? <>
          <div className="two"><Field label="Item shortname" value={draft.ItemShortName} onChange={v => set('ItemShortName', v)} /><Field label="Amount" type="number" value={draft.ItemAmount} onChange={v => set('ItemAmount', v)} /></div>
          <div className="two"><Field label="Custom item name" value={draft.CustomItemName} onChange={v => set('CustomItemName', v)} /><Field label="Skin ID" type="number" value={draft.ItemSkinID} onChange={v => set('ItemSkinID', v)} /></div>
          {draft.ItemShortName && <div className="livePreview"><b>Selected item:</b> {draft.ItemName || draft.ItemShortName}</div>}
          {Number(draft.ItemSkinID) ? <div className="livePreview"><b>Steam:</b> {steamItems[String(draft.ItemSkinID)]?.title || `skin ${draft.ItemSkinID}`}</div> : null}
        </> : <>
          <Field label="Command" value={draft.PrizeCommand} onChange={v => set('PrizeCommand', v)} textarea rows={3} />
          <div className="two"><Field label="Amount marker" type="number" value={draft.ItemAmount} onChange={v => set('ItemAmount', v)} /><Field label="Preview image URL" value={draft.CommandImageUrl} onChange={v => set('CommandImageUrl', v)} /></div>
        </>}
        <BoolField label="Hidden reward" value={draft.IsHidden} onChange={v => set('IsHidden', v)} />
      </section>
      <aside className="rewardPreviewCard">
        <span className="previewType">{activeType.icon} {activeType.title}</span>
        <h3>{previewTitle}</h3>
        <p>{type === 'Command' ? (draft.PrizeCommand || 'No command entered yet.') : `${draft.ItemAmount || 1}× ${draft.ItemShortName || 'no item selected yet'}`}</p>
        {draft.CustomItemName ? <em>{draft.CustomItemName}</em> : null}
        {draft.IsHidden ? <b>Hidden from player reward list</b> : <b>Visible reward</b>}
      </aside>
    </div>
    <div className="modalFoot"><button onClick={onClose}>Cancel</button><button className="primary" onClick={add}>Add reward to quest</button></div>
    {pickerOpen && <ItemPicker onPick={pickItem} onClose={() => setPickerOpen(false)} />}
  </div></div>;
}

function RewardDrawer({ reward, index, onClose, onUpdate, onRemove, steamItems }) {
  if (!reward) return null;
  return <div className="drawerBackdrop" onMouseDown={onClose}><aside className="rewardDrawer" onMouseDown={e => e.stopPropagation()}>
    <div className="drawerHead"><div><b>Reward {index + 1}</b><small>{prizeTypeName(reward.PrizeType)} · card click → drawer</small></div><button onClick={onClose}>×</button></div>
    <div className="drawerBody">
      <div className="rewardHero">{rewardImage(reward, steamItems) ? <img src={rewardImage(reward, steamItems)} /> : <div className="rewardCardIcon">{prizeTypeName(reward.PrizeType).slice(0, 2)}</div>}<strong>{rewardTitle(reward, index)}</strong></div>
      <Field label="Reward Name" value={reward.PrizeName} onChange={v => onUpdate('PrizeName', v)} />
      <div className="two"><PrizeTypeField value={reward.PrizeType} onChange={v => onUpdate('PrizeType', v)} /><Field label="Amount" type="number" value={reward.ItemAmount} onChange={v => onUpdate('ItemAmount', v)} /></div>
      <BoolField label="Hidden" value={reward.IsHidden} onChange={v => onUpdate('IsHidden', v)} />
      {reward.PrizeCommand ? <><Field label="Console Command" value={reward.PrizeCommand} onChange={v => onUpdate('PrizeCommand', v)} /><Field label="Image Url" value={reward.CommandImageUrl} onChange={v => onUpdate('CommandImageUrl', v)} /></> : <><Field label="ItemShortName" value={reward.ItemShortName} onChange={v => onUpdate('ItemShortName', v)} /><Field label="CustomItemName" value={reward.CustomItemName} onChange={v => onUpdate('CustomItemName', v)} /><Field label="ItemSkinID" type="number" value={reward.ItemSkinID} onChange={v => onUpdate('ItemSkinID', v)} /></>}
      {Number(reward.ItemSkinID) ? <div className="livePreview"><b>Steam:</b> {steamItems[String(reward.ItemSkinID)]?.title || `skin ${reward.ItemSkinID}`}</div> : null}
    </div>
    <div className="drawerFoot"><button className="danger" type="button" onClick={onRemove}>Delete reward</button><button className="primary" type="button" onClick={onClose}>Done</button></div>
  </aside></div>;
}

function RewardEditor({ rewards, onChange, steamItems }) {
  const safeRewards = rewards || [];
  const [adding, setAdding] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const selectedReward = selectedIndex == null ? null : safeRewards[selectedIndex];
  useEffect(() => {
    if (!safeRewards.length) setSelectedIndex(null);
    else if (selectedIndex != null && selectedIndex >= safeRewards.length) setSelectedIndex(safeRewards.length - 1);
  }, [safeRewards.length, selectedIndex]);
  const update = (i, key, val) => onChange(safeRewards.map((r, idx) => idx === i ? { ...r, [key]: val } : r));
  const remove = (i) => { onChange(safeRewards.filter((_, idx) => idx !== i)); setSelectedIndex(null); };
  return <section className="rewardEditor">
    <div className="sectionHead"><div><h3>Rewards</h3><small className="muted">Click a reward card to open the side-drawer editor.</small></div><button type="button" onClick={() => setAdding(true)}>+ Add reward</button></div>
    {!(safeRewards).length && <p className="muted">No rewards yet.</p>}
    {!!safeRewards.length && <div className="rewardGrid" role="list" aria-label="Rewards grid">
      {safeRewards.map((r, i) => {
        const img = rewardImage(r, steamItems);
        return <button type="button" role="listitem" className={`rewardCard ${selectedIndex === i ? 'selected' : ''}`} key={i} onClick={() => setSelectedIndex(i)}>
          {img ? <img src={img} alt="" /> : <div className="rewardCardIcon">{prizeTypeName(r.PrizeType).slice(0, 2)}</div>}
          <span className="rewardCardType">{i + 1}. {prizeTypeName(r.PrizeType)}{r.IsHidden ? ' · hidden' : ''}</span>
          <b>{rewardTitle(r, i)}</b>
          <small>{r.PrizeCommand ? r.PrizeCommand : `${r.ItemAmount || 1}× ${r.ItemShortName || 'item'}`}</small>
        </button>;
      })}
    </div>}
    <RewardDrawer reward={selectedReward} index={selectedIndex ?? 0} steamItems={steamItems} onClose={() => setSelectedIndex(null)} onUpdate={(key, val) => update(selectedIndex, key, val)} onRemove={() => remove(selectedIndex)} />
    {adding && <AddRewardDialog steamItems={steamItems} onClose={() => setAdding(false)} onAdd={(r) => { onChange([...safeRewards, r]); setSelectedIndex(safeRewards.length); setAdding(false); }} />}
  </section>;
}

function QuestTypeField({ value, onChange }) {
  return <label className="field"><span>Quest Type</span><select value={Number(value ?? 0)} onChange={e => onChange(Number(e.target.value))}>{QUEST_TYPES.map(t => <option key={t.id} value={t.id}>{t.id} — {questTypeLabel(t.id)}</option>)}</select><small className="muted">Saved in JSON as id: {Number(value ?? 0)} ({questTypeLabel(value)})</small></label>;
}

function PrizeTypeField({ value, onChange }) {
  return <label className="field"><span>PrizeType</span><select value={Number(value ?? 0)} onChange={e => onChange(Number(e.target.value))}>{PRIZE_TYPES.map(t => <option key={t.id} value={t.id}>{t.id} — {t.name}</option>)}</select><small className="muted">{prizeTypeName(value)}</small></label>;
}


function QuestGamePreview({ quest, steamItems = {} }) {
  const rewards = quest?.PrizeList || [];
  return <aside className="questGamePreview" aria-label="In-game quest preview">
    <span className="previewEyebrow">In-game preview</span>
    <h3><TaggedText value={questTitle(quest)} /></h3>
    <div className="previewMeta"><span>#{quest?.QuestID || '—'}</span><span>{questTypeName(quest?.QuestType)}</span><span>{quest?.IsRepeatable ? 'Repeatable' : 'One-time'}</span>{quest?.QuestPermission ? <span>Requires {quest.QuestPermission}</span> : null}</div>
    <section><b>Description</b><p><TaggedText value={quest?.QuestDescription || 'No description yet.'} /></p></section>
    <section><b>Objective</b><p><TaggedText value={quest?.QuestMissions || 'No mission text yet.'} /></p><small>Target: {quest?.Target || '—'} · Count: {quest?.ActionCount || 0}</small></section>
    <section><b>Rewards</b>{rewards.length ? <div className="previewRewards">{rewards.map((r, i) => { const img = rewardImage(r, steamItems); return <div key={i}>{img ? <img src={img} alt=""/> : <span>{prizeTypeName(r.PrizeType).slice(0,2)}</span>}<p><strong>{rewardTitle(r, i)}</strong><small>{r.PrizeCommand || `${r.ItemAmount || 1}× ${r.ItemShortName || 'item'}`}{r.IsHidden ? ' · hidden' : ''}</small></p></div>; })}</div> : <p className="muted">No rewards yet.</p>}</section>
  </aside>;
}

function EditorModal({ quest, onClose, onSave, steamItems }) {
  const [draft, setDraft] = useState(() => structuredClone(quest));
  const set = (key, value) => setDraft(d => ({ ...d, [key]: value }));
  return <div className="modalBackdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e => e.stopPropagation()}>
    <div className="modalHead"><div><b>Edit quest</b><small>ID {draft.QuestID} · series {questSeriesKey(draft)} · part {partNumber(draft) ?? '—'}</small></div><button onClick={onClose}>×</button></div>
    <div className="modalBody questEditLayout">
      <section className="formPanel prominent"><h3>Edit fields</h3><div className="two"><Field label="QuestID" type="number" value={draft.QuestID} onChange={v => set('QuestID', v)} /><Field label="QuestPermission — used for chains" value={draft.QuestPermission} onChange={v => set('QuestPermission', v)} /></div>
        <Field label="QuestDisplayName" value={draft.QuestDisplayName} onChange={v => set('QuestDisplayName', v)} textarea rows={3} />
        <Field label="QuestDescription" value={draft.QuestDescription} onChange={v => set('QuestDescription', v)} textarea rows={7} />
        <Field label="QuestMissions" value={draft.QuestMissions} onChange={v => set('QuestMissions', v)} textarea rows={3} />
        <div className="three"><QuestTypeField value={draft.QuestType} onChange={v => set('QuestType', v)} /><Field label="Target / skin id / target" value={draft.Target} onChange={v => set('Target', v)} /><Field label="ActionCount" type="number" value={draft.ActionCount} onChange={v => set('ActionCount', v)} /></div>
        <div className="three"><Field label="Cooldown" type="number" value={draft.Cooldown} onChange={v => set('Cooldown', v)} /><BoolField label="Repeatable" value={draft.IsRepeatable} onChange={v => set('IsRepeatable', v)} /><BoolField label="Return items required" value={draft.IsReturnItemsRequired} onChange={v => set('IsReturnItemsRequired', v)} /></div>
      </section>
      <section className="formPanel"><RewardEditor rewards={draft.PrizeList || []} steamItems={steamItems} onChange={v => set('PrizeList', v)} /></section>
      <QuestGamePreview quest={draft} steamItems={steamItems} />
    </div>
    <div className="modalFoot"><button onClick={onClose}>Cancel</button><button className="primary" onClick={() => onSave(draft)}>Save quest</button></div>
  </div></div>;
}

function nextQuestFrom(prev, existing) {
  const q = structuredClone(prev);
  const ids = existing.map(x => Number(x.QuestID)).filter(Number.isFinite);
  const p = partNumber(prev) ?? 1;
  const next = Math.floor(p) + 1;
  q.QuestID = ids.length ? Math.max(...ids) + 1 : Date.now() % 100000;
  q.QuestDisplayName = String(prev.QuestDisplayName || `Quest Part ${next}`)
    .replace(/\b[Pp]art\s*\d+\s*[A-Za-z]?\b/, `Part ${next}`)
    .replace(/[-–:]\s*\d+\s*[A-Za-z]?\s*$/, `- ${next}`);
  if (q.QuestDisplayName === prev.QuestDisplayName) q.QuestDisplayName += ` - Part ${next}`;
  const perm = String(prev.QuestPermission || '').trim();
  q.QuestPermission = perm
    ? (perm.match(/(.*?)(?:[_-]?part[_-]?)?\d+[a-z]?$/i) ? perm.replace(/(?:part[_-]?)?\d+[a-z]?$/i, m => (m.toLowerCase().includes('part') ? 'part' : '') + next) : `${perm}_part${next}`)
    : `quest_part${next}`;
  q.QuestDescription = 'Describe the next quest in this questline.';
  q.QuestMissions = 'Do <color=yellow>1</color> thing';
  q.ActionCount = 1;
  q.PrizeList = [];
  return q;
}

function safePermissionSlug(text = 'sidequest') {
  return String(text || 'sidequest')
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 42) || 'sidequest';
}

function uniquePermission(base, existing = []) {
  const used = new Set(existing.map(q => String(q.QuestPermission || '').toLowerCase()).filter(Boolean));
  let candidate = base;
  let i = 1;
  while (used.has(candidate.toLowerCase())) candidate = `${base}_${++i}`;
  return candidate;
}

function permissionGrantReward(permission) {
  return {
    PrizeName: 'Unlock sidequest',
    PrizeType: 3,
    ItemAmount: 1,
    ItemShortName: '',
    ItemName: '',
    CustomItemName: '',
    ItemSkinID: 0,
    PrizeCommand: `grantperm %STEAMID% XDQuest.${permission} 20d`,
    CommandImageUrl: '',
    IsHidden: true
  };
}

function sideQuestFrom(parent, existing) {
  const q = newQuestTemplate(existing);
  const parentTitle = stripTags(cleanDisplayNameMarkup(parent?.QuestDisplayName || `Quest ${parent?.QuestID || ''}`)).replace(/\s+/g, ' ').trim() || `Quest ${parent?.QuestID || ''}`;
  const group = questGroup(parent) || 'Side';
  const color = '#f59e0b';
  const permission = uniquePermission(`${safePermissionSlug(group)}_side_${parent?.QuestID || q.QuestID}`, existing);
  q.QuestDisplayName = `<color=${color}>${group}$</color><color=${color}>${group}: </color>Sidequest from ${parentTitle}`;
  q.QuestDescription = `Sidequest unlocked from <color=yellow>${parentTitle}</color>. Change this description before export.`;
  q.QuestMissions = 'Complete this <color=yellow>side objective</color>.';
  q.QuestPermission = permission;
  q.QuestType = parent?.QuestType ?? q.QuestType;
  q.Target = '';
  q.ActionCount = 1;
  q.IsRepeatable = false;
  q.Cooldown = 0;
  q.PrizeList = [];
  return q;
}

function Graph({ quests, selected, setSelected, groupFilter, query, steamItems, manualMap, setManualMap, onCreateNext, onCreateSideQuest, onApplyGridOrder, issues = [], focusRequest = 0, compactMode = false, titleOnlyMode = false }) {
  const graph = useMemo(() => buildQuestGraph(quests), [quests]);
  const shellRef = useRef(null);
  const drag = useRef(null);
  const nodeDrag = useRef(null);
  const dragFrame = useRef(null);
  const [connectFrom, setConnectFrom] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [connectMode, setConnectMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const searchText = query.trim().toLowerCase();
  const nodeMatchesSearch = (n) => !searchText || (n.title + ' ' + n.id + ' ' + JSON.stringify(n.quest)).toLowerCase().includes(searchText);
  const baseNodes = graph.nodes.filter(n => !groupFilter || n.group === groupFilter);
  const matchedNodes = baseNodes.filter(nodeMatchesSearch);
  const issueCounts = useMemo(() => issues.reduce((m, issue) => { if (issue.quest?.QuestID != null) m[String(issue.quest.QuestID)] = (m[String(issue.quest.QuestID)] || 0) + 1; return m; }, {}), [issues]);
  const baseVisible = new Set(baseNodes.map(n => n.id));
  const matchedVisible = new Set(matchedNodes.map(n => n.id));
  const allAutoLinks = graph.links.filter(l => baseVisible.has(String(l.source)) && baseVisible.has(String(l.target)));
  const allManualLinks = (manualMap.links || []).filter(l => baseVisible.has(String(l.source)) && baseVisible.has(String(l.target))).map(l => ({...l, manual:true, reason:'manual'}));
  const contextVisible = new Set();
  if (searchText) {
    [...allAutoLinks, ...allManualLinks].forEach(l => {
      const s = String(l.source), t = String(l.target);
      if (matchedVisible.has(s) && !matchedVisible.has(t)) contextVisible.add(t);
      if (matchedVisible.has(t) && !matchedVisible.has(s)) contextVisible.add(s);
    });
  }
  const filteredNodes = searchText ? baseNodes.filter(n => matchedVisible.has(n.id) || contextVisible.has(n.id)) : matchedNodes;
  const visible = new Set(filteredNodes.map(n => n.id));
  const selectedNode = selected?.QuestID == null ? null : filteredNodes.find(n => n.id === String(selected.QuestID));
  const autoLinks = allAutoLinks.filter(l => visible.has(String(l.source)) && visible.has(String(l.target)));
  const manualLinks = allManualLinks.filter(l => visible.has(String(l.source)) && visible.has(String(l.target)));
  const links = [...autoLinks, ...manualLinks];
  const outgoing = new Set(links.map(l => String(l.source)));
  const incoming = new Set(links.map(l => String(l.target)));
  const nodeByIdAll = useMemo(() => new Map(graph.nodes.map(n => [n.id, n])), [graph.nodes]);
  const questlineKey = (n) => {
    const raw = String(n?.title || '').replace(/\s+/g, ' ').trim();
    const afterDollar = raw.includes('$') ? raw.split('$').slice(1).join('$').trim() : raw;
    const head = afterDollar.includes(':') ? afterDollar.split(':')[0].trim() : (n?.series || afterDollar).split(':').slice(0, 2).join(':');
    return `${n?.group || ''}:${head}`.toLowerCase().replace(/[^a-z0-9åäö:]+/gi, ' ').replace(/\s+/g, ' ').trim();
  };
  const crossQuestUnlocks = useMemo(() => autoLinks
    .filter(l => l.reason === 'permission-grant')
    .map(l => ({ ...l, source: String(l.source), target: String(l.target), sourceNode: nodeByIdAll.get(String(l.source)), targetNode: nodeByIdAll.get(String(l.target)) }))
    .filter(l => l.sourceNode && l.targetNode && questlineKey(l.sourceNode) !== questlineKey(l.targetNode))
    .map(l => ({ ...l, id: `cross:${l.source}->${l.target}`, reason: 'cross-quest-unlock', permission: l.targetNode.requiredPermission || l.targetNode.quest?.QuestPermission || '' })),
    [autoLinks, nodeByIdAll]);
  const crossAccessKeys = useMemo(() => new Set(crossQuestUnlocks.map(a => `${a.source}->${a.target}`)), [crossQuestUnlocks]);
  const layoutLinks = useMemo(() => links.filter(l => !crossAccessKeys.has(`${String(l.source)}->${String(l.target)}`)), [links, crossAccessKeys]);
  const clusterLinks = useMemo(() => [...layoutLinks, ...crossQuestUnlocks], [layoutLinks, crossQuestUnlocks]);
  const unlocksBySource = useMemo(() => crossQuestUnlocks.reduce((m, access) => { if (!m.has(access.source)) m.set(access.source, []); m.get(access.source).push(access); return m; }, new Map()), [crossQuestUnlocks]);
  const rows = useMemo(() => {
    const nodeById = new Map(filteredNodes.map(n => [n.id, n]));
    const adjacency = new Map(filteredNodes.map(n => [n.id, new Set()]));
    clusterLinks.forEach(l => {
      const s = String(l.source), t = String(l.target);
      if (!adjacency.has(s) || !adjacency.has(t)) return;
      adjacency.get(s).add(t);
      adjacency.get(t).add(s);
    });
    const seen = new Set();
    const components = [];
    const seedOrder = [...filteredNodes].sort((a,b)=>a.group.localeCompare(b.group)||a.series.localeCompare(b.series)||(a.part??999)-(b.part??999)||a.index-b.index);
    for (const seed of seedOrder) {
      if (seen.has(seed.id)) continue;
      const stack = [seed.id], ids = [];
      seen.add(seed.id);
      while (stack.length) {
        const id = stack.pop();
        ids.push(id);
        for (const next of adjacency.get(id) || []) if (!seen.has(next)) { seen.add(next); stack.push(next); }
      }
      const ns = ids.map(id => nodeById.get(id)).filter(Boolean);
      ns.sort((a,b)=>(a.part??999)-(b.part??999)||a.index-b.index);
      const groups = [...new Set(ns.map(n=>n.group))];
      const loopCount = layoutLinks.filter(l => ids.includes(String(l.source)) && ids.includes(String(l.target)) && nodeById.get(String(l.target))?.quest?.IsRepeatable).length;
      components.push({ key: ids.sort().join('-'), nodes: ns, group: groups.length === 1 ? groups[0] : 'Mixed', loopCount });
    }
    return components.sort((a,b)=>a.group.localeCompare(b.group)||a.nodes[0].index-b.nodes[0].index);
  }, [filteredNodes, clusterLinks, layoutLinks]);
  const positions = new Map();
  const rowHeight = titleOnlyMode ? 96 : (compactMode ? 162 : 214), colWidth = titleOnlyMode ? 184 : (compactMode ? 258 : 330), nodeWidth = titleOnlyMode ? 168 : (compactMode ? 238 : 300), nodeHeight = titleOnlyMode ? 62 : (compactMode ? 112 : 148);
  const nodeMidX = nodeWidth / 2, linkStartX = nodeWidth - 14, linkY = titleOnlyMode ? 31 : (compactMode ? 48 : 66);
  const maxCols = Math.max(1, ...rows.map(r => r.nodes.length));
  const width = Math.max(1800, 92 + maxCols * colWidth + 420);
  const height = Math.max(1000, 86 + rows.length * rowHeight + 260);
  const clampPosition = (p) => ({
    x: Math.max(24, Math.min(width - nodeWidth - 90, Number(p?.x) || 24)),
    y: Math.max(48, Math.min(height - nodeHeight - 60, Number(p?.y) || 48)),
  });
  rows.forEach((row, rowIndex) => row.nodes.forEach((n,col)=>positions.set(n.id, clampPosition(manualMap.positions?.[n.id] || {x:92+col*colWidth,y:82+rowIndex*rowHeight}))));
  const renderLinks = [...layoutLinks, ...crossQuestUnlocks];
  const markerForLink = (l, backEdge, isUnlock) => {
    if (backEdge) return 'url(#arrowLoop)';
    if (isUnlock) return 'url(#arrowExternal)';
    if (l.manual) return 'url(#arrowManual)';
    if (l.reason === 'permission') return 'url(#arrowPermission)';
    if (l.reason === 'permission-grant') return 'url(#arrowPermissionGrant)';
    return 'url(#arrowQuest)';
  };
  const edgeKey = (l) => `${l.reason || 'link'}:${String(l.source)}->${String(l.target)}`;
  const normalizeEdgePermission = (value = '') => String(value || '').trim().toLowerCase().replace(/^xdquest\./, '').replace(/^oxide\.permission\./, '');
  const edgeLabel = (l) => l.manual ? 'Manual link' : ({ 'name-part': 'Name/part chain', permission: 'Permission-name match', 'permission-grant': 'Reward grants permission', 'cross-quest-unlock': 'Cross-quest unlock', manual: 'Manual link' }[l.reason] || 'Quest link');
  const edgeStrength = (l) => l.manual ? 'Strong · added by you' : ({ 'permission-grant': 'Strong · explicit reward permission', 'cross-quest-unlock': 'Strong · explicit reward permission across questlines', 'name-part': 'Medium · inferred from title/part order', permission: 'Weak · fallback permission-name match' }[l.reason] || 'Inferred');
  const edgeWhy = (l) => l.manual ? 'This link was added manually in Connect quests mode.' : ({ 'name-part': 'The quests look like the same named line and follow each other by part number.', permission: 'The quests share a similar QuestPermission stem and sorted part order.', 'permission-grant': 'The source quest reward command grants the permission required by the target quest.', 'cross-quest-unlock': 'A reward permission grant jumps into another questline/group.' }[l.reason] || 'This link was inferred from graph rules.');
  const edgeQuestTitle = (n) => stripTags(cleanDisplayNameMarkup(n?.quest?.QuestDisplayName || n?.title || 'Unknown quest')).trim() || n?.title || 'Unknown quest';
  function edgeDetail(l){
    if (!l) return null;
    const sourceNode = l.sourceNode || nodeByIdAll.get(String(l.source));
    const targetNode = l.targetNode || nodeByIdAll.get(String(l.target));
    const permission = l.permission || targetNode?.requiredPermission || targetNode?.quest?.QuestPermission || '';
    const normalized = normalizeEdgePermission(permission);
    const grantCommand = (sourceNode?.quest?.PrizeList || []).map(r => String(r?.PrizeCommand || '')).find(cmd => normalized && normalizeEdgePermission(cmd).includes(normalized));
    return { link: l, sourceNode, targetNode, permission, grantCommand, label: edgeLabel(l), strength: edgeStrength(l), why: edgeWhy(l) };
  }
  const selectedEdgeDetail = edgeDetail(selectedEdge);

  function updateMap(updater){ setManualMap(m => typeof updater === 'function' ? updater(m) : updater); }
  function localPoint(e){ const shell=shellRef.current; const r=shell.getBoundingClientRect(); return { x: ((e.clientX-r.left)+shell.scrollLeft)/zoom, y: ((e.clientY-r.top)+shell.scrollTop)/zoom }; }
  function onBackgroundDown(e){ if(connectMode || e.button!==0 || e.target.closest('button,input,select,textarea,a,.node,.mapControls,.edgeLegend,.edgeDetail')) return; drag.current={sx:e.clientX,sy:e.clientY,left:shellRef.current?.scrollLeft || 0,top:shellRef.current?.scrollTop || 0}; }
  function onMove(e){
    if(nodeDrag.current){
      const shell = shellRef.current;
      if (shell) {
        const r = shell.getBoundingClientRect();
        const edge = 72;
        const speed = 34;
        if (e.clientX > r.right - edge) shell.scrollLeft += Math.min(speed, e.clientX - (r.right - edge));
        if (e.clientX < r.left + edge) shell.scrollLeft -= Math.min(speed, (r.left + edge) - e.clientX);
        if (e.clientY > r.bottom - edge) shell.scrollTop += Math.min(speed, e.clientY - (r.bottom - edge));
        if (e.clientY < r.top + edge) shell.scrollTop -= Math.min(speed, (r.top + edge) - e.clientY);
      }
      const pt=localPoint(e);
      const nextPos = clampPosition({ x: pt.x - nodeDrag.current.dx, y: pt.y - nodeDrag.current.dy });
      nodeDrag.current.nextPos = nextPos;
      if (!dragFrame.current) {
        dragFrame.current = requestAnimationFrame(() => {
          dragFrame.current = null;
          const active = nodeDrag.current;
          if (!active?.nextPos) return;
          updateMap(m=>({...m,positions:{...(m.positions||{}),[active.id]:active.nextPos}}));
        });
      }
      return;
    }
    if(drag.current && shellRef.current){ shellRef.current.scrollLeft=drag.current.left-(e.clientX-drag.current.sx); shellRef.current.scrollTop=drag.current.top-(e.clientY-drag.current.sy); }
  }
  function stopDrag(){
    if (nodeDrag.current?.nextPos) {
      const active = nodeDrag.current;
      updateMap(m=>({...m,positions:{...(m.positions||{}),[active.id]:active.nextPos}}));
    }
    if (dragFrame.current) { cancelAnimationFrame(dragFrame.current); dragFrame.current = null; }
    drag.current=null;
    nodeDrag.current=null;
  }
  function nodePointerDown(e,n){ if(!manualMode) return; e.preventDefault(); e.stopPropagation(); const p=positions.get(n.id); const pt=localPoint(e); nodeDrag.current={id:n.id,dx:pt.x-p.x,dy:pt.y-p.y}; }
  function nodeClick(e,n){ e.stopPropagation(); if(connectMode){ if(!connectFrom){ setConnectFrom(n.id); return; } if(connectFrom!==n.id){ updateMap(m=>{ const links=m.links||[]; const exists=links.some(l=>String(l.source)===String(connectFrom)&&String(l.target)===String(n.id)); return exists?m:{...m,links:[...links,{source:connectFrom,target:n.id}]}; }); } setConnectFrom(null); return; } setSelected(n.quest); }
  function clearManual(){ if(confirm('Clear manual positions and links for this file?')) updateMap({positions:{},links:[]}); }
  function resetScroll(){ if(shellRef.current){ shellRef.current.scrollLeft=0; shellRef.current.scrollTop=0; } }
  function zoomBy(delta){ setZoom(z => Math.max(.55, Math.min(1.6, Number((z + delta).toFixed(2))))); }
  function centerPoint(p){ if(shellRef.current && p){ shellRef.current.scrollLeft=Math.max(0,p.x*zoom-220); shellRef.current.scrollTop=Math.max(0,p.y*zoom-160); } }
  function centerOn(n){ const p=positions.get(n.id); centerPoint(p); if(n?.quest) setSelected(n.quest); }
  function centerSelected(){
    if (!selected) { alert('Select a quest first.'); return; }
    if (!selectedNode) { alert('The selected quest is hidden by the current search or group filter. Clear filters or select it from the visible graph first.'); return; }
    centerOn(selectedNode);
  }
  useEffect(() => {
    if (!focusRequest || !selectedNode) return;
    const frame = requestAnimationFrame(() => centerOn(selectedNode));
    return () => cancelAnimationFrame(frame);
  }, [focusRequest, selectedNode?.id, zoom]);
  function focusLink(l){ setSelectedEdge(l); const target = graph.nodes.find(n => n.id === String(l.target)); if (target) centerOn(target); }
  function connectedLineFrom(startId){
    const nodeById = new Map(filteredNodes.map(n => [n.id, n]));
    if (!nodeById.has(startId)) return [];
    const undirected = new Map(filteredNodes.map(n => [n.id, new Set()]));
    const out = new Map(filteredNodes.map(n => [n.id, []]));
    const inc = new Map(filteredNodes.map(n => [n.id, []]));
    clusterLinks.forEach(l => {
      const s = String(l.source), t = String(l.target);
      if (!nodeById.has(s) || !nodeById.has(t)) return;
      undirected.get(s).add(t); undirected.get(t).add(s);
      out.get(s).push(t); inc.get(t).push(s);
    });
    const ids = new Set([startId]);
    const stack = [startId];
    while (stack.length) {
      const id = stack.pop();
      for (const next of undirected.get(id) || []) if (!ids.has(next)) { ids.add(next); stack.push(next); }
    }
    const sortNodes = (a,b) => (nodeById.get(a)?.part??999)-(nodeById.get(b)?.part??999) || (nodeById.get(a)?.index??0)-(nodeById.get(b)?.index??0);
    const starts = [...ids].filter(id => !(inc.get(id)||[]).some(x => ids.has(x))).sort(sortNodes);
    const ordered = [];
    const seen = new Set();
    function walk(id){
      if (seen.has(id)) return;
      seen.add(id);
      ordered.push(nodeById.get(id));
      for (const next of (out.get(id)||[]).filter(x => ids.has(x)).sort(sortNodes)) walk(next);
    }
    (starts.length ? starts : [...ids].sort(sortNodes)).forEach(walk);
    [...ids].sort(sortNodes).forEach(walk);
    return ordered.filter(Boolean);
  }
  function lineUpSelected(){
    const selectedId = selected?.QuestID == null ? '' : String(selected.QuestID);
    if (!selectedId || !visible.has(selectedId)) { alert('Select a quest in the graph first, then use Line up selected.'); return; }
    const ordered = connectedLineFrom(selectedId);
    if (!ordered.length) return;
    const baseY = Math.max(60, Math.min(...ordered.map(n => positions.get(n.id)?.y ?? 60)));
    const baseX = Math.max(92, Math.min(...ordered.map(n => positions.get(n.id)?.x ?? 92)));
    const nextPositions = {};
    ordered.forEach((n, i) => { nextPositions[n.id] = clampPosition({ x: baseX + i * colWidth, y: baseY }); });
    updateMap(m => ({...m, positions: {...(m.positions||{}), ...nextPositions}}));
    centerPoint(nextPositions[selectedId]);
  }
  function applyGridOrder(){
    if (searchText || groupFilter) { alert('Clear search and group filter before applying the grid order to Quest.json. This prevents exporting a partial/filtered order by mistake.'); return; }
    const orderedIds = filteredNodes
      .map(n => ({ id: n.id, pos: positions.get(n.id) || { x: 0, y: 0 }, index: n.index }))
      .sort((a,b) => (a.pos.y - b.pos.y) || (a.pos.x - b.pos.x) || (a.index - b.index))
      .map(x => x.id);
    if (!orderedIds.length) return;
    if (!confirm(`Apply the current grid/map order to the Quest.json object order?\n\nThis changes only the order of quest entries in the exported JSON, not quest fields or rewards.`)) return;
    onApplyGridOrder?.(orderedIds);
  }
  return <div ref={shellRef} className={`mapShell ${nodeDrag.current ? 'movingNode' : ''}`} onMouseDown={onBackgroundDown} onMouseMove={onMove} onMouseUp={stopDrag} onMouseLeave={stopDrag}>
    <div className="mapControls"><button onClick={resetScroll}>Reset view</button><button onClick={centerSelected}>Center selected</button><button onClick={()=>zoomBy(-.1)}>−</button><span>{Math.round(zoom*100)}%</span><button onClick={()=>zoomBy(.1)}>+</button><button className={manualMode?'active':''} onClick={()=>setManualMode(!manualMode)}>Move nodes</button><button onClick={lineUpSelected}>Line up selected</button><button onClick={applyGridOrder}>Apply grid order</button><button className={connectMode?'active':''} onClick={()=>{setConnectMode(!connectMode);setConnectFrom(null);}}>Connect quests</button><button onClick={clearManual}>Clear manual</button><span>{links.length} quest links ({manualLinks.length} manual) · {crossQuestUnlocks.length} cross-quest unlocks</span>{connectFrom && <span>Choose target for #{connectFrom}</span>}</div>
    <aside className="edgeLegend" aria-label="Graph edge legend"><b>Edge legend</b><span><i className="normal"></i><em>Name/part chain<small>— Auto: Part 1 → Part 2</small></em></span><span><i className="permission"></i><em>Permission-name match<small>— Fallback by QuestPermission name</small></em></span><span><i className="permissionGrant"></i><em>Reward grants permission<small>— PrizeCommand unlocks target</small></em></span><span><i className="unlock"></i><em>Cross-quest unlock<small>— Grant into another questline</small></em></span><span><i className="manual"></i><em>Manual link<small>— Added by you</small></em></span><span><i className="loop"></i><em>Loop/back edge<small>— Returns to earlier quest</small></em></span></aside>
    {selectedEdgeDetail ? <aside className="edgeDetail" aria-label="Selected edge details"><div><b>{selectedEdgeDetail.label}</b><button onClick={()=>setSelectedEdge(null)}>×</button></div><small>{selectedEdgeDetail.strength}</small><p>{selectedEdgeDetail.why}</p><dl><dt>From</dt><dd>#{selectedEdgeDetail.link.source} · {edgeQuestTitle(selectedEdgeDetail.sourceNode)}</dd><dt>To</dt><dd>#{selectedEdgeDetail.link.target} · {edgeQuestTitle(selectedEdgeDetail.targetNode)}</dd>{selectedEdgeDetail.permission ? <><dt>Target requires</dt><dd><code>{selectedEdgeDetail.permission}</code></dd></> : null}{selectedEdgeDetail.grantCommand ? <><dt>Source reward command</dt><dd><code>{selectedEdgeDetail.grantCommand}</code></dd></> : null}<dt>Internal reason</dt><dd><code>{selectedEdgeDetail.link.reason || 'manual'}</code></dd></dl></aside> : null}
    <div className="graphCanvasWrap" style={{ width: width*zoom, height: height*zoom }}><div className="graphCanvas" style={{ width, height, transform:`scale(${zoom})` }}>
      <svg className="wires" width={width} height={height}>
        <defs>
          <marker id="arrowQuest" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
          <marker id="arrowPermission" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
          <marker id="arrowPermissionGrant" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
          <marker id="arrowManual" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
          <marker id="arrowLoop" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
          <marker id="arrowExternal" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
        </defs>
        {renderLinks.map((l,i)=>{ const a=positions.get(String(l.source)), b=positions.get(String(l.target)); if(!a||!b)return null; const isUnlock=l.reason==='cross-quest-unlock'; const backEdge=!isUnlock && b.x<=a.x; const className=`${l.manual?'manual':l.reason} ${backEdge?'loopEdge':''} ${selectedEdge && edgeKey(selectedEdge)===edgeKey(l)?'selectedEdge':''}`; const marker=markerForLink(l,backEdge,isUnlock); if(backEdge){ const x1=a.x+nodeMidX,y1=a.y+6,x2=b.x+nodeMidX,y2=b.y+6,arch=Math.min(y1,y2)-84,labelX=(x1+x2)/2,labelY=arch-9,arrowX=(x1+x2)/2,arrowY=arch+20; return <g key={i} className="wireGroup" onClick={(e)=>{e.stopPropagation();focusLink(l);}}><path markerEnd={marker} className={className} d={`M ${x1} ${y1} C ${x1} ${arch}, ${x2} ${arch}, ${x2} ${y2}`} /><text className="wireArrow loopArrow" x={arrowX} y={arrowY} textAnchor="middle">↩</text><text className="loopDirection" x={labelX} y={labelY} textAnchor="middle">to #{String(l.target).replace(/^access:/,'')}</text></g>; } const x1=a.x+linkStartX,y1=a.y+linkY,x2=b.x+8,y2=b.y+linkY; const mid=Math.max(90,Math.abs(x2-x1)/2),arrowX=(x1+x2)/2,arrowY=(y1+y2)/2-9,angle=Math.atan2(y2-y1,x2-x1)*180/Math.PI; return <g key={i} className="wireGroup" onClick={(e)=>{e.stopPropagation();focusLink(l);}}><path markerEnd={marker} className={className} d={`M ${x1} ${y1} C ${x1+mid} ${y1-18}, ${x2-mid} ${y2+18}, ${x2} ${y2}`} /><text className={`wireArrow ${isUnlock?'externalArrow':(l.manual?'manualArrow':l.reason)}`} x={arrowX} y={arrowY} textAnchor="middle" transform={`rotate(${angle} ${arrowX} ${arrowY})`}>{isUnlock?'⇢':'➜'}</text>{isUnlock?<text className="unlockDirection" x={arrowX} y={arrowY+22} textAnchor="middle">cross unlock</text>:null}</g>;})}
      </svg>
      {rows.map((row,rowIndex)=>{ const matchedCount=row.nodes.filter(n=>!contextVisible.has(n.id)).length; const contextCount=row.nodes.length-matchedCount; const oneTimeStarts=row.nodes.filter(n=>!incoming.has(n.id)&&!n.quest?.IsRepeatable).length; const repeatables=row.nodes.filter(n=>n.quest?.IsRepeatable).length; return <div className="clusterLabel" key={row.key} style={{top:26+rowIndex*rowHeight,left:22}}><b>{row.group}</b><span>{searchText ? `${matchedCount} match${matchedCount===1?'':'es'}` : `${row.nodes.length} quests`}</span>{contextCount ? <em className="contextTag">{contextCount} connected outside search</em> : null}{!searchText && oneTimeStarts ? <em>{oneTimeStarts} one-time start{oneTimeStarts>1?'s':''}</em> : null}{!searchText && repeatables ? <em>{repeatables} repeatable</em> : null}{row.loopCount ? <em className="loopTag">loop</em> : null}</div>; })}
      {rows.map(row=>{
        if (searchText || titleOnlyMode) return null;
        const summaryGroups = [
          { key: 'one-time', title: 'One-time summary', nodes: row.nodes.filter(n => !n.quest?.IsRepeatable) },
          { key: 'repeatable', title: 'Repeatable summary', nodes: row.nodes.filter(n => n.quest?.IsRepeatable) }
        ].filter(g => g.nodes.length);
        return summaryGroups.map((g, idx) => {
          const last = g.nodes[g.nodes.length - 1];
          const p = last && positions.get(last.id);
          const unlockCount = g.nodes.reduce((sum,n)=>sum+(unlocksBySource.get(n.id)?.length||0),0);
          return p ? <div key={`summary-${row.key}-${g.key}`} style={{left:p.x+nodeWidth+30,top:p.y+18+idx*(compactMode?58:72),position:'absolute'}}><QuestlineSummaryBox nodes={g.nodes} externalCount={unlockCount} title={g.title}/></div> : null;
        });
      })}
      {filteredNodes.map(n=>{ const p=positions.get(n.id); const isContext=contextVisible.has(n.id); const firstSkin=titleOnlyMode ? null : extractSkinIds(n.quest).map(id=>steamItems[id]).find(Boolean); const rewards=titleOnlyMode ? [] : rewardSummary(n.quest.PrizeList).slice(0,2); const isLast=!outgoing.has(n.id); const issueCount=issueCounts[String(n.quest.QuestID)] || 0; const isStart=!incoming.has(n.id); const isRepeatable=!!n.quest?.IsRepeatable; const loopReturn=isRepeatable&&incoming.has(n.id); return <React.Fragment key={n.id}><button onMouseDown={e=>nodePointerDown(e,n)} onClick={e=>nodeClick(e,n)} className={'node '+(titleOnlyMode?'titleOnlyNode ':'')+(selected?.QuestID===n.quest.QuestID?'selected ':'')+(connectFrom===n.id?'connectFrom ':'')+(manualMode?'movable ':'')+(isRepeatable?'repeatable ':'')+(loopReturn?'loopReturn ':'')+(isContext?'searchContext ':'')} style={{left:p.x,top:p.y}}>
        {!titleOnlyMode && <span className="nodeFlags">{isContext?<span className="flag context">connected outside search</span>:null}{isStart&&!isRepeatable?<span className="flag start">one-time start</span>:null}{isRepeatable?<span className="flag repeat">repeatable</span>:null}{loopReturn?<span className="flag loop">loop return</span>:null}</span>}{issueCount ? <span className="nodeBadge">{titleOnlyMode ? issueCount : `${issueCount} issues`}</span> : null}{firstSkin?.preview && <img className="nodeSkin" src={firstSkin.preview}/>}<span className="nodeId">#{n.id}{titleOnlyMode ? '' : ` · ${n.group}${n.part!=null?` · Part ${n.part}`:''}`}</span><TaggedText className="nodeTitle" value={questTitle(n.quest)}/>{!titleOnlyMode && <><small><TaggedText value={n.quest.QuestMissions}/></small><span className="meta">{questTypeName(n.quest.QuestType)} · perm {n.quest.QuestPermission || '—'} · rewards {(n.quest.PrizeList||[]).length}</span>{rewards.length?<span className="nodeRewards">🏆 {rewards.join(' · ')}</span>:null}</>}</button>{!isContext && !titleOnlyMode && <button className="sideQuestPlus" title={`Add sidequest from #${n.id}`} style={{left:p.x+nodeWidth-34,top:p.y+(compactMode?76:108)}} onClick={(e)=>{e.stopPropagation();onCreateSideQuest?.(n.quest);}}>↳+</button>}{isLast && !isContext && !titleOnlyMode && <button className="linePlus" title="Add next quest in line" style={{left:p.x+nodeWidth,top:p.y+(compactMode?34:48)}} onClick={(e)=>{e.stopPropagation();onCreateNext(n.quest);}}>+</button>}</React.Fragment>})}
    </div></div></div>;
}

function QuestInspector({ quest, baselineQuest, steamItems, issues = [], onPatch, onAdvanced }) {
  if (!quest) return <aside className="side inspector"><p>No quest selected.</p></aside>;
  const selectedIssues = issues.filter(i => i.quest?.QuestID === quest.QuestID);
  const changedFields = changedQuestFields(quest, baselineQuest);
  const patch = (key, value) => onPatch({ ...quest, [key]: value });
  return <aside className="side inspector">
    <div className="inspectorHead"><div><h2>Inspector</h2><TaggedText className="sideTitle" value={questTitle(quest)} /></div><button className="primary" onClick={onAdvanced}>Fullscreen edit</button></div>
    <div className="badges">{selectedIssues.length ? selectedIssues.slice(0, 6).map((i, idx) => <span className={`badge ${i.severity}`} key={idx}>{i.field}: {i.message}</span>) : <span className="badge ok">No local issues</span>}{changedFields.length ? <span className="badge changed">{changedFields.length} changed fields</span> : <span className="badge clean">No field changes</span>}</div>
    {changedFields.length ? <div className="changedFields"><b>Changed since load/download</b><div>{changedFields.slice(0, 10).map(field => <span key={field}>{field}</span>)}{changedFields.length > 10 ? <span>+{changedFields.length - 10} more</span> : null}</div></div> : null}
    <div className="quickGrid"><p><b>ID:</b> {quest.QuestID}</p><p><b>Group:</b> {questGroup(quest)}</p><p><b>Series:</b> {questSeriesKey(quest)}</p><p><b>Type:</b> {quest.QuestType} — {questTypeName(quest.QuestType)}</p></div>
    <Field label="QuestDisplayName" value={quest.QuestDisplayName} onChange={v => patch('QuestDisplayName', v)} textarea rows={3} />
    <div className="livePreview"><b>Preview:</b> <TaggedText value={questTitle(quest)} /></div>
    <div className="two"><Field label="Permission" value={quest.QuestPermission} onChange={v => patch('QuestPermission', v)} /><Field label="ActionCount" type="number" value={quest.ActionCount} onChange={v => patch('ActionCount', v)} /></div>
    <Field label="Mission" value={quest.QuestMissions} onChange={v => patch('QuestMissions', v)} textarea rows={3} />
    <Field label="Description" value={quest.QuestDescription} onChange={v => patch('QuestDescription', v)} textarea rows={5} />
    <h3>Rewards</h3><Rewards quest={quest} steamItems={steamItems}/>
    <h3>Steam skins</h3><div className="skinGrid">{extractSkinIds(quest).map(id=>{const item=steamItems[id]; return <a className="skin" href={item?.url || `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`} target="_blank" key={id}>{item?.preview?<img src={item.preview}/>:<div className="noImg">...</div>}<b>{item?.title || `Skin ${id}`}</b><span>ID {id}</span></a>})}</div>
  </aside>;
}

function QuestListView({ quests, selected, setSelected, onShowGraph, query }) {
  const rows = quests.filter(q => !query || JSON.stringify(q).toLowerCase().includes(query.toLowerCase()));
  return <section className="workspace"><div className="viewHead"><h2>Quest list</h2><p>{rows.length} quests match the filter. Click a row to select it in the inspector, or use Show on graph to jump to it.</p></div><div className="questList">{rows.map(q => <article className={`questRow ${selected?.QuestID===q.QuestID?'selected':''}`} key={q.QuestID} onClick={()=>setSelected(q)}><span>#{q.QuestID}</span><button className="questRowTitle" onClick={(e)=>{e.stopPropagation(); setSelected(q);}}><b><TaggedText value={questTitle(q)} /></b></button><em>{questTypeName(q.QuestType)}</em><small>{q.QuestPermission || '—'} · rewards {(q.PrizeList||[]).length}</small><button className="rowAction" onClick={(e)=>{e.stopPropagation(); onShowGraph(q);}}>Show on graph</button></article>)}</div></section>;
}

function issueKind(issue) {
  const text = `${issue?.field || ''} ${issue?.message || ''}`.toLowerCase();
  if (text.includes('permission') || text.includes('questpermission')) return 'permission';
  if (/prize|reward|item|command|shortname|amount/.test(text)) return 'reward';
  if (text.includes('map') || text.includes('manual link')) return 'map';
  return 'general';
}

function ValidationView({ issues, setSelected, selected }) {
  const [filter, setFilter] = useState('all');
  const errors = issues.filter(i=>i.severity==='error').length;
  const warns = issues.filter(i=>i.severity==='warn').length;
  const selectedId = selected?.QuestID == null ? '' : String(selected.QuestID);
  const filters = [
    { id: 'all', label: 'All', count: issues.length },
    { id: 'errors', label: 'Errors', count: errors },
    { id: 'warnings', label: 'Warnings', count: warns },
    { id: 'current', label: selectedId ? `Current #${selectedId}` : 'Current quest', count: selectedId ? issues.filter(i => String(i.quest?.QuestID) === selectedId).length : 0, disabled: !selectedId },
    { id: 'permission', label: 'Permission issues', count: issues.filter(i => issueKind(i) === 'permission').length },
    { id: 'reward', label: 'Reward issues', count: issues.filter(i => issueKind(i) === 'reward').length },
    { id: 'map', label: 'Map issues', count: issues.filter(i => issueKind(i) === 'map').length },
  ];
  const visibleIssues = issues.filter(issue => {
    if (filter === 'errors') return issue.severity === 'error';
    if (filter === 'warnings') return issue.severity === 'warn';
    if (filter === 'current') return selectedId && String(issue.quest?.QuestID) === selectedId;
    if (['permission', 'reward', 'map'].includes(filter)) return issueKind(issue) === filter;
    return true;
  });
  const activeLabel = filters.find(f => f.id === filter)?.label || 'All';
  return <section className="workspace"><div className="viewHead"><h2>Validation</h2><p>{errors} errors · {warns} warnings. Showing {visibleIssues.length} of {issues.length} issues ({activeLabel}).</p></div><div className="validationFilters">{filters.map(f => <button key={f.id} disabled={f.disabled} className={filter===f.id?'active':''} onClick={() => setFilter(f.id)}>{f.label} <b>{f.count}</b></button>)}</div>{!issues.length ? <div className="empty"><h2>Looks clean</h2><p>No local issues found.</p></div> : !visibleIssues.length ? <div className="empty"><h2>No matches</h2><p>No validation issues match the current filter.</p></div> : <div className="issueList">{visibleIssues.map((issue, i) => <button key={`${issue.field}-${issue.index}-${i}`} className={`issueRow ${issue.severity}`} onClick={()=>issue.quest && setSelected(issue.quest)}><span>{issue.severity}</span><b>{issue.field}</b><p>{issue.message}</p><small>{issue.quest ? `#${issue.quest.QuestID} · ${questTitle(issue.quest)} · ${issueKind(issue)}` : `Map metadata · ${issueKind(issue)}`}</small></button>)}</div>}</section>;
}

function ChangelogView() {
  return <section className="workspace"><div className="viewHead"><h2>Changelog</h2><p>Quest Studio {APP_VERSION}. Local-only editor changes are logged here so it is easier to know which build you are using.</p></div><div className="changelogList">{CHANGELOG.map(entry => <article className="changeCard" key={entry.version}><div><b>{entry.version}</b><span>{entry.date}</span></div><ul>{entry.items.map((item, idx) => <li key={idx}>{item}</li>)}</ul></article>)}</div></section>;
}

function SaveInfoOverlay({ fileName, savedAt, sourceBaseName, backups = [], onCreateBackup, onRestoreBackup, onClose }) {
  return <div className="modalBackdrop" onMouseDown={onClose}><section className="infoModal" onMouseDown={e=>e.stopPropagation()}>
    <div className="modalHead"><div><h2>How saving works locally</h2><small>Quest Studio {APP_VERSION}</small></div><button onClick={onClose}>Close</button></div>
    <div className="infoBody">
      <div className="infoGrid">
        <article><b>There is no normal “Save” button</b><p>The app autosaves your current working version into this browser's localStorage. The explicit file-save/export action is <b>Save file / Download Quest.json</b>.</p></article>
        <article><b>Autosave timing</b><p>Autosave runs automatically right after changes to quests, selected quest, active tab, search/filter, filename/version, or map data. In practice: within the next browser render after an edit, usually instantly.</p></article>
        <article><b>Where autosave lives</b><p>Autosave stays in this browser on this machine. It is not uploaded anywhere by the editor. Clearing browser site data/localStorage can remove it.</p></article>
        <article><b>Download Quest.json</b><p>Downloads the current in-memory quest array as a clean JSON file. Each download gets a unique timestamped name, for example <code>Quest.2026-07-29_14-32-05.json</code>.</p></article>
        <article><b>Download map</b><p>Downloads editor-only map layout data: manual node positions and manual links. This is separate so the plugin Quest.json stays clean.</p></article>
        <article><b>Grid order</b><p>Moving nodes does not reorder Quest.json by itself. Only <b>Apply grid order to JSON</b> intentionally changes the quest object order before download.</p></article>
      </div>
      <div className="saveFacts"><span>Current version file: <b>{fileName}</b></span><span>Source base name: <b>{sourceBaseName}</b></span><span>Last autosave: <b>{savedAt ? new Date(savedAt).toLocaleString() : 'not yet'}</b></span></div>
      <section className="backupPanel"><div><h3>Local backup snapshots</h3><p>Create a browser-local restore point before risky edits, reward-link experiments, or applying grid order to JSON. Backups stay in localStorage and are not downloaded files.</p></div><button className="primary" onClick={() => onCreateBackup('Manual snapshot')}>Create backup snapshot</button></section>
      <div className="backupList">{backups.length ? backups.map((b, idx) => <article className="backupCard" key={b.id || idx}><div><b>{b.fileName || 'Quest.json'}</b><span>{b.createdAt ? new Date(b.createdAt).toLocaleString() : 'unknown time'}</span></div><small>{b.reason || 'Manual snapshot'} · {b.questCount || 0} quests · selected #{b.selectedId || '—'}</small><button onClick={() => onRestoreBackup(b)}>Restore</button></article>) : <p className="muted">No local backup snapshots yet.</p>}</div>
    </div>
  </section></div>;
}

function SettingsView({ quests, baselineQuests = [], graph, manualMap, mapSteamStatus, issues = [], backups = [], fileName, fileStatus, fileNeedsDownload, onDownloadJson, onDownloadMap, onNewQuest, onShowGraph, onOpenQuest, onSearchRelated }) {
  const errors = issues.filter(i => i.severity === 'error').length;
  const warns = issues.filter(i => i.severity === 'warn').length;
  const manualCount = (manualMap.links || []).length + Object.keys(manualMap.positions || {}).length;
  const ready = quests.length > 0 && errors === 0;
  const diff = exportDiffSummary(quests, baselineQuests);
  const chainIssues = brokenChainIssues(graph);
  const chainWarns = chainIssues.filter(i => i.severity === 'warn').length;
  const diffItems = [
    { label: 'Added quests', value: diff.added.length, detail: diff.added.slice(0, 3).map(q => `#${q.QuestID}`).join(', ') || 'None', rows: diff.added.map(q => ({ quest: q, fields: ['new quest'], kind: 'added' })) },
    { label: 'Removed quests', value: diff.removed.length, detail: diff.removed.slice(0, 3).map(q => `#${q.QuestID}`).join(', ') || 'None', rows: diff.removed.map(q => ({ quest: q, fields: ['removed from export'], kind: 'removed' })) },
    { label: 'Changed quests', value: diff.changed.length, detail: diff.changed.slice(0, 3).map(x => `#${x.quest.QuestID}: ${x.fields.slice(0, 3).join(', ')}`).join(' · ') || 'None', rows: diff.changed.map(x => ({ ...x, kind: 'changed' })) },
    { label: 'Reordered quests', value: diff.reordered, detail: diff.reordered ? 'Quest array order differs from baseline' : 'Order unchanged', rows: diff.reorderedIds.map(id => ({ quest: quests.find(q => String(q.QuestID) === String(id)), fields: ['array position changed'], kind: 'reordered' })).filter(x => x.quest) },
  ];
  const checklist = [
    { label: 'Quest.json loaded', ok: quests.length > 0, detail: quests.length ? `${quests.length} quests loaded` : 'No file loaded' },
    { label: 'Validation errors', ok: errors === 0, detail: errors ? `${errors} errors must be reviewed` : warns ? `0 errors · ${warns} warnings` : '0 errors · 0 warnings' },
    { label: 'Local backup snapshot', ok: backups.length > 0, detail: backups.length ? `${backups.length} local backups available` : 'No local backup snapshot yet' },
    { label: 'Map sidecar status', ok: true, detail: manualCount ? `${manualCount} map/layout edits can be exported with Download map` : 'No manual map sidecar changes' },
    { label: 'Broken-chain helper', ok: chainWarns === 0, detail: chainIssues.length ? `${chainWarns} warnings · ${chainIssues.length - chainWarns} notes` : 'No obvious chain gaps found' },
    { label: 'File handoff', ok: !fileNeedsDownload, detail: fileStatus },
  ];
  return <section className="workspace">
    <div className="viewHead"><h2>Settings & export</h2><p>Export a clean Quest.json and save map layout as a separate sidecar file.</p></div>
    <div className="settingsGrid"><div className="statCard"><b>{quests.length}</b><span>quests</span></div><div className="statCard"><b>{graph.links.length}</b><span>auto chains</span></div><div className="statCard"><b>{(manualMap.links||[]).length}</b><span>manual links</span></div><div className="statCard"><b>{chainIssues.length}</b><span>chain helper notes</span></div><div className="statCard"><b>{mapSteamStatus || '—'}</b><span>Steam skin cache</span></div></div>
    <section className={`readinessPanel ${ready?'ready':'blocked'}`}><div><h3>Export readiness</h3><p>{ready ? 'Ready for a clean Quest.json export. Review warnings and map sidecar notes if needed.' : 'Not ready for a clean handoff yet. Fix or intentionally accept the items below.'}</p></div><b>{ready ? 'READY' : 'CHECK FIRST'}</b><div className="readinessList">{checklist.map(item => <div className={item.ok?'ok':'warn'} key={item.label}><span>{item.ok?'✓':'!'}</span><p><b>{item.label}</b><small>{item.detail}</small></p></div>)}</div></section>
    <section className={`chainHelper ${chainWarns ? 'blocked' : 'clean'}`}><div><h3>Broken-chain helper</h3><p>{chainIssues.length ? 'Potential chain problems found from parts, required permissions, and reward grants. Click a quest to inspect it or show it on the graph.' : 'No obvious missing Part 1 links, missing grantors, unused grants, or ambiguous grants found.'}</p></div><b>{chainWarns ? `${chainWarns} CHECK` : 'OK'}</b>{chainIssues.length ? <div className="chainIssueList">{chainIssues.slice(0, 16).map((issue, i) => <article key={`${issue.type}-${issue.quest?.QuestID || 'map'}-${i}`} className={issue.severity}><span>{issue.severity}</span><div><b>{issue.title}</b><small>{issue.quest ? <>#{issue.quest.QuestID} · <TaggedText value={questTitle(issue.quest)} /></> : 'Graph metadata'} · {issue.detail}</small></div>{issue.quest ? <div className="rowActions"><button onClick={() => onOpenQuest?.(issue.quest)}>Open</button><button onClick={() => onShowGraph?.(issue.quest)}>Show graph</button><button onClick={() => onSearchRelated?.(chainIssueSearchText(issue))}>Search related</button></div> : null}</article>)}</div> : null}</section>
    <section className={`exportPreview ${diff.clean ? 'clean' : 'dirty'}`}><div><h3>Export preview</h3><p>{diff.clean ? 'No Quest.json data changes compared with the latest loaded/downloaded baseline.' : 'These are the Quest.json changes that will be included in the next download. Click rows to inspect or jump to graph before exporting.'}</p></div><b>{diff.clean ? 'NO DATA CHANGES' : 'CHANGES PENDING'}</b><div className="diffGrid">{diffItems.map(item => <article key={item.label} className={item.value ? 'dirty' : 'clean'}><strong>{item.value}</strong><span>{item.label}</span><small>{item.detail}</small></article>)}</div>{diff.topFields.length ? <div className="diffFields"><b>Most changed fields</b>{diff.topFields.map(([field, count]) => <span key={field}>{field} × {count}</span>)}</div> : null}{diffItems.some(item => item.rows.length) ? <div className="diffDetails"><b>Diff details</b>{diffItems.flatMap(item => item.rows.slice(0, 8).map((row, idx) => <article key={`${item.label}-${row.quest?.QuestID}-${idx}`} className={row.kind}><span>{item.label}</span><div><b>#{row.quest?.QuestID} · <TaggedText value={questTitle(row.quest)} /></b><small>{row.fields.slice(0, 8).join(', ')}</small>{row.kind === 'changed' ? <div className="fieldDiffs">{row.fields.slice(0, 4).map(field => <div key={field}><span>{field}</span><code>Before: {formatDiffValue(row.before?.[field])}</code><code>After: {formatDiffValue(row.quest?.[field])}</code></div>)}</div> : null}</div><div className="rowActions"><button onClick={() => onOpenQuest?.(row.quest)} disabled={row.kind === 'removed'}>{row.kind === 'removed' ? 'Removed' : 'Open'}</button><button onClick={() => onShowGraph?.(row.quest)} disabled={row.kind === 'removed'}>Show graph</button></div></article>))}</div> : null}</section>
    <div className="exportPanel"><button className="primary" disabled={!quests.length} onClick={onDownloadJson}>Save file / Download Quest.json</button><button disabled={!quests.length} onClick={onDownloadMap}>Download map</button><button onClick={onNewQuest}>+ New quest</button><p className="muted">Current version: <b>{fileName}</b>. Quest.json exports without UI layout data. Manual positions/links are stored in a separate .quest-map.json file.</p></div>
  </section>;
}

function App() {
  const fileRef = useRef(null);
  const initialRef = useRef(null);
  if (initialRef.current === null) {
    try { initialRef.current = JSON.parse(localStorage.getItem(autosaveKey) || 'null'); }
    catch { initialRef.current = null; }
  }
  const initial = initialRef.current || {};
  const [quests, setQuests] = useState(() => initial.quests || []), [fileName,setFileName]=useState(() => initial.fileName || 'no file loaded'), [sourceBaseName,setSourceBaseName]=useState(() => initial.sourceBaseName || baseNameFromFile(initial.fileName || 'Quest')), [selected,setSelected]=useState(() => (initial.quests || []).find(q => String(q.QuestID) === String(initial.selectedId)) || (initial.quests || [])[0] || null), [editing,setEditing]=useState(null), [query,setQuery]=useState(() => initial.query || ''), [groupFilter,setGroupFilter]=useState(() => initial.groupFilter || '');
  const [manualMap, setManualMap] = useState(() => initial.manualMap || {positions:{},links:[]});
  const [baselineQuests, setBaselineQuests] = useState(() => initial.baselineQuests || initial.cleanQuests || initial.quests || []);
  const [activeTab, setActiveTab] = useState(() => initial.activeTab || 'graph');
  const [compactMode, setCompactMode] = useState(() => !!initial.compactMode);
  const [titleOnlyMode, setTitleOnlyMode] = useState(() => !!initial.titleOnlyMode);
  const [showSaveInfo, setShowSaveInfo] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(() => initial.savedAt || '');
  const [lastDownloadedAt, setLastDownloadedAt] = useState(() => initial.downloadedAt || '');
  const currentExportKey = useMemo(() => JSON.stringify(quests), [quests]);
  const [lastDownloadedKey, setLastDownloadedKey] = useState(() => initial.lastDownloadedKey || '');
  const [localBackups, setLocalBackups] = useState(() => {
    try { return JSON.parse(localStorage.getItem(backupsKey) || '[]'); }
    catch { return []; }
  });
  const [undoStack, setUndoStack] = useState([]);
  const [graphRevision, setGraphRevision] = useState(0);
  const [graphFocusRequest, setGraphFocusRequest] = useState(0);
  const graph = useMemo(()=>buildQuestGraph(quests),[quests]);
  const issues = useMemo(()=>validationIssues(quests, manualMap),[quests, manualMap]);
  const baselineById = useMemo(() => new Map((baselineQuests || []).map(q => [String(q.QuestID), q])), [baselineQuests]);
  const visibleSkinIds = useMemo(()=>[...new Set(quests.flatMap(extractSkinIds))].slice(0,100),[quests]);
  const selectedSkinIds = useMemo(()=>extractSkinIds(selected || {}),[selected]);
  const { items: mapSteamItems, status: mapSteamStatus } = useSteamItems(visibleSkinIds);
  const { items: selectedSteamItems } = useSteamItems(selectedSkinIds);
  const steamItems = { ...mapSteamItems, ...selectedSteamItems };
  useEffect(()=>{ if(fileName && fileName !== 'no file loaded') localStorage.setItem(mapKey(fileName), JSON.stringify(manualMap)); }, [manualMap, fileName]);
  useEffect(()=>{ localStorage.setItem(backupsKey, JSON.stringify(localBackups.slice(0, 5))); }, [localBackups]);
  useEffect(()=>{
    if (!quests.length || !fileName || fileName === 'no file loaded') return;
    const savedAt = new Date().toISOString();
    localStorage.setItem(autosaveKey, JSON.stringify({ quests, baselineQuests, fileName, sourceBaseName, manualMap, selectedId: selected?.QuestID ?? null, activeTab, query, groupFilter, compactMode, titleOnlyMode, savedAt, downloadedAt: lastDownloadedAt, lastDownloadedKey }));
    setLastSavedAt(savedAt);
  }, [quests, baselineQuests, fileName, sourceBaseName, manualMap, selected?.QuestID, activeTab, query, groupFilter, compactMode, titleOnlyMode, lastDownloadedAt, lastDownloadedKey]);
  async function loadText(text,name){ const parsed=JSON.parse(text); if(!Array.isArray(parsed)) throw new Error('Quest.json must be an array of quest objects'); setQuests(parsed); setBaselineQuests(parsed); setFileName(name); setSourceBaseName(baseNameFromFile(name)); setSelected(parsed[0]||null); setGroupFilter(''); setActiveTab('graph'); try{ setManualMap(JSON.parse(localStorage.getItem(mapKey(name)) || '{"positions":{},"links":[]}')); }catch{ setManualMap({positions:{},links:[]}); } }
  async function onFile(e){ const file=e.target.files?.[0]; if(!file)return; try{ await loadText(await file.text(),file.name); }catch(err){ alert('JSON error: '+err.message); } }
  function refreshGraphView(){ setGraphRevision(v => v + 1); }
  function captureUndoState(label){
    return { label, createdAt: Date.now(), quests: structuredClone(quests), baselineQuests: structuredClone(baselineQuests), manualMap: structuredClone(manualMap), fileName, sourceBaseName, selectedId: selected?.QuestID ?? null, activeTab, query, groupFilter, compactMode, titleOnlyMode, lastDownloadedAt, lastDownloadedKey };
  }
  function pushUndo(label){
    if (!quests.length) return;
    const snapshot = captureUndoState(label);
    setUndoStack(list => {
      const last = list[0];
      if (last?.label === label && Date.now() - last.createdAt < 1200) return list;
      return [snapshot, ...list].slice(0, 20);
    });
  }
  function restoreUndoState(snapshot){
    setQuests(snapshot.quests || []);
    setBaselineQuests(snapshot.baselineQuests || snapshot.quests || []);
    setManualMap(snapshot.manualMap || {positions:{},links:[]});
    setFileName(snapshot.fileName || 'Quest.json');
    setSourceBaseName(snapshot.sourceBaseName || baseNameFromFile(snapshot.fileName || 'Quest'));
    setSelected((snapshot.quests || []).find(q => String(q.QuestID) === String(snapshot.selectedId)) || (snapshot.quests || [])[0] || null);
    setActiveTab(snapshot.activeTab || 'graph');
    setQuery(snapshot.query || '');
    setGroupFilter(snapshot.groupFilter || '');
    setCompactMode(!!snapshot.compactMode);
    setTitleOnlyMode(!!snapshot.titleOnlyMode);
    setLastDownloadedAt(snapshot.lastDownloadedAt || '');
    setLastDownloadedKey(snapshot.lastDownloadedKey || '');
    setEditing(null);
    setShowSaveInfo(false);
    refreshGraphView();
  }
  function undoLastAction(){
    const snapshot = undoStack[0];
    if (!snapshot) return;
    restoreUndoState(snapshot);
    setUndoStack(list => list.slice(1));
  }
  function focusQuestInGraph(q){ setSelected(q); setActiveTab('graph'); setGraphFocusRequest(v => v + 1); }
  function openQuestInspector(q){ if (!q) return; setSelected(q); setEditing(null); }
  function searchRelated(text){ setQuery(text || ''); setGroupFilter(''); setActiveTab('list'); }
  function saveQuest(q){ pushUndo(`Save quest #${q.QuestID}`); setQuests(list=>list.some(x=>x.QuestID===q.QuestID)?list.map(x=>x.QuestID===q.QuestID?q:x):[...list,q]); setSelected(q); setEditing(null); refreshGraphView(); }
  function patchQuest(q){ pushUndo(`Edit quest #${q.QuestID}`); setQuests(list=>list.map(x=>x.QuestID===q.QuestID?q:x)); setSelected(q); refreshGraphView(); }
  function createNew(){ setEditing(newQuestTemplate(quests)); }
  function createNextQuest(prev){ pushUndo(`Create next quest after #${prev.QuestID}`); const q=nextQuestFrom(prev, quests); setQuests(list=>[...list,q]); setSelected(q); setEditing(q); const prevId=String(prev.QuestID), nextId=String(q.QuestID); setManualMap(m=>({...m,links:[...(m.links||[]),{source:prevId,target:nextId}]})); refreshGraphView(); }
  function createSideQuest(parent){
    if (!parent) return;
    pushUndo(`Create sidequest from #${parent.QuestID}`);
    const q = sideQuestFrom(parent, quests);
    const reward = permissionGrantReward(q.QuestPermission);
    setQuests(list => list.map(x => x.QuestID === parent.QuestID ? { ...x, PrizeList: [...(x.PrizeList || []), reward] } : x).concat(q));
    setSelected(q);
    setEditing(q);
    setManualMap(m => ({...m, links:[...(m.links || []), { source:String(parent.QuestID), target:String(q.QuestID) }]}));
    setActiveTab('graph');
    refreshGraphView();
  }
  function createLocalBackup(reason = 'Manual snapshot'){
    if (!quests.length) { alert('Load Quest.json before creating a backup snapshot.'); return; }
    const createdAt = new Date().toISOString();
    const snapshot = { id: `backup-${Date.now()}`, createdAt, reason, fileName, sourceBaseName, quests, baselineQuests, manualMap, selectedId: selected?.QuestID ?? null, activeTab, query, groupFilter, compactMode, titleOnlyMode, questCount: quests.length };
    setLocalBackups(list => [snapshot, ...list].slice(0, 5));
  }
  function restoreLocalBackup(snapshot){
    if (!snapshot?.quests?.length) return;
    if (!confirm(`Restore local backup from ${snapshot.createdAt ? new Date(snapshot.createdAt).toLocaleString() : 'unknown time'}?\n\nThis replaces the current in-browser working state. Download the current file first if you need it.`)) return;
    pushUndo('Restore local backup');
    setQuests(snapshot.quests);
    setFileName(snapshot.fileName || 'Quest.json');
    setSourceBaseName(snapshot.sourceBaseName || baseNameFromFile(snapshot.fileName || 'Quest'));
    setManualMap(snapshot.manualMap || {positions:{},links:[]});
    setBaselineQuests(snapshot.baselineQuests || snapshot.quests || []);
    setSelected(snapshot.quests.find(q => String(q.QuestID) === String(snapshot.selectedId)) || snapshot.quests[0] || null);
    setActiveTab(snapshot.activeTab || 'graph');
    setQuery(snapshot.query || '');
    setGroupFilter(snapshot.groupFilter || '');
    setCompactMode(!!snapshot.compactMode);
    setTitleOnlyMode(!!snapshot.titleOnlyMode);
    setLastDownloadedAt('');
    setLastDownloadedKey('');
    refreshGraphView();
    setShowSaveInfo(false);
  }
  function applyGridOrderToJson(orderedIds){
    const rank = new Map(orderedIds.map((id, i) => [String(id), i]));
    pushUndo('Apply grid order to JSON');
    createLocalBackup('Before Apply grid order to JSON');
    setQuests(list => list
      .map((q, originalIndex) => ({ q, originalIndex, rank: rank.has(String(q.QuestID)) ? rank.get(String(q.QuestID)) : Number.MAX_SAFE_INTEGER }))
      .sort((a,b) => (a.rank - b.rank) || (a.originalIndex - b.originalIndex))
      .map(x => x.q));
    refreshGraphView();
  }
  function downloadJson(){ const errorCount = issues.filter(i => i.severity === 'error').length; if (errorCount && !confirm(`Quest Studio found ${errorCount} validation error${errorCount===1?'':'s'}.\n\nDownload Quest.json anyway?`)) return; const downloadName=versionedFileName(sourceBaseName); const downloadedAt = new Date().toISOString(); const blob=new Blob([JSON.stringify(quests,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=downloadName; a.click(); setFileName(downloadName); setBaselineQuests(quests); setLastDownloadedAt(downloadedAt); setLastDownloadedKey(currentExportKey); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
  function downloadMap(){ const downloadName=versionedFileName(sourceBaseName,'quest-map.json'); const blob=new Blob([JSON.stringify({fileName, ...manualMap},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=downloadName; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
  const tabs = [['graph','Graph'],['list','Quest list'],['validation',`Validation ${issues.length ? `(${issues.length})` : ''}`],['settings','Settings/export'],['changelog','Changelog']];
  const fileNeedsDownload = !!quests.length && currentExportKey !== lastDownloadedKey;
  const fileStatus = !quests.length ? 'No file loaded' : fileNeedsDownload ? 'Browser autosaved · file not downloaded yet' : `Downloaded ${lastDownloadedAt ? new Date(lastDownloadedAt).toLocaleTimeString() : ''}`;
  useEffect(() => {
    if (!fileNeedsDownload) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = 'Your work is autosaved in this browser, but it has not been downloaded as a Quest.json file yet.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [fileNeedsDownload]);
  useEffect(() => {
    const name = fileName && fileName !== 'no file loaded' ? fileName : 'No file';
    const status = fileNeedsDownload ? 'needs download' : (quests.length ? 'downloaded' : 'empty');
    document.title = `${fileNeedsDownload ? '● ' : ''}Quest Studio ${APP_VERSION} — ${name} — ${status}`;
  }, [fileName, fileNeedsDownload, quests.length]);
  const workspace = activeTab === 'changelog' ? <ChangelogView/> : !quests.length ? <div className="empty"><h2>Upload Quest.json</h2><p>The file is kept in memory. Manual positions/links are saved locally per filename and can be exported separately.</p></div> : activeTab === 'graph' ? <Graph quests={quests} selected={selected} setSelected={setSelected} groupFilter={groupFilter} query={query} steamItems={steamItems} manualMap={manualMap} setManualMap={setManualMap} onCreateNext={createNextQuest} onCreateSideQuest={createSideQuest} onApplyGridOrder={applyGridOrderToJson} issues={issues} focusRequest={graphFocusRequest} compactMode={compactMode} titleOnlyMode={titleOnlyMode}/> : activeTab === 'list' ? <QuestListView quests={quests} selected={selected} setSelected={setSelected} onShowGraph={focusQuestInGraph} query={query}/> : activeTab === 'validation' ? <ValidationView issues={issues} setSelected={focusQuestInGraph} selected={selected}/> : <SettingsView quests={quests} baselineQuests={baselineQuests} graph={graph} manualMap={manualMap} mapSteamStatus={mapSteamStatus} issues={issues} backups={localBackups} fileName={fileName} fileStatus={fileStatus} fileNeedsDownload={fileNeedsDownload} onDownloadJson={downloadJson} onDownloadMap={downloadMap} onNewQuest={createNew} onShowGraph={focusQuestInGraph} onOpenQuest={openQuestInspector} onSearchRelated={searchRelated}/>;
  return <main className={`${compactMode ? 'compactMode' : 'comfortMode'} ${titleOnlyMode ? 'titleOnlyMode' : ''}`}><header><div className="brandBlock"><img className="brandLogo" src="/12g-logo.jpg" alt="12G" /><div><h1>Quest Studio <span className="appVersion">{APP_VERSION}</span></h1><p>Local XDQuest editor with a visual quest graph, inspector, validation, and safe JSON export.</p></div></div><div className="actions"><input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile}/><button onClick={()=>fileRef.current.click()}>Load Quest.json</button><button className="primary" disabled={!quests.length} onClick={downloadJson}>Save file / Download Quest.json</button><button disabled={!quests.length} onClick={downloadMap}>Download map</button><button onClick={()=>setShowSaveInfo(true)}>Save info</button></div></header>
    <section className="tabs">{tabs.map(([id,label]) => <button key={id} className={activeTab===id?'active':''} onClick={()=>setActiveTab(id)}>{label}</button>)}</section>
    <section className="toolbar"><b>{fileName}</b><span>{quests.length} quests · {graph.links.length} auto chains · {(manualMap.links||[]).length} manual · autosaves instantly{lastSavedAt ? ` · last ${new Date(lastSavedAt).toLocaleTimeString()}` : ''} · <em className={fileNeedsDownload?'fileDirty':'fileClean'}>{fileStatus}</em> · {mapSteamStatus}</span><button className="undoButton" disabled={!undoStack.length} title={undoStack[0] ? `Undo: ${undoStack[0].label}` : 'Nothing to undo'} onClick={undoLastAction}>↶ Undo{undoStack[0] ? `: ${undoStack[0].label}` : ''}</button><input placeholder="Search quest, ID, text…" value={query} onChange={e=>setQuery(e.target.value)}/><select value={groupFilter} onChange={e=>setGroupFilter(e.target.value)}><option value="">All groups</option>{graph.groups.map(g=><option key={g}>{g}</option>)}</select><button className={compactMode?'active densityToggle':'densityToggle'} onClick={()=>setCompactMode(v=>!v)}>{compactMode?'Compact on':'Comfort mode'}</button><button className={titleOnlyMode?'active densityToggle':'densityToggle'} onClick={()=>setTitleOnlyMode(v=>!v)}>{titleOnlyMode?'Graph boxes: title only':'Graph boxes: full'}</button><button onClick={createNew}>+ New quest</button></section>
    <div className="layout"><section className="mainPanel">{workspace}</section><QuestInspector quest={selected} baselineQuest={selected?.QuestID == null ? null : baselineById.get(String(selected.QuestID))} steamItems={steamItems} issues={issues} onPatch={patchQuest} onAdvanced={()=>selected && setEditing(selected)} /></div>{editing&&<EditorModal quest={editing} steamItems={steamItems} onClose={()=>setEditing(null)} onSave={saveQuest}/>} {showSaveInfo&&<SaveInfoOverlay fileName={fileName} sourceBaseName={sourceBaseName} savedAt={lastSavedAt} backups={localBackups} onCreateBackup={createLocalBackup} onRestoreBackup={restoreLocalBackup} onClose={()=>setShowSaveInfo(false)}/>}</main>;
}

createRoot(document.getElementById('root')).render(<App/>);
