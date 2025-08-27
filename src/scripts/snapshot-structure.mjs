#!/usr/bin/env node
// scripts/snapshot-structure.mjs
import fs from "fs";
import fsp from "fs/promises";
import path from "path";

const projectRoot = process.cwd();
const argv = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.split("=");
    return [k.replace(/^--/, ""), v ?? true];
  })
);

const SRC_ROOT = path.resolve(projectRoot, argv.root || "src");
const OUT_DIR  = path.resolve(projectRoot, argv.outDir || "docs");
const IGNORE_DIRS = new Set(
  (argv.ignore || "node_modules,.git,dist,build,coverage,.cache,.next,out,tmp")
    .split(",").map(s => s.trim()).filter(Boolean)
);

const LOCAL_IMPORT_RE = /import(?:["'\s]*([\w*{}\n, ]+)from\s*)?["']([^"']+)["'];?/g;
const EXPORT_RE       = /^export\s+default\s+(?:function\s+([A-Z]\w*)|\(?\s*[\w\s,={}]*\)?\s*=>)/m;
const COMPONENT_HINT  = /(from\s+['"]react['"]|<\w)/;

const tree = [];
const nodes = [];        // [{file, ext, size, imports:[...], exportsComponent:bool}]
const edges = [];        // [{from, to}]
const byDir = new Map();

function isIgnored(p) {
  const name = path.basename(p);
  return IGNORE_DIRS.has(name) || name.startsWith(".");
}

async function walk(dir, prefix = "") {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  entries.sort((a,b)=> a.name.localeCompare(b.name));
  const lastIdx = entries.length - 1;

  for (let i=0;i<entries.length;i++){
    const e = entries[i];
    if (isIgnored(e.name)) continue;
    const full = path.join(dir, e.name);
    const rel  = path.relative(SRC_ROOT, full);
    const isLast = i === lastIdx;

    tree.push(`${prefix}${isLast ? "└──" : "├──"} ${e.name}`);

    if (e.isDirectory()){
      await walk(full, `${prefix}${isLast ? "    " : "│   "}`);
    } else {
      const stat = await fsp.stat(full);
      const ext = path.extname(e.name).slice(1).toLowerCase();
      const content = await fsp.readFile(full, "utf8");
      const imports = [];
      let m;
      LOCAL_IMPORT_RE.lastIndex = 0;
      while ((m = LOCAL_IMPORT_RE.exec(content))) {
        const spec = m[2];
        if (spec.startsWith(".")) {
          const target = path.normalize(path.join(path.dirname(rel), spec));
          imports.push(target);
        }
      }
      // je li React komponenta koja se exporta defaultom?
      const exportsComponent =
        (/\.(j|t)sx?$/.test(ext ? "."+ext : "")) &&
        COMPONENT_HINT.test(content) &&
        EXPORT_RE.test(content);

      nodes.push({ file: rel, ext, size: stat.size, imports, exportsComponent });

      const dirKey = path.dirname(rel);
      if (!byDir.has(dirKey)) byDir.set(dirKey, []);
      byDir.get(dirKey).push(rel);

      imports.forEach(to => edges.push({ from: rel, to }));
    }
  }
}

function uniq(arr){ return [...new Set(arr)]; }
function cycles() {
  // jednostavna detekcija ciklusa (DFS)
  const graph = new Map();
  nodes.forEach(n => graph.set(n.file, []));
  edges.forEach(e => {
    if (graph.has(e.from)) graph.get(e.from).push(e.to);
  });

  const color = new Map(); // 0=white,1=gray,2=black
  const stack = [];
  const out = [];

  function dfs(u){
    color.set(u,1); stack.push(u);
    for (const v of (graph.get(u) || [])){
      if (!graph.has(v)) continue;
      const c = color.get(v) || 0;
      if (c===0) dfs(v);
      else if (c===1){
        // ciklus
        const idx = stack.indexOf(v);
        out.push(stack.slice(idx).concat(v));
      }
    }
    stack.pop(); color.set(u,2);
  }
  for (const k of graph.keys()){
    if ((color.get(k)||0)===0) dfs(k);
  }
  // dedup po signature-u
  const sig = s => s.join("->");
  return uniq(out.map(sig)).map(s => s.split("->"));
}

function toMarkdownTree(){
  return [
    `# Project structure (root: \`${path.relative(projectRoot, SRC_ROOT)}\`)`,
    "",
    "```",
    tree.join("\n"),
    "```",
  ].join("\n");
}

function summary(){
  const byExt = {};
  nodes.forEach(n => { byExt[n.ext] = (byExt[n.ext]||0)+1; });
  const components = nodes.filter(n => n.exportsComponent);

  return {
    files: nodes.length,
    byExtension: byExt,
    directories: byDir.size,
    components: {
      count: components.length,
      list: components.map(c => c.file).sort()
    },
    imports: edges.length,
    circular: cycles(),
  };
}

(async function main(){
  if (!fs.existsSync(SRC_ROOT)){
    console.error(`[snapshot] Root folder not found: ${SRC_ROOT}`);
    process.exit(1);
  }
  await walk(SRC_ROOT);
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const SUM = summary();
  const payload = {
    root: path.relative(projectRoot, SRC_ROOT),
    generatedAt: new Date().toISOString(),
    summary: SUM,
    nodes,
    edges
  };

  await fsp.writeFile(path.join(OUT_DIR, "TREE.md"), toMarkdownTree(), "utf8");
  await fsp.writeFile(path.join(OUT_DIR, "STRUCTURE.json"), JSON.stringify(payload, null, 2), "utf8");

  // kratki README dio
  const md = [
    "# Architecture snapshot",
    "",
    "## Summary",
    "```json",
    JSON.stringify(SUM, null, 2),
    "```",
    "",
    "## Tree",
    "[See TREE.md](./TREE.md)",
    "",
    "## Notes",
    "- `components.list` su datoteke koje vjerojatno exportaju React komponentu (heuristika).",
    "- `circular` prikazuje otkrivene kružne ovisnosti (ako ih ima).",
  ].join("\n");
  await fsp.writeFile(path.join(OUT_DIR, "STRUCTURE.md"), md, "utf8");

  console.log(`[snapshot] Wrote:\n  - ${path.join(OUT_DIR, "STRUCTURE.json")}\n  - ${path.join(OUT_DIR, "STRUCTURE.md")}\n  - ${path.join(OUT_DIR, "TREE.md")}`);
})();
