# Revival notes — 2026-10-09

## Repository and local work

The checkout was fast-forwarded from `4e9f294` to the requested repository's `main` at `a01a8fb`.
`origin` now points to `https://github.com/Tousifrahmananto/AFK_PRODUCTIONS.git`.
The previous remote remains named `legacy`.
Pre-existing uncommitted edits and untracked files are preserved in the Git stash named
`pre-revival local snapshot 2026-10-09`. They were not reapplied over the newer GitHub code.
Use `git stash show --include-untracked --stat 'stash@{0}'` to inspect that snapshot.
Do not blindly apply it: many of those edits overlap the updated repository.

## Environment and startup

The existing `backend/.env` was preserved and is ignored by Git.
`MONGO_URI`, `PORT`, and `JWT_SECRET` are populated; values were not printed or copied into tracked files.
No frontend environment file was found. Local API defaults are available without one.
Initially, the configured Atlas hostname failed startup with `querySrv ECONNREFUSED`;
public DNS resolvers returned `ENOTFOUND` while the cluster was paused.
After the cluster resumed and the supplied URI was saved to the ignored `.env`,
the backend connected successfully. The URI uses database `test`, matching the previous configuration.
Read-only checks found 65 users, 6 tournaments, 9 teams, and 6 media records.
This machine's DNS resolver (`127.0.0.1`) still refuses SRV lookups;
the running backend uses public DNS for this process only. System DNS settings were not changed.
To restart locally with that workaround, run from `backend`:

```powershell
node -e 'require("node:dns").setServers(["1.1.1.1","8.8.8.8"]); require("./server.js");'
```
No database migration, reset, seed, or production data write was performed.

Start the API with `npm start` or `npm run dev` from `backend`.
Start the frontend with `npm start` from `frontend`.
The API loads its `.env` relative to `server.js`, so launching from another directory also works.
The example environment files contain placeholders only.

## Fixed in this pass

- Backend lacked the documented startup scripts and depended on root-level authentication packages.
- Frontend declared `react-scripts` version `0.0.0`; existing root dependencies masked the broken setup.
- Its clean install also selected an incompatible TypeScript peer; TypeScript is pinned to the build tool's supported 4.9.5 version.
- The same frontend API variable meant different things for HTTP calls and sockets; `/api` could be duplicated.
- Media and ads did not honor the common API variable, and the player page hardcoded localhost.
- Login returned the password hash and did not honor the legacy `banned` flag.
- Protected requests trusted outdated role claims and allowed already-issued tokens after a ban or user deletion.
- Corrupt stored session JSON crashed authentication; logout erased unrelated local settings.
- Admin guards rendered children before a user loaded, and several admin pages had no route guard.
- The notifications page had no route and imported a nonexistent service function.
- Login hid API error messages because it only handled Axios errors although its service uses `fetch`.
- Refreshing a profile kept an initial logged-out error after the stored session loaded; the error is now cleared when a token becomes available.

## Remaining issues observed

- Socket notification rooms now use a server-verified JWT identity and reject banned or deleted accounts at connection time.
- The media list falls back to listing uploaded files when its database query has no matches. This ignores metadata visibility and search filters; static upload URLs are also public.
- Bracket bye promotion treats an unresolved feeder as a bye in later rounds. Editing an existing result does not replace an already-populated next-round slot.
- Moderation combines search and banned filters in the same `$or`, so searching with the banned-only filter can include unbanned users.
- Existing React hook dependency warnings remain. These need individual behavior checks, not a blanket lint rewrite.

Backend regression tests mock user queries; they do not verify database connectivity.
Frontend regression tests cover URL configuration, session recovery, logout, and admin guards.
Live API checks passed for registration, required fields, duplicate signup, bcrypt storage,
wrong passwords, successful login without a password hash, protected profile access,
missing tokens, and rejection of public Admin signup and Player access to admin endpoints.
Browser checks passed for signup redirect, incorrect-password feedback, login to profile,
session persistence on refresh, and logout clearing the session.
Both temporary accounts were removed; the database returned to 65 users.
Tournament mutations, upload, and notification flows still require live verification.

Validation: both `npm ci --ignore-scripts --no-audit --no-fund` installs succeeded;
6 backend and 11 frontend regression tests passed. The production frontend build passed with existing lint warnings in the earlier revival pass.
The backend loaded `.env` when launched from the repository root; after Atlas resumed,
database ping, `/api/health`, and the public tournament list succeeded with the local DNS workaround.

## Frontend deployment

The frontend was deployed from the local `frontend` directory to Vercel production on 2026-10-09.

- Project: `afk-productions-frontend` in `tousifrahmanantos-projects` (Hobby).
- Public URL: https://afk-productions-frontend.vercel.app
- Deployment: `dpl_6rJeMgzWfmqbJF61EMyLnSuBAdyv`, status `READY`; remote build duration 1m 51s.
- Configuration: `frontend/vercel.json`; React routing rewrites serve `/index.html` on direct page requests.
- The `/`, `/dashboard`, `/login`, and `/register` URLs and main JavaScript asset returned HTTP 200.
- `frontend/.vercelignore` excludes local environment files from deployment uploads; backend files were outside the deployment directory.
- Deployment uses local source, including uncommitted fixes. GitHub automatic deployment is not connected.
- Public authentication and database features await a hosted backend and `REACT_APP_API_URL` set to its HTTPS URL, followed by a frontend redeploy.
- Existing lint warnings remain; `CI=false` permits warnings while compilation errors still fail the build.
- Remote install reported dependency audit findings; their impact has not been assessed and no automatic audit upgrades were applied.
- The post-deploy error-level runtime log query returned no logs; that is not proof of functioning API calls.

The requested https://vercel.com/get-started.md guide was fetched and followed:
Vercel CLI 63.1.0 is installed globally and authenticated as `tousifrahmananto`;
the Vercel plugin is installed for Codex at user scope; the shared `https://mcp.vercel.com`
MCP entry is enabled in `C:/Users/taush/.codex/config.toml` and OAuth login succeeded.
The currently running chat does not expose the newly added MCP server or tools.
A chat reload is needed to verify `search_vercel_documentation` and authenticated `list_teams`;
these tool checks have not been performed. Existing unrelated MCP configuration was preserved.
