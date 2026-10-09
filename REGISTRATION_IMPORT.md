# Spreadsheet registration and team accounts

In **Create Tournament**, save an upcoming team-only tournament with its capacity and format, then use **Import team registrations** below the form. CSV snapshots and explicitly selected private Google spreadsheets use the same column-mapping and review workflow. Maximum snapshot: 5 MB, 1,000 teams and 200 columns.

Map team name, captain name and delivery email. A team-contact column can provide fallback recipients. Manager name is optional: no name means no manager account. Manager recipients may share the captain's address. Only the mapped fields are retained; roster columns do not create players.

Review each registration before confirming. New teams receive separate `team-name-captain` and optional `team-name-manager` login IDs, with collision suffixes. These are usernames, not fabricated email addresses. Existing names require an explicit **Link** decision; linking preserves the team, captain, manager and passwords. Invalid/duplicate rows must be skipped or corrected. Exact repeat registrations are idempotent. Imports commit up to 25 rows per request in individual MongoDB transactions; the UI continues batches and **Resume a previous import** recovers interrupted work.

Temporary passwords are generated with crypto, hashed with bcrypt, and stored separately as AES-256-GCM encrypted copies for seven days. The batch owner can download a private, formula-escaped CSV during that period. Never commit that download. On first login, the API denies member requests until the password changes; changing it deletes the temporary copy and revokes earlier tokens. Managers are assigned explicitly and do not consume a roster slot.

## Setup before enabling imports

1. Set a stable `INTEGRATION_ENCRYPTION_KEY` on the API: a base64-encoded 32-byte random key. See `backend/.env.example`. Keep it backed up privately and out of Git. CSV provisioning also requires it.
2. Existing installations need the partial email index because provisioned users have a username and contact address instead of a unique login email. In a maintenance window, back up the database and run `node scripts/migrate-email-index.js` from `backend`. The script checks duplicates, replaces only the email index, and preserves every user record. Imports report a setup error until the migration is complete. Do not use `syncIndexes()` against production.
3. MongoDB must support transactions (Atlas does). Install production dependencies with `npm ci --omit=dev`; `csv-parse` is the one additional production dependency for proper CSV parsing.
4. Optional Google setup: enable Sheets API, Google Picker API and Gmail API in your Cloud project; create a Web OAuth client with `GOOGLE_REDIRECT_URI` ending `/api/google/callback`; configure the frontend origin. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_PICKER_API_KEY`, and `GOOGLE_CLOUD_PROJECT_NUMBER`. Restrict the browser API key to your frontend origins and Picker API. Add authorized test users while the OAuth consent app is in testing; complete Google's consent/verification requirements before broader use.
5. Connect Sheets and Gmail separately from the import panel. Sheets requests `drive.file` access through Picker to files the admin explicitly selects; it does not require public sharing. Gmail requests `gmail.send`, plus identity scopes, and uses the verified connected mailbox as sender. Refresh tokens stay encrypted on the server. A short-lived per-file access token is used in Picker only.

The durable email outbox runs inside the API every 30 seconds and after imports; no paid worker is required. Without a sender connection, rows remain pending and CSV downloads still work. Gmail limits and consent expiry can cause failed sends; reconnect and explicitly retry. Interrupted sends are marked **unknown** rather than silently retried to avoid duplicate emails. Expired copies cannot be recovered; bcrypt hashes remain valid for passwords already delivered. Google APIs have mocked integration coverage; live OAuth consent and actual email delivery need your configured account.

## Bracket randomization

The existing **Bracket** button uses the tournament's format and one cryptographic Fisher–Yates shuffle, storing participants, stable match IDs and feeder references. Elimination brackets bypass structural byes and omit empty matches: nine teams produce a play-in followed by four quarterfinals, two semifinals and a final, without padding the display to sixteen teams. Pending real matches never auto-advance a team. Double elimination has winners/losers rounds and a conditional grand-final reset. Round robin uses a circle schedule with each pair playing once; equal wins share a standing rank. Final reset and pending matches do not permit veto or result actions until resolved.

Generate after imports. Regeneration is allowed only before any recorded results or current veto sessions. **Clear unplayed bracket** retains registrations and permits another import. Existing historical brackets stay intact. Graph-based result updates refuse to change opponents who already have a result or veto session.

Checks: `cd backend; npm test`; `cd frontend; npm test -- --watchAll=false --runInBand`; `npm run build`. API integration tests use an isolated in-memory replica set and synthetic accounts, never the configured Atlas database.
