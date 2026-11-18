# site-data.json: optional extras

The site reads `site-data.json` every minute. Everything below is **optional**:
if a field is missing, its section simply stays hidden. Existing fields
(`players`, `tournaments`, `matches`, `registered`, `discord`) work as before.

## Tier history (profile timeline + "Biggest climbers this week")
Add `history` to a player. One entry per tier result, any order:
```json
{"name": "HoriZenGG", "tiers": {"sword": "LT2"},
 "history": [
   {"mode": "sword", "tier": "LT3", "date": "2026-10-29T18:00:00Z"},
   {"mode": "sword", "tier": "LT2", "date": "2026-11-16T20:30:00Z"}
 ]}
```
`mode` uses the same keys as `tiers` (sword, axe, no_axe, mace_ht, mace_lt,
nethpot, crystal, mace_sphere, uhc, smp, pot).

## Tier testers (About page)
```json
"staff": [
  {"name": "Noxeelmain", "role": "Owner · Head tester", "modes": ["sword", "mace_lt"]}
]
```

## Tier tests open / closed (home banner + About page)
```json
"testing": {"open": true, "note": "Open a ticket in #tier-tests"}
```

## Hall of Fame (About page)
```json
"halloffame": [
  {"season": "Season 1", "name": "HoriZenGG", "mode": "overall"},
  {"season": "Season 1", "name": "tzGirooo", "mode": "crystal", "note": "Undefeated"}
]
```

## Device badges and device leaderboards
Uses the existing `device` / `input` fields. Mobile or Touch → Mobile,
Console or Controller → Console, Windows or Keyboard → PC.

## Live Discord online count (home banner)
Uses `discord.guildId`. Turn it on in Discord: **Server Settings → Widget →
Enable Server Widget**. Nothing else needed.
