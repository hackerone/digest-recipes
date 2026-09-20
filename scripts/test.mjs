// npm test — fixture presence + parse checks. Live extraction is verified
// via the Digest extension's Developer → test-extract preview (real DOM).
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const recipesDir = join(root, "recipes");

for (const dir of readdirSync(recipesDir, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const base = join(recipesDir, dir.name);
  if (!existsSync(join(base, "recipe.yaml"))) {
    errors.push(`${dir.name}: missing recipe.yaml`);
    continue;
  }
  const fixtures = join(base, "fixtures");
  const expected = join(base, "expected");
  if (!existsSync(fixtures) || readdirSync(fixtures).length === 0) {
    errors.push(`${dir.name}: no fixtures (add a minimal hand-crafted sample, never real data)`);
  }
  if (!existsSync(expected) || readdirSync(expected).length === 0) {
    errors.push(`${dir.name}: no expected outputs`);
    continue;
  }
  for (const file of readdirSync(expected)) {
    try {
      const parsed = JSON.parse(readFileSync(join(expected, file), "utf8"));
      if (typeof parsed.items !== "number") errors.push(`${dir.name}/expected/${file}: needs an 'items' count`);
    } catch (err) {
      errors.push(`${dir.name}/expected/${file} unreadable: ${err.message}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.map((e) => `  ✖ ${e}`).join("\n"));
  process.exit(1);
}
console.log("test: ok");
