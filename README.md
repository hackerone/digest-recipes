# digest-recipes

Community recipe registry for the [Digest](../wurkflo/apps/digest) Chrome extension. Recipes are **declarative extraction rules** (URL patterns + CSS selectors + field mappings). Executable logic (fetchers, tab orchestration, send/archive) lives in the extension; this repo holds no code that runs in the browser.

## Layout

```text
registry.json                  # index: id, version, matches, description
schemas/recipe.schema.json     # vocabulary contract (validated in CI + extension)
recipes/<id>/recipe.yaml       # the recipe
recipes/<id>/fixtures/*.html   # hand-crafted minimal samples (never real mailbox dumps)
recipes/<id>/expected/*.json   # expected extraction summaries for the fixtures
scripts/validate.mjs           # registry + schema + syntax checks
scripts/test.mjs               # fixture presence + parse checks
```

## Testing a checkout locally

In Digest Settings → Developer: **Connect local repo…** → pick this directory → **Rescan**. Sources bound to matching URLs will sync from your local files (badged `local`), with per-file errors shown inline. See `AGENTS.md` for the edit → rescan → preview → PR loop.
