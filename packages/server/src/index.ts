import fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import type { WebSocket } from 'ws';
import os from 'os';
import path from 'path';
import fs from 'fs';
import qrcodeTerminal from 'qrcode-terminal';
import {
  DEFAULT_PORT,
  DEFAULT_WS_PATH,
  type VintteaMessage,
  type PlayerState,
  type CommandMessage,
  type StateMessage,
  type StatusMessage,
} from '@vinttea/shared';

// Helper to get local network IP
function getLocalNetworkIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const server = fastify({ logger: true });

// Registered clients
const extensionClients = new Set<WebSocket>();
const remoteClients = new Set<WebSocket>();
let lastKnownState: PlayerState | null = null;

function broadcastToRemotes(message: VintteaMessage) {
  const data = JSON.stringify(message);
  for (const client of remoteClients) {
    if (client.readyState === 1 /* OPEN */) {
      client.send(data);
    }
  }
}

function broadcastToExtensions(message: VintteaMessage) {
  const data = JSON.stringify(message);
  for (const client of extensionClients) {
    if (client.readyState === 1 /* OPEN */) {
      client.send(data);
    }
  }
}

function broadcastStatus() {
  const statusMsg: StatusMessage = {
    type: 'status',
    extensionConnected: extensionClients.size > 0,
    activeRemotes: remoteClients.size,
  };
  broadcastToRemotes(statusMsg);
}

