---
name: casa-pay
description: Run a real-world paid action (domain, hosting, media, research, enrichment, incorporation) by routing it to Capx Pay. Use when a Casa step needs something that costs money. Surfaces Capx Pay's cost and approval; never invents limits or prices.
---

# casa-pay

Casa is the brain; Capx Pay is the hands. When a step needs a real-world action
that costs money, route it to Capx Pay. Casa never holds funds, never prices an
action, never charges a card, and never sets spend limits. Capx Pay owns the
wallet, billing, credentials, and spend governance.

## Detect Capx Pay

Pay is installed if the `capx_*` MCP tools are available in this session
(`capx_balance`, `capx_capabilities`, `capx_quote`, `capx_do`, `capx_request`,
`capx_ledger`) or the `capx` CLI is on PATH. If neither is present, degrade (see
below). Casa must remain fully usable without Pay.

## With Capx Pay present

1. Pick the capability id for the action from `pay/capabilities.yaml`
   (for example `domain.register`, `media.image`, `leads.enrich`,
   `company.incorporate`).
2. Quote first: `capx_quote <capability> <params>`. It returns the underlying
   cost, the transparent Capx Pay fee, and the total. Surface this to the founder.
3. Execute: `capx_do <capability> <params>`. If Pay returns a needs-confirmation
   state (the action is above the founder's threshold), surface that confirmation
   and proceed only on an explicit yes. Do not invent your own limit; Pay enforces
   per-action, per-day, per-month caps and the category allowlist.
4. Pay writes the receipt to `company-brain/finance/receipts.jsonl`. Read it for
   the company's financial state. Never write charges or fees yourself.

## Without Capx Pay (degrade gracefully)

Tell the founder the step costs money and offer two paths:
- Install Capx Pay (the easy default: one funded account, the agent can execute).
- Bring your own vendor key or do the step manually (the documented BYO path).

Either way, record the outcome in the company brain and continue. Pay is the easy
default, never a hard requirement.

## Rules

- Route only genuinely needed work. Never manufacture spend to create billing.
  Recurring loops trigger recurring real work (this week's content, this week's
  research), which is naturally recurring revenue. They must never invent work.
- Money, legal, and irreversible actions always stop for the founder. Surface
  Pay's confirmation; do not bypass it.
- Label the spend balance (stablecoin, via Capx Pay) distinctly from any CAPX
  token holdings. They are different things and must never be conflated.
- No em-dashes, no emojis in founder-facing output.
