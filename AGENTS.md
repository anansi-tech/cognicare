# Engineering principle

Engineer from first principles, then apply Occam's razor: identify the actual invariant the product must preserve and implement the smallest design that preserves it. Do not add abstraction, state, or workflow unless the requirement demands it.

# Standing rules

- **Scope guard is universal**: every API route that reads or writes client-linked data must enforce `visibleClientIds`/`clientScope` before loading context, calling models, or returning data — including when modifying pre-existing routes. Unauthorized = non-revealing 404. Enforced structurally by `src/app/api/scope-guard.test.js` (walks routes touching `clientId`, asserts the guard import); exemptions must be justified there.
- **LIAM statelessness**: all LIAM OpenAI calls (generation + rolling summary) set `store: false`. The server-owned `LiamThread` is the sole conversation history; model input = memory block + newest user message only, never resent browser messages.
- **LIAM memory integrity**: only successful, non-empty user/assistant exchanges persist to `LiamThread`; aborted/failed/empty generations never enter memory.
