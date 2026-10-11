---
cursor:
  subagentId: "bc-7ba09b2a-1b4e-5120-9a23-afeccd388f0c"
---

# Combat scenarios

Executable runs of the v3 combat rules. The simulator is `internal/combat-sim.py`. Manual command scripts only. No client, no AI, no second fight.

Pass means the tick log follows v3 plus the stable-test stubs, and the result does not depend on an invented ruling. Fail means a load-bearing ruling was invented. Spatial facts that are already fixed are still in the log.

A line marked outside the stable test uses a rule `test-version.md` tells the spear-and-dodge fight to leave out: feint, block, roll, allies, aggravated damage, outnumber, or a fast interrupt.

## Stubs printed before the runs

Server log. A fighter's own momentum number is visible to them. The opponent only gets the public lines (`momentum -30` and the same pattern, plus the thrust sentence).

### From the stable test

- Tick 250ms. Drift 0. Inertia 1. Shifts apply as written.
- Thrust declared on tick T resolves at the start of T+4, before that tick's commands. Dodge on T, T+1, T+2, or T+3 cancels it. Public line: "The spear thrust reaches straight ahead." Keyword: thrust.
- Landed thrust: attacker +20, defender -20. Dodge that cancels: defender +10, attacker -10. Nobody on the template: 0.
- Momentum starts at 0, clamps at ±100. Public text on crossing ±30, ±60, ±90, ±100. At +100 the line is `momentum +100` and no bonus is granted.
- Stamina 100, regen 0. Thrust 0, dodge 10, step 15. At 0, dodge and step are refused and a pending thrust still resolves.
- Riposte: this thrust is not riposteable. No weapon matrix.
- Arena is 5×5, coordinates x east and y south, squares 0–4. ANA starts (2,4). LUR starts (2,2). Southwest respawn is (0,4).
- Fall, for execute and mercy: reps, the spear, and gear are kept. Both return the loser to (0,4). Mercy pacifies, is not a death, and the loser will not thrust and cannot be thrust at. Execute is a death, does not pacify, and the loser target-locks the winner. A lurker who wins always chooses mercy. That branch is not the execute/mercy scenario below, because that scenario needs the winner to choose both.
- Threat radius 2, same as this thrust. One action per fighter per tick. Target-lock is free.

### Invented, and labeled on the runs that use them

- Feint bait +15/-15. Feint stamina 0. True answer stubbed as hold. Same public line and same four-tick window as thrust.
- Roll stamina 20. Roll-read reuses dodge's +10/-10.
- Block absorbs at 25 stamina per hit, 0 to raise it. Guard-break at 0 stamina: defender -30, attacker +30.
- Bleed death at the start of tick 8 (2000ms) if still bleeding. Cure stamina 20.
- Fast-attack magnitude reuses the landed thrust.
- A body that blocks a straight ray takes the hit, and the ray stops.
- Place-target hits every body on the square. Person-target hits the named body.
- Wide cleave: three squares at distance 1, the forward square and both forward diagonals.
- Momentum is not reset on respawn. A thrust after execute still resolves, and both fighters stay clamped at the finish values.

## 1. 1v1 telegraph, correct counter

**Outside the stable test:** no

**Setup.** Arena 5×5. ANA at (2,4), the south square of the center column. LUR at (2,2), two squares north. Both target-lock for free. LUR thrusts on t0. ANA dodges on t2, inside the window. Spear only.

**Ticks.**

- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) LUR target-lock ANA (free). Facing S.
- t0 (0ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing S. Template [(2, 3), (2, 4)].
- t2 (500ms) ANA dodge. Stamina 100→90. Stays (2, 4).
- t2 (500ms) ANA dodge. Facing N. Shape [(2, 3), (2, 2)] covers LUR.
- t4 (1000ms) LUR thrust cancelled by ANA (dodge). ANA is at (2, 4), on declared template [(2, 3), (2, 4)].
- t4 (1000ms) ANA momentum 0→10. dodge cancels thrust
- t4 (1000ms) LUR momentum 0→-10. dodge cancels thrust

**Verdict:** pass

**Invented:**

- None.

## 2. Feint that baits the wrong counter

**Outside the stable test:** feint

**Setup.** Same arena and locks. LUR feints on t0. The public line is the thrust line. ANA dodges on t2, the correct answer to a real thrust.

**Ticks.**

- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) LUR target-lock ANA (free). Facing S.
- t0 (0ms) LUR feint. Public text: "The spear thrust reaches straight ahead." (borrows keyword thrust). Engine tag feint. Resolves t4. Template [(2, 3), (2, 4)].
- t2 (500ms) ANA dodge. Stamina 100→90. Stays (2, 4).
- t2 (500ms) ANA dodge. Facing N. Shape [(2, 3), (2, 2)] covers LUR.
- t4 (1000ms) LUR feint resolves. ANA answered with the thrust counter. No blow.
- t4 (1000ms) LUR momentum 0→15. STUB feint bait
- t4 (1000ms) ANA momentum 0→-15. STUB feint bait

**Verdict:** fail

**Invented:**

- Feint uses the thrust telegraph, the thrust keyword, and the four-tick window. v3 allows borrowing the keyword and does not set the window length for a feint.
- The true answer is stubbed as hold. Dodge, the thrust counter, is treated as the wrong counter.
- Bait shift is stubbed at 15/-15. Feint stamina is stubbed at 0. A feint resolves as no blow.

## 3. Dodge in place versus roll out of a longer reach

**Outside the stable test:** roll

**Setup.** Reach-2 straight thrust. ANA starts on the far square (2,4), LUR at (2,2). Run A: dodge on t1, stay, and LUR thrusts again on t4. Run B: roll east to (3,4) on t1, and LUR thrusts again on t4. The first template is fixed at declare. The second template is aimed when it is declared.

**Ticks.**

