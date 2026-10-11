"use strict";

const RegionGen = (typeof require !== "undefined")
  ? require("./generate.js")
  : (typeof window !== "undefined" ? window.RegionGen : null);

// The gate book is 888 words, read from the spec when that list is written.
// A name is one, two, or three distinct words the gate holds. Order does not matter.
const GATE_BOOK_LEN = 888;

function parseWordBook(text) {
  if (!text) return [];
  const blocks = String(text).match(/```[a-z]*\n[\s\S]*?```/gi) || [];
  for (const block of blocks) {
    const body = block.replace(/```[a-z]*\n|```/gi, "");
    const words = body.split(/\s+/).map((word) => word.trim().toLowerCase()).filter(Boolean);
    if (words.length === GATE_BOOK_LEN && words.every((word) => /^[a-z][a-z'-]*$/.test(word))) return words;
  }
  return [];
}

function loadWordBook() {
  if (typeof require === "undefined") return [];
  try {
    const fs = require("fs");
    const path = require("path");
    const file = path.join(__dirname, "..", "procedural-generation.md");
    return parseWordBook(fs.readFileSync(file, "utf8"));
  } catch (err) {
    return [];
  }
}

let WORD_BOOK = loadWordBook();

function setWordBook(text) {
  WORD_BOOK = parseWordBook(text);
  return WORD_BOOK.length;
}

function portalWeight(indexes) {
  const sorted = [...new Set(indexes)].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const c2 = (n) => (n * (n - 1)) / 2;
  const c3 = (n) => (n * (n - 1) * (n - 2)) / 6;
  if (sorted.length === 2) {
    const a = sorted[0];
    const b = sorted[1];
    return 888 + (a * (1775 - a)) / 2 + (b - a - 1);
  }
  const a = sorted[0];
  const b = sorted[1];
  const c = sorted[2];
  const m = 887 - a;
  const p = b - a - 1;
  const q = c - a - 1;
  return (
    888
    + c2(888)
    + (c3(888) - c3(888 - a))
    + (p * (2 * m - 1 - p)) / 2
    + (q - p - 1)
  );
}

function nameWeight(i, j, k) {
  return portalWeight([i, j, k]);
}

function weightDigits(n) {
  return String(n).padStart(9, "0");
}

// Playable page for Jay. One clock, 250ms ticks, arena plus the hamlet.
// Systems in this file: grid, combat, target table, chi, crafting, speech,
// embody, tutorial, framework hooks. World edits (square sentences, edges,
// crafted items, chi) live on the fight object and last for this session only.
// Nothing is saved.
// Chi is the material. There is no matter resource.
// Embody is stagehand work: the NPC moves and speaks. It does not spend chi
// through describe, reshape, open, or close. A fight while embodied uses that
// NPC's chi. release does not move chi.

const TICK_MS = 250;
const THREAT = 2;
const REACH = 2;
const WINDOW = 4;
const SIGHT = 5;
const STAMINA_MAX = 100;
const COST_DODGE = 10;
const COST_STEP = 15;
const COST_ROLL = 20;
const BLOCK_HIT = 25;
const DRIFT = 5;
const TELEGRAPH = "The spear thrust reaches straight ahead.";
const ARENA_X = 4;
const ARENA_Y = 6;
const RESPAWN = { x: 0, y: 6 };
const LURKER_HOME = { x: 2, y: 2 };
const LURKER_RESPAWN = { x: 4, y: 0 };

const DIRS = {
  N: [0, -1],
  S: [0, 1],
  E: [1, 0],
  W: [-1, 0],
  NE: [1, -1],
  NW: [-1, -1],
  SE: [1, 1],
  SW: [-1, 1],
};

const DIR_ALIAS = {
  n: "N", north: "N", s: "S", south: "S", e: "E", east: "E", w: "W", west: "W",
  ne: "NE", northeast: "NE", nw: "NW", northwest: "NW",
  se: "SE", southeast: "SE", sw: "SW", southwest: "SW",
};

const DIR_WORD = {
  N: "north", S: "south", E: "east", W: "west",
  NE: "northeast", NW: "northwest", SE: "southeast", SW: "southwest",
};

const NEG_WORDS = [[-30, "unsteady"], [-60, "faltering"], [-90, "collapsing"], [-100, "broken"]];
const POS_WORDS = [[30, "pressing"], [60, "flowing"], [90, "overwhelming"], [100, "legendary"]];

const BANNED_AT_ZERO = new Set(["dodge", "block", "thrust", "roll", "feint", "interrupt", "riposte"]);
const ATTACKS = new Set(["thrust", "feint", "interrupt"]);

const COMMANDS = [
  "look",
  "guard",
  "thrust",
  "dodge",
  "block",
  "step <N|S|E|W|NE|NW|SE|SW>",
  "lock <name>",
  "targets",
  "add <name>",
  "drop <name>",
  "priority [swinging|nearest|weakest]",
  "focus [name]",
  "auto [on|off]",
  "abort",
  "shove",
  "swap",
  "execute",
  "mercy",
  "clear",
  "say <text>",
  "talk <text>",
  "tell <name> <text>",
  "who",
  "name <text>",
  "describe <text>",
  "look me",
  "score (sc)",
  "n s e w ne nw se sw",
  "inventory (i, inv)",
  "wield <spear|sword|staff>",
  "gather",
  "drink",
  "routine [word]",
  "levers",
  "talk <name>",
  "help (?, commands, cmds)",
  "help <topic>",
  "tutorial",
  "embody <name>",
  "release",
  "chi",
  "craft [draught|token|brace]",
  "emote <text>",
  "pose [text|clear]",
  "describe here <text>",
  "reshape <dir> <open|closed>",
  "open <dir>",
  "close <dir>",
  "admin (adm) <name>",
  "unadmin <name>",
  "mute <name>",
  "unmute <name>",
  "mutes",
  "framework",
  "walk [place|number]",
  "path [place|number]",
  "sprint <dir>",
  "climb",
  "raise [stamina|bearing|hand]",
  "rest",
  "portal [word ...]",
  "set",
  "hub",
  "seeds",
  "quests",
  "search",
  "break <relic>",
  "combine <a> <b>",
  "forge",
  "fletch",
  "cook",
  "brew",
  "skills",
  "known",
  "read <book>",
  "tame",
  "mount",
  "ride <dir>",
  "dismount",
  "survey",
  "map",
  "time",
  "party",
  "keyword [word]",
  "bind",
  "list",
  "buy <piece>",
  "sell <piece>",
  "gold",
  "trade <name>",
  "eat",
];

const FRAMEWORK = [
  "kick",
  "ban",
  "unban",
  "login",
  "connect",
  "save",
  "areas (area)",
  "channel (chan)",
];

const HOOKS = {
  kick: { as: "kick", admin: true },
  ban: { as: "ban", admin: true },
  unban: { as: "unban", admin: true },
  login: { as: "login", admin: false },
  connect: { as: "connect", admin: false },
  save: { as: "save", admin: false },
  areas: { as: "areas", admin: false },
  area: { as: "areas", admin: false },
  channel: { as: "channel", admin: false },
  chan: { as: "channel", admin: false },
};

// Framework placeholder. The line is the whole effect. save and areas name
// the future shared world and still change nothing in this session.
const SHARED_LATER = "It will keep describe, reshape, and crafted changes for everyone.";

function hookNote(name) {
  const pending = `Accepted. ${name} is not built yet.`;
  if (name === "save" || name === "areas") return `${pending} ${SHARED_LATER}`;
  return pending;
}

// Chi costs and kill bounties. Mercy pays nothing. A kill pays chi only.
const CHI_DESCRIBE = 2;
const CHI_EDGE = 5;
const BOUNTY = { Lurker: 20, Hound: 30, Wisp: 40 };
const RECIPES = {
  draught: { chi: 2, yarrow: 1, shard: 0 },
  token: { chi: 3, yarrow: 0, shard: 0 },
  brace: { chi: 5, yarrow: 0, shard: 1 },
};

const COMBINE = new Map([
  ["water+yarrow", "tincture"],
  ["chi+tincture", "oil"],
  ["chi+wood", "charcoal"],
  ["ore+salt", "flux"],
  ["salt+water", "brine"],
  ["charcoal+oil", "dark oil"],
  ["dark oil+flux", "white metal"],
  ["brine+white metal", "salt metal"],
  ["chi+salt metal", "stone"],
  ["charcoal+salt", "black salt"],
  ["ash+water", "grey wash"],
  ["ash+brine", "bitter salt"],
  ["chi+setting", "glass"],
  ["setting+splinter", "graver"],
  ["hide+salt", "cured hide"],
  ["thyme+yarrow", "bundle"],
  ["thyme+water", "wash"],
]);

const FORGE = [
  { name: "ore", needs: [["ore", 1], ["chi", 2]], result: "stock", rank: 0 },
  { name: "weapon", needs: [["stock", 1], ["chi", 3]], result: "ordinary sword", rank: 1 },
  { name: "armor", needs: [["stock", 1], ["chi", 3]], result: "ordinary armor", rank: 1 },
  { name: "weapon oil", needs: [["ordinary sword", 1], ["oil", 1], ["chi", 4]], result: "magic keen sword", rank: 2, tool: "graver" },
  { name: "armor oil", needs: [["ordinary armor", 1], ["oil", 1], ["chi", 4]], result: "magic stout armor", rank: 2, tool: "graver" },
  { name: "weapon flux", needs: [["magic keen sword", 1], ["flux", 1], ["chi", 5]], result: "rare bright sword", rank: 4, tool: "graver" },
  { name: "armor flux", needs: [["magic stout armor", 1], ["flux", 1], ["chi", 5]], result: "rare grim armor", rank: 4, tool: "graver" },
];

const FLETCH = [
  { name: "shaft", needs: [["wood", 1]], result: "shaft", rank: 0 },
  { name: "point", alt: ["fang", "splinter"], result: "point", rank: 0 },
  { name: "string", needs: [["hide", 1]], result: "string", rank: 0 },
  { name: "arrow", needs: [["shaft", 1], ["feather", 1], ["point", 1]], result: "arrows", count: 4, rank: 0 },
  { name: "bow", needs: [["shaft", 1], ["string", 1]], result: "bow", rank: 3 },
];

const COOK = [
  { name: "broth", needs: [["water", 1], ["thyme", 1]], result: "broth", stamina: 25, rank: 0 },
  { name: "meat", needs: [["hide", 1], ["salt", 1]], result: "salt meat", stamina: 35, rank: 0 },
  { name: "crumb", needs: [["yarrow", 1], ["salt", 1]], result: "crumb", stamina: 15, rank: 0 },
  { name: "stew", needs: [["salt meat", 1], ["thyme", 1]], result: "stew", stamina: 50, rank: 1 },
  { name: "supper", needs: [["stew", 1], ["crumb", 1]], result: "supper", stamina: 70, rank: 3 },
];

const BREW = [
  { name: "draught", needs: [["yarrow", 1], ["salt", 1]], result: "draught", rank: 0 },
  { name: "beer", needs: [["water", 1], ["thyme", 1]], result: "beer", rank: 0 },
  { name: "philter", needs: [["thyme", 1], ["salt", 1]], result: "philter", rank: 1 },
  { name: "dark", needs: [["beer", 1], ["wood", 1]], result: "dark beer", rank: 2 },
];

const FOLIO_PAGE = `A word is what a mouth can carry. The weight under the word is the
name that does not change. Speak oak at the gate, or speak some other
word that weighs the same, and the land that opens is one land. People
trade the word. The gate keeps the weight.

Chi can rewrite a use-name. A room will answer to new words, and a
thing on a table will answer to new words. The weight does not move.
When the land is built again, it is built from the weight.

A room has a number. The number is that room's name. Walk the number
and the step can find the room. The word you prefer for it is only
how you speak. This page does not keep a list of lands.`;

const SCRAP_PAGE = `Ore at a forge, and chi, becomes stock. Ore met with salt becomes flux.
Yarrow left in water becomes a tincture. A tincture met with chi becomes
oil. The stone is late. It drinks chi. It is not sold from a counter.`;
const SHARD_NODES = new Set(["5,31", "6,30"]);
const FILLED_SQUARES = new Set(["5,33"]);
const SIGN_AT = { x: 5, y: 32 };
const STONE_PLACE = "yard";

const HELP_INDEX = "Commands are listed beside the grid. tutorial shows the current step. help <topic>: move, fight, chi, craft, speak, embody, tutorial, framework, walk, artifice, quests. embody, release, chi, craft, emote, pose, say with /manner, describe here, reshape. walk and path use room names and room numbers.";

const HELP_TOPICS = {
  move: "n s e w, step, and walk do not spend stamina. sprint spends stamina and moves farther. dodge, roll, and climb spend stamina. climb changes layer. At 0 stamina a climb drops you and costs momentum. exits lists open directions. walk <place> or walk <number> follows open edges, one step a tick. A typed command cancels it. path prints the steps and does not move. walk with no place lists names and numbers. reshape, open, and close change one edge for 5 chi.",
  walk: "walk <place> or walk <number> takes open edges, one step a tick. path <place> prints those steps and does not move. A typed command cancels a walk. walk alone lists the names and numbers on this map. A number from the other map is not a destination. walk does not cross a portal.",
  artifice: "Find a relic, break it, then spend the parts with chi. break spends no chi. Shard and residue are not a substitute for a broken relic.",
  quests: "quests lists what you have accepted. Nothing is accepted until the quest words are in the spec.",
  portal: "A name is one to three words the gate holds.\nEach name is one land.",
  fight: "targets lists name, aggro or added, and distance. add and drop change added rows. An aggro row drops when that body is dead, pacified, or out of sight, and drop fails while they are still a threat. priority starts as swinging, then nearest. auto starts on and attacks the top row. focus pins a row. A telegraph aimed at you outranks that attack while guard is on. thrust, dodge, block, abort, shove, swap, lock, roll, feint, interrupt. execute is a kill. mercy is not.",
  chi: "Each body starts with 10 chi. It does not return on its own. chi shows the balance. score shows momentum and chi as separate numbers. describe here costs 2. describe <item> <text> costs 2. open, close, and reshape cost 5. A kill pays lurker 20, hound 30, wisp 40. Unspent chi drops on the death square. get chi, or stand there, takes it back.",
  craft: "forge, fletch, cook, brew, and combine are the recipes. combine <a> <b> works anywhere. forge is in the market. fletch is in the yard. cook needs a hearth. brew needs a still. skills shows the six ranks. known shows what you have made. An unlisted pair makes nothing.",
  speak: "say <text> prints Name says, \"text\". say <text> / <manner> prints Name says <manner>, \"text\". emote <text> and : <text> print Name <text>. pose <text> stores a line, pose repeats it, pose clear clears it. A muted body is refused and nobody else hears it.",
  tutorial: "tutorial shows the current step and the one command to try. Typing it again repeats the hint. The area is west of the arena. You can leave and come back. Progress stays for the session.",
  framework: `kick, ban, unban, login, connect, save, areas, and channel are accepted and not built. area and chan use those same lines. They change nothing. ${SHARED_LATER}`,
};

const EXIT_ORDER = ["n", "e", "s", "w", "ne", "nw", "se", "sw"];
const SWINGS = new Set(["thrust", "arc", "cleave", "sweep", "burst"]);
// Grid. Arena is x 0–4, y 0–6. Hamlet is y >= 30. Tutorial is x < 0.
// A square's sentence can be rewritten for this session. Closed edges are
// stored on the fight, not on the map, so a new fight starts open.
const FLOOR = new Map();
const YARROW = new Set();

// Square identity. Edges, stains, and sentences all key off this string.
function cellKey(x, y) {
  return `${x},${y}`;
}

// A square exists only if it is in FLOOR. Missing squares are not exits.
function addSquare(x, y, place, sentence) {
  FLOOR.set(cellKey(x, y), { x, y, place, sentence });
}

for (let y = 0; y <= ARENA_Y; y += 1) {
  for (let x = 0; x <= ARENA_X; x += 1) {
    addSquare(x, y, "arena", "Open sand. The lane is south of the middle square.");
  }
}
for (let x = 0; x <= 8; x += 1) {
  addSquare(x, 30, "lane", x === 2
    ? "Lane stones. North returns to the arena."
    : "Lane stones.");
}
addSquare(1, 31, "cottage", "The cottage door.");
for (const [x, y] of [[0, 32], [1, 32], [2, 32], [0, 33], [1, 33], [2, 33]]) {
  addSquare(x, y, "cottage", "A cottage room. The door is north.");
}
for (const [x, y] of [[4, 31], [5, 31], [4, 32], [5, 32], [4, 33]]) {
  addSquare(x, y, "yard", "The practice yard.");
}
addSquare(4, 31, "yard", "A stone stands in the practice yard.");
addSquare(5, 32, "yard", "A sign stands here.");
addSquare(5, 33, "yard", "The post fills this square.");
FLOOR.delete(cellKey(5, 33));
addSquare(3, 31, "yarrow patch", "Yarrow grows on this square.");
YARROW.add(cellKey(3, 31));
for (const [x, y] of [[-1, 3], [-1, 4], [-1, 5], [-2, 3], [-2, 4], [-2, 5]]) {
  addSquare(x, y, "tutorial", "");
}
// Lower ward rows R G M sit north of the lane. L is y 30. C D E are y 31–33.
for (let x = 0; x <= 8; x += 1) {
  if (!FLOOR.has(cellKey(x, 27))) addSquare(x, 27, "briar", "Briar. The air does not move.");
  if (!FLOOR.has(cellKey(x, 28))) {
    const garden = x === 2 || x === 8;
    addSquare(x, 28, garden ? "garden" : "green", garden
      ? "Yarrow grows in the quiet garden."
      : "Green beside the garden. The ward is quiet.");
  }
  if (!FLOOR.has(cellKey(x, 29))) addSquare(x, 29, "meadow", "Meadow above the lane.");
  for (let y = 31; y <= 33; y += 1) {
    if (!FLOOR.has(cellKey(x, y)) && !(x === 6 && y === 33)) {
      addSquare(x, y, "ward", "The lower ward.");
    }
  }
}
YARROW.add(cellKey(2, 28));
YARROW.add(cellKey(8, 28));
// The practice post fills E6. The number stays 60. The square is not entered.
FLOOR.delete(cellKey(6, 33));

const UPPER = {
  "10,10": { n: 101, name: "court", sentence: "The court is quiet. A font stands here, and the gate waits." },
  "11,10": { n: 102, name: "hall", sentence: "The hall keeps a long quiet. Candle smoke stays in the beams." },
  "12,10": { n: 103, name: "market", sentence: "The market keeps a counter. Nothing here is sold for chi." },
  "11,11": { n: 104, name: "gallery", sentence: "The gallery is a cold walk of hung pieces." },
  "10,11": { n: 105, name: "rampart", sentence: "The rampart looks over the cloud. The ward is below." },
  "11,9": { n: 106, name: "solar", sentence: "The solar is small. A candle burns." },
  "12,11": { n: 107, name: "archive", sentence: "The archive keeps one housed thing." },
  "9,11": { n: 108, name: "chapel", sentence: "A chapel. Candles burn. A bell hangs. A book lies closed." },
};
for (const [key, room] of Object.entries(UPPER)) {
  const [x, y] = key.split(",").map(Number);
  addSquare(x, y, room.name, room.sentence);
}
const COURT = { x: 10, y: 10 };
const L4 = { x: 4, y: 30 };
const SECRET_EDGES = [
  [{ x: 11, y: 10 }, { x: 11, y: 9 }],
  [{ x: 11, y: 11 }, { x: 12, y: 11 }],
  [{ x: 10, y: 11 }, { x: 9, y: 11 }],
];

// Left of a facing, used by wide weapon shapes.
function leftOf(dx, dy) {
  return [dy, -dx];
}

// Right of a facing, the other side of a wide shape.
function rightOf(dx, dy) {
  return [-dy, dx];
}

// Momentum stops at -100 and 100. Those two values end the exchange.
function clamp(n) {
  return Math.max(-100, Math.min(100, n));
}

// Threat and sight use king-move distance, not a straight line.
function fightChebyshev(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

// Square equality. Object identity is not the test.
function same(a, b) {
  return a.x === b.x && a.y === b.y;
}

// A whiff walks momentum 5 toward 0. At 0 it does not drift.
function driftDelta(n) {
  if (n > 0) return -Math.min(DRIFT, n);
  if (n < 0) return Math.min(DRIFT, -n);
  return 0;
}

// Breakpoint words. The number stays out of the log. Only the word prints.
function crossed(old, neu) {
  const words = [];
  if (neu < old) {
    for (const [threshold, word] of NEG_WORDS) {
      if (neu <= threshold && threshold < old) words.push(word);
    }
  } else if (neu > old) {
    for (const [threshold, word] of POS_WORDS) {
      if (old < threshold && threshold <= neu) words.push(word);
    }
  }
  return words;
}

// Eight facings. A lock or a named aim snaps to the nearest one.
function snapFacing(dx, dy) {
  if (dx === 0 && dy === 0) return "S";
  const angle = Math.atan2(dy, dx);
  let best = "S";
  let bestDistance = 99;
  for (const name of Object.keys(DIRS)) {
    const [sx, sy] = DIRS[name];
    let distance = Math.abs(angle - Math.atan2(sy, sx));
    if (distance > Math.PI) distance = 2 * Math.PI - distance;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = name;
    }
  }
  return best;
}

// Two squares straight ahead. Dodge and block only answer what is on this ray.
function rayOf(pos, facing) {
  const [dx, dy] = DIRS[facing];
  const squares = [];
  for (let i = 1; i <= REACH; i += 1) {
    squares.push({ x: pos.x + dx * i, y: pos.y + dy * i });
  }
  return squares;
}

// Every body starts with 10 chi, no shards, and no pose. Chi does not regen.
function makeFighter(name, x, y, facing, lock) {
  return {
    name,
    pos: { x, y },
    stamina: STAMINA_MAX,
    momentum: 0,
    lock,
    facing,
    blocking: false,
    pacified: false,
    dead: false,
    allies: new Set(),
    reps: 0,
    gear: ["spear"],
    mercyTick: null,
    skipNext: false,
    admin: false,
    muted: false,
    privateNote: "",
    chi: 10,
    shards: 0,
    draughts: 0,
    pose: "",
    itemLines: {},
  };
}

// Guard reads only the latest printed line. The keyword defaults to thrust.
function guardDecision(lines, keyword) {
  const word = keyword || "thrust";
  const latest = lines.length ? lines[lines.length - 1] : "";
  if (typeof latest === "string" && latest.includes(word)) return "dodge";
  return "hold";
}

// Combat clock. Pending swings land WINDOW ticks after they are declared.
// A practice swing is marked so the lurker's leash does not cancel it and
// the practice post does not die. Quiet ticks print nothing.
class Fight {
  // One session. Chi, closed edges, square sentences, and stains start empty
  // of edits. Jay is the admin. Guard starts on. The practice post is a body
  // that does not fight, take momentum, or die.
  constructor() {
    this.tick = 0;
    this.jay = makeFighter("Jay", 2, 4, "N", "Lurker");
    this.jay.admin = true;
    this.jay.called = "Jay";
    this.jay.blurb = "";
    this.jay.holding = "spear";
    this.jay.carried = ["sword", "staff"];
    this.jay.weaponReps = { spear: 0, sword: 0, staff: 0 };
    this.jay.yarrow = 0;
    this.jay.bleed = null;
    this.guardWord = "thrust";
    this.lastLevers = null;
    this.hamletOn = false;
    this.verbose = false;
    this.lurker = makeFighter("Lurker", 2, 2, "S", "Jay");
    this.lurker.landed = 0;
    this.roster = [this.jay, this.lurker];
    this.pending = [];
    this.telegraphs = [];
    this.corpses = [];
    this.log = [];
    this.queue = [];
    this.note = "Guard is on.";
    this.guardOn = true;
    // Auto-attack reads the target table, not a single lock. It starts on.
    this.autoOn = true;
    this.priorityKeys = ["swinging", "nearest"];
    this.focusName = "";
    this.targetRows = new Map();
    this.finisher = null;
    this.exchangeStopped = false;
    this.outsideRun = 0;
    this.seq = 0;
    this.acted = new Set();
    this.justAppeared = new Set();
    this.tutorialStep = 1;
    this.tutorialDescribed = false;
    this.tutorialGuardHint = false;
    this.practiceSent = false;
    this.suppressTutorial = false;
    this.embodied = null;
    this.closedEdges = new Set();
    this.squareText = new Map();
    this.stains = new Map();
    const post = makeFighter("Post", -2, 4, "E", null);
    post.practice = true;
    post.gear = [];
    this.roster.push(post);
    this.post = post;
    this.scoredDodge = new Set();
    this.pendingStop = false;
    this.pendingWinner = null;
    this.lastFeed = [];
    this.moved = true;
    this.zone = "castle";
    this.land = null;
    this.seeds = [];
    this.patches = new Map();
    this.secrets = { solar: false, archive: false, chapel: false };
    this.castleRelics = { "11,9": "candle", "12,11": "relic", "9,11": "book" };
    this.quests = [];
    this.questsDone = [];
    this.walkPlan = null;
    this.stats = { stamina: 0, bearing: 0, hand: 0 };
    this.skills = { forging: 0, fletching: 0, artifice: 0, alchemy: 0, cooking: 0, brewing: 0 };
    this.bag = {};
    this.known = [];
    this.artificeMade = new Set();
    this.folioHere = true;
    this.beerHide = false;
    this.philter = 0;
    this.parts = { ash: 0, setting: 0, splinter: 0 };
    this.gold = 0;
    this.food = 0;
    this.arrows = 0;
    this.potions = 0;
    this.beer = 0;
    this.horse = null;
    this.wildHorse = null;
    this.stone = false;
    this.archiveStone = true;
    this.bindUsed = false;
    this.boundEdit = null;
    this.swingWord = "";
    this.wearing = "";
    this.knownCraft = [];
    this.roomNames = new Map();
    this.byWeight = new Map();
    this.gatePieces = [];
    this.foundPiece = null;
    this.refreshGateHeld();
    this.layer = "surface";
    this.hillRoom = 0;
    this.gardens = new Set([cellKey(2, 28), cellKey(8, 28)]);
    this.merchant = [
      { name: "weapon", price: 16, kind: "gear", tier: "ordinary", slot: "weapon" },
      { name: "armor", price: 16, kind: "gear", tier: "ordinary", slot: "armor" },
      { name: "food", price: 4, kind: "food" },
      { name: "arrows", price: 8, kind: "arrows" },
      { name: "stabling", price: 10, kind: "stable" },
      { name: "stock", price: 12, kind: "bag" },
      { name: "salt meat", price: 6, kind: "bag" },
      { name: "stew", price: 14, kind: "bag" },
    ];
    this.stock = this.merchant.map((item) => ({ ...item }));
    for (const [a, b] of SECRET_EDGES) this.closedEdges.add(this.edgeKey(a, b));
  }

  // The playable page wakes at the court font with no arena exchange in progress.
  startInCourt() {
    this.jay.pos = { x: COURT.x, y: COURT.y };
    this.jay.lock = null;
    this.jay.momentum = 0;
    this.jay.blocking = false;
    this.lurker.pos = { x: LURKER_HOME.x, y: LURKER_HOME.y };
    this.lurker.lock = null;
    this.lurker.momentum = 0;
    this.pending = [];
    this.telegraphs = [];
    this.finisher = null;
    this.pendingStop = false;
    this.pendingWinner = null;
    this.queue = [];
    this.walkPlan = null;
    this.zone = "castle";
    this.land = null;
    this.layer = "surface";
    this.note = "Guard is on.";
  }

  refreshGateHeld() {
    this.gateHeld = new Set();
    if (WORD_BOOK.length !== GATE_BOOK_LEN) return;
    for (let i = 0; i < 9; i += 1) this.gateHeld.add(WORD_BOOK[i]);
    for (const word of this.gatePieces) this.gateHeld.add(word);
  }

  gateHeldIndexes() {
    const out = [];
    for (const word of this.gateHeld) {
      const index = WORD_BOOK.indexOf(word);
      if (index >= 0) out.push(index);
    }
    return out;
  }

  // Name lookup is case-insensitive. Unknown names are null, not an error yet.
  by(name) {
    if (!name) return null;
    const key = String(name).toLowerCase();
    return this.roster.find((fighter) => fighter.name.toLowerCase() === key) || null;
  }

  // The lines guard can see: live telegraphs only, not the whole log.
  feed() {
    return this.telegraphs.map((entry) => entry.text);
  }

  // Walkable means the square was added to FLOOR. The filled post is not. A land uses its own grid.
  inBounds(sq) {
    if (this.zone === "land") return sq.x >= 0 && sq.y >= 0 && sq.x < RegionGen.W && sq.y < RegionGen.H;
    return FLOOR.has(cellKey(sq.x, sq.y));
  }

  // Hamlet is every square at y 30 or south of it. The arena is not.
  onHamlet(sq) {
    return sq.y >= 30;
  }

  // Place record for a square, or null off the map.
  placeInfo(sq) {
    return FLOOR.get(cellKey(sq.x, sq.y)) || null;
  }

  // Short place name. Off the map the name is wilds. A land uses the field label.
  placeName(sq) {
    if (this.zone === "land" && this.land) {
      const pack = this.land.world;
      const fields = this.land.era === "earlier" ? pack.past : pack.now;
      return RegionGen.labelAt(fields, pack.sites, sq.x, sq.y);
    }
    const named = this.roomNames && this.roomNames.get(this.roomNumber(sq));
    if (named) return named;
    const info = this.placeInfo(sq);
    return info ? info.place : "wilds";
  }

  // The tutorial is the named area west of the arena, not a mode flag.
  onTutorial(sq) {
    return this.placeName(sq) === "tutorial";
  }

  // Tutorial. `tutorial` repeats the current hint and does not advance the step.
  // Progress stays for the session. The page suppresses its opening look so
  // that first look does not skip step 1.
  tutorialSentence() {
    const step = this.tutorialStep;
    if (step === 1) return "This step is look.";
    if (step === 2) return "This step is step west.";
    if (step === 3) return this.tutorialDescribed ? "This step is look me." : "This step is describe.";
    if (step === 4) return "This step is score.";
    if (step === 5) return "This step is wield sword.";
    if (step === 6) return "This step is thrust at the post.";
    if (step === 7) return this.tutorialGuardHint ? "This step is leave guard on." : "This step is routine.";
    if (step === 8) return "This step is the practice thrust.";
    if (step === 9) return "This step is drink, and the yarrow patch is south.";
    if (step === 10) return "This step is framework.";
    return "The tutorial is done.";
  }

  // The one command to try. Calling tutorial again returns this same line.
  tutorialHint() {
    const step = this.tutorialStep;
    if (step === 1) return "Step 1. look.";
    if (step === 2) return "Step 2. step w.";
    if (step === 3) return this.tutorialDescribed ? "Step 3. look me." : "Step 3. describe.";
    if (step === 4) return "Step 4. score.";
    if (step === 5) return "Step 5. wield sword.";
    if (step === 6) return "Step 6. thrust.";
    if (step === 7) return this.tutorialGuardHint ? "Step 7. Leave guard on." : "Step 7. routine.";
    if (step === 8) return "Step 8. Dodge the practice thrust.";
    if (step === 9) return "Step 9. The yarrow patch is south.";
    if (step === 10) return "Step 10. framework.";
    return "The tutorial is done.";
  }

  // Advances only from the step that was just completed. A repeated command does not skip.
  advanceTutorial(step) {
    if (this.suppressTutorial || this.tutorialStep !== step) return;
    this.tutorialStep += 1;
    if (this.tutorialStep === 8) this.practiceSent = false;
  }

  // One practice thrust from the post, and only while Jay is standing in the tutorial on step 8.
  maybePracticeTelegraph() {
    if (this.finisher || this.tutorialStep !== 8 || this.practiceSent) return;
    if (!this.onTutorial(this.jay.pos)) return;
    const post = this.by("Post");
    if (!post || post.dead) return;
    this.practiceSent = true;
    const text = "Post: The practice thrust comes straight ahead.";
    const template = [{ x: this.jay.pos.x, y: this.jay.pos.y }];
    this.declareCustom(post, "thrust", template, text, true, "spear", false);
    this.pending[this.pending.length - 1].practice = true;
  }

  // Every living body on a square. Allies may share a square. A corpse is separate.
  bodiesAt(x, y) {
    return this.roster.filter((fighter) => fighter.pos.x === x && fighter.pos.y === y);
  }

  // A corpse blocks the square for 8 ticks and has no loot.
  corpseAt(sq) {
    return this.corpses.find((corpse) => corpse.x === sq.x && corpse.y === sq.y) || null;
  }

  // True when the square exists, has no corpse, and no body other than ignoreName.
  squareFree(sq, ignoreName) {
    if (!this.inBounds(sq) || this.corpseAt(sq)) return false;
    return !this.bodiesAt(sq.x, sq.y).some((body) => body.name !== ignoreName);
  }

  // Not in the mover's ally set. The practice post is hostile, so it blocks steps.
  hostile(mover, other) {
    return !mover.allies.has(other.name);
  }

  // Closed when off the map, a corpse, or a hostile body. Allies do not block.
  blockedStep(mover, sq) {
    if (!this.inBounds(sq) || this.corpseAt(sq)) return true;
    return this.bodiesAt(sq.x, sq.y).some((body) => this.hostile(mover, body) && this.bodyOnThisMap(body));
  }

  // A declared swing that has not landed. Abort is the only way out before the window.
  lockedIn(fighter) {
    return this.pending.some((attack) => (
      !attack.resolved
      && attack.attacker === fighter.name
      && (attack.kind === "feint" || SWINGS.has(attack.kind))
    ));
  }

  // The squares a shape covers. Narrow thrust is the ray. Wide shapes include the sides.
  swingSquares(pos, facing, shaped) {
    const [dx, dy] = DIRS[facing];
    const [lx, ly] = leftOf(dx, dy);
    const [rx, ry] = rightOf(dx, dy);
    const at = (ox, oy) => ({ x: pos.x + ox, y: pos.y + oy });
    if (shaped === "arc") {
      return [at(dx, dy), at(dx + lx, dy + ly), at(dx + rx, dy + ry)];
    }
    if (shaped === "cleave") {
      return [
        at(dx, dy),
        at(dx + lx, dy + ly),
        at(dx + rx, dy + ry),
        at(dx + lx * 2, dy + ly * 2),
        at(dx + rx * 2, dy + ry * 2),
      ];
    }
    if (shaped === "sweep") return [at(lx, ly), at(rx, ry)];
    if (shaped === "burst") {
      return [at(0, 0), at(1, 0), at(-1, 0), at(0, 1), at(0, -1)];
    }
    return rayOf(pos, facing).map((sq) => ({ x: sq.x, y: sq.y }));
  }

  // One step. South from 2,6 and north from 2,30 are the lane gate, not a wall.
  stepDest(pos, facing) {
    // The lane gate. These two squares are not adjacent on the grid. A land has no gate.
    if (this.zone !== "land") {
      if (pos.x === 2 && pos.y === 6 && facing === "S") return { x: 2, y: 30 };
      if (pos.x === 2 && pos.y === 30 && facing === "N") return { x: 2, y: 6 };
    }
    const [dx, dy] = DIRS[facing];
    return { x: pos.x + dx, y: pos.y + dy };
  }

  // Open edges only, in n e s w ne nw se sw order. A closed edge, corpse, hostile, or cut corner is omitted.
  exitWords(pos) {
    const words = [];
    for (const word of EXIT_ORDER) {
      const facing = DIR_ALIAS[word];
      const dest = this.stepDest(pos, facing);
      if (this.edgeClosed(pos, dest)) continue;
      if (!this.inBounds(dest) || this.corpseAt(dest)) continue;
      if (this.bodiesAt(dest.x, dest.y).some((body) => this.hostile({ allies: this.jay.allies, name: "Jay" }, body) && body.name !== "Jay" && this.bodyOnThisMap(body))) {
        continue;
      }
      const [dx, dy] = DIRS[facing];
      if (dx && dy) {
        const sideA = { x: pos.x, y: dest.y };
        const sideB = { x: dest.x, y: pos.y };
        // A diagonal exit needs both side squares. A cut corner is not listed.
        if (!this.inBounds(sideA) || !this.inBounds(sideB)) continue;
      }
      words.push(word);
    }
    const extra = this.specialExits(pos);
    for (const edge of extra) {
      if (!this.edgeClosed(pos, edge.pos) && this.inBounds(edge.pos)) words.push(edge.dir);
    }
    return words;
  }

  // Turn to face the lock. A swing aimed at the practice post skips this.
  faceLock(fighter) {
    if (!fighter.lock) return;
    const other = this.by(fighter.lock);
    if (!other) return;
    const dx = other.pos.x - fighter.pos.x;
    const dy = other.pos.y - fighter.pos.y;
    if (dx || dy) fighter.facing = snapFacing(dx, dy);
  }

  // The attacker is on the defender's facing ray. Block and a scored dodge both need this.
  onRay(defender, attackerName) {
    this.faceLock(defender);
    const attacker = this.by(attackerName);
    if (!attacker) return false;
    return rayOf(defender.pos, defender.facing).some((sq) => same(sq, attacker.pos));
  }

  // No hostile within threat 2. The practice post does not count. Pacified bodies do not count.
  outsideAllThreat(fighter) {
    return this.roster.every((other) => {
      if (other.name === fighter.name || other.practice) return true;
      if (fighter.allies.has(other.name) || other.pacified) return true;
      return fightChebyshev(fighter.pos, other.pos) > THREAT;
    });
  }

  // Broader than fightIsLive. Any pending swing, lock, or momentum keeps the fight up.
  fightLive() {
    if (this.finisher) return true;
    if (this.pending.some((attack) => !attack.resolved)) return true;
    if (this.roster.some((fighter) => fighter.lock || fighter.momentum !== 0)) return true;
    return false;
  }

  // Append one log line. The note is separate and gets replaced.
  print(text, kind) {
    this.log.push({ tick: this.tick, text, kind });
  }

  // Remove one telegraph so guard stops seeing it.
  dropTelegraph(id) {
    this.telegraphs = this.telegraphs.filter((entry) => entry.id !== id);
  }

  // Change momentum and print a breakpoint word if a threshold is crossed. The practice post never shifts.
  shift(name, delta, source) {
    if (!delta) return;
    const fighter = this.by(name);
    // The practice post does not take momentum and cannot be the one who falls.
    if (!fighter || fighter.practice) return;
    if (delta < 0 && fighter.name === this.jay.name && (this.philter > 0 || this.armorBearing() > 0)) {
      let loss = -delta;
      const bearing = this.armorBearing();
      const floored = Math.max(loss - bearing, Math.floor(loss / 2));
      loss = floored;
      if (this.philter > 0) loss = Math.max(1, Math.floor(loss / 2));
      delta = -loss;
    }
    const old = fighter.momentum;
    const neu = clamp(old + delta);
    fighter.momentum = neu;
    for (const word of crossed(old, neu)) this.print(word, "breakpoint");
    if (neu === -100) {
      this.pendingStop = true;
      this.pendingLoser = fighter.name;
      this.pendingWinner = source;
    } else if (neu === 100) {
      this.pendingStop = true;
      if (!this.pendingWinner) this.pendingWinner = fighter.name;
    }
  }

  // Momentum hit -100 or 100. Locks clear, pending swings drop, and the winner must choose execute or mercy.
  maybeStop() {
    if (!this.pendingStop) return;
    const loserName = this.pendingLoser || null;
    const winnerName = this.pendingWinner;
    this.pendingStop = false;
    this.pendingLoser = null;
    this.pendingWinner = null;
    for (const fighter of this.roster) {
      fighter.momentum = 0;
      fighter.lock = null;
      fighter.blocking = false;
    }
    for (const attack of this.pending) {
      if (!attack.resolved) {
        attack.resolved = true;
        this.dropTelegraph(attack.id);
      }
    }
    this.telegraphs = [];
    this.exchangeStopped = true;
    this.print("The exchange stops.", "finisher");
    if (loserName) {
      const winner = winnerName && winnerName !== loserName
        ? winnerName
        : this.roster.find((fighter) => fighter.name !== loserName).name;
      this.finisher = { winner, loser: loserName };
    }
  }

  // The swing missed. Every body drifts toward 0. That can still end the exchange.
  whiff() {
    this.print("The swing whiffs.", "whiff");
    for (const fighter of this.roster) this.shift(fighter.name, driftDelta(fighter.momentum), fighter.name);
    this.maybeStop();
  }

  // Wide shapes hit every body on the template. A narrow shape hits only the first occupied square.
  victims(attack) {
    if (attack.wide) {
      const found = [];
      for (const sq of attack.template) {
        found.push(...this.bodiesAt(sq.x, sq.y).filter((body) => body.name !== attack.attacker));
      }
      return found;
    }
    for (const sq of attack.template) {
      const here = this.bodiesAt(sq.x, sq.y).filter((body) => body.name !== attack.attacker);
      if (here.length) return here;
    }
    return [];
  }

  // A block on the ray spends 25 stamina and stops the hit. At 0 the guard breaks and momentum flips.
  absorb(defender, attacker) {
    if (!defender.blocking || !this.onRay(defender, attacker.name)) return false;
    if (defender.stamina <= 0) {
      defender.blocking = false;
      return false;
    }
    defender.stamina = Math.max(0, defender.stamina - BLOCK_HIT);
    this.print(`${defender.name} blocks the hit.`, "block");
    if (defender.stamina === 0) {
      defender.blocking = false;
      this.print(`${defender.name}'s guard breaks.`, "block");
      this.shift(defender.name, -20, attacker.name);
      this.shift(attacker.name, 20, attacker.name);
    }
    return true;
  }

  // Land a swing. A scored dodge, a practice landing, and a whiff each leave before damage.
  resolve(attack) {
    if (attack.resolved) return;
    attack.resolved = true;
    this.dropTelegraph(attack.id);
    const attacker = this.by(attack.attacker);
    if (attack.kind === "feint" && attack.baitedBy) {
      this.shift(attack.attacker, 15, attack.attacker);
      this.shift(attack.baitedBy, -15, attack.attacker);
      this.maybeStop();
      return;
    }
    if (SWINGS.has(attack.kind) && attack.cancelledBy) {
      if (!this.scoredDodge.has(attack.answerKey)) {
        this.scoredDodge.add(attack.answerKey);
        this.shift(attack.cancelledBy, 10, attack.cancelledBy);
        this.shift(attack.attacker, -10, attack.cancelledBy);
        this.maybeStop();
      }
      return;
    }
    // The practice post prints one landing line and does not take damage or grant chi.
    if (attack.landLine) {
      this.print(attack.landLine, "hit");
      if (attack.attacker === "Jay") this.advanceTutorial(6);
      return;
    }
    // A practice telegraph that was not dodged still does not hit.
    if (attack.practice) return;
    if (attack.kind === "feint") {
      const blocker = this.roster.find((fighter) => (
        fighter.blocking
        && attack.template.some((sq) => same(sq, fighter.pos))
        && this.onRay(fighter, attack.attacker)
      ));
      if (blocker) {
        this.shift(blocker.name, 10, blocker.name);
        this.shift(attack.attacker, -10, blocker.name);
        this.maybeStop();
      }
      return;
    }
    const bodies = this.victims(attack);
    if (!bodies.length) {
      if (attack.rolled) return;
      if (attack.kind === "interrupt") {
        this.shift(attacker.name, -10, attacker.name);
        attacker.skipNext = true;
        this.note = `${attacker.name} loses the beat.`;
        this.maybeStop();
        return;
      }
      this.whiff();
      return;
    }
    const magA = attack.kind === "interrupt" ? 10 : 20;
    const magD = attack.kind === "interrupt" ? -10 : -20;
    let scored = false;
    for (const victim of bodies) {
      if (this.absorb(victim, attacker)) continue;
      const noun = attack.noun || "spear";
      const hitLine = attack.kind === "interrupt"
        ? `${attacker.name} interrupts.`
        : `The ${noun} hits ${victim.name}.`;
      if (!(attack.kind === "interrupt" && attack.noted)) this.print(hitLine, "hit");
      if (attack.kind === "thrust" && attacker.landed != null) {
        attacker.landed += 1;
        if (attacker.landed % 3 === 0) {
          victim.bleed = { until: this.tick + 8, source: attacker.name };
          this.print(`${victim.name} is bleeding.`, "hit");
        }
      }
      if (!scored) {
        this.shift(attacker.name, magA, attacker.name);
        scored = true;
      }
      this.shift(victim.name, magD, attacker.name);
    }
    if (scored && attacker.weaponReps && attacker.holding && SWINGS.has(attack.kind)) {
      attacker.weaponReps[attacker.holding] += 1;
    }
    this.maybeStop();
  }

  // Land swings whose window ends this tick. A finisher already in progress cancels them instead.
  resolveDue(t, kinds) {
    const due = this.pending
      .filter((attack) => !attack.resolved && attack.land === t && kinds.has(attack.kind))
      .sort((a, b) => a.id - b.id);
    for (const attack of due) {
      if (attack.resolved) continue;
      if (this.finisher) {
        attack.resolved = true;
        this.dropTelegraph(attack.id);
        continue;
      }
      this.resolve(attack);
    }
  }

  // Corpses last 8 ticks. The stain under one is separate and does not expire with it.
  expireCorpses(t) {
    const before = this.corpses.length;
    this.corpses = this.corpses.filter((corpse) => t < corpse.until);
    if (this.corpses.length !== before) this.moved = true;
  }

  // Shared refusal before a tick action. Abort is allowed while locked in. A fresh body cannot act yet.
  begin(fighter, op) {
    if (this.justAppeared.has(fighter.name)) {
      this.note = `${fighter.name} cannot act yet.`;
      return false;
    }
    if (fighter.skipNext) {
      fighter.skipNext = false;
      this.note = `${fighter.name} loses the beat.`;
      return false;
    }
    if (this.finisher) {
      this.note = "The exchange has stopped.";
      return false;
    }
    if (fighter.pacified && (op === "thrust" || op === "lock" || op === "feint" || op === "interrupt")) {
      this.note = `${fighter.name} is pacified.`;
      return false;
    }
    if (this.exchangeStopped && ATTACKS.has(op)) {
      this.note = "Lock a target to start the fight.";
      return false;
    }
    // Locked in until the swing lands or is aborted. Abort is the exception.
    if (this.lockedIn(fighter) && op !== "abort") {
      this.note = `${fighter.name} is locked in.`;
      return false;
    }
    if (fighter.stamina <= 0 && BANNED_AT_ZERO.has(op)) {
      this.note = `${fighter.name} has no stamina.`;
      return false;
    }
    if (this.acted.has(fighter.name)) {
      this.note = `${fighter.name} already acted.`;
      return false;
    }
    return true;
  }

  // The action spends the tick. Blocking ends. A second action this tick is refused.
  commit(fighter) {
    this.acted.add(fighter.name);
    fighter.blocking = false;
  }

  // Build the swing. Sword thrust becomes arc, or cleave at 3 reps. Staff thrust becomes sweep.
  declare(fighter, kind, extra) {
    // A named aim for this swing. Otherwise face the lock.
    if (extra && extra.facing) fighter.facing = extra.facing;
    else this.faceLock(fighter);
    let shaped = kind;
    let noun = "spear";
    let wide = false;
    if (kind === "thrust" && fighter.holding === "sword") {
      const reps = fighter.weaponReps ? fighter.weaponReps.sword : 0;
      shaped = reps >= 3 ? "cleave" : "arc";
      noun = "sword";
      wide = true;
    } else if (kind === "thrust" && fighter.holding === "staff") {
      shaped = "sweep";
      noun = "staff";
      wide = true;
    }
    const template = this.swingSquares(fighter.pos, fighter.facing, shaped);
    const text = shaped === "thrust" || kind === "feint"
      ? `${fighter.name}: ${TELEGRAPH}`
      : `${fighter.name}: The ${noun} ${shaped} reaches.`;
    return this.declareCustom(fighter, shaped === "thrust" || kind === "feint" ? kind : shaped, template, text, kind !== "interrupt", noun, wide);
  }

  // Queue a swing. A telegraph lands WINDOW ticks later. An interrupt lands this tick.
  declareCustom(fighter, kind, template, text, telegraph, noun, wide) {
    this.seq += 1;
    const attack = {
      id: this.seq,
      attacker: fighter.name,
      kind,
      declare: this.tick,
      land: telegraph ? this.tick + WINDOW : this.tick,
      template,
      text,
      noun: noun || "spear",
      wide: Boolean(wide),
      resolved: false,
      cancelledBy: null,
      baitedBy: null,
      answerKey: null,
      rolled: null,
    };
    this.pending.push(attack);
    if (telegraph) {
      let shown = text;
      if (this.beerHide && fighter.name !== this.bodyNow().name) {
        const word = this.swingWord || "thrust";
        shown = shown.replace(new RegExp(`\\b${word}\\b`, "i"), "").replace(/\s{2,}/g, " ").replace(" :", ":");
        this.beerHide = false;
      }
      attack.text = shown;
      this.telegraphs.push({ id: attack.id, text: shown });
      this.print(shown, "telegraph");
    }
    // An attack on the current body, or by that body, joins the target table as aggro.
    this.noteAggression(fighter, attack);
    const word = kind === "feint" ? "thrust" : kind;
    this.remember(fighter, kind, template, word, fighter.lock);
    return attack;
  }

  // Last levers, for the levers command. Not shown unless asked.
  remember(fighter, action, squares, keyword, target) {
    this.lastLevers = {
      actor: fighter.name,
      action,
      facing: fighter.facing,
      target: target || "none",
      squares: (squares || []).map((sq) => `${sq.x},${sq.y}`).join(" ") || "none",
      keyword: keyword || "none",
    };
  }

  // A dodge on the ray cancels a swing or baits a feint. Interrupts are not dodged.
  cover(dodger) {
    this.faceLock(dodger);
    const shape = rayOf(dodger.pos, dodger.facing);
    const answerKey = `${dodger.name}@${this.tick}`;
    for (const attack of this.pending) {
      if (attack.resolved || attack.attacker === dodger.name || attack.kind === "interrupt") continue;
      const attacker = this.by(attack.attacker);
      if (!shape.some((sq) => same(sq, attacker.pos))) continue;
      if (!attack.template.some((sq) => same(sq, dodger.pos))) continue;
      if (attack.kind === "feint") attack.baitedBy = dodger.name;
      else if (SWINGS.has(attack.kind)) {
        attack.cancelledBy = dodger.name;
        attack.answerKey = answerKey;
      }
    }
  }

  // Dodge costs 10 stamina. Guard's dodge prints to the log. A typed dodge stays in the note. Tutorial step 8 completes here.
  tryDodge(fighter, routine) {
    const fail = (msg) => {
      if (!routine) this.note = msg;
      return false;
    };
    if (this.justAppeared.has(fighter.name)) return fail(`${fighter.name} cannot act yet.`);
    if (fighter.skipNext) {
      fighter.skipNext = false;
      return fail(`${fighter.name} loses the beat.`);
    }
    if (this.finisher) return fail("The exchange has stopped.");
    if (this.lockedIn(fighter)) return fail(`${fighter.name} is locked in.`);
    if (fighter.stamina < COST_DODGE) return fail(`${fighter.name} has no stamina.`);
    if (this.acted.has(fighter.name)) return fail(`${fighter.name} already acted.`);
    this.commit(fighter);
    fighter.stamina -= COST_DODGE;
    this.cover(fighter);
    if (routine) this.print(`${fighter.name} dodges.`, "routine");
    else this.note = `${fighter.name} dodges.`;
    if (fighter.name === "Jay") this.advanceTutorial(8);
    return true;
  }

  // Ordinary movement is free. A closed edge, cut corner, corpse, or hostile refuses. Stepping onto your stain takes it.
  tryStep(fighter, word) {
    const lower = (word || "").toLowerCase();
    const special = this.specialStep(fighter.pos, lower);
    if (special) {
      if (!this.begin(fighter, "step")) return;
      if (this.edgeClosed(fighter.pos, special) || this.blockedStep(fighter, special)) {
        this.note = "That square is closed.";
        return;
      }
      this.commit(fighter);
      fighter.pos = { x: special.x, y: special.y };
      this.moved = true;
      this.print(`${fighter.name} steps ${lower}.`, "step");
      this.recoverStain(fighter);
      return;
    }
    const facing = DIR_ALIAS[lower];
    if (!facing) {
      this.note = "Unknown direction.";
      return;
    }
    if (!this.begin(fighter, "step")) return;
    const pay = 0;
    const [dx, dy] = DIRS[facing];
    const dest = this.stepDest(fighter.pos, facing);
    if (this.edgeClosed(fighter.pos, dest)) {
      this.note = "That square is closed.";
      return;
    }
    if (dx && dy) {
      const sideA = { x: fighter.pos.x, y: dest.y };
      const sideB = { x: dest.x, y: fighter.pos.y };
      // A diagonal needs both side squares. A cut corner is closed.
      if (!this.inBounds(sideA) || !this.inBounds(sideB)) {
        this.note = "That square is closed.";
        return;
      }
    }
    if (fighter.name === "Lurker" && dest.x === RESPAWN.x && dest.y === RESPAWN.y) {
      this.note = "The lurker cannot reach that square.";
      return;
    }
    if (this.blockedStep(fighter, dest)) {
      this.note = "That square is closed.";
      return;
    }
    this.commit(fighter);
    fighter.stamina -= pay;
    const entered = !this.onHamlet(fighter.pos) && this.onHamlet(dest);
    fighter.pos = dest;
    if (this.zone !== "land" && entered) this.ensureHamlet();
    this.moved = true;
    this.remember(fighter, "step", [dest], "", null);
    this.print(`${fighter.name} steps ${DIR_WORD[facing]}.`, "step");
    if (fighter.name === "Jay" && facing === "W" && this.placeName(dest) === "tutorial") {
      this.advanceTutorial(2);
    }
    this.recoverStain(fighter);
    if (fighter.name === "Jay" && this.verbose && !this.fightIsLive()) this.print(this.lookText(), "look");
  }

  // Needs a lock. On tutorial step 6 the swing faces the post for that action and does not clear the lock.
  tryThrust(fighter, kind) {
    if (this.castlePeace(fighter.pos)) {
      this.note = "The castle is peaceful.";
      return;
    }
    if (!this.begin(fighter, kind)) return;
    if (!fighter.lock || !this.by(fighter.lock)) {
      this.note = `${fighter.name} has no lock.`;
      return;
    }
    const target = this.by(fighter.lock);
    if (target.pacified) {
      this.note = `${target.name} cannot be thrust at.`;
      return;
    }
    let extra = null;
    // Aim this swing at the post. The lock stays where it was.
    if (kind === "thrust" && fighter.name === "Jay" && this.tutorialStep === 6) {
      const post = this.by("Post");
      if (post && !post.dead && fightChebyshev(fighter.pos, post.pos) <= REACH) {
        extra = { facing: snapFacing(post.pos.x - fighter.pos.x, post.pos.y - fighter.pos.y) };
      }
    }
    this.commit(fighter);
    const attack = this.declare(fighter, kind, extra);
    if (extra) {
      const post = this.by("Post");
      if (post && attack.template.some((sq) => same(sq, post.pos))) {
        attack.practice = true;
        attack.landLine = "The swing landed.";
      }
    }
  }

  // Cancel your swing after the declare tick. The same tick cannot abort. The cancel whiffs.
  tryAbort(fighter) {
    if (!this.begin(fighter, "abort")) return;
    const attack = this.pending.find((item) => (
      !item.resolved
      && item.attacker === fighter.name
      && (item.kind === "thrust" || item.kind === "feint" || item.kind === "arc" || item.kind === "cleave" || item.kind === "sweep")
      && item.declare !== this.tick
    ));
    if (!attack) {
      this.note = "Nothing to abort.";
      return;
    }
    this.commit(fighter);
    attack.resolved = true;
    this.dropTelegraph(attack.id);
    this.print(`${fighter.name} aborts.`, "abort");
    this.whiff();
  }

  // Block clears telegraphs and faces the lock. It does not spend stamina until a hit lands.
  tryBlock(fighter) {
    if (!this.begin(fighter, "block")) return;
    this.acted.add(fighter.name);
    fighter.blocking = true;
    this.faceLock(fighter);
    this.telegraphs = [];
    this.print(`${fighter.name} blocks.`, "block");
  }

  // Push one adjacent hostile one square. Out of reach does not spend the tick.
  tryShove(fighter, name) {
    if (!this.begin(fighter, "shove")) return;
    let target = name ? this.by(name) : null;
    if (!target && fighter.lock) {
      const locked = this.by(fighter.lock);
      if (locked && fightChebyshev(fighter.pos, locked.pos) === 1) target = locked;
    }
    if (!target) {
      const adjacent = this.roster.filter((body) => (
        body.name !== fighter.name
        && this.hostile(fighter, body)
        && fightChebyshev(fighter.pos, body.pos) === 1
      ));
      if (adjacent.length === 1) target = adjacent[0];
    }
    if (!target) {
      this.note = "Nobody adjacent to shove.";
      return;
    }
    if (!this.hostile(fighter, target)) {
      this.note = "Shove is for hostiles.";
      return;
    }
    if (fightChebyshev(fighter.pos, target.pos) !== 1) {
      this.note = "Not adjacent.";
      return;
    }
    const dx = Math.sign(target.pos.x - fighter.pos.x);
    const dy = Math.sign(target.pos.y - fighter.pos.y);
    const dest = { x: target.pos.x + dx, y: target.pos.y + dy };
    this.commit(fighter);
    const lurkerBlocked = target.name === "Lurker" && dest.x === RESPAWN.x && dest.y === RESPAWN.y;
    if (!this.inBounds(dest) || !this.squareFree(dest, target.name) || lurkerBlocked) {
      this.note = "The shove does not move them.";
      return;
    }
    target.pos = dest;
    this.moved = true;
    this.print(`${fighter.name} shoves ${target.name}.`, "shove");
  }

  // Trade squares with one adjacent ally. Hostiles cannot swap.
  trySwap(fighter, name) {
    if (!this.begin(fighter, "swap")) return;
    let ally = null;
    if (name) {
      ally = this.by(name);
      if (!ally) {
        this.note = "No such body.";
        return;
      }
      if (!fighter.allies.has(ally.name)) {
        this.note = "Hostiles cannot swap.";
        return;
      }
      if (fightChebyshev(fighter.pos, ally.pos) !== 1) {
        this.note = "Not adjacent.";
        return;
      }
    } else {
      const found = this.roster.filter((body) => (
        fighter.allies.has(body.name) && fightChebyshev(fighter.pos, body.pos) === 1
      ));
      if (found.length !== 1) {
        this.note = found.length ? "Name an ally." : "No adjacent ally.";
        return;
      }
      ally = found[0];
    }
    this.commit(fighter);
    const swap = { x: fighter.pos.x, y: fighter.pos.y };
    fighter.pos = { x: ally.pos.x, y: ally.pos.y };
    ally.pos = swap;
    this.moved = true;
    this.note = `${fighter.name} swaps with ${ally.name}.`;
  }

  // Rows for one body. The table is per body so embodying someone does not reuse Jay's list.
  rowsFor(ownerName) {
    if (!this.targetRows.has(ownerName)) this.targetRows.set(ownerName, []);
    return this.targetRows.get(ownerName);
  }

  // Aggro leaves when that body is dead, pacified, or farther than sight. Added rows stay until drop.
  pruneTargets(owner) {
    const kept = this.rowsFor(owner.name).filter((row) => {
      const other = this.by(row.name);
      if (!other || other.dead) return false;
      if (row.why !== "aggro") return true;
      if (other.pacified) return false;
      return fightChebyshev(owner.pos, other.pos) <= SIGHT;
    });
    this.targetRows.set(owner.name, kept);
    return kept;
  }

  // A telegraph window is still open. That body sorts first under priority swinging.
  isSwinging(name) {
    return this.pending.some((attack) => (
      !attack.resolved
      && attack.attacker === name
      && attack.land > attack.declare
    ));
  }

  // Focus pins one row. Then the saved keys: swinging, nearest, or weakest.
  orderedTargets(fighter) {
    const rows = this.pruneTargets(fighter).slice();
    rows.sort((a, b) => {
      if (this.focusName === a.name) return -1;
      if (this.focusName === b.name) return 1;
      for (const key of this.priorityKeys) {
        const diff = this.priorityDiff(fighter, a.name, b.name, key);
        if (diff) return diff;
      }
      return a.name.localeCompare(b.name);
    });
    return rows;
  }

  // Negative means the first name comes first. Nearest uses king-move distance. Weakest uses momentum.
  priorityDiff(fighter, aName, bName, key) {
    if (key === "swinging") {
      return (this.isSwinging(aName) ? 0 : 1) - (this.isSwinging(bName) ? 0 : 1);
    }
    const a = this.by(aName);
    const b = this.by(bName);
    if (!a || !b) return 0;
    if (key === "nearest") return fightChebyshev(fighter.pos, a.pos) - fightChebyshev(fighter.pos, b.pos);
    if (key === "weakest") return a.momentum - b.momentum;
    return 0;
  }

  // Join as aggro. An added row becomes aggro. A second join does not add a second row.
  joinAggro(owner, otherName) {
    if (!owner || !otherName || otherName === owner.name) return;
    const other = this.by(otherName);
    if (!other || other.dead || other.name === owner.name) return;
    const rows = this.rowsFor(owner.name);
    const found = rows.find((row) => row.name === other.name);
    if (found) {
      found.why = "aggro";
      return;
    }
    rows.push({ name: other.name, why: "aggro" });
  }

  // The current body's table records who swung at them, and whom their own swing named.
  noteAggression(attacker, attack) {
    const body = this.bodyNow();
    if (!attacker || !body) return;
    const covers = (who) => (attack.template || []).some((sq) => same(sq, who.pos));
    if (attacker.name !== body.name && covers(body)) this.joinAggro(body, attacker.name);
    if (attacker.name === body.name) {
      if (attacker.lock) this.joinAggro(body, attacker.lock);
      for (const other of this.roster) {
        if (other.name !== body.name && covers(other)) this.joinAggro(body, other.name);
      }
    }
  }

  // One line per row, in the order auto-attack will use.
  tryTargets(fighter) {
    const rows = this.orderedTargets(fighter);
    if (!rows.length) {
      this.note = "No targets.";
      return;
    }
    this.note = rows.map((row) => {
      const other = this.by(row.name);
      const distance = other ? fightChebyshev(fighter.pos, other.pos) : 0;
      return `${row.name}, ${row.why}, distance ${distance}`;
    }).join("\n");
  }

  // Added rows are people who are not yet aggro. A name already listed is left as it is.
  tryAdd(fighter, rawName) {
    const name = (rawName || "").trim();
    if (!name) {
      this.note = "Add whom?";
      return;
    }
    const target = this.by(name);
    if (!target || target.name === fighter.name) {
      this.note = "No such body.";
      return;
    }
    if (target.dead) {
      this.note = `${target.name} is dead.`;
      return;
    }
    const rows = this.pruneTargets(fighter);
    if (rows.some((row) => row.name === target.name)) {
      this.note = `${target.name} is already listed.`;
      return;
    }
    rows.push({ name: target.name, why: "added" });
    this.note = `${target.name} is added.`;
  }

  // Added rows can leave. An aggro row stays while that body is still in sight and still a threat.
  tryDrop(fighter, rawName) {
    const name = (rawName || "").trim();
    if (!name) {
      this.note = "Drop whom?";
      return;
    }
    const target = this.by(name);
    const rows = this.pruneTargets(fighter);
    const row = rows.find((item) => target && item.name === target.name);
    if (!row) {
      this.note = "They are not listed.";
      return;
    }
    if (row.why === "aggro" && target && !target.dead && !target.pacified && fightChebyshev(fighter.pos, target.pos) <= SIGHT) {
      this.note = `${target.name} is still a threat.`;
      return;
    }
    this.targetRows.set(fighter.name, rows.filter((item) => item !== row));
    this.note = `${row.name} is dropped.`;
  }

  // The printed sort. No argument shows it. swinging keeps nearest as the second key.
  tryPriority(rest) {
    const key = (rest || "").trim().toLowerCase();
    if (!key) {
      this.note = this.priorityLine();
      return;
    }
    if (key === "swinging") this.priorityKeys = ["swinging", "nearest"];
    else if (key === "nearest") this.priorityKeys = ["nearest"];
    else if (key === "weakest") this.priorityKeys = ["weakest"];
    else {
      this.note = "Priority is swinging, nearest, or weakest.";
      return;
    }
    this.note = this.priorityLine();
  }

  priorityLine() {
    if (this.priorityKeys.length > 1) {
      return `Priority: ${this.priorityKeys[0]}, then ${this.priorityKeys.slice(1).join(", then ")}.`;
    }
    return `Priority: ${this.priorityKeys[0]}.`;
  }

  // Pin one listed row. A bare focus clears the pin. It does not answer a telegraph.
  tryFocus(fighter, rest) {
    const name = (rest || "").trim();
    if (!name) {
      this.focusName = "";
      this.note = "Focus cleared.";
      return;
    }
    const target = this.by(name);
    if (!target) {
      this.note = "No such body.";
      return;
    }
    const rows = this.pruneTargets(fighter);
    if (!rows.some((row) => row.name === target.name)) {
      this.note = `${target.name} is not listed.`;
      return;
    }
    this.focusName = target.name;
    this.note = `Focus is ${target.name}.`;
  }

  // The flag only. Turning it on does not clear a telegraph that is already coming.
  tryAuto(rest) {
    const word = (rest || "").trim().toLowerCase();
    if (word === "on") this.autoOn = true;
    else if (word === "off") this.autoOn = false;
    else if (!word) this.autoOn = !this.autoOn;
    else {
      this.note = "auto on or auto off.";
      return;
    }
    this.note = this.autoOn ? "Auto is on." : "Auto is off.";
  }

  // Set the lock. This spends the tick. A pacified body cannot be locked.
  tryLock(fighter, name) {
    if (!this.begin(fighter, "lock")) return;
    const target = this.by(name);
    if (!target || target.name === fighter.name) {
      this.note = "No such body.";
      return;
    }
    if (target.pacified) {
      this.note = `${target.name} cannot be locked.`;
      return;
    }
    if (fighter.lock === target.name && !this.exchangeStopped) {
      this.note = `Already locked on ${target.name}.`;
      return;
    }
    this.commit(fighter);
    fighter.lock = target.name;
    this.exchangeStopped = false;
    this.faceLock(fighter);
    this.note = `${fighter.name} locks ${target.name}.`;
  }

  // Leave the square for 20 stamina. A roll marks swings that still cover the old square.
  tryRoll(fighter, word) {
    const facing = DIR_ALIAS[(word || "").toLowerCase()];
    if (!facing) {
      this.note = "Unknown direction.";
      return;
    }
    if (!this.begin(fighter, "roll")) return;
    if (fighter.stamina < COST_ROLL) {
      this.note = `${fighter.name} has no stamina.`;
      return;
    }
    const [dx, dy] = DIRS[facing];
    const dest = { x: fighter.pos.x + dx, y: fighter.pos.y + dy };
    if (this.blockedStep(fighter, dest)) {
      this.note = "That square is closed.";
      return;
    }
    this.commit(fighter);
    fighter.stamina -= COST_ROLL;
    for (const attack of this.pending) {
      if (attack.resolved || attack.attacker === fighter.name) continue;
      if (attack.template.some((sq) => same(sq, fighter.pos))) attack.rolled = fighter.name;
    }
    fighter.pos = dest;
    this.moved = true;
    this.note = `${fighter.name} rolls ${DIR_WORD[facing]}.`;
  }

  // Spend the tick and do nothing else.
  tryHold(fighter) {
    if (!this.begin(fighter, "hold")) return;
    this.commit(fighter);
    this.note = "Hold.";
  }

  // Bleed lasts 8 ticks. When it ends, that body drops to -100 unless the exchange already stopped.
  expireBleed() {
    if (this.finisher) return;
    for (const fighter of this.roster) {
      if (!fighter.bleed || this.tick < fighter.bleed.until) continue;
      const source = fighter.bleed.source;
      fighter.bleed = null;
      this.shift(fighter.name, -100, source);
      this.maybeStop();
      if (this.finisher) return;
    }
  }

  // Spawn the hamlet once, the first time anyone steps onto y >= 30.
  ensureHamlet() {
    if (this.hamletOn) return;
    this.hamletOn = true;
    const cues = {
      Maret: "Reps on the post. The sword's wider cut opens at three.",
      Osen: "Yarrow from the patch. Drink it if you are bleeding.",
      Nell: "The wisp keeps the patch. The hound keeps the far lane.",
      Harl: "The lane runs east. The lurker stays in the arena.",
    };
    const spots = [
      ["Harl", 4, 30, "W"],
      ["Maret", 4, 32, "S"],
      ["Osen", 1, 33, "N"],
      ["Nell", 3, 30, "S"],
    ];
    for (const [name, x, y, facing] of spots) {
      const ally = makeFighter(name, x, y, facing, null);
      ally.gear = [];
      ally.cue = cues[name];
      ally.allies.add("Jay");
      this.jay.allies.add(name);
      this.roster.push(ally);
    }
    this.hound = makeFighter("Hound", 8, 30, "W", null);
    this.wisp = makeFighter("Wisp", 8, 32, "N", null);
    this.roster.push(this.hound, this.wisp);
    this.moved = true;
  }

  // Hound and wisp act only after the hamlet exists, and not during a finisher.
  hamletAct() {
    if (!this.hamletOn || this.finisher) return;
    this.houndAct();
    this.wispAct();
  }

  // From one square away the hound interrupts. It does not act while embodied.
  houndAct() {
    if (this.castlePeace(this.jay.pos)) return;
    if (this.embodied === "Hound") return;
    const hound = this.hound;
    const jay = this.jay;
    if (!hound || hound.dead || hound.pacified || jay.pacified || jay.dead) return;
    if (this.justAppeared.has(hound.name) || this.lockedIn(hound) || this.acted.has(hound.name)) return;
    if (fightChebyshev(hound.pos, jay.pos) !== 1) return;
    hound.facing = snapFacing(jay.pos.x - hound.pos.x, jay.pos.y - hound.pos.y);
    const [dx, dy] = DIRS[hound.facing];
    const template = [{ x: hound.pos.x + dx, y: hound.pos.y + dy }];
    this.acted.add(hound.name);
    hound.blocking = false;
    const text = "Hound: The hound interrupts.";
    const attack = this.declareCustom(hound, "interrupt", template, text, false, "hound", false);
    this.print(text, "hit");
    attack.noted = true;
  }

  // Within one square the wisp bursts in a cross. It does not act while embodied.
  wispAct() {
    if (this.castlePeace(this.jay.pos)) return;
    if (this.embodied === "Wisp") return;
    const wisp = this.wisp;
    const jay = this.jay;
    if (!wisp || wisp.dead || wisp.pacified || jay.pacified || jay.dead) return;
    if (this.justAppeared.has(wisp.name) || this.lockedIn(wisp) || this.acted.has(wisp.name)) return;
    if (fightChebyshev(wisp.pos, jay.pos) > 1) return;
    if (this.pending.some((attack) => !attack.resolved && attack.attacker === wisp.name)) return;
    this.acted.add(wisp.name);
    wisp.blocking = false;
    const text = "Wisp: The wisp burst flares in a cross.";
    const template = this.swingSquares(jay.pos, "S", "burst");
    this.declareCustom(wisp, "burst", template, text, true, "burst", true);
  }

  // A telegraph is pending, a finisher is waiting, or Jay and a hostile are within threat and one holds a lock. Look may still print. Most other success lines go to the note.
  fightIsLive() {
    if (this.finisher) return true;
    if (this.pending.some((attack) => !attack.resolved && attack.kind !== "interrupt")) return true;
    return this.roster.some((other) => (
      other.name !== "Jay"
      && !other.practice
      && !this.jay.allies.has(other.name)
      && !other.pacified
      && !other.dead
      && fightChebyshev(this.jay.pos, other.pos) <= THREAT
      && (this.jay.lock === other.name || other.lock === "Jay")
    ));
  }

  // Arena look is the grid. Hamlet and tutorial look are a short name, one sentence, bodies, exits, stamina, momentum. The owner's stain adds one line.
  lookText(body) {
    const who = body || this.bodyNow();
    const pos = who.pos;
    if (this.zone === "land" && this.land) return this.landLook(who);
    const exits = `Exits: ${this.exitWords(pos).join(" ") || "none"}`;
    const stain = this.stains.get(who.name);
    const stainLine = stain && stain.x === pos.x && stain.y === pos.y ? "Your chi is here." : "";
    const roomLine = this.roomLine(pos);
    if (this.onTutorial(pos)) {
      const lines = [`${pos.x},${pos.y}, tutorial.`, this.tutorialSentence()];
      const custom = this.squareText.get(cellKey(pos.x, pos.y));
      if (custom) lines.push(custom);
      const here = this.bodiesAt(pos.x, pos.y).filter((other) => other.name !== who.name);
      for (const other of here) lines.push(`${other.name} is here.`);
      if (stainLine) lines.push(stainLine);
      if (roomLine) lines.push(roomLine);
      lines.push(exits);
      lines.push(`stamina ${who.stamina}  momentum ${who.momentum}`);
      return lines.join("\n");
    }
    if (!this.onHamlet(pos) && !this.castleProse(pos)) {
      const custom = this.squareText.get(cellKey(pos.x, pos.y));
      const extra = [custom, stainLine].filter(Boolean).join("\n");
      const grid = extra ? `${this.gridText()}\n${extra}\n${exits}` : `${this.gridText()}\n${exits}`;
      return roomLine ? `${grid}\n${roomLine}` : grid;
    }
    const info = this.placeInfo(pos);
    const lines = [`${pos.x},${pos.y}, ${info.place}.`];
    const sentence = this.squareSentence(pos, info);
    if (sentence && info.place !== "tutorial") lines.push(sentence);
    if (roomLine) lines.push(roomLine);
    const here = this.bodiesAt(pos.x, pos.y).filter((other) => other.name !== who.name);
    for (const other of here) lines.push(`${other.name} is here.`);
    if (stainLine) lines.push(stainLine);
    lines.push(exits);
    lines.push(`stamina ${who.stamina}  momentum ${who.momentum}`);
    return lines.join("\n");
  }

  // The sidebar follows the body you are in. Arena view stays on 0..4 by 0..6.
  gridView() {
    const eyes = this.bodyNow().pos;
    const local = this.onHamlet(eyes) || this.onTutorial(eyes);
    const minX = local ? eyes.x - 4 : 0;
    const maxX = local ? eyes.x + 4 : ARENA_X;
    const minY = local ? eyes.y - 3 : 0;
    const maxY = local ? eyes.y + 3 : ARENA_Y;
    const cells = [];
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const info = this.placeInfo({ x, y });
        const bodies = this.bodiesAt(x, y);
        const corpse = this.corpseAt({ x, y });
        let label = "";
        let cls = info ? "" : "void";
        if (YARROW.has(cellKey(x, y))) cls = "yarrow";
        if (corpse) cls = "corpse";
        if (bodies.length === 1) {
          const body = bodies[0];
          if (body.name === "Jay") cls = "jay";
          else if (body.name === "Lurker") cls = "lurker";
          else if (body.name === "Hound" || body.name === "Wisp") cls = "lurker";
          else cls = "ally";
          label = body.name === "Jay" ? "J" : body.name.slice(0, 1);
        } else if (bodies.length > 1) {
          label = "+";
          if (bodies.some((body) => body.name === "Jay")) cls = "jay";
        } else if (corpse) label = "#";
        else if (YARROW.has(cellKey(x, y))) label = "*";
        cells.push({ x, y, label, cls });
      }
    }
    return { width: maxX - minX + 1, cells };
  }

  // A display name cannot be a command word or a townsperson.
  takenName(text) {
    const key = text.toLowerCase();
    const reserved = [
      "maret", "osen", "nell", "harl", "lurker", "hound", "wisp",
      "look", "l", "score", "sc", "say", "tell", "who", "help", "n", "s", "e", "w",
      "ne", "nw", "se", "sw", "north", "south", "east", "west", "inventory", "i", "inv",
      "wield", "gather", "drink", "routine", "levers", "talk", "admin", "adm", "mute",
      "kick", "ban", "unban", "login", "connect", "save", "areas", "area", "channel", "chan",
      "thrust", "dodge", "block", "step", "guard", "framework", "tutorial",
      "targets", "add", "drop", "priority", "focus", "auto",
    ];
    return reserved.includes(key);
  }

  // Display name only. Combat lines keep the engine id Jay.
  tryName(fighter, text) {
    if (!text) {
      this.note = `You are ${fighter.called || fighter.name}.`;
      return;
    }
    if (!/^[A-Za-z]+(?:[ '][A-Za-z]+)*$/.test(text) || text.length < 2 || text.length > 16) {
      this.note = "Use letters, spaces, and apostrophes, 2 to 16 characters.";
      return;
    }
    if (this.takenName(text)) {
      this.note = "That name is taken.";
      return;
    }
    fighter.called = text;
    this.note = `You are now called ${text}.`;
  }

  // The body the player is acting as. Embody does not move Jay's chi.
  bodyNow() {
    if (!this.embodied) return this.jay;
    const body = this.by(this.embodied);
    if (!body || body.dead) {
      this.embodied = null;
      return this.jay;
    }
    return body;
  }

  // Scene verbs and the fight use the NPC. World-edit verbs do not.
  stagehand(op) {
    return new Set([
      "look", "l", "examine", "exa", "exam", "glance", "gl", "exits", "ex", "where",
      "say", "emote", "pose", "tell", "talk",
      "step", "thrust", "dodge", "block", "execute", "mercy", "lock", "abort",
      "targets", "add", "drop", "priority", "focus", "auto",
      "shove", "swap", "roll", "hold", "clear", "feint", "interrupt", "guard", "wield",
      "chi", "score", "sc", "craft", "gather", "drink", "inventory", "inv", "i",
      "get", "take",
    ]).has(op);
  }

  // While embodied, scene and fight verbs run as the NPC. describe, reshape, open, and close do not.
  actorFor(op) {
    if (!this.embodied || !this.stagehand(op)) return "Jay";
    const body = this.by(this.embodied);
    if (!body || body.dead) {
      this.embodied = null;
      return "Jay";
    }
    return body.name;
  }

  // A chi success. Log when the fight is quiet. Note while the fight is live.
  worldLine(text) {
    if (this.fightIsLive()) this.note = text;
    else this.print(text, "say");
  }

  // Speech goes to the log under the speaker's name. A muted speaker never reaches this.
  speechLine(text) {
    this.print(text, "say");
  }

  // One refusal. The page note changes only for Jay or the body being embodied. Nobody else hears the line.
  muteRefusal(fighter) {
    fighter.privateNote = "You are muted.";
    if (fighter.name === "Jay" || fighter.name === this.embodied) this.note = "You are muted.";
  }

  // Chi. Spent chi is gone. Unspent chi is the balance that can drop.
  spendChi(body, cost) {
    const have = body.chi || 0;
    if (have < cost) {
      this.note = `That takes ${cost} chi. You have ${have}.`;
      return false;
    }
    body.chi = have - cost;
    return true;
  }

  // An edge is undirected. Closing north from here closes south from the other side.
  edgeKey(a, b) {
    const swap = a.x > b.x || (a.x === b.x && a.y > b.y);
    const p = swap ? b : a;
    const q = swap ? a : b;
    return `${p.x},${p.y}|${q.x},${q.y}`;
  }

  // Session-only. A new fight starts with every existing edge open.
  edgeClosed(a, b) {
    return this.closedEdges.has(this.edgeKey(a, b));
  }

  // describe here replaces the sentence for this session. The tutorial step line is separate.
  squareSentence(pos, info) {
    const custom = this.squareText.get(cellKey(pos.x, pos.y));
    if (custom) return custom;
    if (info && info.place === "tutorial") return this.tutorialSentence();
    return info ? info.sentence : "";
  }

  // The standing line. Chi is not on it. While embodied it leads with the NPC's name and that body's numbers.
  promptLine() {
    const body = this.bodyNow();
    const exits = this.exitWords(body.pos).join(" ") || "none";
    const room = this.roomNumber(body.pos);
    const roomBit = room == null ? "" : ` room ${room}`;
    const place = `${body.pos.x},${body.pos.y} ${this.placeName(body.pos)}${roomBit} [${exits}] sta ${body.stamina} mom ${body.momentum}`;
    return this.embodied ? `${body.name} ${place}` : place;
  }

  // The current body's balance. A stain adds where it was left.
  tryChi(fighter) {
    const stain = this.stains.get(fighter.name);
    const where = stain ? ` You left ${stain.amount} chi on ${stain.x},${stain.y}.` : "";
    this.note = `Chi ${fighter.chi || 0}.${where}`;
  }

  // help with no topic is the index. help embody is the admin stagehand note. Other topics are the reference.
  tryHelpTopic(topic) {
    const key = (topic || "").toLowerCase();
    if (key === "embody") {
      if (!this.jay.admin) {
        this.note = "You cannot do that.";
        return;
      }
      this.note = "This is how you play that person for a scene.\nlook, say, emote, pose, and step are theirs. release returns to you. Their chi stays theirs.";
      return;
    }
    if (!HELP_TOPICS[key]) {
      this.note = HELP_INDEX;
      return;
    }
    this.note = HELP_TOPICS[key];
  }

  // Embody. Admin stagehand. Non-admins get one refusal and nothing else.
  tryEmbody(name) {
    if (!this.jay.admin) {
      this.note = "You cannot do that.";
      return;
    }
    if (this.embodied) {
      this.note = "Release first.";
      return;
    }
    const target = name ? this.by(name) : null;
    if (!target || target.dead) {
      this.note = "There is nobody named that.";
      return;
    }
    if (target.name === "Jay") {
      this.note = "You are already yourself.";
      return;
    }
    this.embodied = target.name;
    this.note = `You embody ${target.name}.`;
  }

  // Back to Jay. Chi stays where it is. Not embodying says you are already yourself.
  tryRelease() {
    if (!this.jay.admin) {
      this.note = "You cannot do that.";
      return;
    }
    if (!this.embodied) {
      this.note = "You are already yourself.";
      return;
    }
    this.embodied = null;
    this.note = "You are Jay again.";
  }

  // While embodied, describe, reshape, open, and close stop here. Chi does not move.
  refuseWorldEdit() {
    if (!this.embodied) return false;
    this.note = "You cannot do that.";
    return true;
  }

  // Costs 2 chi and rewrites this square's sentence. Empty or a second line is refused before the spend.
  tryDescribeHere(fighter, text) {
    if (this.refuseWorldEdit()) return;
    if (!text) {
      this.note = "Describe what?";
      return;
    }
    if (text.length > 80 || text.includes("\n")) {
      this.note = "Keep it to one line.";
      return;
    }
    if (!this.spendChi(fighter, CHI_DESCRIBE)) return;
    this.squareText.set(cellKey(fighter.pos.x, fighter.pos.y), text);
    this.noteLandEdit(fighter.pos);
    this.worldLine(`You spend ${CHI_DESCRIBE} chi. This square now reads: ${text}`);
  }

  // In hand, carried, or the fixture on this square. Missing items are not described.
  hasItem(fighter, key) {
    if (fighter.holding === key || (fighter.carried || []).includes(key)) return true;
    if (key === "yarrow" && fighter.yarrow) return true;
    if (key === "shard" && fighter.shards) return true;
    if (key === "draught" && fighter.draughts) return true;
    if (key === "sign" && same(fighter.pos, SIGN_AT)) return true;
    if (key === "stone" && this.placeName(fighter.pos) === STONE_PLACE) return true;
    if (key === "shard" && SHARD_NODES.has(cellKey(fighter.pos.x, fighter.pos.y))) return true;
    return false;
  }

  // Costs 2 chi. examine then shows the new line. Describing yourself is the other command and is free.
  tryDescribeItem(fighter, item, text) {
    if (this.refuseWorldEdit()) return;
    const key = item.toLowerCase();
    if (!text) {
      this.note = "Describe what?";
      return;
    }
    if (text.length > 80 || text.includes("\n")) {
      this.note = "Keep it to one line.";
      return;
    }
    if (!this.hasItem(fighter, key)) {
      this.note = `There is no ${key} here.`;
      return;
    }
    if (!this.spendChi(fighter, CHI_DESCRIBE)) return;
    fighter.itemLines[key] = text;
    this.worldLine(`You spend ${CHI_DESCRIBE} chi. The ${key} now reads: ${text}`);
  }

  // One edge, 5 chi. No square, a filled square, or an edge already in that state spends nothing.
  tryEdge(dirWord, opening) {
    if (this.refuseWorldEdit()) return;
    const facing = DIR_ALIAS[(dirWord || "").toLowerCase()];
    if (!facing) {
      this.note = "Unknown direction.";
      return;
    }
    const body = this.jay;
    const dest = this.stepDest(body.pos, facing);
    const label = DIR_WORD[facing].charAt(0).toUpperCase() + DIR_WORD[facing].slice(1);
    if (FILLED_SQUARES.has(cellKey(dest.x, dest.y))) {
      this.note = "That square is filled.";
      return;
    }
    if (!this.inBounds(dest)) {
      this.note = "There is no square that way.";
      return;
    }
    const closed = this.edgeClosed(body.pos, dest);
    if (opening && !closed) {
      this.note = `${label} is already open.`;
      return;
    }
    if (!opening && closed) {
      this.note = `${label} is already closed.`;
      return;
    }
    if (!this.spendChi(body, CHI_EDGE)) return;
    const key = this.edgeKey(body.pos, dest);
    if (opening) this.closedEdges.delete(key);
    else this.closedEdges.add(key);
    this.noteLandEdit(body.pos);
    this.worldLine(`You spend ${CHI_EDGE} chi. ${label} is ${opening ? "open" : "closed"}.`);
  }

  // Materials sit in the bag. Yarrow gathered in the ward is the same herb.
  have(fighter, name) {
    if (name === "chi") return fighter.chi || 0;
    if (name === "yarrow") return (fighter.yarrow || 0) + (this.bag.yarrow || 0);
    if (name === "draught") return (fighter.draughts || 0) + (this.bag.draught || 0);
    if (name === "stone") return (this.stone ? 1 : 0) + (this.bag.stone || 0);
    const part = this.parts && this.parts[name] ? this.parts[name] : 0;
    return (this.bag[name] || 0) + part;
  }

  takeMat(fighter, name, n) {
    let left = n;
    if (name === "chi") {
      fighter.chi = (fighter.chi || 0) - n;
      return;
    }
    if (name === "yarrow") {
      const from = Math.min(fighter.yarrow || 0, left);
      fighter.yarrow = (fighter.yarrow || 0) - from;
      left -= from;
    }
    if (name === "draught") {
      const from = Math.min(fighter.draughts || 0, left);
      fighter.draughts = (fighter.draughts || 0) - from;
      left -= from;
    }
    if (name === "stone" && this.stone && left) {
      this.stone = false;
      left -= 1;
    }
    if (left && this.parts && this.parts[name]) {
      const from = Math.min(this.parts[name], left);
      this.parts[name] -= from;
      left -= from;
    }
    if (left) {
      this.bag[name] = (this.bag[name] || 0) - left;
      if (this.bag[name] <= 0) delete this.bag[name];
    }
  }

  giveMat(name, n) {
    if (name === "stone") {
      this.stone = true;
      return;
    }
    if (name === "draught") {
      const who = this.bodyNow();
      who.draughts = (who.draughts || 0) + n;
      return;
    }
    if (name === "arrows") {
      this.arrows += n;
      return;
    }
    this.bag[name] = (this.bag[name] || 0) + (n || 1);
  }

  armorBearing() {
    const worn = this.wearing || "";
    if (worn.includes("unique") && worn.includes("armor")) return 10;
    if (worn.includes("rare") && worn.includes("armor")) return 8;
    if (worn.includes("magic") && worn.includes("armor")) return 6;
    if (worn.includes("armor")) return 4;
    return 0;
  }

  noteLandEdit(pos) {
    if (this.zone !== "land" || !this.land || !pos) return;
    if (!this.land.edits) this.land.edits = [];
    const key = cellKey(pos.x, pos.y);
    if (!this.land.edits.includes(key)) this.land.edits.push(key);
  }

  // The station must be the right square, and empty of anyone else.
  station(fighter, kind) {
    const pos = fighter.pos;
    const occupied = this.bodiesAt(pos.x, pos.y).some((body) => body.name !== fighter.name && !body.dead);
    if (occupied) {
      this.note = "That square is taken.";
      return false;
    }
    if (kind === "forge") {
      if (this.placeName(pos) !== "market") {
        this.note = "The forge is in the market.";
        return false;
      }
    } else if (kind === "fletch") {
      const yard = [[5, 31], [6, 31], [5, 32], [6, 32], [5, 33], [6, 33]];
      if (!yard.some((sq) => sq[0] === pos.x && sq[1] === pos.y)) {
        this.note = "The yard is the place for that.";
        return false;
      }
    } else if (kind === "cook") {
      const hearth = pos.x === 7 && pos.y === 32;
      const inn = this.zone === "land" && this.placeName(pos) === "inn";
      if (!hearth && !inn) {
        this.note = "There is no hearth.";
        return false;
      }
    } else if (kind === "brew") {
      const still = (pos.x === 7 && pos.y === 31) || (pos.x === 8 && pos.y === 31) || (pos.x === 8 && pos.y === 32);
      const inn = this.zone === "land" && this.placeName(pos) === "inn";
      if (!still && !inn) {
        this.note = "There is no still.";
        return false;
      }
    }
    return true;
  }

  // Names only what is short. Chi alone uses the page's chi line.
  payNeeds(fighter, needs) {
    const short = [];
    for (const [name, n] of needs) {
      if (this.have(fighter, name) < n) short.push([name, n, this.have(fighter, name)]);
    }
    if (!short.length) return true;
    if (short.length === 1 && short[0][0] === "chi") {
      this.note = `That takes ${short[0][1]} chi. You have ${short[0][2]}.`;
      return false;
    }
    const need = short.map(([name, n]) => `${n} ${name}`).join(" and ");
    const have = short.map(([name, , got]) => `${got} ${name}`).join(" and ");
    this.note = `You need ${need}. You have ${have}.`;
    return false;
  }

  spendNeeds(fighter, needs) {
    for (const [name, n] of needs) this.takeMat(fighter, name, n);
  }

  rememberMake(skill, result, artificeAlso) {
    if (!this.known.includes(result)) {
      this.known.push(result);
      this.skills[skill] += 1;
      if (artificeAlso && !this.artificeMade.has(result)) {
        this.artificeMade.add(result);
        this.skills.artifice += 1;
      }
    }
  }

  // Crafting. The list is the crafting file. The body you are in pays.
  tryCraft(fighter, which) {
    this.note = which
      ? "You cannot make that."
      : "forge, fletch, cook, brew, and combine are the recipes.";
  }

  // One shard from a node in the yard or the lane. Anywhere else gathers nothing.
  tryGatherShard(fighter) {
    if (!this.begin(fighter, "gather")) return;
    if (!SHARD_NODES.has(cellKey(fighter.pos.x, fighter.pos.y))) {
      this.note = "There is no shard here.";
      return;
    }
    this.commit(fighter);
    fighter.shards += 1;
    this.remember(fighter, "gather", [fighter.pos], "", null);
    this.print("You gather a shard.", "say");
  }

  // Take this body's stain, and only while standing on it. Anyone else's stain is not here.
  tryGetChi(fighter) {
    const stain = this.stains.get(fighter.name);
    if (!stain || stain.x !== fighter.pos.x || stain.y !== fighter.pos.y) {
      this.note = "There is no chi here.";
      return;
    }
    fighter.chi = (fighter.chi || 0) + stain.amount;
    const amount = stain.amount;
    this.stains.delete(fighter.name);
    this.worldLine(`You take ${amount} chi.`);
  }

  // Stepping onto your own stain takes it. You do not have to type get chi.
  recoverStain(fighter) {
    const stain = this.stains.get(fighter.name);
    if (!stain || stain.x !== fighter.pos.x || stain.y !== fighter.pos.y) return;
    fighter.chi = (fighter.chi || 0) + stain.amount;
    const amount = stain.amount;
    this.stains.delete(fighter.name);
    this.worldLine(`You take ${amount} chi.`);
  }

  // Unspent chi falls on the death square, not the respawn square. A second death erases the old stain first.
  dropStain(loser, death) {
    const prev = this.stains.get(loser.name);
    this.stains.delete(loser.name);
    const amount = loser.chi || 0;
    loser.chi = 0;
    if (amount) {
      this.stains.set(loser.name, { x: death.x, y: death.y, amount });
      this.print(`You drop ${amount} chi on ${death.x},${death.y}.`, "say");
    }
    if (prev) this.note = "The chi you left is gone.";
  }

  // Speech. The current body speaks under its own name. A muted body is
  // refused and the line is not printed for anyone else.
  tryEmote(fighter, text) {
    if (!text) {
      this.note = "Emote what?";
      return;
    }
    if (fighter.muted) {
      this.muteRefusal(fighter);
      return;
    }
    const name = fighter.called || fighter.name;
    this.speechLine(`${name} ${text}`);
  }

  // pose text stores it. pose alone repeats it. pose clear clears it. Muted pose does not broadcast.
  tryPose(fighter, text) {
    if (fighter.muted) {
      this.muteRefusal(fighter);
      return;
    }
    if (!text) {
      if (!fighter.pose) {
        this.note = "You have no pose.";
        return;
      }
      const name = fighter.called || fighter.name;
      this.speechLine(`${name} ${fighter.pose}`);
      return;
    }
    if (text.toLowerCase() === "clear") {
      fighter.pose = "";
      this.note = "Pose cleared.";
      return;
    }
    fighter.pose = text;
    this.note = "Pose set.";
  }

  // Your own description. Free, no chi, no tick. A bare item or body name is told to use examine.
  tryDescribe(fighter, text) {
    if (!text) {
      this.note = fighter.blurb || "No description set.";
      return;
    }
    const first = text.split(/\s+/)[0];
    if (this.by(first) || ["spear", "sword", "staff", "yarrow"].includes(first.toLowerCase())) {
      this.note = "Use examine to look at that.";
      return;
    }
    if (text.length > 80) {
      this.note = "Keep it to 80 characters.";
      return;
    }
    fighter.blurb = text;
    this.note = "Description set.";
    if (fighter.name === "Jay") this.tutorialDescribed = true;
  }

  // Stamina, momentum, and chi are separate numbers. Chi is this body's balance.
  tryScore(fighter) {
    const reps = fighter.weaponReps || { spear: 0, sword: 0, staff: 0 };
    const called = fighter.called || fighter.name;
    this.note = `${called}  place ${this.placeName(fighter.pos)}  weapon ${fighter.holding || "nothing"}  stamina ${fighter.stamina}  momentum ${fighter.momentum}  chi ${fighter.chi || 0}  reps spear ${reps.spear}, sword ${reps.sword}, staff ${reps.staff}`;
    if (fighter.name === "Jay") this.advanceTutorial(4);
  }

  // What is held and carried, including yarrow, shards, draughts, tokens, and braces.
  tryInventory(fighter) {
    const carried = (fighter.carried || []).slice();
    if (fighter.yarrow) carried.push("yarrow");
    if (fighter.shards) carried.push("shard");
    if (fighter.draughts) carried.push("draught");
    for (const [name, count] of Object.entries(this.bag)) {
      if (count > 0) carried.push(count > 1 ? `${name} ${count}` : name);
    }
    const held = fighter.holding || "nothing";
    const tail = carried.length ? carried.join(", ") : "nothing";
    this.note = `holding ${held}  ·  carrying ${tail}`;
  }

  // One weapon in hand. The others stay carried. Tutorial step 5 completes on the sword.
  tryWield(fighter, item) {
    const name = (item || "").toLowerCase();
    if (!name) {
      this.note = "Wield what?";
      return;
    }
    const owned = fighter.holding === name || (fighter.carried || []).includes(name);
    if (!owned || !["spear", "sword", "staff"].includes(name)) {
      this.note = "You are not carrying that.";
      return;
    }
    if (fighter.holding === name) {
      this.note = `You are already wielding the ${name}.`;
      if (fighter.name === "Jay" && name === "sword") this.advanceTutorial(5);
      return;
    }
    if (fighter.holding) fighter.carried.push(fighter.holding);
    fighter.carried = fighter.carried.filter((piece) => piece !== name);
    fighter.holding = name;
    this.note = `You wield the ${name}.`;
    if (fighter.name === "Jay" && name === "sword") this.advanceTutorial(5);
  }

  // Yarrow from the patch only. The tutorial area has none. Shard gathering is the other command.
  tryGather(fighter) {
    if (!this.begin(fighter, "gather")) return;
    if (!YARROW.has(cellKey(fighter.pos.x, fighter.pos.y))) {
      this.note = "There is no yarrow here.";
      return;
    }
    this.commit(fighter);
    fighter.yarrow = (fighter.yarrow || 0) + 1;
    this.remember(fighter, "gather", [fighter.pos], "", null);
    this.print("You gather the yarrow.", "say");
  }

  // A draught clears bleed and is used first. Otherwise yarrow does, and only while bleeding.
  tryGetShelf(fighter, arg) {
    const name = String(arg || "").trim().toLowerCase();
    if (!["book", "candle", "relic", "folio", "scrap"].includes(name)) return false;
    const key = cellKey(fighter.pos.x, fighter.pos.y);
    if (name === "folio" && this.placeName(fighter.pos) === "archive" && this.folioHere) {
      this.folioHere = false;
      this.giveMat("folio", 1);
      this.note = "You take folio.";
      return true;
    }
    if (this.castleRelics[key] === name) {
      this.castleRelics[key] = "";
      if (!fighter.carried) fighter.carried = [];
      fighter.carried.push(name);
      this.note = `You take ${name}.`;
      return true;
    }
    this.note = "That is not here.";
    return true;
  }

  tryDrink(fighter, rest) {
    const named = String(rest || "").trim().toLowerCase();
    if (named === "beer" || named === "dark beer" || named === "philter" || named === "draught") {
      if (!this.have(fighter, named)) {
        this.note = "You have nothing to drink.";
        return;
      }
      if (named === "draught" && !fighter.bleed) {
        this.note = "You are not bleeding.";
        return;
      }
      if (!this.begin(fighter, "drink")) return;
      this.commit(fighter);
      this.takeMat(fighter, named, 1);
      if (named === "draught") {
        fighter.bleed = null;
        this.note = "The bleed is cleared.";
      } else if (named === "philter") {
        this.philter = 4;
        this.note = "You drink philter.";
      } else {
        fighter.stamina = Math.min(100, fighter.stamina + (named === "dark beer" ? 20 : 10));
        this.beerHide = true;
        this.note = `You drink ${named}.`;
      }
      if (fighter.name === "Jay") this.advanceTutorial(9);
      return;
    }
    if (!this.begin(fighter, "drink")) return;
    if (fighter.draughts > 0) {
      if (!fighter.bleed) {
        this.note = "You are not bleeding.";
        return;
      }
      this.commit(fighter);
      fighter.draughts -= 1;
      fighter.bleed = null;
      this.remember(fighter, "drink", [fighter.pos], "", null);
      this.print("The bleed is cleared.", "say");
      if (fighter.name === "Jay") this.advanceTutorial(9);
      return;
    }
    if (!fighter.yarrow) {
      this.note = "You have no yarrow.";
      return;
    }
    if (!fighter.bleed) {
      if (fighter.name === "Jay" && this.tutorialStep === 9) {
        this.commit(fighter);
        fighter.yarrow -= 1;
        this.remember(fighter, "drink", [fighter.pos], "", null);
        this.print("You drink the yarrow.", "say");
        this.advanceTutorial(9);
        return;
      }
      this.note = "You are not bleeding.";
      return;
    }
    this.commit(fighter);
    fighter.yarrow -= 1;
    fighter.bleed = null;
    this.remember(fighter, "drink", [fighter.pos], "", null);
    this.print("The bleed is cleared.", "say");
    if (fighter.name === "Jay") this.advanceTutorial(9);
  }

  // No word: read whether guard is on and what it matches. A word changes the match. Tutorial step 7 reads it first.
  tryRoutine(fighter, word) {
    if (word) {
      this.guardWord = word.toLowerCase();
      this.note = `Guard matches "${this.guardWord}".`;
      return;
    }
    const latest = this.feed();
    const line = latest.length ? latest[latest.length - 1] : "";
    const state = this.guardOn ? "on" : "off";
    this.note = line
      ? `Guard is ${state}. It matches "${this.guardWord}". Latest line: ${line}`
      : `Guard is ${state}. It matches "${this.guardWord}". No unread line.`;
    if (fighter.name === "Jay" && this.tutorialStep === 7) this.tutorialGuardHint = true;
  }

  // The last action's actor, facing, squares, and keyword. Nothing has happened yet until one has.
  tryLevers(fighter) {
    const last = this.lastLevers;
    if (!last) {
      this.note = "No levers yet.";
      return;
    }
    this.note = `actor ${last.actor}  action ${last.action}  facing ${last.facing}  target ${last.target}  squares ${last.squares}  keyword ${last.keyword}`;
  }

  // talk Name with no other words speaks that person's cue, if they are in sight and not muted. Anything else is say.
  tryTalk(fighter, rest, arg) {
    const named = arg && this.by(arg);
    if (named && named.cue && rest.toLowerCase() === arg.toLowerCase()) {
      if (named.muted) {
        this.reply(named, "You are muted.", true);
        return;
      }
      if (fightChebyshev(fighter.pos, named.pos) > 5) {
        this.note = "You cannot see them.";
        return;
      }
      this.print(`${named.name} says, "${named.cue}"`, "say");
      return;
    }
    this.trySay(fighter, rest);
  }

  // look thing, and examine. One thing in sight. The yard sign teaches chi. The yard stone lists recipes.
  examine(fighter, text) {
    const word = (text || "").split(/\s+/)[0];
    if (!word) {
      this.note = "Examine what?";
      return;
    }
    const live = this.fightIsLive();
    const emit = (line) => {
      if (live) this.note = line;
      else this.print(line, "look");
    };
    const key = word.toLowerCase();
    if (key === "sign") {
      if (fightChebyshev(fighter.pos, SIGN_AT) > 5) {
        this.note = "You cannot see that.";
        return;
      }
      emit("Chi changes this place.\nA kill gives chi, and dying leaves it on the ground.\nSay with /manner, or emote a line.");
      return;
    }
    if (key === "stone") {
      if (this.placeName(fighter.pos) !== STONE_PLACE) {
        this.note = "You cannot see that.";
        return;
      }
      emit("Yarrow left in water becomes a tincture.\nA tincture met with chi becomes oil.\nOre at a forge, and chi, becomes stock.\nOre met with salt becomes flux.");
      return;
    }
    if (key === "me" || key === "self") {
      emit(`${fighter.called || fighter.name}. ${fighter.blurb || "No description set."}`);
      if (fighter.name === "Jay" && this.tutorialDescribed) this.advanceTutorial(3);
      return;
    }
    const lines = {
      maret: "Maret. She keeps the yard and the post.",
      osen: "Osen. She keeps the hearth.",
      nell: "Nell. She stands by the well.",
      harl: "Harl. He stands in the lane and watches the thicket.",
      lurker: "Lurker. A straight thorn thrust.",
      hound: "Hound. It interrupts from one square.",
      wisp: "Wisp. A cross burst.",
      spear: "A straight spear. The thrust is its move.",
      sword: "A sword. The arc is its move.",
      staff: "A staff. It reaches both sides.",
      yarrow: "A handful of yarrow.",
      token: "A token made of chi.",
      brace: "a plain brace.",
      draught: "A draught. Drink it to clear bleed.",
      shard: "A shard gathered from the yard or the lane.",
    };
    if (fighter.itemLines && fighter.itemLines[key]) {
      emit(fighter.itemLines[key]);
      return;
    }
    const body = this.by(word);
    if (body && fightChebyshev(fighter.pos, body.pos) <= 5) {
      emit(lines[body.name.toLowerCase()] || `${body.name}.`);
      return;
    }
    const carried = fighter.holding === key || (fighter.carried || []).includes(key) || (key === "yarrow" && fighter.yarrow);
    if (lines[key] && (carried || key === "spear" || key === "sword" || key === "staff")) {
      emit(lines[key]);
      return;
    }
    this.note = "You cannot see that.";
  }

  // A note. privateOnly stays off Jay's page when the speaker is someone else.
  reply(fighter, line, privateOnly) {
    fighter.privateNote = line;
    if (privateOnly && fighter.name !== "Jay") return;
    this.note = line;
  }

  // Admin commands other than embody. A non-admin gets You are not an admin.
  requireAdmin(fighter) {
    if (fighter.admin) return true;
    this.reply(fighter, "You are not an admin.");
    return false;
  }

  // The named body must already be in the session. Sight does not matter for admin and mute.
  bodyNamed(fighter, rawName, missing) {
    if (!rawName) {
      this.reply(fighter, missing);
      return null;
    }
    const target = this.by(rawName);
    if (!target) {
      this.reply(fighter, "There is nobody named that.");
      return null;
    }
    return target;
  }

  // Grant or remove admin. The engine id stays Jay. A display name does not remove it.
  tryAdmin(fighter, rawName, grant) {
    if (!this.requireAdmin(fighter)) return;
    const target = this.bodyNamed(fighter, rawName, "Name whom?");
    if (!target) return;
    target.admin = grant;
    this.reply(fighter, grant ? `${target.name} is an admin.` : `${target.name} is no longer an admin.`);
  }

  // Mute stops that body's say and tell. Unmute restores them.
  tryMute(fighter, rawName, mute) {
    if (!this.requireAdmin(fighter)) return;
    const target = this.bodyNamed(fighter, rawName, "Name whom?");
    if (!target) return;
    target.muted = mute;
    this.reply(fighter, mute ? `${target.name} is muted.` : `${target.name} is no longer muted.`);
  }

  // Who is muted, or none.
  tryMutes(fighter) {
    if (!this.requireAdmin(fighter)) return;
    const names = this.roster.filter((body) => body.muted).map((body) => body.name);
    this.reply(fighter, names.length ? `Muted: ${names.join(", ")}` : "Muted: none");
  }

  // Jay and other bodies, with admin or muted tags. One note line.
  tryWho(fighter) {
    const visible = this.roster
      .filter((body) => fightChebyshev(fighter.pos, body.pos) <= 5)
      .sort((a, b) => a.name.localeCompare(b.name));
    const parts = visible.map((body) => {
      const tags = [];
      if (body.admin) tags.push("admin");
      if (body.muted) tags.push("muted");
      const mark = tags.length ? `, ${tags.join(", ")}` : "";
      return `${body.name} ${body.pos.x},${body.pos.y}${mark}`;
    });
    this.reply(fighter, parts.join("  ·  "));
  }

  // Name says, "text". A slash with spaces adds a manner. Empty text is refused. Muted speech is not printed.
  trySay(fighter, text) {
    if (!text) {
      this.reply(fighter, "Say what?");
      return;
    }
    if (fighter.muted) {
      this.muteRefusal(fighter);
      return;
    }
    let spoken = text;
    let manner = "";
    const cut = text.lastIndexOf(" / ");
    if (cut !== -1) {
      spoken = text.slice(0, cut).trim();
      manner = text.slice(cut + 3).trim();
    }
    if (!spoken) {
      this.reply(fighter, "Say what?");
      return;
    }
    const name = fighter.called || fighter.name;
    const line = manner
      ? `${name} says ${manner}, "${spoken}"`
      : `${name} says, "${spoken}"`;
    this.speechLine(line);
  }

  // tell Name text, and only to a body you can see. Muted tell stays private.
  tryTell(fighter, rawName, text) {
    if (!rawName) {
      this.reply(fighter, "Tell them what?");
      return;
    }
    if (!text) {
      this.reply(fighter, "Tell them what?");
      return;
    }
    const target = this.by(rawName);
    if (!target || target.name === fighter.name) {
      this.reply(fighter, "You cannot see them.");
      return;
    }
    if (fighter.muted) {
      this.reply(fighter, "You are muted.", true);
      return;
    }
    const who = fighter.name === "Jay" ? "You tell" : `${fighter.name} tells`;
    this.print(`${who} ${target.name}, "${text}"`, "say");
  }

  // Framework hooks. Accepted, not built. They must not change the fight.
  tryFramework(fighter) {
    if (!this.requireAdmin(fighter)) return;
    let line = `Reserved: ${FRAMEWORK.join(", ")}`;
    if (fighter.name === "Jay" && this.tutorialStep === 10) {
      line += " They are not built yet.";
      this.advanceTutorial(10);
    }
    this.reply(fighter, line);
  }

  // kick, ban, and unban are admin only. login, connect, save, areas, and channel are reserved for everyone. None of them are built.
  tryReserved(fighter, op) {
    const hook = HOOKS[op];
    if (!hook) return false;
    if (hook.admin && !this.requireAdmin(fighter)) return true;
    this.reply(fighter, hookNote(hook.as));
    return true;
  }

  // Run one command as a body. Embody and release always check Jay. World edits refuse while embodied.
  apply(raw, actorName) {
    const fighter = this.by(actorName || "Jay");
    if (!fighter) return;
    const trimmed = raw.trim();
    const head = trimmed.split(/\s+/)[0].toLowerCase();
    const tail = trimmed.slice(head.length).trim();
    if (this.worldCommand(fighter, head, tail, trimmed)) return;
    const parts = trimmed.split(/\s+/);
    const op = (parts[0] || "").toLowerCase();
    const arg = parts[1];
    const rest = trimmed.slice(parts[0].length).trim();
    if (!op) return;
    if (op === "embody") {
      this.tryEmbody(arg);
      return;
    }
    if (op === "release") {
      this.tryRelease();
      return;
    }
    if (op === "emote") {
      this.tryEmote(fighter, rest);
      return;
    }
    if (op === "pose") {
      this.tryPose(fighter, rest);
      return;
    }
    if (op === "chi") {
      this.tryChi(fighter);
      return;
    }
    if (op === "craft") {
      this.tryCraft(fighter, rest);
      return;
    }
    if (op === "prompt") {
      this.note = this.promptLine();
      return;
    }
    if (op === "open" || op === "close") {
      this.tryEdge(arg, op === "open");
      return;
    }
    if (op === "reshape") {
      const how = (parts[2] || "").toLowerCase();
      if (how !== "open" && how !== "closed") {
        this.note = "reshape <dir> open or closed.";
        return;
      }
      this.tryEdge(arg, how === "open");
      return;
    }
    if (op === "say") {
      this.trySay(fighter, rest);
      return;
    }
    if (op === "talk") {
      this.tryTalk(fighter, rest, arg);
      return;
    }
    if (op === "name") {
      this.tryName(fighter, rest);
      return;
    }
    if (op === "describe" || op === "description") {
      if ((arg || "").toLowerCase() === "here") {
        this.tryDescribeHere(fighter, rest.slice(arg.length).trim());
        return;
      }
      const itemRest = rest.slice((arg || "").length).trim();
      if (arg && itemRest && ["spear", "sword", "staff", "yarrow", "token", "brace", "draught", "shard", "sign"].includes(arg.toLowerCase())) {
        this.tryDescribeItem(fighter, arg, itemRest);
        return;
      }
      this.tryDescribe(fighter, rest);
      return;
    }
    if (op === "score" || op === "sc") {
      this.tryScore(fighter);
      return;
    }
    if (op === "inventory" || op === "inv" || op === "i") {
      this.tryInventory(fighter);
      return;
    }
    if (op === "wield") {
      this.tryWield(fighter, arg);
      return;
    }
    if (op === "gather") {
      if ((arg || "").toLowerCase() === "shard") this.tryGatherShard(fighter);
      else this.tryGather(fighter);
      return;
    }
    if (op === "drink") {
      this.tryDrink(fighter, rest);
      return;
    }
    if (op === "routine") {
      this.tryRoutine(fighter, rest);
      return;
    }
    if (op === "levers") {
      this.tryLevers(fighter);
      return;
    }
    if (op === "exits" || op === "ex") {
      const words = this.exitWords(fighter.pos);
      this.note = `Exits: ${words.join(" ") || "none"}`;
      return;
    }
    if (op === "glance" || op === "gl") {
      const here = this.bodiesAt(fighter.pos.x, fighter.pos.y)
        .filter((body) => body.name !== fighter.name)
        .map((body) => `${body.name} is here.`);
      const exits = this.exitWords(fighter.pos).join(" ") || "none";
      const place = this.placeName(fighter.pos);
      const who = here.length ? ` ${here.join(" ")}` : "";
      this.note = `${fighter.pos.x},${fighter.pos.y} ${place}.${who} Exits: ${exits}`;
      return;
    }
    if (op === "where") {
      if (!arg) {
        const exits = this.exitWords(fighter.pos).join(" ") || "none";
        this.note = `You are on ${fighter.pos.x},${fighter.pos.y}, ${this.placeName(fighter.pos)}. Exits: ${exits}`;
        return;
      }
      const body = this.by(arg);
      if (!body || fightChebyshev(fighter.pos, body.pos) > 5) {
        this.note = "You cannot see them.";
        return;
      }
      this.note = `${body.name} is on ${body.pos.x},${body.pos.y}.`;
      return;
    }
    if (op === "brief") {
      this.verbose = false;
      this.note = "Brief mode.";
      return;
    }
    if (op === "verbose") {
      this.verbose = true;
      this.note = "Verbose mode.";
      return;
    }
    if (op === "tell") {
      const told = rest.slice((arg || "").length).trim();
      this.tryTell(fighter, arg, told);
      return;
    }
    if (op === "who") {
      this.tryWho(fighter);
      return;
    }
    if (op === "admin" || op === "adm") {
      this.tryAdmin(fighter, arg, true);
      return;
    }
    if (op === "unadmin") {
      this.tryAdmin(fighter, arg, false);
      return;
    }
    if (op === "mute") {
      this.tryMute(fighter, arg, true);
      return;
    }
    if (op === "unmute") {
      this.tryMute(fighter, arg, false);
      return;
    }
    if (op === "mutes") {
      this.tryMutes(fighter);
      return;
    }
    if (op === "framework") {
      this.tryFramework(fighter);
      return;
    }
    if (op === "tutorial") {
      this.note = this.tutorialHint();
      return;
    }
    if (this.tryReserved(fighter, op)) return;
    if (op === "look" || op === "l" || op === "examine" || op === "exa" || op === "exam") {
      if (arg || op === "examine" || op === "exa" || op === "exam") {
        this.examine(fighter, op === "look" || op === "l" ? rest : rest);
        return;
      }
      this.print(this.lookText(fighter), "look");
      this.moved = true;
      if (fighter.name === "Jay") this.advanceTutorial(1);
      return;
    }
    if (op === "guard") {
      if (arg === "on") this.guardOn = true;
      else if (arg === "off") this.guardOn = false;
      else this.guardOn = !this.guardOn;
      this.note = this.guardOn ? "Guard is on." : "Guard is off.";
      if (fighter.name === "Jay" && this.tutorialGuardHint && this.guardOn) this.advanceTutorial(7);
      return;
    }
    if (op === "execute" || op === "mercy") {
      this.finish(op, fighter.name);
      return;
    }
    if (op === "help" || op === "?" || op === "commands" || op === "cmds") {
      if (arg && (op === "help" || op === "?")) this.tryHelpTopic(arg);
      else this.note = HELP_INDEX;
      return;
    }
    if (op === "get" || op === "take" || op === "loot") {
      if ((op === "get" || op === "take") && (arg || "").toLowerCase() === "chi") {
        this.tryGetChi(fighter);
        return;
      }
      if ((op === "get" || op === "take") && this.tryGetShelf(fighter, arg)) return;
      this.note = "The corpse has no loot.";
      return;
    }
    if (op === "thrust" || op === "feint" || op === "interrupt") {
      this.tryThrust(fighter, op);
      return;
    }
    if (op === "dodge") {
      this.tryDodge(fighter, false);
      return;
    }
    if (op === "block") {
      this.tryBlock(fighter);
      return;
    }
    if (op === "step") {
      this.tryStep(fighter, arg);
      return;
    }
    if (op === "abort") {
      this.tryAbort(fighter);
      return;
    }
    if (op === "shove") {
      this.tryShove(fighter, arg);
      return;
    }
    if (op === "swap") {
      this.trySwap(fighter, arg);
      return;
    }
    if (op === "lock") {
      this.tryLock(fighter, arg);
      return;
    }
    if (op === "targets") {
      this.tryTargets(fighter);
      return;
    }
    if (op === "add") {
      this.tryAdd(fighter, rest);
      return;
    }
    if (op === "drop") {
      this.tryDrop(fighter, rest);
      return;
    }
    if (op === "priority") {
      this.tryPriority(rest);
      return;
    }
    if (op === "focus") {
      this.tryFocus(fighter, rest);
      return;
    }
    if (op === "auto") {
      this.tryAuto(rest);
      return;
    }
    if (op === "roll") {
      this.tryRoll(fighter, arg);
      return;
    }
    if (op === "hold" || op === "clear") {
      this.tryHold(fighter);
      return;
    }
    if (op === "riposte") {
      this.note = "This thrust is not riposteable.";
      return;
    }
    this.note = "Unknown command.";
  }

  // The player's line. Free commands run now. Fight commands wait for the tick. A direction is a step.
  input(raw) {
    const line = String(raw || "").trim();
    if (!line) return;
    const op = line.split(/\s+/)[0].toLowerCase();
    if (this.walkPlan) this.walkPlan = null;
    const immediate = new Set([
      "look", "guard", "execute", "mercy", "help", "get", "take", "loot", "riposte", "tutorial",
      "say", "talk", "tell", "who", "admin", "adm", "unadmin", "mute", "unmute", "mutes", "framework",
      "name", "describe", "description", "score", "sc", "inventory", "inv", "i", "wield",
      "routine", "levers", "l", "examine", "exa", "exam", "glance", "gl", "exits", "ex", "where",
      "help", "?", "commands", "cmds", "brief", "verbose",
      "embody", "release", "chi", "craft", "emote", "pose", "open", "close", "reshape", "prompt",
      "targets", "add", "drop", "priority", "focus", "auto",
      "walk", "path", "portal", "hub", "seeds", "quests", "search", "break", "set",
      "combine", "forge", "fletch", "cook", "brew", "skills", "known", "read", "raise", "rest", "tame", "mount",
      "dismount", "survey", "map", "time", "party", "keyword", "bind", "list",
      "buy", "sell", "gold", "trade", "eat", "rename", "generate", "heat",
      ...Object.keys(HOOKS),
    ]);
    const known = new Set([
      ...immediate,
      "thrust", "dodge", "block", "step", "abort", "shove", "swap", "lock",
      "roll", "hold", "clear", "feint", "interrupt", "gather", "drink", "go",
      "sprint", "climb", "ride", "in", "out", "down", "up",
      ...EXIT_ORDER, "north", "south", "east", "west", "northeast", "northwest", "southeast", "southwest",
    ]);
    if (op === ":" ) {
      this.apply(`emote ${line.slice(1).trim()}`, this.actorFor("emote"));
      return;
    }
    if (op === "'" || op === "\"") {
      this.apply(`say ${line.slice(1).trim()}`, this.actorFor("say"));
      return;
    }
    if (EXIT_ORDER.includes(op) || ["north", "south", "east", "west", "northeast", "northwest", "southeast", "southwest", "up", "down", "in", "out"].includes(op)) {
      this.queue.push({ line: `step ${op}`, actor: this.actorFor("step") });
      return;
    }
    if (op === "go") {
      const dir = (line.split(/\s+/)[1] || "").toLowerCase();
      if (!DIR_ALIAS[dir]) {
        this.note = "Unknown direction.";
        return;
      }
      this.queue.push({ line: `step ${dir}`, actor: this.actorFor("step") });
      return;
    }
    if (!known.has(op)) {
      this.note = "Unknown command.";
      return;
    }
    const actor = this.actorFor(op);
    if (immediate.has(op)) {
      this.apply(line, actor);
      return;
    }
    this.queue.push({ line, actor });
  }

  // Run a command as a named body. Used when an NPC is told to speak.
  order(name, raw) {
    this.apply(raw, name);
  }

  // No typed command. A telegraph aimed at this body outranks auto-attack while guard is on.
  idleAct() {
    const body = this.bodyNow();
    if (this.guardOn && this.telegraphAimedAt(body)) {
      this.runGuard(body);
      return;
    }
    if (this.autoOn && this.autoSwing(body)) return;
    if (this.guardOn) this.runGuard(body);
  }

  // Enemy telegraphs only. The body's own swing must not make guard dodge it.
  enemyTelegraphs(body) {
    return this.telegraphs.filter((entry) => {
      const attack = this.pending.find((item) => item.id === entry.id && !item.resolved);
      return attack && attack.attacker !== body.name;
    });
  }

  // True while a printed telegraph still covers this square. Answering it clears that line.
  telegraphAimedAt(body) {
    return this.telegraphs.some((entry) => {
      const attack = this.pending.find((item) => item.id === entry.id && !item.resolved);
      return Boolean(
        attack
        && attack.attacker !== body.name
        && attack.template.some((sq) => same(sq, body.pos))
      );
    });
  }

  // Guard reads enemy lines. Dodge when the latest one contains the word. Otherwise hold.
  runGuard(body) {
    const fighter = body || this.jay;
    const enemy = this.enemyTelegraphs(fighter);
    const lines = enemy.map((entry) => entry.text);
    this.lastFeed = lines.slice();
    const decision = guardDecision(lines, this.guardWord);
    if (decision === "dodge") {
      const ok = this.tryDodge(fighter, true);
      if (ok) this.telegraphs = [];
      return;
    }
    if (enemy.length) {
      const latest = enemy[enemy.length - 1];
      this.telegraphs = this.telegraphs.filter((entry) => entry !== latest);
    }
  }

  // Face the top row and thrust when that body is on the ray. Out of reach prints nothing.
  autoSwing(fighter) {
    const top = this.orderedTargets(fighter)[0];
    if (!top || !fighter || fighter.dead || fighter.practice) return false;
    const target = this.by(top.name);
    if (!target || target.dead || target.pacified) return false;
    const dx = target.pos.x - fighter.pos.x;
    const dy = target.pos.y - fighter.pos.y;
    if (!dx && !dy) return false;
    const facing = snapFacing(dx, dy);
    const covered = rayOf(fighter.pos, facing).some((sq) => same(sq, target.pos));
    if (!covered) return false;
    if (this.justAppeared.has(fighter.name) || this.finisher || fighter.pacified) return false;
    if (this.exchangeStopped || this.lockedIn(fighter) || this.acted.has(fighter.name)) return false;
    if (fighter.stamina <= 0) return false;
    fighter.lock = target.name;
    this.faceLock(fighter);
    this.tryThrust(fighter, "thrust");
    return true;
  }

  // The lurker thrusts while Jay is within threat. It does not act on the tick it appears, or while embodied.
  lurkerAct() {
    if (this.zone === "land") return;
    if (this.embodied === "Lurker") return;
    const lurker = this.lurker;
    const jay = this.jay;
    if (this.justAppeared.has("Lurker")) return;
    if (lurker.skipNext) {
      lurker.skipNext = false;
      this.note = "Lurker loses the beat.";
      return;
    }
    if (this.lockedIn(lurker) || this.acted.has("Lurker")) return;
    if (lurker.pacified) {
      if (lurker.mercyTick !== this.tick && this.outsideAllThreat(lurker)) this.acted.add("Lurker");
      return;
    }
    if (jay.pacified) return;
    if (fightChebyshev(lurker.pos, jay.pos) > THREAT) return;
    if (lurker.stamina <= 0) return;
    if (!lurker.lock) {
      if (this.exchangeStopped || !lurker.lock) {
        this.acted.add("Lurker");
        lurker.lock = "Jay";
        this.exchangeStopped = false;
        this.faceLock(lurker);
      }
      return;
    }
    if (this.exchangeStopped) return;
    if (this.pending.some((attack) => !attack.resolved && attack.attacker === "Lurker")) return;
    this.acted.add("Lurker");
    lurker.blocking = false;
    this.declare(lurker, "thrust");
  }

  // Put the lurker back on 2,2 when that square is free.
  sendLurkerHome() {
    const home = { x: LURKER_HOME.x, y: LURKER_HOME.y };
    if (this.squareFree(home, "Lurker")) this.lurker.pos = home;
  }

  // After a finisher, the lurker returns outside Jay's threat. 4,0 is the first try.
  lurkerRespawn() {
    const spots = [{ x: LURKER_RESPAWN.x, y: LURKER_RESPAWN.y }];
    for (let y = 0; y <= ARENA_Y; y += 1) {
      for (let x = 0; x <= ARENA_X; x += 1) spots.push({ x, y });
    }
    for (const sq of spots) {
      if (sq.x === RESPAWN.x && sq.y === RESPAWN.y) continue;
      if (fightChebyshev(sq, this.jay.pos) <= THREAT) continue;
      if (!this.squareFree(sq, "Lurker")) continue;
      return { x: sq.x, y: sq.y };
    }
    return { x: LURKER_RESPAWN.x, y: LURKER_RESPAWN.y };
  }

  // Jay's death square is 0,6, and only if that is outside the lurker's threat. Otherwise the lurker is sent home first.
  respawnFor(loser) {
    if (loser.name !== "Lurker") {
      if (fightChebyshev(RESPAWN, this.lurker.pos) <= THREAT) {
        loser.pos = { x: RESPAWN.x, y: RESPAWN.y };
        this.sendLurkerHome();
      }
      return { x: RESPAWN.x, y: RESPAWN.y };
    }
    return this.lurkerRespawn();
  }

  // Only the winner chooses. execute is the kill and pays that body's bounty. mercy pays nothing and drops nothing.
  finish(choice, chooser) {
    if (!this.finisher) {
      this.note = "Nobody has fallen.";
      return;
    }
    if (this.finisher.winner !== chooser) {
      this.note = "Only the winner chooses.";
      return;
    }
    const loser = this.by(this.finisher.loser);
    const death = { x: loser.pos.x, y: loser.pos.y };
    const verb = choice === "execute" ? "executed" : "shown mercy";
    this.print(`${loser.name} is ${verb}`, "finisher");
    if (choice === "execute") {
      const killer = this.by(chooser);
      const bounty = BOUNTY[loser.name] || 0;
      if (killer && bounty) {
        killer.chi = (killer.chi || 0) + bounty;
        this.print(`You take ${bounty} chi.`, "say");
      }
      // A killed NPC leaves no stain. The player, or the body being embodied, does.
      if (loser.name === "Jay" || loser.name === this.embodied) this.dropStain(loser, death);
      this.corpses.push({ x: death.x, y: death.y, born: this.tick, until: this.tick + 8 });
      loser.dead = true;
      loser.pacified = false;
    } else {
      loser.dead = false;
      loser.pacified = true;
      loser.mercyTick = this.tick;
    }
    loser.blocking = false;
    loser.lock = null;
    loser.momentum = 0;
    loser.pos = this.respawnFor(loser);
    this.justAppeared.add(loser.name);
    this.finisher = null;
    this.moved = true;
  }

  // Four ticks outside the lurker's threat send the lurker home and clear momentum. A practice swing is not cancelled.
  leashCheck() {
    if (this.zone === "land") return;
    if (this.finisher) {
      this.outsideRun = 0;
      return;
    }
    if (fightChebyshev(this.jay.pos, this.lurker.pos) <= THREAT) {
      this.outsideRun = 0;
      return;
    }
    this.outsideRun += 1;
    if (this.outsideRun < 4) return;
    this.outsideRun = 0;
    const pending = this.pending.some((attack) => !attack.resolved);
    const home = this.lurker.pos.x === LURKER_HOME.x && this.lurker.pos.y === LURKER_HOME.y;
    const canMove = !home && this.squareFree(LURKER_HOME, "Lurker");
    const changed = Boolean(this.lurker.lock || pending || this.jay.momentum || this.lurker.momentum || canMove);
    if (!changed) return;
    this.lurker.lock = null;
    this.lurker.blocking = false;
    for (const attack of this.pending) {
      // The practice post's swing is not the lurker's fight, so the leash leaves it.
      if (!attack.resolved && !attack.practice) {
        attack.resolved = true;
        this.dropTelegraph(attack.id);
      }
    }
    this.telegraphs = this.telegraphs.filter((entry) => {
      const attack = this.pending.find((item) => item.id === entry.id);
      return Boolean(attack && attack.practice && !attack.resolved);
    });
    this.jay.momentum = 0;
    this.lurker.momentum = 0;
    if (this.squareFree(LURKER_HOME, "Lurker")) {
      this.lurker.pos = { x: LURKER_HOME.x, y: LURKER_HOME.y };
    }
    this.moved = true;
    this.print("The lurker is leashed.", "leash");
  }

  // Mercy lasts through the tick it was given. A later spent tick outside all threat ends it.
  pacifyCheck(t) {
    for (const fighter of this.roster) {
      if (!fighter.pacified || fighter.mercyTick === t) continue;
      if (!this.acted.has(fighter.name)) continue;
      if (!this.outsideAllThreat(fighter)) continue;
      fighter.pacified = false;
      this.note = `${fighter.name} is no longer pacified.`;
    }
  }

  // While the exchange is stopped, only execute, mercy, look, and guard run. Anything else is refused.
  duringFinisher(cmd) {
    const op = cmd.split(/\s+/)[0].toLowerCase();
    if (op === "execute" || op === "mercy") this.finish(op, "Jay");
    else if (op === "look" || op === "guard") this.apply(cmd, "Jay");
    else this.note = "The exchange has stopped.";
  }

  // One tick. Resolve due swings, let the lurker and hamlet act, then the queued command or guard. The lurker's win is mercy, not a kill.
  advance() {
    const t = this.tick;
    this.moved = false;
    const start = this.log.length;
    this.acted = new Set();
    this.expireBleed();
    this.resolveDue(t, new Set(["thrust", "feint", "arc", "cleave", "sweep", "burst"]));
    // The lurker does not execute. A lurker win is mercy, so it grants no chi.
    if (this.finisher && this.finisher.winner === "Lurker") this.finish("mercy", "Lurker");
    this.expireCorpses(t);
    const aggroBefore = this.aggroCount(this.bodyNow());
    if (!this.finisher) {
      this.lurkerAct();
      this.hamletAct();
      this.maybePracticeTelegraph();
      this.landThreatAct();
    }
    const aggroJoined = this.aggroCount(this.bodyNow()) > aggroBefore;
    const queued = this.queue.shift();
    const cmd = queued && (queued.line || queued);
    const actor = queued && queued.actor ? queued.actor : "Jay";
    const walker = this.bodyNow();
    const stopWalk = this.walkPlan && this.zone === "castle"
      ? false
      : this.walkPlan && (this.telegraphAimedAt(walker) || aggroJoined);
    if (this.finisher) {
      if (cmd) this.duringFinisher(cmd);
    } else if (cmd) this.apply(cmd, actor);
    else if (stopWalk) {
      this.walkPlan = null;
      this.note = "You stop walking.";
      this.idleAct();
    } else if (this.walkPlan && this.walkPlan.length) {
      this.takeWalkStep(walker);
    } else this.idleAct();
    this.resolveDue(t, new Set(["interrupt"]));
    // The lurker does not execute. A lurker win is mercy, so it grants no chi.
    if (this.finisher && this.finisher.winner === "Lurker") this.finish("mercy", "Lurker");
    this.leashCheck();
    this.pacifyCheck(t);
    this.justAppeared.clear();
    if (this.philter > 0) this.philter -= 1;
    this.tick = t + 1;
    return this.log.slice(start).map((entry) => entry.text);
  }

  // A body that appears mid-window cannot act until the next tick.
  spawnAlly(name, x, y) {
    const ally = makeFighter(name, x, y, "S", null);
    ally.gear = [];
    ally.allies.add("Jay");
    this.jay.allies.add(name);
    this.roster.push(ally);
    this.justAppeared.add(name);
    this.moved = true;
    return ally;
  }

  // The arena grid printed by look. Hamlet look does not use this.
  gridText() {
    const rows = ["  0 1 2 3 4"];
    for (let y = 0; y <= ARENA_Y; y += 1) {
      let row = String(y);
      for (let x = 0; x <= ARENA_X; x += 1) {
        const bodies = this.bodiesAt(x, y);
        let mark = this.corpseAt({ x, y }) ? "#" : ".";
        if (bodies.length === 1) {
          if (bodies[0].name === "Jay") mark = "J";
          else if (bodies[0].name === "Lurker") mark = "L";
          else mark = bodies[0].name.slice(0, 1);
        } else if (bodies.length > 1) mark = "+";
        row += ` ${mark}`;
      }
      rows.push(row);
    }
    const guard = this.guardOn ? "on" : "off";
    rows.push(`Jay  stamina ${this.jay.stamina}  momentum ${this.jay.momentum}  guard ${guard}`);
    return rows.join("\n");
  }

  // The castle is pacified outside the arena and the tutorial. A land is not.
  castlePeace(pos) {
    if (!pos || this.zone === "land") return false;
    const info = this.placeInfo(pos);
    const place = info ? info.place : "";
    return place !== "arena" && place !== "tutorial";
  }

  bodyOnThisMap(body) {
    if (!body || body.name === "Jay") return true;
    if (this.zone === "land") return Boolean(body.landBody);
    return !body.landBody;
  }

  castleProse(pos) {
    if (UPPER[cellKey(pos.x, pos.y)]) return true;
    return pos.y >= 27 && pos.y <= 33 && pos.x >= 0 && pos.x <= 8;
  }

  specialExits(pos) {
    if (this.zone === "land") return [];
    const out = [];
    if (pos.x === L4.x && pos.y === L4.y) out.push({ dir: "up", pos: { x: COURT.x, y: COURT.y } });
    if (pos.x === COURT.x && pos.y === COURT.y) out.push({ dir: "down", pos: { x: L4.x, y: L4.y } });
    return out;
  }

  specialStep(pos, word) {
    const hit = this.specialExits(pos).find((edge) => edge.dir === word);
    return hit ? hit.pos : null;
  }

  roomNumber(pos) {
    if (!pos) return null;
    if (this.zone === "land" && this.land) return RegionGen.landRoom(pos.x, pos.y);
    const upper = UPPER[cellKey(pos.x, pos.y)];
    if (upper) return upper.n;
    if (pos.y >= 27 && pos.y <= 33 && pos.x >= 0 && pos.x <= 8) return (pos.y - 27) * 9 + pos.x;
    if (pos.x >= 0 && pos.x <= 4 && pos.y >= 0 && pos.y <= 6) return 400 + pos.y * 5 + pos.x;
    if (pos.x < 0) return 460 + (pos.x + 5) * 10 + pos.y;
    return null;
  }

  roomLine(pos) {
    const n = this.roomNumber(pos);
    return n == null ? "" : `room ${n}`;
  }

  aggroCount(fighter) {
    if (!fighter) return 0;
    return this.rowsFor(fighter.name).filter((row) => row.why === "aggro").length;
  }

  landLook(who) {
    const pos = who.pos;
    const world = this.land.world;
    const lines = RegionGen.lookLines(
      world, pos.x, pos.y, this.land.era, this.land.clock,
      this.layer, this.hillRoom, this.land.nightCount, this.land.hunger, null,
    );
    const room = this.roomLine(pos);
    if (room) lines.splice(1, 0, room);
    lines.push(`Exits: ${this.exitWords(pos).join(" ") || "none"}`);
    return lines.join("\n");
  }

  landThreatAct() {
    // Generated monsters join the target table when they attack.
    // No roster is invented while that section is absent from the spec.
  }

  takeWalkStep(fighter) {
    const dir = this.walkPlan[0];
    const before = { x: fighter.pos.x, y: fighter.pos.y };
    this.tryStep(fighter, dir);
    if (fighter.pos.x === before.x && fighter.pos.y === before.y) {
      this.walkPlan = null;
      this.note = "The path broke.";
      return;
    }
    this.walkPlan.shift();
    if (!this.walkPlan.length) {
      this.walkPlan = null;
      this.note = "You arrive.";
    }
  }

  passable(pos, dest, facing) {
    if (this.edgeClosed(pos, dest) || !this.inBounds(dest) || this.corpseAt(dest)) return false;
    if (this.blockedStep(this.bodyNow(), dest)) return false;
    if (facing) {
      const [dx, dy] = DIRS[facing];
      if (dx && dy) {
        if (!this.inBounds({ x: pos.x, y: dest.y }) || !this.inBounds({ x: dest.x, y: pos.y })) return false;
      }
    }
    return true;
  }

  neighborsOf(pos) {
    const edges = [];
    for (const word of EXIT_ORDER) {
      const facing = DIR_ALIAS[word];
      const dest = this.stepDest(pos, facing);
      if (!this.passable(pos, dest, facing)) continue;
      edges.push({ dir: word, pos: dest });
    }
    for (const edge of this.specialExits(pos)) {
      if (this.passable(pos, edge.pos, null)) edges.push(edge);
    }
    return edges;
  }

  routeTo(goal) {
    const start = this.bodyNow().pos;
    const key = (sq) => `${sq.x},${sq.y}`;
    const prev = new Map();
    const queue = [start];
    prev.set(key(start), null);
    let found = null;
    while (queue.length) {
      const cur = queue.shift();
      if (cur.x === goal.x && cur.y === goal.y) {
        found = cur;
        break;
      }
      for (const edge of this.neighborsOf(cur)) {
        const id = key(edge.pos);
        if (prev.has(id)) continue;
        prev.set(id, { from: cur, dir: edge.dir });
        queue.push(edge.pos);
      }
    }
    if (!found) return null;
    const steps = [];
    let cursor = key(found);
    while (prev.get(cursor)) {
      const hop = prev.get(cursor);
      steps.push(hop.dir);
      cursor = key(hop.from);
    }
    steps.reverse();
    return steps;
  }

  catalog() {
    const rows = [];
    const push = (name, pos) => {
      if (!pos) return;
      const n = this.roomNumber(pos);
      if (n == null) return;
      rows.push({ name, n, pos });
    };
    if (this.zone === "land" && this.land) {
      const sites = this.land.world.sites;
      push("village", sites.fairest);
      push("guest", sites.guest);
      push("post", sites.post);
      push("hill", sites.hill);
      if (sites.inn) push("inn", sites.inn);
      sites.mills.forEach((cell, i) => push(sites.mills.length > 1 ? `mill ${i + 1}` : "mill", cell));
      sites.shrines.forEach((cell, i) => push(sites.shrines.length > 1 ? `shrine ${i + 1}` : "shrine", cell));
      return rows;
    }
    push("court", COURT);
    push("hall", { x: 11, y: 10 });
    push("market", { x: 12, y: 10 });
    push("gallery", { x: 11, y: 11 });
    push("rampart", { x: 10, y: 11 });
    if (this.secrets.solar) push("solar", { x: 11, y: 9 });
    if (this.secrets.archive) push("archive", { x: 12, y: 11 });
    if (this.secrets.chapel) push("chapel", { x: 9, y: 11 });
    push("L4", L4);
    push("G2", { x: 2, y: 28 });
    push("G8", { x: 8, y: 28 });
    push("cottage", { x: 1, y: 31 });
    push("yard", { x: 4, y: 31 });
    return rows;
  }

  findOnThisMap(token) {
    const book = this.zone === "land" ? "land" : "castle";
    if (/^\d+$/.test(token)) {
      const n = Number(token);
      const landNumber = n >= 10000 && n <= 10000 + RegionGen.W * RegionGen.H - 1;
      if (book === "castle" && landNumber) return { error: "The room is not on this map." };
      if (book === "land" && !landNumber) return { error: "The room is not on this map." };
      if (book === "land" && this.land) {
        const y = Math.floor((n - 10000) / RegionGen.W);
        const x = (n - 10000) % RegionGen.W;
        if (x >= 0 && x < RegionGen.W && y >= 0 && y < RegionGen.H) {
          return { pos: { x, y }, name: String(n) };
        }
        return { error: "The room is not on this map." };
      }
      const upper = Object.entries(UPPER).find(([, room]) => room.n === n);
      if (upper) {
        const [x, y] = upper[0].split(",").map(Number);
        return { pos: { x, y }, name: upper[1].name };
      }
      if (n >= 0 && n <= 62) {
        const row = Math.floor(n / 9);
        const col = n % 9;
        return { pos: { x: col, y: 27 + row }, name: String(n) };
      }
      if (n >= 400 && n <= 434) {
        const local = n - 400;
        return { pos: { x: local % 5, y: Math.floor(local / 5) }, name: String(n) };
      }
      return { error: "The room is not on this map." };
    }
    const key = token.toLowerCase();
    const hits = this.catalog().filter((row) => row.name.toLowerCase() === key);
    if (!hits.length) return { error: "There is no place by that name." };
    if (hits.length > 1) return { error: hits.map((row) => `${row.name} ${row.n}`).join("\n") };
    return { pos: hits[0].pos, name: hits[0].name };
  }

  // Commands that belong to the castle, the gate, and the pack.
  worldCommand(fighter, op, rest) {
    const gateWords = new Set([
      "portal", "hub", "seeds", "quests", "walk", "path", "search", "break", "set",
      "combine", "forge", "fletch", "cook", "brew", "skills", "known", "read", "raise", "rest", "tame", "mount",
      "dismount", "survey", "map", "time", "party", "keyword", "bind", "list",
      "buy", "sell", "gold", "trade", "eat", "rename", "sprint", "climb", "ride",
      "generate", "heat",
    ]);
    if (!gateWords.has(op)) return false;
    if (op === "portal") this.tryPortal(fighter, rest);
    else if (op === "set") this.trySet(fighter, rest);
    else if (op === "hub") this.tryHub();
    else if (op === "seeds") this.trySeeds();
    else if (op === "quests") this.tryQuests();
    else if (op === "walk") this.tryWalk(rest, true);
    else if (op === "path") this.tryWalk(rest, false);
    else if (op === "search") this.trySearch(fighter);
    else if (op === "break") this.tryBreak(fighter, rest);
    else if (op === "combine") this.tryCombine(rest);
    else if (op === "forge") this.tryForge(fighter, rest);
    else if (op === "fletch") this.tryFletch(fighter, rest);
    else if (op === "cook") this.tryCook(fighter, rest);
    else if (op === "brew") this.tryBrew(fighter, rest);
    else if (op === "eat") this.tryEat(fighter, rest);
    else if (op === "skills") this.trySkills();
    else if (op === "known") this.tryKnown();
    else if (op === "read") this.tryRead(fighter, rest);
    else if (op === "raise") this.tryRaise(fighter, rest);
    else if (op === "rest") this.tryRest(fighter);
    else if (op === "rename") this.tryRename(fighter, rest);
    else if (op === "sprint") this.trySprint(fighter, rest);
    else if (op === "climb") this.tryClimb(fighter);
    else if (op === "party") this.note = "A party is for the later MUD.";
    else if (op === "gold") this.note = `Gold ${this.gold}.`;
    else if (op === "trade") this.note = "Not here.";
    else if (op === "time") this.tryTime();
    else if (op === "map") this.tryMap();
    else if (op === "survey") this.trySurvey();
    else if (op === "list") this.tryList(fighter);
    else if (op === "buy") this.tryBuy(fighter, rest);
    else if (op === "sell") this.trySell(fighter, rest);
    else if (op === "tame") this.tryTame(fighter);
    else if (op === "mount") this.tryMount(fighter);
    else if (op === "dismount") this.tryDismount(fighter);
    else if (op === "ride") this.tryRide(fighter, rest);
    else if (op === "bind") this.tryBind(fighter);
    else if (op === "keyword") this.tryKeyword(fighter, rest);
    else if (op === "generate" || op === "heat") this.note = this.zone === "land" ? "The field is quiet." : "The castle has no field.";
    return true;
  }

  tryPortal(fighter, rest) {
    if (this.zone === "land") {
      this.note = "The gate is in the castle.";
      return;
    }
    if (this.placeName(fighter.pos) !== "court") {
      this.note = "The gate is in the court.";
      return;
    }
    const parts = String(rest || "").trim().split(/\s+/).filter(Boolean);
    const book = WORD_BOOK;
    let weight;
    let digits;
    let spoken;
    let wordIndexes = null;
    if (book.length === GATE_BOOK_LEN) {
      const unique = [...new Set(parts.map((word) => word.toLowerCase()))];
      if (!unique.length || unique.length > 3) {
        this.note = "The gate does not know that name.";
        return;
      }
      for (const word of unique) {
        if (!this.gateHeld.has(word)) {
          this.note = "The gate does not know that name.";
          return;
        }
      }
      wordIndexes = unique.map((word) => book.indexOf(word));
      if (wordIndexes.some((n) => n < 0)) {
        this.note = "The gate does not know that name.";
        return;
      }
      weight = portalWeight(wordIndexes);
      digits = weightDigits(weight);
      spoken = unique.join(" ");
    } else {
      const unique = [...new Set(parts.map((word) => word.toLowerCase()))];
      if (unique.length !== 1 || unique[0] !== "oak") {
        this.note = "The gate does not know that name.";
        return;
      }
      spoken = "oak";
      wordIndexes = [0];
      weight = portalWeight(wordIndexes);
      digits = weightDigits(weight);
    }
    let rec = this.byWeight.get(digits);
    if (!rec) {
      rec = { digits, spoken, patches: [], open: false, stain: 0 };
      this.byWeight.set(digits, rec);
      this.seeds.push(rec);
    }
    const heldIndexes = this.gateHeldIndexes();
    const world = RegionGen.buildWorld(digits, rec.patches, weight, wordIndexes, heldIndexes);
    this.land = {
      digits,
      spoken: rec.spoken,
      world,
      era: "now",
      clock: "day",
      nightCount: 0,
      hunger: null,
      pieceTaken: false,
    };
    this.zone = "land";
    this.layer = "surface";
    this.hillRoom = 0;
    rec.open = true;
    const you = world.sites.fairest || { x: 0, y: 0 };
    fighter.pos = { x: you.x, y: you.y };
    this.moved = true;
    if (rec.bound && rec.bound.text) this.squareText.set(rec.bound.key, rec.bound.text);
    rec.memory = {};
    const room = RegionGen.landRoom(you.x, you.y);
    const lines = [
      `You speak ${spoken}.`,
      `This name weighs ${digits}.`,
      "You step through. This land is PvP.",
      `you (${you.x},${you.y})`,
      `room ${room}`,
      "hub returns you to the castle.",
    ];
    if (rec.collapsed) {
      lines.push("The land has returned to its name.");
      lines.push("People here do not remember you.");
    }
    this.note = lines.join("\n");
  }

  // A collapse drops the land's memory of the player. Finished quests stay on the player.
  forgetLand(rec) {
    if (this.land && this.land.edits) {
      for (const key of this.land.edits) {
        if (rec && rec.bound && rec.bound.key === key) continue;
        this.squareText.delete(key);
      }
    }
    if (rec) {
      rec.open = false;
      rec.collapsed = true;
      rec.memory = {};
    }
  }

  tryQuests() {
    const open = this.quests.filter((line) => !String(line).endsWith("done"));
    const done = this.questsDone.map((line) => (String(line).endsWith("done") ? line : `${line} done`));
    const rows = open.concat(done);
    if (!rows.length) {
      this.note = "quests 0";
      return;
    }
    this.note = [`quests ${rows.length}`, ...rows].join("\n");
  }

  tryHub() {
    if (this.zone !== "land") {
      this.note = "You are in the castle.";
      return;
    }
    const digits = this.land.digits;
    const rec = this.byWeight.get(digits);
    if (rec && rec.stain) {
      this.note = `You return to the castle.\nThe castle is peaceful.\nYour chi is still a stain in ${digits}. That land does not collapse.`;
    } else {
      this.forgetLand(rec);
      this.note = "You return to the castle.\nThe castle is peaceful.\nThis land collapses. Chi edits there are gone, and the chi is not returned. A chi edit in the castle lasts.\nGold, gear, and gathered material stay with you.\nThe land has returned to its name.";
    }
    this.zone = "castle";
    this.land = null;
    this.layer = "surface";
    this.jay.pos = { x: COURT.x, y: COURT.y };
    if (this.horse && this.horse.tamed) {
      this.horse.mounted = false;
      this.horse.stabled = true;
    }
    this.wildHorse = null;
    this.moved = true;
  }

  trySeeds() {
    if (!this.seeds.length) {
      this.note = "seeds 0";
      return;
    }
    const lines = [`seeds ${this.seeds.length}`];
    for (const rec of this.seeds) {
      const here = this.zone === "land" && this.land && this.land.digits === rec.digits ? " here" : "";
      lines.push(`${rec.spoken} ${rec.digits}${here}`);
    }
    this.note = lines.join("\n");
  }

  tryWalk(rest, go) {
    const token = String(rest || "").trim();
    if (!token) {
      const rows = this.catalog();
      this.note = rows.length ? rows.map((row) => `${row.name} ${row.n}`).join("\n") : "No places.";
      return;
    }
    const found = this.findOnThisMap(token);
    if (found.error) {
      this.note = found.error;
      return;
    }
    const steps = this.routeTo(found.pos);
    if (!steps) {
      this.note = "There is no path.";
      return;
    }
    if (!steps.length) {
      this.note = "You are already there.";
      return;
    }
    if (!go) {
      this.note = steps.join(" ");
      return;
    }
    this.walkPlan = steps;
    this.note = `You start walking. ${steps.join(" ")}`;
  }

  trySet(fighter, rest) {
    if (this.zone === "land") {
      this.note = "The gate is in the castle.";
      return;
    }
    if (this.placeName(fighter.pos) !== "court") {
      this.note = "The gate is in the court.";
      return;
    }
    const spoken = String(rest || "").trim().toLowerCase().split(/\s+/).filter(Boolean)[0] || "";
    const word = spoken || this.foundPiece || "";
    const carrying = word && (this.foundPiece === word || (this.bag[word] || 0) > 0);
    if (!word || !carrying) {
      this.note = "You are not carrying a piece.";
      return;
    }
    if (WORD_BOOK.indexOf(word) < 0) {
      this.note = "The gate does not know that name.";
      return;
    }
    if (this.gateHeld.has(word)) {
      this.note = "The gate already holds that word.";
      return;
    }
    this.gatePieces.push(word);
    this.gateHeld.add(word);
    if (this.foundPiece === word) this.foundPiece = null;
    if (this.bag[word]) {
      this.bag[word] -= 1;
      if (this.bag[word] <= 0) delete this.bag[word];
    }
    this.note = `You set ${word} into the gate.`;
  }

  trySearch(fighter) {
    if (this.zone === "land" && this.land && this.land.world && WORD_BOOK.length === GATE_BOOK_LEN) {
      const { pieceCell, pieceIndex } = this.land.world;
      const word = WORD_BOOK[pieceIndex];
      if (
        word
        && !this.land.pieceTaken
        && fighter.pos.x === pieceCell.x
        && fighter.pos.y === pieceCell.y
      ) {
        this.land.pieceTaken = true;
        this.foundPiece = word;
        this.bag[word] = (this.bag[word] || 0) + 1;
        this.note = `You find the word ${word}.`;
        return;
      }
    }
    const place = this.placeInfo(fighter.pos);
    const name = place ? place.place : "";
    const openSecret = (key, edge) => {
      if (this.secrets[key]) {
        this.note = "You find nothing.";
        return;
      }
      this.secrets[key] = true;
      this.closedEdges.delete(this.edgeKey(edge[0], edge[1]));
      this.note = "A door was set into the wall.";
    };
    if (name === "hall") openSecret("solar", SECRET_EDGES[0]);
    else if (name === "gallery") openSecret("archive", SECRET_EDGES[1]);
    else if (name === "rampart") openSecret("chapel", SECRET_EDGES[2]);
    else this.note = "You find nothing.";
  }

  carryingRelic(fighter, name) {
    return (fighter.carried || []).includes(name);
  }

  tryBreak(fighter, rest) {
    const name = String(rest || "").trim().toLowerCase();
    if (!["book", "candle", "relic"].includes(name) || !this.carryingRelic(fighter, name)) {
      this.note = "You are not carrying that.";
      return;
    }
    fighter.carried = fighter.carried.filter((item) => item !== name);
    this.parts.ash += 1;
    this.parts.setting += 1;
    this.parts.splinter += 1;
    this.skills.artifice += 1;
    this.note = "You break it. You take ash, a setting, and a splinter.";
  }

  tryCombine(rest) {
    const fighter = this.bodyNow();
    const parts = String(rest || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (parts.length !== 2) {
      this.note = "combine <a> <b>.";
      return;
    }
    const [a, b] = parts;
    if (a === b) {
      this.note = "Nothing comes of that.";
      return;
    }
    const key = [a, b].sort().join("+");
    const made = COMBINE.get(key);
    if (!made) {
      this.note = "Nothing comes of that.";
      return;
    }
    if (made === "stone") {
      if (this.have(fighter, "stone")) {
        this.note = "You already carry the stone.";
        return;
      }
      if (this.skills.alchemy < 6) {
        this.note = "Nothing comes of that.";
        return;
      }
    }
    const needs = [[a, 1], [b, 1]];
    if (!this.payNeeds(fighter, needs)) return;
    this.spendNeeds(fighter, needs);
    this.giveMat(made, 1);
    if (made === "stone") {
      if (!this.known.includes("stone")) {
        this.known.push("stone");
        this.skills.alchemy += 4;
      }
    } else {
      const art = ["grey wash", "glass", "graver", "bitter salt"].includes(made);
      this.rememberMake("alchemy", made, art);
    }
    this.note = `You make ${made}.`;
  }

  tryForge(fighter, rest) {
    if (!this.station(fighter, "forge")) return;
    const which = String(rest || "").trim().toLowerCase();
    if (which === "unique" || which.startsWith("unique")) {
      this.note = "You cannot make that.";
      return;
    }
    const row = FORGE.find((item) => item.name === which);
    if (!row) {
      this.note = "Forge what?";
      return;
    }
    if (this.skills.forging < row.rank) {
      this.note = "You cannot make that yet.";
      return;
    }
    if (row.tool && !this.have(fighter, row.tool)) {
      this.note = `You need 1 ${row.tool}. You have 0 ${row.tool}.`;
      return;
    }
    if (!this.payNeeds(fighter, row.needs)) return;
    this.spendNeeds(fighter, row.needs);
    this.giveMat(row.result, 1);
    this.rememberMake("forging", row.result, false);
    this.note = `You forge ${row.result}.`;
  }

  tryFletch(fighter, rest) {
    if (!this.station(fighter, "fletch")) return;
    const which = String(rest || "").trim().toLowerCase();
    const row = FLETCH.find((item) => item.name === which);
    if (!row) {
      this.note = "Fletch what?";
      return;
    }
    if (this.skills.fletching < row.rank) {
      this.note = "You cannot make that yet.";
      return;
    }
    if (row.alt) {
      const pick = row.alt.find((name) => this.have(fighter, name) >= 1);
      if (!pick) {
        this.note = `You need 1 ${row.alt[0]}. You have 0 ${row.alt[0]}.`;
        return;
      }
      this.takeMat(fighter, pick, 1);
      this.giveMat(row.result, 1);
      this.rememberMake("fletching", row.result, false);
      this.note = `You fletch ${row.result}.`;
      return;
    }
    if (!this.payNeeds(fighter, row.needs)) return;
    this.spendNeeds(fighter, row.needs);
    this.giveMat(row.result, row.count || 1);
    this.rememberMake("fletching", row.result, false);
    this.note = `You fletch ${row.result}.`;
  }

  tryCook(fighter, rest) {
    if (!this.station(fighter, "cook")) return;
    const which = String(rest || "").trim().toLowerCase();
    const row = COOK.find((item) => item.name === which);
    if (!row) {
      this.note = "Cook what?";
      return;
    }
    if (this.skills.cooking < row.rank) {
      this.note = "You cannot make that yet.";
      return;
    }
    if (!this.payNeeds(fighter, row.needs)) return;
    this.spendNeeds(fighter, row.needs);
    this.giveMat(row.result, 1);
    this.rememberMake("cooking", row.result, false);
    this.note = `You cook ${row.result}.`;
  }

  tryBrew(fighter, rest) {
    if (!this.station(fighter, "brew")) return;
    const which = String(rest || "").trim().toLowerCase();
    const row = BREW.find((item) => item.name === which);
    if (!row) {
      this.note = "Brew what?";
      return;
    }
    if (this.skills.brewing < row.rank) {
      this.note = "You cannot make that yet.";
      return;
    }
    if (!this.payNeeds(fighter, row.needs)) return;
    this.spendNeeds(fighter, row.needs);
    this.giveMat(row.result, 1);
    this.rememberMake("brewing", row.result, false);
    this.note = `You brew ${row.result}.`;
  }

  tryEat(fighter, rest) {
    const name = String(rest || "").trim().toLowerCase();
    const row = COOK.find((item) => item.result === name);
    if (!row || !this.have(fighter, name)) {
      this.note = "There is nothing to eat.";
      return;
    }
    if (!this.begin(fighter, "eat")) return;
    this.commit(fighter);
    this.takeMat(fighter, name, 1);
    fighter.stamina = Math.min(100, fighter.stamina + row.stamina);
    this.note = `You eat ${name}.`;
  }

  trySkills() {
    const s = this.skills;
    this.note = `forging ${s.forging}, fletching ${s.fletching}, alchemy ${s.alchemy}, artifice ${s.artifice}, cooking ${s.cooking}, brewing ${s.brewing}`;
  }

  tryKnown() {
    this.note = this.known.length ? this.known.join("\n") : "known 0";
  }

  tryRead(fighter, rest) {
    const name = String(rest || "book").trim().toLowerCase();
    if (name === "book") {
      const hasBook = this.carryingRelic(fighter, "book") || (this.placeName(fighter.pos) === "chapel" && this.castleRelics["9,11"] === "book");
      if (!hasBook) {
        this.note = "You have no book.";
        return;
      }
      this.note = "The book stays closed.";
      return;
    }
    if (name === "folio") {
      const here = this.placeName(fighter.pos) === "archive" && this.folioHere;
      if (!this.have(fighter, "folio") && !here && !(fighter.carried || []).includes("folio")) {
        this.note = "There is nothing to read.";
        return;
      }
      this.note = FOLIO_PAGE;
      return;
    }
    if (name === "scrap") {
      if (!this.have(fighter, "scrap") && !(fighter.carried || []).includes("scrap")) {
        this.note = "There is nothing to read.";
        return;
      }
      this.note = SCRAP_PAGE;
      return;
    }
    this.note = "There is nothing to read.";
  }

  atFont(fighter) {
    return this.zone !== "land" && this.placeName(fighter.pos) === "court";
  }

  tryRaise(fighter, rest) {
    if (!this.atFont(fighter)) {
      this.note = "The font is in the court.";
      return;
    }
    const which = String(rest || "").trim().toLowerCase();
    const costOf = (stat) => stat + 1;
    if (!which) {
      const s = this.stats;
      this.note = `stamina ${s.stamina}, next ${costOf(s.stamina)} chi. bearing ${s.bearing}, next ${costOf(s.bearing)} chi. hand ${s.hand}, next ${costOf(s.hand)} chi.`;
      return;
    }
    if (!["stamina", "bearing", "hand"].includes(which)) {
      this.note = "raise stamina, bearing, or hand.";
      return;
    }
    const cost = costOf(this.stats[which]);
    if (!this.spendChi(fighter, cost)) return;
    this.stats[which] += 1;
    if (which === "stamina") fighter.stamina = Math.min(STAMINA_MAX + this.stats.stamina * 5, fighter.stamina + 5);
    this.note = `You spend ${cost} chi. ${which} is ${this.stats[which]}.`;
  }

  tryRest(fighter) {
    if (!this.atFont(fighter)) {
      this.note = "The font is in the court.";
      return;
    }
    fighter.stamina = STAMINA_MAX + this.stats.stamina * 5;
    fighter.momentum = 0;
    fighter.bleed = null;
    this.note = "You rest at the font.";
  }

  tryRename(fighter, rest) {
    if (this.zone === "land") {
      this.note = "Chi cannot change a seed's weight.";
      return;
    }
    const text = String(rest || "").trim();
    if (!text) {
      this.note = "Rename it to what?";
      return;
    }
    if (!this.spendChi(fighter, CHI_DESCRIBE)) return;
    const n = this.roomNumber(fighter.pos);
    this.roomNames.set(n, text);
    this.note = `You spend ${CHI_DESCRIBE} chi. This room is now called ${text}.`;
  }

  trySprint(fighter, rest) {
    const word = String(rest || "").trim().toLowerCase();
    const facing = DIR_ALIAS[word];
    if (!facing) {
      this.note = "Unknown direction.";
      return;
    }
    if (!this.begin(fighter, "sprint")) return;
    if (fighter.stamina < COST_STEP) {
      this.note = `${fighter.name} has no stamina.`;
      return;
    }
    const first = this.stepDest(fighter.pos, facing);
    if (!this.passable(fighter.pos, first, facing)) {
      this.note = "That square is closed.";
      return;
    }
    const second = this.stepDest(first, facing);
    const far = this.passable(first, second, facing);
    this.commit(fighter);
    fighter.stamina -= COST_STEP;
    fighter.pos = far ? second : first;
    this.moved = true;
    if (this.wildHorse && fightChebyshev(fighter.pos, this.wildHorse) <= 1) {
      this.wildHorse = null;
      this.note = "The horse spooks.";
    }
    this.print(`${fighter.name} sprints ${DIR_WORD[facing]}.`, "step");
  }

  tryClimb(fighter) {
    if (fighter.stamina <= 0) {
      this.shift(fighter.name, -15, fighter.name);
      this.note = "You drop.";
      return;
    }
    if (!this.begin(fighter, "climb")) return;
    if (fighter.stamina < COST_DODGE) {
      this.note = `${fighter.name} has no stamina.`;
      return;
    }
    this.commit(fighter);
    fighter.stamina -= COST_DODGE;
    if (this.zone === "land" && this.layer === "surface") this.layer = "indoors";
    else if (this.layer === "indoors") this.layer = "cellar";
    this.note = `${fighter.name} climbs.`;
  }

  tryTime() {
    if (this.zone !== "land" || !this.land) {
      this.note = "day";
      return;
    }
    this.note = this.land.clock === "night" ? "night. Threat is higher." : "day";
  }

  tryMap() {
    const here = this.bodyNow().pos;
    const rows = this.neighborsOf(here).map((edge) => {
      const n = this.roomNumber(edge.pos);
      return `${edge.dir} ${n == null ? "" : n}`.trim();
    });
    const n = this.roomNumber(here);
    this.note = [`room ${n == null ? "" : n}`.trim(), ...rows].join("\n");
  }

  trySurvey() {
    const place = this.placeName(this.bodyNow().pos);
    const high = place === "rampart" || (this.zone === "land" && place === "hill" && this.layer === "surface");
    if (!high) {
      this.note = "You are not on high ground.";
      return;
    }
    const rows = this.catalog();
    this.note = rows.length ? rows.map((row) => `${row.name} ${row.n}`).join("\n") : "No landmarks.";
  }

  tryList(fighter) {
    if (this.placeName(fighter.pos) !== "market") {
      this.note = "The merchant is in the market.";
      return;
    }
    this.note = this.stock.map((item) => `${item.name} ${item.price}`).join("\n");
  }

  tryBuy(fighter, rest) {
    if (this.placeName(fighter.pos) !== "market") {
      this.note = "The merchant is in the market.";
      return;
    }
    const name = String(rest || "").trim().toLowerCase();
    if (["book", "candle", "relic", "stone", "philosophers-stone"].includes(name)) {
      this.note = "The merchant will not take that.";
      return;
    }
    const item = this.stock.find((row) => row.name === name);
    if (!item) {
      this.note = "That is not for sale.";
      return;
    }
    const price = item.kind === "gear" ? item.price : item.price;
    if (this.gold < price) {
      this.note = `That takes ${price} gold. You have ${this.gold}.`;
      return;
    }
    this.gold -= price;
    if (item.kind === "food") this.food += 1;
    else if (item.kind === "bag") this.giveMat(item.name, 1);
    else if (item.kind === "arrows") this.arrows += 4;
    else if (item.kind === "stable") {
      if (!this.horse || !this.horse.tamed) {
        this.gold += price;
        this.note = "You have no horse.";
        return;
      }
      this.horse.stabled = true;
    } else if (!fighter.carried.includes(name)) fighter.carried.push(name);
    this.note = `You buy ${name}.`;
  }

  trySell(fighter, rest) {
    if (this.placeName(fighter.pos) !== "market") {
      this.note = "The merchant is in the market.";
      return;
    }
    const name = String(rest || "").trim().toLowerCase();
    if (["book", "candle", "relic", "stone", "philosophers-stone"].includes(name)) {
      this.note = "The merchant will not take that.";
      return;
    }
    if (!fighter.carried.includes(name)) {
      this.note = "You are not carrying that.";
      return;
    }
    fighter.carried = fighter.carried.filter((item) => item !== name);
    this.gold += 8;
    this.stock.push({ name, price: 16, kind: "gear" });
    this.note = `You sell ${name}.`;
  }

  tryTame(fighter) {
    if (!this.wildHorse || fightChebyshev(fighter.pos, this.wildHorse) !== 1) {
      this.note = "There is no horse beside you.";
      return;
    }
    this.horse = { tamed: true, mounted: false, stabled: false };
    this.wildHorse = null;
    this.note = "The horse stays.";
  }

  tryMount(fighter) {
    if (!this.horse || !this.horse.tamed) {
      this.note = "You have no horse.";
      return;
    }
    this.horse.mounted = true;
    this.horse.stabled = false;
    this.note = "You mount.";
  }

  tryDismount(fighter) {
    if (!this.horse || !this.horse.mounted) {
      this.note = "You are not mounted.";
      return;
    }
    this.horse.mounted = false;
    this.note = "You dismount.";
  }

  tryRide(fighter, rest) {
    if (!this.horse || !this.horse.mounted) {
      this.note = "You are not mounted.";
      return;
    }
    this.tryStep(fighter, rest);
  }

  tryBind(fighter) {
    if (!this.stone) {
      this.note = "You are not carrying the stone.";
      return;
    }
    if (this.bindUsed) {
      this.note = "The bind is already spent.";
      return;
    }
    if (this.zone !== "land") {
      this.note = "There is no land edit to bind.";
      return;
    }
    this.bindUsed = true;
    this.note = "One chi edit will remain through the next collapse.";
  }

  tryKeyword(fighter, rest) {
    const word = String(rest || "").trim().toLowerCase();
    if (!word) {
      this.note = this.swingWord ? `Keyword: ${this.swingWord}.` : "Keyword: thrust.";
      return;
    }
    this.swingWord = word;
    this.note = `Keyword: ${word}.`;
  }

  // Bodies and corpses, so the page redraws only when the map changed.
  signature() {
    return JSON.stringify({
      bodies: this.roster.map((fighter) => [fighter.name, fighter.pos.x, fighter.pos.y]),
      corpses: this.corpses.map((corpse) => [corpse.x, corpse.y]),
    });
  }
}

// A new session. Chi, edges, sentences, and stains start over.
function createFight(opts) {
  const fight = new Fight();
  if (opts && opts.court) fight.startInCourt();
  return fight;
}

// The log lines, for the scripted pass.
function texts(fight) {
  return fight.log.map((entry) => entry.text);
}

// A short dump when a scripted check fails.
function failShot(fight) {
  return JSON.stringify({
    tick: fight.tick,
    note: fight.note,
    finisher: fight.finisher,
    jay: {
      x: fight.jay.pos.x, y: fight.jay.pos.y, m: fight.jay.momentum,
      s: fight.jay.stamina, pacified: fight.jay.pacified, dead: fight.jay.dead, lock: fight.jay.lock,
    },
    lurker: {
      x: fight.lurker.pos.x, y: fight.lurker.pos.y, m: fight.lurker.momentum,
      lock: fight.lurker.lock, dead: fight.lurker.dead,
    },
    corpses: fight.corpses,
    log: texts(fight).slice(-40),
  });
}

// Walks the fight, the hamlet, the tutorial, chi, crafting, speech, and embody. Quiet ticks must stay quiet.
function scriptedPass() {
  const checks = [];
  function check(name, cond, fight) {
    checks.push({ name, ok: Boolean(cond), detail: cond || !fight ? "" : failShot(fight) });
  }

  try {
    const guardOn = createFight();
    check("guard starts on", guardOn.guardOn, guardOn);
    check("auto starts on", guardOn.autoOn, guardOn);
    const opened = guardOn.advance();
    check("guard-on dodges a thrust", (
      opened.some((line) => line.includes(TELEGRAPH) && line.includes("thrust"))
      && opened.some((line) => line === "Jay dodges.")
      && guardOn.jay.momentum === 0
      && !texts(guardOn).some((line) => line.includes("hits"))
    ), guardOn);
    check("guard sees only printed text", (
      guardOn.lastFeed.every((line) => typeof line === "string")
      && guardOn.lastFeed.some((line) => line.includes("thrust"))
      && guardOn.lastFeed.every((line) => !line.includes("feint"))
      && guardDecision(guardOn.lastFeed) === "dodge"
    ), guardOn);
    guardOn.input("auto off");
    const quiet = [guardOn.advance(), guardOn.advance(), guardOn.advance()];
    check("quiet ticks print nothing", quiet.every((lines) => lines.length === 0), guardOn);
    guardOn.advance();
    check("the dodge resolves without a hit", (
      guardOn.jay.momentum === 10
      && guardOn.lurker.momentum === -10
      && !texts(guardOn).some((line) => line.includes("hits"))
    ), guardOn);

    const landed = createFight();
    landed.input("auto off");
    landed.input("guard");
    check("guard toggles off", landed.guardOn === false && landed.note === "Guard is off.", landed);
    landed.advance();
    const silent = [landed.advance(), landed.advance(), landed.advance()];
    check("waiting out the window is quiet", silent.every((lines) => lines.length === 0), landed);
    landed.advance();
    check("guard-off, a thrust lands", (
      landed.jay.momentum === -20
      && landed.lurker.momentum === 20
      && texts(landed).includes("The spear hits Jay.")
      && !texts(landed).includes("Jay dodges.")
    ), landed);

    const late = createFight();
    late.input("auto off");
    late.input("guard");
    late.advance();
    late.advance();
    late.advance();
    late.input("dodge");
    late.advance();
    late.advance();
    check("a dodge on the last window tick cancels", late.jay.momentum === 10 && late.lurker.momentum === -10, late);

    const missed = createFight();
    missed.input("auto off");
    missed.input("guard");
    missed.advance();
    missed.advance();
    missed.advance();
    missed.advance();
    missed.input("dodge");
    missed.advance();
    check("a dodge on the commit tick does not cancel", (
      missed.jay.momentum === -20 && missed.jay.stamina === 90
    ), missed);

    const aborted = createFight();
    aborted.input("auto off");
    aborted.input("guard");
    aborted.jay.momentum = 20;
    aborted.lurker.momentum = -13;
    aborted.input("thrust");
    aborted.advance();
    check("declaring a thrust locks Jay in", aborted.lockedIn(aborted.jay), aborted);
    aborted.input("abort");
    aborted.advance();
    check("abort whiffs", (
      !aborted.lockedIn(aborted.jay)
      && aborted.jay.momentum === 15
      && aborted.lurker.momentum === -8
      && texts(aborted).includes("Jay aborts.")
      && texts(aborted).includes("The swing whiffs.")
      && !texts(aborted).includes("The spear hits Lurker.")
    ), aborted);

    const shoved = createFight();
    shoved.input("auto off");
    shoved.input("guard");
    shoved.input("step n");
    shoved.advance();
    check("step north lands adjacent", shoved.jay.pos.x === 2 && shoved.jay.pos.y === 3, shoved);
    const before = { x: shoved.jay.pos.x, y: shoved.jay.pos.y };
    shoved.input("shove");
    shoved.advance();
    check("shove moves the lurker", (
      shoved.lurker.pos.x === 2
      && shoved.lurker.pos.y === 1
      && shoved.jay.pos.x === before.x
      && shoved.jay.pos.y === before.y
      && texts(shoved).includes("Jay shoves Lurker.")
    ), shoved);

    const empty = createFight();
    empty.input("auto off");
    empty.input("guard");
    empty.input("shove");
    empty.advance();
    check("shove from out of reach does not spend the square", (
      empty.lurker.pos.x === 2 && empty.lurker.pos.y === 2 && empty.note === "Nobody adjacent to shove."
    ), empty);

    const won = createFight();
    won.input("auto off");
    for (let i = 0; i < 80 && !won.finisher; i += 1) won.advance();
    const words = ["unsteady", "faltering", "collapsing", "broken", "pressing", "flowing", "overwhelming", "legendary"];
    check("breakpoint lines are the words", (
      words.every((word) => texts(won).includes(word))
      && texts(won).every((line) => !/\d/.test(line))
      && !texts(won).some((line) => /bonus|momentum/.test(line))
    ), won);
    check("the winner is Jay", Boolean(won.finisher && won.finisher.winner === "Jay" && won.finisher.loser === "Lurker"), won);
    const gearBefore = won.lurker.gear.slice();
    const repsBefore = won.lurker.reps;
    const stamBefore = won.lurker.stamina;
    won.input("execute");
    check("a finisher prints the room line and leaves a corpse", (
      texts(won).includes("Lurker is executed")
      && won.corpses.some((corpse) => corpse.x === 2 && corpse.y === 2 && corpse.until - corpse.born === 8)
      && won.lurker.gear.join() === gearBefore.join()
      && won.lurker.reps === repsBefore
      && won.lurker.stamina === stamBefore
      && !(won.lurker.pos.x === 0 && won.lurker.pos.y === 6)
      && fightChebyshev(won.lurker.pos, won.jay.pos) > THREAT
    ), won);
    won.input("get");
    check("the corpse has no loot", won.note === "The corpse has no loot.", won);
    won.input("step n");
    won.advance();
    won.input("step n");
    won.advance();
    check("the corpse blocks the death square", (
      won.jay.pos.x === 2 && won.jay.pos.y === 3 && won.note === "That square is closed."
    ), won);

    const lost = createFight();
    lost.input("auto off");
    lost.input("guard");
    for (let i = 0; i < 40 && !texts(lost).includes("Jay is shown mercy"); i += 1) lost.advance();
    check("respawn is outside threat", (
      texts(lost).includes("Jay is shown mercy")
      && lost.jay.pos.x === 0
      && lost.jay.pos.y === 6
      && fightChebyshev(lost.jay.pos, lost.lurker.pos) > THREAT
      && lost.jay.pacified === true
      && lost.jay.dead === false
      && lost.jay.gear.join() === "spear"
      && !(lost.lurker.pos.x === 0 && lost.lurker.pos.y === 6)
      && !lost.corpses.length
    ), lost);
    check("the mercy tick does not clear pacify", lost.jay.pacified === true, lost);
    lost.input("clear");
    lost.advance();
    check("a later spent tick outside threat ends pacify", (
      lost.jay.pacified === false && lost.note === "Jay is no longer pacified."
    ), lost);

    const fled = createFight();
    fled.input("auto off");
    fled.input("guard");
    fled.input("step s");
    fled.advance();
    fled.advance();
    fled.advance();
    fled.advance();
    check("four ticks outside threat leash the lurker", (
      texts(fled).includes("The lurker is leashed.")
      && fled.lurker.pos.x === 2
      && fled.lurker.pos.y === 2
      && fled.lurker.lock === null
      && fled.jay.momentum === 0
      && fled.lurker.momentum === 0
      && !fled.pending.some((attack) => !attack.resolved)
      && !texts(fled).includes("The spear hits Jay.")
      && !texts(fled).includes("The swing whiffs.")
    ), fled);

    const tracked = createFight();
    tracked.input("auto off");
    tracked.input("guard");
    tracked.advance();
    const template = tracked.pending[0].template.map((sq) => `${sq.x},${sq.y}`).join(" ");
    tracked.input("step e");
    tracked.advance();
    while (tracked.tick <= 4) tracked.advance();
    check("template squares do not track", (
      template === "2,3 2,4"
      && tracked.jay.pos.x === 3
      && tracked.jay.pos.y === 4
      && texts(tracked).includes("The swing whiffs.")
      && !texts(tracked).includes("The spear hits Jay.")
    ), tracked);

    const allyFight = createFight();
    allyFight.input("auto off");
    allyFight.input("guard");
    allyFight.advance();
    allyFight.spawnAlly("Maret", 2, 3);
    allyFight.order("Maret", "step s");
    check("a body that appears mid-window cannot act yet", allyFight.note === "Maret cannot act yet.", allyFight);
    while (allyFight.tick <= 4) allyFight.advance();
    const maret = allyFight.by("Maret");
    check("an ally on a snapshot square stops the thrust", (
      maret.pos.x === 2
      && maret.pos.y === 3
      && maret.momentum === -20
      && allyFight.jay.momentum === 0
      && texts(allyFight).includes("The spear hits Maret.")
      && !texts(allyFight).includes("The spear hits Jay.")
    ), allyFight);

    const offTemplate = createFight();
    offTemplate.input("auto off");
    offTemplate.input("guard");
    offTemplate.advance();
    offTemplate.spawnAlly("Nell", 0, 0);
    while (offTemplate.tick <= 4) offTemplate.advance();
    check("a body off the snapshot is not hit", (
      offTemplate.by("Nell").momentum === 0
      && texts(offTemplate).includes("The spear hits Jay.")
    ), offTemplate);

    const swapped = createFight();
    swapped.input("auto off");
    swapped.input("guard");
    swapped.spawnAlly("Maret", 2, 5);
    swapped.input("swap");
    swapped.advance();
    check("swap exchanges squares with an adjacent ally", (
      swapped.jay.pos.x === 2 && swapped.jay.pos.y === 5
      && swapped.by("Maret").pos.x === 2 && swapped.by("Maret").pos.y === 4
      && swapped.note === "Jay swaps with Maret."
    ), swapped);
    swapped.input("swap Lurker");
    swapped.advance();
    check("hostiles cannot swap", swapped.note === "Hostiles cannot swap.", swapped);

    const broke = createFight();
    broke.input("auto off");
    broke.input("guard");
    broke.input("block");
    for (let i = 0; i < 17; i += 1) broke.advance();
    check("block absorbs until the guard breaks", (
      broke.jay.stamina === 0
      && broke.jay.blocking === false
      && broke.jay.momentum === -20
      && broke.lurker.momentum === 20
      && texts(broke).filter((line) => line === "Jay blocks the hit.").length === 4
      && texts(broke).includes("Jay's guard breaks.")
    ), broke);

    const dry = createFight();
    dry.input("auto off");
    dry.jay.stamina = 0;
    dry.input("guard");
    dry.input("thrust");
    dry.advance();
    check("at 0 stamina a thrust is refused and a step is allowed", (
      dry.note === "Jay has no stamina."
      && !dry.lockedIn(dry.jay)
    ), dry);
    dry.input("step s");
    dry.advance();
    check("a step at 0 stamina is free", (
      dry.jay.pos.x === 2 && dry.jay.pos.y === 5 && dry.jay.stamina === 0
    ), dry);

    check("guard holds when the latest line has no thrust", guardDecision(["Jay is still."]) === "hold", null);
    check("an empty routine feed holds", guardDecision([]) === "hold", null);

    const desk = createFight();
    check("Jay starts as an admin", desk.jay.admin === true && desk.lurker.admin === false, desk);
    desk.spawnAlly("Maret", 2, 5);
    const deskMaret = desk.by("Maret");
    desk.order("Maret", "say the gate is open");
    desk.order("Maret", "talk the yard is quiet");
    check("Maret's say and talk reach Jay", (
      texts(desk).includes("Maret says, \"the gate is open\"")
      && texts(desk).includes("Maret says, \"the yard is quiet\"")
    ), desk);
    desk.input("mute Maret");
    check("mute names Maret", desk.note === "Maret is muted." && deskMaret.muted === true, desk);
    const noteBefore = desk.note;
    const logBefore = desk.log.length;
    desk.order("Maret", "say this stays private");
    desk.order("Maret", "talk this stays private too");
    desk.order("Maret", "tell Jay the well is covered");
    check("a muted say, talk, and tell stay off Jay's page", (
      deskMaret.privateNote === "You are muted."
      && desk.note === noteBefore
      && desk.log.length === logBefore
      && !texts(desk).some((line) => line.includes("stays private") || line.includes("well is covered"))
    ), desk);
    desk.input("who");
    check("who shows the admin and the mute", (
      desk.note.includes("Jay 2,4, admin") && desk.note.includes("Maret 2,5, muted")
    ), desk);
    desk.input("mutes");
    check("mutes lists Maret", desk.note === "Muted: Maret", desk);
    desk.input("unmute Maret");
    desk.order("Maret", "say the lane is clear");
    check("unmute lets Maret speak again", (
      deskMaret.muted === false
      && texts(desk).includes("Maret says, \"the lane is clear\"")
    ), desk);
    desk.spawnAlly("Brynn", 0, 0);
    desk.order("Brynn", "mute Maret");
    check("a non-admin is refused", desk.note === "You are not an admin." && deskMaret.muted === false, desk);
    const kept = desk.roster.map((body) => ({
      name: body.name,
      admin: body.admin,
      muted: body.muted,
      x: body.pos.x,
      y: body.pos.y,
      gear: body.gear.join(),
    }));
    const logAtHooks = desk.log.length;
    desk.input("kick Maret");
    check("kick is a placeholder line", desk.note === hookNote("kick"), desk);
    desk.input("ban Maret");
    check("ban is a placeholder line", desk.note === hookNote("ban"), desk);
    desk.input("unban Maret");
    desk.input("login");
    desk.input("area");
    check("area uses the areas line", desk.note === hookNote("areas"), desk);
    desk.input("chan");
    check("chan uses the channel line", desk.note === hookNote("channel"), desk);
    desk.squareText.set("2,4", "Wet sand.");
    desk.jay.carried.push("token");
    const chiAtSave = desk.jay.chi;
    const carriedAtSave = desk.jay.carried.join();
    desk.input("save");
    check("save names the future shared world and is not built", (
      desk.note === hookNote("save")
      && desk.note.includes("not built")
      && desk.note.includes(SHARED_LATER)
    ), desk);
    check("save changes nothing", (
      desk.squareText.get("2,4") === "Wet sand."
      && desk.jay.chi === chiAtSave
      && desk.jay.carried.join() === carriedAtSave
      && desk.log.length === logAtHooks
    ), desk);
    check("a reserved command does not change bodies, chat, or mute", (
      desk.log.length === logAtHooks
      && JSON.stringify(desk.roster.map((body) => ({
        name: body.name,
        admin: body.admin,
        muted: body.muted,
        x: body.pos.x,
        y: body.pos.y,
        gear: body.gear.join(),
      }))) === JSON.stringify(kept)
    ), desk);
    desk.order("Brynn", "ban Maret");
    check("a non-admin kick, ban, or unban is refused", desk.note === "You are not an admin.", desk);
    desk.order("Brynn", "login");
    check("login is reserved for every player", desk.note === hookNote("login") && desk.by("Brynn").admin === false, desk);
    desk.input("adm Brynn");
    check("adm grants admin", desk.note === "Brynn is an admin." && desk.by("Brynn").admin === true, desk);
    desk.input("framework");
    check("framework lists the reserved hooks", (
      desk.note === "Reserved: kick, ban, unban, login, connect, save, areas (area), channel (chan)"
    ), desk);

    const trip = createFight();
    trip.input("describe A traveler from the lane.");
    check("describe sets the line", (
      trip.note === "Description set." && trip.jay.blurb === "A traveler from the lane."
    ), trip);
    trip.input("look me");
    check("look me shows the description", trip.note.includes("A traveler from the lane."), trip);
    trip.input("score");
    check("score shows place, weapon, stamina, momentum, and reps", (
      trip.note.includes("place arena")
      && trip.note.includes("weapon spear")
      && trip.note.includes("stamina")
      && trip.note.includes("momentum")
      && trip.note.includes("reps spear")
    ), trip);
    for (const step of ["s", "s", "s", "w", "s", "s"]) {
      trip.input(step);
      trip.advance();
    }
    check("the walk reaches the cottage", trip.placeName(trip.jay.pos) === "cottage", trip);
    trip.input("look");
    check("look lists the cottage and its exits", (
      texts(trip).some((line) => line.includes("cottage") && line.includes("Exits:"))
    ), trip);
    trip.input("talk Osen");
    check("talking to Osen is heard", texts(trip).some((line) => line.startsWith("Osen says,")), trip);
    trip.input("i");
    check("inventory is real", trip.note.startsWith("holding spear"), trip);
    trip.input("help");
    check("help points at the command list", trip.note === HELP_INDEX, trip);

    const tutor = createFight();
    tutor.input("auto off");
    tutor.input("tutorial");
    const firstHint = tutor.note;
    check("tutorial shows the first step", firstHint === "Step 1. look.", tutor);
    tutor.input("tutorial");
    check("tutorial repeats the current hint", tutor.note === firstHint, tutor);
    tutor.input("look");
    check("look advances the tutorial", tutor.tutorialStep === 2, tutor);
    tutor.input("tutorial");
    check("the next hint is step west", tutor.note === "Step 2. step w.", tutor);
    tutor.input("step w");
    tutor.advance();
    check("one step west is still the arena", (
      tutor.placeName(tutor.jay.pos) === "arena" && tutor.tutorialStep === 2
    ), tutor);
    tutor.input("step w");
    tutor.advance();
    tutor.input("step w");
    tutor.advance();
    check("step west enters the tutorial", (
      tutor.placeName(tutor.jay.pos) === "tutorial" && tutor.tutorialStep === 3
    ), tutor);
    tutor.input("look");
    check("look in the tutorial names only the current step", (
      texts(tutor).some((line) => line.includes("This step is describe.") && !line.includes("This step is look."))
    ), tutor);
    const stuck = tutor.tutorialStep;
    tutor.input("step e");
    tutor.advance();
    check("he can leave the tutorial", tutor.placeName(tutor.jay.pos) === "arena", tutor);
    tutor.input("tutorial");
    check("progress sticks after leaving", tutor.note === "Step 3. describe." && tutor.tutorialStep === stuck, tutor);
    tutor.input("step w");
    tutor.advance();
    check("he can come back", tutor.placeName(tutor.jay.pos) === "tutorial", tutor);
    tutor.input("describe A student of the yard.");
    check("describe does not finish the step", tutor.tutorialStep === 3 && tutor.tutorialDescribed, tutor);
    tutor.input("look me");
    check("look me finishes the describe step", tutor.tutorialStep === 4, tutor);
    tutor.input("score");
    check("score advances the tutorial", tutor.tutorialStep === 5, tutor);
    tutor.input("wield sword");
    check("wield sword advances the tutorial", tutor.tutorialStep === 6 && tutor.jay.holding === "sword", tutor);
    tutor.input("thrust");
    tutor.advance();
    let swingLanded = false;
    for (let i = 0; i < 6 && !swingLanded; i += 1) {
      tutor.advance();
      swingLanded = texts(tutor).includes("The swing landed.");
    }
    const post = tutor.by("Post");
    check("the practice swing lands", swingLanded && post && !post.dead, tutor);
    check("the post does not fight back", !texts(tutor).some((line) => /Post:/.test(line) && /hits/.test(line)), tutor);
    check("thrust advances after the swing lands", tutor.tutorialStep === 7, tutor);
    tutor.input("routine");
    check("routine reads the guard", tutor.note.includes("Guard is") && tutor.tutorialStep === 7, tutor);
    tutor.input("tutorial");
    check("the next hint is to leave guard on", tutor.note === "Step 7. Leave guard on.", tutor);
    tutor.input("tutorial");
    check("tutorial repeats the guard hint", tutor.note === "Step 7. Leave guard on.", tutor);
    tutor.input("guard on");
    check("leaving guard on advances", tutor.tutorialStep === 8 && tutor.guardOn, tutor);
    const beat = tutor.advance();
    check("the post telegraphs a practice thrust", beat.some((line) => line.startsWith("Post:") && line.toLowerCase().includes("thrust")), tutor);
    check("guard dodges the practice thrust", beat.includes("Jay dodges."), tutor);
    check("the dodge advances the tutorial", tutor.tutorialStep === 9, tutor);
    tutor.input("tutorial");
    check("the yarrow hint points south", tutor.note === "Step 9. The yarrow patch is south.", tutor);
    tutor.input("gather");
    tutor.advance();
    check("gather is not in the tutorial", tutor.note === "There is no yarrow here.", tutor);
    tutor.jay.yarrow = 1;
    tutor.input("drink");
    tutor.advance();
    check("drinking anywhere advances", tutor.tutorialStep === 10, tutor);
    tutor.input("framework");
    check("framework says the hooks are not built yet", (
      tutor.note.includes("Reserved:") && tutor.note.includes("They are not built yet.")
    ), tutor);
    check("framework finishes the tutorial", tutor.tutorialStep === 11, tutor);
    tutor.input("tutorial");
    check("the finished tutorial repeats that it is done", tutor.note === "The tutorial is done.", tutor);

    const made = createFight();
    made.bag.yarrow = 1;
    made.bag.water = 1;
    made.input("combine yarrow water");
    made.input("i");
    check("combine yarrow and water makes a tincture", (
      made.skills.alchemy === 1 && made.note.includes("tincture") && made.jay.chi === 10
    ), made);
    made.input("combine fang splinter");
    check("an unlisted pair makes nothing", made.note === "Nothing comes of that.", made);
    made.jay.pos = { x: 5, y: 31 };
    made.input("gather shard");
    made.advance();
    made.input("i");
    check("gather shard on the yard node", made.jay.shards === 1 && made.note.includes("shard"), made);
    made.jay.pos = { x: 4, y: 31 };
    made.input("look stone");
    check("look stone lists the meetings", (
      texts(made).some((line) => line.includes("Yarrow left in water becomes a tincture."))
    ), made);

    const scene = createFight();
    const jayChi = scene.jay.chi;
    scene.ensureHamlet();
    scene.input("embody Osen");
    check("embody Osen", scene.note === "You embody Osen." && scene.promptLine().startsWith("Osen "), scene);
    scene.input("say hello / quietly");
    check("say with a manner uses Osen's name", (
      texts(scene).includes("Osen says quietly, \"hello\"")
    ), scene);
    scene.input("emote draws the blade");
    check("emote uses the embodied name", texts(scene).includes("Osen draws the blade"), scene);
    scene.input("pose bows");
    scene.input("pose");
    check("pose stores and repeats", texts(scene).includes("Osen bows"), scene);
    scene.input("describe here Wet stones.");
    check("describe here is refused while embodied", (
      scene.note === "You cannot do that." && scene.by("Osen").chi === 10 && scene.jay.chi === jayChi
    ), scene);
    scene.finisher = { winner: "Osen", loser: "Lurker" };
    scene.input("execute");
    check("an embodied execute pays the bounty to that body", (
      scene.by("Osen").chi === 30 && scene.jay.chi === jayChi && !scene.stains.has("Lurker")
    ), scene);
    scene.input("release");
    check("release leaves Jay's chi unchanged", (
      scene.embodied === null && scene.jay.chi === jayChi && scene.note === "You are Jay again."
    ), scene);
    scene.jay.admin = false;
    scene.input("embody Osen");
    check("a non-admin embody is refused", scene.note === "You cannot do that." && scene.embodied === null, scene);

    const killed = createFight();
    killed.finisher = { winner: "Jay", loser: "Lurker" };
    const beforeKill = killed.jay.chi;
    killed.input("execute");
    check("executing the lurker adds 20 chi", killed.jay.chi === beforeKill + 20, killed);
    killed.finisher = { winner: "Jay", loser: "Lurker" };
    killed.lurker.dead = false;
    const beforeMercy = killed.jay.chi;
    killed.input("mercy");
    check("mercy grants no chi", killed.jay.chi === beforeMercy && killed.stains.size === 0, killed);

    const fallen = createFight();
    fallen.jay.chi = 8;
    fallen.finisher = { winner: "Lurker", loser: "Jay" };
    fallen.finish("execute", "Lurker");
    const dropped = fallen.stains.get("Jay");
    check("an executed player drops a stain and goes to 0", (
      fallen.jay.chi === 0 && dropped && dropped.amount === 8 && dropped.x === fallen.corpses[0].x
    ), fallen);
    fallen.jay.pos = { x: dropped.x, y: dropped.y };
    fallen.input("get chi");
    check("get chi restores the stain", fallen.jay.chi === 8 && !fallen.stains.has("Jay"), fallen);

    const again = createFight();
    again.jay.chi = 8;
    again.finisher = { winner: "Lurker", loser: "Jay" };
    again.finish("execute", "Lurker");
    again.jay.chi = 3;
    again.jay.pos = { x: 1, y: 1 };
    again.finisher = { winner: "Lurker", loser: "Jay" };
    again.finish("execute", "Lurker");
    check("a second death replaces the unretrieved stain", (
      again.note === "The chi you left is gone."
      && again.stains.size === 1
      && again.stains.get("Jay").amount === 3
      && again.stains.get("Jay").x === 1
    ), again);

    const reader = createFight();
    reader.input("help craft");
    check("help craft names the recipes", reader.note.includes("combine <a> <b>"), reader);
    reader.input("help framework");
    check("help framework says the hooks are not built", reader.note.includes("not built"), reader);
    reader.input("help embody");
    check("help embody is the stagehand note", reader.note.includes("play that person for a scene"), reader);
    reader.input("help speak");
    check("help speak names the manner", reader.note.includes("/ <manner>"), reader);
    reader.input("help fight");
    check("help fight names the table and auto", (
      reader.note.includes("targets")
      && reader.note.includes("add")
      && reader.note.includes("drop")
      && reader.note.includes("priority")
      && reader.note.includes("top row")
      && reader.note.includes("outranks")
    ), reader);

    const table = createFight();
    table.input("targets");
    check("the target table starts empty", table.note === "No targets.", table);
    table.input("priority");
    check("priority starts at swinging then nearest", table.note === "Priority: swinging, then nearest.", table);
    const openedTable = table.advance();
    check("an incoming telegraph outranks auto-attack", (
      openedTable.includes("Jay dodges.")
      && !openedTable.some((line) => line.startsWith("Jay:"))
    ), table);
    table.input("targets");
    check("the attacker joins as aggro", table.note === "Lurker, aggro, distance 2", table);
    table.input("add Lurker");
    check("add of someone listed does nothing", table.note === "Lurker is already listed.", table);
    table.input("drop Lurker");
    check("dropping aggro fails while they are a threat", table.note === "Lurker is still a threat.", table);
    table.advance();
    check("auto attacks the top row without a typed thrust", (
      texts(table).some((line) => line.startsWith("Jay:") && line.toLowerCase().includes("thrust"))
      && table.jay.facing === "N"
      && table.jay.lock === "Lurker"
    ), table);
    const chiAtTable = table.jay.chi;
    table.input("auto off");
    const logAtOff = texts(table).length;
    table.advance();
    table.advance();
    check("auto off leaves the tick", texts(table).length === logAtOff && table.jay.chi === chiAtTable, table);

    const book = createFight();
    book.input("auto off");
    book.input("add Post");
    book.input("targets");
    check("add lists an added row and its distance", book.note === "Post, added, distance 4", book);
    book.input("drop Post");
    book.input("targets");
    check("drop removes an added row", book.note === "No targets.", book);
    book.jay.pos = { x: -1, y: 4 };
    book.jay.lock = "Post";
    book.input("guard off");
    book.input("thrust");
    book.advance();
    book.input("targets");
    check("attacking a body joins them as aggro", book.note.startsWith("Post, aggro,"), book);

    const far = createFight();
    far.input("auto off");
    far.advance();
    far.jay.pos = { x: 4, y: 6 };
    far.lurker.pos = { x: 0, y: 0 };
    far.input("targets");
    check("aggro drops out of sight", far.note === "No targets.", far);
    far.lurker.pos = { x: 2, y: 2 };
    far.jay.pos = { x: 2, y: 4 };
    far.joinAggro(far.jay, "Lurker");
    far.lurker.pacified = true;
    far.input("targets");
    check("aggro drops when pacified", far.note === "No targets.", far);
    far.lurker.pacified = false;
    far.joinAggro(far.jay, "Lurker");
    far.lurker.dead = true;
    far.input("targets");
    check("aggro drops when dead", far.note === "No targets.", far);

    const sort = createFight();
    sort.input("auto off");
    sort.input("guard off");
    sort.advance();
    sort.input("add Post");
    sort.by("Post").pos = { x: 2, y: 3 };
    sort.by("Post").momentum = -40;
    sort.lurker.momentum = 10;
    sort.input("targets");
    check("swinging sorts ahead of a nearer body", sort.note.startsWith("Lurker, aggro,"), sort);
    sort.input("priority nearest");
    sort.input("targets");
    check("nearest puts the fewer squares first", sort.note.startsWith("Post, added, distance 1"), sort);
    sort.input("priority weakest");
    sort.input("targets");
    check("weakest puts the lower momentum first", sort.note.startsWith("Post, added,"), sort);
    sort.input("priority");
    check("priority with no argument prints the current one", sort.note === "Priority: weakest.", sort);
    sort.input("priority swinging");
    sort.input("focus Post");
    sort.input("targets");
    check("focus pins a row to the top", sort.note.startsWith("Post, added,"), sort);
    sort.input("focus");
    check("a bare focus clears the pin", sort.note === "Focus cleared.", sort);
    sort.input("targets");
    check("clearing focus restores priority", sort.note.startsWith("Lurker, aggro,"), sort);

    const pinned = createFight();
    pinned.input("add Post");
    pinned.input("focus Post");
    const pinnedBeat = pinned.advance();
    check("focus does not bypass an incoming telegraph", (
      pinnedBeat.includes("Jay dodges.")
      && !pinnedBeat.some((line) => line.startsWith("Jay:"))
    ), pinned);

    const specPath = require("path").join(__dirname, "..", "procedural-generation.md");
    const specText = require("fs").readFileSync(specPath, "utf8");
    setWordBook(specText);
    check("the book is written", WORD_BOOK.length === GATE_BOOK_LEN, { note: String(WORD_BOOK.length) });
    check("the nine starting words are named", (
      ["oak", "ash", "bell", "vessel", "night", "thorn", "salt", "mire", "ruin"].every((word, i) => WORD_BOOK[i] === word)
    ), { note: WORD_BOOK.slice(0, 9).join(" ") });
    const gate = createFight();
    gate.input("help portal");
    check("help portal is two lines", gate.note === "A name is one to three words the gate holds.\nEach name is one land.", gate);
    gate.jay.pos = { x: 10, y: 10 };
    gate.input("portal");
    check("a blank name is refused", gate.note === "The gate does not know that name.", gate);
    gate.input("portal oak");
    check("one gate word opens a land", gate.zone === "land" && gate.note.includes("000000000"), gate);
    gate.input("hub");
    gate.input("portal ash bell");
    check("two gate words open a land", gate.zone === "land" && gate.note.includes("000001775"), gate);
    gate.input("hub");
    gate.input("portal ash bell vessel night");
    check("four words are refused", gate.note === "The gate does not know that name." && gate.zone === "castle", gate);
    gate.input("portal caa");
    check("words not held are refused", gate.note === "The gate does not know that name." && gate.zone === "castle", gate);
    check("oak weighs zero", portalWeight([0]) === 0 && weightDigits(0) === "000000000", gate);
    check("oak ash weighs 888", portalWeight([0, 1]) === 888 && weightDigits(888) === "000000888", gate);
    check("oak ash bell weighs 394716", portalWeight([0, 1, 2]) === 394716 && weightDigits(394716) === "000394716", gate);
    check("sorted weights ignore order", portalWeight([1, 0]) === portalWeight([0, 1]), gate);
    check("the last three weigh 116705251", portalWeight([885, 886, 887]) === 116705251 && weightDigits(116705251) === "116705251", gate);
    const setter = createFight();
    setter.jay.pos = { x: 10, y: 10 };
    setter.foundPiece = "bar";
    setter.input("set bar");
    check("set adds a piece and does not end the stasis", (
      setter.zone === "castle"
      && setter.note === "You set bar into the gate."
      && setter.gateHeld.has("bar")
    ), setter);
    setter.input("portal oak");
    const setPieces = setter.gatePieces.join(" ");
    setter.input("hub");
    check("a collapse does not unset a piece", (
      setter.zone === "castle"
      && setter.gatePieces.join(" ") === setPieces
      && setter.note.includes("The land has returned to its name.")
    ), setter);
    setWordBook("");
    check("the book is not invented", WORD_BOOK.length === 0, gate);
    const bare = createFight();
    bare.jay.pos = { x: 10, y: 10 };
    bare.input("portal ash");
    check("without the book only oak opens", bare.note === "The gate does not know that name." && bare.zone === "castle", bare);
    const oak = createFight();
    oak.jay.pos = { x: 10, y: 10 };
    oak.input("portal oak");
    const roomLine = (oak.note.split("\n").find((line) => line.startsWith("room ")) || "").trim();
    check(`oak opens a land at ${roomLine || "no room"}`, oak.zone === "land" && /^room \d+$/.test(roomLine), oak);
    oak.questsDone.push("bring ore");
    oak.input("hub");
    check("hub says the land returned to its name", oak.note.includes("The land has returned to its name."), oak);
    oak.input("quests");
    check("a finished quest stays done", oak.note.includes("bring ore done"), oak);
    oak.input("portal oak");
    check("a rebuilt land does not remember the player", (
      oak.zone === "land" && oak.note.includes("People here do not remember you.") && oak.questsDone.length === 1
    ), oak);
    gate.input("quests");
    check("quests lists nothing accepted", gate.note === "quests 0", gate);
    const stepFree = createFight();
    stepFree.input("auto off");
    stepFree.input("guard off");
    stepFree.jay.stamina = 40;
    stepFree.input("step s");
    stepFree.advance();
    check("a step does not spend stamina", stepFree.jay.stamina === 40 && stepFree.jay.pos.y === 5, stepFree);
    gate.input("walk");
    check("walk lists the court number", gate.note.includes("court 101"), gate);
  } catch (error) {
    checks.push({ name: "scripted pass threw", ok: false, detail: String(error && error.stack || error) });
  }

  const lines = checks.map((item) => `${item.ok ? "PASS" : "FAIL"}  ${item.name}${item.ok ? "" : `\n${item.detail}`}`);
  return { ok: checks.every((item) => item.ok), lines, checks };
}

const fightApi = {
  TICK_MS,
  COMMANDS,
  FRAMEWORK,
  TELEGRAPH,
  createFight,
  guardDecision,
  scriptedPass,
  chebyshev: fightChebyshev,
  nameWeight,
  portalWeight,
  weightDigits,
  setWordBook,
  parseWordBook,
};

if (typeof module !== "undefined" && module.exports) module.exports = fightApi;
if (typeof window !== "undefined") window.FightEngine = fightApi;

if (typeof require !== "undefined" && require.main === module) {
  const result = scriptedPass();
  for (const line of result.lines) console.log(line);
  console.log(result.ok ? "SCRIPT PASS" : "SCRIPT FAIL");
  process.exit(result.ok ? 0 : 1);
}
