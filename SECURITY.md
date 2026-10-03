# Security and public source

This repository is prepared for public source access and an editable **local** demo. Demo accounts and their documented password are deliberately public, contain fictional data, and must not be used for real accounts or a shared internet-facing instance.

The demo scripts require `monicrop_demo`, a loopback database host, and `http://127.0.0.1:3001`. The standard Next.js commands also bind to loopback. GitHub Pages cannot run this Node.js/MySQL application; publishing source does not deploy it.

Private exports, environment files, photos, uploads, test artifacts, key files, and the entire `legacy/` PHP rollback folder are ignored. `database/schema.sql` contains definitions only. Run `npm run repo:check` and review `git diff --cached` before publishing. The checker includes tracked files, so an ignore rule cannot silently hide a file already added to Git. Do not paste passwords, personal records, or tokens into issues or screenshots.

If a real credential has already been published, revoke or rotate it first. Removing the file or adding an ignore rule does not remove it from old commits or copies. Follow [GitHub's sensitive-data removal guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

Known dependency/tooling advisories and their review date are recorded in [README.md](README.md). This local demo has not been approved for public hosting. Any later hosted version needs isolated fictional data, restricted shared accounts, HTTPS, production credentials, operational limits, and a reset/retention design.
