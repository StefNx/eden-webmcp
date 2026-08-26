# EDEN demo script — target 2:40

Record at 1920×1080 with audible narration. Start from the deployed
`/?demo=starter` route in a WebMCP-capable ChatGPT in-app browser. Keep the
mission, graph and simulation area visible; use the prewritten agent prompt so
typing latency does not dominate the video.

## 0:00–0:15 — premise

**On screen:** EDEN starter graph and live WebMCP badge.

**Say:** “EDEN is a closed-loop habitat lab. The human defines the mission, the
agent edits the same visible system through WebMCP, and a deterministic
simulator—not the model—decides whether twelve people survive five hundred
sols.”

Point briefly to the 45-sol dust storm, oxygen outage, budget and mass limits.

## 0:15–0:35 — inspect and attack reality

Send:

> Inspect the mission and design, then run seed 424242. Explain the first causal
> failure before changing anything.

**On screen:** the agent uses read tools and `run_simulation`; the badge gains
`analyze_latest_run`.

**Say:** “Structured tools expose stable module IDs, typed resource buses and
the exact constraints. No pixel guessing and no hidden agent copy of the
design.”

## 0:35–0:58 — first failure

Show `POWER_COLLAPSE` at S94, the dust band, empty battery and evidence.

Send:

> Repair only the power cause with dust-independent generation. Connect the new
> module and rerun the same seed.

**Say:** “The first repair is causal: a connected microreactor carries critical
loads through the storm.”

## 0:58–1:20 — deeper failure

Show the second run reaching `OXYGEN_RESERVE_BREACH` at S300.

**Say:** “Fixing power reveals the next bottleneck during the scripted oxygen
outage. The result-aware analysis tool exists only because a run now exists.”

## 1:20–1:42 — human changes the problem

Select the greenhouse and enable its human lock. Click **Demo trade-off · cap
budget at $7.95M**.

Send:

> The greenhouse is human-locked and the budget is now $7.95M. Do not override
> the lock. Find a lower-cost oxygen-reserve strategy, connect it explicitly,
> rerun seed 424242, then compare the first and final runs.

**Say:** “The human can intervene mid-loop. Locked modules fail closed for agent
writes, and the new constraint is immediately part of the shared state.”

## 1:42–2:10 — adaptive repair

Show the agent add resource storage and connect only its oxygen bus. Run again.

**On screen:** `MISSION SURVIVED`, S500, $7.90M and 40.5t.

**Say:** “EDEN models routing per resource. Storage contributes oxygen only
because its oxygen connection is visible. The final result is simulated from
the graph—not scripted for the demo.”

## 2:10–2:30 — prove the shared world

Show the run comparison and activity feed.

**Say:** “The comparison uses immutable snapshots: plus 406 survived sols, two
added modules, one human lock and the tighter budget. HUMAN, AGENT and SYSTEM
actions share one audit trail.”

Open the WebMCP developer panel long enough to show 12 tools, validated arguments
and the structured result.

## 2:30–2:40 — close

**Say:** “EDEN turns a website into a collaborative engineering instrument: AI
builds, reality attacks, and the human decides.”

End on the successful habitat and tagline.

## Recording safeguards

- Use one fixed seed and a clean guided reset before every take.
- Do not imply scientific or NASA-grade fidelity.
- If native tool discovery is not visible, stop and fix the environment; do not
  fake the badge in the submission video.
- Keep the final upload below three minutes and verify public playback with
  audio while signed out.
