---
'guard-service': major
---

Add trust key validation to all P2P routes and the TSS sign callback route. The trust key must be provided via the `Api-Key` request header (the same header used for API-key authentication) instead of the request body.
