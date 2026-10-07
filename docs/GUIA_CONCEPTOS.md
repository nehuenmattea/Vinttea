# 📚 Guía Conceptual y Arquitectura de Vinttea

> Esta guía está pensada para explicar **de forma simple, clara y con analogías del día a día** cada una de las tecnologías, conceptos y piezas que componen el proyecto Vinttea.

---

## 🎯 Desglosando la definición del proyecto

> *"Vinttea es un sistema de control remoto que permite controlar reproductores de streaming web (YouTube, Netflix, Crunchyroll) en la PC directamente desde el celular. Utiliza una arquitectura desacoplada con una PWA en Preact, un servidor WebSocket local en Fastify y una extensión Manifest V3 en Chrome/Edge con adaptadores por sitio, logrando control multimedia y sincronización de estado bidireccional en menos de 50 ms sin depender de la nube."*

A primera vista, esa frase parece un trabalenguas lleno de siglas de programación. Pero en realidad, **cada palabra representa una herramienta elegida por una razón muy concreta**. Vamos a desarmarla término por término.

---

## 🧩 1. Glosario de Tecnologías y Conceptos

---

### 📱 PWA (Progressive Web App - Aplicación Web Progresiva)
- **¿Qué es?:** Es una página web tradicional (HTML, CSS y JavaScript) que tiene "superpoderes" para comportarse y verse como si fuera una aplicación nativa instalada en tu teléfono.
- **Analogía:** Imagina una página web que, cuando la abres en el celular, oculta la barra de direcciones del navegador, se abre a pantalla completa, tiene su propio icono en la pantalla de inicio y vibra al pulsar botones.
- **¿Por qué la usamos en Vinttea?:**
  - No necesitas descargar nada desde la **Google Play Store** o el **App Store** de Apple.
  - Abres la cámara, escaneas el código QR en la pantalla de tu PC, y en 2 segundos ya tienes el control remoto funcionando en el celular.
  - Funciona exactamente igual en Android, iPhone, tablet o cualquier dispositivo.

---

### ⚡ WebSocket (vs. HTTP tradicional)
- **¿Qué es?:** Es un protocolo de comunicación que mantiene una **línea telefónica abierta y constante** entre dos dispositivos.
- **La diferencia con la web tradicional (HTTP):**
  - **HTTP tradicional (como enviar cartas):** Tu celular le pregunta a la PC: *"¿Está en pausa el video?"*, y la PC le responde. Si quieres saber qué pasa en el siguiente segundo, tienes que volver a preguntar. Eso genera retrasos y consume batería.
  - **WebSocket (como una llamada en altavoz):** El celular y la PC se conectan una sola vez y la llamada **nunca se corta**. En cuanto tocas un botón en el celular, la orden llega a la PC al instante. Y en cuanto el video avanza un segundo en la PC, la PC se lo avisa al celular de inmediato.
- **¿Por qué lo usamos?:** Para que la respuesta sea instantánea (**menos de 50 milisegundos**). Cuando tocas "Pausa" en el celular, no quieres esperar un segundo a que el video se detenga.

---

### ⚛️ Preact (¿y por qué no React?)
- **¿Qué es?:** Es una librería de JavaScript para construir interfaces de usuario interactivas basadas en componentes.
- **Su relación con React:** **React** es la librería más popular del mundo para hacer páginas interactivas (creada por Meta/Facebook). Sin embargo, React pesa bastante y tiene muchas funciones complejas que no siempre se necesitan. **Preact** es una alternativa ultraliviana que hace lo mismo, tiene la misma sintaxis, pero **pesa solo 3 Kilobytes** (unas 40 veces menos que React).
- **¿Por qué la usamos?:** Para que la interfaz del control remoto en tu celular cargue al instante, consuma prácticamente nada de memoria y responda con fluidez.

---

