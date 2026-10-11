# Player guide

The same instructions the page gives through `help` and `help <topic>`. World edits last for the session only. A new fight starts from the original squares, edges, and balances. Nothing is saved.

Chi is the material. There is no matter resource.

## move

`step n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`. The short words and `go n` do the same. A step costs 15 stamina. At 0 stamina a step is free.

`exits` lists the open directions.

`reshape <dir> open` or `closed`, and `open <dir>` or `close <dir>`, change one edge. That costs 5 chi. No destination: `There is no square that way.` A filled square: `That square is filled.` Already in that state: the edge is not changed and chi is not spent. While you embody someone, these are refused.

## fight

Guard starts on. It answers a printed line that contains its word. The word starts as `thrust`. A telegraph aimed at you outranks auto-attack for that tick while guard is on.

`targets` prints the table in priority order. Each line is a name, why they are on it (`aggro` or `added`), and distance. Anyone who attacks the current body, or whom that body attacks, joins as aggro. An aggro row drops when that body is dead, pacified, or out of sight. `add <name>` puts someone on the table who is not yet listed. `drop <name>` removes an added row. Dropping an aggro row fails while they are still a threat. `add` of someone already listed does nothing.

`priority` prints the sort. It starts as swinging, then nearest. `priority swinging`, `priority nearest`, and `priority weakest` change it. A body in a telegraph window is swinging. Nearest is the fewest squares. Weakest is the lowest momentum. `focus <name>` pins that row to the top. `focus` alone clears it. Focus does not bypass an incoming telegraph while guard is on.

`auto` starts on. Each tick the current body can act, it faces the top row and attacks. It does not need a typed thrust. `auto off` leaves thrust, dodge, and the rest to you. Turning auto on does not clear a telegraph that is already coming.

`thrust`, `dodge`, `block`, `abort`, `shove`, `swap`, `lock`, `roll`, `feint`, `interrupt`.

`execute` is a kill. `mercy` is not. Only a kill moves chi. Bounties: lurker 20, hound 30, wisp 40. Any other body grants nothing. The body that lands the execute receives the bounty.

## chi

Each body starts with 10 chi. It does not return on its own. It is not on the prompt.

`chi` prints the balance. If that body left a stain, `chi` also says where. `score` shows momentum and chi as separate numbers.

`describe here <text>` costs 2 and rewrites the one sentence `look` prints for this square. One line, 80 characters.

`describe <item> <text>` costs 2. The item is in hand or on this square. `examine` then shows that line. Describing yourself is free and does not spend chi.

`open`, `close`, and `reshape` cost 5. See move.

Short chi: `That takes 2 chi. You have 1.` The numbers are the real cost and the balance you have. Nothing changes.

A kill pays the bounty in chi and nothing else. Mercy pays nothing and drops nothing.

If you are executed, your unspent chi drops on the death square and your balance becomes 0. Spent chi is already gone and is not in the stain. With nothing unspent, there is no stain. One stain per body. Die again before you pick it up and the old stain is gone. An NPC you kill does not leave a stain. The bounty is the chi.

Stand on the stain, or `get chi` while standing there, and that chi fills the body you are currently in. `There is no chi here` means it is not your stain or you are not standing on it. The corpse still has no loot.

While embodied, `chi` and the chi on `score` are the NPC's balance. An execute you land pays that NPC. If that body is executed, their unspent chi drops and Jay's chi does not change. `release` does not transfer chi.

## craft

`craft` lists the three recipes. The body you are in pays, including an embodied NPC. If chi or the wild item is short, one line says which and nothing is made.

- draught: 1 yarrow, 2 chi. Drink it to clear bleed.
- token: 3 chi. A carried item. `describe token <text>` still costs 2 chi.
- brace: 1 shard, 5 chi. Inventory reads `a plain brace.`

`gather shard` while standing on a node in the yard or the lane adds 1 shard. `look stone` in the yard lists the recipes with their chi and wild items.

## speak

The current body speaks. An embodied NPC uses their own name.

- `say <text>` prints `Name says, "text"`.
- `say <text> / <manner>` prints `Name says <manner>, "text"`.
- `emote <text>` and `: <text>` print `Name <text>`.
- `pose <text>` stores a line. `pose` repeats it. `pose clear` clears it.

A muted body's say, emote, and pose produce one refusal and nothing anyone else hears.

## embody

Admin only. This is how you play that person for a scene. It is stagehand work so the NPC moves and speaks. It is not a way to spend chi through world edits.

`embody <name>`. `release` returns to Jay.

While embodied, look, say, say with `/manner`, emote, pose, and step use that NPC. A fight uses that NPC's chi. `describe`, `reshape`, `open`, and `close` are refused and chi does not move.

A non-admin who types `embody` gets only `You cannot do that.`

`help embody`, for an admin, is the two-line stagehand note.

## tutorial

`tutorial` shows the current step and the one command to try. Typing it again repeats the hint. The area is west of the arena. You can leave and come back. Progress stays for the session.

## portal

A name is one to three words the gate holds.

Each name is one land. `set` in the court adds a piece you found.

## framework

`kick`, `ban`, `unban`, `login`, `connect`, `save`, `areas`, and `channel` are accepted and not built. `area` and `chan` use those same lines. They change nothing. It will keep describe, reshape, and crafted changes for everyone.
