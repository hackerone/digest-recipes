// npm run validate — registry + recipe structure checks. Fails non-zero with reasons.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseYaml } from "./yaml.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = (msg) => errors.push(msg);

const FETCH_MODES = new Set(["dom", "tab-json", "tab-dom"]);
const FIELD_NAMES = new Set(["item", "id", "title", "url", "author", "timestamp", "body", "image"]);
// Frozen action vocabulary. Recipes may change selectors, never names.
// Must match RECIPE_ACTION_NAMES in apps/digest/src/types.ts.
const ACTION_NAMES = new Set([
  "open",
  "like",
  "dislike",
  "upvote",
  "downvote",
  "reply",
  "send",
  "archive",
  "star",
  "mark-read",
  "mark-unread",
]);

function checkActionRule(rule, where) {
  if (!rule || typeof rule !== "object") {
    fail(`${where}: must be an object with a selector`);
    return;
  }
  if (typeof rule.selector !== "string" || !rule.selector) {
    fail(`${where}: needs a selector`);
  }
  for (const k of Object.keys(rule)) {
    if (!["selector", "kind", "composer", "submit", "confirm"].includes(k)) {
      fail(`${where}: unknown action key '${k}'`);
    }
  }
  if (rule.kind !== undefined && rule.kind !== "toggle" && rule.kind !== "composer") {
    fail(`${where}: unknown kind '${rule.kind}'`);
  }
  if (rule.kind === "composer" && typeof rule.composer !== "string") {
    fail(`${where}: composer actions need a composer selector`);
  }
}

function checkActionMap(map, where) {
  for (const [name, rule] of Object.entries(map)) {
    if (!ACTION_NAMES.has(name)) {
      fail(`${where}: unknown action '${name}' (frozen vocabulary)`);
      continue;
    }
    checkActionRule(rule, `${where}.${name}`);
  }
}

function checkField(value, where) {
  if (typeof value === "string") return;
  if (value && typeof value === "object") {
    for (const k of Object.keys(value)) {
      if (!["selector", "attribute", "value"].includes(k)) fail(`${where}: unknown field key '${k}'`);
    }
    return;
  }
  fail(`${where}: must be a selector string or { selector, attribute?, value? }`);
}

function checkRecipe(recipe, source) {
  if (typeof recipe.id !== "string" || !/^[a-z0-9-]+$/.test(recipe.id)) fail(`${source}: bad id`);
  if (!Number.isInteger(recipe.version) || recipe.version < 1) fail(`${source}: bad version`);
  if (!Array.isArray(recipe.matches) || recipe.matches.length === 0) fail(`${source}: matches must be a non-empty list`);
  for (const m of recipe.matches ?? []) {
    if (typeof m !== "string" || !/^https?:\/\/\S+$/.test(m)) fail(`${source}: bad match '${m}'`);
  }
  if (recipe.fetchMode !== undefined && !FETCH_MODES.has(recipe.fetchMode)) {
    fail(`${source}: unknown fetchMode '${recipe.fetchMode}'`);
  }
  const content = recipe.content;
  if (!content || typeof content !== "object" || typeof content.item !== "string" || !content.item) {
    fail(`${source}: content.item is required`);
    return;
  }
  for (const k of Object.keys(content)) {
    if (!FIELD_NAMES.has(k)) fail(`${source}: unknown content field '${k}' (frozen vocabulary)`);
  }
  for (const [k, v] of Object.entries(content)) {
    if (k !== "item") checkField(v, `${source}: content.${k}`);
  }
  if (recipe.comments !== undefined) {
    if (typeof recipe.comments.container !== "string" || !recipe.comments.container) {
      fail(`${source}: comments.container is required`);
    }
    for (const [k, v] of Object.entries(recipe.comments)) {
      if (k !== "container") checkField(v, `${source}: comments.${k}`);
    }
  }
  if (recipe.siteIcon !== undefined) checkField(recipe.siteIcon, `${source}: siteIcon`);
  if (recipe.actions !== undefined) {
    if (typeof recipe.actions !== "object") fail(`${source}: actions must be an object`);
    else checkActionMap(recipe.actions, `${source}: actions`);
  }
  if (recipe.commentActions !== undefined) {
    if (typeof recipe.commentActions !== "object") fail(`${source}: commentActions must be an object`);
    else checkActionMap(recipe.commentActions, `${source}: commentActions`);
  }
}

// Registry index
let registry;
try {
  registry = JSON.parse(readFileSync(join(root, "registry.json"), "utf8"));
} catch (err) {
  fail(`registry.json unreadable: ${err.message}`);
}
if (!Array.isArray(registry)) {
  fail("registry.json must be an array");
} else {
  const ids = new Set();
  for (const entry of registry) {
    if (typeof entry?.id !== "string" || typeof entry?.version !== "number" || !Array.isArray(entry?.matches)) {
      fail(`registry entry malformed: ${JSON.stringify(entry)}`);
      continue;
    }
    if (ids.has(entry.id)) fail(`duplicate registry id '${entry.id}'`);
    ids.add(entry.id);
    const dir = join(root, "recipes", entry.id, "recipe.yaml");
    if (!existsSync(dir)) {
      fail(`registry id '${entry.id}' has no recipes/${entry.id}/recipe.yaml`);
      continue;
    }
    let recipe;
    try {
      recipe = parseYaml(readFileSync(dir, "utf8"));
    } catch (err) {
      fail(`${entry.id}/recipe.yaml unparseable: ${err.message}`);
      continue;
    }
    if (recipe.id !== entry.id) fail(`${entry.id}: recipe id '${recipe.id}' mismatches registry`);
    if (recipe.version !== entry.version) fail(`${entry.id}: recipe version ${recipe.version} mismatches registry ${entry.version}`);
    checkRecipe(recipe, entry.id);
  }
  // Orphan recipe dirs
  for (const dir of readdirSync(join(root, "recipes"), { withFileTypes: true })) {
    if (dir.isDirectory() && !ids.has(dir.name)) fail(`orphan recipe dir '${dir.name}' missing from registry.json`);
  }
}

if (errors.length > 0) {
  console.error(errors.map((e) => `  ✖ ${e}`).join("\n"));
  process.exit(1);
}
console.log("validate: ok");
