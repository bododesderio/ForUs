/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
const fs = require("fs");
const path = require("path");
const { spawn, exec } = require("child_process");
const os = require("os");
const net = require("net");
require("dotenv").config({ path: path.join(__dirname, "backend", ".env") });

const lockFile = path.join(__dirname, '.dev-servers.lock');

// Get local network IP (works for physical devices on same WiFi)
const getLocalIP = () => {
  const nets = os.networkInterfaces();
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

const isPortInUse = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, (err) => {
      if (err) { resolve(true); } else {
        server.once('close', () => resolve(false));
        server.close();
      }
    });
    server.on('error', () => resolve(true));
  });
};

const createLockFile = () => {
  fs.writeFileSync(lockFile, JSON.stringify({ pid: process.pid, timestamp: Date.now() }, null, 2));
};

const isAnotherInstanceRunning = () => {
  if (!fs.existsSync(lockFile)) return false;
  try {
    const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    try { process.kill(lockData.pid, 0); return true; } catch { fs.unlinkSync(lockFile); return false; }
  } catch { fs.unlinkSync(lockFile); return false; }
};

const openInNewTab = (command, title, workingDir = __dirname) => {
  const platform = os.platform();
  if (platform === 'darwin') {
    const script = `tell application "Terminal" to do script "cd ${workingDir} && echo '=== ${title} ===' && ${command}"`;
    exec(`osascript -e '${script}'`);
  } else if (platform === 'win32') {
    exec(`start "${title}" cmd /k "cd /d ${workingDir} && echo === ${title} === && ${command}"`);
  } else {
    exec(`gnome-terminal --tab --title="${title}" -- bash -c "cd ${workingDir} && ${command}; exec bash" 2>/dev/null || xterm -T "${title}" -e "cd ${workingDir} && ${command}; bash" &`);
  }
};

(async function startDev() {
  if (isAnotherInstanceRunning()) {
    console.log('\u{1F6AB} Development servers are already running!');
    process.exit(0);
  }

  createLockFile();

  const backendPort = process.env.PORT || 10005;
  const localIP = getLocalIP();
  const apiUrl = `http://${localIP}:${backendPort}/api`;
  const envPath = path.join(__dirname, 'frontend', '.env');

  // Write local IP to frontend .env
  fs.writeFileSync(envPath, `API_BASE_URL=${apiUrl}\n`);
  console.log(`\u2705 Frontend .env updated: API_BASE_URL=${apiUrl}`);
  console.log(`\u{1F4F1} Use this IP on your physical device (must be on same WiFi)`);

  const backendRunning = await isPortInUse(backendPort);
  const expoRunning = await isPortInUse(8081);

  if (!backendRunning) {
    console.log('\u{1F680} Starting backend...');
    openInNewTab('npx nodemon server.js', 'Backend Server', path.join(__dirname, 'backend'));
  } else {
    console.log(`\u{1F680} Backend already running on port ${backendPort}`);
  }

  if (!expoRunning) {
    console.log('\u{1F4F1} Starting Expo...');
    openInNewTab('npx expo start', 'Frontend (Expo)', path.join(__dirname, 'frontend'));
  } else {
    console.log('\u{1F4F1} Expo already running on port 8081');
  }

  console.log(`\n\u2705 Dev environment ready!`);
  console.log(`\u{1F310} Backend: http://localhost:${backendPort}`);
  console.log(`\u{1F4F1} API URL for device: ${apiUrl}`);
  console.log(`\u{1F4A1} Tip: Docker services (postgres, redis) must be running: docker compose up -d`);

  const cleanup = () => {
    if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
  };

  process.on('SIGINT', () => { cleanup(); process.exit(); });
  process.on('exit', cleanup);
  process.on('SIGTERM', cleanup);

  setInterval(() => {}, 5000);
})();
