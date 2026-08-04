import { buildQuestGraph, newQuestTemplate, parseColorTags, renderTaggedTextHtml, stripTags, questSeriesKey, partNumber, questCategoryPrefix, questGroup, parseQuestCategoryDisplayName, composeQuestCategoryDisplayName } from './quest-utils.mjs';

function assert(cond, msg) { if (!cond) throw new Error(msg); }

const sample = '<color=#eb8c34>Halloween$</color><color=orange>Halloween:</color> Boss';
const tokens = parseColorTags(sample);
assert(tokens.filter(t => t.type === 'tag').length === 4, 'should tokenize color tags');
assert(stripTags(sample) === 'Halloween$Halloween: Boss', 'should strip tags');
assert(!renderTaggedTextHtml(sample).includes('<color='), 'rendered preview should not show literal color tags');
assert(renderTaggedTextHtml(sample).includes('style="color:#eb8c34"'), 'should render colored spans');

assert(partNumber({ QuestDisplayName: 'Boss: Ace of Spade - Part 2' }) === 2, 'part number');
assert(questSeriesKey({ QuestDisplayName: '<color=#c70000>Boss$</color><color=#c70000>Boss: </color>Ace of Spade - Part 1' }).includes('ace of spade'), 'series from name');
const huntCategoryName = '<color=#c21d33>Hunt$</color><color=#c21d33>Hunt: </color>Wolf Trouble - Part 1';
const huntCategory = questCategoryPrefix({ QuestDisplayName: huntCategoryName });
assert(huntCategory?.name === 'Hunt' && huntCategory?.hex.toLowerCase() === 'c21d33', 'XDQuest category prefix parses exact leading hex color dollar tag');
assert(questGroup({ QuestDisplayName: huntCategoryName }) === 'Hunt', 'XDQuest category prefix drives quest group');
assert(questCategoryPrefix({ QuestDisplayName: '<color=orange>Hunt$</color><color=orange>Hunt: </color>Wolf Trouble - Part 1' }) === null, 'XDQuest category prefix requires plugin-compatible hex color tag');
assert(questCategoryPrefix({ QuestDisplayName: '<color=#c21d33>Hunt</color><color=#c21d33>Hunt: </color>Wolf Trouble - Part 1' }) === null, 'XDQuest category prefix requires dollar marker');
assert(questCategoryPrefix({ QuestDisplayName: 'Intro <color=#c21d33>Hunt$</color> Wolf Trouble' }) === null, 'XDQuest category prefix must be the first token');
const parsedSkillCategory = parseQuestCategoryDisplayName('<color=#ea42ad>Skill$</color><color=#ea42ad>Elevator: </color>The Price of Genius - Part 1');
assert(parsedSkillCategory.category === 'Skill' && parsedSkillCategory.lineLabel === 'Elevator' && parsedSkillCategory.title === 'The Price of Genius - Part 1', 'category helper parses separate category and line label');
assert(composeQuestCategoryDisplayName(parsedSkillCategory) === '<color=#ea42ad>Skill$</color><color=#ea42ad>Elevator: </color>The Price of Genius - Part 1', 'category helper composes plugin-compatible display name');
const parsedNamedLineColor = parseQuestCategoryDisplayName('<color=#eb8c34>Halloween$</color><color=orange>Halloween:</color> Not Halloween!: Brainstorm');
assert(parsedNamedLineColor.lineColor === 'orange' && composeQuestCategoryDisplayName(parsedNamedLineColor).includes('<color=orange>Halloween: </color>'), 'category helper preserves named line colors');
const editedSidequestName = '<color=#f59e0b>Boss$</color><color=#f59e0b>Boss: </color>Sidequest from CubeBuild: Part 1 – Block Party Gone Wrong';
assert(stripTags(editedSidequestName).includes('Boss: Sidequest from CubeBuild'), 'edited Boss sidequest title strips safely');
assert(renderTaggedTextHtml(editedSidequestName).includes('Boss: '), 'edited Boss sidequest title renders safely');
assert(questSeriesKey({ QuestDisplayName: editedSidequestName }).includes('sidequest from cubebuild'), 'edited Boss sidequest series parses safely');
const intermediateName = '<color=#f59e0b>Boss$</color><color=#f59e0b>Boss: </color>Sidequest from <color=#oops CubeBuild';
assert(renderTaggedTextHtml(intermediateName).includes('&lt;color=#oops'), 'in-progress/broken color markup renders as escaped text');
assert(questSeriesKey({ QuestDisplayName: intermediateName }).includes('sidequest'), 'in-progress/broken color markup does not break series parsing');

