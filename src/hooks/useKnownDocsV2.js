import { useState, useEffect, useCallback } from 'react';

/**
 * Enhanced Known Documents hook with IndexedDB + server sync
 * Compatible with new voice-server.js backend
 */

const DB_NAME = 'voice-known-docs-v2';
const STORE = 'documents';
const VERSION = 1;

// IndexedDB helpers
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll() {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    return await new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function idbPut(doc) {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(doc);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function idbDelete(id) {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

// Croatian fuzzy search
function fuzzyFindDoc(query, docs) {
  if (!query || !docs.length) return null;
  
  const needle = query.toLowerCase().trim();
  
  console.log(`🔍 Searching for: "${needle}" in ${docs.length} documents`);
  
  const scored = docs.map(doc => {
    const name = doc.name.toLowerCase();
    let score = 0;
    
    console.log(`   Testing "${name}"`);
    
    // Exact match
    if (name === needle) {
      score += 10;
      console.log(`     Exact match: +10 = ${score}`);
    }
    
    // Starts with
    if (name.startsWith(needle)) {
      score += 5;
      console.log(`     Starts with: +5 = ${score}`);
    }
    
    // Remove file extensions for better matching
    const nameWithoutExt = name.replace(/\.[^.]+$/, '');
    const needleWithoutExt = needle.replace(/\s*(pdf|doc|docx|xlsx|txt)?\s*$/i, '');
    
    console.log(`     Without ext: "${needleWithoutExt}" vs "${nameWithoutExt}"`);
    
    // Exact match without extension
    if (nameWithoutExt === needleWithoutExt) {
      score += 8;
      console.log(`     Exact match (no ext): +8 = ${score}`);
    }
    
    // Starts with without extension
    if (nameWithoutExt.startsWith(needleWithoutExt)) {
      score += 6;
      console.log(`     Starts with (no ext): +6 = ${score}`);
    }
    
    // Contains all words
    const queryWords = needleWithoutExt.split(/\s+/).filter(Boolean);
    const matchedWords = queryWords.filter(word => nameWithoutExt.includes(word));
    if (queryWords.length > 0) {
      const wordScore = (matchedWords.length / queryWords.length) * 4;
      score += wordScore;
      console.log(`     Word match: ${matchedWords.length}/${queryWords.length} = +${wordScore.toFixed(1)} = ${score.toFixed(1)}`);
    }
    
    // Number patterns (ponuda 001, racun 123, etc)
    const numberMatch = needle.match(/(\d+)/);
    if (numberMatch) {
      const number = numberMatch[1];
      if (name.includes(number)) {
        score += 2;
        console.log(`     Number match: +2 = ${score}`);
      }
    }
    
    console.log(`     Final score: ${score}`);
    return { doc, score };
  }).sort((a, b) => b.score - a.score);
  
  const result = scored[0]?.score > 0 ? scored[0].doc : null;
  console.log(`🎯 Best match: ${result ? `"${result.name}" (score: ${scored[0].score})` : 'none'}`);
  
  return result;
}

// File System Access API helpers
const canUseFileSystem = 'showOpenFilePicker' in window;

async function pickFile(accept = ['.pdf', '.xlsx', '.docx', '.txt']) {
  if (!canUseFileSystem) {
    throw new Error('File System Access API not supported');
  }
  
  const [handle] = await window.showOpenFilePicker({
    multiple: false,
    types: [{
      description: 'Dokumenti',
      accept: {
        'application/pdf': ['.pdf'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'text/plain': ['.txt']
      }
    }]
  });
  
  return handle;
}

export default function useKnownDocsV2() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Load documents from IndexedDB and sync with server
  const loadDocs = useCallback(async () => {
    console.log('📂 loadDocs: Starting...');
    try {
      setLoading(true);
      setError(null);
      
      console.log('💾 loadDocs: Loading from IndexedDB...');
      // Load from IndexedDB first (fast)
      const localDocs = await idbGetAll();
      console.log('💾 loadDocs: IndexedDB returned', localDocs.length, 'docs');
      setDocs(localDocs);
      
      console.log('🌐 loadDocs: Syncing with server...');
      // Then sync with server
      await syncWithServer();
      
    } catch (err) {
      console.error('❌ Error loading docs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      console.log('✅ loadDocs: Finished');
    }
  }, []);

  // Sync with server
  const syncWithServer = useCallback(async () => {
    try {
      setSyncing(true);
      console.log('🔄 syncWithServer: Fetching /api/docs...');
      
      const response = await fetch('/api/docs');
      console.log('🔄 syncWithServer: Response status:', response.status);
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('🔄 syncWithServer: Response data:', responseData);
      const { docs: serverDocs } = responseData;
      
      // Merge server docs with local docs
      const localDocs = await idbGetAll();
      const merged = new Map();
      
      // Add local docs
      localDocs.forEach(doc => merged.set(doc.id, doc));
      
      // Update/add server docs
      for (const serverDoc of serverDocs) {
        const existing = merged.get(serverDoc.id);
        if (!existing || new Date(serverDoc.updatedAt || serverDoc.createdAt) > new Date(existing.updatedAt || existing.createdAt)) {
          merged.set(serverDoc.id, { ...existing, ...serverDoc });
        }
      }
      
      const finalDocs = Array.from(merged.values()).sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      // Update IndexedDB
      for (const doc of finalDocs) {
        await idbPut(doc);
      }
      
      setDocs(finalDocs);
      console.log(`✅ Synced ${finalDocs.length} documents`);
      
    } catch (err) {
      console.warn('⚠️ Server sync failed:', err);
      // Don't set error - we can still work with local docs
    } finally {
      setSyncing(false);
    }
  }, []);

  // Add local document (file picker)
  const addLocalDoc = useCallback(async () => {
    if (!canUseFileSystem) {
      throw new Error('File picker not supported in this browser');
    }
    
    try {
      const handle = await pickFile();
      const file = await handle.getFile();
      
      // Add to server
      const response = await fetch('/api/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          localOnly: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add document: ${response.status}`);
      }
      
      const newDoc = await response.json();
      
      // Store file handle reference locally (can't serialize handle to server)
      const docWithHandle = {
        ...newDoc,
        _fileHandle: true, // flag to indicate we have local handle
        size: file.size,
        lastModified: file.lastModified
      };
      
      await idbPut(docWithHandle);
      setDocs(prev => [docWithHandle, ...prev]);
      
      console.log(`📁 Added local document: ${file.name}`);
      return docWithHandle;
      
    } catch (err) {
      console.error('❌ Error adding local doc:', err);
      throw err;
    }
  }, []);

  // Add remote document (URL)
  const addRemoteDoc = useCallback(async (name, url) => {
    try {
      const response = await fetch('/api/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          url,
          localOnly: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add document: ${response.status}`);
      }
      
      const newDoc = await response.json();
      await idbPut(newDoc);
      setDocs(prev => [newDoc, ...prev]);
      
      console.log(`🌐 Added remote document: ${name}`);
      return newDoc;
      
    } catch (err) {
      console.error('❌ Error adding remote doc:', err);
      throw err;
    }
  }, []);

  // Remove document
  const removeDoc = useCallback(async (id) => {
    try {
      // Remove from server
      const response = await fetch(`/api/docs/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        console.warn('⚠️ Server deletion failed, removing locally only');
      }
      
      // Remove from IndexedDB
      await idbDelete(id);
      setDocs(prev => prev.filter(doc => doc.id !== id));
      
      console.log(`🗑️ Removed document: ${id}`);
      
    } catch (err) {
      console.error('❌ Error removing doc:', err);
      throw err;
    }
  }, []);

  // Find document by fuzzy search
  const findDoc = useCallback((query) => {
    return fuzzyFindDoc(query, docs);
  }, [docs]);

  // Get newest document
  const getNewestDoc = useCallback(() => {
    return docs.length > 0 ? docs[0] : null;
  }, [docs]);

  // Upload file and get upload ID
  const uploadFile = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('file', file, file.name);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`📤 File uploaded: ${file.name} -> ${result.uploadId}`);
    
    return result;
  }, []);

  // Send document for processing
  const sendDocForProcessing = useCallback(async (doc, query = 'ukupna cijena i pozicije') => {
    try {
      let payload = { query };
      
      // Always use docId since server already has the document
      payload.docId = doc.id;
      
      const response = await fetch('/api/agent/smart-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Processing failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Document processed:', result);
      
      return result;
      
    } catch (err) {
      console.error('❌ Error processing doc:', err);
      throw err;
    }
  }, [uploadFile]);

  // Initialize on mount
  useEffect(() => {
    console.log('🚀 useKnownDocsV2: Initializing...');
    loadDocs();
  }, [loadDocs]);

  return {
    // State
    docs,
    loading,
    error,
    syncing,
    
    // Capabilities
    canUseFileSystem,
    
    // Actions
    loadDocs,
    syncWithServer,
    addLocalDoc,
    addRemoteDoc,
    removeDoc,
    sendDocForProcessing,
    uploadFile,
    
    // Search/filter
    findDoc,
    getNewestDoc,
    
    // Computed
    count: docs.length,
    localDocs: docs.filter(doc => doc.localOnly),
    remoteDocs: docs.filter(doc => !doc.localOnly),
    isEmpty: docs.length === 0
  };
}