- — dodge in place —
- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) LUR target-lock ANA (free). Facing S.
- t0 (0ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing S. Template [(2, 3), (2, 4)].
- t1 (250ms) ANA dodge. Stamina 100→90. Stays (2, 4).
- t1 (250ms) ANA dodge. Facing N. Shape [(2, 3), (2, 2)] covers LUR.
- t4 (1000ms) LUR thrust cancelled by ANA (dodge). ANA is at (2, 4), on declared template [(2, 3), (2, 4)].
- t4 (1000ms) ANA momentum 0→10. dodge cancels thrust
- t4 (1000ms) LUR momentum 0→-10. dodge cancels thrust
- t4 (1000ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t8. Facing S. Template [(2, 3), (2, 4)].
- t8 (2000ms) LUR thrust hits ANA at (2, 4).
- t8 (2000ms) LUR momentum -10→10. landed thrust
- t8 (2000ms) ANA momentum 10→-10. landed thrust
- — roll east, off the declared ray —
- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) LUR target-lock ANA (free). Facing S.
- t0 (0ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing S. Template [(2, 3), (2, 4)].
- t1 (250ms) ANA roll. Facing N. Shape [(2, 3), (2, 2)] covers LUR.
- t1 (250ms) ANA roll E. STUB stamina cost 20. Now (3, 4).
- t4 (1000ms) LUR thrust cancelled by ANA (roll). ANA is at (3, 4), not on declared template [(2, 3), (2, 4)].
- t4 (1000ms) ANA momentum 0→10. STUB roll read, same numbers as dodge
- t4 (1000ms) LUR momentum 0→-10. STUB roll read, same numbers as dodge
- t4 (1000ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t8. Facing SE. Template [(3, 3), (4, 4)].
- t8 (2000ms) LUR momentum -10 (no change). template empty at resolution

**Verdict:** fail

**Invented:**

- Roll stamina is stubbed at 20. v3 says roll costs more than dodge and does not give a number.
- A roll that leaves the declared template is scored with the dodge-read shift (+10/−10). The stable test only numbers a dodge, and numbers an empty template as 0. Those two readings disagree for a roll.
- Facing toward an off-axis lock snaps to the nearest of 8 directions. The second-thrust miss does not depend on that snap: (3,4) lies on no length-2 ray from (2,2).

## 4. Block until guard-break

**Outside the stable test:** block

**Setup.** ANA raises block on t0 and then holds. The stance auto-resolves. LUR thrusts on t0, t4, t8, and t12. Four hits. Stamina 100, 75, 50, 25, then 0.

**Ticks.**

- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) LUR target-lock ANA (free). Facing S.
- t0 (0ms) ANA block raised. Stamina stays 100 (charged per hit, not on raising it). Facing N. Shape [(2, 3), (2, 2)].
- t0 (0ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing S. Template [(2, 3), (2, 4)].
- t4 (1000ms) ANA block absorbs LUR. Stamina 100→75.
- t4 (1000ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t8. Facing S. Template [(2, 3), (2, 4)].
- t8 (2000ms) ANA block absorbs LUR. Stamina 75→50.
- t8 (2000ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t12. Facing S. Template [(2, 3), (2, 4)].
- t12 (3000ms) ANA block absorbs LUR. Stamina 50→25.
- t12 (3000ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t16. Facing S. Template [(2, 3), (2, 4)].
- t16 (4000ms) ANA block absorbs LUR. Stamina 25→0.
- t16 (4000ms) ANA guard-break. Block drops.
- t16 (4000ms) ANA momentum 0→-30. STUB guard-break
- t16 (4000ms) public text: momentum -30
- t16 (4000ms) LUR momentum 0→30. STUB guard-break
- t16 (4000ms) public text: momentum +30

**Verdict:** fail

**Invented:**

- Block stays up after the action that raises it. Each absorbed hit costs 25 stamina. Raising the block costs 0.
- The hit that reduces stamina to 0 is absorbed and then breaks the guard. Guard-break shift is stubbed at -30/30.
- A broken guard does not open a riposte. This thrust is not riposteable.

## 5. Open ground, one defender versus three

**Outside the stable test:** outnumber

**Setup.** Open 5×5, no walls. D at (2,2). N, E, and W stand two squares north, east, and west, each with a clear spear ray through D. All three thrust on t0. D target-locks N, so the spear shape is the north ray, and dodges. D's second command on t0 is refused.

**Ticks.**

- t0 (0ms) D target-lock N (free). Facing N.
- t0 (0ms) N target-lock D (free). Facing S.
- t0 (0ms) E target-lock D (free). Facing W.
- t0 (0ms) W target-lock D (free). Facing E.
- t0 (0ms) N thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing S. Template [(2, 1), (2, 2)].
- t0 (0ms) E thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing W. Template [(3, 2), (2, 2)].
- t0 (0ms) W thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing E. Template [(1, 2), (2, 2)].
- t0 (0ms) D dodge. Stamina 100→90. Stays (2, 2).
- t0 (0ms) D dodge. Facing N. Shape [(2, 1), (2, 0)] covers N.
- t0 (0ms) D already acted. One action per tick. Refused.
- t4 (1000ms) E thrust hits D at (2, 2).
- t4 (1000ms) E momentum 0→20. landed thrust
- t4 (1000ms) D momentum 0→-20. landed thrust
- t4 (1000ms) N thrust cancelled by D (dodge). D is at (2, 2), on declared template [(2, 1), (2, 2)].
- t4 (1000ms) D momentum -20→-10. dodge cancels thrust
- t4 (1000ms) N momentum 0→-10. dodge cancels thrust
- t4 (1000ms) W thrust hits D at (2, 2).
- t4 (1000ms) W momentum 0→20. landed thrust
- t4 (1000ms) D momentum -10→-30. landed thrust
- t4 (1000ms) public text: momentum -30

**Verdict:** pass

**Invented:**

- None.

## 6. Doorway chokepoint, one versus three, wide shape

**Outside the stable test:** outnumber, allies

**Setup.** Corridor one square wide. D stands in the south mouth at (0,0) with the wide cleave, locked on A1. A1 is in the door at (0,-1). A2 at (0,-2). A3 at (0,-3). Walls on x=±1. All three thrust. D dodges once.

**Ticks.**

- t0 (0ms) D target-lock A1 (free). Facing N.
- t0 (0ms) A1 target-lock D (free). Facing S.
- t0 (0ms) A2 target-lock D (free). Facing S.
- t0 (0ms) A3 target-lock D (free). Facing S.
- t0 (0ms) A1 thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing S. Template [(0, 0), (0, 1)].
- t0 (0ms) A2 thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing S. Template [(0, -1), (0, 0)].
- t0 (0ms) A3 thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing S. Template [(0, -2), (0, -1)].
- t0 (0ms) D dodge. Stamina 100→90. Stays (0, 0).
- t0 (0ms) D dodge. Facing N. Shape [(-1, -1), (0, -1), (1, -1)] covers A1.
- t4 (1000ms) A1 thrust cancelled by D (dodge). D is at (0, 0), on declared template [(0, 0), (0, 1)].
- t4 (1000ms) D momentum 0→10. dodge cancels thrust
- t4 (1000ms) A1 momentum 0→-10. dodge cancels thrust
- t4 (1000ms) A2 thrust reaches A1 at (0, -1) and stops. Does not continue to [(0, 0)].
- t4 (1000ms) A2 thrust hits A1 at (0, -1).
- t4 (1000ms) A2 momentum 0→20. landed thrust
- t4 (1000ms) A1 momentum -10→-30. landed thrust
- t4 (1000ms) public text: momentum -30
- t4 (1000ms) A3 thrust reaches A2 at (0, -2) and stops. Does not continue to [(0, -1)].
- t4 (1000ms) A3 thrust hits A2 at (0, -2).
- t4 (1000ms) A3 momentum 0→20. landed thrust
- t4 (1000ms) A2 momentum 20→0. landed thrust

**Verdict:** pass

**Invented:**

- A straight ray stopped by a body strikes that body and does not continue. v3 says bodies block a spear and does not say the blocker takes the hit. Defender outcome does not depend on this: A2's second square is D only if the path continues.
- D's weapon is a wide cleave: the three distance-1 squares in front (the shamshir row in v3). The stable test has no weapon but the spear. Side squares of this doorway are walls.
- A1, A2, and A3 are marked allies so the default hostility rule does not make them fight as three duels. Ally sharing is not used. A3 is three squares away, outside reach 2, even on an empty path.

## 7. Aggravated bleeding: cure, or ignore until it kills

**Outside the stable test:** aggravated damage

**Setup.** ANA is already bleeding. LUR thrusts on t0. Run A: ANA cures on t0 and cannot also dodge, so the thrust lands and the bleed is gone before t8. Run B: ANA dodges the thrust and never cures. The bleed clock fires at t8.

**Ticks.**

- — cure on the telegraph tick —
- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) LUR target-lock ANA (free). Facing S.
- t0 (0ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing S. Template [(2, 3), (2, 4)].
- t0 (0ms) ANA cures bleeding. STUB stamina 100→80. Momentum stays 0. This tick's action is spent.
- t4 (1000ms) LUR thrust hits ANA at (2, 4).
- t4 (1000ms) LUR momentum 0→20. landed thrust
- t4 (1000ms) ANA momentum 0→-20. landed thrust
- t8 (2000ms) ANA holds. Square (2, 4). Momentum -20. Dead=False. Bleeding=False.
- — ignore the bleed and dodge the thrust —
- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) LUR target-lock ANA (free). Facing S.
- t0 (0ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing S. Template [(2, 3), (2, 4)].
- t0 (0ms) ANA dodge. Stamina 100→90. Stays (2, 4).
- t0 (0ms) ANA dodge. Facing N. Shape [(2, 3), (2, 2)] covers LUR.
- t4 (1000ms) LUR thrust cancelled by ANA (dodge). ANA is at (2, 4), on declared template [(2, 3), (2, 4)].
- t4 (1000ms) ANA momentum 0→10. dodge cancels thrust
- t4 (1000ms) LUR momentum 0→-10. dodge cancels thrust
- t8 (2000ms) ANA aggravated bleeding kills outright. Momentum stays 10. No execute or mercy. STUB return to (0, 4). Gear ['spear'] reps 0 kept.

**Verdict:** fail

**Invented:**

- Bleeding is already on ANA at t0. Death is stubbed at the start of t8 (2000ms). v3 gives the effect its own cadence and does not set it.
- Cure stamina is stubbed at 20. Cure spends the action and clears the bleed. It does not change momentum, because no rule gives it a momentum delta.
- Outright death is applied with no execute or mercy. That follows the aggravated-damage sentence and conflicts with the finisher sentence that death is always the winner's choice.
- The body is moved to the arena southwest corner and keeps gear, extending the finisher respawn stub to a bleed death. v3 does not say that.

## 8. Momentum to -100, then execute, and the same fight ended in mercy

**Outside the stable test:** no

**Setup.** ANA is the attacker so the winner can choose. The lurker-winner stub (always mercy) is not this fight. Five unanswered thrusts, declared on t0, t4, t8, t12, and t16, each resolving four ticks later. Choice on t20, after the fifth hit. t21 checks the pacify rule. The execute run also lets the t21 thrust resolve on t25. Gear is the spear and reps are 0. Momentum is left at the finishing value.

**Ticks.**

- — execute —
- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) LUR target-lock ANA (free). Facing S.
- t0 (0ms) ANA thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing N. Template [(2, 3), (2, 2)].
- t4 (1000ms) ANA thrust hits LUR at (2, 2).
- t4 (1000ms) ANA momentum 0→20. landed thrust
- t4 (1000ms) LUR momentum 0→-20. landed thrust
- t4 (1000ms) ANA thrust. Public text: "The spear thrust reaches straight ahead." Resolves t8. Facing N. Template [(2, 3), (2, 2)].
- t8 (2000ms) ANA thrust hits LUR at (2, 2).
- t8 (2000ms) ANA momentum 20→40. landed thrust
- t8 (2000ms) public text: momentum +30
- t8 (2000ms) LUR momentum -20→-40. landed thrust
- t8 (2000ms) public text: momentum -30
- t8 (2000ms) ANA thrust. Public text: "The spear thrust reaches straight ahead." Resolves t12. Facing N. Template [(2, 3), (2, 2)].
- t12 (3000ms) ANA thrust hits LUR at (2, 2).
- t12 (3000ms) ANA momentum 40→60. landed thrust
- t12 (3000ms) public text: momentum +60
- t12 (3000ms) LUR momentum -40→-60. landed thrust
- t12 (3000ms) public text: momentum -60
- t12 (3000ms) ANA thrust. Public text: "The spear thrust reaches straight ahead." Resolves t16. Facing N. Template [(2, 3), (2, 2)].
- t16 (4000ms) ANA thrust hits LUR at (2, 2).
- t16 (4000ms) ANA momentum 60→80. landed thrust
- t16 (4000ms) LUR momentum -60→-80. landed thrust
- t16 (4000ms) ANA thrust. Public text: "The spear thrust reaches straight ahead." Resolves t20. Facing N. Template [(2, 3), (2, 2)].
- t20 (5000ms) ANA thrust hits LUR at (2, 2).
- t20 (5000ms) ANA momentum 80→100. landed thrust
- t20 (5000ms) public text: momentum +90
- t20 (5000ms) public text: momentum +100
- t20 (5000ms) legendary flow: no bonus granted
- t20 (5000ms) LUR momentum -80→-100. landed thrust
- t20 (5000ms) public text: momentum -90
- t20 (5000ms) public text: momentum -100
- t20 (5000ms) loss at -100. ANA chooses execute or mercy
- t20 (5000ms) before: square (2, 2) gear ['spear'] reps 0 momentum -100 dead=False pacified=False
- t20 (5000ms) ANA executes LUR. Death. Not pacified. Returned to (0, 4). Lock set to ANA, facing E. Gear ['spear'] reps 0 kept. Momentum left at -100.
- t21 (5250ms) ANA thrust. Public text: "The spear thrust reaches straight ahead." Resolves t25. Facing W. Template [(1, 4), (0, 4)].
- t21 (5250ms) LUR is dead. Command ignored.
- t25 (6250ms) ANA thrust hits LUR at (0, 4).
- t25 (6250ms) ANA momentum 100→100. landed thrust
- t25 (6250ms) LUR momentum -100→-100. landed thrust
- — mercy, same thrusts —
- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) LUR target-lock ANA (free). Facing S.
- t0 (0ms) ANA thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing N. Template [(2, 3), (2, 2)].
- t4 (1000ms) ANA thrust hits LUR at (2, 2).
- t4 (1000ms) ANA momentum 0→20. landed thrust
- t4 (1000ms) LUR momentum 0→-20. landed thrust
- t4 (1000ms) ANA thrust. Public text: "The spear thrust reaches straight ahead." Resolves t8. Facing N. Template [(2, 3), (2, 2)].
- t8 (2000ms) ANA thrust hits LUR at (2, 2).
- t8 (2000ms) ANA momentum 20→40. landed thrust
- t8 (2000ms) public text: momentum +30
- t8 (2000ms) LUR momentum -20→-40. landed thrust
- t8 (2000ms) public text: momentum -30
- t8 (2000ms) ANA thrust. Public text: "The spear thrust reaches straight ahead." Resolves t12. Facing N. Template [(2, 3), (2, 2)].
- t12 (3000ms) ANA thrust hits LUR at (2, 2).
- t12 (3000ms) ANA momentum 40→60. landed thrust
- t12 (3000ms) public text: momentum +60
- t12 (3000ms) LUR momentum -40→-60. landed thrust
- t12 (3000ms) public text: momentum -60
- t12 (3000ms) ANA thrust. Public text: "The spear thrust reaches straight ahead." Resolves t16. Facing N. Template [(2, 3), (2, 2)].
- t16 (4000ms) ANA thrust hits LUR at (2, 2).
- t16 (4000ms) ANA momentum 60→80. landed thrust
- t16 (4000ms) LUR momentum -60→-80. landed thrust
- t16 (4000ms) ANA thrust. Public text: "The spear thrust reaches straight ahead." Resolves t20. Facing N. Template [(2, 3), (2, 2)].
- t20 (5000ms) ANA thrust hits LUR at (2, 2).
- t20 (5000ms) ANA momentum 80→100. landed thrust
- t20 (5000ms) public text: momentum +90
- t20 (5000ms) public text: momentum +100
- t20 (5000ms) legendary flow: no bonus granted
- t20 (5000ms) LUR momentum -80→-100. landed thrust
- t20 (5000ms) public text: momentum -90
- t20 (5000ms) public text: momentum -100
- t20 (5000ms) loss at -100. ANA chooses execute or mercy
- t20 (5000ms) before: square (2, 2) gear ['spear'] reps 0 momentum -100 dead=False pacified=False
- t20 (5000ms) ANA mercy on LUR. Not a death. Pacified. Returned to (0, 4). Gear ['spear'] reps 0 kept. Momentum left at -100. Will not thrust and cannot be thrust at.
- t21 (5250ms) ANA thrust refused. LUR cannot be thrust at.
- t21 (5250ms) LUR is pacified and will not act.

**Verdict:** pass

**Invented:**

- None.

## 9. Two allies sharing a square, and a shape aimed at that square

**Outside the stable test:** allies

**Setup.** ANN and BEN are allies and share (2,4). FOE at (2,2) aims a one-square shape at that square. Two runs: place target, then person target ANN. Nobody dodges.

**Ticks.**

- — place target on the shared square —
- t0 (0ms) FOE target-lock ANN (free). Facing S.
- t0 (0ms) FOE burst at place (2, 4). Public text: "The spear thrust reaches straight ahead." Resolves t4. Template [(2, 4)].
- t4 (1000ms) FOE burst hits ANN at (2, 4).
- t4 (1000ms) FOE momentum 0→20. landed thrust
- t4 (1000ms) ANN momentum 0→-20. landed thrust
- t4 (1000ms) FOE burst hits BEN at (2, 4).
- t4 (1000ms) FOE momentum 20→40. landed thrust
- t4 (1000ms) public text: momentum +30
- t4 (1000ms) BEN momentum 0→-20. landed thrust
- — person target ANN —
- t0 (0ms) FOE target-lock ANN (free). Facing S.
- t0 (0ms) FOE burst at person ANN. Public text: "The spear thrust reaches straight ahead." Resolves t4. Template [(2, 4)].
- t4 (1000ms) FOE burst hits ANN at (2, 4).
- t4 (1000ms) FOE momentum 0→20. landed thrust
- t4 (1000ms) ANN momentum 0→-20. landed thrust

**Verdict:** fail

**Invented:**

- Place-target hits every living body on the named square. Person-target hits only the named body.
- v3 states both that a shape names squares and that a manual override can name one person, and it leaves shared-square resolution open.
- The burst is a one-square template with the thrust telegraph timing and the thrust momentum numbers. It exists so the square can be aimed at.

## 10. Fast interrupt with no telegraph

**Outside the stable test:** fast interrupt

**Setup.** Same start squares. LUR interrupts on t0. No public telegraph. ANA's dodge is on t1, after the hit resolved at the end of t0.

**Ticks.**

- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) LUR target-lock ANA (free). Facing S.
- t0 (0ms) LUR interrupt. No telegraph. Template [(2, 3), (2, 4)]. Resolves at end of t0.
- t0 (0ms) LUR interrupt hits ANA at (2, 4).
- t0 (0ms) LUR momentum 0→20. STUB fast-attack magnitude, same as thrust
- t0 (0ms) ANA momentum 0→-20. STUB fast-attack magnitude, same as thrust
- t1 (250ms) ANA dodge. Stamina 100→90. Stays (2, 4).
- t1 (250ms) ANA dodge. Facing N. Shape [(2, 3), (2, 2)] covers no pending attacker.

**Verdict:** pass

**Invented:**

- The hit uses the landed-thrust magnitude (+20/−20). v3 does not give fast attacks their own number.

## 11. Disconnect mid-fight

**Outside the stable test:** no

**Setup.** LUR thrusts on t0. ANA disconnects on t1, inside the window, and is then passive. No dodge is entered. The thrust resolves on t4.

**Ticks.**

- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) LUR target-lock ANA (free). Facing S.
- t0 (0ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing S. Template [(2, 3), (2, 4)].
- t1 (250ms) ANA disconnects. Passive and undefended. Stays (2, 4).
- t2 (500ms) ANA passive. Square (2, 4). No auto-block. No auto-flee. Blocking=False.
- t3 (750ms) ANA passive. Square (2, 4). No auto-block. No auto-flee. Blocking=False.
- t4 (1000ms) LUR thrust hits ANA at (2, 4).
- t4 (1000ms) LUR momentum 0→20. landed thrust
- t4 (1000ms) ANA momentum 0→-20. landed thrust

**Verdict:** pass

**Invented:**

- None.

## 12. Stub check: telegraph window

**Outside the stable test:** no

**Setup.** Reading of the stable-test timing: a thrust declared on T resolves at the start of T+4, before that tick's commands. Dodge on T through T+3 cancels. Dodge on T+4 does not.

**Ticks.**

- — dodge on t3, last tick of the window —
- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) LUR target-lock ANA (free). Facing S.
- t0 (0ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing S. Template [(2, 3), (2, 4)].
- t3 (750ms) ANA dodge. Stamina 100→90. Stays (2, 4).
- t3 (750ms) ANA dodge. Facing N. Shape [(2, 3), (2, 2)] covers LUR.
- t4 (1000ms) LUR thrust cancelled by ANA (dodge). ANA is at (2, 4), on declared template [(2, 3), (2, 4)].
- t4 (1000ms) ANA momentum 0→10. dodge cancels thrust
- t4 (1000ms) LUR momentum 0→-10. dodge cancels thrust
- — dodge on t4, after resolution —
- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) LUR target-lock ANA (free). Facing S.
- t0 (0ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing S. Template [(2, 3), (2, 4)].
- t4 (1000ms) LUR thrust hits ANA at (2, 4).
- t4 (1000ms) LUR momentum 0→20. landed thrust
- t4 (1000ms) ANA momentum 0→-20. landed thrust
- t4 (1000ms) ANA dodge. Stamina 100→90. Stays (2, 4).
- t4 (1000ms) ANA dodge. Facing N. Shape [(2, 3), (2, 2)] covers no pending attacker.

**Verdict:** pass

**Invented:**

- None.

## 13. Stub check: dodge at 0 stamina

**Outside the stable test:** no

**Setup.** ANA starts at 0 stamina. Dodge on t1 is refused. LUR's thrust still resolves and hits.

**Ticks.**

- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) LUR target-lock ANA (free). Facing S.
- t0 (0ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing S. Template [(2, 3), (2, 4)].
- t1 (250ms) ANA dodge refused. Stamina 0.
- t4 (1000ms) LUR thrust hits ANA at (2, 4).
- t4 (1000ms) LUR momentum 0→20. landed thrust
- t4 (1000ms) ANA momentum 0→-20. landed thrust

**Verdict:** pass

**Invented:**

- None.

## 14. Stub check: step, template, and the arena edge

**Outside the stable test:** no

**Setup.** Step is the flee in the stable test. It costs 15 and does not cancel a thrust. If the body is still on the declared template, the thrust hits. Leaving the 5×5 is refused. From (2,4), one step cannot leave threat 2, because every square of this arena is within Chebyshev 2 of (2,2).

**Ticks.**

- — step east, off the declared ray, still inside the arena —
- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) LUR target-lock ANA (free). Facing S.
- t0 (0ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing S. Template [(2, 3), (2, 4)].
- t1 (250ms) ANA step E. Stamina 100→85. Now (3, 4).
- t4 (1000ms) LUR momentum 0 (no change). template empty at resolution
- — step north, still on the declared ray —
- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) LUR target-lock ANA (free). Facing S.
- t0 (0ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing S. Template [(2, 3), (2, 4)].
- t1 (250ms) ANA step N. Stamina 100→85. Now (2, 3).
- t4 (1000ms) LUR thrust reaches ANA at (2, 3) and stops. Does not continue to [(2, 4)].
- t4 (1000ms) LUR thrust hits ANA at (2, 3).
- t4 (1000ms) LUR momentum 0→20. landed thrust
- t4 (1000ms) ANA momentum 0→-20. landed thrust
- — step south off the arena —
- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) ANA step to (2, 5) refused. Arena or occupancy.

**Verdict:** fail

**Invented:**

- None.

## 15. Stub check: riposte

**Outside the stable test:** no

**Setup.** ANA ripostes on t1. The command is refused. No matrix is built. The thrust still hits on t4.

**Ticks.**

- t0 (0ms) ANA target-lock LUR (free). Facing N.
- t0 (0ms) LUR target-lock ANA (free). Facing S.
- t0 (0ms) LUR thrust. Public text: "The spear thrust reaches straight ahead." Resolves t4. Facing S. Template [(2, 3), (2, 4)].
- t1 (250ms) ANA riposte refused. This thrust is not riposteable. No weapon matrix.
- t4 (1000ms) LUR thrust hits ANA at (2, 4).
- t4 (1000ms) LUR momentum 0→20. landed thrust
- t4 (1000ms) ANA momentum 0→-20. landed thrust

**Verdict:** pass

**Invented:**

- None.

## Gaps the runs exposed

- Feint has no true counter, no window, and no momentum delta. The bait result is entirely stubbed.
- Roll has no stamina cost and no momentum. Leaving the template is fixed by the shape. Calling that a dodge-read and calling it an empty template are both compatible with the written numbers, and they disagree.
- Block has no per-hit stamina cost and no guard-break delta. Four absorbs to a break is an artifact of stubbing 25 against a pool of 100.
- Aggravated damage has no cadence. An outright kill also has no winner's choice, which conflicts with death being only execute.
- A shape aimed at a square two allies share is explicitly unresolved. Person-target and place-target produce different bodies hit.
- A spear stopped by a teammate's body has no friendly-fire rule. In the doorway stack the second attacker hits the first under the stub.
- The 5×5 arena with the lurker on (2,2) and threat 2 has no square outside threat. One step cannot be the flee the stable test describes unless the body is allowed off the arena, and leaving the arena is refused here.
- Execute says the fight can restart and does not say momentum leaves -100. The thrust after execute lands, and both values stay clamped at ±100, with no new crossing. Nothing in the fall stub is stripped: spear and reps stay.
- Fast attacks skip the telegraph, which is enough for that scenario. They have no magnitude of their own. Same-tick dodge versus a fast attack was not given a priority rule; the dodge in the run is on the next tick.
