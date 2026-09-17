# Optional Backend Contract

Lumen Loop runs completely local by default. Set `LUMEN_CONFIG.service.apiBase` only when an authenticated service is available.

## Authentication
Use secure same-site session cookies or a short-lived platform token. Do not embed long-lived secrets in the web bundle.

## PUT /v1/save
Request:
```json
{
  "pilotId": "pilot_abcd...",
  "clientVersion": 3,
  "save": { "...": "client save payload" }
}
```

The server should authenticate the account, validate schema/version, reject impossible economy deltas when authoritative mode is enabled, store a server revision, and return a server timestamp/revision.

Recommended response:
```json
{ "ok": true, "revision": 42, "serverTime": 1789610000000 }
```

## GET /v1/save?pilotId=...
Return the authenticated player's latest validated save plus revision. Resolve conflicts by server revision/time, not browser clock alone.

## GET /v1/leaderboard/:board
Recommended response:
```json
{
  "entries": [
    { "rank": 1, "displayName": "Pilot", "score": 1234567 }
  ]
}
```

Do not accept a raw browser score as authoritative for ranked boards. Recompute/validate from trusted server events or signed transaction/economy records.

## Purchases / premium season
Before selling premium passes or durable goods, add server-side receipt verification and account entitlements. The client should render entitlements received from the server rather than deciding ownership locally.
