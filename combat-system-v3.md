# MUD Combat System — Design Document (v3)

## Mission Statement

Build a real-time, text-based combat system for a MUD that fuses Dark Souls' emphasis on reading and reacting to telegraphed attacks with D&D's tactical grid scale. Rooms are no longer abstract containers — they're built from 5' squares, so physical space, reach, and positioning become real tactical resources instead of flavor text. Combat should reward *reading* an opponent — their telegraphs, their state, their patterns — over raw stat superiority or reflex speed alone. Player-authored telegraph text is itself a mechanical skill: writing convincing feints and legible attacks is as much a part of mastery as timing a counter. The system assumes players will script and automate through their MUD client — that's expected, not cheating — but is designed so that the *best* play is a blend of heavy automation and retained manual judgment, never one or the other. The result should feel like a real fight: tense, readable to a trained eye, exhausting to sustain, and full of moments where a single well-timed read — or a well-told lie — decides the exchange.

---

## World & Grid Model

- Rooms are composed of 5' squares (D&D map scale), not abstract single "rooms." A large space (e.g. a house's ground floor) is rendered as multiple contiguous squares.
- A square can hold at most one occupant, with two exceptions: a small set of deliberate non-combat cases (embracing, sharing a bed), and **allies**, who can share a square as a formal combat-relevant state (see Allies below). Otherwise a square represents the physical space a body takes up in the world.
- No continuously-tracked character facing/directionality. Instead, **facing is derived**: it defaults to the direction of a fighter's last attack, and can be set explicitly via **target-lock** (see Targeting & Facing below).
- Diagonal movement and reach are treated identically to orthogonal (Chebyshev distance) — no alternating/double cost for diagonals.
- Players see a rendered visibility grid out to roughly 25' in all directions.
- The occupancy rule doubles as the answer to "how does a skilled fighter survive being outnumbered": a doorway or hallway square physically caps how many attackers can engage at once. Holding a chokepoint is a real, mechanically necessary tactic (see Multi-Combatant Momentum below), not flavor.
- A lightweight frontline/backline concept is planned (tracking rough formation without full granular positioning or continuous facing) — not yet fully designed.

## Reach & Targeting

- Reach is named by radius in squares: r1, r2, r3, etc. An r2 weapon can strike two squares away.
- Reach and blocking rules are defined per weapon/spell, not as a flat radius. Every attack has:
  1. **Path type** — Straight (direct line), Arc-horizontal (routes around obstacles, e.g. boomerang), Arc-vertical/lob (travels over obstacles, drops on target), or Guided (dynamic routing, e.g. homing spell).
  2. **Blocking rule** — what stops it: occupied squares, terrain/walls, both, or neither (phasing).
  3. **Line-of-sight requirement** — independent of path type.
  4. **Single-target vs. AoE** — AoE attacks have their own impact square (person or place) plus a burst shape.
- Examples: a spear/arrow is straight + blocked by both bodies and terrain. A boomerang arcs around bodies but is still stopped by walls. A magic missile can be guided (still blocked by terrain) or, rarely, a phasing effect (blocked by neither).
- AoE and cone-shaped attacks use **manually authored shape templates** (per-rank square offset patterns relative to a chosen fire direction) rather than a derived formula — a narrow bolt and a wide cone are both just data, not special-cased math. Shapes are direction-agnostic: the same template works rotated to any of the 8 directions with no distinction between diagonal and orthogonal firing. The same blocking-rule matrix applies per square regardless of shape.
- Guided spells that are also terrain-blocked require real pathfinding (grid-scale A* or equivalent) rather than a geometric formula.
- **Attacks and counters/defensive actions share the same shape system.** A defensive action's coverage — how many squares/attackers it can address in one action — depends on the weapon's authored shape, exactly like an offensive attack (e.g. a staff can guard/strike opposite sides of the user; a shamshir can cleave three squares in a row). This is what lets a single action counter multiple simultaneous attackers, if and only if they happen to be positioned inside that shape.

## Targeting & Facing

Three independent target-related values, deliberately decoupled:

- **Target-lock** — a free (no action/stamina cost) command that locks facing toward a chosen target; facing then tracks that target automatically. Singular — no multi-lock. This is effectively how a player selects who they're actively engaging/bracing against.
- **Default attack-target** — a standing "who I'm currently fighting" value for attack commands, independent of the lock/facing value. A player can be locked (facing/bracing) toward one target while their attacks default to a different one.
- **Manual per-action override** — any single action can target a specific person *or* a place/square, overriding both the lock and the default attack-target for that one action, without disturbing either standing value. Place-targeting is what allows AoE origin-square selection or attacking into an expected position.
- Attacks with shapes affecting multiple targets use targeting modifiers (e.g. "nearest," "next") rather than requiring multiple simultaneous locks.
- If no lock is active, facing falls back to the derived default (direction of last attack).

