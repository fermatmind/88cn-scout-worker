# Architecture

The future scout worker is intended to remain separate from the 88CN public web repository. This bootstrap keeps only contracts and documentation so later work can implement bounded worker stages without mixing public UI, admin UI, deployment, or private data handling into this repository.

## Planned Pipeline Shape

1. Import batch intake receives reviewed public source descriptors.
2. Canonical candidate generation normalizes project identity candidates.
3. HTTP audit produces bounded observations from approved public URLs.
4. Quarantine captures rejected, duplicate, malformed, or privacy-risk events.
5. Queue and retry handling remain disabled until a later approved task.
6. Reports summarize local worker outcomes without exposing private raw data.

## Current Runtime State

No runtime exists. There is no package file, no dependency install path, no queue client, no database client, no deploy target, and no executable worker entrypoint.
