---
'guard-service': patch
---

Return an event's valid commitments in a deterministic order (creation height, then box id) so all guards build the same Ergo permit and reward order regardless of database storage order, and the earliest commitment wins when a WID has duplicates
