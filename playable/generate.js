"use strict";

// Scalar fields for a harsh land. The castle is not this grid.
// Numbers are built first. Labels are read off the numbers.
// The steps follow procedural-generation.md in order.

const W = 96;
const H = 96;
const BOOK_LEN = 888;
const PLACES = ["water", "wood", "chapel", "ruin", "road", "hill"];
const N = W * H;
const FIELDS = ["threat", "settlement", "forage", "residue"];
const FIELD_ID = { threat: 1, settlement: 2, forage: 3, residue: 4 };
const SPREAD = { threat: 2, settlement: 4, forage: 1, residue: 2 };

function idx(x, y) {
  return y * W + x;
}

function clamp01(v) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function ramp(v, lo, hi) {
  if (v <= lo) return 0;
  if (v >= hi) return 1;
  const t = (v - lo) / (hi - lo);
  return t * t * (3 - 2 * t);
}

function edgeOf(x, y) {
  return Math.min(x, y, W - 1 - x, H - 1 - y);
}

function wordLean(i) {
  const unit = (fieldId) => hash32(i >>> 0, 10, fieldId, 0, 0) / 4294967296;
  const place = PLACES[Math.floor(unit(5) * 6) % 6];
  return {
    threat: unit(1),
    settlement: unit(2),
    forage: unit(3),
    residue: unit(4),
    place,
  };
}

function meanLeans(indexes) {
  const n = indexes.length;
  const sum = { threat: 0, settlement: 0, forage: 0, residue: 0 };
  const placeCount = {};
  for (const i of indexes) {
    const lean = wordLean(i);
    sum.threat += lean.threat;
    sum.settlement += lean.settlement;
    sum.forage += lean.forage;
    sum.residue += lean.residue;
    placeCount[lean.place] = (placeCount[lean.place] || 0) + 1;
  }
  let place = PLACES[0];
  let best = -1;
  for (const name of PLACES) {
    const c = placeCount[name] || 0;
    if (c > best) {
      best = c;
      place = name;
    }
  }
  return {
    threat: sum.threat / n,
    settlement: sum.settlement / n,
    forage: sum.forage / n,
    residue: sum.residue / n,
    place,
  };
}

function blendMeans(fields, means) {
  for (const name of FIELDS) {
    const grid = fields[name];
    const target = means[name];
    for (let i = 0; i < N; i += 1) {
      grid[i] = clamp01(0.65 * grid[i] + 0.35 * target);
    }
  }
}

function landPieceIndex(weight, heldIndexes) {
  const held = new Set(heldIndexes || []);
  let best = null;
  let bestKey = Infinity;
  for (let p = 0; p < BOOK_LEN; p += 1) {
    if (held.has(p)) continue;
    const key = hash32(weight >>> 0, 11, 1, p, 0);
    if (best == null || key < bestKey || (key === bestKey && p < best)) {
      bestKey = key;
      best = p;
    }
  }
  return best == null ? 0 : best;
}

function landPieceCell(weight) {
  return {
    x: hash32(weight >>> 0, 11, 2, 0, 0) % W,
    y: hash32(weight >>> 0, 11, 2, 0, 1) % H,
  };
}

function chebyshev(ax, ay, bx, by) {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

// FNV-1a over UTF-16 code units. oak is 2823540338.
function hashSeed(text) {
  let h = 2166136261;
  const s = String(text);
  for (let i = 0; i < s.length; i += 1) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return h >>> 0;
}

// Lattice hash. Multiplies stay uint32. The unit interval is hash / 2^32.
function hash32(seed, fieldId, octaveNumber, ix, iy) {
  let h = seed >>> 0;
  h = Math.imul(h ^ fieldId, 2246822507) >>> 0;
  h = Math.imul(h ^ octaveNumber, 3266489917) >>> 0;
  h = Math.imul(h ^ (ix >>> 0), 668265263) >>> 0;
  h = Math.imul(h ^ (iy >>> 0), 374761393) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2146121005) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2221713035) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h >>> 0;
}

function lattice(seed, fieldId, octaveNumber, ix, iy) {
  return hash32(seed, fieldId, octaveNumber, ix, iy) / 4294967296;
}

