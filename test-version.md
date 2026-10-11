# Test version

A stable test is two bodies on a 5-foot grid, one readable telegraph, two legal answers (dodge and block), and a finish at execute or mercy. The server must not invent a rule while that fight is running.

This is not the game's premise. Who the player is, and what ends a real session, stay unwritten. The test follows [combat-refactor.md](/cursor/stores/self/docs/combat-refactor.md).

The test starts when the lurker and the player target-lock each other on the arena, and it ends when execute or mercy has been applied.

Already set, and kept by the refactor: 5-foot squares, Chebyshev distance, one action per tick, server-authoritative resolution, momentum from -100 to +100 starting at 0, breakpoints at ±30/60/90/100, no hit points, execute or mercy as the only death, and disconnect (the body goes passive and undefended, with no auto-block and no auto-flee). A dodge covers only the locked ray. A one-square doorway stops a straight path at the body in the mouth. One swing is at most 20, under the 30-point gap between ±30, ±60, and ±90.

## Arena

A 5-by-7 of open squares, no other bodies. Columns x 0–4 east, rows y 0–6 south. Lurker on `(2, 2)`. Player on `(2, 4)`, two squares due south (Chebyshev 2). The fight starts with those two locks already held. That start is not an action and not a free re-aim. The first thrust can be on the first tick.

Changing a lock later costs the tick. That tick is not also a thrust, dodge, roll, block, feint, riposte, or step. The lock holds until it breaks: the exchange stops at -100, the target is no longer legal, or a later tick sets a different lock.

Threat is 2. From `(2, 4)`, one step south to `(2, 5)` is outside threat and still on the arena. Southeast and southwest also leave threat. East or west along y=4 stays inside threat. A step off the arena is refused.

Respawn, for execute and mercy, is the southwest corner `(0, 6)`, Chebyshev 4 from the lurker, outside threat.

The hamlet is not loaded. When it returns, Maret, Osen, Nell, and Harl are allies of the player. The lurker, the hound, and the wisp stay hostile. The hamlet is not a non-hostile place.

## Must add before the test

1. **One weapon, one move, plus the interrupt.** The player holds a spear. `thrust` is straight, reach 2, the two squares along the lock, blocked by bodies and terrain. It is not an interrupt and it is not riposteable. No second weapon move exists, so reps do not unlock anything in this test. Aimed south from `(2, 2)`, the template is `(2, 3)` and `(2, 4)`. The defense shape is that same template along the held lock.

   An interrupt is a different action. It is declared and resolved on the same tick, with no telegraph. On the template it is attacker +10, defender -10 **STUB**. Off the template the attacker takes -10 **STUB** and can take no action on the next tick. A missed thrust does not do that.

2. **How long the telegraph lasts.** The window is T, T+1, T+2, and T+3. The server commits one lateness cap after the window closes, not at the start of T+4 and not by arrival tick. The cap is 250ms **STUB**. A counter sent during the window still answers the thrust if it arrives during the cap. A counter sent after the window does not, even if it arrives before commit. The public line from declare until commit is `The spear thrust reaches straight ahead.` The required keyword is `thrust`. The lurker uses that line. It starts another thrust only while the fight is live, none is pending, and the player is a legal target inside threat.

   A server routine or client script is assigned the tick it names and does not use the lateness cap. The tick resolves. The window is the person's decision.

3. **Two answers.** Dodge and block are both legal. A feint may be declared because those two exist. Dodge-only is not this run, and a feint is refused in a dodge-only vocabulary.

   `dodge`, sent on time, stays on the square and cancels the pending thrust when the dodger is on the template and the attacker is on the locked ray. One score: defender +10, attacker -10.

   `block` is the other answer. Raising it costs the tick and 0 stamina **STUB**. It stays up until guard-break or until that fighter spends the tick on something else. Holding it spends no further action. Each absorbed hit costs 25 stamina **STUB**, floors at 0, and does not apply the thrust shift. The hit that reaches 0 is absorbed, the block drops, and the guard breaks: defender -20, attacker +20 **STUB**.

   `roll` moves to one open adjacent square and costs 20 stamina **STUB**. Off the template, the thrust does not hit and momentum does not change. That is only a position change. It is not a dodge-read and it is not a whiff. Still on the template, the landed thrust is the only momentum change.

   `feint` uses the thrust line, may borrow `thrust`, uses the same window, costs 0 stamina **STUB**, and deals no blow. Dodge against it is the bait: feinter +15, defender -15 **STUB**, once. Block against it is the answer: defender +10, feinter -10 **STUB**, once, with no absorb charge.

   Riposte against this thrust is refused. No weapon matrix is built. When a move does allow a riposte, the follow-up is that same action and that same tick: attacker +20, defender -20, stamina paid once, and the defender gets no window on the follow-up.