export async function startServer(port: number = DEFAULT_PORT) {
  await server.register(cors, { origin: true });
  await server.register(websocketPlugin);

  // Status API endpoint
  server.get('/api/status', async () => {
    return {
      status: 'ok',
      extensionConnected: extensionClients.size > 0,
      activeRemotes: remoteClients.size,
      lastKnownState,
    };
  });

  // Dedicated test page with HTML5 video player and instructions
  server.get('/test', async (req, reply) => {
    reply.type('text/html').send(getVideoTestPageHtml());
  });

  // WebSocket route
  server.register(async (app) => {
    app.get(DEFAULT_WS_PATH, { websocket: true }, (socket, req) => {
      let clientRole: 'extension' | 'remote' | 'unknown' = 'unknown';

      // Support query param identification e.g. /ws?role=extension
      const url = new URL(req.url || '', 'http://localhost');
      const queryRole = url.searchParams.get('role');
      if (queryRole === 'extension' || queryRole === 'remote') {
        registerRole(queryRole);
      }

      function registerRole(role: 'extension' | 'remote') {
        clientRole = role;
        if (role === 'extension') {
          extensionClients.add(socket);
          server.log.info('Extension client connected. Total extensions: ' + extensionClients.size);
          broadcastStatus();
        } else if (role === 'remote') {
          remoteClients.add(socket);
          server.log.info('Remote client connected. Total remotes: ' + remoteClients.size);
          // Send current status immediately
          const statusMsg: StatusMessage = {
            type: 'status',
            extensionConnected: extensionClients.size > 0,
            activeRemotes: remoteClients.size,
          };
          socket.send(JSON.stringify(statusMsg));

          // If we have cached state, send it
          if (lastKnownState) {
            const stateMsg: StateMessage = { type: 'state', state: lastKnownState };
            socket.send(JSON.stringify(stateMsg));
          }

          // Request fresh state from extension
          broadcastToExtensions({ type: 'command', action: 'requestState' });
          broadcastStatus();
        }
      }

      socket.on('message', (rawData) => {
        try {
          const msg = JSON.parse(rawData.toString()) as VintteaMessage;

          switch (msg.type) {
            case 'identify': {
              if (msg.role === 'extension' || msg.role === 'remote') {
                registerRole(msg.role);
                socket.send(
                  JSON.stringify({
                    type: 'identified',
                    success: true,
                    role: msg.role,
                    clientId: Math.random().toString(36).substring(2, 9),
                  })
                );
              }
              break;
            }

            case 'command': {
              server.log.info({ action: msg.action, value: msg.value }, 'Remote command received');
              // Forward command to extension(s)
              broadcastToExtensions(msg);
              break;
            }

            case 'state': {
              lastKnownState = msg.state;
              // Forward updated playback state to all remote controls
              broadcastToRemotes(msg);
              break;
            }

            case 'ping': {
              socket.send(JSON.stringify({ type: 'pong' }));
              break;
            }
          }
        } catch (err) {
          server.log.error({ err }, 'Error parsing incoming WebSocket message');
        }
      });

      socket.on('close', () => {
        if (clientRole === 'extension') {
          extensionClients.delete(socket);
          server.log.info('Extension client disconnected');
          broadcastStatus();
        } else if (clientRole === 'remote') {
          remoteClients.delete(socket);
          server.log.info('Remote client disconnected');
          broadcastStatus();
        }
      });

      socket.on('error', (err) => {
        server.log.error({ err }, 'WebSocket client error');
      });
    });
  });

  // Candidate paths for built remote PWA
  const candidatePaths = [
    path.resolve(import.meta.dirname, '../../remote/dist'),
    path.resolve(process.cwd(), 'packages/remote/dist'),
    path.resolve(process.cwd(), '../remote/dist'),
  ];
  const remoteDist = candidatePaths.find((p) => fs.existsSync(p));

  if (remoteDist) {
    server.log.info('Serving static remote PWA from: ' + remoteDist);
    server.register(fastifyStatic, {
      root: remoteDist,
      prefix: '/',
    });
  } else {
    // Serve fallback builtin tester UI
    server.get('/', async (req, reply) => {
      reply.type('text/html').send(getBuiltinWebTesterHtml());
    });
  }

  try {
    await server.listen({ port, host: '0.0.0.0' });
    const localIp = getLocalNetworkIp();
    const localUrl = `http://localhost:${port}`;
    const networkUrl = `http://${localIp}:${port}`;

    console.log('\n======================================================');
    console.log('       VINTTEA - Servidor de Control Remoto           ');
    console.log('======================================================');
    console.log(`PWA Remota (PC):    ${localUrl}`);
    console.log(`PWA Remota (Cel):   ${networkUrl}`);
    console.log(`Página de prueba:   ${localUrl}/test`);
    console.log(`WebSocket:          ws://localhost:${port}${DEFAULT_WS_PATH}`);
    console.log('------------------------------------------------------');
    console.log('Escanea este codigo QR con tu celular en la misma WiFi:');
    try {
      qrcodeTerminal.generate(networkUrl, { small: true });
    } catch {
      // ignore
    }
    console.log('======================================================\n');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

function getVideoTestPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Vinttea - Página de Prueba de Video</title>
  <style>
    body {
      background: #0f111a;
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 30px 20px;
    }
    h1 { color: #e50914; margin-bottom: 8px; }
    p.lead { color: #9ca3af; margin-bottom: 24px; }
    .card {
      background: #191c28;
      border: 1px solid #2a3045;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    video {
      width: 100%;
      border-radius: 8px;
      background: #000;
      max-height: 440px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: bold;
      background: #10b981;
      color: #fff;
      margin-bottom: 12px;
    }
    .log-box {
      background: #090a0f;
      border: 1px solid #2a3045;
      border-radius: 8px;
      padding: 12px;
      height: 140px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 0.85rem;
      color: #10b981;
    }
    .instructions {
      line-height: 1.6;
      font-size: 0.95rem;
    }
    .instructions ol {
      margin-left: 20px;
      margin-top: 8px;
    }
    .instructions code {
      background: #252a3b;
      padding: 2px 6px;
      border-radius: 4px;
      color: #f59e0b;
    }
    a.button {
      display: inline-block;
      background: #e50914;
      color: #fff;
      text-decoration: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 600;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <h1>Vinttea - Laboratorio de Prueba</h1>
  <p class="lead">Esta página permite probar el control remoto de reproducción con la extensión instalada.</p>

  <div class="card">
    <span class="badge">REPRODUCTOR HTML5 ACTIVO</span>
    <video id="testVideo" controls playsinline>
      <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4">
      Tu navegador no soporta video HTML5.
    </video>
    <div style="margin-top: 12px; display: flex; justify-content: space-between;">
      <span id="videoStatus">Estado: Pausado</span>
      <span id="timeStatus">0:00 / 0:00</span>
    </div>
  </div>

  <div class="card">
    <h3>Registro de eventos del reproductor:</h3>
    <div id="eventLog" class="log-box">
      [00:00:00] Reproductor listo. Esperando comandos desde el celular o remoto...
    </div>
  </div>

  <div class="card instructions">
    <h3>Como probar con la extensión:</h3>
    <ol>
      <li>Abre en tu navegador (Chrome o Edge): <code>chrome://extensions</code></li>
      <li>Activa el <strong>"Modo de desarrollador"</strong> (arriba a la derecha).</li>
      <li>Haz clic en <strong>"Cargar descomprimida"</strong> (Load unpacked).</li>
      <li>Selecciona la carpeta: <code>packages/extension/.output/chrome-mv3</code></li>
      <li>Abre esta pestaña de prueba o un video de <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" style="color: #60a5fa;">YouTube</a>.</li>
      <li>Abre la app del celular escaneando el código QR en la consola o visitando la URL local.</li>
      <li>Presiona <strong>Play / Pausa</strong> o <strong>±10s</strong> en tu celular y observa la magia en la pantalla.</li>
    </ol>
  </div>

  <script>
    const v = document.getElementById('testVideo');
    const log = document.getElementById('eventLog');
    const videoStatus = document.getElementById('videoStatus');
    const timeStatus = document.getElementById('timeStatus');

    function addLog(msg) {
      const now = new Date().toTimeString().split(' ')[0];
      log.innerHTML += '<div>[' + now + '] ' + msg + '</div>';
      log.scrollTop = log.scrollHeight;
    }

    v.addEventListener('play', () => {
      videoStatus.innerText = 'Estado: Reproduciendo ▶';
      addLog('▶ Evento: Video iniciado (Play)');
    });

    v.addEventListener('pause', () => {
      videoStatus.innerText = 'Estado: Pausado ⏸';
      addLog('⏸ Evento: Video pausado');
    });

    v.addEventListener('seeking', () => {
      addLog('⏩ Evento: Seeking a ' + Math.round(v.currentTime) + 's');
    });

    v.addEventListener('volumechange', () => {
      addLog('🔊 Evento: Volumen cambiado a ' + Math.round(v.volume * 100) + '% (Mute: ' + v.muted + ')');
    });

    v.addEventListener('timeupdate', () => {
      timeStatus.innerText = Math.round(v.currentTime) + 's / ' + Math.round(v.duration || 0) + 's';
    });
  </script>
</body>
</html>`;
}

function getBuiltinWebTesterHtml(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Vinttea Remote Control</title>
  <style>
    :root {
      --bg: #0f1117;
      --card: #1a1d27;
      --card-border: #2e3346;
      --accent: #e50914;
      --accent-hover: #f40612;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --success: #10b981;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px;
      touch-action: manipulation;
    }
    .container {
      width: 100%;
      max-width: 440px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 4px;
    }
    h1 { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.5px; color: #fff; }
    h1 span { color: var(--accent); }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: #1f2937;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--warning);
    }
    .badge.connected .badge-dot { background: var(--success); }
    .card {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .now-playing {
      min-height: 80px;
    }
    .service-tag {
      font-size: 0.7rem;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--accent);
      letter-spacing: 0.05em;
    }
    .media-title {
      font-size: 1.1rem;
      font-weight: 600;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .progress-bar-container {
      width: 100%;
      height: 6px;
      background: #374151;
      border-radius: 3px;
      position: relative;
      cursor: pointer;
      margin-top: 8px;
    }
    .progress-bar {
      height: 100%;
      background: var(--accent);
      border-radius: 3px;
      width: 0%;
      transition: width 0.3s;
    }
    .time-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
    }
    button {
      background: #252a3a;
      border: 1px solid var(--card-border);
      color: #fff;
      font-size: 1rem;
      font-weight: 600;
      padding: 16px;
      border-radius: 14px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      user-select: none;
      transition: background 0.15s, transform 0.1s;
    }
    button:active {
      background: #32384e;
      transform: scale(0.96);
    }
    button.primary {
      background: var(--accent);
      border-color: var(--accent);
      grid-column: span 1;
      padding: 22px 16px;
      font-size: 1.25rem;
    }
    button.primary:active {
      background: var(--accent-hover);
    }
    .icon { font-size: 1.5rem; }
    .btn-label { font-size: 0.8rem; font-weight: 500; color: var(--text-muted); }
    .volume-slider-box {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 8px;
    }
    input[type=range] {
      flex: 1;
      accent-color: var(--accent);
      height: 6px;
    }
    .footer-status {
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Vint<span>tea</span></h1>
      <div id="statusBadge" class="badge">
        <span class="badge-dot"></span>
        <span id="statusText">Conectando...</span>
      </div>
    </header>

    <!-- Info del video actual -->
    <div class="card now-playing">
      <div id="serviceTag" class="service-tag">SIN REPRODUCCIÓN</div>
      <div id="mediaTitle" class="media-title">Esperando pestaña de video...</div>
      <div class="progress-bar-container" id="progressBarContainer">
        <div class="progress-bar" id="progressBar"></div>
      </div>
      <div class="time-info">
        <span id="currTime">0:00</span>
        <span id="durTime">0:00</span>
      </div>
    </div>

    <!-- Controles Principales -->
    <div class="card">
      <div class="grid-3">
        <button onclick="sendCommand('seek', -10)">
          <span class="icon">⏪</span>
          <span class="btn-label">-10s</span>
        </button>
        <button class="primary" id="playBtn" onclick="sendCommand('togglePlay')">
          <span class="icon" id="playIcon">▶</span>
          <span class="btn-label" id="playLabel" style="color: #fff;">Play</span>
        </button>
        <button onclick="sendCommand('seek', 10)">
          <span class="icon">⏩</span>
          <span class="btn-label">+10s</span>
        </button>
      </div>

      <!-- Siguiente / Anterior episodio -->
      <div class="grid-2">
        <button onclick="sendCommand('prevEpisode')">
          <span class="icon">⏮️</span>
          <span class="btn-label">Anterior Ep.</span>
        </button>
        <button onclick="sendCommand('nextEpisode')">
          <span class="icon">⏭️</span>
          <span class="btn-label">Siguiente Ep.</span>
        </button>
      </div>
    </div>

    <!-- Controles de Audio y Pantalla -->
    <div class="card">
      <div class="grid-2">
        <button onclick="sendCommand('toggleMute')">
          <span class="icon" id="muteIcon">🔊</span>
          <span class="btn-label">Mute / Desmutear</span>
        </button>
        <button onclick="sendCommand('toggleFullscreen')">
          <span class="icon">⛶</span>
          <span class="btn-label">Pantalla completa</span>
        </button>
      </div>

      <div class="volume-slider-box">
        <span>🔉</span>
        <input type="range" id="volumeRange" min="0" max="100" value="100" oninput="onVolumeSlider(this.value)">
        <span>🔊</span>
      </div>
    </div>

    <div class="footer-status" id="footerInfo">
      Listo para controlar tu PC desde el celular
    </div>
  </div>

  <script>
    let ws = null;
    let isPlaying = false;
    let extConnected = false;

    function formatTime(secs) {
      if (!secs || isNaN(secs)) return '0:00';
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function connectWs() {
      const loc = window.location;
      const wsProto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = wsProto + '//' + loc.host + '/ws?role=remote';

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        updateBadge(true, 'Conectado al Servidor');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'status') {
            extConnected = msg.extensionConnected;
            if (extConnected) {
              updateBadge(true, 'PC Conectada');
            } else {
              updateBadge(false, 'Extensión en PC desconectada');
            }
          } else if (msg.type === 'state') {
            handleState(msg.state);
          }
        } catch(e) {
          console.error(e);
        }
      };

      ws.onclose = () => {
        updateBadge(false, 'Reconectando...');
        setTimeout(connectWs, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    function updateBadge(connected, text) {
      const badge = document.getElementById('statusBadge');
      const label = document.getElementById('statusText');
      label.innerText = text;
      if (connected && extConnected) {
        badge.classList.add('connected');
      } else {
        badge.classList.remove('connected');
      }
    }

    function handleState(state) {
      if (!state) return;
      isPlaying = !!state.playing;
      
      document.getElementById('playIcon').innerText = isPlaying ? '⏸' : '▶';
      document.getElementById('playLabel').innerText = isPlaying ? 'Pausa' : 'Play';
      
      if (state.title) {
        document.getElementById('mediaTitle').innerText = state.title;
      }
      if (state.service) {
        document.getElementById('serviceTag').innerText = state.service.toUpperCase();
      }

      if (state.duration && state.duration > 0) {
        const pct = Math.min(100, Math.max(0, (state.position / state.duration) * 100));
        document.getElementById('progressBar').style.width = pct + '%';
        document.getElementById('currTime').innerText = formatTime(state.position);
        document.getElementById('durTime').innerText = formatTime(state.duration);
      }

      if (state.volume !== undefined) {
        document.getElementById('volumeRange').value = Math.round(state.volume * 100);
      }

      document.getElementById('muteIcon').innerText = state.muted ? '🔇' : '🔊';
    }

    function sendCommand(action, value) {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert('Servidor no conectado');
        return;
      }
      if (navigator.vibrate) {
        navigator.vibrate(40);
      }
      ws.send(JSON.stringify({ type: 'command', action, value }));
    }

    function onVolumeSlider(val) {
      sendCommand('setVolume', val / 100);
    }

    // Connect immediately
    connectWs();
  </script>
</body>
</html>`;
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
