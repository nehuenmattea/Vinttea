# Vinttea 🍿📱

> Control remoto para plataformas de streaming en tu PC desde el celular vía WiFi local.

---

## 🎯 Arquitectura del Proyecto

```
Celular (PWA) ──WS──► Servidor local (Fastify + ws) ──WS──► Extensión (Chrome/Edge MV3)
                                                                   │
                                                            Content script
                                                                   │
                                                         Adaptador (YouTube / Genérico)
                                                                   │
                                                               <video>
```

### Estructura del Monorepo (`pnpm workspaces`):

- **[`packages/shared`](file:///c:/Users/nehue/Desktop/Estudios/Desarrollo/Vinttea/packages/shared)**: Tipos de mensajes WebSocket, estado del reproductor (`PlayerState`), interfaz de adaptadores (`SiteAdapter`) y constantes comunes.
- **[`packages/server`](file:///c:/Users/nehue/Desktop/Estudios/Desarrollo/Vinttea/packages/server)**: Servidor Fastify con WebSockets, detección automática de IP de red local, código QR en terminal y servicio de la PWA del celular y página de pruebas (`/test`).
- **[`packages/extension`](file:///c:/Users/nehue/Desktop/Estudios/Desarrollo/Vinttea/packages/extension)**: Extensión de navegador construida con [WXT](https://wxt.dev) (Manifest V3), Service Worker en segundo plano con reconexión automática y adaptadores por sitio.
- **[`packages/remote`](file:///c:/Users/nehue/Desktop/Estudios/Desarrollo/Vinttea/packages/remote)**: PWA táctil y responsiva para el celular creada con Preact y Vite, pensada para usar a oscuras en el sillón/cama, con feedback háptico.

---

## 🚀 Inicio Rápido

### 1. Requisitos
- Node.js 22 o superior
- pnpm (`npm install -g pnpm`)

### 2. Instalación y Compilación

```bash
# Instalar dependencias en todo el monorepo
pnpm install

# Compilar todos los paquetes
pnpm build
```

### 3. Cargar la Extensión en Chrome o Edge

1. Abre tu navegador y navega a `chrome://extensions` (o `edge://extensions` en Edge).
2. Activa el interruptor de **"Modo de desarrollador"** (arriba a la derecha).
3. Haz clic en el botón **"Cargar descomprimida"** (Load unpacked).
4. Selecciona la carpeta generada:
   `packages/extension/.output/chrome-mv3`
5. ¡Listo! La extensión ya estará activa en segundo plano conectada al servidor local.

### 4. Iniciar el Servidor

```bash
pnpm dev
# o también: pnpm dev:server
```

Al iniciar, verás en la consola:
- La URL local de tu PC: `http://localhost:9876`
- La URL para tu celular: `http://<IP_LOCAL>:9876`
- Un **código QR en la terminal** para escanear con la cámara del celular.
- La página de laboratorio de prueba: `http://localhost:9876/test`

---

## 🎮 Cómo Probar el Control Remoto

### Opción A: Laboratorio de Prueba Integrado
1. Con el servidor corriendo, abre en la PC: `http://localhost:9876/test`.
2. Verás un reproductor de video HTML5 con registro de eventos en tiempo real.
3. Abre en el celular (o en otra pestaña) `http://<IP_LOCAL>:9876`.
4. Presiona **Play**, **Pausa**, **+10s**, **-10s**, **Silenciar** o ajusta el volumen. Verás el reproductor responder al instante.

### Opción B: En YouTube
1. Abre cualquier video en [YouTube](https://www.youtube.com).
2. Abre el control remoto en tu celular.
3. Controla la reproducción directamente desde la cama o el sillón.

---

## 🧪 Pruebas Automatizadas

Para validar todo el flujo de mensajes y la comunicación bidireccional entre la extensión, el servidor y el celular:

```bash
pnpm test
```

---

## 🗺️ Próximos Pasos (Roadmap v1)

- [x] **Fase 0:** Configuración de monorepo, TypeScript, esquemas compartidos en `shared`.
- [x] **Fase 1:** Servidor WebSocket, adaptador genérico y YouTube, extensión MV3 con reconexión, app remota PWA y página de prueba.
- [ ] **Fase 2:** Adaptadores dedicados para Crunchyroll, Prime Video y Netflix (inyección de script para API interna).
- [ ] **Fase 3:** Sistema de emparejamiento con tokens efímeros y código QR seguro.
- [ ] **Fase 4:** Gestos táctiles en la PWA (swipe para seek) y soporte mDNS local.
