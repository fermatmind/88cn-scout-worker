# Security Boundary

The worker repo may only handle reviewed public project information in future approved stages. It must not collect, store, or expose private contact data, analytics, billing material, identity files, credentials, customer lists, or private founder materials.

## Public Data Only

Allowed future input classes:

- project name;
- official site;
- category slug;
- one-line description;
- public GitHub URL;
- public docs URL;
- public pricing URL;
- public launch URL;
- public founder social URL.

Denied input classes:

- emails and phone numbers;
- revenue screenshots;
- Stripe, bank, or billing screenshots;
- API keys, tokens, private keys, session material, or secrets;
- analytics exports;
- customer lists;
- login credentials;
- investor identity files;
- private seed handoff artifacts;
- raw unreviewed project rows.

## Publication Boundary

This repo does not publish. Future worker output must enter review/quarantine contracts before any public 88CN surface can consume it.
