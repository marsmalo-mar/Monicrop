# Transitions review

Migration scope: preserve the original PHP styles; audit the active Next.js primitives only. Reduced-motion support is active globally.

Proposed changes, pending user confirmation before a `transitions polish` pass:

1. `src/components/ui/dialog.tsx`: backdrop and popup use a symmetric 100ms duration. Modal opening should use `--duration-fast` (250ms), closing `--duration-quick` (150ms), with `--ease-smooth-out`. Popup scale 0.95 should use `--scale-large` (0.96).
2. `src/components/ui/select.tsx`: dropdown uses a symmetric 100ms duration. Opening should use 250ms and scale 0.97; closing 150ms and scale 0.99, with `--ease-smooth-out`. The 8px travel already fits the base distance token. No delayed close.

Generic color transitions do not match a surface-motion token and stay untouched. No list staggers or new decorative effects were added. This report does not edit motion values; the named skill requires confirmation before that separate refinement.
