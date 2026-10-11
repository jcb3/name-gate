# Combat refactor

The stable test follows this file. [combat-system-v3.md](/cursor/stores/self/docs/combat-system-v3.md) is unchanged. This set keeps Jay's decisions and closes the places a test had to invent a ruling.

The test starts when the lurker and the player target-lock each other on the empty arena, and it ends when execute or mercy has been applied.

## What changed

- **The tick resolves. The window is the decision.** A 250ms tick is the server's resolver. A person reads the telegraph window. Per-tick levers belong to server routines and client scripts.
- **A step can leave threat.** The arena is 5 wide and 7 deep. Lurker `(2, 2)`, player `(2, 4)`. One step south is `(2, 5)`, outside threat 2, still on the map.
- **At -100 the exchange stops.** The crossing blow is the last that lands. Momentum is cleared to 0, locks drop, and no other thrust resolves until a new fight starts.
- **A roll off the template is only a position change.** It does not score as a dodge-read.
- **Drift is on a whiff.** It is not a point on every 250ms tick.
- **One swing is smaller than the breakpoint gap.** No event moves a fighter by 30 or more, so a breakpoint line does not show the hidden number.
- **Changing target-lock costs the tick.** The lock holds until it breaks. It is not a free re-aim beside an action.
- **A riposte follow-up is the same action and the same tick.** No second action, and no response window.
- **An interrupt pays less than a read connect, and a miss recovers.** It is not a strictly better thrust.
- **A counter is on time by send time,** plus a 250ms lateness cap. Arrival tick alone does not decide.
- **A feint has two legal answers:** dodge and block. Dodge-only cannot be baited.
- **Aggravated damage, if it would kill, opens execute or mercy.** Pacify blocks locks and targeting so mercy is not an immediate new fight.
- **Shared squares.** Place-target hits every body on the square. Person-target hits the named body.
- **The four villagers are allies** when the hamlet returns. The stable test does not load it.

## Held

One action per fighter per tick. A dodge covers only the locked ray. A one-square doorway limits who can reach: the body in the mouth stops a straight path, and fighters behind it are not in the template. Disconnect leaves the body on its square, passive, with no auto-block and no auto-flee. A thrust already declared still resolves.

## Grid, facing, threat

Squares are 5 feet. Distance is Chebyshev. Sight is the grid out to about 25 feet.

The stable arena is open, x east 0–4, y south 0–6, no other bodies. Lurker `(2, 2)`. Player `(2, 4)`, Chebyshev 2 due south. The fight starts with those two locks already held. That start is not a re-aim.

Facing is the last attack, or the held target-lock. The lock is singular. One action may name a person or a square for that action without clearing the lock.

The lock holds until it breaks. Changing it costs the tick: that tick is the lock, and it is not also a thrust, dodge, roll, block, feint, riposte, or step. It breaks when the exchange stops at -100, when the target is no longer a legal target, or when a later tick sets a different lock.

Threat is 2, the same radius as this thrust. While a fight is live, the lurker may start a thrust if none is pending and the player is a legal target inside threat. Outside threat, it does not start one.

`step` moves one square, orthogonal or diagonal, through an open edge, and spends the action. A step off the arena, or onto a non-ally, is refused. Allies may share a square. From `(2, 4)`, south, southeast, and southwest land on y=5, outside threat. East or west along y=4 stays inside threat.

One body per square, except allies and the non-combat shares (an embrace, a shared bed). Non-allies are hostile by default.

## Time and levers

Ticks are 200–250ms. This test uses 250ms. The tick is when the server resolves. It is not the rate a person must press a button.

The readable decision is the telegraph window. A `thrust` declared on tick T resolves after that window. The window is T, T+1, T+2, and T+3. The server commits the resolution one lateness cap after the window closes.

A counter is on time if it was sent during the window. The lateness cap is 250ms **STUB**. A counter sent inside the window still answers the thrust if it arrives during the cap. A counter sent after the window does not, even if the packet arrives before commit. Arrival tick alone is not the test. The server remains the authority that accepts the send time and commits the result.

