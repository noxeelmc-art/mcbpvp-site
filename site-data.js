// site-data.js  -  put this in the same folder as index.js (next to tierbot.json)
//
// Reads tierbot.json and builds the PUBLIC snapshot the website shows.
// Needs no extra packages (Node 18+). Discord IDs, notes, strikes, tester data,
// tokens and settings are never copied into the snapshot.

const fs = require('fs');
const path = require('path');

const DB_FILE = process.env.TIERBOT_FILE || path.join(__dirname, 'tierbot.json');

// bot gamemode name -> website key
const MODE = {
  'sword': 'sword', 'axe': 'axe', 'no axe': 'no_axe', 'mace ht': 'mace_ht', 'mace lt': 'mace_lt',
  'nethpot': 'nethpot', 'crystal': 'crystal', 'mace-sphere': 'mace_sphere', 'mace sphere': 'mace_sphere',
  'uhc': 'uhc', 'smp': 'smp', 'pot': 'pot',
};
const modeKey = (n) => MODE[String(n || '').trim().toLowerCase()];
const TIER_RE = /^(LT|MT|HT)[1-5]$/;

function region(s) {
  const r = String(s || '').toLowerCase();
  if (/asia|^as$|india/.test(r)) return 'AS';
  if (/^na$|north/.test(r)) return 'NA';
  if (/^eu|europe/.test(r)) return 'EU';
  if (/^sa$|south/.test(r)) return 'SA';
  if (/oc|aus/.test(r)) return 'OC';
  if (/^af/.test(r)) return 'AF';
  return undefined;
}
function country(s) {
  const r = String(s || '').toLowerCase();
  if (r.includes('india')) return 'IN';
  if (r.includes('aus')) return 'AU';
  return undefined;
}
function device(s) {
  const d = String(s || '').toLowerCase();
  if (/ios|ipad|iphone/.test(d)) return { device: 'iOS', input: 'Touch' };
  if (/otg/.test(d)) return { device: 'Mobile', input: 'Keyboard & Mouse' };
  if (/^pc$|windows|laptop/.test(d)) return { device: 'Windows', input: 'Keyboard & Mouse' };
  if (/console|xbox|ps|playstation|switch/.test(d)) return { device: 'Console', input: 'Controller' };
  return { device: 'Mobile', input: 'Touch' };
}
const parseScore = (s) => {
  const m = /^(\d+)\s*-\s*(\d+)$/.exec(String(s || ''));
  return m ? [Number(m[1]), Number(m[2])] : null;
};

// Skins are downloaded once by the bot and embedded, so the website never calls other sites.
const skinCache = new Map();
async function skinData(p) {
  const url = p.skinUrl || (p.textureId && `https://textures.minecraft.net/texture/${p.textureId}`);
  if (!url) return null;
  if (skinCache.has(url)) return skinCache.get(url);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 200000) throw new Error('skin too big');
    const data = 'data:image/png;base64,' + buf.toString('base64');
    skinCache.set(url, data);
    return data;
  } catch (err) {
    return null; // the website falls back to the Steve skin
  }
}

function status(s) {
  const x = String(s || '').toLowerCase();
  if (/live|running|active|progress|started/.test(x)) return 'live';
  if (/end|finish|complete|done|closed|cancel/.test(x)) return 'ended';
  return 'upcoming'; // signup, checkin, ...
}

async function getSiteData() {
  let db = {};
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    console.error('[site-data] could not read tierbot.json:', err.message);
  }
  const byId = db.players || {};

  // ---- players (only people with at least one tier) ----
  const players = [];
  for (const p of Object.values(byId)) {
    if (!p || !p.username) continue;
    const tiers = {}, scores = {}, wins = {};
    for (const [g, t] of Object.entries(p.gamemodeRanks || {})) {
      const k = modeKey(g), tt = String(t || '').toUpperCase();
      if (k && TIER_RE.test(tt)) tiers[k] = tt;
    }
    if (!Object.keys(tiers).length) continue;
    for (const [g, v] of Object.entries(p.gamemodePoints || {})) {
      const k = modeKey(g);
      if (k && tiers[k] && Number.isFinite(v)) scores[k] = v;
    }
    for (const h of p.testHistory || []) {
      const k = modeKey(h.gamemode), sc = parseScore(h.score);
      if (k && sc && sc[0] > sc[1]) wins[k] = (wins[k] || 0) + 1;
    }
    const dv = device(p.device);
    players.push({
      name: p.username, region: region(p.region), country: country(p.region),
      device: dv.device, input: dv.input, tiers, scores, wins, _src: p,
    });
  }
  await Promise.all(players.map(async (x) => {
    const s = await skinData(x._src);
    if (s) x.skin = s;
    delete x._src;
  }));

  // ---- recent tier tests (shown as "Recent matches" on the home page) ----
  const recent = [];
  for (const p of Object.values(byId)) {
    for (const h of p.testHistory || []) {
      const k = modeKey(h.gamemode), sc = parseScore(h.score), tester = byId[h.tester] && byId[h.tester].username;
      if (k && sc && tester && p.username) recent.push({ a: p.username, b: tester, mode: k, sa: sc[0], sb: sc[1], at: h.date || 0 });
    }
  }
  recent.sort((x, y) => y.at - x.at);
  const matches = recent.slice(0, 8).map(({ at, ...m }) => m);

  // ---- tournaments ----
  const tournaments = Object.values((db.tournaments && db.tournaments.list) || {}).map((t) => {
    const c = t.config || {};
    const entries = Object.values(t.entries || {});
    const host = byId[t.hostId] && byId[t.hostId].username;
    const fmt = `${c.teamSize > 1 ? 'Teams of ' + c.teamSize + ' · ' : ''}Best of ${c.bestOf || 3}` + (c.finalBestOf ? ` (final Bo${c.finalBestOf})` : '');
    return {
      id: t.id, name: c.name || t.id, mode: modeKey(c.gamemode) || 'sword', status: status(t.status),
      start: c.startAt, prize: c.prize || '—', max: c.size || 32, registered: entries.length,
      players: entries.map((e) => e.name).filter(Boolean),
      format: fmt, host: host || 'Staff', server: c.server || '', region: c.region || '',
      checkin: c.checkinMinutes || 0,
      description: String(c.rules || '').replace(/\s*\n\s*/g, ' ').trim(),
    };
  });

  return { updated: new Date().toISOString(), players, tournaments, matches };
}

module.exports = { getSiteData };
