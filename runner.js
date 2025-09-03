// runner.js - lokalni process launcher + SSE log streaming (Windows-friendly)
const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

/** id -> { proc, lines[], listeners } */
const RUN = new Map();

console.log('🚀 Runner API starting...');

// SSE stream logs
app.get("/api/runner/stream/:id", (req, res) => {
  const { id } = req.params;
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
  res.flushHeaders();

  const state = RUN.get(id);
  if (!state) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: "not_found" })}\n\n`);
    return res.end();
  }
  
  // replay last ~200 lines
  for (const line of state.lines.slice(-200)) {
    res.write(`data: ${JSON.stringify({ line })}\n\n`);
  }
  
  const onLine = (line) => {
    try {
      res.write(`data: ${JSON.stringify({ line })}\n\n`);
    } catch (err) {
      console.log(`SSE write error: ${err.message}`);
    }
  };
  
  state.listeners.add(onLine);

  req.on("close", () => {
    state.listeners.delete(onLine);
    console.log(`SSE client disconnected from ${id}`);
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ ping: Date.now() })}\n\n`);
    } catch {
      clearInterval(keepAlive);
    }
  }, 30000);

  req.on("close", () => clearInterval(keepAlive));
});

// Launch an arbitrary command
app.post("/api/runner/launch", (req, res) => {
  const { id, cmd, args = [], cwd, env = {}, shell = false } = req.body || {};
  
  console.log(`🎯 Launch request: ${id} -> ${cmd} ${args.join(' ')}`);
  
  if (!id || !cmd) {
    return res.status(400).json({ error: "id and cmd required" });
  }
  
  if (RUN.has(id)) {
    return res.status(400).json({ error: "id already running" });
  }

  try {
    const proc = spawn(cmd, args, {
      cwd: cwd || process.cwd(),
      env: { ...process.env, ...env },
      shell, // for .bat use shell:true
    });

    const state = { proc, lines: [], listeners: new Set() };
    RUN.set(id, state);

    const push = (buf) => {
      const line = buf.toString().trim();
      if (!line) return;
      
      const timestamp = new Date().toLocaleTimeString();
      const logLine = `[${timestamp}] ${line}`;
      
      state.lines.push(logLine);
      
      // Notify all SSE listeners
      for (const cb of state.listeners) {
        try {
          cb(logLine);
        } catch (err) {
          console.log(`Listener error: ${err.message}`);
        }
      }
      
      // limit memory (keep last 5000 lines)
      if (state.lines.length > 5000) {
        state.lines.splice(0, 1000);
      }
    };

    proc.stdout.on("data", push);
    proc.stderr.on("data", push);
    
    proc.on("error", (error) => {
      push(Buffer.from(`ERROR: ${error.message}`));
    });
    
    proc.on("close", (code) => {
      const exitMsg = `\n[runner] process ${id} exited with code ${code}\n`;
      push(Buffer.from(exitMsg));
      
      // Remove from running processes after 30 seconds
      setTimeout(() => {
        RUN.delete(id);
        console.log(`🗑️  Cleaned up process ${id}`);
      }, 30000);
    });

    console.log(`✅ Started process ${id} (PID: ${proc.pid})`);
    return res.json({ ok: true, pid: proc.pid });
    
  } catch (error) {
    console.error(`❌ Launch failed for ${id}:`, error);
    return res.status(500).json({ error: error.message });
  }
});

// Stop running process
app.post("/api/runner/stop/:id", (req, res) => {
  const { id } = req.params;
  const state = RUN.get(id);
  
  if (!state) {
    return res.json({ ok: true, note: "not running" });
  }
  
  try {
    // Try graceful termination first
    state.proc.kill("SIGTERM");
    
    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (!state.proc.killed) {
        state.proc.kill("SIGKILL");
      }
    }, 5000);
    
    console.log(`🛑 Stop signal sent to ${id}`);
    return res.json({ ok: true });
    
  } catch (error) {
    console.error(`❌ Stop failed for ${id}:`, error);
    return res.status(500).json({ error: error.message });
  }
});

// Convenience: start .bat
app.post("/api/runner/start-bat", (req, res) => {
  const { id, path, args = [], cwd } = req.body || {};
  
  console.log(`🔧 BAT request: ${id} -> ${path}`);
  
  if (!id || !path) {
    return res.status(400).json({ error: "id and path required" });
  }
  
  if (RUN.has(id)) {
    return res.status(400).json({ error: "id already running" });
  }

  try {
    const proc = spawn(`"${path}"`, args, {
      cwd: cwd || undefined,
      shell: true, // needed for .bat
    });

    const state = { proc, lines: [], listeners: new Set() };
    RUN.set(id, state);

    const push = (buf) => {
      const line = buf.toString().trim();
      if (!line) return;
      
      const timestamp = new Date().toLocaleTimeString();
      const logLine = `[${timestamp}] ${line}`;
      
      state.lines.push(logLine);
      
      for (const cb of state.listeners) {
        try {
          cb(logLine);
        } catch (err) {
          console.log(`Listener error: ${err.message}`);
        }
      }
      
      if (state.lines.length > 5000) {
        state.lines.splice(0, 1000);
      }
    };

    proc.stdout.on("data", push);
    proc.stderr.on("data", push);
    
    proc.on("error", (error) => {
      push(Buffer.from(`BAT ERROR: ${error.message}`));
    });
    
    proc.on("close", (code) => {
      const exitMsg = `\n[runner] .bat ${id} exited with code ${code}\n`;
      push(Buffer.from(exitMsg));
      
      setTimeout(() => {
        RUN.delete(id);
        console.log(`🗑️  Cleaned up .bat ${id}`);
      }, 30000);
    });

    console.log(`✅ Started .bat ${id} (PID: ${proc.pid})`);
    return res.json({ ok: true, pid: proc.pid });
    
  } catch (error) {
    console.error(`❌ BAT launch failed for ${id}:`, error);
    return res.status(500).json({ error: error.message });
  }
});

// List running processes
app.get("/api/runner/list", (req, res) => {
  const running = Array.from(RUN.keys()).map(id => ({
    id,
    pid: RUN.get(id)?.proc?.pid,
    lineCount: RUN.get(id)?.lines?.length || 0
  }));
  
  return res.json({ processes: running });
});

// Health check
app.get("/api/runner/health", (req, res) => {
  return res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    runningProcesses: RUN.size 
  });
});

const PORT = process.env.RUNNER_PORT || 3002;
app.listen(PORT, () => {
  console.log(`🏃 Runner API listening on port ${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   POST /api/runner/launch - Start process`);
  console.log(`   POST /api/runner/stop/:id - Stop process`);
  console.log(`   POST /api/runner/start-bat - Start .bat file`);
  console.log(`   GET  /api/runner/stream/:id - SSE log stream`);
  console.log(`   GET  /api/runner/list - List running processes`);
  console.log(`   GET  /api/runner/health - Health check`);
});