### 🚀 Fastify (y Node.js)
- **¿Qué es Node.js?:** Normalmente, JavaScript solo corre dentro de los navegadores. Node.js es un programa que permite ejecutar código JavaScript directamente en tu computadora (en tu sistema operativo).
- **¿Qué es Fastify?:** Es una herramienta (*framework*) escrita para Node.js que sirve para crear servidores web extremadamente rápidos y eficientes.
- **¿Por qué lo usamos?:**
  - El servidor es el **corazón intermediario** del proyecto: escucha en el puerto de tu PC (`9876`), descubre cuál es tu dirección IP en el WiFi de tu casa y crea el puente por donde viajan los WebSockets entre tu teléfono y tu navegador.
  - Fastify es notablemente más rápido y moderno que otras alternativas clásicas como Express.

---

### 🧩 Extensión Manifest V3 (MV3)
- **¿Qué es una extensión?:** Un pequeño programa que instalas en Google Chrome o Microsoft Edge para darle nuevas capacidades al navegador.
- **¿Qué es "Manifest V3"?:** Es el estándar técnico moderno y obligatorio establecido por Google para las extensiones de Chrome (centrado en mayor seguridad, privacidad y rendimiento).
- **Las dos partes internas de la extensión:**
  1. **Service Worker (`background.ts`):** Es el "cerebro invisible" que corre en segundo plano dentro del navegador. No tiene interfaz gráfica, pero puede hablar con el servidor local por WebSocket y vigilar qué pestañas tienes abiertas.
  2. **Content Script (`content.ts`):** Son las "manos" de la extensión. Es código que se inyecta directamente dentro de la página web que estás mirando (por ejemplo, dentro de `youtube.com`). Es el único que tiene permiso para tocar el botón de reproducir o adelantar el video.

---

### 🔌 Adaptadores por Sitio (`SiteAdapter`)
- **¿Qué es?:** Es un patrón de diseño de software (el patrón *Adapter*).
- **Analogía:** Imagina que viajas por el mundo y cada país tiene un enchufe de pared con una forma distinta (patas redondas, patas planas, tres patas). El adaptador de viaje permite conectar siempre el mismo cargador sin importar el país.
- **¿Por qué lo necesitamos?:**
  - Cada plataforma de streaming funciona distinto:
    - En **YouTube**, el botón de siguiente es `<button class="ytp-next-button">`.
    - En **Netflix**, no hay botón simple y a veces no te dejan saltar el tiempo directamente con la etiqueta `<video>` por temas de protección DRM.
    - En un reproductor genérico, solo tocas `<video>.play()`.
  - Con la interfaz `SiteAdapter`, el celular no necesita saber si estás viendo YouTube o Netflix; el celular solo dice: *"Quiero siguiente episodio"*. El adaptador del sitio se encarga de traducirlo a lo que esa página específica entienda.

---

### 🧱 Arquitectura Desacoplada
- **¿Qué significa?:** Que las partes del sistema no están pegadas entre sí como un bloque de cemento, sino que están conectadas como piezas de LEGO independientes.
- **Ejemplo práctico:**
  - El celular no sabe nada sobre extensiones de Chrome.
  - La extensión no sabe qué modelo de celular tienes ni cómo se ve la pantalla del control.
  - Ambas piezas solo se comunican a través de un contrato simple de mensajes:
    `{ type: "command", action: "play" }`
  - Si el día de mañana queremos cambiar la PWA del celular por una app de reloj inteligente (Apple Watch / WearOS) o un comando por voz, **no tenemos que tocar una sola línea de código de la extensión**.

---

### 🔄 Sincronización de Estado Bidireccional
- **¿Qué significa?:** La comunicación fluye en **ambos sentidos**:
  1. **Del celular a la PC:** Le envías órdenes al video (*"pausar"*, *"adelantar 10s"*, *"subir volumen"*).
  2. **De la PC al celular:** La PC le informa al celular qué está pasando (*"el video va por el minuto 12:30"*, *"la duración total es 45:00"*, *"el título es Capítulo 3"*).
  Gracias a esto, la barra de progreso en tu celular se mueve sola en tiempo real y el botón cambia de forma automáticamente si pausas el video con el teclado de la PC.