// Land room number. Same cell in every land.
function landRoom(x, y) {
  return 10000 + y * W + x;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Value noise at a cell. Four octaves, amplitude sum 1.875.
function sampleNoise(seed, fieldId, x, y) {
  let sum = 0;
  for (let o = 0; o < 4; o += 1) {
    const L = 16 >> o;
    const gx = (x + 0.5) / L;
    const gy = (y + 0.5) / L;
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const fx = gx - ix;
    const fy = gy - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const octave = o + 1;
    const v00 = lattice(seed, fieldId, octave, ix, iy);
    const v10 = lattice(seed, fieldId, octave, ix + 1, iy);
    const v01 = lattice(seed, fieldId, octave, ix, iy + 1);
    const v11 = lattice(seed, fieldId, octave, ix + 1, iy + 1);
    const n = lerp(lerp(v00, v10, sx), lerp(v01, v11, sy), sy);
    sum += n * (1 / (2 ** o));
  }
  return sum / 1.875;
}

function blank() {
  return {
    threat: new Float64Array(N),
    settlement: new Float64Array(N),
    forage: new Float64Array(N),
    residue: new Float64Array(N),
  };
}

function copyFields(src) {
  const out = blank();
  for (const name of FIELDS) out[name].set(src[name]);
  return out;
}

// One Jacobi pass. Out-of-bounds neighbor weight folds back onto self.
function spreadOnce(src) {
  const dst = new Float64Array(N);
  const orth = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const diag = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const i = idx(x, y);
      let wSelf = 0.5;
      let acc = 0;
      for (const [dx, dy] of orth) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) wSelf += 0.1;
        else acc += 0.1 * src[idx(nx, ny)];
      }
      for (const [dx, dy] of diag) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) wSelf += 0.025;
        else acc += 0.025 * src[idx(nx, ny)];
      }
      acc += wSelf * src[i];
      dst[i] = clamp01(acc);
    }
  }
  return dst;
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < W && y < H;
}

function neighbors8(x, y) {
  const list = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (inBounds(nx, ny)) list.push([nx, ny]);
    }
  }
  return list;
}

function strictPeak(grid, x, y) {
  const v = grid[idx(x, y)];
  for (const [nx, ny] of neighbors8(x, y)) {
    if (grid[idx(nx, ny)] >= v) return false;
  }
  return true;
}

// Higher value, then lower y, then lower x.
function byValue(grid) {
  return (a, b) => {
    const d = grid[idx(b.x, b.y)] - grid[idx(a.x, a.y)];
    if (d) return d;
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  };
}

function tooClose(sites, x, y, gap) {
  return sites.some((site) => chebyshev(site.x, site.y, x, y) < gap);
}

function applyMist(fields) {
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const edge = edgeOf(x, y);
      if (edge >= 2) continue;
      const u = (2 - edge) / 2;
      const i = idx(x, y);
      fields.settlement[i] = clamp01(fields.settlement[i] * (1 - 0.90 * u));
      fields.threat[i] = Math.min(0.68, clamp01(fields.threat[i] + 0.28 * u));
    }
  }
}

// A spoken name's field is the average of those words. Mist is the only later change.
function buildPast(seedText, seedNumber, wordIndexes) {
  const seed = seedNumber != null ? (Number(seedNumber) >>> 0) : hashSeed(seedText);
  const fields = blank();
  if (wordIndexes && wordIndexes.length) {
    const means = meanLeans(wordIndexes);
    for (const name of FIELDS) fields[name].fill(means[name]);
    applyMist(fields);
    return { seed, fields };
  }
  for (const name of FIELDS) {
    const id = FIELD_ID[name];
    const grid = fields[name];
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) grid[idx(x, y)] = sampleNoise(seed, id, x, y);
    }
    let cur = grid;
    const times = SPREAD[name];
    for (let n = 0; n < times; n += 1) cur = spreadOnce(cur);
    fields[name] = cur;
  }
  const s0 = fields.settlement;
  const t0 = fields.threat;
  const settlement = new Float64Array(N);
  const threat = new Float64Array(N);
  for (let i = 0; i < N; i += 1) {
    const quiet = ramp(s0[i], 0.48, 0.70);
    const empty = ramp(t0[i], 0.50, 0.72);
    threat[i] = clamp01(t0[i] * (1 - 0.75 * quiet));
    settlement[i] = clamp01(s0[i] * (1 - 0.97 * empty));
  }
  fields.threat = threat;
  fields.settlement = settlement;
  applyMist(fields);
  return { seed, fields };
}

function applyDeltas(base, deltas) {
  const edited = copyFields(base);
  const direct = {
    threat: new Float64Array(N),
    settlement: new Float64Array(N),
    forage: new Float64Array(N),
    residue: new Float64Array(N),
  };
  for (const delta of deltas) {
    const grid = edited[delta.field];
    const mark = direct[delta.field];
    if (!grid || !inBounds(delta.x, delta.y)) continue;
    const i = idx(delta.x, delta.y);
    grid[i] += delta.amount;
    mark[i] += delta.amount;
    for (const [nx, ny] of neighbors8(delta.x, delta.y)) {
      const orth = nx === delta.x || ny === delta.y;
      grid[idx(nx, ny)] += delta.amount * (orth ? 0.5 : 0.25);
    }
  }
  for (const name of FIELDS) {
    const grid = edited[name];
    for (let i = 0; i < N; i += 1) grid[i] = clamp01(grid[i]);
  }
  return { edited, direct };
}

