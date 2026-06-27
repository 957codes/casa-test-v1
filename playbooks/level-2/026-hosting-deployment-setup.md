---
id: hosting-deployment-setup
title: Hosting & Deployment Setup
level: 2
summary: Pick and configure hosting plus a CI/CD pipeline and secrets management for the chosen stack.
applies_to:
  types:
    - saas
    - marketplace
    - ecommerce
    - content
    - crypto
  requires_traits:
    - builds_software
  excluded_traits: []
relevance: core
selection_hint: Stands up the deploy foundation once the stack is chosen. Everything observability, security, backup, and release depends on this landing.
depends_on:
  - tech-stack-selection
soft_after:
  - domain-acquisition
produces:
  - hosting
  - cicd
consumes:
  - tech_stack
effort: M
leverage: high
reversibility: medium
human_gate: true
blocks_revenue: false
recurring: false
typical_milestone: hosting-live
source: ../capx-ai/playbooks/playbooks-output/026-hosting-deployment-setup.md
---
# Hosting & Deployment Setup

Choose a hosting target and stand up a production-grade deploy pipeline. The aim is
a foundation for rapid iteration, high availability, and predictable cost. Watch
for surprise serverless bills; weigh developer experience against TCO at scale.

## Procedure

1. Evaluate inputs (framework, database needs, expected traffic, budget) against
   the decision tree: Vercel/Cloudflare for static or Jamstack, Railway/Fly for
   stateful containers, AWS/GCP for strict compliance and multi-region, self-host
   for absolute cost minimization with DevOps expertise on hand.
2. Provision compute and a managed database with automated backups configured.
3. Configure CI/CD (lint, test, build, multi-stage image, push, rollout) and a
   secrets manager so no secret is hardcoded in the repo or pipeline.
4. Add health checks and platform-native logging so traffic only routes to healthy
   instances.

## Output

`hosting` (live URL plus infra config) and `cicd` (the pipeline definition),
written to the company brain. Unblocks observability (027), security baseline
(029), data backup (030), and release cadence (025).

## Rules

- Cost-predictability is a first-class selection criterion, not an afterthought.
- Provisioning that incurs ongoing spend escalates to the founder per the HITL
  gates before commitment.

The full source draft is at the path in the `source` field above.