---

### 🏠 Sin depender de la nube (Red Local / LAN)
- **¿Qué significa?:** Tus datos nunca viajan por servidores de Amazon, Google o internet. Todo el tráfico viaja exclusivamente a través de las ondas de radio del router WiFi de tu casa (de tu celular a tu PC).
- **Ventajas:**
  - **Privacidad total:** Nadie sabe qué estás viendo.
  - **Cero costo de servidores:** No pagas hosting mensual.
  - **Velocidad máxima:** Al no dar la vuelta al mundo por internet, la latencia es prácticamente nula (<50 milisegundos).

---

### 📦 Monorepo y `pnpm workspaces`
- **¿Qué es un Monorepo?:** Es un único repositorio de código en Git que contiene varios "sub-proyectos" o paquetes relacionados.
- En nuestro caso, en la carpeta `packages/` viven:
  - `shared`: La librería compartida con los tipos de mensajes y contratos.
  - `server`: El servidor de Fastify.
  - `extension`: La extensión de navegador.
  - `remote`: La PWA del celular.
- **¿Qué hace `pnpm workspaces`?:** Permite que todos estos paquetes compartan dependencias, se enlacen entre sí localmente y se compilen juntos sin tener que publicar librerías en internet ni copiar y pegar código.

---

## 🎬 2. El Ciclo de Vida de una Acción: Paso a Paso

Para ver cómo se unen todas estas piezas, sigamos el viaje que hace una orden cuando estás acostado en la cama:

```
[1] Tocas "Pausar" en el celular
        │
        ▼ (PWA en Preact)
[2] El celular vibra y envía: { type: "command", action: "togglePlay" }
        │
        ▼ (Vía WiFi local por WebSocket)
[3] Servidor Fastify (Node.js en la PC)
    Recibe el mensaje y lo retransmite a la extensión conectada en localhost
        │
        ▼ (Vía WebSocket interno)
[4] Service Worker de la Extensión (Background MV3)
    Detecta cuál es la pestaña activa del navegador con un video abierto
    y le envía un mensaje interno con chrome.tabs.sendMessage
        │
        ▼ (Dentro del navegador)
[5] Content Script en la pestaña (ej. YouTube)
    Invoca el adaptador del sitio: YouTubeAdapter.togglePlay()
    Este adaptador ejecuta: video.pause()
        │
        ▼ (En la pantalla de tu PC)
[6] El video se pausa inmediatamente.
        │
        ▼ (El viaje de vuelta)
[7] La etiqueta <video> emite su evento nativo "pause".
    El Content Script lo detecta y arma el nuevo estado:
    { type: "state", playing: false, position: 240, duration: 900 }
        │
        ▼ (Content Script ➔ Background ➔ Servidor ➔ Celular)
[8] El celular recibe el estado y actualiza su botón a "▶ Reproducir".
```

⏱️ **Tiempo total de todo este proceso:** Entre **20 y 50 milisegundos**. Para el ojo humano, es simultáneo.

---

## 💡 En Resumen (Traducción al criollo)

> **"Vinttea es como un control remoto de TV, pero para los videos que ves en la computadora.**
> 
> En vez de comprar un control físico, usamos tu propio teléfono como control abriendo una página web liviana (**PWA en Preact**). 
> Cuando tocas un botón, la orden viaja por el WiFi de tu casa al instante a través de un canal abierto permanente (**WebSocket**) hacia un programa que corre en tu PC (**servidor Fastify**). 
> Ese servidor le avisa a un complemento de Chrome (**extensión Manifest V3**) y ese complemento tiene traductores especiales (**adaptadores**) que saben exactamente qué botón apretar en YouTube, Netflix o Crunchyroll para que el video haga caso sin que tengas que levantarte de la cama."
