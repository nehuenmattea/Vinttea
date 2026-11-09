# Vinttea 🍿📱

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-green.svg)](https://nodejs.org/)
[![WXT](https://img.shields.io/badge/Framework-WXT%20MV3-purple.svg)](https://wxt.dev/)

> Control remoto para plataformas de streaming en tu PC desde el celular vía WiFi local.

Olvídate de levantarte del sillón o la cama para pausar, adelantar o cambiar de episodio en la PC. **Vinttea** conecta tu teléfono móvil con tu navegador mediante WebSockets locales de ultra baja latencia (<100 ms).

---

## 📑 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Estructura del Monorepo](#-estructura-del-monorepo)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación y Puesta en Marcha](#-instalación-y-puesta-en-marcha)
- [Guía de Pruebas](#-guía-de-pruebas)
- [Solución de Problemas (FAQ)](#-solución-de-problemas-faq)
- [Roadmap del Proyecto](#-roadmap-del-proyecto)
- [Licencia](#-licencia)

---

## ✨ Características

- ⏯️ **Controles esenciales:** Play/Pausa, saltos de ±10 segundos, volumen analógico, silenciar (Mute) y pantalla completa.
- ⏭️ **Control de episodios:** Botones dedicados de Siguiente y Anterior episodio.
- 📱 **PWA móvil optimizada para la noche:** Interfaz táctil oscura con botones amplios, feedback háptico (`vibration API`) y visualización del título y barra de progreso en tiempo real.
- ⚡ **Baja latencia:** Comunicación directa por WebSockets en red local (sin servidores intermedios en la nube).
- 📲 **Emparejamiento sin fricción:** Escaneo de código QR generado directamente en la terminal de la PC.
- 🔌 **Arquitectura extensible de adaptadores:** Diseñado con una interfaz `SiteAdapter` desacoplada para dar soporte a YouTube, Crunchyroll, Netflix, Prime Video y cualquier reproductor web HTML5.

---

## 🏛️ Arquitectura

```
Celular (PWA en Preact) ─── WebSocket ───► Servidor Local (Fastify + ws)
                                                      │
                                                  WebSocket
                                                      │
                                                      ▼
                                       Extensión PC (Service Worker MV3)
                                                      │
                                                Content Script
                                                      │
                                        Adaptador (YouTube / Genérico)
                                                      │
                                             Elemento <video> DOM
```

---

## 📁 Estructura del Monorepo

El proyecto está configurado con `pnpm workspaces`:

| Paquete | Descripción | Tecnologías |
|---|---|---|
| [`@vinttea/shared`](packages/shared) | Contratos de mensajes, esquemas TypeScript, interfaz `SiteAdapter` y constantes | TypeScript |
| [`@vinttea/server`](packages/server) | Servidor HTTP y WebSocket local, mDNS/IP discovery, QR en terminal y hosting PWA | Fastify, `@fastify/websocket`, `ws` |
| [`@vinttea/extension`](packages/extension) | Extensión Manifest V3 con Service Worker keepalive y Content Scripts | WXT, Vite, Web Extensions API |
| [`@vinttea/remote`](packages/remote) | PWA móvil responsive con tema nocturno y controles táctiles | Preact, Vite |

---

## 📋 Requisitos Previos

- [Node.js](https://nodejs.org/) v22.0.0 o superior
- [pnpm](https://pnpm.io/) v10+ instalado globalmente:
  ```powershell
  npm install -g pnpm
  ```

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar e Instalar Dependencias

```powershell
# En la raíz del proyecto
pnpm install
```

### 2. Compilar el Monorepo

```powershell
pnpm build
```

Este comando compilará `@vinttea/shared`, la extensión en `packages/extension/.output/chrome-mv3`, la PWA móvil en `packages/remote/dist` y el servidor en `packages/server/dist`.

### 3. Cargar la Extensión en Chrome o Edge

1. En tu navegador, ingresa a:
   - En Google Chrome: `chrome://extensions`
   - En Microsoft Edge: `edge://extensions`
2. Activa el interruptor **"Modo de desarrollador"** (arriba a la derecha).
3. Haz clic en **"Cargar descomprimida"** (*Load unpacked*).
4. Selecciona la carpeta:
   ```
   packages/extension/.output/chrome-mv3
   ```
5. La extensión quedará lista y se conectará automáticamente al servidor local en segundo plano.

### 4. Iniciar Vinttea (¡Interfaz de Escritorio y sin comandos!)

Para usuarios comunes y corrientes, simplemente haz **doble clic en el ejecutable:**
```
Vinttea.exe
```
*(O ejecuta `Vinttea.bat` si prefieres la consola, o `pnpm dev` para desarrollo)*

El panel de escritorio **Vinttea.exe**:
- **Diagnostica e instala requisitos:** Si no tienes Node.js o pnpm, ofrece instalarlos con 1 clic de forma automática.
- **Crea el acceso directo:** Botón para crear el acceso directo en el Escritorio con el icono oficial de la app.
- **Controla el servidor:** Inicia o detiene el servidor con un clic, manteniéndolo en segundo plano sin ventanas molestas.
- **Minimiza a la bandeja del sistema:** Queda accesible junto al reloj de Windows con menú contextual.
- **Código QR interactivo:** Muestra el código QR y la IP en pantalla para escanear con la cámara del celular.
- **Actualizaciones desde GitHub:** Detecta nuevas releases publicadas en GitHub y permite descargarlas y aplicarlas automáticamente reemplazando los archivos necesarios.

---

## 🎮 Guía de Pruebas

### Prueba 1: Laboratorio de Video Integrado
1. Con el servidor corriendo, abre en la PC: [`http://localhost:9876/test`](http://localhost:9876/test).
2. Verás un reproductor de video HTML5 junto a una consola de eventos en vivo.
3. Abre el control remoto en tu celular (escaneando el QR o abriendo la URL en otra pestaña).
4. Toca **Play**, **Pausa**, **+10s**, **-10s** o mueve el control de volumen. Verás el video responder de inmediato y reflejar su posición en tu pantalla.

### Prueba 2: YouTube
1. Abre cualquier video en [YouTube](https://www.youtube.com).
2. Abre la PWA en tu celular. El estado pasará a `"PC Conectada"` y mostrará el título del video.
3. Puedes pausar, reanudar o adelantar la reproducción desde tu teléfono.

### Prueba Automatizada de Protocolo (E2E)
Ejecuta la suite de verificación de punta a punta:
```powershell
pnpm test
```

---

## 🛠️ Solución de Problemas (FAQ)

### El celular no conecta al servidor
- **Misma red:** Asegúrate de que el celular y la PC estén conectados a la **misma red WiFi**.
- **Firewall de Windows:** Si Windows pregunta al iniciar si deseas permitir conexiones para Node.js, selecciona **Permitir acceso en redes privadas**.
- **Aislamiento de clientes (AP Isolation):** Algunos routers de residencias, hoteles o empresas bloquean la comunicación directa entre dispositivos de la misma red. Si este es el caso, puedes compartir zona WiFi (Hotspot) desde el celular hacia la PC.

### El Service Worker de la extensión se desconecta
- La extensión implementa un mecanismo de *keepalive* con `ping/pong` cada 20 segundos y reintento con reconexión automática si el servidor se reinicia. Puedes verificar el estado en la consola de la extensión en `chrome://extensions`.

---

## 🗺️ Roadmap del Proyecto

- [x] **Fase 0 (Preparación):** Monorepo con `pnpm`, TypeScript, esquemas de mensajes en `shared`.
- [x] **Fase 1 (PoC Funcional):** Servidor Fastify + WS, extensión WXT MV3 con reconexión, adaptadores (Genérico y YouTube), PWA Preact y página de prueba.
- [x] **Fase 2 (Adaptadores por Plataforma):** Soporte para Crunchyroll (sagas, omitir intro/resumen sin titileo, pantalla completa F11), Netflix y YouTube.
- [x] **Fase 3 (Control de Hardware y Apagado):** Apagar o suspender la PC directamente desde el control remoto del celular.
- [x] **Fase 4 (Aplicación de Escritorio e Instalador):** Panel de control nativo `Vinttea.exe` con diagnóstico de dependencias, acceso directo en el escritorio, bandeja del sistema y actualizador desde GitHub Releases.
- [ ] **Fase 5 (PWA Avanzada):** Gestos táctiles avanzados, control con botones físicos de volumen del celular.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.