function placeVillages(fields) {
  const peaks = [];
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (edgeOf(x, y) < 12) continue;
      if (strictPeak(fields.threat, x, y)) continue;
      if (fields.threat[idx(x, y)] > 0.35) continue;
      if (!strictPeak(fields.settlement, x, y)) continue;
      peaks.push({ x, y });
    }
  }
  peaks.sort(byValue(fields.settlement));
  const accepted = [];
  const thresholds = [0.68, 0.64, 0.60, 0.56, 0.52, 0.48, 0.44, 0.40];
  for (const threshold of thresholds) {
    if (accepted.length >= 3) break;
    for (const cell of peaks) {
      if (accepted.length >= 5) break;
      if (fields.settlement[idx(cell.x, cell.y)] < threshold) continue;
      if (accepted.some((site) => site.x === cell.x && site.y === cell.y)) continue;
      if (tooClose(accepted, cell.x, cell.y, 20)) continue;
      accepted.push(cell);
      if (accepted.length >= 3) break;
    }
  }
  if (accepted.length < 3) {
    const rest = [];
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        if (edgeOf(x, y) < 12) continue;
        if (strictPeak(fields.threat, x, y)) continue;
        if (fields.threat[idx(x, y)] > 0.35) continue;
        if (accepted.some((site) => site.x === x && site.y === y)) continue;
        rest.push({ x, y });
      }
    }
    rest.sort(byValue(fields.settlement));
    for (const cell of rest) {
      if (accepted.length >= 3) break;
      if (tooClose(accepted, cell.x, cell.y, 20)) continue;
      accepted.push(cell);
    }
  }
  if (accepted.length < 3) {
    for (let y = 0; y < H && accepted.length < 3; y += 1) {
      for (let x = 0; x < W && accepted.length < 3; x += 1) {
        if (edgeOf(x, y) < 12) continue;
        if (accepted.some((site) => site.x === x && site.y === y)) continue;
        if (tooClose(accepted, x, y, 20)) continue;
        accepted.push({ x, y });
      }
    }
  }
  return accepted;
}

function placeHill(fields, villages) {
  const scored = [];
  const consider = (requirePeak) => {
    const list = [];
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        if (edgeOf(x, y) < 12) continue;
        if (fields.settlement[idx(x, y)] > 0.12) continue;
        if (villages.some((site) => chebyshev(site.x, site.y, x, y) < 12)) continue;
        if (requirePeak && !strictPeak(fields.threat, x, y)) continue;
        const threat = fields.threat[idx(x, y)];
        const settlement = fields.settlement[idx(x, y)];
        const nearest = villages.reduce((best, site) => Math.min(best, chebyshev(site.x, site.y, x, y)), 99);
        list.push({
          x, y,
          score: threat * (1 - settlement),
          nearest,
        });
      }
    }
    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.nearest !== a.nearest) return b.nearest - a.nearest;
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
    return list;
  };
  const peaked = consider(true);
  const found = peaked[0] || consider(false)[0];
  if (found) return found;
  let best = null;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (edgeOf(x, y) < 12) continue;
      if (villages.some((site) => chebyshev(site.x, site.y, x, y) < 12)) continue;
      const nearest = villages.reduce((dist, site) => Math.min(dist, chebyshev(site.x, site.y, x, y)), 99);
      if (!best || nearest > best.nearest || (nearest === best.nearest && (y < best.y || (y === best.y && x < best.x)))) {
        best = { x, y, nearest };
      }
    }
  }
  return best;
}

function traceRoad(fields, from, to, blocked) {
  const cells = [];
  let x = from.x;
  let y = from.y;
  const guard = new Set();
  while (x !== to.x || y !== to.y) {
    const key = `${x},${y}`;
    if (guard.has(key)) break;
    guard.add(key);
    const dist = chebyshev(x, y, to.x, to.y);
    let best = null;
    for (const [nx, ny] of neighbors8(x, y)) {
      const next = chebyshev(nx, ny, to.x, to.y);
      if (next >= dist) continue;
      const candidate = { x: nx, y: ny, dist: next, settlement: fields.settlement[idx(nx, ny)] };
      if (!best
        || candidate.dist < best.dist
        || (candidate.dist === best.dist && candidate.settlement > best.settlement)
        || (candidate.dist === best.dist && candidate.settlement === best.settlement && candidate.y < best.y)
        || (candidate.dist === best.dist && candidate.settlement === best.settlement && candidate.y === best.y && candidate.x < best.x)) {
        best = candidate;
      }
    }
    if (!best) break;
    x = best.x;
    y = best.y;
    if (!blocked.some((site) => site.x === x && site.y === y)) cells.push({ x, y });
  }
  return cells;
}

