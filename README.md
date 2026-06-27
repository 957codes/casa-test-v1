# Capx Casa

The open control plane for building a company from your terminal.

AI made a single developer as productive as a whole team. Capx Casa does the same
for the founder. A solo founder is excellent at one thing, but a company is a hundred
things at once. Casa holds the hundred: it figures out which of them matter for
your specific business, puts them in the right order, runs what it can, and tells
you what to do next, every time you open the terminal.

Casa is an open-source (MIT) Claude Code plugin. It runs inside your own Claude
Code, on your own plan. Terminal only. No dashboard, no SaaS login, no hosted
inference.

## What it gives you

- A library of company-building playbooks (the "what to do").
- A router that selects the playbooks relevant to your business and sequences
  them into a personalized build map (the "what to do when").
- An always-on advisor that recommends your single next best action on every
  session.
- Recurring loops for the work that never finishes (metrics, customers, growth).
- A company brain: durable, versioned, plain-text memory that makes every run
  compound on the last.

## The level model

Casa organizes the work into levels. You move through them in order, gated by
measurable criteria. The router personalizes which playbooks fire inside each
level for your business type.

| Level | Name | Goal |
|---|---|---|
| Always-on | Foundations | Safety gates and cost governance |
| Level 0 | Ideation and Validation | Find a validated opportunity worth building |
| Level 1 | Commit and Incorporate | Pick the wedge, form the entity, secure the brand |
| Level 2 | Product and Infra Foundation | Stand up hosting, security, analytics, pricing |
| Level 3 | Build and Pre-launch | Build the product, prep launch, start channels |
| Level 4 | Launch | Coordinated launch burst |
| Level 5 | First Customers and PMF | Iterate to retention, establish customer success |
| Level 6 | Scale Acquisition | Compound via paid, organic, partnerships |
| Level 7 | Enterprise Sales (conditional) | Upmarket motion for high-ACV B2B |
| Level 8 | Growth Finance and Fundraise | Institutionalize finance, raise capital |

## Commands

| Command | What it does |
|---|---|
| `/casa-start` | Run the stage interview, then select, sequence, and seed your build map |
| `/casa-priority` | Re-evaluate where the company is and get your ranked priorities for this session |
| `/casa-next` | The always-on advisor: your single next best action |
| `/casa-map` | Show and approve your personalized build map |
| `/casa-loops` | Show and run recurring loops (pulse, retro, content, close) |
| `/casa-pay` | Run paid actions (domains, hosting, media, research) through Capx Pay |

### Craft and review

These do the work and check it.

| Command | What it does |
|---|---|
| `/casa-build` | Execute a ready playbook to a finished artifact and advance the state |
| `/casa-review` | Critique a decision, plan, or copy with a panel of specialist personas |
| `/casa-write` | Draft founder-facing copy to the canon, enforced by a linter |
| `/casa-design` | Build and verify product UI with production craft |
| `/casa-synthesize` | Turn raw customer notes into a ranked insight memo |
| `/casa-strategy` | Set and maintain the company strategy anchor |
| `/casa-readout` | Read the company numbers honestly |
| `/casa-ideate` | Generate, critique, and shortlist company moves |
| `/casa-experiment` | Frame and log a disciplined experiment |
| `/casa-compound` | Capture a lesson so the next run starts ahead |
| `/casa-refresh` | Sweep the learning store for drift |
| `/casa-pulse` | A time-windowed recap of the company |
| `/casa-promote` | Draft launch and announcement copy |

## Getting started

1. Make a new, empty project folder for your company and open it in Claude Code.
2. Install the plugin:

   ```
   /plugin marketplace add https://github.com/capx/capx-casa
   /plugin install capx-casa
   ```

3. Set up your company. Casa works for a brand-new idea or a business already
   running:

   ```
   /casa-start
   ```

   It asks a short series of questions to learn what the business is and where it is
   today, then builds a personalized map that starts at the right level. A raw idea
   gets validated first; an existing business skips ahead, with anything you have not
   done yet surfaced as catch-up work.

4. Every time you reopen the project, Casa greets you with your level, progress, and
   top priority. Run `/casa-priority` to re-evaluate, or `/casa-next` to act.

See `docs/ONBOARDING.md` for the full walkthrough.

## How it works

Read `docs/ARCHITECTURE.md` for the design, `docs/BUILD-PLAN.md` for the full
plan, and `CLAUDE.md` for the operating contract this repo runs under.

## License

MIT. The skills, agents, loops, and router are free forever. Real-world actions
that cost money (domains, incorporation, hosting, generative media, research) run
through the companion product Capx Pay, which holds the wallet and the billing.
Casa never charges or holds funds. You can always bring your own keys and pay
nothing.
