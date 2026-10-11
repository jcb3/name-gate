---
cursor:
  subagentId: "bc-705512b6-753a-548a-a7a2-1c5691a5fd29"
---

# MUD basics

Day-one commands for the playable page. Combat stays as it is in [combat-refactor.md](/cursor/stores/self/docs/combat-refactor.md). This file adds the words a new player types to look, move, carry, talk, and read their own numbers. The hamlet map, weapons, and townsfolk are the ones in [spatial-mud-design.md](/cursor/stores/self/docs/spatial-mud-design.md). Maret, Osen, Nell, and Harl are allies. The lurker, the hound, and the wisp stay hostile.

Match the whole first word. Do not accept unique prefixes. `s` is south, `sc` is score, `se` is southeast, `sw` is southwest, `say` is say, `step` is step. `n` is north, `ne` and `nw` are the diagonals. `ex` is exits, `exa` is examine. `w` is west, `who` and `where` are those commands.

The engine name of the player body stays `Jay`, including combat lines (`Jay steps south.`) and the scripted pass. `name` changes only the display name.

## Where a line goes

Three places, already on the page:

- **Log** (`#log`). Transcript. Append only.
- **Note** (`#note`). One line, replaced. Refusals already land here.
- **Prompt.** A new line directly above the input. Replace its text in place. It is not in the log, and it is not an aria-live region. The sidebar grid and the fight status stay.

**Live fight.** A telegraph is pending (declare until commit), or execute/mercy is waiting, or Jay and a hostile are within threat 2 and either holds a lock on the other.

During a live fight the log may gain only:

- the lines it already gains: telegraph, step, shove, abort, hit, whiff, block, breakpoint word, finisher, leash, routine action
- a `look` the player just typed
- one success line from `get`, `drop`, or `give`

Anything else the player types during a live fight goes to the note. NPC speech waits. Default mode is brief, so a step adds no room text.

The scripted pass reads a fight log with no digits and without the word `momentum`. Do not put either into an automatic line. `look` may contain both, and that pass does not type `look`.

## Look, examine, glance

### look — now

`look`, `l`. No argument.

Log, including during a live fight. On the arena, keep the grid it prints now, plus the stamina and momentum line. On a hamlet square, do not paste that grid. Print:

```
L3, lane.
Lane stones.
Harl is here.
Exits: n e s w ne nw se sw
stamina 100  momentum 0
```

Short name, then one sentence, then other bodies on this square, then exits, then Jay's own stamina and momentum. No other body on the square: omit that line. Empty hands or a full inventory are not in `look`. An argument (`look spear`, `l spear`) is examine.

Use the sentences already written for `L1`, `G5`, and `D7`. Every other square gets a short name and one sentence of that length, from the map label (lane, meadow, hearth, well, post). If a sentence is still missing, print the short name only.

### examine — now

`examine`, `exa`, `exam`. Also `look <thing>` and `l <thing>`.

One thing in sight: a body, a carried or ground item, or the square's fixture (well, post, chest, door). Outside a live fight, one log line. During a live fight, the note.

```
Harl. He stands in the lane and watches the thicket.
```

```
A straight spear. The thrust is its move.
```

No argument: note `Examine what?` Not in sight, or no such thing: note `You cannot see that.`

Townsfolk lines, one each: Maret keeps the yard and the post. Osen keeps the hearth. Nell stands by the well. Harl stands in the lane and watches the thicket. Knife: a knife, the point is its move. Hatchet: a short hatchet, the cleave is its move. Yarrow: a handful of yarrow. Examining yourself prints the display name and the description line.

### glance — now

`glance`, `gl`. Extra words are ignored.

Always the note, never the log. This square only, one line, no sentence and no numbers:

```
L3 lane. Harl is here. Exits: n e s w ne nw se sw
```

No other body: `L3 lane. Exits: n e s w`.

## Movement and exits — now

An exit is an open edge onto a square that exists and can be entered. Walls, the fence (except the gate `G5`–`R5`), briar, the well `G4`, and the post `E6` are not exits. Doors are the cottage door `C2`–`L2` and the still door `C7`–`L7`. List exits in this order, lowercase, omitting closed ones: `n e s w ne nw se sw`.

`north` `n`, `south` `s`, `east` `e`, `west` `w`, `northeast` `ne`, `northwest` `nw`, `southeast` `se`, `southwest` `sw`. `go north` is the same command. These call `step`. Same tick, same stamina, same refusal text. `step n` still works. There is no second move verb.