One action per fighter per tick. Server routines and client scripts are the layer that calls a lever on a tick. They store `attack`, `dodge`, `roll`, `block`, `riposte`, `feint`, and `step`. A scheduled routine or script is assigned the tick it names and does not use the lateness cap. A routine does not see the opponent's momentum and does not detect a feint. Weapon moves unlock by reps. This test has one move, so reps unlock nothing. Client scripting is expected. The person keeps the read inside the window.

## Momentum

No hit points. Each fighter has their own momentum, from -100 to +100, starting at 0. A fighter sees their own number. The opponent sees breakpoint lines only.

Breakpoint lines are ±30, ±60, and ±90, then the end lines at ±100. The gap between ±30, ±60, and ±90 is 30. One event moves a fighter by at most 20, which is smaller than that gap, so one line does not show the hidden number. ±100 ends the exchange. It is not a hidden bracket. Inertia is 1, so a listed shift applies as written.

Drift is not applied on a 250ms tick. On a whiff, each fighter drifts 5 toward 0 **STUB**. A whiff is a thrust whose template is empty and that no counter cancelled. Connects, dodge-reads, feint answers, blocks, and guard-breaks do not drift.

| Event | Momentum | Notes |
| --- | --- | --- |
| Landed thrust | attacker +20, defender -20 | readable connect |
| Read connect (riposte follow-up) | attacker +20, defender -20 | same action, same tick |
| Dodge cancels a thrust | defender +10, attacker -10 | dodge stamina 10 |
| Interrupt hits | attacker +10, defender -10 **STUB** | less than a read connect |
| Interrupt misses | attacker -10 **STUB** | attacker loses the next tick |
| Whiff | each fighter 5 toward 0 **STUB** | not a dodge-read |
| Roll leaves the template | 0 | position and stamina only |
| Feint baited (defender dodges) | feinter +15, defender -15 **STUB** | feint stamina 0 **STUB** |
| Feint answered (defender blocks) | defender +10, feinter -10 **STUB** | no blow, no absorb charge |
| Block absorbs | 0 from the hit | 25 per hit **STUB**, 0 to raise **STUB** |
| Guard-break | defender -20, attacker +20 **STUB** | under the 30-point gap |

Stamina starts at 100 and regenerates 0. Thrust costs 0. Step costs 15. Roll costs 20 **STUB**. At 0, dodge, step, roll, and raising a block are refused. A pending thrust still resolves.

Five unanswered thrusts take a body from 0 to -100. Drift does not apply to those connects.

## The thrust, the interrupt, the answers

The player holds a spear. `thrust` is straight, reach 2, the two squares along the lock, blocked by bodies and terrain. Aimed south from `(2, 2)`, the template is `(2, 3)` and `(2, 4)`, fixed at declare. The defense shape is that same straight template along the held lock. A dodge covers only that ray.

Public line, from declare until commit: `The spear thrust reaches straight ahead.` The required keyword is `thrust`. The lurker uses that line. A real telegraph must contain its keyword. A feint may borrow it.

This thrust is not riposteable. The riposte command against it is refused. No weapon matrix is built. When a move does allow a riposte, the guaranteed follow-up resolves in that same action and that same tick. It does not grant a second action, and the defender gets no window on the follow-up. That follow-up is the read connect in the table. Stamina is paid once, on the riposte.

**Interrupt.** Declared and resolved on the same tick. No telegraph. If the target is on the template, the interrupt row applies. That swing is smaller than a landed thrust and smaller than a read connect. If the target is not on the template, the miss row applies and the attacker can take no action on the next tick. A missed thrust does not do that. An interrupt is not a strictly better thrust.

**Dodge** stays on the square. Sent on time, it cancels a pending thrust when the dodger is on that template and the attacker is on the locked ray. One score, the dodge row.

**Step** does not cancel. Still on the template: landed thrust. Off the template: whiff.

