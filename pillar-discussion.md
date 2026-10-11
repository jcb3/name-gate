# Pillar discussion

## Missing pillars

Concept-level gaps. Named pillars (grid, telegraphs and shapes, souls-like difficulty, weapon practice, potions, village, monsters, townsfolk scripts, social play, the manual / routine / script lever stack) are omitted on purpose. Full note: [concept-gaps.md](/cursor/stores/self/docs/concept-gaps.md).

### Situation and stop

The concept is a fight, a craft, a village, and other people. It never says what the player is in the middle of, or what would count as a session being over. Practice, potions, and a hard duel have nothing to be for until that is named.

**Decision:** Who is the player, what pressure are they under, and what ends a session?

### Failure and return

Souls-like hardness is what a lost fight does to you, not only how exact the swing is. Weapon practice is the long investment, and a potion is the thing you carried in. Both stay undefined until a fall has a rule for what it strips, what it leaves, and where you come back.

**Decision:** What does a lost fight take, what persists (practice in particular), and where do you re-enter?

### Injury

A landed shape has to change a body that is still in the fight. The potion exists to spend a beat on that change instead of on a step. "Very hard" and "stops the bleeding" both point at this, and neither says what the body is keeping track of on the beats before you fall.

**Decision:** What does a shape that connects change on a creature, and which of those changes can a draught undo?

### Defensive answer

Facing, reach, telegraphs, and shapes describe the threat. A souls-like fight is the answer to that threat. The concept never names a defensive pillar, so it is open whether the reply is only footwork on the grid or a committed guard that is not a step.

**Decision:** What is the closed list of answers to a printed shape? Is every answer movement or spending the beat, or is there a defense that is neither?

### One clock

A telegraph only works if another body gets a beat before the shape lands. A brew takes several beats on one square. Townsfolk scripts have to walk and react in that same village. Those are one world only if they spend one kind of time.

**Decision:** Do movement, speech, craft, townsfolk scripts, and swings all spend the same beat, and does that beat advance while a player does nothing?

### Company on a one-body grid

Social play here has to be talk, trade, and a joint undertaking. Ordinary occupancy is one body to a square, and sharing a square is close proximity, the same band as a fist. "Together" has no meaning yet that can live on that rule, including two people against one creature.

**Decision:** How do players and townsfolk keep company (who hears you, how a group holds a street, how two people share a fight), and does talk spend a beat?

### Violence in the settlement

Townsfolk stand on the squares the shapes already use. A shape hits every body it names. The village and the fight need a rule for whether a swing belongs in the street, and for what a townsfolk script is allowed to do when one happens.

**Decision:** Do combat rules run in the settlement, stop at its edge, or run and get an answer from the town?

### One attack language

The readable fight is a printed shape and a later release. Monsters are promised attacks of their own, and a townsfolk script may have to answer violence. Either those are other shapes on the same levers, or something in the world can hurt a player without the tell the combat concept is built on.

**Decision:** Is every harm a creature does a telegraphed shape on the shared levers?

## Workflow reply

Process only. These pillars join the revision list in [design-workflow.md](/cursor/stores/self/docs/design-workflow.md). The sketch stays. The next iteration takes one line — the open line on the earliest module — and edits that module's artifact. The other lines wait. Module order: premise, player verbs, world state, content slice, playtest. No new module is required.

### Situation and stop

**Module:** premise.

Who the player is, the pressure, and what ends a session is the premise note. The next iteration picks this line first and writes that note. That pass leaves verbs, the state sheet, and the cottage slice as they are.

### Failure and return

**Module:** world state.

What a fall strips, what persists (practice included), and where you re-enter are fields on the state sheet, and the event that writes them. The sketch already labels death and recovery as an open assumption; this line fills those fields. The next iteration that picks it records the fields, and leaves unknown choices written as questions on the sheet. The session's stop sentence stays in the premise note. If the decision is that a fall ends the session and nothing comes back, the line that iteration writes names premise, and this state line waits.

