# Monicrop

Monicrop lets farmers maintain crop records and care logs and seek agricultural advice. Consultants manage their credentials and conversations; administrators manage accounts.

This migration preserves the existing roles, MySQL tables, record identifiers, profile fields, and locally stored images. Next.js Route Handlers replace PHP handlers. XAMPP continues to provide MySQL/MariaDB; Node.js serves the new app on port 3000.

Assumption: stack replacement covers the current application's workflows, without introducing additional farm features or changing its forest-green identity. The original PHP source remains available for rollback.
