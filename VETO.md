# Match map veto

Enable **Match map veto** in Create Tournament/Edit for a team-only Valorant or CS2 tournament. Choose an odd pool of seven or more maps and the default BO1/BO3/BO5. The dated preset is a convenience: tournament selections and active sessions never change automatically when a game rotates its maps.

Open **Map veto** on a bracket match with two resolved teams. Captains and explicitly assigned TeamManagers can act; their roster can observe. Other teams, including other teams in the same tournament, cannot enter. Admins can assign an existing TeamManager by username in the room, override the format before readiness, or intervene with a mandatory reason. Managers do not take a playing roster slot.

Both representatives join and confirm readiness. The server records one random heads/tails result. The winner chooses ban first (T1) or side first (T2). Larger pools alternate extra bans until seven maps remain.

| Format | Seven-map sequence |
| --- | --- |
| BO1 | T1/T2 alternate six bans; remaining map is the decider |
| BO3 | T1 ban, T2 ban, T1 pick, T2 pick, T1 ban, T2 ban, decider |
| BO5 | T1 ban, T2 ban, T1 pick, T2 pick, T1 pick, T2 pick, decider |

After maps are settled, the opponent of each picker chooses the starting side. T2 chooses the decider. Valorant uses Attack/Defense; CS2 uses T/CT. Reloads and reconnects preserve accepted actions. There are no turn deadlines or automatic forfeits.

Admins can archive/reset a veto before a match result, with a reason; archived history is retained. Veto-enabled matches require completed sides before recording a winner. Bracket regeneration, downstream opponent changes, and tournament deletion are protected against invalidating veto sessions/history.

## Runtime and checks

- Uses the existing Express/Socket.IO backend and MongoDB Atlas; no new production dependencies or paid services.
- MongoDB transactions require a replica set (Atlas already provides this). Existing single-instance local MongoDB needs a replica set to use veto writes.
- Active sessions have a unique `(tournament, matchId)` index. A partial unique team-manager index prevents assigning one manager to multiple teams.
- Presence uses five-second authenticated heartbeats with a fifteen-second lease; Socket.IO provides immediate updates, with polling recovery when sockets are unavailable.
- The current deployment has one backend instance. `shortcut: presence is process-local, add shared presence and a Socket.IO adapter before running multiple API instances`.
- Existing match IDs are assigned lazily when loading their bracket; teams and results are preserved.
- `cd backend; npm test` runs rules, HTTP/socket authorization, concurrency and transaction tests using an isolated in-memory replica set. First use may download a MongoDB test binary. Production installs omit these development dependencies.
- `cd frontend; npm test -- --watchAll=false --runInBand` and `npm run build` check the UI.

Map catalogue: `backend/utils/vetoRules.js`. Credentials and production environment values are not changed by this feature. Deploy the backend before the frontend when publishing these changes.

Spreadsheet registration and the three bracket generators are the following implementation phase; this feature does not silently rewrite existing brackets.