### Injury

**Module:** world state.

What a shape that connects changes, and what a draught undoes, are body fields. The writers are the shape resolving and `drink`, which are already actions. The next iteration that picks this line adds the fields and those writers to the state sheet. If the decision needs a separate care action, the line that iteration writes names player verbs for a later pass.

### Defensive answer

**Module:** player verbs.

The closed list of answers to a printed shape is the verb list. A guard that is neither a step nor a spent beat is either a verb on that list or an entry on "not available." The next iteration that picks this line marks each answer in-slice or later. The cottage example stays as written.

### One clock

**Module:** world state.

Whether movement, speech, craft, townsfolk scripts, and swings spend the same beat, and whether that beat advances while a player does nothing, is the clock on the state sheet. The next iteration that picks this line writes that clock. Speech and townsfolk actions wait for their own lines.

### Company on a one-body grid

**Module:** world state.

Who hears you, how a group holds a street, and how two people share a fight are facts about other bodies under the one-body rule. The next iteration that picks this line adds those fields and records whether talk spends a beat. If talk spends a beat and `say` is not on the verb list, the line that iteration writes names player verbs for a later pass.

### Violence in the settlement

**Module:** world state.

Whether combat runs in the settlement, stops at its edge, or runs and gets an answer from the town is a fact on a place, together with what a townsfolk script may change when a shape lands. The next iteration that picks this line writes that fact on the state sheet. The cottage slice stays the first slice.

### One attack language

**Module:** player verbs.

The verb list is the harm contract for every creature. The next iteration that picks this line says monster and townsfolk harm uses the same telegraphed shape levers, or names the exception on "not available." A particular creature's shape is a later content-slice line.

Eight lines, one iteration each. Next pass is situation and stop, on the premise artifact alone.

## Design reply

Jay's set pillars stay as he set them. The sketch now holds them in one place: the 5×5 personal-space grid, facing, telegraphs, reach, sight, and shapes, souls-like commitment, weapon practice as levers rather than a stat, yarrow, the hamlet, three monsters, townsfolk with assigned behavior scripts, social play, and the manual / routine / script stack. The file had still been the cottage-only example. The cottage is now one building on the hamlet map, not a second layout.

Taken into the sketch:

- **One attack language.** Decision. Every harm is a telegraphed shape on the shared levers. The lurker, the hound, and the wisp are behavior scripts that call those levers. Nothing hits without a printed square list.
- **One clock.** Decision. Movement, facing, telegraph, release, drink, gather, give, craft, and a townsfolk or monster physical action spend the same beat. A pass still advances it. Out of a fight, `say` is free. In a fight, `say` spends the beat. On an assigned script, `say` is a cue on that beat's lever, not a second action.
- **Defensive answer.** Decision for this pass. The closed list is step onto a square the print does not name, close into a square the shape excludes, or spend the beat and take the hit. No guard, parry, or block.
- **Company.** Decision. Together is neighboring squares. A group holds the lane by each person on their own square. Two people share a fight through the printed list and their own beats. You hear speech on squares you can see.
- **Violence in the settlement.** Decision. Combat runs on hamlet squares. A shape hits townsfolk in the print. Their scripts may step, cue a line, or windup. No safe bubble.
- **Injury.** Working rule, marked open. A connect starts bleeding. Yarrow clears bleeding and does not move you. A connect while you are already bleeding drops you. Nothing else is tracked.
- **Failure and return.** Working recommendation, marked open. You leave the square and do not reappear there. Practice persists. What else a fall strips, and the return square, are unset. `L1` is only a placeholder.

Left until a later iteration:

- **Situation and stop.** Not invented. It is the premise note. The hamlet is a place to walk, not a session ending.
- A guard that is neither a step nor a spent beat.
- What the town does after a swing (blame, a debt, exile).
- Any body-state besides that one bleeding flag.
- The real strip list and the real return square.
- Economy, quests, and character creation. They were not in the gap list, and they are not in the sketch.

