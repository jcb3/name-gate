# Design workflow

Use this loop to design a new text game one module at a time. It does not choose a premise, a setting, or a finished design. Fill the artifacts in order. Each iteration changes one module, tries the slice you already have, and writes down the next revision.

Keep each decision in its own module so a playtest note can name exactly one place to change.

## 1. Premise

**Purpose.** Name the situation the player is in and how a session ends.

**Inputs.** A player role in one sentence, the pressure or goal, and the session you want to test (how long, what tone). Hold setting detail until it changes what the player does.

**Artifact.** A premise note, about half a page: situation, player role, how the session stops (success, failure, or a hard stop), and a short out-of-scope list.

**Ready for the next iteration.** Someone who did not write the note can restate the situation and the stop condition. Open questions are written as questions. The note has no rooms, verbs, or scene text.

## 2. Player verbs

**Purpose.** List the actions the player can take. The slice has to honor this list.

**Inputs.** The premise note, plus one decision that is still open: typed commands, on-screen choices, or both. Record that decision in the artifact. This workflow does not choose it.

**Artifact.** A verb list. For each verb: the name the player uses, what they must supply (an object, a direction, or nothing), and what the verb is allowed to change. Add a short "not available" list for actions the premise suggests that this game will not offer.

**Ready for the next iteration.** Each verb is marked in-slice or later. The interface choice is written down. If the player can issue a verb, the list says what it changes.

## 3. World state

**Purpose.** Name the facts the verbs read and write. The slice may depend only on facts that appear here.

**Inputs.** The premise note (facts that stay true for the session) and the verb list (facts that must be able to change).

**Artifact.** A state sheet: starting values, the fields that can change, and which verb writes each field. Mark copy that is prose-only so it is not treated as state.

**Ready for the next iteration.** Every in-slice verb has its reads and writes named. Starting values are concrete enough to load. The sheet has no scene prose.

## 4. First content slice

**Purpose.** Make one situation playable with the verbs and the state you already have.

**Inputs.** The premise note, the verb list, and the state sheet. Set a boundary before writing: one place, a few beats, and the stop condition from the premise.

**Artifact.** The slice: the opening text, the response for each in-scope verb, and the state change that response applies. Anything outside the boundary stays a one-line stub on the state sheet.

**Ready for the next iteration.** A person can start from the starting state, use only the listed verbs, and reach the stop condition or a dead end written in the slice. The slice did not need a new verb to make a line work.

## 5. Playtest

**Purpose.** Learn what to revise. The test records findings. It does not add content.

**Inputs.** The current slice, played without editing it, and three questions: did the premise still describe what you did, did any verb do nothing you cared about, and did any state change surprise you.

**Artifact.** A playtest note: what you tried, what the slice did, and a revision list. Each line names one module (premise, verbs, state, or slice) and the change. A pillar found outside a playtest is the same kind of line.

**Ready for the next iteration.** The note ends with at least one revision, or with the sentence "nothing to change this pass." Every revision names one module. The slice text stayed as it was during the test.

## One iteration

1. If a revision list exists (a playtest note, or pillars found after the artifacts were written), pick the open line on the earliest module. Otherwise pick the earliest module that is not ready.
2. Edit only that module's artifact.
3. Try the current slice from the start. If no slice exists yet, read the artifact against the previous module's ready check and write down where it fails.
4. Add a revision list: module, change, reason. When the try shows an earlier module is wrong, the line names that earlier module.
5. Stop. The next iteration picks one line from that list.

When an earlier module changes, leave later artifacts as they are until their own iteration. Update one of them next, then try the slice again.

## A newly found pillar

A pillar that turns up after the artifacts exist — from a concept pass, a discussion, or a playtest — joins the revision list. The design stays. You do not go back to the beginning and rewrite every module.

1. Assign it to one module already in this loop: premise, player verbs, world state, content slice, or playtest. Add a module only when that decision cannot live in those five.
2. Append one line: the module, the decision the pillar is asking, and where it turned up. Several pillars found together are several lines.
3. The next iteration picks the open line on the earliest module and edits only that artifact. Premise before verbs, verbs before world state, world state before the content slice, the slice before a new playtest.
4. The other lines wait. A slice that does not yet show the new fact stays as it is until an iteration names the slice.
5. If settling the pillar shows an earlier module was wrong, the line you write names that earlier module. Later artifacts stay on disk until their own iteration.

## Where this sits in the repo

The checkout is **HoneyDo** (`honeydo-handyman`): a marketing site for HoneyDo Handyman & Custom Carpentry in New Port Richey, Florida. It is unrelated to a text game. There is no parser, no story content, and no playable scene.

Stack: Next.js 16.4 with the App Router in `src/app/`, React 19, TypeScript, and Tailwind CSS 4. Routes today are `/`, `/services`, `/services/[slug]`, `/about`, `/estimate`, `/privacy`, and `src/app/api/estimate/route.ts`. Shared contact data lives in `src/lib/`. The README runs the site with `npm run dev -- --port 3847`.

Add a prototype beside those pages when there is a slice to try:

- `src/app/play/page.tsx` is the page you open. The URL is `/play`.
- `src/lib/game/premise.ts` holds the premise note.
- `src/lib/game/verbs.ts` holds the verb list.
- `src/lib/game/state.ts` holds the state sheet.
- `src/lib/game/slice.ts` holds the first content slice.
- `src/lib/game/playtest-log.md` holds the playtest notes.

Until those files exist, keep the working notes with this doc. After `/play` exists, try the current slice at `http://127.0.0.1:3847/play`. Leave the marketing routes and the estimate API on their current paths.
