# Spatial MUD — iteration 1

Combat rules live in [combat-system-v3.md](/cursor/stores/self/docs/combat-system-v3.md). That file wins. This sketch keeps the hamlet, the weapons you find there, practice, townsfolk, and the server-side lever layer. It does not keep a second fight.

**Open pillar — situation and stop.** Jay has not said who the player is, what pressure they are under, or what ends a session. This sketch does not invent that.

## What this place is for

The hamlet is a measured grid so a lane, a cottage, a still, and a yard are many squares, each with its own description. A whole house is not one room.

**Assumption, labeled:** the unit is feet. One square is 5 feet by 5 feet. The hamlet center below is 45 feet along the lane and 35 feet from the briar to the back of the yard. The cottage is 15 by 15 feet. The still is 10 by 10.

How far a blow reaches, how wide one defense covers, and what a hit does to a fight are not restated here. See v3 **Reach & Targeting**, **Counters**, and **Core Resolution**.

## Spatial model

Squares, walls, and doors stay. The old distance bands, tracked facing, and turn clock do not.

**Occupancy.** See v3 **World & Grid Model** and **Allies**. One body per square, except allies sharing a square and a few non-combat shares (embracing, a shared bed). Non-allies are hostile by default. The old rule that two bodies in one square are "personal space," and that `close` is how you enter a hostile's square to spoil a swing, is withdrawn.

A post or a well can fill a square. You cannot step onto it. A filled square blocks sight through it.

**Movement.** `step` moves one square through an open edge, orthogonal or diagonal. Diagonals match orthogonal distance (Chebyshev). See v3 **World & Grid Model**. The old "diagonal costs two steps" rule is withdrawn.

**Facing.** Not a compass stat you spend an action to turn. Facing is the direction of the last attack, or a free target-lock. See v3 **Targeting & Facing**.

**Sight.** About 25 feet in every direction, a rendered grid. See v3 **World & Grid Model**. The old 15-foot, straight-line glimpse is withdrawn.

**Shapes.** Attack and defense coverage are authored templates, rotated to any of the eight directions, with a path type and a blocking rule. See v3 **Reach & Targeting**. A straight spear template can omit a diagonal neighbor even though that neighbor is the same Chebyshev distance as the square in front of you. That omission is the template, not a longer diagonal.

## Hamlet center

```
                 north
        1    2    3    4    5    6    7    8    9

 R      briar briar briar briar LURK briar briar briar briar
                      fence, except the gate under the lurker
 G      WISP yarrow NELL WELL GATE green green yarrow green
 M      meadow meadow meadow meadow meadow meadow meadow meadow meadow
 L      lane  door  HARL lane  lane  lane  still lane  HOUND
 C      bunk  entry pegs  alley open open  door  shelf verge
 D      bunk  floor table alley MARET open HEARTH cistern verge
 E      chest back  wood  alley open POST open  verge verge
```

- **Gate:** `R5`–`G5` is the only opening in the fence. The lurker stands on `R5`. One square wide: a chokepoint in the sense of v3 **World & Grid Model**.
- **Green:** yarrow on `G2` and `G8`. The well fills `G4`. Nell stands on `G3`. The wisp stands on `G1`.
- **Meadow:** `M1`–`M9`, open.
- **Lane:** `L1`–`L9`. `L1` is the west road. The hound stands on `L9`. Harl stands on `L3`.
- **Cottage** (columns 1–3, rows C–E). Door `C2`–`L2`. Outer walls otherwise.
- **Alley:** column 4, rows C–E, open onto `L4`.
- **Yard:** columns 5–6, rows C–E, open onto `L5` and `L6`. The post fills `E6`. Maret stands on `D5`.
- **Still:** columns 7–8, rows C–D. Door `C7`–`L7`. Osen stands on `D7`, the hearth. `D8` is the cistern.

### What you see

Sight is the 25-foot grid, not a room paragraph. From `L1` you see the lane through about `L6`, the cottage door, the gate, and the near yard. You do not see the hound on `L9` (40 feet east).

**`L1`.** Lane stones. The door south of `L2` is the cottage. Harl is on `L3`.

**`G5`.** The gate. North, through the opening, the lurker's briar `R5`. The fence hides the briar squares beside that opening. South is meadow `M5`, then the lane. West, the well fills `G4`.

**`D7`.** The hearth: coals and a kettle. Osen is on this square, so it is occupied unless she has left. North is the still's entry and the door. East is the cistern. West is the still wall. The lane is through the door, not from the hearth itself.

### The lurker's template, not a second fight