Jay still has to decide: who the player is, the pressure, and what ends a session; whether practice really persists and what a fall takes, including where you re-enter; whether bleeding and a second connect is the injury rule; whether a later pass adds a guard; whether the beat advances on a pass and whether in-fight `say` spends it; whether combat-in-town with no bubble is right, and whether the town answers later. Diagonal steps, corner sight, turn order, and glimpse range are still open at the bottom of the sketch.

To the workflow reply: the next playable artifact, when that loop starts, is the premise note alone. I did not write one. The working rules above went into the spatial sketch because that is the concept note, and the beat, the draught, and the shapes were already using an undefined clock, an undefined hit, and an undefined monster swing. The hamlet map is the village pillar the gap note already treated as named; the cottage-only drawing was the file lagging that decision. "Leave the cottage slice" fits the content-slice artifact, which is not on disk yet. It does not keep a second, smaller map in the concept note.

## Pillar reply

I accept the workflow filing. Eight lines, no new module. The next iteration is the premise note alone. Failure and return, injury, the clock, company, and violence in the settlement are state lines. The defensive answer, and the rule that creatures harm through the same levers, are verb-list lines. The sentence that ends a session stays in the premise.

I accept these as the sketch's working close of the pillar:

- One attack language. Every harm is a printed shape on the shared levers.
- One clock. One beat for movement, craft, swings, and townsfolk motion. A pass advances it. Speech is free outside a fight and spends the beat inside one.
- Defensive answer, this pass. Step off the print, close into a square the shape excludes, or spend the beat and be hit.
- Company. Neighboring squares, each person on their own beat, speech from squares you can see.
- Violence in the settlement. Combat runs in the hamlet. There is no safe square. Blame, debt, or exile stays open. That is the civic remainder, not a new pillar.

I accept injury, and failure and return, as open working rules. Bleeding, cleared by yarrow, with a second connect dropping you, is the injury rule to confirm. Practice persisting is the right recommendation. What else a fall takes, and the square you come back to, stay open.

I accept situation and stop as unwritten. The hamlet is a place to walk. It is not a session.

I accept the sketch holding the hamlet and these working rules, and the workflow's next artifact staying the premise note. "Leave the cottage" belongs to a content slice that is not on disk.

## v3 reconciliation

[combat-system-v3.md](/cursor/stores/self/docs/combat-system-v3.md) is the combat design. Where the sketch or the replies above disagree with it, v3 wins. The sketch no longer carries a second fight. Premise (who the player is, what ends a session) is still unwritten.

Replaced in the sketch, each with a pointer into v3:

- Hit points, and a second bleeding hit that drops you. Momentum runs from -100 to +100. At -100 the winner chooses execute or mercy.
- Bleeding as the core injury. Bleeding and fire are aggravated damage: a separate, rare, curable kill. Yarrow is only that cure.
- "No guard this pass." Defense is dodge, roll, block, riposte, and feint. Weapon shape also sets how wide one defense covers.
- The beat as a turn clock. Combat is 200–250ms ticks, one action per tick, server-authoritative.
- Personal space, `close` into a hostile square, orthogonal-only steps, and facing you spend an action to track. One body per square, except allies and a few non-combat shares. Diagonals match orthogonal (Chebyshev). Facing is the last attack or a free target-lock.
- The 15-foot glimpse. Sight is about 25 feet.
- Shown / practiced / steady as a gate on routines. Moves unlock by reps with that weapon.
- A system sentence that lists squares as the telegraph. Player telegraph text needs a required keyword. Feints may borrow it.
- Telegraph-and-step, aim-then-cut, and planted zones as combat options.

Server routines and pseudocode stay as the lever layer under manual play and client scripts. They are not merged into a new system. Client scripts are the expected way to play.

The earlier replies in this file that accept "no guard," a second bleed, a shared beat, or "together means you never share a square" are the pre-v3 close. They do not override v3.

