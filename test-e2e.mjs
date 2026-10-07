// Usar WebSocket nativo disponible en Node.js 22+
const WebSocket = globalThis.WebSocket;
import { spawn } from 'child_process';
import assert from 'assert';

console.log('🧪 Iniciando prueba E2E del protocolo Vinttea...');

// Iniciar servidor en subproceso
const serverProcess = spawn('node', ['packages/server/dist/index.js'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

serverProcess.stderr.on('data', (d) => {
  const str = d.toString();
  if (!str.includes('ExperimentalWarning')) {
    console.error('[Server Err]', str);
  }
});

let serverReady = false;

serverProcess.stdout.on('data', (data) => {
  const out = data.toString();
  if (out.includes('Server listening') || out.includes('VINTTEA')) {
    serverReady = true;
  }
});

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  // Esperar a que el servidor arranque
  for (let i = 0; i < 20; i++) {
    if (serverReady) break;
    await wait(300);
  }

  const PORT = 9876;
  const WS_URL = `ws://localhost:${PORT}/ws`;

  console.log('1. Conectando cliente Extensión...');
  const extWs = new WebSocket(`${WS_URL}?role=extension`);

  await new Promise((resolve) => (extWs.onopen = resolve));
  console.log('✔ Extensión conectada.');

  console.log('2. Conectando cliente Remoto (celular)...');
  const remoteWs = new WebSocket(`${WS_URL}?role=remote`);

  await new Promise((resolve) => (remoteWs.onopen = resolve));
  console.log('✔ Remoto conectado.');

  let remoteReceivedStatus = false;
  let extReceivedCommand = false;
  let remoteReceivedState = false;

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

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DEL PROTOCOLO PASARON EXITOSAMENTE!');

  remoteWs.close();
  extWs.close();
  serverProcess.kill();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Error en prueba:', err);
  serverProcess.kill();
  process.exit(1);
});
