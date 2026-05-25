# Team Handbook.
*(you saw the goose. now what.)*

If you have a **mod** or **admin** role on Discord, you have a job. This document is what the job actually is.

---

## The mandate

We are not running a daycare. We are running a haunted petting zoo.

There is no algorithm. *You are the algorithm.* Submissions live or die because you said so. Nothing weird gets surfaced unless you let it through. Nothing harmful gets blocked unless you reject it.

Be honest. Be quick. Be on the same page as the room.

---

## The bar

### Approve when…

- The submitter made it themselves *(or did substantial edit on a tool-assisted piece — see "the AI line" below).*
- It's specific. Even a JPG of a foot benefits from one sentence of context, but you can approve nakedly weird things on faith if the submitter is in good standing.
- The vibe lands. Operator-cult, dossier-noir, terminal aesthetics, found-art, ugly-on-purpose — all welcome.
- It's a feat-shaped writeup with a real story, even if the project itself is small.

### Feature when…

Something is *unusually* good — the kind of thing you'd send to a friend at 2 a.m. with no caption. Features show up larger in the showcase and get the gold stamp. Use sparingly; if everything is featured, nothing is.

### Reject when…

- **Bigoted, doxxing, illegal, CSAM.** Permanent reject. No appeal. Ban the submitter from the site (set `users.banned=true` via the next admin pass, and pull their role in Discord).
- **Unedited generative slop.** Tools are fine. *Unedited copy-paste of a prompt's output* is not. If you can't tell, ask in `#mod` or err on the side of reject.
- **Wastes your time.** *Boring is a moderation reason.*

### Withdraw when…

Something previously approved needs to come back down — the submitter asked, content turned out to be lifted, scope changed. Withdrawn items leave the public gallery but stay in the database for audit.

### When in doubt

Reject with a brief reason. The submitter can resubmit. Re-rejections without changes get a permanent reject.

---

## The AI line

This one keeps coming up, so it gets its own section.

- **Allowed:** AI-assisted work where the human's hand is visible. Trained your own LoRA, fine-tuned on your own corpus, used a model to scaffold something you then rewrote, did real editing or curation of generative output.
- **Not allowed:** Prompt-and-post. "I told ChatGPT to write me a poem and here it is." That's the prompt's submission, not yours.
- **Grey area:** ask in `#mod`. Don't decide alone if you're uncertain — that's what the channel is for.

---

## The tools

### Discord-side

| Channel / command | What it does |
|---|---|
| `#🔒 mod-queue` | Every new submission and feat lands here as an embed with **Approve / Feature / Reject** buttons. Click one. The bot re-checks your role on every click — if your role was just changed, it honors the new one. |
| `#📺 show-off` | Approved submissions auto-mirror here. A discussion thread opens automatically. |
| `#⏫ code-features` | Same for approved feats. |
| `#🎙️ quotes` | The Steno files anything reacted with 🎙 here. Good for finding things later. |
| `#audit` (if configured) | Every mod action gets a one-line entry — who did what to which item, with a deep link. Browseable. |
| `/modstats` | Your approve / feature / reject / withdraw / unfeature counts vs. everyone else's. Glance at it occasionally; healthy. |
| `/audit-trail @user` | The recent mod actions on a specific user's content. Use this when a submitter complains, or when triaging a borderline pattern. |

### Site-side

- **`/mod`** — the operator console. Vital signs, incoming transmissions, activity log. Currently the buttons here are visual placeholders; mod decisions happen in Discord. The web flow lands in a later pass.

---

## The voice

When you write a rejection reason, when you post in `#mod` about a borderline case, when you reply to a submitter: stay in voice. Dry, specific, brief.

- **good:** *"approved, lands in `#📺` in a sec"*
- **good:** *"too generic — needs more weird"*
- **good:** *"rejected — looks like raw prompt output. resubmit if you want with your edits visible."*
- **bad:** *"This submission does not meet our content standards at this time."* — sounds like SaaS

You don't have to be funny. You should be specific.

---

## Hard nos

These don't get a polite reply. Reject and move on:

- Anything sexual involving minors. Ban the account. Report to authorities where applicable.
- Real-world doxxing or harassment material aimed at a specific person.
- Content soliciting violence against a person or group.
- Spam pretending to be a submission (crypto, drop-shipping, OnlyFans funnels, etc.).

If any of the above happens **in chat**, ban first. Document in `#audit` after. Admin will review and back you up.

---

## Conflict resolution

- **Disagree with another mod's call?** Take it to `#mod`. Don't reverse the action without consensus.
- **Submitter unhappy with a rejection?** Point them at the resubmit form with the change you requested. If they want a second opinion, direct them to `#mod`. Don't argue in DMs.
- **Recurring problem submitter?** Run `/audit-trail @user` before taking any heavy action. Pattern matters more than any single piece.
- **A piece blew up and you're getting heat for the call?** That's a `#mod` conversation, not a public one. Take it there first.

---

## Decay & burnout

The humans are tired. They will be honest about that.

- Take time off the queue when you need it. The queue will exist when you come back.
- If you see another mod going dark, check on them privately, not by passive-aggression in `#mod`.
- If you stop wanting to do this, *say so* — we'd rather rotate than have you forced to keep up.

---

## When in doubt

Ask in `#mod`. The whole point of *queue + person + channel* is that the channel exists. Use it.

---

## The promise

We can't promise the queue will always be clean. We can't promise the dynamics will always be calm. We *can* promise you, as a moderator, will be heard — in `#mod`, in the audit trail, in the room. You are not invisible. The work is the work.

---

*◆ on the record · no attorney present · shoes off ◆*
