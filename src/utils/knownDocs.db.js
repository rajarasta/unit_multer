// knownDocs.db.js - IndexedDB za čuvanje poznatih dokumenata

const DB_NAME = 'known-docs-db';
const STORE = 'docs';
const VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putDoc(doc) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(doc);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getAllDocs() {
  const db = await openDB();
  const docs = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return docs;
}

export async function deleteDoc(id) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// Generiraj unique ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Dodaj dokument u bazu
export async function addDoc(name, handle = null, url = null) {
  const doc = {
    id: generateId(),
    name,
    handle,
    url,
    createdAt: new Date().toISOString(),
    type: getDocType(name)
  };
  await putDoc(doc);
  return doc;
}

// Generiraj tip dokumenta na osnovu ekstenzije
function getDocType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const typeMap = {
    pdf: 'document',
    doc: 'document', 
    docx: 'document',
    xls: 'spreadsheet',
    xlsx: 'spreadsheet',
    txt: 'text',
    jpg: 'image',
    jpeg: 'image',
    png: 'image'
  };
  return typeMap[ext] || 'unknown';
}

// Provjeri ima li FileSystemHandle podršku
export function hasFileSystemAccess() {
  return 'showOpenFilePicker' in window;
}

// Provjeri dozvole za čitanje handle-a
export async function ensureReadPermission(handle) {
  if (!handle) return false;
  try {
    const stat = await handle.queryPermission?.({ mode: 'read' });
    if (stat === 'granted') return true;
    const res = await handle.requestPermission?.({ mode: 'read' });
    return res === 'granted';
  } catch (error) {
    console.warn('Error checking file permissions:', error);
    return false;
  }
}