function placeRoads(fields, villages, hill) {
  const ordered = villages.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));
  const blocked = hill ? villages.concat([hill]) : villages.slice();
  const roads = [];
  const seen = new Set();
  for (let i = 1; i < ordered.length; i += 1) {
    let best = 0;
    let bestDist = Infinity;
    for (let j = 0; j < i; j += 1) {
      const dist = chebyshev(ordered[i].x, ordered[i].y, ordered[j].x, ordered[j].y);
      if (dist < bestDist || (dist === bestDist && j < best)) {
        bestDist = dist;
        best = j;
      }
    }
    for (const cell of traceRoad(fields, ordered[i], ordered[best], blocked)) {
      const key = `${cell.x},${cell.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      roads.push(cell);
    }
  }
  return roads;
}

function onRoad(roads, x, y) {
  return roads.some((cell) => cell.x === x && cell.y === y);
}

function nearRoad(roads, x, y) {
  return onRoad(roads, x, y) || roads.some((cell) => chebyshev(cell.x, cell.y, x, y) <= 1);
}

function isVillage(villages, x, y) {
  return villages.some((cell) => cell.x === x && cell.y === y);
}

function pickPeaks(grid, test) {
  const list = [];
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (!strictPeak(grid, x, y)) continue;
      if (!test(x, y)) continue;
      list.push({ x, y });
    }
  }
  list.sort(byValue(grid));
  return list;
}

function takeSites(peaks, gap, limit, extraGap) {
  const accepted = [];
  for (const cell of peaks) {
    if (accepted.length >= limit) break;
    if (tooClose(accepted, cell.x, cell.y, gap)) continue;
    if (extraGap && extraGap(cell, accepted)) continue;
    accepted.push(cell);
  }
  return accepted;
}

// Floors and sites from the edited fields, before floors overwrite numbers.
function laySites(fields) {
  const villages = placeVillages(fields);
  const hill = placeHill(fields, villages);
  const roads = placeRoads(fields, villages, hill);
  const fairest = villages.slice().sort((a, b) => fields.settlement[idx(b.x, b.y)] - fields.settlement[idx(a.x, a.y)] || a.y - b.y || a.x - b.x)[0] || null;
  let guest = null;
  if (hill && fairest) {
    const pool = villages.filter((cell) => cell.x !== fairest.x || cell.y !== fairest.y);
    pool.sort((a, b) => {
      const da = chebyshev(a.x, a.y, hill.x, hill.y);
      const db = chebyshev(b.x, b.y, hill.x, hill.y);
      if (da !== db) return da - db;
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
    guest = pool[0] || null;
  }
  let post = null;
  let isolation = 0;
  if (villages.length >= 3 && fairest && guest) {
    const pool = villages.filter((cell) => (
      (cell.x !== fairest.x || cell.y !== fairest.y)
      && (cell.x !== guest.x || cell.y !== guest.y)
    ));
    pool.sort((a, b) => {
      const da = nearestOther(villages, a);
      const db = nearestOther(villages, b);
      if (db !== da) return db - da;
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
    post = pool[0] || null;
    if (post) isolation = nearestOther(villages, post);
  }
  const skip = (x, y) => edgeOf(x, y) < 2 || isVillage(villages, x, y) || (hill && hill.x === x && hill.y === y);
  const innPeaks = pickPeaks(fields.residue, (x, y) => {
    if (skip(x, y)) return false;
    const s = fields.settlement[idx(x, y)];
    return s >= 0.35 && s < 0.62 && nearRoad(roads, x, y);
  });
  const inn = innPeaks[0] || null;
  const millPeaks = pickPeaks(fields.residue, (x, y) => {
    if (skip(x, y) || onRoad(roads, x, y)) return false;
    const i = idx(x, y);
    const s = fields.settlement[i];
    return fields.residue[i] >= 0.58 && fields.forage[i] <= 0.40 && s >= 0.20 && s < 0.55;
  });
  const mills = takeSites(millPeaks, 6, 2);
  const blockedForShrine = [...villages, ...(hill ? [hill] : []), ...(inn ? [inn] : []), ...mills];
  const shrinePeaks = pickPeaks(fields.residue, (x, y) => {
    if (skip(x, y)) return false;
    const i = idx(x, y);
    if (fields.residue[i] < 0.64 || fields.settlement[i] >= 0.45) return false;
    if (blockedForShrine.some((site) => chebyshev(site.x, site.y, x, y) < 6)) return false;
    return true;
  });
  const shrines = takeSites(shrinePeaks, 8, 2);
  const gravePeaks = pickPeaks(fields.residue, (x, y) => {
    if (skip(x, y)) return false;
    const i = idx(x, y);
    if (fields.residue[i] < 0.70 || fields.settlement[i] > 0.30) return false;
    if ([...villages, ...(hill ? [hill] : [])].some((site) => chebyshev(site.x, site.y, x, y) < 6)) return false;
    return true;
  });
  const graves = takeSites(gravePeaks, 8, 2);
  const ruinPeaks = pickPeaks(fields.residue, (x, y) => {
    if (skip(x, y)) return false;
    if (graves.some((site) => site.x === x && site.y === y)) return false;
    const i = idx(x, y);
    if (fields.residue[i] < 0.62 || fields.forage[i] > 0.40 || fields.settlement[i] > 0.28) return false;
    const avoid = [...villages, ...(hill ? [hill] : []), ...graves];
    if (avoid.some((site) => chebyshev(site.x, site.y, x, y) < 6)) return false;
    return true;
  });
  const ruins = takeSites(ruinPeaks, 8, 2);
  const reserved = new Set();
  for (const cell of [...villages, ...(hill ? [hill] : [])]) reserved.add(`${cell.x},${cell.y}`);
  const findPeaks = pickPeaks(fields.forage, (x, y) => {
    if (edgeOf(x, y) < 2) return false;
    if (reserved.has(`${x},${y}`)) return false;
    return fields.forage[idx(x, y)] >= 0.66;
  });
  const targetFinds = Math.max(12, Math.round(N / 16));
  const finds = takeSites(findPeaks, 12, targetFinds).map((cell) => ({
    x: cell.x,
    y: cell.y,
    item: fields.residue[idx(cell.x, cell.y)] >= 0.55 ? "sword" : "yarrow",
  }));
  if (!finds.length) {
    for (let y = 0; y < H && finds.length < targetFinds; y += 1) {
      for (let x = 0; x < W && finds.length < targetFinds; x += 1) {
        if (edgeOf(x, y) < 2) continue;
        if (reserved.has(`${x},${y}`)) continue;
        if (finds.some((cell) => chebyshev(cell.x, cell.y, x, y) < 12)) continue;
        finds.push({
          x,
          y,
          item: fields.residue[idx(x, y)] >= 0.55 ? "sword" : "yarrow",
        });
      }
    }
  }
  return { villages, hill, roads, fairest, guest, post, isolation, inn, mills, shrines, graves, ruins, finds };
}

function nearestOther(villages, cell) {
  let best = 99;
  for (const other of villages) {
    if (other.x === cell.x && other.y === cell.y) continue;
    best = Math.min(best, chebyshev(cell.x, cell.y, other.x, other.y));
  }
  return best;
}

function sameCell(a, x, y) {
  return a && a.x === x && a.y === y;
}

function applyFloors(edited, direct, sites) {
  const threat = edited.threat;
  const residue = edited.residue;
  const settlement = edited.settlement;
  const skip = (field, x, y) => direct[field][idx(x, y)] !== 0;
  if (sites.hill) {
    const hx = sites.hill.x;
    const hy = sites.hill.y;
    if (!skip("threat", hx, hy)) threat[idx(hx, hy)] = 0.90;
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        if (x === hx && y === hy) continue;
        const dist = chebyshev(x, y, hx, hy);
        if (dist > 16 || edgeOf(x, y) < 2) continue;
        if (settlement[idx(x, y)] >= 0.45) continue;
        if (skip("threat", x, y)) continue;
        threat[idx(x, y)] = Math.max(threat[idx(x, y)], 0.90 * (1 - dist / 9));
      }
    }
  }
  for (const road of sites.roads) {
    if (skip("threat", road.x, road.y)) continue;
    const i = idx(road.x, road.y);
    threat[i] = Math.min(threat[i], 0.32);
  }
  if (sites.fairest && !skip("residue", sites.fairest.x, sites.fairest.y)) {
    residue[idx(sites.fairest.x, sites.fairest.y)] = Math.max(residue[idx(sites.fairest.x, sites.fairest.y)], 0.80);
  }
  if (sites.guest && !skip("threat", sites.guest.x, sites.guest.y)) {
    threat[idx(sites.guest.x, sites.guest.y)] = Math.max(threat[idx(sites.guest.x, sites.guest.y)], 0.74);
  }
  if (sites.post) {
    const iso = Math.min(1, sites.isolation / 16);
    const i = idx(sites.post.x, sites.post.y);
    if (!skip("threat", sites.post.x, sites.post.y)) {
      threat[i] = Math.min(0.88, Math.max(threat[i], 0.55 + 0.35 * iso));
    }
    if (!skip("residue", sites.post.x, sites.post.y)) residue[i] = Math.max(residue[i], 0.70);
  }
  const raise = (cell, floor) => {
    if (!cell || skip("threat", cell.x, cell.y)) return;
    const i = idx(cell.x, cell.y);
    threat[i] = Math.max(threat[i], floor);
  };
  if (sites.inn) raise(sites.inn, 0.70);
  for (const cell of sites.mills) raise(cell, 0.74);
  for (const cell of sites.shrines) raise(cell, 0.68);
  for (const cell of sites.graves) {
    if (skip("threat", cell.x, cell.y)) continue;
    const i = idx(cell.x, cell.y);
    threat[i] = Math.min(0.78, Math.max(threat[i], 0.58));
  }
  for (const cell of sites.ruins) {
    if (skip("threat", cell.x, cell.y)) continue;
    const i = idx(cell.x, cell.y);
    threat[i] = Math.min(0.78, Math.max(threat[i], 0.60));
  }
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (sameCell(sites.fairest, x, y)) continue;
      const i = idx(x, y);
      if (residue[i] < 0.70 || settlement[i] > 0.25) continue;
      if (skip("threat", x, y)) continue;
      threat[i] = Math.min(0.78, Math.max(threat[i], residue[i] * 0.75));
    }
  }
  for (const name of FIELDS) {
    const grid = edited[name];
    for (let i = 0; i < N; i += 1) grid[i] = clamp01(grid[i]);
  }
}

function roleOf(sites, x, y) {
  if (sameCell(sites.fairest, x, y)) return "fairest";
  if (sameCell(sites.guest, x, y)) return "guest";
  if (sameCell(sites.post, x, y)) return "post";
  if (sites.villages.some((cell) => cell.x === x && cell.y === y)) return "village";
  if (sameCell(sites.hill, x, y)) return "hill";
  if (sameCell(sites.inn, x, y)) return "inn";
  if (sites.mills.some((cell) => cell.x === x && cell.y === y)) return "mill";
  if (sites.shrines.some((cell) => cell.x === x && cell.y === y)) return "shrine";
  if (sites.graves.some((cell) => cell.x === x && cell.y === y)) return "graveyard";
  if (sites.ruins.some((cell) => cell.x === x && cell.y === y)) return "ruin";
  if (sites.roads.some((cell) => cell.x === x && cell.y === y)) return "road";
  return "";
}

function labelAt(fields, sites, x, y) {
  if (edgeOf(x, y) < 2) return "mist";
  const role = roleOf(sites, x, y);
  if (role === "fairest" || role === "guest" || role === "post" || role === "village") return "village";
  if (role) return role;
  const i = idx(x, y);
  if (fields.settlement[i] >= 0.50) return "farm";
  if (fields.forage[i] >= 0.55 && fields.settlement[i] < 0.40) return "wood";
  return "wild";
}

function buildWorld(seedText, deltas, seedNumber, wordIndexes, heldIndexes) {
  const pastPack = buildPast(seedText, seedNumber, wordIndexes);
  const { edited, direct } = applyDeltas(pastPack.fields, deltas || []);
  const sites = laySites(edited);
  applyFloors(edited, direct, sites);
  const pieceIndex = landPieceIndex(pastPack.seed, heldIndexes || []);
  const pieceCell = landPieceCell(pastPack.seed);
  return {
    seedText: String(seedText),
    seed: pastPack.seed,
    past: pastPack.fields,
    now: edited,
    direct,
    sites,
    pieceIndex,
    pieceCell,
  };
}

const PLACE = {
  mist: "Mist.",
  village: "A village.",
  farm: "A farm.",
  wood: "Woods.",
  road: "A road.",
  inn: "An inn.",
  mill: "A mill.",
  shrine: "A shrine.",
  hill: "A hill.",
  ruin: "A ruin.",
  graveyard: "A graveyard.",
  wild: "Wild country.",
};

function fieldsOf(world, era) {
  return era === "earlier" ? world.past : world.now;
}

function sitesFor(world, era) {
  if (era === "earlier") {
    const bare = {
      threat: world.past.threat,
      settlement: world.past.settlement,
      forage: world.past.forage,
      residue: world.past.residue,
    };
    const direct = {
      threat: new Float64Array(N),
      settlement: new Float64Array(N),
      forage: new Float64Array(N),
      residue: new Float64Array(N),
    };
    const sites = laySites(bare);
    return { fields: bare, sites, direct };
  }
  return { fields: world.now, sites: world.sites, direct: world.direct };
}

function storedThreat(pack, x, y) {
  return pack.fields.threat[idx(x, y)];
}

function effectiveAt(pack, x, y, clock, layer, room, nightCount, hunger) {
  const i = idx(x, y);
  let value = pack.fields.threat[i];
  if (clock === "night") value *= 1.6;
  if (layer === "indoors") value *= 1.4;
  if (layer === "cellar" || layer === "culvert" || layer === "room" || (layer === "hill" && room > 0)) value *= 1.8;
  if (layer === "hill" && room > 0) value *= (1 + 0.12 * room);
  value = Math.min(1, value);
  const role = roleOf(pack.sites, x, y);
  if (layer === "room" && role === "fairest") {
    const indoors = 1.4;
    const down = 1.8;
    const night = clock === "night" ? 1.6 : 1;
    value = Math.min(1, Math.max(pack.fields.threat[i] * indoors * down * night, pack.fields.residue[i]));
  }
  if (role === "village" && layer === "culvert" && nightCount > 0 && nightCount % 12 === 0) {
    value = Math.min(1, Math.max(value, 0.86));
  }
  if (clock === "night" && hunger && hunger.x === x && hunger.y === y) {
    value = Math.min(1, Math.max(value, 0.66));
  }
  return value;
}

function bodyWord(pack, x, y, clock, layer, room, nightCount, hunger) {
  const role = roleOf(pack.sites, x, y);
  const label = labelAt(pack.fields, pack.sites, x, y);
  const threat = pack.fields.threat[idx(x, y)];
  const residue = pack.fields.residue[idx(x, y)];
  const effective = effectiveAt(pack, x, y, clock, layer, room, nightCount, hunger);
  if (layer === "hill" && room >= 1 && room <= 5) return "";
  if (layer === "hill" && room === 6) return "bandits";
  if (role === "post") return "";
  if (layer === "room" && role === "fairest") return "";
  const unproven = (label === "village" || label === "farm" || label === "inn" || label === "mill" || label === "shrine")
    && threat >= 0.60 && residue < 0.55;
  const guestNight = role === "guest" && clock === "night" && (layer === "surface" || layer === "indoors");
  const banditSite = (label === "ruin" || label === "graveyard") && threat >= 0.58;
  if (hunger && clock === "night" && hunger.x === x && hunger.y === y && label === "road") return "visitor";
  if (guestNight) return "guest";
  if (banditSite && layer === "surface") return "bandit";
  if (unproven) return "";
  const wolfMist = (label === "mist" || label === "road") && clock === "night" && effective >= 0.50 && strictPeak(pack.fields.threat, x, y);
  const wolfWild = (label === "wood" || label === "wild") && effective >= 0.50 && residue >= 0.45 && strictPeak(pack.fields.threat, x, y);
  if ((wolfMist || wolfWild) && !(hunger && hunger.x === x && hunger.y === y)) return "wolf";
  return "";
}

const BODY_LINE = {
  wolf: "A wolf is here.",
  guest: "A guest is here.",
  visitor: "A visitor is here.",
  bandit: "A bandit is here.",
  bandits: "Two bandits are here.",
};

function lookLines(world, x, y, era, clock, layer, room, nightCount, hunger, custom) {
  if (custom) return [custom];
  const pack = sitesFor(world, era);
  const label = labelAt(pack.fields, pack.sites, x, y);
  const lines = [PLACE[label] || "Wild country."];
  const word = bodyWord(pack, x, y, clock, layer, room, nightCount, hunger);
  if (!word) {
    const effective = effectiveAt(pack, x, y, clock, layer, room, nightCount, hunger);
    if (effective >= 0.75) lines.push("The wind is hard.");
    else if (effective >= 0.50) lines.push("The air is cold.");
  } else lines.push(BODY_LINE[word]);
  return lines;
}

function num(value) {
  return Number(value).toFixed(2);
}

function heatLines(world, x, y, era, clock, layer, room, nightCount, hunger, caretaker) {
  const pack = sitesFor(world, era);
  const i = idx(x, y);
  const label = labelAt(pack.fields, pack.sites, x, y);
  const effective = effectiveAt(pack, x, y, clock, layer, room, nightCount, hunger);
  const word = bodyWord(pack, x, y, clock, layer, room, nightCount, hunger);
  const layerWord = layer === "hill" ? (room > 0 ? "room" : "surface") : (layer || "surface");
  const lines = [
    `(${x},${y}) ${label} room ${landRoom(x, y)}`,
    era === "earlier" ? "earlier" : "now",
    `threat ${num(pack.fields.threat[i])}`,
    `settlement ${num(pack.fields.settlement[i])}`,
    `forage ${num(pack.fields.forage[i])}`,
    `residue ${num(pack.fields.residue[i])}`,
    `effective ${num(effective)}`,
    `difficulty ${Math.floor(effective * 100)}`,
    `${clock} ${layerWord}`,
  ];
  if (roleOf(pack.sites, x, y) === "post") lines.push(`isolation ${pack.sites.isolation}`);
  if (layer === "culvert" && nightCount > 0 && nightCount % 12 === 0 && label === "village") lines.push("spike");
  if (caretaker) lines.push("caretaker");
  lines.push(word || "clear");
  return lines;
}

function heatWindow(world, field, x, y, era) {
  const grid = fieldsOf(world, era)[field];
  if (!grid) return "";
  const x0 = Math.max(0, x - 4);
  const x1 = Math.min(W - 1, x + 4);
  const y0 = Math.max(0, y - 4);
  const y1 = Math.min(H - 1, y + 4);
  const header = ["    "];
  for (let cx = x0; cx <= x1; cx += 1) header.push(String(cx).padStart(7, " "));
  const rows = [header.join("")];
  for (let cy = y0; cy <= y1; cy += 1) {
    let row = String(cy).padStart(2, " ") + "  ";
    for (let cx = x0; cx <= x1; cx += 1) {
      const text = num(grid[idx(cx, cy)]);
      const slot = (cx === x && cy === y) ? `[${text}]` : text.padStart(6, " ");
      row += `${slot} `;
    }
    rows.push(row);
  }
  return rows.join("\n");
}

function hexDigit(value) {
  const n = Math.min(15, Math.floor(value * 16));
  return "0123456789ABCDEF"[n];
}

function hexGrid(grid) {
  const rows = [];
  for (let y = 0; y < H; y += 1) {
    let row = "";
    for (let x = 0; x < W; x += 1) row += hexDigit(grid[idx(x, y)]);
    rows.push(row);
  }
  return rows.join("\n");
}

function hungerCell(sites, index) {
  if (!sites.roads.length) return null;
  const ordered = sites.roads.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));
  return ordered[index % ordered.length];
}

function formatGenerate(world, paints) {
  const { sites } = world;
  const f = world.now;
  const lines = [
    `seed ${world.seedText}`,
    "past stored",
    `${W} by ${H}`,
  ];
  if (sites.fairest) lines.push(`you (${sites.fairest.x},${sites.fairest.y})`);
  lines.push(`villages ${sites.villages.length}`);
  const villageLine = (cell, role) => {
    const i = idx(cell.x, cell.y);
    if (role === "fairest") {
      return `village (${cell.x},${cell.y}) settlement ${num(f.settlement[i])} threat ${num(f.threat[i])} residue ${num(f.residue[i])} fairest`;
    }
    if (role === "guest") {
      return `village (${cell.x},${cell.y}) threat ${num(f.threat[i])} residue ${num(f.residue[i])} guest`;
    }
    if (role === "post") {
      return `village (${cell.x},${cell.y}) settlement ${num(f.settlement[i])} threat ${num(f.threat[i])} residue ${num(f.residue[i])} isolation ${sites.isolation} post`;
    }
    return `village (${cell.x},${cell.y})`;
  };
  if (sites.fairest) lines.push(villageLine(sites.fairest, "fairest"));
  if (sites.guest) lines.push(villageLine(sites.guest, "guest"));
  if (sites.post) lines.push(villageLine(sites.post, "post"));
  if (sites.hill) {
    const i = idx(sites.hill.x, sites.hill.y);
    lines.push(`hill (${sites.hill.x},${sites.hill.y}) threat ${num(f.threat[i])} settlement ${num(f.settlement[i])}`);
  }
  lines.push(`roads ${sites.roads.length}`);
  lines.push(`finds ${sites.finds.length}`);
  for (const find of sites.finds) lines.push(`find (${find.x},${find.y}) ${find.item}`);
  lines.push(`inns ${sites.inn ? 1 : 0}`);
  lines.push(`mills ${sites.mills.length}`);
  lines.push(`shrines ${sites.shrines.length}`);
  lines.push(`graveyards ${sites.graves.length}`);
  lines.push(`ruins ${sites.ruins.length}`);
  lines.push(`paints ${paints}`);
  for (const name of FIELDS) {
    lines.push(name);
    lines.push(hexGrid(f[name]));
  }
  return lines.join("\n");
}

function nodeKind(world, x, y) {
  const label = labelAt(world.now, world.sites, x, y);
  const find = world.sites.finds.find((cell) => cell.x === x && cell.y === y);
  if (find && find.item === "yarrow") return "yarrow";
  if (label === "wood") return "wood";
  if (label === "hill" || label === "ruin") return "ore";
  return "";
}

const api = {
  W,
  H,
  hashSeed,
  hash32,
  landRoom,
  wordLean,
  landPieceIndex,
  landPieceCell,
  BOOK_LEN,
  lattice,
  buildWorld,
  formatGenerate,
  heatLines,
  heatWindow,
  lookLines,
  hungerCell,
  labelAt,
  roleOf,
  nodeKind,
  bodyWord,
  idx,
  num,
};

if (typeof module !== "undefined" && module.exports) module.exports = api;
if (typeof window !== "undefined") window.RegionGen = api;