const graph = buildQuestGraph([
  { QuestID: 1, QuestDisplayName: '<color=#c70000>Boss$</color><color=#c70000>Boss: </color>Ace of Spade - Part 1', QuestPermission: '' },
  { QuestID: 2, QuestDisplayName: '<color=#c70000>Boss$</color><color=#c70000>Boss: </color>Ace of Spade - Part 2', QuestPermission: 'aceofspade' },
  { QuestID: 3, QuestDisplayName: '<color=orange>Halloween$</color><color=orange>Halloween:</color> B' },
  {
    QuestID: 43703,
    QuestDisplayName: '<color=#ea42ad>Skill$</color><color=#ea42ad>Elevator: </color>The Price of Genius - Part 1',
    QuestPermission: '',
    PrizeList: [{ PrizeCommand: 'o.grant user %STEAMID% XDQuest.elevator-part2' }]
  },
  {
    QuestID: 36041,
    QuestDisplayName: '<color=#ea42ad>Skill$</color><color=#ea42ad>Elevator: </color>The Scrap Shaker 9000 - Part 2',
    QuestPermission: 'elevator-part2'
  },
  {
    QuestID: 96423,
    QuestDisplayName: '<color=#dc2626>Raid$</color><color=#dc2626>Raid: </color>Breach and clear - Easy',
    QuestPermission: '',
    PrizeList: [{ PrizeCommand: 'grantperm %STEAMID% XDQuest.raid_medium 20d' }]
  },
  {
    QuestID: 16601,
    QuestDisplayName: '<color=#dc2626>Raid$</color><color=#dc2626>Raid: </color>Breach and clear - Medium',
    QuestPermission: 'raid_medium'
  },
]);
assert(graph.nodes.length === 7, 'nodes');
assert(graph.links.some(l => l.source === '1' && l.target === '2' && l.reason === 'name-part'), 'part chain link');
assert(graph.links.some(l => l.source === '43703' && l.target === '36041' && l.reason === 'permission-grant'), 'permission grant chain link');
assert(graph.links.some(l => l.source === '96423' && l.target === '16601' && l.reason === 'permission-grant'), 'grantperm permission grant chain link');

const repeatLoopGraph = buildQuestGraph([
  {
    QuestID: 3401,
    QuestDisplayName: '<color=#60a5fa>Event$</color><color=#60a5fa>Event: </color>Bottled Mystery - Part 1',
    QuestPermission: '',
    IsRepeatable: false,
    PrizeList: [{ PrizeCommand: 'grantperm %STEAMID% XDQuest.bottle_part_2 20d' }]
  },
  {
    QuestID: 12122,
    QuestDisplayName: '<color=#60a5fa>Event$</color><color=#60a5fa>Event: </color>Bottled Mystery - Part 1.2',
    QuestPermission: 'bottle_part_1',
    IsRepeatable: true,
    PrizeList: [{ PrizeCommand: 'grantperm %STEAMID% XDQuest.bottle_part_2 20d' }]
  },
  {
    QuestID: 72253,
    QuestDisplayName: '<color=#60a5fa>Event$</color><color=#60a5fa>Event: </color>Bottled Mystery - Part 2',
    QuestPermission: 'bottle_part_2',
    IsRepeatable: true
  },
  {
    QuestID: 61036,
    QuestDisplayName: '<color=#60a5fa>Event$</color><color=#60a5fa>Event: </color>Bottled Mystery - Part 6',
    QuestPermission: 'bottle_part_6',
    IsRepeatable: true,
    PrizeList: [{ PrizeCommand: 'grantperm %STEAMID% XDQuest.bottle_part_1 20d' }]
  },
]);
assert(repeatLoopGraph.links.some(l => l.source === '3401' && l.target === '72253' && l.reason === 'permission-grant'), 'one-time starter should explicitly unlock repeatable part 2 by permission grant');
assert(repeatLoopGraph.links.some(l => l.source === '61036' && l.target === '12122' && l.reason === 'permission-grant'), 'repeatable final quest should loop back to repeatable part 1.2 by permission grant');
assert(!repeatLoopGraph.links.some(l => l.source === '3401' && l.target === '12122'), 'one-time starter must not name-link into repeatable subloop part 1.2');

const q = newQuestTemplate([{ QuestID: 7 }]);
assert(q.QuestID === 8, 'new id increments');
console.log('quest-utils tests passed');
