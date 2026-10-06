---
slug: november-monthly-recap
title: "November Recap: Hashnet MCP Server, ERC‑8004 expansions, HCS‑21, and Patchwork"
description: "November 2025 highlights: Hashnet MCP Server ships, ERC-8004 and x402 multi-chain support expands, HCS-21 Adapter Registry drafts, Patchwork working sessions launch, and Tashi joins the DAO."
authors: [michelle-baez]
tags: [updates, monthly-recap, hashnet-mcp, mcp, erc-8004, x402, hcs-21, patchwork, standards-sdk, registry-broker]
date: 2025-12-01
---

November was about turning our “universal registry” story into something you can *use everywhere*: we shipped the Hashnet MCP Server, expanded our ERC‑8004 + x402 capabilities across the Broker + SDKs, published a major new draft standard (HCS‑21), and kicked off Patchwork—our standards-focused working session series.

<!--truncate-->

## 🚀 Launch: Hashnet MCP Server (HOL Hashnet MCP)

The **Hashnet MCP Server** (`@hol-org/hashnet-mcp`) is now live. It’s a Model Context Protocol interface on top of the **Hashgraph Online Registry Broker**, giving MCP-capable clients a clean way to:

- **Discover** agents and MCP servers (keyword + semantic search, UAID resolution).
- **Register** agents/servers via guided workflows (quotes → submit → wait).
- **Chat** across protocols via the Broker (with session management and history utilities).
- **Operate** with real diagnostics (stats/metrics/WebSocket health) and credit tooling.

It supports both **stdio** and **HTTP/SSE streaming** transports so you can wire it into platforms like Claude Desktop, Cursor, Codex, and Claude Code without custom glue.

- Learn more / quickstart: [Hashnet MCP Server docs](/docs/registry-broker/mcp-server)
- Landing page: [/mcp](https://hol.org/mcp)

## 🌐 ERC‑8004 + x402: multi-chain capabilities are first-class

This month we pushed deeper on **ERC‑8004 “trustless agents” interoperability** and the practical bits that make it usable in production:

- **Broker-side ERC‑8004 improvements**: smoother registration + update flows, better agent URL handling, and asynchronous registrations for multi-network publishing.
- **x402 payments & credits**: clearer “paid chat” flows, minimum checks, and credit purchase paths (HBAR + x402), so paid agents can be discovered and accessed predictably.

If you want to see what this looks like end-to-end:
- Search examples (ERC‑8004 + x402 filters): [/docs/registry-broker/search](/docs/registry-broker/search)
- Paid chat walkthrough: [/docs/registry-broker/chat](/docs/registry-broker/chat)
- Ledger auth + credit funding: [/docs/registry-broker/ledger-auth-credits](/docs/registry-broker/ledger-auth-credits)

## 🔐 Encrypted chat: “ping” demo for real-world verification

We added a **Ping Agent Demo** that exercises a full encrypted flow against the built-in Registry Ping Agent—helpful for validating ciphertext storage and decrypted history end-to-end.

- Demo guide: [/docs/registry-broker/examples/ping-agent-demo](/docs/registry-broker/examples/ping-agent-demo)

## 🛠️ Standards SDK: demos + workflows got sharper

Behind a lot of the Broker + Hashnet MCP UX is ongoing work in `@hashgraphonline/standards-sdk`. In November we shipped improvements that make it easier to reproduce real flows locally and in CI:

- **HCS‑21 tooling**: initial implementation work landed in the SDK to support the Adapter Registry direction.
- **Async registration + paid flows**: demo and client improvements for registration pipelines and x402-enabled workflows.
- **Encrypted chat demos**: smoother end-to-end encrypted messaging setup and verification.
- **Interactive CLI**: a more guided way to run demos and validate setups quickly.

If you want a hands-on starting point, the Registry Broker client + demos are documented here:
- Standards SDK CLI: [/docs/libraries/standards-sdk/cli](/docs/libraries/standards-sdk/cli)
- Registry Broker client guide: [/docs/libraries/standards-sdk/registry-broker-client](/docs/libraries/standards-sdk/registry-broker-client)

## 📐 Standards: HCS‑21 Adapter Registry (Draft)

We published **HCS‑21 (Draft v2.0)**: a registry for deterministic **Adapters** that appnets (like **Floras**) can use to reach consensus on external entities (agents, datasets, marketplaces, and more). It defines adapter declarations, signed manifests, package integrity, and the consensus evidence model—so participants can verify they’re running the same code against the same schema.

- Spec: [/docs/standards/hcs-21](/docs/standards/hcs-21)
- Flora tutorial context: [/docs/tutorials/floras/hcs-21-adapter-registry](/docs/tutorials/floras/hcs-21-adapter-registry)

## 🧩 Patchwork: AI Standards working session pages are live

We launched the Patchwork program pages, including speaker and topic intake flows, as we prep for our December working session bringing standards builders into the same room (virtually) to align on interoperability.

- Patchwork landing page: [/patchwork](https://hol.org/patchwork)
- Speaker interest form: [/patchwork-speaker](https://hol.org/patchwork-speaker)
- Topics & sessions intake: [/patchwork-sessions-intake](https://hol.org/patchwork-sessions-intake)

## 🤝 DAO & ecosystem: Tashi joins Hashgraph Online

We also welcomed **Tashi Network** into the DAO—bringing a real-time mesh coordination layer that pairs cleanly with on-chain identity, discovery, and verifiable conversations.

- Read the announcement: [/blog/tashi-joins-hashgraph-online-dao](/blog/tashi-joins-hashgraph-online-dao)

## Quick links

- Hashnet MCP Server docs: [/docs/registry-broker/mcp-server](/docs/registry-broker/mcp-server)
- Registry Broker search examples: [/docs/registry-broker/search](/docs/registry-broker/search)
- Registry Broker chat guide: [/docs/registry-broker/chat](/docs/registry-broker/chat)
- HCS‑21 spec: [/docs/standards/hcs-21](/docs/standards/hcs-21)
- Petals/Floras/State Hash announcement: [/blog/ai-appnets-decentralized-profiles](/blog/ai-appnets-decentralized-profiles)

## Thanks for building with us

If you shipped something using the Broker, Standards SDK, or the new Hashnet MCP Server this month, share it with us—we’re actively folding builder feedback into the next wave of docs, demos, and protocol adapters.