## Timing Model

- Combat runs on **real-time ticks**, not turns — turn-based was rejected as both boring and unworkable with multiple simultaneous players.
- Tick length: **200-250ms**. Chosen deliberately so reaction time matters — attacks are slow (telegraphed) and interrupts/counters are fast, with a window narrow enough to feel punchy but wide enough that a well-timed typed or hotkeyed counter can still swing the outcome.
- Attacks telegraph before landing unless they are fast/interrupt attacks, which skip the telegraph window entirely.
- Feints fake one attack's telegraph while requiring a different correct counter — the core mixup mechanic.
- **A fighter is limited to one action per tick.** This is the actual mechanical constraint behind "can't counter everyone at once" — it's not a hard cap on how many attackers can be addressed (that depends on weapon shape, above), it's a cap on how many separate actions can be taken.
- Combat timing resolves **server-authoritative** on tick receipt, to keep latency fair across players.

## Input & Automation Philosophy

- Players are assumed to use MUD client automation (triggers, hotkeys) as the baseline expectation, not an edge case or exploit.
- Design goal: the **optimal player uses heavy scripting but retains a high degree of manual control** — executing attack patterns and making live decisions, not running fully on autopilot.
- Combat supports both **live reactive counters** (a keypress/command during a telegraph window) and **pre-committed stances/guards** (set before the exchange, auto-resolving against whatever comes).
- Telegraph and momentum-state messages are **player-customizable text**, within constraints (see Telegraph & Text-Authoring Metagame below), on set intervals — refining your own combat text is part of ongoing play, not a one-time setup step.
- Dynamic ally coordination (e.g. interposing) is explicitly seen as a good fit for automation.

## Core Resolution: Momentum & Inertia

**Hit points do not exist as a system.** Combat is resolved entirely through **momentum** — no separate health pool ticking down in parallel. This is the single biggest structural decision in the design; everything below flows from it.

### Momentum
- A single, unified concept — replaces the earlier separate ideas of "footing" and "momentum" (now one term).
- A **signed scale per fighter, from -100% to +100%, starting at 0** (neutral) at the start of a fight. Modeled after tennis scoring: the fight is resolved by swings in a live contest, not by depleting a shared or separate resource.
- Moves via discrete events: a successful attack, a correctly-read counter, or baiting an opponent into a wrong counter (feint) shifts momentum in the acting player's favor and against the other. Momentum is **built by going on the attack** and **lost by performing poorly**.
- Passive drift toward 0 each tick is the primary anti-snowball mechanism.
- **Hidden from the opponent** — a player cannot see the opponent's numeric momentum and must infer it from narration and behavior (including the breakpoint messages below).
- **Visible to the player themselves** — a fighter always knows their own exact momentum. The information game is deliberately asymmetric: perfect self-knowledge, inferred opponent-knowledge.

### Inertia
- The stat-driven (Endurance-equivalent, **not gear-driven**) property that determines how much impulse (successful hits/reads against you) it takes to move your momentum.
- High inertia = harder to push in *either* direction — slower to fall toward -100% (harder to lose), but also slower to build toward +100% (harder to reach legendary flow). This symmetry is the actual tradeoff of the turtle archetype: patience and durability, traded against a slower path to their own peak state.
- Directly explains turtle viability: a patient, high-inertia fighter can absorb far more impulse before their momentum swings meaningfully, following the Dark Souls precedent that stamina/endurance investment is a legitimate, competitive playstyle, not just survival.

### Momentum Breakpoints & Messages
- At **-30 / -60 / -90**, the losing player's own custom, player-authored message displays, showing progressively worse states as they approach a loss. At **-100**, a special, distinct "loss" message displays and the fight resolves (see Finisher below).
- Mirrored on the positive side: **+30 / +60 / +90** show progress toward the peak state, and **+100** ("legendary flow") has its own special message and grants **cumulative bonuses** to the fighter who reaches it.
- All breakpoint messages (±30/60/90/100) follow the **same required-keyword rule** as attack telegraphs (see Telegraph & Text-Authoring Metagame) — legible even when fully player-customized, and part of the same skill of writing/reading combat text.
- Since a fighter always knows their own exact momentum but the opponent only sees these messages at the moment of crossing, a well-crafted breakpoint message can disguise exactly how close a fighter is to further collapse or to peaking — extending the feint-writing skill to self-reporting, not just attack fakery.

