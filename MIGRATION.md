# Stack migration specification

## Objective and scope

Replace the active PHP UI and handlers with Next.js 16, React 19, Tailwind CSS 4, Base UI/shadcn, and TanStack Table. Retain XAMPP MySQL and existing records. Node serves the app; Apache is only needed for the retained legacy app/phpMyAdmin.

## Capability map and build order

1. Foundation: package/configuration, DB pool, additive setup, sessions, role checks, validation.
2. Farmer workspace (depends on foundation): crop CRUD, care log CRUD including images and all existing fields.
3. Consultations (depends on foundation): consultant directory, conversation messages, image attachments, unread/read status; use consultant primary key rather than assume it equals user ID.
4. Accounts/profile (depends on foundation): registration as farmer, admin CRUD, profile/credentials editing and password changes.
5. Verification/documentation: unit boundary tests, temporary-data integration checks, browser workflows, production build.

## Data and security contract

- Preserve all legacy tables and rows. Setup imports definitions from the public `database/schema.sql` on a new empty database. The original data dump is local-only and ignored by Git.
- Add `monicrop_auth` and `monicrop_sessions` for scrypt password hashes and revocable, hashed session tokens. Legacy passwords remain for rollback; a successful legacy login adds a secure hash without changing the legacy row. New accounts store an unusable placeholder in the legacy password field.
- Parameterize queries; validate all inputs; enforce ownership and role at the server; reject cross-origin mutations. Only admins can create elevated roles. Prevent self-deletion/demotion and preserve the last administrator.
- Local JPEG/PNG/WebP uploads are validated, decoded, resized, and served only to permitted owners/conversation participants.
- DB errors are explicit; never substitute pretend data. Existing photos resolve through protected asset routes.

## Acceptance criteria

- Requested major framework versions are installed and used; reusable primitives come from the Base UI shadcn registry. TanStack Table 8 is explicitly pinned to match its documented API.
- Existing farmer, consultant, and admin workflows persist to MySQL and survive reload. No password hashes/legacy passwords are exposed by APIs.
- Unauthorized resource access, role escalation, invalid inputs, and cross-origin writes are rejected.
- Typecheck, lint, unit/integration checks, build, and desktop/mobile browser checks pass. Any environment limitation is recorded honestly.

## Boundaries and rollback

Proceed with reversible source edits, local setup, and temporary test data. Never delete existing records, replace the database, or expose the app publicly. PHP files and their supporting folders are preserved under `legacy/`; rollback uses Apache at `/monicrop/legacy/`. New accounts/password changes are only supported by Next.js; legacy password rows are not updated. After cutover, retire legacy access separately because it retains its original security limitations.

## Public source and local demo

The GitHub repository contains the Next.js source, clean schema, and fictional demo seeder. The original PHP implementation, data dump, and photos stay on the development computer and are excluded from Git. A clone works without them. Demo commands are restricted to the loopback `monicrop_demo` database and app port 3001. Seeding runs only on empty tables or recognizes its own existing seed marker; it never replaces existing records. Public hosting is outside this local demo's scope.

The original files are consolidated in `legacy/`, including `legacy/database/monicrop.sql`. The public `database/schema.sql`, new `uploads/`, and current Next.js source stay at the project root. Existing database paths such as `profile/photo.jpg` and `pics/crop.jpg` resolve to the relocated folders through the authorized media service; no stored record paths were rewritten.