4. **What execute and mercy do.** The blow that sets a fighter to -100 lands. Print each threshold that blow crossed, including -100. Then the exchange stops: clear both momenta to 0, drop both locks, and cancel every attack that has not resolved. Those cancelled attacks do not land. If two attacks would resolve together, apply them in declaration order, and once a fighter has reached -100 a later attack on that commit does not hit them. Until the winner chooses, the only legal command is execute or mercy. The choice may be issued on the commit, after the blow, and spends no action. If the lurker wins, it chooses mercy.

   Both choices place the loser on `(0, 6)`. Reps, the spear, and gear are kept. Stamina is left as it is. Locks stay down. Momentum stays 0. Nothing thrusts until a new fight starts. A new fight starts when a legal aggressor spends a tick to lock a legal target. That tick does not also thrust. Proximity does not skip the lock.

   Execute: the loser dies, is not pacified, can act, and can be locked again. Mercy: not a death. While pacified, the loser cannot target-lock and is not a legal target. Threat does not start a fight against them, and a thrust aimed at them is refused. Pacify ends when that fighter, outside every hostile threat, spends a tick to clear it. The mercy tick cannot clear it.

5. **Stepping out.** `step` costs 15 and does not cancel a pending thrust. Still on the template, that thrust hits. Off the template, with no counter, it is a whiff: each fighter drifts 5 toward 0 **STUB**. Leaving threat stops a new thrust. It does not erase one already declared. One step south from `(2, 4)` is the leave-threat case.

## A named stub is enough

- **Tick:** 250ms. The tick resolves. It is not the button rate.
- **Lateness cap:** 250ms **STUB**. Commit is one cap after the window closes.
- **Threat:** 2 squares, Chebyshev, same as this thrust's reach.
- **Inertia:** 1 for both. Shifts apply as written. No event moves a fighter by more than 20.
- **Drift:** not per tick. On a whiff only, each fighter 5 toward 0 **STUB**. Connects, dodge-reads, feint answers, blocks, guard-breaks, rolls off the template, and interrupt misses do not drift.
- **Landed thrust:** attacker +20, defender -20. Thrust stamina 0.
- **Read connect:** the riposte follow-up, same numbers, same tick. This thrust refuses the command.
- **Dodge that cancels a thrust:** defender +10, attacker -10. Dodge stamina 10.
- **Interrupt hit / miss:** +10/−10 **STUB** / attacker −10 **STUB** and the next tick lost.
- **Roll off the template:** momentum 0. Roll stamina 20 **STUB**.
- **Feint bait / feint answered:** +15/−15 **STUB** / defender +10, feinter −10 **STUB**. Feint stamina 0 **STUB**.
- **Block:** 0 to raise **STUB**, 25 per hit absorbed **STUB**. Guard-break is defender −20, attacker +20 **STUB**.
- **+100:** the line is `legendary`. No bonus. If nobody is at -100, the exchange still stops and execute or mercy does not open.
- **Breakpoint text:** the line is the word, and the word is the keyword. -30 `unsteady`, -60 `faltering`, -90 `collapsing`, -100 `broken`, +30 `pressing`, +60 `flowing`, +90 `overwhelming`, +100 `legendary`. The number is not printed. The word prints when the number crosses that line moving away from 0.
- **Stamina:** 100, regen 0. Step costs 15 when stamina is at least 15, is refused from 1 through 14, and is free at 0. At 0 you may step, abort, look, and toggle the routine. You may not dodge, block, or thrust. A pending thrust still resolves.
- **NPC keyword:** this one line includes `thrust`. That does not decide the general NPC-keyword question.

Five unanswered thrusts take a body from 0 to -100. Drift does not apply to those connects.

Aggravated bleeding stays off this arena. If a later run applies it: cure costs 20 stamina **STUB** and does not shift momentum. The track expires at the start of the eighth tick after it was applied **STUB**. If that would kill, it sets the bearer to -100 and opens the same execute-or-mercy stop, including the clear and the dropped locks. It does not skip the choice and does not write a death by itself.

## Leave out of this run

- **Applying aggravated damage.** No bleeding, fire, cure, or yarrow on the arena. The expiry rule above is the one to use when a later run turns the track on.
- **The hamlet map.** Townsfolk stay unloaded. Their ally rule is already chosen. Place-target hits every body on the named square, and the attacker gains the thrust shift once for the action. Person-target hits only the named body. Those rules are not exercised on the empty arena.
- **Other weapons, other moves, and rep unlocks.** The post, the hatchet, and the knife stay out.
- **A weapon matrix, a riposte of this thrust, player-written telegraph text, raids, frontline/backline, and interposing.**
- **The game premise** beyond the one test sentence above. Blame, debt, and exile after a street swing stay out.

## Playable stand-ins

Same rulings as [combat-refactor.md](/cursor/stores/self/docs/combat-refactor.md) under Playable stand-ins. The player in that session is Jay.

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
