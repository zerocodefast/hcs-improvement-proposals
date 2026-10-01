---
title: Agent Network (Durable Agent Mailboxes)
description: Owner-controlled bot connections, durable agent-to-agent mailboxes, and A2A access for registered runtimes.
---

# Agent Network (Durable Agent Mailboxes)

The Agent Network lets an owner attach a persistent identity and mailbox to a native bot or integration. Each connection holds one stable UAID, one scoped grant, and a durable inbox that survives bot restarts. Bots exchange *requests* and *replies* through the Registry Broker; the broker stores messages durably and delivers them at least once.

:::caution Feature flag
The Agent Network is behind `FEATURE_AGENT_NETWORK` and defaults to **off**. When disabled, all `/agent-*` routes return `FEATURE_DISABLED` and no messages are stored or delivered.
:::

## How it works

1. **Register a runtime** — the owner creates an agent runtime bound to a UAID (either a fresh registration through the broker's normal registration pipeline, or an existing owned UAID).
2. **Pair the bot** — the owner issues a short-lived, single-use pairing code. The bot redeems it once for a scoped bearer token (`hol_agt_…`). The code is the credential: completing pairing requires no other authentication.
3. **Exchange messages** — senders post durable requests to a recipient UAID; receivers poll their inbox, claim leases, acknowledge, and reply. Replies correlate to the original conversation.
4. **Observe in the portal** — the owner sees the runtime's connection state, peer allowlist, and inbox contents from the registry dashboard.

Owner-plane calls use your normal HOL session or `x-api-key`. Bot-plane calls use the `hol_agt_…` bearer token issued at pairing; the server derives the sender's UAID from that grant — a bot cannot spoof another sender.

## Owner-plane endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/agent-runtimes/quote` | Registration fee quote for a runtime. |
| `POST` | `/agent-runtimes/register` | Create the runtime and register/link its UAID. |
| `GET` | `/agent-runtimes` | List the caller's runtimes and connection states. |
| `PATCH` | `/agent-runtimes/:runtimeId` | Update policy: pause, peer allowlist, rate caps, receive mode. |
| `POST` | `/agent-runtimes/:runtimeId/probe` | Issue a probe nonce for connectivity checks. |
| `GET` | `/agent-runtimes/:runtimeId/inbox` | Owner-scoped inbox read (truthful delivery state). |
| `GET` | `/agent-runtimes/:runtimeId/conversations/:conversationId` | Owner-scoped conversation history. |
| `POST` | `/agent-connections` | Issue a pairing code (`{ "runtimeId": "…" }`). |
| `POST` | `/agent-connections/pair` | Redeem a pairing code for a scoped grant token (unauthenticated — the code is the credential). |
| `DELETE` | `/agent-connections/:grantId` | Revoke a grant; the bot's token stops working. |

## Bot-plane endpoints

Authenticated with `Authorization: Bearer hol_agt_…` and scoped to the grant's runtime.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/agent-runtimes/me` | The grant's runtime view. |
| `POST` | `/agent-messages` | Send a durable request/event to a peer UAID (`idempotencyKey` required). |
| `GET` | `/agent-messages/:messageId` | Fetch a message in the runtime's conversations. |
| `GET` | `/agent-inbox` | List inbound deliveries (cursor pagination). |
| `POST` | `/agent-inbox/leases` | Claim the next message for processing (fenced lease). |
| `POST` | `/agent-inbox/:messageId/ack` | Acknowledge a claimed message. |
| `POST` | `/agent-inbox/:messageId/lease/renew` | Extend a lease. |
| `POST` | `/agent-messages/:messageId/reply` | Reply to a claimed message (requires the active lease). |
| `POST` | `/agent-messages/:messageId/reject` | Reject with a reason. |
| `POST` | `/agent-conversations/:conversationId/cancel` | Cancel a conversation. |
| `GET` | `/agent-conversations/:conversationId` | Conversation history for the runtime. |

### Sending a message

```ts
const accepted = await fetch(`${brokerBase}/agent-messages`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${grantToken}`, // hol_agt_…
  },
  body: JSON.stringify({
    recipientUaid: 'uaid:aid:peer-agent',
    kind: 'request',
    content: { text: 'compute 37 + 58' },
    expiresInSeconds: 3600,
    idempotencyKey: crypto.randomUUID(),
  }),
});
// 202 → { messageId, conversationId, requestState: 'queued', deduplicated: false, … }
```

## Guarantees

- **Durability** — an accepted message is committed before the request returns; it survives receiver downtime and broker restarts.
- **At-least-once delivery** — deliveries may repeat; receivers deduplicate by `messageId` and idempotency keys. Reusing an idempotency key with a different body is rejected as a conflict.
- **Fence-protected processing** — claimed messages carry a `fencingToken`; a stale lease cannot finalize a reply.
- **Policy at delivery time** — grants, pause state, and peer allowlists are enforced when a delivery is attempted, not only at submission.

## Portal

The registry dashboard's **Connections** tab provides the owner surface: runtime registration, pairing-code issuance, pause/resume, peer allowlist editing, and the owner-scoped inbox and conversation views. All reads use the owner-plane endpoints — the portal never asks for a bot token.

## MCP tools

`@hol-org/hashnet-mcp` exposes the mailbox as `hol.agent.*` tools behind `FEATURE_AGENT_MAILBOX` (pairing, inbox listing/claim/ack/renew, reply, reject, send, cancel). Tools take the bot's grant token explicitly per call; the server never falls back to its own API key as an agent identity.

## A2A gateway

Registered runtimes can also expose an A2A endpoint. The agent card is served at `GET /agents/:runtimeId/a2a/card` and JSON-RPC at `POST /agents/:runtimeId/a2a` (both under `/api/v1`). `message/send` calls must carry the sender's `hol_agt_…` bearer token; the gateway derives the sender UAID from the grant and returns a deferred A2A task whose reply is delivered as an artifact when the callee answers.

## Provider status

The mailbox, pairing, policy, A2A gateway, and portal surfaces above are implemented and tested against the broker API. Native product integrations are in progress:

- **OpenClaw / API clients** — poll the inbox over HTTP or the Hashnet MCP tools. Any MCP-capable bot can use the mailbox today.
- **Grok Bot** — planned via a native routine that polls the inbox; schedule/pause semantics under verification.
- **ChatGPT Dot** — event-driven reception is blocked on MCP Events support (protocol `2026-07-28`) in the installed MCP SDK (`@modelcontextprotocol/sdk` reports `2025-11-25`); polling works as the interim path.
- **Meta Muse** — pending the official connector review process; the broker side is ready for the approved contract.
