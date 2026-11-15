# Sonido Mendoza - Peticiones

Plataforma para que los invitados pidan canciones al DJ escaneando un QR.

- `/pedir` → página de invitados
- `/admin` → panel del DJ. Cada equipo de sonido entra con su usuario (lista EQUIPOS en `src/config.js`)

## Estructura

```
sonido-mendoza/
├── index.html            Página base (título, tipografías, ícono)
├── package.json          Lista de librerías
├── vite.config.js        Configuración de Vite
├── vercel.json           Hace que /pedir y /admin funcionen en Vercel
├── firestore.rules       Reglas de seguridad (se pegan en Firebase)
├── .env.example          Plantilla de las claves de Firebase
├── public/               Logo (logo.webp, logo.png) e íconos de la pestaña
└── src/
    ├── config.js         ⭐ Nombre, redes sociales y límites (lo que más vas a editar)
    ├── firebase.js       Conexión con Firebase
    ├── main.jsx          Decide qué página mostrar
    ├── styles.css        Todo el diseño
    ├── pages/
    │   ├── Pedir.jsx     Página de invitados
    │   └── Admin.jsx     Login y panel del DJ
    ├── components/
    │   ├── Marca.jsx     Encabezado "Sonido Mendoza"
    │   ├── Redes.jsx     Íconos de redes sociales
    │   ├── TituloAnimado.jsx  Nombre del evento con letras que caen
    │   └── Confirmar.jsx Ventana "¿Seguro?"
    └── lib/
        ├── datos.js      Todas las operaciones con la base de datos
        ├── hooks.js      Escucha los cambios en tiempo real
        ├── buscar.js     Sugerencias de canciones (Apple Music)
        ├── imagen.js     Comprime la foto de fondo
        └── texto.js      Detección de canciones repetidas
```

## Probar en tu computadora

1. Copia `.env.example` como `.env.local` y pega los valores de `firebaseConfig`.
2. En Firebase → Firestore Database → Reglas, pega el contenido de `firestore.rules` y publica.
3. En una terminal, dentro de esta carpeta:

```
npm install
npm run dev
```

4. Abre `http://localhost:5173/admin`, entra y crea tu primer evento.
5. Abre `http://localhost:5173/pedir` y pide una canción.

## Cómo funciona por dentro

- `ajustes/{equipo}` (privado) guarda el evento actual de cada equipo y su código de fiesta.
- `publico/{id}` es lo que ven los invitados (título, límite, si está abierto, si pide código).
- `codigos/{1234}` dice a qué evento lleva cada código. Cada evento nuevo recibe un código nuevo.
- El candado de Firebase revisa el código antes de aceptar cada canción.
- Cada evento tiene sus peticiones en `eventos/{id}/peticiones`.
- "Nuevo evento" crea otro evento y lo activa: la cola empieza vacía y los anteriores quedan guardados.
- La foto de fondo de cada evento se guarda comprimida en `fondos/{id}` (sin Firebase Storage).
- Cada canción usa como identificador su nombre normalizado, así la base de datos rechaza duplicados.
