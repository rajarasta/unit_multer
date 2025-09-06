#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ANSI Colors for beautiful logging
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

// Process configurations
const processes = {
  frontend: {
    name: 'Frontend Dev Server',
    command: 'npm',
    args: ['run', 'dev'],
    port: '5173',
    color: colors.cyan,
    bgColor: colors.bgCyan,
    icon: '🌐',
    description: 'Vite React Frontend + Proxy'
  },
  server: {
    name: 'Main API Server',
    command: 'node',
    args: ['server.js'],
    port: '3002',
    color: colors.green,
    bgColor: colors.bgGreen,
    icon: '🚀',
    description: 'Document Registry + AI Routing + Voice Intent'
  },
  fileWriter: {
    name: 'File Writer Service',
    command: 'node',
    args: ['file-writer.cjs'],
    port: '3001',
    color: colors.magenta,
    bgColor: colors.bgMagenta,
    icon: '💾',
    description: 'File Persistence + OpenAI Integration'
  },
  voiceServer: {
    name: 'Voice Server',
    command: 'node',
    args: ['voice-server.cjs'],
    port: '3003',
    color: colors.blue,
    bgColor: colors.bgBlue,
    icon: '🎤',
    description: 'Speech Processing + Croatian Voice Commands'
  },
  runner: {
    name: 'Task Runner',
    command: 'node',
    args: ['runner.cjs'],
    port: '3004',
    color: colors.yellow,
    bgColor: colors.bgYellow,
    icon: '⚡',
    description: 'Background Task Processing'
  }
};

// Active processes storage
const activeProcesses = new Map();

// Utility functions
function timestamp() {
  return new Date().toLocaleTimeString('hr-HR', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}

function formatLog(processKey, message, type = 'info') {
  const proc = processes[processKey];
  const time = colors.dim + timestamp() + colors.reset;
  const service = `${proc.color}${proc.icon} ${proc.name}${colors.reset}`;
  const port = colors.dim + `[${proc.port}]` + colors.reset;
  
  let prefix = '';
  switch(type) {
    case 'start': prefix = colors.green + '▶ START' + colors.reset; break;
    case 'ready': prefix = colors.green + '✅ READY' + colors.reset; break;
    case 'error': prefix = colors.red + '❌ ERROR' + colors.reset; break;
    case 'warn': prefix = colors.yellow + '⚠ WARN' + colors.reset; break;
    case 'info': prefix = colors.blue + 'ℹ INFO' + colors.reset; break;
    default: prefix = colors.white + '• LOG' + colors.reset;
  }
  
  console.log(`${time} ${prefix} ${service} ${port} ${message}`);
}

function startProcess(key) {
  const config = processes[key];
  
  formatLog(key, `Starting ${config.description}...`, 'start');
  
  const proc = spawn(config.command, config.args, {
    cwd: __dirname,
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  activeProcesses.set(key, proc);

  // Handle stdout
  proc.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      // Detect ready states
      if (output.includes('Local:') || output.includes('localhost:5173')) {
        formatLog(key, `Ready at http://localhost:5173`, 'ready');
      } else if (output.includes('API server radi') || output.includes(`localhost:${config.port}`)) {
        formatLog(key, `Ready at http://localhost:${config.port}`, 'ready');
      } else if (output.includes('Server running') || output.includes('listening')) {
        formatLog(key, `Server listening on port ${config.port}`, 'ready');
      } else {
        // Regular output
        output.split('\n').forEach(line => {
          if (line.trim()) {
            formatLog(key, line.trim());
          }
        });
      }
    }
  });

  // Handle stderr
  proc.stderr.on('data', (data) => {
    const error = data.toString().trim();
    if (error && !error.includes('ExperimentalWarning')) {
      error.split('\n').forEach(line => {
        if (line.trim()) {
          formatLog(key, line.trim(), 'error');
        }
      });
    }
  });

  // Handle process exit
  proc.on('close', (code) => {
    if (code === 0) {
      formatLog(key, 'Process exited cleanly', 'info');
    } else {
      formatLog(key, `Process exited with code ${code}`, 'error');
    }
    activeProcesses.delete(key);
  });

  proc.on('error', (err) => {
    formatLog(key, `Failed to start: ${err.message}`, 'error');
    activeProcesses.delete(key);
  });

  return proc;
}