### Finisher: Execute or Mercy
- Reaching **-100%** for one fighter is the actual win condition — no health total involved.
- The winning fighter is given a choice at that moment: **execute** or show **mercy**.
  - **Mercy** — the losing fighter is returned to respawn, left **pacified**, but this does not count as dying.
  - **Execute** — the losing fighter dies and is returned to respawn, **not** pacified.
- Death in this system is always a deliberate choice made by the winning player at the finisher moment — never an automatic result of accumulated damage.

### Multi-Combatant Momentum
- Momentum is **not conserved/zero-sum between exactly two named parties**, even though it looks that way in a 1v1 (only two accounts exist there). Each fighter's momentum is their own independent value, updated only by the pairwise events they're personally part of — a skilled ally can gain momentum without taking it from a teammate.
- An outnumbered fighter tracks a **single aggregate momentum value**, not separate tracking per opponent. Being ganged up on is meant to be genuinely punishing.
- **Explicitly rejected:** a universal diminishing-returns-per-attacker mechanic. This would make "unteamable" stat investment mandatory-optimal for everyone and warp the playerbase toward solo-only play.
- **"Legendary fighter beats the odds" is an emergent property**, not a bespoke system: high inertia, positioning (chokepoints via the one-occupant-per-square rule), and a wide-coverage weapon shape together let an exceptional, well-built, well-positioned fighter survive odds an average fighter can't — with nothing free about it. The one-action-per-tick rule keeps this honest: in open ground, a mob overwhelms a defender regardless of skill (only one attack can be countered per tick); only a genuine chokepoint or a wide-shape weapon changes that math.

## Aggravated Damage — An Independent Kill Condition

- Distinct from momentum entirely. Conceived as effects like **bleeding and fire** — ongoing, not a one-time instant effect.
- **Functions as its own kill condition, separate from the momentum/finisher loop: if left uncured, it simply kills the affected player outright**, regardless of momentum state.
- Because of this, aggravated-damage-capable weapons/effects are meant to be rare and powerful — they solve a completely different, more absolute problem than the rest of combat, and should not be a common attack-type choice.
- Curing costs **stamina** and an action (drawn from the same one-action-per-tick pool as everything else) — choosing to cure is explicitly choosing not to counter/attack that tick.
- The effect's real danger is two-layered: the direct death timer if ignored, plus an indirect momentum disadvantage from losing the pace of battle while managing/curing it.
- Runs on its own timing/cadence, separate from the combat tick's split-second exchange rhythm.
- Stacking behavior (flat ongoing drain vs. building toward a threshold/burst) varies per specific effect, not a universal rule.

## Weapon Progression

- Each weapon has multiple distinct attacks/moves, not a fixed kit from the moment it's picked up.
- New moves are **unlocked through use — reps with that specific weapon** — not currency, not an abstract trainer/leveling system.
- Implication: a weapon's more advanced tools (e.g. a shamshir's wide cleave, useful against groups) aren't available to a novice — "hard to gank" is an earned specialization within a weapon's mastery track, not a starting-loadout choice.

## Counters

