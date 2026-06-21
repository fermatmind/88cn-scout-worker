# No Runtime Boundary

This bootstrap is documentation, contract, fixture, and local dry-run CLI only.

Forbidden until a later approved task:

- worker process entrypoints;
- Redis, queue, retry, or dead-letter clients;
- external HTTP crawler or audit execution;
- Supabase, staging, or production writes;
- public API or MCP runtime;
- deploy, PM2, Nginx, systemd, cron, or cloud config;
- package metadata or dependency installation;
- secrets, env examples, credentials, DB URLs, Redis URLs, private keys, tokens, or private seed artifacts.

Any future implementation must preserve bounded batch sizes, low concurrency, timeout, retry, quarantine, and no-public-default behavior.

The AGENT1 CLI contract is allowed only because it is a synchronous local command that requires `--dry-run` and `--no-network`, writes only local artifacts under ignored or fixture output directories, and starts no worker process.
