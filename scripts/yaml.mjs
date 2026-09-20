// Dependency-free YAML subset parser for recipes:
// nested maps by indent, `- item` lists, inline [a, b], integers, quotes, # comments.
export function parseYaml(text) {
  const lines = text.split("\n");
  const root = {};
  const stack = [{ indent: -1, target: root, key: null }];
  const listCtx = [];

  function currentList(itemIndent) {
    for (let i = listCtx.length - 1; i >= 0; i -= 1) {
      if (listCtx[i].keyIndent < itemIndent) return listCtx[i].list;
    }
    return null;
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.match(/^\s*/)[0].length;
    const trimmed = line.trim();
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].target;

    if (trimmed.startsWith("- ")) {
      const list = currentList(indent);
      if (!list) throw new Error(`List item without a list key: ${trimmed}`);
      list.push(parseScalar(trimmed.slice(2).trim()));
      continue;
    }
    const match = /^([^:]+):\s*(.*)$/.exec(trimmed);
    if (!match) throw new Error(`Unparseable line: ${trimmed}`);
    const key = match[1].trim();
    const raw = match[2].trim();
    for (let i = listCtx.length - 1; i >= 0; i -= 1) {
      if (listCtx[i].keyIndent >= indent) listCtx.splice(i, 1);
    }
    if (!raw) {
      const next = linesAfter(lines, rawLine);
      const childIsList = next && next.trim().startsWith("- ");
      if (childIsList) {
        parent[key] = [];
        listCtx.push({ keyIndent: indent, list: parent[key] });
      } else {
        parent[key] = {};
        stack.push({ indent, target: parent[key], key });
      }
    } else {
      parent[key] = parseScalar(raw);
    }
  }
  return root;
}

function linesAfter(all, current) {
  const idx = all.indexOf(current);
  for (let i = idx + 1; i < all.length; i += 1) {
    if (all[i].trim() && !all[i].trim().startsWith("#")) return all[i];
  }
  return null;
}

function parseScalar(raw) {
  if (raw.startsWith("[") && raw.endsWith("]")) {
    return raw
      .slice(1, -1)
      .split(",")
      .map((p) => p.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw;
}
