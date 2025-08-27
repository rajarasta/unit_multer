// src/utils/json-partial-io.js
// Minimalan util za full i parcijalni export/import preko JSON Pointer putanja.
// Radi s bilo kojim JSON-om

import { readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';

// ---------- IO ----------
async function readJson(filePath) {
  const buf = await readFile(filePath);
  // tolerantno: dozvoli BOM i prazno
  const txt = buf.toString().replace(/^\uFEFF/, '').trim() || '{}';
  return JSON.parse(txt);
}

async function writeJson(filePath, data) {
  await mkdir(dirname(filePath), { recursive: true });
  const txt = JSON.stringify(data, null, 2);
  await writeFile(filePath, txt);
}

// ---------- JSON Pointer (RFC 6901) ----------
function splitPointer(ptr) {
  if (ptr === '' || ptr === '#') return [];
  if (!ptr.startsWith('/')) throw new Error(`Neispravan JSON Pointer: "${ptr}"`);
  return ptr
    .slice(1)
    .split('/')
    .map(seg => seg.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function getByPointer(root, pointer) {
  const parts = splitPointer(pointer);
  let cur = root;
  for (const keyRaw of parts) {
    const key = Array.isArray(cur) ? toIndex(keyRaw) : keyRaw;
    if (cur == null || !(key in cur)) return undefined;
    cur = cur[key];
  }
  return cur;
}

function setByPointer(root, pointer, value, { mode = 'replace' } = {}) {
  const parts = splitPointer(pointer);
  if (parts.length === 0) {
    // zamijeni cijeli root
    if (mode === 'merge' && isObject(root) && isObject(value)) {
      deepMergeInto(root, value);
      return root;
    }
    return value;
  }
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    let key = parts[i];
    if (Array.isArray(cur)) key = toIndex(key);
    if (!(key in cur) || cur[key] == null || typeof cur[key] !== 'object') {
      // kreiraj međučvor (pretpostavi objekt)
      cur[key] = {};
    }
    cur = cur[key];
  }
  let last = parts[parts.length - 1];
  if (Array.isArray(cur)) last = toIndex(last);

  if (mode === 'merge' && isObject(cur[last]) && isObject(value)) {
    deepMergeInto(cur[last], value);
  } else {
    cur[last] = value;
  }
  return root;
}

function toIndex(s) {
  if (s === '-') throw new Error('Operator "-" nije podržan u ovom utilu.');
  const n = Number(s);
  if (!Number.isInteger(n)) throw new Error(`Očekivan je indeks niza, dobiveno "${s}"`);
  return n;
}

function isObject(x) {
  return x && typeof x === 'object' && !Array.isArray(x);
}

function deepMergeInto(target, source) {
  if (!isObject(target) || !isObject(source)) return;
  for (const [k, v] of Object.entries(source)) {
    if (isObject(v)) {
      if (!isObject(target[k])) target[k] = {};
      deepMergeInto(target[k], v);
    } else {
      target[k] = v;
    }
  }
}

// ---------- EXPORT ----------
/**
 * Full export: pročita JSON i vrati cijeli objekt.
 */
export async function exportFull(srcPath) {
  return readJson(srcPath);
}

/**
 * Parcijalni export: vrati mapu { pointer: vrijednost } za tražene putanje.
 * Ako pointer ne postoji, vrijednost će biti undefined (možeš filtrirati).
 */
export async function exportPartial(srcPath, pointers) {
  const data = await readJson(srcPath);
  const out = {};
  for (const p of pointers) out[p] = getByPointer(data, p);
  return out;
}

/**
 * Parcijalni export kompozit: gradi minimalno stablo s traženim dijelovima.
 * Primjer:
 *   pointers: ["/projectState/tasks/0", "/projectState/projectName"]
 *   rezultat: { projectState: { projectName: "...", tasks: { "0": {...} } } }
 */
export async function exportPartialTree(srcPath, pointers) {
  const data = await readJson(srcPath);
  const tree = {};
  for (const p of pointers) {
    const val = getByPointer(data, p);
    buildTree(tree, p, val);
  }
  return tree;
}

function buildTree(root, pointer, value) {
  const parts = splitPointer(pointer);
  let cur = root;
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    const isLast = i === parts.length - 1;
    if (isLast) {
      cur[seg] = value;
    } else {
      if (!isObject(cur[seg])) cur[seg] = {};
      cur = cur[seg];
    }
  }
}

// ---------- IMPORT ----------
/**
 * Full import: u potpunosti zamijeni sadržaj fajla novim objektom.
 */
export async function importFull(destPath, newObject) {
  await writeJson(destPath, newObject);
}

/**
 * Parcijalni import: primijeni listu promjena { pointer, value }.
 * mode = "replace" (zadano) ili "merge" (objektna dubinska nadogradnja).
 */
export async function importPartial(destPath, patches, { mode = 'replace' } = {}) {
  let data;
  try {
    data = await readJson(destPath);
  } catch {
    data = {};
  }
  for (const { pointer, value } of patches) {
    data = setByPointer(data, pointer, value, { mode });
  }
  await writeJson(destPath, data);
}

/**
 * Parcijalni import iz kompozitnog stabla — uzmi stablo (npr. iz exportPartialTree)
 * i mapiraj ga na pointere pa primijeni.
 */
export async function importPartialTree(destPath, tree, { mode = 'replace' } = {}) {
  const patches = flattenTreeToPatches(tree);
  await importPartial(destPath, patches, { mode });
}

function flattenTreeToPatches(tree, base = '') {
  const patches = [];
  function walk(obj, pathParts) {
    for (const [k, v] of Object.entries(obj)) {
      const next = [...pathParts, k];
      if (isObject(v) && !isLeafValue(v)) {
        walk(v, next);
      } else {
        const pointer = '/' + next.map(esc).join('/');
        patches.push({ pointer, value: v });
      }
    }
  }
  walk(tree, base ? splitPointer(base) : []);
  return patches;
}

function isLeafValue(v) {
  // Smatraj kao "list" sve što nije čisti objekt (niz, primitiv, null).
  return !isObject(v);
}

function esc(s) {
  return String(s).replace(/~/g, '~0').replace(/\//g, '~1');
}