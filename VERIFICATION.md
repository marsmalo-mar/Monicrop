# Migration verification

Verified locally on 2026-10-03 using Node 24.20, the production Next.js server, and the existing XAMPP MySQL/MariaDB database.

- Production build and TypeScript checks passed.
- Six unit tests passed for password hashing, mutation origins, date validation, registration roles, conditional care-log fields, and profile role boundaries.
- Actual HTTP/MySQL integration checks passed for authentication, crop/log CRUD, consultant credentials and conversations, administrator CRUD, password changes/session revocation, private media access, and unauthorized/invalid requests.
- Existing plaintext-password login was verified with a disposable fixture: login added a secure hash without changing its legacy password row.
- Browser checks passed for farmer crop creation, care-log saves, profile saves, consultation messages, consultant replies, administrator account edits, and sign-out. Pagination and the 390px mobile layout were checked.
- The final production browser pass produced no console warnings or errors.
- All temporary database fixtures were removed. Original counts remain **4 users, 1 crop, 1 care log, and 5 consultation messages**. Original records were not edited.
- The database health endpoint reports connected. Original PHP files and the SQL dump are retained.

## Public repository and local demo verification

Verified on 2026-10-03 after preparing the GitHub source files:

- Git was initialized on `main`; no commits or remote pushes were made.
- Actual Git ignore checks exclude the original SQL dump, private photos, environment files, generated artifacts, and local PHP rollback. The clean schema, safe example templates, public logo, and fictional preview remain eligible.
- `repo:check` scans both tracked files and untracked publication candidates. The scan passes without printing private values. This targeted check does not guarantee detection of every secret or inspect remote history.
- Ten unit tests pass, including demo destination guards, schema privacy, blocked publication paths, credential patterns, and empty credentials in example templates.
- A source-only copy of the Git publication candidates installed cleanly with `npm ci` using cached packages and dependency scripts disabled. Its production build and real HTTP/MySQL demo integration checks passed without the private dump or photo folders.
- Demo setup created an isolated `monicrop_demo` database with 3 fictional accounts, 3 crops, 3 care logs, and 2 messages. Repeated setup preserved records. Actual commands refused the regular database and an unrecognized nonempty demo database.
- Browser sign-in displayed only fictional crops and the fictional farmer. The console was clean. `docs/demo-preview.jpg` contains fictional data and is suitable for the README.
- The original database remains at 4 users, 1 crop, 1 care log, and 5 messages. The online npm production dependency audit reported no known vulnerabilities.

The nested source-only test copy produced a Next.js multiple-lockfile warning because it sat inside the original project; its build and runtime passed. A standalone Git clone has its own project root. The existing lint advisory and development dependency advisory remain documented in README. Public hosting was not requested or performed.

## Legacy folder consolidation

Verified on 2026-10-03:

- Moved 47 root PHP files, supporting folders/styles/logo, original photos, and the private SQL dump into `legacy/`. All 96 original files were verified unchanged by SHA256. Added a local rollback README.
- No PHP files remain at the project root. The public `database/` folder contains only `schema.sql`; new uploads remain at the root.
- Git ignores the complete legacy folder, and the repository checker rejects its files even if they are accidentally tracked.
- The protected media API resolves unchanged `profile/` and `pics/` DB paths into the relocated folders. Actual HTTP tests passed for owned images and rejected unrelated users for both folders.
- All 48 PHP files passed syntax checks. Apache returned HTTP 200 for the legacy landing page, login page, stylesheet, main CSS asset, and logo at `/monicrop/legacy/`.
- The Next.js production build, ten unit tests, and full demo integration checks passed. Lint has the previously documented single TanStack advisory.
- Original database records were not rewritten; the regular app and demo were restarted after rebuilding.

`npm audit --omit=dev` reported no known vulnerabilities. Lint completed with no errors and one TanStack Table v8 compatibility advisory; React Compiler is disabled. The remaining development dependency advisory and its review date are documented in [README.md](README.md). Generated motion was audited; separate tuning remains proposed in [MOTION-REVIEW.md](MOTION-REVIEW.md).

The screenshot in `test-results/migrated-workspace.jpg` shows the verified UI with temporary records, which have since been removed. Verification covers the local environment; public hosting was not part of this migration.