- **Dodge** — evades in place; stays in the same square. Cheaper (in stamina) than roll. Doesn't change spatial relationship to the opponent, so it doesn't help against reach-based threats the way repositioning would.
- **Roll** — evades and repositions to a different (open, unoccupied) square. Costlier than dodge, since it does double duty (defense + positioning) — useful for escaping a reach weapon's dead zone, flanking, or getting out of a cornered/blocked position.
- **Block** — stamina is charged per hit absorbed, not per activation (mirrors Dark Souls' guard model directly); running a block to zero stamina should trigger a guard-break, feeding into momentum loss.
- **Riposte** — a successful riposte grants an immediate, guaranteed follow-up attack. Stamina cost is paid once, as a single action — the follow-up doesn't incur a separate charge. Not every attack is riposteable (Souls precedent — heavier/specific attacks are immune by design). **Eligibility depends on both weapons** — the attacker's move and the defender's weapon together determine whether a riposte is possible, not the incoming attack alone (implies either a compatibility matrix per weapon pairing, or a simpler shared threshold stat — not yet decided).
- **Feint** — fakes a real telegraph to bait the wrong counter; see Telegraph & Text-Authoring Metagame.

## Allies

- Allies can **share a square** — the occupancy exception extends beyond embracing/bed scenarios to formal ally status.
- **Default hostility**: non-allies — including neutral parties, not just declared enemies — are assumed hostile by default. There is no separate neutral bucket to manage.
- Dynamic ally mechanics like **interposing** (redirecting an incoming hit to an ally) are intended to work, and are seen as good territory for player automation.
- This area is **not fully designed yet** — flagged by the designer as needing deeper exploration later. Open sub-questions: what interposing actually costs and requires (shared square only, or adjacent too), whether ally-sharing a square affects targeting resolution (can an attack hit one specific occupant, or does a shape hit both), and whether allies get any positional/informational combat benefit beyond not auto-aggroing each other.

## Telegraph & Text-Authoring Metagame

- Real (non-feint) telegraph and momentum-breakpoint messages must include a **required keyword** tied to their meaning (e.g. a message at a bad momentum breakpoint must contain a word signaling that), guaranteeing basic legibility even with fully player-customized wording.
- This keyword requirement is deliberately **not sufficient on its own** to defeat simple keyword-matching scripts — the system is designed so naive automation can be baited.
- **Feint messages are much looser** in structure than real telegraphs, and are explicitly *allowed* (not required) to borrow the real telegraph's required keyword. A well-crafted feint can bait a naive keyword-only trigger on purpose; a lazily-written feint won't. Feint-writing quality becomes a real, learnable player skill — not just move-timing, but prose-craft under the game's constraints.
- Net effect: the arms race runs player-vs-player (feint-writing skill vs. trigger sophistication), not player-vs-system. This is the mechanism that keeps the "heavy scripting, high manual control" design goal honest.

## NPC & PvE Philosophy

- **NPCs are not meant to match player-level dynamic sophistication.** Their telegraphs should be fixed/authored and consistently repeatable — the goal is for players to learn and master an NPC's routine the way a Souls player learns a boss's tells, through study and repetition, not through reading dynamically-written text.
- **PvP is the intended "real" challenge / skill ceiling** of the game. PvE is a different kind of test — pattern mastery rather than the live read/bluff metagame of fighting another player.
- **Solo PvE** should involve complex, learnable NPC movesets that specifically punish some weapons/builds and reward others — not every build should be viable against every encounter, meaning players may need to adapt tactics or switch weapons for specific fights.
- **Group PvE at higher levels** is envisioned closer to a raid structure (WoW-style) — defined player roles and multiple simultaneous threat vectors to manage.
- Open question: whether NPC telegraphs follow the same required-keyword rule players do, or are exempt since there's no anti-macro arms race to defend against on the NPC side.

## Basics (MVP Plumbing)

- **Combat initiation**: free-for-all by proximity, not consent-gated — walking into a hostile fighter's threat range is dangerous by default, consistent with the "space is physical" premise. (PvP likely zone-gated at a higher level — certain areas hostile, others safe — rather than per-player consent.)
- **Death & consequences**: resolved by the Finisher/mercy-execute mechanic above, not by a health threshold.
- **Disengaging/fleeing**: costs an action and stamina; leaving a threat range without a roll risks a free/cheap hit from the opponent.
- **Multi-target engagement/aggro**: entering an already-fighting hostile's threat range automatically pulls the new arrival into that fighter's aggregate momentum math — no separate "declare engagement" step.
- **Spectators**: can see telegraphs and narration; outside coordination (e.g. a friend coaching via chat) is an accepted possibility, not something guarded against.
- **Latency handling**: resolved server-authoritative on tick receipt, not client-perceived timing.
- **Disconnection mid-fight**: character goes passive/undefended — no auto-block, no auto-flee — avoiding a logout-to-escape exploit.

## Open Questions / Not Yet Resolved

- Ally system mechanics beyond the basics above — flagged for deeper exploration later (interposing cost/range, shared-square targeting resolution, any positional/informational benefit).
- Frontline/backline formation tracking — direction set (lightweight, no granular positioning), specifics undesigned.
- Whether NPC telegraphs use the player-facing required-keyword rule or a separate, freer convention.
- Riposte eligibility mechanism: full per-weapon-pairing compatibility matrix vs. a simpler shared numeric threshold.
- Exact momentum-shift magnitudes per event type (attack, counter, feint bait) — structure is fully set, numbers are not.
- Group PvE role/threat-vector design — named as a direction, not yet designed.