A straight template of reach 2 aimed south from `R5` names `G5` and `M5`. It does not name `G6` or `L5`. `G6` is Chebyshev distance 1 from `R5`, the same as `G5`; the straight path still omits it. `M5` is distance 2 and is on the path. Answers to that tell — dodge, roll, block, riposte, feint — and what a clean hit does are v3 **Counters**, **Timing Model**, and **Core Resolution**. There is no "your beat," no `close` into `R5`, and no bleeding as the result of an ordinary hit.

## Weapons and practice

Three weapons in the hamlet. Each starts with one authored move. Further moves unlock by reps with that weapon. See v3 **Weapon Progression**. The old shown / practiced / steady ladder, and the rule that a routine may not call a weapon until a rank is reached, are withdrawn. Reps unlock moves. They do not add a hidden bonus, and they do not gate client scripting.

| Weapon | First move, as content | Template, aimed south | Where it sits |
| --- | --- | --- | --- |
| Knife | A point on the square in front of you | Range 0 beyond that square | On you from the start |
| Hatchet | A short cleave | The forward square and the two forward diagonals, one template | Maret's yard |
| Spear | A straight thrust | The next square and the one behind it, no side squares | Cottage chest, `E1` |

The yard is where those reps happen. The post fills `E6`. A thrust or cleave aimed at that post is a rep with the weapon in hand. How many reps open the next move is not set in this sketch.

From `D6`, a straight thrust south names the post and does not name Maret on `D5`. The hatchet's first cleave, aimed the same way, also names `E5` and `E7`. Those are template squares at distance 1, not a more expensive diagonal. If the cleave names Maret's square, that is the template, and whether she is hostile for standing there is the unsettled point under Townsfolk.

## Monsters

Three fixed, repeatable patterns. PvE here is pattern mastery. See v3 **NPC & PvE Philosophy**. Whether an NPC tell uses the player's required-keyword rule is still open in that file. Fast attacks that skip the telegraph window exist in v3 **Timing Model**; this sketch does not assign any of these three moves to that category.

**Briar lurker** (`R5`). Straight thorn thrust, reach 2, south through the gate: `G5` and `M5`. The old "if you share its square, it tangles" line is withdrawn. You do not share a hostile's square.

**Lane hound** (`L9`). A cleave aimed west: `L8` and `M8`. Both are distance 1. The still wall omits `C8`. `L7` is distance 2 and outside this template.

**Peat wisp** (`G1`). A cross burst whose center is the square it aims at. Aimed east, the center is `G2`, and the cross names `G2`, `G1`, `G3`, and `M2`. Diagonals of that center are not in this template; they are not "farther." Nell on `G3` is in the print. Gathering on `G2` means standing on the center.

Ordinary hits from these patterns shift momentum. They do not start a fight-ending bleed. See v3 **Core Resolution**. Bleeding or fire, if a later rare move uses them, is aggravated damage. See v3 **Aggravated Damage**.

## Townsfolk

Four people, one square each unless an ally or non-combat share applies.

| Name | Square | Why they are there |
| --- | --- | --- |
| Maret | `D5` | Practice. She keeps the yard and the post. |
| Osen | `D7` | Potions. She keeps the hearth. |
| Nell | `G3` | Rumor. She stands by the well. |
| Harl | `L3` | He stands in the lane and watches the thicket. |

**Still in conflict with v3.** These scenes assume you can stand beside Maret, brew at Osen's hearth, and hear Nell without a fight. v3 **Allies** says non-allies, including neutrals, are hostile by default. v3 **Basics** says safe versus hostile areas are likely zone-gated and are not designed yet. This sketch does not make the four allies, and it does not declare the hamlet safe. Until one of those is decided, the yard lesson and the hearth scene disagree with the hostility default.

Designers assign behavior scripts on the backend. Players do not write townsfolk. Player routines and client scripts are a different layer (see Combat control). NPC combat tells stay fixed and repeatable. See v3 **NPC & PvE Philosophy**. They are not player-authored feints.

Maret's daily pattern, one physical action when she acts. Target-lock is free, so she does not spend an action to turn. See v3 **Targeting & Facing** and **Timing Model**.

```
anchor(D5)
target-lock(post E6)          -- free
if a telegraph names D5:
  step(north)                  -- C5; one action
else if no creature is on D6, E5, or E7:
  attack(hatchet, cleave)      -- one action; aimed south at the post
else:
  say("Reps on the post. The next hatchet move comes from those reps.")
```

The lurker's thrust is the same kind of assigned script: `anchor(R5)`, `attack(lurker, thrust)` on its action, always the south straight template. A player does not edit it.

What the hamlet does after a swing (blame, a debt, exile) is not in v3. Not decided here.

## Time, injury, defense

Withdrawn: the beat as a turn clock, "pass to advance," in-fight `say` costing the turn, "no guard this pass," bleeding as the only injury, and a second bleed that drops you.