**Roll** moves to one open adjacent square. Off the template, the body has moved, the thrust does not hit, and momentum does not change. That is the whole result. It is not a dodge-read and it is not a whiff. Still on the template: the landed thrust is the only momentum change.

**Block** is the other legal answer in this test. It stays up until guard-break or until that fighter spends the tick on something else. Holding it spends no further action. Each absorbed hit spends 25 stamina, floors at 0, and does not apply the thrust shift. The hit that reaches 0 is absorbed, the block drops, and the guard-break row applies once.

**Feint** uses the thrust line, may borrow `thrust`, and uses the same window. It deals no blow. It may be declared only because this test has two legal answers, dodge and block. Dodge is the answer to a real thrust, so dodging the feint takes the bait row once. Block is the answer to the feint: the answered-feint row once, and no absorb charge. A vocabulary of dodge alone cannot be baited, and a feint is refused there.

## Finisher

When a resolution sets a fighter to -100, that blow has landed. Print each threshold it crossed, including -100. Then the exchange stops.

- Clear both fighters' momentum to 0.
- Drop both locks.
- Cancel every attack that has not resolved. Cancelled attacks do not land.
- If two attacks would resolve on the same tick, apply them in declaration order. Once a fighter has reached -100, a later attack on that tick does not hit them.
- The only legal command is execute or mercy. Any thrust is refused and does not resolve.
- The choice may be issued on the commit, after the blow. It spends no action. A lurker who wins chooses mercy.
- No thrust resolves after this until a new fight starts. A new fight starts when a legal aggressor spends a tick to lock a legal target. That tick does not also thrust. Proximity does not skip the lock.

**Execute.** The loser dies and is not pacified. Death is this choice. The loser is placed on `(0, 6)`. Locks stay down. Momentum stays 0. The loser can act and can be locked again. Reps, the spear, and gear stay. Stamina stays. `(0, 6)` is outside threat. Nothing thrusts until a new fight starts.

**Mercy.** Not a death. The loser is placed on `(0, 6)` and pacified. Locks stay down. Momentum stays 0. Reps, the spear, and gear stay. Stamina stays.

While pacified, that fighter cannot target-lock and is not a legal target. Threat does not start a fight against them, and a thrust aimed at them is refused. Pacify ends when that fighter, outside every hostile threat, spends a tick to clear it. The mercy tick cannot clear it.

## Aggravated damage

Aggravated damage is its own track. It is not momentum and not hit points. The stable spear fight does not apply it.

Bleeding is the track a later test turns on. Cure spends the action and 20 stamina **STUB**, clears the track, and does not shift momentum. The track expires at the start of the eighth tick after it was applied **STUB** if it is still present.

If expiry would kill, it sets that fighter's momentum to -100 and opens execute or mercy. The same stop applies: clear momentum, drop locks, and do not resolve another thrust until a new fight starts. The fighter who applied the effect chooses. If that fighter is gone, the result is mercy. The track does not skip the choice and does not write a death by itself.

Yarrow, when crafting returns with the hamlet, cures this track and does not move momentum.

## Allies and the hamlet

Allies may share a square. Everyone else may not.

**Place-target.** Every body on a square the template names is hit. Each defender takes one landed-thrust shift. The attacker gains the thrust shift once for the action, not once per body, so one shape stays under the breakpoint gap. A straight path stops at the first occupied square and does not continue.

**Person-target.** The named body is the only one hit, including when an ally shares that square. If a different body occupies an earlier square of the path, the thrust stops there and hits no one.

When the hamlet returns, Maret, Osen, Nell, and Harl are allies of the player. The lurker, the hound, and the wisp stay hostile. Combat still runs on hamlet squares. The stable test loads none of them.

## Left for later

Rep count for the next weapon move, what a respawn keeps beyond this test's spear and reps, NPC keyword policy past this lurker's one line, interposing's cost, and who the player is beyond the session sentence above. None of those are read by the stable test.

## Playable stand-ins

These close every hole a typed fight can hit. Where this section names a ruling, it is the one the playable fight uses. The player in that session is Jay.