Success stays the combat line: `Jay steps south.` A refusal stays in the note (`That square is closed.`, `Jay has no stamina.`, `Unknown direction.`). Outside a live fight, verbose mode also prints a `look` after the step line. Brief mode, and any live fight, print the step line only.

### exits — now

`exits`, `ex`. Note: `Exits: n e s w ne nw se sw`. No open edge: `Exits: none`.

On the arena, the place is `2,4 arena`, and an exit is any of the eight directions that stays inside x 0–4, y 0–6 and is not blocked.

## Inventory, get, drop, give

The knife starts in hand on the hamlet. The spear is on `E1`. The hatchet is on `D6`. Yarrow is on `G2` and `G8`. One weapon in hand. The arena session still starts holding the spear.

### inventory — now

`inventory`, `inv`, `i`. Note, one line.

```
holding spear  ·  carrying nothing
```

A handful or a second item uses `carrying yarrow`. Nothing in hand: `holding nothing`. Reps, stamina, and momentum are not in this line.

### get — now

`get <item>`, `take <item>`. The item is on your square. One word: `spear`, `hatchet`, `knife`, `yarrow`.

A weapon, and the hand is empty: it becomes the held weapon. The hand is full: note `You are holding the spear.` and the item stays. Nothing here: note `There is no spear here.` No argument: note `Get what?`

Success, log: `You get the spear.` Outside a live fight this is immediate. During a live fight it spends the tick. `get` on a corpse marker stays immediate and sets the note to `The corpse has no loot.` That string stays exact.

### drop — now

`drop <item>`, `dro <item>`. Success, log: `You drop the spear.` It lands on your square. The hand is then empty if that was the held weapon. Not carrying it: note `You are not carrying that.` No argument: note `Drop what?` Same tick rule as `get`.

### give — now

`give <item> <name>` or `give <item> to <name>`.

The target is in sight and adjacent (Chebyshev 1), or sharing your square. Success, log: `You give the yarrow to Osen.` They carry it. A held weapon leaves the hand. Too far: note `They are too far.` Not in sight: note `You cannot see them.` Not carrying it: note `You are not carrying that.` A refusal does not spend the tick. Same tick rule as `get`.

## Score, who, where

Sight is Chebyshev distance 5 (25 feet). A filled square on the straight line blocks the squares behind it. The fence hides the briar beside the gate. From `L1` the hound on `L9` is out of sight.

### score — now

`score`, `sc`. Note, one line. The current body's stamina, momentum, and chi, then the held weapon. No titles, no kills, no level, no opponent momentum.

```
Jay  stamina 100  momentum 0  chi 10  holding spear
```

Use that body's name. Momentum is the plain integer (`0`, `-20`, `15`). While embodied, `score` shows that NPC's stamina, momentum, and chi.

Momentum is the fight. Chi is the purse. Score shows both. Describing yourself is free. Describing a square or an item spends your chi. While embodied, describe, reshape, open, and close are refused. A fight uses that NPC's chi. Releasing does not move chi between you and them. World edits last for the session only, until the save hook is real.

### who — now

`who`. Note. You, and every other body in sight, alphabetical, one line. Add `, admin` or `, muted` when that is set. Both can show.

```
Harl L3  ·  Jay L3, admin  ·  Nell G3, muted
```

Alone: `Jay L3, admin`.

### where — now

`where`. Note: `You are on L3, lane. Exits: n e s w ne nw se sw`

`where <name>`. In sight: `Harl is on L3.` Otherwise: `You cannot see them.`

## Say and tell

Speech does not spend the tick and does not enter the action queue. It never prints a room. The current body speaks. While an admin embodies an NPC, the name on these lines is that NPC's. A muted body's `say`, `tell`, `emote`, and `pose` do not go out. Note: `You are muted.` Nobody else sees the text.

### say — now

`say <text>`, `' <text>`, `" <text>`. The rest of the line is the text. Empty: note `Say what?`

Outside a live fight, log: `Jay says, "hello"`. A slash sets a manner: `say hello / quietly` prints `Jay says quietly, "hello"`. The words before ` / ` are the text. The words after it are the manner. A bare slash leaves the manner off. During a live fight, that same line goes to the note and is not copied into the log later.

### emote — now

`emote <text>`, and `:` before the text (`: smiles` or `:smiles`). Outside a live fight, log: `Jay smiles`. No "says". Empty: note `Emote what?` During a live fight, the note, and it is not copied into the log later.

### pose — now

`pose <text>` stores a custom emote on the current body. Note: `Pose set.` It does not speak. `pose` alone repeats it. Outside a live fight, log: `Jay leans on the post.` During a live fight, the note. Nothing stored: note `No pose set.` `pose clear` clears it. Note: `Pose cleared.` A muted body can still store and clear. The repeat does not go out.