**Time.** Combat ticks are 200–250ms, one action per tick, server-authoritative. See v3 **Timing Model**. Craft at the hearth is not claimed to run on that split-second clock.

**Injury.** No hit points. Momentum runs from -100 to +100. At -100 the winner chooses execute or mercy. See v3 **Core Resolution** and **Finisher**. Bleeding and fire are aggravated damage: a separate, rare, curable kill, not the core hit. Curing costs stamina and an action. See v3 **Aggravated Damage**.

**Defense.** Dodge, roll, block, riposte, and feint. The weapon's shape also sets how wide one defense covers. See v3 **Counters** and **Reach & Targeting**.

**Failure.** Death is the winner's execute at -100, not a health threshold and not an automatic second hit. Mercy returns the loser to respawn pacified and is not a death. See v3 **Finisher**. What a respawn keeps (reps, a draught, gear) is not stated in v3. This sketch does not decide it.

## Combat control

Client scripts are the expected way to play. The best play is heavy client automation plus live manual judgment. See v3 **Input & Automation Philosophy**.

Server routines and the pseudocode under them stay. They are the levers manual play and those client scripts call. They are not a second combat system, and they are not merged into v3's timing or momentum rules. A routine stores levers, not keystrokes. A script does not scrape the parser or replay `face s`.

**Overlap.** v3 expects client triggers and hotkeys, and it expects a person to keep judgment during a telegraph window, including against feints. A server routine is a saved sequence of the same levers a client script or a typed command can call: an attack, a dodge, a roll, a block, a riposte, a feint, a step. Calling a lever still spends that tick's one action. A routine does not read a feint, does not see the opponent's momentum, and does not loosen the one-action cap.

**Manual.** You type the lever. Target-lock is free. An attack is one action; the telegraph window and the landing are v3 **Timing Model**, not a second action named `loose`.

**Server routine.** `routine new opening-arc`, add `attack(hatchet, cleave)`, `routine save`, `routine run opening-arc`. The server spends your ticks one lever at a time. `routine stop` drops what has not fired. The action already spent stays spent. A routine can only call a move that weapon has unlocked by reps.

**Pseudocode.** The same hatchet cleave, three ways:

```
hatchet cleave
```

```
attack(hatchet, cleave)
```

```
attack(hatchet, cleave)   -- authored template; defense coverage uses that same shape
```

The words of a player's telegraph must include that move's required keyword. A feint may borrow the keyword. See v3 **Telegraph & Text-Authoring Metagame**. Breakpoint messages follow the same keyword rule. See v3 **Momentum Breakpoints & Messages**.

## Other players

The hamlet is one persistent place. Two players see the same walls, the same hearth, the same picked yarrow.

Allies may share a square. Everyone else may not. See v3 **Allies**. A group holds the lane by the squares they stand on, and a single-file gate is a chokepoint. Interposing and the rest of ally detail are not designed yet; v3 says so.

Handing a yarrow draught is `give`, across an open edge, or inside a square only when a legal share already applies. In combat that is one action on that tick, so it is not also a dodge or a cure.

## Potion-making

One draught this pass: **yarrow**. No catalog. It is a cure for aggravated bleeding, not a heal for momentum. See v3 **Aggravated Damage**.

1. **Gather.** Yarrow is on `G2` and `G8`. `gather yarrow` takes one action on that square. `G2` is the center of the wisp's east cross.
2. **Brew.** On `D7`, with the handful and the hearth lit. Osen has to be off that square. `brew yarrow` takes three actions there. Leaving spoils the handful. Those three actions are craft, not three combat ticks of 200ms.
3. **Cure.** `drink yarrow` spends the action and stamina that tick, which is the tick you do not spend on a counter. It cures the aggravated bleed. It does not move you, and it does not shift momentum back from -100.

## Open questions

Combat questions below are closed by v3. Not restated as options: diagonal cost, a 15-foot glimpse, a turn order, hit points, bleeding as the core injury, and "no guard."

Still open, and not invented here:

1. **Situation and stop.** Who is the player, what is the pressure, and what ends a session?
2. **Townsfolk versus the hostility default.** Are Maret, Osen, Nell, and Harl allies, or is the hamlet a safe zone? v3 leaves zone-gating undesigned.
3. **What respawn keeps.** Reps, draughts, and gear after execute or mercy. v3 states the finisher and does not state the inventory.
4. **Rep count.** How many reps at `E6` unlock the next move of a weapon.
5. **NPC telegraph keywords.** Open in v3 **NPC & PvE Philosophy**. Not decided for the lurker, the hound, or the wisp.
6. After a swing in the street, does the hamlet answer with blame, a debt, or exile? Not in v3.