Still in conflict inside the hamlet, weapon, and townsfolk material:

- Maret, Osen, Nell, and Harl are written as people you can stand beside, drill with, and brew next to. v3 treats non-allies as hostile by default, and safe versus hostile zones are not designed yet. The sketch does not make them allies and does not declare the hamlet safe.
- Maret's script still steps off when a telegraph names her square. That is a small reaction, not a fixed repeating tell. v3 wants NPC combat patterns fixed and repeatable, short of player-level feints.
- How many reps unlock the next weapon move, what a respawn keeps, and whether NPC tells use the keyword rule are unset. v3 does not settle them, and the sketch does not either.

## Refactor

[combat-refactor.md](/cursor/stores/self/docs/combat-refactor.md) is the rule set the stable test runs. v3 and the spatial sketch were not edited. Where the sections above still leave the four villagers undecided, the refactor has chosen: Maret, Osen, Nell, and Harl are allies of the player when the hamlet returns. The hamlet is not a safe zone. The lurker, the hound, and the wisp stay hostile. The stable test stays on an empty arena.

The arena is 5 by 7, lurker `(2, 2)`, player `(2, 4)`, so one step south leaves threat 2. At -100 the fight stops, a later thrust does not land, and execute or mercy sets both momenta to 0. A roll off the template scores once. Aggravated damage forces that same finisher and does not write a death by itself. Place-target hits every body on the square; person-target hits the named body. Feint, roll, and block magnitudes are stubs in the refactor.

## MUD expert

Must have on the playable now. Full words, prints, and the quiet-fight rule: [mud-basics.md](/cursor/stores/self/docs/mud-basics.md).

- look (l)
- examine (exa, exam; look at a thing does this too)
- glance (gl)
- n s e w ne nw se sw (full words and go; same action as step)
- exits (ex)
- inventory (i, inv)
- get (take)
- drop (dro)
- give
- score (sc)
- who
- where
- say (', ")
- tell
- help (?)
- commands (cmds)
- prompt (place, exits, stamina, momentum, in place)
- brief (the default) and verbose
- again (!)
- name
- description (describe)
- During a live fight the log stays on the combat lines, a typed look, and a get, drop, or give success.
- admin (adm), unadmin, mute, unmute, mutes. Jay starts as an admin. who marks admin and muted. Mute is the chat control that works.
- Reserved, no effect: kick, ban, unban, login, connect, save, areas (area), channel (chan).
- embody, release. Admin only. Commands are that NPC's until release. The prompt shows their name. No out-of-character override.
- chi. Balance only. Square or item line costs 2. One exit, open or close, costs 5. Short: the cost and the balance. Stubs.
- Execute grants the victim's bounty immediately (lurker 20, hound 30, wisp 40, stubs). Mercy grants nothing. Unspent chi stains the death square, one stain, lost if you die again first. Spent chi is not dropped.
- say, with a slash for a manner. emote (:). pose, pose alone, pose clear. The current body speaks. A muted body's say, emote, and pose do not go out.
- Embody is stagehand work. Look, say, emote, pose, and step only. Describe, reshape, open, and close are refused. Chi is not spent and not moved.
- While embodied, a fight uses that NPC's chi. `chi` and `score` show it. A kill pays that NPC. Their death drops their chi. The admin's chi is untouched. `release` does not move chi. World edits stay refused.
- matter, gather matter, craft. Draught: 1 yarrow, 1 matter, 2 chi. Token: 2 matter, 3 chi. Brace: 3 matter, 5 chi. A kill also gives 1 matter.
- Chi is the only material. Draught: 1 yarrow, 2 chi. Token: 3 chi. Brace: 1 shard, 5 chi. A kill grants chi only.
- Later, `save` and `areas` keep one shared world, so a player's describe, reshape, and crafted changes stay and other players see the same squares; today those commands do nothing, and edits on this page last only for the session.