- Quiet ticks print nothing. The room prints only on a telegraph, step, shove, abort, hit, whiff, block, breakpoint, finisher, leash, or routine action. `look` prints the grid, and Jay's own stamina and momentum, on demand.
- Breakpoint lines hide the number. The line is the word, and the word is the required keyword: -30 `unsteady`, -60 `faltering`, -90 `collapsing`, -100 `broken`, +30 `pressing`, +60 `flowing`, +90 `overwhelming`, +100 `legendary`. The word prints when the number crosses that threshold moving away from 0. No bonus at +100. Clearing momenta at the stop or on a leash does not print a word.
- A routine or script receives only that printed telegraph text, never an internal feint or thrust flag.
- Starter routine `guard`: if the latest unread telegraph line contains `thrust`, dodge; otherwise hold. The player toggles it. It is on at the start of a session. Hold prints nothing. Guard does not run when Jay has a command waiting, and a failed dodge leaves the line unread.
- `abort` on a later tick cancels your own pending thrust and whiffs. Each fighter drifts 5 toward 0. You are locked in until abort, resolve, or whiff. While locked in, the only spent action is abort. A pending feint locks the same way; abort whiffs it. An unanswered feint that expires deals no blow and does not drift.
- At 0 stamina you may step, abort, look, and toggle the routine. You may not dodge, block, or thrust. Step costs 15 when stamina is at least 15, is refused from 1 through 14, and is free at 0. Feint, interrupt, and roll are refused at 0. Shove, swap, lock, hold, and clear are not. Execute and mercy ignore stamina. A pending thrust still resolves.
- `shove` spends the tick from an adjacent square and moves the other body one square directly away if that square is empty. You do not enter their square. It costs no stamina. It targets the named hostile, otherwise the lock if adjacent, otherwise the only adjacent hostile. If nobody is adjacent, the tick is not spent. If the square beyond is blocked, off the map, or is `(0, 6)` for the lurker, the tick is spent and the body does not move. Hostile sharing stays illegal.
- An ally body still stops a straight thrust. The ally on the first occupied square is hit, and the ray does not continue.
- No yield puzzle. `swap` with an ally on an adjacent square spends the tick and exchanges squares. It costs no stamina. Hostiles cannot swap. With no adjacent ally, the tick is not spent.
- Respawn for Jay is `(0, 6)`, outside threat. If that square would lie inside the lurker's threat, the lurker is sent to `(2, 2)` first. Pacify ends only when that fighter spends a later tick outside every hostile threat. `clear` and `hold` are that spend, and so is any other spent action. The mercy tick cannot clear it. The lurker cannot occupy `(0, 6)`. A defeated lurker is placed on `(4, 0)` when that square is outside Jay's threat; otherwise the next open square outside Jay's threat that is not `(0, 6)`.
- Leash: if Jay has ended 4 ticks outside the lurker's threat, the lurker drops lock, pending actions cancel without whiffing, both momenta clear, and the lurker is back on `(2, 2)` when that square is free. Jay keeps their lock. It does not fire while execute or mercy is waiting. A leash that changes nothing is not printed.
- One clock for the whole arena. A body that appears mid-window is hit only if its square is already on a snapshot template. It may act on the next tick.
- On execute or mercy, one room line: `X is executed` or `X is shown mercy`. Execute leaves a corpse marker on the death square for 8 ticks. It blocks movement, does not stop a thrust, and has no loot. Mercy leaves no corpse. Gear and reps stay on the person.
- Template squares are chosen when the thrust is declared and do not track.

Also closed on this page: an interrupt cannot be dodged; a miss costs the next tick and does not drift. A roll off the template is only a position change. Riposte is refused and does not spend the tick. After the exchange stops, the next fight starts by spending a tick to lock, and that tick does not thrust. Reaching +100 with nobody at -100 stops the exchange and does not open execute or mercy. Refusals, the guard toggle, lock, swap, and the end of pacify show in the status line rather than the room log.