function printHeader() {
  console.clear();
  console.log(colors.bold + colors.cyan + '╔══════════════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.bold + colors.cyan + '║' + colors.reset + '  🏭 ' + colors.bold + 'ALUMINUM STORE UI - DEVELOPMENT ENVIRONMENT' + colors.reset + '           ' + colors.bold + colors.cyan + '║' + colors.reset);
  console.log(colors.bold + colors.cyan + '║' + colors.reset + '     ' + colors.dim + 'Voice Gantt + Multi-Service Architecture' + colors.reset + '                ' + colors.bold + colors.cyan + '║' + colors.reset);
  console.log(colors.bold + colors.cyan + '╠══════════════════════════════════════════════════════════════════╣' + colors.reset);
  
  Object.entries(processes).forEach(([key, config]) => {
    const service = `${config.icon} ${config.name}`;
    const port = `localhost:${config.port}`;
    const desc = config.description;
    console.log(colors.bold + colors.cyan + '║' + colors.reset + ` ${service.padEnd(22)} ${colors.dim}${port.padEnd(15)}${colors.reset} ${desc.padEnd(22)} ` + colors.bold + colors.cyan + '║' + colors.reset);
  });
  
  console.log(colors.bold + colors.cyan + '╚══════════════════════════════════════════════════════════════════╝' + colors.reset);
  console.log('');
  console.log(colors.bold + colors.green + '🚀 Starting all services...' + colors.reset);
  console.log('');
}

function printServiceStatus() {
  console.log('');
  console.log(colors.bold + colors.white + '📊 Service Status:' + colors.reset);
  console.log(colors.dim + '─'.repeat(70) + colors.reset);
  
  Object.entries(processes).forEach(([key, config]) => {
    const isRunning = activeProcesses.has(key);
    const status = isRunning ? colors.green + '✅ RUNNING' + colors.reset : colors.red + '❌ STOPPED' + colors.reset;
    const url = colors.cyan + `http://localhost:${config.port}` + colors.reset;
    console.log(`${config.icon} ${config.name.padEnd(20)} ${status} ${colors.dim}→${colors.reset} ${url}`);
  });
  
  console.log('');
  console.log(colors.dim + 'Press Ctrl+C to stop all services' + colors.reset);
  console.log('');
}

// Graceful shutdown
function cleanup() {
  console.log('');
  console.log(colors.bold + colors.red + '🛑 Shutting down all services...' + colors.reset);
  
  activeProcesses.forEach((proc, key) => {
    formatLog(key, 'Stopping...', 'warn');
    try {
      proc.kill('SIGTERM');
    } catch (err) {
      formatLog(key, `Error stopping: ${err.message}`, 'error');
    }
  });
  
  setTimeout(() => {
    console.log(colors.bold + colors.green + '✨ All services stopped. Goodbye!' + colors.reset);
    process.exit(0);
  }, 2000);
}

// Main execution
async function main() {
  printHeader();
  
  // Start services in order (backend first, then frontend)
  const startOrder = ['server', 'fileWriter', 'voiceServer', 'runner', 'frontend'];
  
  for (let i = 0; i < startOrder.length; i++) {
    const key = startOrder[i];
    startProcess(key);
    
    // Small delay between service starts
    if (i < startOrder.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  
  // Show status after all processes started
  setTimeout(() => {
    printServiceStatus();
  }, 3000);
}

// Handle process signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('beforeExit', cleanup);

// Error handling
process.on('uncaughtException', (err) => {
  console.log(colors.red + '❌ Uncaught Exception:' + colors.reset, err.message);
  cleanup();
});

process.on('unhandledRejection', (reason) => {
  console.log(colors.red + '❌ Unhandled Rejection:' + colors.reset, reason);
  cleanup();
});

// Start the show!
main().catch(console.error);