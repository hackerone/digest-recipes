# AGENTS.md — contributing recipes

## The one rule

**Selectors may change; field and action names are frozen.** The extension's TypeScript engine binds to names (`item`, `title`, `url`, `author`, `body`, `archive`, `send`, …). You may fix a broken selector; you may not rename a field or invent a new action without an extension-side change.

Frozen action vocabulary: `open`, `like`, `dislike`, `upvote`, `downvote`, `reply`, `send`, `archive`, `star`, `mark-read`, `mark-unread`. Action rules take `kind` (`toggle` for one-click actions, `composer` for text actions needing `composer` + `submit` selectors and usually `confirm: true`). Comment-level selectors live under `commentActions` and fall back to `actions` when absent. Must match `RECIPE_ACTION_NAMES` in `apps/digest/src/types.ts`.

## Add or fix a recipe

1. Copy `recipes/generic-article/` as a template, or edit the existing `recipes/<id>/recipe.yaml`.
2. Keep `id` stable (`[a-z0-9-]+`). Bump `version` on any behavior change. Keep `matches` to `https?://` globs.
3. Add/update a minimal hand-crafted fixture in `fixtures/` mirroring the site's structure. **Never commit real mailbox dumps, auth tokens, or personal data.**
4. Add/update `expected/` JSON describing what the fixture should extract.
5. Run `npm run validate && npm test` — both must pass.
6. Test live: Digest Settings → Developer → connect this checkout → Rescan → per-source preview against the real site → confirm the feed syncs.
7. Open a PR. CI runs the same two commands; failing fixtures block merge.

## `fetchMode`

- `dom` — static pages, selector extraction.
- `tab-json` — background-tab JSON pipeline (Reddit): selectors are documentary; the engine maps JSON.
- `tab-dom` — JS-heavy logged-in pages (Gmail): selectors run in-page after settle.

## Gmail notes

Gmail's DOM is obfuscated and drifts. Prefer ARIA/role selectors and `data-legacy-thread-id` over generated class names. The send/archive executors resolve the `actions` vocabulary by name — keep every name in `recipes/gmail/recipe.yaml` in sync with the extension's Gmail engine.
