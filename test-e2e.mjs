// Usar WebSocket nativo disponible en Node.js 22+
const WebSocket = globalThis.WebSocket;
import { spawn } from 'child_process';
import { createServer } from 'node:net';
import assert from 'assert';

console.log('🧪 Iniciando prueba E2E del protocolo Vinttea...');
let serverProcess;

async function getFreePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const { port } = probe.address();
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(port) {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/status`);
      if (res.ok) return true;
    } catch {
      // server not up yet
    }
    await wait(200);
  }
  throw new Error('Servidor no respondió a tiempo');
}

async function runTest() {
  const PORT = await getFreePort();
  // Start an isolated server so an already-running Vinttea instance cannot
  // make this test pass against the wrong process.
  serverProcess = spawn('node', ['packages/server/dist/index.cjs'], {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, VINTTEA_PORT: String(PORT) },
  });
  await waitForServer(PORT);
  console.log('✔ Servidor HTTP listo en puerto', PORT);

  const WS_URL = `ws://127.0.0.1:${PORT}/ws`;

  console.log('1. Conectando cliente Extensión...');
  const extWs = new WebSocket(`${WS_URL}?role=extension`);

  await new Promise((resolve, reject) => {
    extWs.onopen = resolve;
    extWs.onerror = reject;
  });
  console.log('✔ Extensión conectada.');

  console.log('2. Conectando cliente Remoto (celular)...');
  const remoteWs = new WebSocket(`${WS_URL}?role=remote`);

  await new Promise((resolve, reject) => {
    remoteWs.onopen = resolve;
    remoteWs.onerror = reject;
  });
  console.log('✔ Remoto conectado.');

  let remoteReceivedStatus = false;
  let extReceivedCommand = false;
  let remoteReceivedState = false;
  let extReceivedFullscreenCommand = false;

  remoteWs.onmessage = (event) => {
    const msg = JSON.parse(event.data.toString());
    if (msg.type === 'status' && msg.extensionConnected) {
      remoteReceivedStatus = true;
      console.log('✔ Remoto recibió status: PC conectada!');
    }
    if (msg.type === 'state' && msg.state?.title === 'Video de Prueba') {
      remoteReceivedState = true;
      console.log('✔ Remoto recibió actualización de estado de video:', msg.state.title);
    }
  };

  extWs.onmessage = (event) => {
    const msg = JSON.parse(event.data.toString());
    if (msg.type === 'command' && msg.action === 'seek' && msg.value === 10) {
      extReceivedCommand = true;
      console.log('✔ Extensión recibió comando del remoto:', msg.action, msg.value);

      // Extensión simula responder con nuevo estado
      extWs.send(
        JSON.stringify({
          type: 'state',
          state: {
            playing: true,
            title: 'Video de Prueba',
            position: 25,
            duration: 120,
            volume: 0.8,
            muted: false,
            service: 'youtube',
          },
        })
      );
    }
    if (msg.type === 'command' && msg.action === 'toggleFullscreen') {
      extReceivedFullscreenCommand = true;
    }
  };

  // Esperar confirmación de estado
  await wait(500);

  // Remoto envía comando
  console.log('3. Remoto enviando comando: seek +10s...');
  remoteWs.send(JSON.stringify({ type: 'command', action: 'seek', value: 10 }));

  await wait(1000);

  // Verificaciones
  assert(remoteReceivedStatus, 'El remoto debió recibir status de extensión conectada');
  assert(extReceivedCommand, 'La extensión debió recibir el comando seek');
  assert(remoteReceivedState, 'El remoto debió recibir el estado actualizado');

  console.log('4. Remoto enviando comando de pantalla completa...');
  remoteWs.send(JSON.stringify({ type: 'command', action: 'toggleFullscreen' }));
  await wait(500);
  assert(extReceivedFullscreenCommand, 'La extensión debió recibir el comando toggleFullscreen');
  console.log('✔ Extensión recibió el comando toggleFullscreen.');

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DEL PROTOCOLO PASARON EXITOSAMENTE!');

  remoteWs.close();
  extWs.close();
  const serverStopped = new Promise((resolve) => serverProcess.once('exit', resolve));
  serverProcess.kill();
  await serverStopped;
}

runTest().catch((err) => {
  console.error('❌ Error en prueba:', err);
  serverProcess?.kill();
  process.exit(1);
});
