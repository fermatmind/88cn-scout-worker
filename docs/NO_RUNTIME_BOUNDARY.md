# No Runtime Boundary

This bootstrap is documentation and contract-only.

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