A body hears it when the speaker is in sight. Print no "X hears you" line.

NPC speech (Maret's rep line and any other cue) appends to the log only on a tick that printed no telegraph: `Maret says, "Reps on the post. The next hatchet move comes from those reps."` One queued line per speaker. The newest replaces the older one.

### tell — now

`tell <name> <text>`. The name is the first word. It must be a body in sight. Empty text: note `Tell them what?`

Outside a live fight, log: `You tell Harl, "the gate is open"`. During a live fight, the note. Not in sight: note `You cannot see them.` There is no tell across the map.

## Help and the command list — now

`help`, `?`, `commands`, `cmds`.

These refresh the sidebar command list and set the note to `Commands are listed beside the grid.` They do not append the log. `help <word>` sets the note to that one line below and does not append the log. `help embody` is the exception under Embody.

Sidebar list, one line each:

```
look (l) — this square, who is here, exits
examine (exa, exam) — one thing you can see; look <thing> does this
glance (gl) — one line for this square
n s e w ne nw se sw — step that way; full words work; go n works
exits (ex) — the open directions
inventory (i, inv) — what you hold and carry
get (take) — pick up what is on your square
drop (dro) — put it on your square
give — hand it to someone adjacent
score (sc) — your stamina and momentum
who — bodies in sight
where — your square, or where <name>
say (', ") — Name says, "text"; a slash adds a manner
emote (:) — Name text, no says
pose — store an emote; pose alone repeats it; pose clear clears it
tell — tell <name> <text>, if you can see them
help (?) — this list
commands (cmds) — this list
brief — arrive without a room
verbose — arrive with a look, outside a fight
again (!) — repeat the last command
name — the name people see
description (describe) — the line examine shows for you
release — return to your own body
chi — the balance
craft — the three recipes
open, close — one exit, spends chi
admin (adm) — grant admin
unadmin — remove admin
mute — silence say, tell, emote, and pose
unmute — restore say and tell
mutes — list who is muted
kick, ban, unban, login, connect, save, areas, channel — reserved; accepted, not built
```

Under that, one line, not a combat manual: `Fight: guard, thrust, dodge, block, step, roll, feint, interrupt, lock, abort, shove, swap, hold, clear, execute, mercy.`

## Prompt — now

Standing line above the input. Replace it whenever the square, the exits, stamina, or momentum changes. A tick that changes none of these leaves the log untouched.

```
L3 lane [n e s w ne nw se sw] sta 100 mom 0
```

Arena: `2,4 arena [n s e w] sta 100 mom 0`. No exits: `[none]`. Typing `prompt` copies that line to the note.

While you embody an NPC, the line leads with that name and uses that body's square, exits, stamina, and momentum: `Nell G3 green [n e s w] sta 100 mom 0`. `release` restores the usual line. Chi is not on the prompt.

## Brief and verbose — now

`brief`, `verbose`. Note: `Brief mode.` or `Verbose mode.` Default is brief.

Brief: a successful step prints `Jay steps south.` and nothing else. Verbose, and the fight is not live: that step line, then a `look`. Verbose during a live fight adds nothing. Neither mode prints on a tick.

On entering the hamlet, print one `look`, then the prompt. Do not print another until the player asks, or until a verbose arrival outside a fight. The arena's opening `look` stays.

## Again — now

`again`, `!`. Resubmit the last raw line the player sent, skipping `again` and `!`. A combat line queues the way it did the first time. A free line runs the way it did the first time. Nothing to repeat: note `Nothing to repeat.` Arrow-up history stays.

## Name and description — now

`describe` sets your own line. It does not examine, and it does not spend chi. If the rest of the line is only a thing in sight, note `Use examine to look at that.` `describe here` and `describe <item> <text>` are world changes, under Chi.

`name` with no text. Note: `You are Jay.`

`name <words>`. Letters, spaces, apostrophes. 2–16 characters. Note: `You are now called Ash.` Refuse a command word or Maret, Osen, Nell, Harl, Lurker, Hound, Wisp: note `That name is taken.` Score, who, examine, say, and tell use the display name. Combat lines keep `Jay`.

`description` or `describe` with no text. Note the current line. Default: `No description set.`

`description <text>` or `describe <text>`. One line, 80 characters. Note: `Description set.` Examining yourself shows the display name and this line. Neither command spends the tick.

## Admin — now

Jay starts as an admin. A display-name change does not remove it. The engine id stays `Jay`.

These are admin only, do not spend the tick, and write the note. A non-admin gets `You are not an admin.` The name is any body in the session. Sight does not matter. Unknown: `There is nobody named that.` No name: `Name whom?`

`admin`, `adm`. Note: `Nell is an admin.`

`unadmin`. Note: `Nell is no longer an admin.`

`mute`. Note: `Nell is muted.` That body's `say`, `tell`, `emote`, and `pose` stop.

`unmute`. Note: `Nell is no longer muted.`

`mutes`. Note: `Muted: Nell`, or `Muted: none`.

Silence is the chat control that works.

## Embody — now

Embody is admin stagehand work so an NPC can move and speak and the world feels alive. It is not the admin's adventure. The yard sign does not mention embody. The public command list does not either.

`embody <name>`. Admin only. No shorter form. Note: `You embody Nell.` A non-admin gets only `You cannot do that.` Unknown: `There is nobody named that.` Your own body: `You are already yourself.` Already embodying: `Release first.`

Until `release`, look, say (including the slash manner), emote, pose, and step are that NPC's. `tell` follows say. The prompt shows their name. Their script does not also act. Say, tell, emote, and pose still stop if that body is muted. The engine id of the player stays `Jay`.

`describe`, `reshape`, `open`, and `close` are refused. Note: `You cannot do that.` Those do not spend chi.

A fight uses that NPC's chi, not the admin's. `chi` and `score` show the NPC's balance. A kill grants the bounty to that NPC. If that body is executed, that NPC's unspent chi drops and the admin's chi is untouched. `release` does not move chi between Jay and the NPC.

`release`. Admin only. Note: `You are Jay again.` The prompt returns to your own body. Not embodying: `You are already yourself.` A non-admin gets only `You cannot do that.`

Neither command spends a tick or chi. Both write the note, including during a live fight.

`help embody`, for an admin, is these two lines and nothing else:

```
This is how you play that person for a scene.
Look, say, emote, pose, and step are theirs. Describe, reshape, open, and close are refused.
```

A non-admin who types `help embody` gets only `You cannot do that.`

## Chi — now

Chi is the resource a body spends to change the world. Jay said chi. Each body starts at 10 **STUB**. It does not regen, and it is not on the prompt. Score shows this same balance. While embodied, `chi` and `score` show the NPC's balance, and a fight uses that chi. describe, reshape, open, and close stay refused. `release` does not move chi between Jay and the NPC.

The page does not open with a lesson. Help names the commands and does not list prices. A short balance teaches the cost.

`chi`. Note: `Chi 10.`

These do not spend the tick. Outside a live fight the success line goes to the log. During a live fight it goes to the note. A refusal is always the note, and it changes nothing.

`describe here <text>`. Rewrites the one sentence `look` prints for this square. One line, 80 characters. Costs 2 chi **STUB**. Note or log: `You spend 2 chi. This square now reads: Wet lane stones.` No text: `Describe what?` Too long: `Keep it to one line.`

`describe <item> <text>`. The item is in hand or on this square. `examine` then shows that line. Costs 2 chi **STUB**. `You spend 2 chi. The spear now reads: A nicked spear.` Missing: `There is no spear here.`

`open <dir>` and `close <dir>`. Also `reshape <dir> open` and `reshape <dir> closed`. One edge, the direction words you already use for step. Costs 5 chi **STUB**. `You spend 5 chi. North is open.` or `You spend 5 chi. North is closed.` The exit list and later looks use the new edge.

No destination square: `There is no square that way.` A filled square (well, post): `That square is filled.` Already in that state: `North is already open.` or `North is already closed.` None of these spend chi.

Short: `That takes 2 chi. You have 1.` Use the real cost and the balance. The world does not change.

### A kill

Execute is a kill. The killer takes the victim's bounty immediately. While embodied, that killer is the NPC, and the bounty goes to the NPC. Log: `You take 20 chi.` Mercy is not a kill. It grants nothing and drops nothing. If the embodied body is executed, that NPC's unspent chi drops and the admin's chi is untouched.

Unspent chi drops on the death square, the square that receives the corpse marker, not the square the body is sent to. Spent chi is already gone and is not dropped. The body's balance becomes 0. With nothing unspent, there is no stain and no line. Otherwise the owner gets `You drop 8 chi on L3.` Use the real amount and the square.

One stain per body. A second death before retrieval clears the old stain. Note: `The chi you left is gone.` Then the new drop, if any.

The owner retrieves it by standing on that square, or with `get chi` or `take chi` while standing there. The chi goes into the body you are in. Log, outside a live fight: `You take 8 chi.` During a live fight, the note. Anyone else, and `get chi` on any other square: `There is no chi here.` That is not the corpse line. The corpse still blocks the square for 8 ticks and still has no loot. The stain waits.

`look` on that square, for the owner only, adds `Your chi is here.`

Bounties **STUB**: lurker 20, hound 30, wisp 40. Any other body grants nothing. A kill grants chi only.

## Crafting — now

Chi is the fundamental material. There is no second cosmic substance. No tech tree. Every recipe spends chi. Some also consume an item found in the wild. The current body pays. While embodied, that is the NPC's chi.

`chi` is the balance. Note: `Chi 10.`

A shard is gathered in the wild. The spot is on `C5`. `gather shard` there gives 1 shard. The spot stays. Log, outside a live fight: `You gather a shard.` During a live fight, the note. Off the spot: `There is no shard here.` Yarrow is still picked up with `get` on `G2` or `G8`.

`craft` with no arguments lists the three recipes. Note:

```
draught — 1 yarrow, 2 chi
token — 3 chi
brace — 1 shard, 5 chi
```

`craft draught`, `craft token`, `craft brace`. Success, outside a live fight, log: `You craft a draught.` The piece is carried. Inventory lists it. During a live fight, the note. Anything else: `You cannot make that.`

If you are short of chi or missing the wild item, one line says which, and nothing is made. Note: `You need 1 yarrow and 2 chi. You have 0 yarrow and 1 chi.` Name only the parts that are short.

A draught is drunk with `drink draught`. It clears aggravated bleed and does not shift momentum. The draught is consumed. Not bleeding: `You are not bleeding.`

A token is a carried thing made of chi. `describe token <text>` is the item line and still costs 2 chi. While embodied, `describe` stays refused.

A brace is carried. It takes 1 shard and 5 chi. `examine` shows `a plain brace.`

The stone is on `C6`. `look stone` prints:

```
A draught takes 1 yarrow, 2 chi.
A token takes 3 chi.
A brace takes 1 shard, 5 chi.
```

Help names `craft` and does not list the prices.

## MUD transition

Placeholders for the later multi-user framework. Do not build them. One behavior: accepted, not built, no effect. The body stays. Nothing is saved. A reload has nothing to keep. `embody`, `release`, and `chi` are not these hooks. They work on this page.

Later, `save` and `areas` keep one shared world, so a player's describe, reshape, and crafted changes stay and other players see the same squares; today those commands do nothing, and edits on this page last only for the session.

`kick`, `ban`, and `unban` are admin only. Anyone else gets `You are not an admin.` `login`, `connect`, `save`, `areas`, and `channel` are reserved for every player, so those words stay unused.

| Reserve | A player types | The framework owns this later | Note now |
| --- | --- | --- | --- |
| kick | `kick` | Disconnecting that character | `Accepted. kick is not built yet.` |
| ban | `ban` | Storing a ban and refusing the next login | `Accepted. ban is not built yet.` |
| unban | `unban` | Removing a stored ban | `Accepted. unban is not built yet.` |
| login | `login` | Account authentication | `Accepted. login is not built yet.` |
| connect | `connect` | Attaching a session to a character | `Accepted. connect is not built yet.` |
| save | `save` | Keeping a player's describe, reshape, and crafted changes | `Accepted. save is not built yet.` |
| areas | `areas`, `area` | The shared squares other players see | `Accepted. areas is not built yet.` |
| channel | `channel`, `chan` | Named channels past say and tell | `Accepted. channel is not built yet.` |

`area` uses the areas line. `chan` uses the channel line. No password, ban list, or channel flags on this page.

## Can wait

### alias

`alias` lists session aliases in the note. `alias <word> <command>` saves one. `unalias <word>` removes one. The word is one token. Expansion is one level, then the line runs. An alias does not expand into an alias. It cannot replace a built-in word, a direction, or `!`. It does not fire by itself and it is not a routine. Lost on reload.

The built-in shorts above are enough for this page. Add this only after those work.

Also later, and not before: a custom prompt string, `get all`, containers, `wield`, shout, whisper.

## Leave out

- **Command soup.** The lists above are the whole set. No shout, yell, whisper, follow, group, consider, kill, flee, scan, weather, time, news, or a prefix matcher. Leaving is a step. The fight verbs stay the fight verbs.
- **A room on every tick.** The 250ms tick prints nothing by itself. A step during a fight is one line. The prompt updates in place.
- **A score that hides the number.** Score is stamina, momentum, chi, and what you hold. The opponent's momentum stays the breakpoint word. No level, no title, no kill count in front of the numbers.
