/* ===== Panel de Mendoza Sonido y DJ =====
   Edita el contenido de la página en este navegador (borrador) y deja verlo con "Vista previa".
   - Con Firebase configurado (firebase-config.js): pide inicio de sesión y "Publicar" guarda
     el contenido en la base de datos; la página lo lee de ahí.
   - Sin Firebase: "Guardar cambios" descarga un contenido.js para subirlo a mano. */
(() => {
  const DRAFT_KEY = "mendoza-borrador"; // la misma clave que lee render.js con ?borrador
  const FB = window.FIREBASE_CONFIG || {};
  const useFirebase = !!(FB.apiKey && FB.databaseURL);
  let PUBLISHED = JSON.stringify(window.SITIO || {}); // lo que está publicado (para saber si hay cambios)
  let neverPublished = false;                         // Firebase todavía no tiene contenido
  let D = JSON.parse(PUBLISHED);
  let hadDraft = false;
  const loadDraft = () => {
    D = JSON.parse(PUBLISHED); hadDraft = false;
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      if (d && d !== PUBLISHED) { D = JSON.parse(d); hadDraft = true; }
    } catch (e) { /* sin borrador */ }
  };
  loadDraft();

  const $ = (s, el = document) => el.querySelector(s);
  const videoInfo = window.videoInfo || (() => ({ tipo: "link" }));

  // Crea un elemento: h("div", {class: "x", onclick: fn}, hijos...)
  const h = (tag, props, ...kids) => {
    const e = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === "class") e.className = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (v === true) e.setAttribute(k, "");
      else e.setAttribute(k, v);
    });
    kids.flat().forEach((c) => c != null && c !== false && e.append(c));
    return e;
  };
  const money = (n) => "$" + Number(n || 0).toLocaleString("en-US");
  const kb = (chars) => (chars > 1024 * 1024 ? (chars / 1024 / 1024).toFixed(1) + " MB" : Math.max(1, Math.round(chars / 1024)) + " KB");

  /* ---------- Estado: borrador y aviso de cambios ---------- */
  const stateEl = $("#state");
  let saveTimer = 0, draftOk = true;
  const saveDraft = () => {
    const json = JSON.stringify(D);
    try {
      if (json === PUBLISHED) localStorage.removeItem(DRAFT_KEY); else localStorage.setItem(DRAFT_KEY, json);
      draftOk = true;
    } catch (e) { draftOk = false; }
    const dirty = json !== PUBLISHED;
    stateEl.className = "top__state" + (!draftOk ? " is-bad" : dirty ? " is-dirty" : "");
    stateEl.textContent = !draftOk
      ? "Las fotos subidas pesan demasiado para la vista previa. Usa fotos más ligeras o guarda ya."
      : dirty ? "Cambios sin publicar · " + kb(json.length) : "Sin cambios";
    return json;
  };
  const changed = () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveDraft, 250); };

  /* ---------- Campos ---------- */
  const wrap = (f, control, extra) =>
    h("label", { class: "fld" + (f.w ? " fld--" + f.w : "") }, h("span", { class: "fld__l" }, f.label), control, f.hint ? h("small", { class: "fld__h" }, f.hint) : null, extra);

  const TYPES = {
    text(o, f) {
      const i = h("input", { type: "text", placeholder: f.ph, autocomplete: "off" });
      i.value = o[f.key] == null ? "" : o[f.key];
      i.addEventListener("input", () => { o[f.key] = i.value; changed(); });
      return wrap(f, i);
    },
    area(o, f) {
      const i = h("textarea", { placeholder: f.ph, rows: f.rows || 3 });
      i.value = o[f.key] == null ? "" : o[f.key];
      i.addEventListener("input", () => { o[f.key] = i.value; changed(); });
      return wrap(f, i);
    },
    num(o, f) {
      const i = h("input", { type: "number", min: 0, step: f.step || 1, inputmode: "numeric", placeholder: f.ph });
      i.value = o[f.key] || o[f.key] === 0 ? o[f.key] : "";
      i.addEventListener("input", () => { o[f.key] = Number(i.value) || 0; changed(); });
      return wrap(f, i);
    },
    check(o, f) {
      const i = h("input", { type: "checkbox" });
      i.checked = !!o[f.key];
      i.addEventListener("change", () => { o[f.key] = i.checked; changed(); });
      return h("label", { class: "fld check" + (f.w ? " fld--" + f.w : "") }, i, h("span", { class: "fld__l" }, f.label));
    },
    select(o, f) {
      const opts = typeof f.options === "function" ? f.options() : f.options;
      const s = h("select", null, opts.map(([v, t]) => h("option", { value: v }, t)));
      s.value = o[f.key] == null ? "" : o[f.key];
      if (s.selectedIndex < 0 && opts.length) { s.selectedIndex = 0; }
      s.addEventListener("change", () => { o[f.key] = f.number ? Number(s.value) : s.value; changed(); });
      return wrap(f, s);
    },
    // Varias opciones a la vez (se guardan como lista)
    tags(o, f) {
      const cur = new Set(Array.isArray(o[f.key]) ? o[f.key] : []);
      const box = h("div", { class: "tags" }, f.options.map(([v, t]) => {
        const i = h("input", { type: "checkbox" });
        i.checked = cur.has(v);
        i.addEventListener("change", () => { i.checked ? cur.add(v) : cur.delete(v); o[f.key] = f.options.map(([x]) => x).filter((x) => cur.has(x)); changed(); });
        return h("label", null, i, h("span", null, t));
      }));
      return h("div", { class: "fld" }, h("span", { class: "fld__l" }, f.label), box, f.hint ? h("small", { class: "fld__h" }, f.hint) : null);
    },
    // Un renglón por elemento (se guarda como lista de textos)
    lines(o, f) {
      const i = h("textarea", { placeholder: f.ph, rows: f.rows || 5 });
      i.value = (Array.isArray(o[f.key]) ? o[f.key] : []).join("\n");
      i.addEventListener("input", () => { o[f.key] = i.value.split("\n").map((l) => l.trim()).filter(Boolean); changed(); });
      return wrap(f, i);
    },
    // Tabla comparativa: un valor por cada renglón definido en "Más de paquetes"
    kv(o, f) {
      const obj = o[f.key] && typeof o[f.key] === "object" ? o[f.key] : (o[f.key] = {});
      const rows = (D.paquetes && D.paquetes.comparar) || [];
      const box = h("div", { class: "kv" }, rows.map((label) => {
        const i = h("input", { type: "text", placeholder: "—" });
        i.value = obj[label] || "";
        i.addEventListener("input", () => { obj[label] = i.value; changed(); });
        return h("label", null, label, i);
      }));
      return h("div", { class: "fld" }, h("span", { class: "fld__l" }, f.label), box, f.hint ? h("small", { class: "fld__h" }, f.hint) : null);
    },
    img(o, f) {
      const pic = h("div", { class: "imgf__pic" });
      const input = h("input", { type: "text", autocomplete: "off" });
      const file = h("input", { type: "file", accept: "image/*", hidden: true });
      const sync = () => {
        const v = o[f.key] || "", up = /^data:/.test(v);
        input.value = up ? "" : v;
        input.placeholder = up ? "Foto subida desde este dispositivo (" + kb(v.length * 0.75) + ")" : "assets/img/mi-foto.jpg o un enlace https://…";
        pic.replaceChildren(v ? h("img", { src: v, alt: "" }) : "Sin foto");
      };
      input.addEventListener("input", () => { o[f.key] = input.value.trim(); sync2(); changed(); });
      const sync2 = () => pic.replaceChildren(o[f.key] ? h("img", { src: o[f.key], alt: "" }) : "Sin foto");
      file.addEventListener("change", async () => {
        if (!file.files[0]) return;
        try { o[f.key] = await shrink(file.files[0]); sync(); changed(); if (f.onset) f.onset(); }
        catch (e) { alert("No se pudo leer esa imagen. Prueba con otra (JPG o PNG)."); }
        file.value = "";
      });
      sync();
      return h("div", { class: "fld" + (f.w ? " fld--" + f.w : "") }, h("span", { class: "fld__l" }, f.label),
        h("div", { class: "imgf" }, pic, h("div", null, input, h("div", { class: "imgf__row" },
          h("button", { type: "button", class: "b b--sm", onclick: () => file.click() }, "Subir foto"),
          h("button", { type: "button", class: "b b--sm", onclick: () => { o[f.key] = ""; sync(); changed(); } }, "Quitar")), file)),
        h("small", { class: "fld__h" }, f.hint || "Sube una foto desde tu celular o computadora, o escribe la ruta de una que ya esté en tu hosting."));
    },
    video(o, f) {
      const i = h("input", { type: "text", placeholder: "Pega aquí el enlace del video", autocomplete: "off", inputmode: "url" });
      const st = h("small", { class: "fld__h" });
      const sync = () => {
        const v = (o[f.key] || "").trim(), info = videoInfo(v);
        const ok = { yt: "YouTube: se reproduce dentro de tu página.", tk: "TikTok: se reproduce dentro de tu página.", ig: "Instagram: se reproduce dentro de tu página (debe ser público).", fb: "Facebook: se reproduce dentro de tu página (debe ser público).", file: "Archivo de video: debe estar subido en esa ruta de tu hosting." }[info.tipo];
        st.className = "fld__h" + (ok ? " is-ok" : v ? " is-warn" : "");
        st.textContent = !v ? "Acepta enlaces de YouTube (también Shorts), TikTok, Instagram y Facebook."
          : ok ? "✓ " + ok
          : info.corto ? "Ese es un enlace corto de TikTok. Abre el video en tu navegador y copia la dirección completa (termina en /video/ y números)."
          : "No reconozco este enlace: se mostrará como botón que abre el video en otra pestaña.";
      };
      i.value = o[f.key] || "";
      i.addEventListener("input", () => { o[f.key] = i.value.trim(); sync(); changed(); });
      sync();
      return h("label", { class: "fld" }, h("span", { class: "fld__l" }, f.label), i, st);
    },
    group(o, f) {
      const obj = o[f.key] && typeof o[f.key] === "object" ? o[f.key] : (o[f.key] = {});
      return h("div", { class: "group" }, h("h3", null, f.label), f.hint ? h("p", { class: "hint", style: "margin-bottom:.8rem" }, f.hint) : null, fieldset(obj, f.fields));
    },
    list(o, f) {
      const arr = Array.isArray(o[f.key]) ? o[f.key] : (o[f.key] = []);
      const box = h("div", { class: "list" });
      const draw = (openIdx) => {
        const cards = arr.map((it, i) => {
          const title = h("span", { class: "item__t" });
          const thumb = f.thumb ? h("img", { class: "item__thumb", alt: "" }) : null;
          const paint = () => {
            const [t, sub] = [].concat(f.title ? f.title(it, i) : "Elemento " + (i + 1));
            title.replaceChildren(t || "(sin nombre)", sub ? h("small", null, sub) : "");
            if (thumb) { const src = f.thumb(it); thumb.hidden = !src; if (src) thumb.src = src; }
          };
          const tool = (txt, label, fn, cls, off) => h("button", { type: "button", class: cls, title: label, "aria-label": label, disabled: off, onclick: (e) => { e.preventDefault(); e.stopPropagation(); fn(); } }, txt);
          const move = (d) => { arr.splice(i + d, 0, arr.splice(i, 1)[0]); changed(); draw(); };
          const tools = h("span", { class: "item__tools" },
            tool("↑", "Subir", () => move(-1), "", i === 0),
            tool("↓", "Bajar", () => move(1), "", i === arr.length - 1),
            f.fixed ? null : tool("⧉", "Duplicar", () => { const c = JSON.parse(JSON.stringify(it)); if (c.id) c.id = newId(c.id.split("-")[0]); arr.splice(i + 1, 0, c); changed(); draw(i + 1); }),
            f.fixed ? null : tool("✕", "Eliminar", () => { if (confirm("¿Eliminar \"" + ([].concat(f.title ? f.title(it, i) : "este elemento")[0] || "este elemento") + "\"?")) { arr.splice(i, 1); changed(); draw(); } }, "del"));
          const body = h("div", { class: "item__body" });
          const card = h("details", { class: "item", open: i === openIdx }, h("summary", null, thumb, title, tools), body);
          // El formulario de cada elemento se arma hasta que se abre (así el panel abre rápido)
          const fill = () => { if (!body.firstChild) body.append(fieldset(it, f.fields)); };
          if (i === openIdx) fill();
          card.addEventListener("toggle", () => { if (card.open) fill(); });
          body.addEventListener("input", paint);
          body.addEventListener("change", paint);
          paint();
          return card;
        });
        box.replaceChildren(...[
          f.label ? h("span", { class: "list__label" }, f.label) : null,
          f.hint ? h("small", { class: "fld__h" }, f.hint) : null,
          ...(cards.length ? cards : [h("p", { class: "list__empty" }, f.empty || "Todavía no hay nada aquí.")]),
          f.fixed ? null : h("button", { type: "button", class: "b list__add", onclick: () => { arr.push(f.nuevo ? f.nuevo() : {}); changed(); draw(arr.length - 1); } }, "+ " + (f.add || "Agregar")),
        ].filter(Boolean));
      };
      draw(-1);
      return box;
    },
  };
  const fieldset = (obj, fields) => h("div", { class: "fields" }, fields.map((f) => (TYPES[f.type || "text"] || TYPES.text)(obj, f)));
  const newId = (prefix) => prefix + "-" + Date.now().toString(36) + Math.floor(Math.random() * 1e3).toString(36);

  // Reduce una foto a un tamaño razonable y la deja lista para guardarse dentro de contenido.js
  const shrink = (file, max = 1400, quality = 0.82) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("imagen")); };
    img.src = url;
  });

  /* ---------- Qué se puede editar (una entrada por sección del panel) ---------- */
  const ICONOS = [["i-clock", "Reloj"], ["i-lock", "Candado"], ["i-dj", "Audífonos"], ["i-truck", "Camión"], ["i-doc", "Documento"], ["i-people", "Personas"], ["i-speaker", "Bocina"], ["i-pop", "Palomitas"], ["i-bubble", "Burbujas"], ["i-castle", "Castillo"], ["i-cart", "Carrito"], ["i-snack", "Snacks"], ["i-invite", "Invitación"], ["i-star", "Estrella"], ["i-check", "Palomita ✓"], ["i-cal", "Calendario"], ["i-pin", "Ubicación"], ["i-play", "Play"]];
  const INCLUYE = [["pantalla", "Pantalla"], ["sub", "Subwoofer"], ["shots", "Carrito de shots"], ["show", "Show o botarga"], ["palomitas", "Palomitas"]];
  const titleFields = (a, b) => [
    { key: "titulo", label: "Título", w: "half", ph: a },
    { key: "resaltado", label: "Parte resaltada del título", w: "half", ph: b },
  ];
  const videoFields = [
    { key: "url", label: "Enlace del video", type: "video" },
    { key: "titulo", label: "Título (se ve debajo del video)" },
    { key: "portada", label: "Portada (opcional)", type: "img", hint: "Imagen que se ve antes de reproducir. Si la dejas vacía, YouTube pone la suya; TikTok no necesita." },
  ];
  const videoList = (key, label, hint) => ({
    key, type: "list", label, hint, add: "Agregar video", empty: "Sin videos. Agrega uno y pega su enlace.",
    title: (v) => [v.titulo || (videoInfo(v.url).nombre || "Video nuevo"), v.url], fields: videoFields, nuevo: () => ({ titulo: "", url: "", portada: "" }),
  });
  const packName = (p) => (p.nombre || "") + (p.resaltado ? " " + p.resaltado : "");
  const packPrice = (p) => (+p.fijo ? money(p.fijo) : +p.sabado && +p.semana ? money(p.sabado) + " sábado · " + money(p.semana) + " dom a vie" : +p.semana ? money(p.semana) + " · solo dom a vie" : +p.sabado ? money(p.sabado) : "Sin precio");

  const SECTIONS = [
    { id: "inicio", titulo: "Inicio", custom: true },
    { sep: "Lo que vendes" },
    {
      id: "paquetes", titulo: "Paquetes", count: () => D.paquetes.lista.length, get: () => D.paquetes,
      help: "Toca un paquete para editarlo. Con las flechas cambias el orden en que aparecen; el precio y las personas también actualizan los filtros, el cotizador, el buscador y la tabla para comparar.",
      fields: [{
        key: "lista", type: "list", add: "Agregar paquete", thumb: (p) => p.miniatura || ((p.fotos || [])[0] || {}).foto,
        title: (p) => [packName(p), packPrice(p) + " · " + (p.personas || 0) + " personas"],
        nuevo: () => ({ id: newId("p"), grupo: D.paquetes.grupos[0].id, nombre: "Paquete nuevo", resaltado: "", capTexto: "Hasta", personas: 100, sabado: 0, semana: 0, fijo: 0, etiqueta: "", destacado: false, incluye: [], puntos: [], detalle: [], nota: "", miniatura: "", fotos: [], video: "", buscar: "", tabla: {} }),
        fields: [
          { key: "nombre", label: "Nombre", w: "half" },
          { key: "resaltado", label: "Segunda parte en azul (opcional)", w: "half", ph: "Plus, VIP, LED…" },
          { key: "grupo", label: "Grupo", type: "select", w: "half", options: () => D.paquetes.grupos.map((g) => [g.id, g.titulo]) },
          { key: "capTexto", label: "Personas: texto", type: "select", w: "half", options: [["Hasta", "Hasta"], ["Máximo", "Máximo"]] },
          { key: "personas", label: "Personas", type: "num", w: "third" },
          { key: "sabado", label: "Precio sábado", type: "num", w: "third", hint: "0 = no se renta en sábado" },
          { key: "semana", label: "Precio domingo a viernes", type: "num", w: "third" },
          { key: "fijo", label: "Precio único", type: "num", w: "half", hint: "Si lo llenas, se usa este y se ignoran los otros dos" },
          { key: "etiqueta", label: "Etiqueta (opcional)", w: "half", ph: "El más completo", hint: "Si no se renta en sábado y la dejas vacía, dice \"Solo domingo a viernes\"" },
          { key: "destacado", label: "Destacar este paquete (borde azul)", type: "check" },
          { key: "incluye", label: "¿Qué incluye? (para los filtros)", type: "tags", options: INCLUYE, hint: "El cliente filtra por esto en \"¿Qué quieres que incluya?\"" },
          { key: "puntos", label: "Lo principal (se ve en la tarjeta)", type: "lines", rows: 4, hint: "Un renglón por punto. Lo ideal son 3 a 5, cortos." },
          { key: "detalle", label: "Todo lo que incluye (se ve en \"Ver detalles\")", type: "lines", rows: 8, hint: "Un renglón por cosa. **así** queda en negritas, _así_ como nota gris, y si el renglón empieza con + se resalta en azul." },
          { key: "nota", label: "Nota extra (opcional)", ph: "Pantalla de **58\"** por **+$500**" },
          { key: "miniatura", label: "Foto de la tarjeta", type: "img" },
          { key: "fotos", type: "list", label: "Fotos de la ventana \"Ver detalles\"", add: "Agregar foto", thumb: (x) => x.foto, title: (x) => x.texto || "Foto", nuevo: () => ({ foto: "", texto: "" }),
            fields: [{ key: "foto", label: "Foto", type: "img" }, { key: "texto", label: "Texto debajo de la foto" }] },
          { key: "video", label: "Video del paquete (opcional)", type: "video" },
          { key: "buscar", label: "Palabras para el buscador (opcional)", ph: "tele karaoke bajos", hint: "Otras palabras con las que un cliente buscaría este paquete." },
          { key: "tabla", label: "Tabla para comparar", type: "kv", hint: "Solo se usa en los paquetes del primer grupo. Deja vacío lo que no tenga (se muestra —)." },
        ],
      }],
    },
    {
      id: "paquetes-mas", titulo: "Más de paquetes", get: () => D.paquetes,
      help: "Título de la sección, aviso de descuento, nombres de los dos grupos, lo que incluyen todos los paquetes y los renglones de la tabla para comparar.",
      fields: [
        ...titleFields("Elige el paquete", "para tu evento"),
        { key: "avisoFuerte", label: "Aviso: parte en negritas", ph: "$500 de descuento de domingo a viernes", hint: "Deja los dos campos del aviso vacíos para ocultarlo." },
        { key: "avisoTexto", label: "Aviso: resto del texto", type: "area", rows: 2 },
        { key: "grupos", type: "list", label: "Grupos de paquetes", fixed: true, title: (g) => g.titulo,
          fields: [{ key: "titulo", label: "Título del grupo" }, { key: "corto", label: "Nombre corto (acceso directo de la portada)" }, { key: "texto", label: "Descripción", type: "area", rows: 2 }] },
        { key: "incluyen", type: "list", label: "Todos los paquetes incluyen", add: "Agregar punto", title: (x) => [x.titulo, x.texto], nuevo: () => ({ icono: "i-check", titulo: "", texto: "" }),
          fields: [{ key: "titulo", label: "Título", w: "half" }, { key: "icono", label: "Icono", type: "select", options: ICONOS, w: "half" }, { key: "texto", label: "Texto" }] },
        { key: "comparar", label: "Renglones de la tabla para comparar", type: "lines", rows: 8, hint: "Un renglón por característica. Precio y personas se agregan solos. El valor de cada paquete se llena dentro del paquete." },
      ],
    },
    {
      id: "infantil", titulo: "Paquete infantil", get: () => D.infantil,
      help: "El paquete de fiestas infantiles que aparece en su propia sección.",
      fields: [
        { key: "mostrar", label: "Mostrar esta sección en la página", type: "check" },
        ...titleFields("Paquete", "Infantil"),
        { key: "precio", label: "Precio", type: "num", w: "half" },
        { key: "precioNota", label: "Texto junto al precio", w: "half", ph: "por 7 horas" },
        { key: "foto", label: "Foto", type: "img" },
        { key: "fotoAlt", label: "Descripción de la foto (para lectores de pantalla)" },
        { key: "puntos", type: "list", label: "Qué incluye", add: "Agregar punto", title: (x) => [x.titulo, x.texto], nuevo: () => ({ icono: "i-star", titulo: "", texto: "" }),
          fields: [{ key: "titulo", label: "Título", w: "half" }, { key: "icono", label: "Icono", type: "select", options: ICONOS, w: "half" }, { key: "texto", label: "Texto", type: "area", rows: 2 }] },
        { key: "opcion", label: "Nota final (opcional)", type: "area", rows: 2, hint: "**así** queda en negritas." },
        { key: "boton", label: "Texto del botón" },
      ],
    },
    {
      id: "adicionales", titulo: "Adicionales", count: () => D.adicionales.lista.length, get: () => D.adicionales,
      help: "Servicios que se agregan a cualquier paquete. Si un adicional no tiene foto, se muestra en formato ancho al final. Sin precio dice \"Precio al cotizar\".",
      fields: [
        ...titleFields("Complementa", "tu paquete"),
        { key: "nota", label: "Texto a un lado del título", type: "area", rows: 2 },
        { key: "lista", type: "list", label: "Adicionales", add: "Agregar adicional", thumb: (x) => x.foto, title: (x) => [x.nombre, +x.precio ? money(x.precio) : "Precio al cotizar"],
          nuevo: () => ({ id: newId("x"), nombre: "Adicional nuevo", texto: "", foto: "", fotoAlt: "", icono: "i-star", precio: 0, precioNota: "", promo: 0, promoNota: "", video: "", boton: "", mensaje: "", buscar: "" }),
          fields: [
            { key: "nombre", label: "Nombre" },
            { key: "texto", label: "Descripción", type: "area", rows: 2 },
            { key: "precio", label: "Precio", type: "num", w: "third", hint: "0 = \"Precio al cotizar\"" },
            { key: "precioNota", label: "Texto junto al precio", w: "third", ph: "Por 7 horas" },
            { key: "icono", label: "Icono (si no hay foto)", type: "select", options: ICONOS, w: "third" },
            { key: "promo", label: "Precio con descuento (opcional)", type: "num", w: "half" },
            { key: "promoNota", label: "Texto del descuento", w: "half", ph: "Descuento para clientes" },
            { key: "foto", label: "Foto", type: "img" },
            { key: "fotoAlt", label: "Descripción de la foto" },
            { key: "video", label: "Video (opcional)", type: "video" },
            { key: "boton", label: "Texto del botón de WhatsApp", w: "half", ph: "Lo quiero" },
            { key: "buscar", label: "Palabras para el buscador", w: "half", ph: "brincolín castillo" },
            { key: "mensaje", label: "Mensaje que llega a tu WhatsApp", type: "area", rows: 2, ph: "Hola, me interesa agregar…" },
          ] },
        { key: "shows", type: "group", label: "Tarjeta de shows y personajes", hint: "La tarjeta grande con foto. Cada personaje es un botón que abre su video.",
          fields: [
            { key: "titulo", label: "Título", hint: "Deja el título vacío para ocultar esta tarjeta." },
            { key: "texto", label: "Texto" },
            { key: "foto", label: "Foto de fondo", type: "img" },
            { key: "fotoAlt", label: "Descripción de la foto" },
            { key: "personajes", type: "list", label: "Personajes", add: "Agregar personaje", title: (x) => [x.nombre, x.video], nuevo: () => ({ nombre: "", video: "", portada: "" }),
              fields: [{ key: "nombre", label: "Nombre" }, { key: "video", label: "Video", type: "video" }, { key: "portada", label: "Portada (solo para archivos de video)", type: "img" }] },
            { key: "mensaje", label: "Mensaje de WhatsApp del botón \"Preguntar precio\"", type: "area", rows: 2 },
          ] },
      ],
    },
    { sep: "Fotos y videos" },
    {
      id: "videos", titulo: "Videos", count: () => D.galeria.videos.length + D.galeria.tiktoks.length, get: () => D.galeria,
      help: "Pega el enlace de un video y aparece en la galería de tu página. Funciona con YouTube (también Shorts), TikTok, Instagram y Facebook.",
      fields: [
        videoList("videos", "Pestaña \"Videos\"", "El primero de la lista es el primero que se ve."),
        videoList("tiktoks", "Pestaña \"TikTok\"", "Usa el enlace largo del video (termina en /video/ y números). Si dejas la lista vacía, la pestaña se oculta."),
      ],
    },
    {
      id: "fotos", titulo: "Fotos", count: () => D.galeria.fotos.length, get: () => D.galeria,
      help: "Las fotos de la galería. En celular se muestran las primeras 5 y un botón para ver el resto, así que pon primero las mejores.",
      fields: [
        ...titleFields("Nuestro equipo", "en tu evento"),
        { key: "fotos", type: "list", label: "Fotos de la galería", add: "Agregar foto", thumb: (x) => x.foto, title: (x) => [x.texto || "Foto", { w: "Grande", s: "Chica", m: "Mediana" }[x.tam] || ""],
          nuevo: () => ({ foto: "", texto: "", tam: "s" }),
          fields: [{ key: "foto", label: "Foto", type: "img" }, { key: "texto", label: "Texto sobre la foto", w: "half" }, { key: "tam", label: "Tamaño en computadora", type: "select", w: "half", options: [["s", "Chica (vertical)"], ["m", "Mediana"], ["w", "Grande (horizontal)"]] }] },
      ],
    },
    {
      id: "resenas", titulo: "Reseñas", count: () => D.resenas.lista.length, get: () => D.resenas,
      help: "Copia aquí las reseñas reales de tu perfil de Google Maps: nombre, estrellas y texto, tal como las escribió tu cliente. Aparecen junto al botón que lleva a Google.",
      fields: [
        { key: "titulo", label: "Título" },
        { key: "texto", label: "Texto", type: "area", rows: 2 },
        { key: "boton", label: "Texto del botón a Google", ph: "Ver opiniones en Google" },
        { key: "lista", type: "list", label: "Reseñas", add: "Agregar reseña", empty: "Todavía no hay reseñas pegadas: en la página solo se ve el botón a Google.",
          title: (r) => [r.nombre || "Reseña nueva", "★".repeat(Math.max(1, Math.min(5, +r.estrellas || 5))) + (r.texto ? " · " + r.texto : "")],
          nuevo: () => ({ nombre: "", estrellas: 5, fecha: "", texto: "" }),
          fields: [
            { key: "nombre", label: "Nombre del cliente", w: "half" },
            { key: "estrellas", label: "Estrellas", type: "select", number: true, w: "third", options: [[5, "★★★★★ 5"], [4, "★★★★ 4"], [3, "★★★ 3"], [2, "★★ 2"], [1, "★ 1"]] },
            { key: "fecha", label: "Cuándo (opcional)", ph: "Hace 2 meses / Marzo 2026" },
            { key: "texto", label: "Lo que escribió", type: "area", rows: 4 },
          ] },
      ],
    },
    { sep: "Textos" },
    {
      id: "portada", titulo: "Portada", get: () => D.portada,
      help: "Lo primero que ve el cliente al abrir la página.",
      fields: [
        ...titleFields("Música, ambiente y diversión", "en tus eventos"),
        { key: "texto", label: "Texto debajo del título", type: "area", rows: 3 },
        { key: "foto", label: "Foto de fondo", type: "img" },
      ],
    },
    {
      id: "apartar", titulo: "Cómo apartar", get: () => D.apartar,
      help: "Los pasos para reservar y los videos que lo explican.",
      fields: [
        ...titleFields("Tu fecha segura", "en 4 pasos"),
        { key: "pasos", type: "list", label: "Pasos", add: "Agregar paso", title: (x, i) => [(i + 1) + ". " + (x.titulo || ""), x.texto], nuevo: () => ({ titulo: "", texto: "" }),
          fields: [{ key: "titulo", label: "Título" }, { key: "texto", label: "Texto", type: "area", rows: 2 }] },
        { key: "videoTitulo", label: "Título del bloque de videos", w: "half" },
        { key: "videoResaltado", label: "Segunda línea del título", w: "half" },
        { key: "videoTexto", label: "Texto del bloque de videos", type: "area", rows: 2 },
        videoList("videos", "Videos de cómo apartar", "Lo ideal son 1 o 2. Sin videos, el bloque se oculta."),
      ],
    },
    {
      id: "preguntas", titulo: "Preguntas", count: () => D.preguntas.lista.length, get: () => D.preguntas,
      help: "Preguntas frecuentes. El buscador de la página también las encuentra.",
      fields: [
        ...titleFields("Resolvemos", "tus dudas"),
        { key: "lista", type: "list", label: "Preguntas", add: "Agregar pregunta", title: (x) => [x.p || "Pregunta nueva", x.r], nuevo: () => ({ p: "", r: "" }),
          fields: [{ key: "p", label: "Pregunta" }, { key: "r", label: "Respuesta", type: "area", rows: 3 }] },
      ],
    },
    {
      id: "contacto", titulo: "Contacto", get: () => D.contacto,
      help: "El bloque azul del final de la página.",
      fields: [{ key: "lema", label: "Frase pequeña de arriba" }, ...titleFields("Aparta tu fecha", "con $500"), { key: "texto", label: "Texto" }],
    },
    { sep: "Ajustes" },
    {
      id: "negocio", titulo: "Datos y redes", get: () => D.negocio,
      help: "Tu número, tu zona y los enlaces de tus redes. Si dejas una red vacía, su botón no aparece.",
      fields: [
        { key: "whatsapp", label: "WhatsApp (con 52 al inicio, solo números)", w: "half", ph: "527771234567", hint: "A este número llegan todos los mensajes de la página." },
        { key: "telefono", label: "Teléfono como se muestra", w: "half", ph: "777 123 4567" },
        { key: "zona", label: "Zona que cubres" },
        { key: "facebook", label: "Facebook (enlace)" },
        { key: "instagram", label: "Instagram (enlace)" },
        { key: "tiktok", label: "TikTok (enlace del perfil)", w: "half" },
        { key: "tiktokUsuario", label: "Usuario de TikTok", w: "half", ph: "@usuario" },
        { key: "maps", label: "Google Maps (enlace de tu negocio)", hint: "También es el enlace del botón de reseñas." },
        { key: "pie", label: "Nota del pie de página", type: "area", rows: 2 },
      ],
    },
    {
      id: "cotizador", titulo: "Cotizador", count: () => D.cotizador.length, get: () => D,
      help: "Las casillas de \"¿Quieres agregar algo más?\" que ve el cliente al cotizar un paquete.",
      fields: [{
        key: "cotizador", type: "list", add: "Agregar opción", title: (x) => [x.nombre || "Opción nueva", x.nota], nuevo: () => ({ nombre: "", nota: "", mensaje: "", noEn: "", soloEn: "" }),
        fields: [
          { key: "nombre", label: "Nombre", w: "half" },
          { key: "nota", label: "Nota pequeña (precio, duración…)", w: "half", ph: "$750 · carrito y 150 vasos" },
          { key: "mensaje", label: "Cómo aparece en el mensaje de WhatsApp (opcional)", ph: "Carrito de shots LED ($750)", hint: "Si lo dejas vacío se usa el nombre." },
          { key: "noEn", label: "No ofrecerlo en estos paquetes", w: "half", ph: "Experience|Élite VIP", hint: "Nombres exactos separados por | (porque ya lo incluyen)." },
          { key: "soloEn", label: "Ofrecerlo solo en este paquete", w: "half", ph: "Élite Plus" },
        ],
      }],
    },
  ];

  /* ---------- Pantallas ---------- */
  const side = $("#side"), main = $("#main");
  let current = "inicio";

  const drawSide = () => side.replaceChildren(...SECTIONS.map((s) => s.sep
    ? h("p", { class: "side__sep" }, s.sep)
    : h("button", { type: "button", class: s.id === current ? "is-on" : "", onclick: () => show(s.id) }, s.titulo, s.count ? h("small", null, String(s.count())) : null)));

  const home = () => {
    const quick = [["videos", "Agregar un video", "Pega el enlace de YouTube, TikTok, Instagram o Facebook."], ["paquetes", "Editar un paquete", "Precio, personas, lo que incluye y fotos."], ["adicionales", "Editar adicionales", "Shots, palomitas, inflable, shows…"], ["resenas", "Pegar reseñas", "Copia las de tu perfil de Google Maps."], ["fotos", "Cambiar fotos", "Sube fotos nuevas a la galería."], ["preguntas", "Preguntas frecuentes", "Agrega o corrige respuestas."]];
    return [
      h("h1", null, "Panel de tu página"),
      h("p", { class: "main__help" }, "Desde aquí cambias todo lo que se ve en tu página: paquetes, precios, videos, fotos, reseñas y textos."),
      hadDraft ? h("p", { class: "note" }, "Tienes cambios guardados en este dispositivo que todavía no publicas. Sigue editando, o descártalos con el botón de abajo.") : null,
      h("div", { class: "cards" }, quick.map(([id, t, d]) => h("button", { type: "button", class: "card", onclick: () => show(id) }, h("b", null, t), h("span", null, d)))),
      h("h2", null, "Cómo funciona"),
      h("ol", { class: "steps" },
        h("li", null, h("b", null, "Edita. "), "Elige una sección del menú y cambia lo que necesites. Todo se va guardando solo en este dispositivo como borrador."),
        h("li", null, h("b", null, "Revisa. "), "Con \"Vista previa\" ves tu página con los cambios, sin que nadie más los vea."),
        useFirebase
          ? h("li", null, h("b", null, "Publica. "), "Con \"Publicar\" los cambios se guardan en Firebase y tu página los muestra de inmediato, sin subir archivos.")
          : h("li", null, h("b", null, "Publica. "), "Con \"Guardar cambios\" se descarga un archivo contenido.js. Súbelo a tu hosting reemplazando el anterior y listo.")),
      useFirebase && neverPublished ? h("p", { class: "note" }, "Firebase todavía no tiene tu contenido. Pulsa \"Publicar\" una vez para subirlo; a partir de ahí la página lo lee de Firebase.") : null,
      useFirebase
        ? h("p", { class: "note note--info" }, "Sesión iniciada como " + ((user && user.email) || "") + ". Solo los correos autorizados en las reglas de Firebase pueden publicar.")
        : h("p", { class: "note note--info" }, "Firebase no está configurado (firebase-config.js vacío), así que el panel trabaja sin contraseña y solo genera un archivo: la página cambia cuando subes ese archivo a tu hosting."),
      h("h2", null, "Respaldo"),
      h("p", { class: "hint" }, "Descarga una copia de tu contenido de vez en cuando. También puedes cargar una copia guardada para seguir desde ahí."),
      h("div", { class: "row" },
        useFirebase ? h("button", { type: "button", class: "b", onclick: download }, "Descargar respaldo") : null,
        h("button", { type: "button", class: "b", onclick: () => $("#fileImport").click() }, "Cargar un contenido.js"),
        h("button", { type: "button", class: "b b--bad", onclick: discard }, "Descartar mis cambios"),
        useFirebase ? h("button", { type: "button", class: "b", onclick: () => fb && fb.A.signOut(fb.auth) }, "Cerrar sesión") : null),
    ];
  };

  function show(id) {
    const s = SECTIONS.find((x) => x.id === id) || SECTIONS[0];
    current = s.id;
    drawSide();
    main.replaceChildren(...(s.custom ? home() : [h("h1", null, s.titulo), h("p", { class: "main__help" }, s.help), fieldset(s.get(), s.fields)]).filter(Boolean));
    scrollTo(0, 0);
    const on = $(".is-on", side);
    if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest", inline: "center" });
    try { history.replaceState(null, "", "#" + s.id); } catch (e) { /* archivo local */ }
  }
  // Los contadores del menú se actualizan al agregar o quitar elementos
  main.addEventListener("click", () => setTimeout(() => {
    SECTIONS.forEach((s, i) => { const b = side.children[i], n = b && b.querySelector("small"); if (s.count && n) n.textContent = String(s.count()); });
  }, 0));

  /* ---------- Acciones ---------- */
  function discard() {
    if (!confirm("¿Descartar todos los cambios que no has publicado? El panel volverá a lo que está en tu página.")) return;
    D = JSON.parse(PUBLISHED); hadDraft = false;
    saveDraft(); show("inicio");
  }

  $("#btnPreview").addEventListener("click", () => {
    clearTimeout(saveTimer);
    saveDraft();
    if (!draftOk) { alert("La vista previa no puede cargar porque las fotos subidas pesan demasiado. Tus cambios siguen aquí: puedes guardarlos con \"Guardar cambios\"."); return; }
    window.open("index.html?borrador=1", "mendoza-vista");
  });

  const fileText = () => "/* Contenido de la página de Mendoza Sonido y DJ.\n   Este archivo lo genera el panel (admin.html): ábrelo, edita, descarga el nuevo\n   contenido.js y reemplaza este archivo en tu hosting.\n   Guardado: " + new Date().toLocaleString("es-MX") + " */\nwindow.SITIO = " + JSON.stringify(D, null, 2) + ";\n";
  function download() {
    clearTimeout(saveTimer);
    saveDraft();
    const a = h("a", { href: URL.createObjectURL(new Blob([fileText()], { type: "text/javascript;charset=utf-8" })), download: "contenido.js" });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    if (useFirebase) return; // con Firebase es solo un respaldo: no hay que subirlo
    const dlg = $("#dlgSave");
    if (dlg.showModal) dlg.showModal(); else alert("Se descargó contenido.js. Súbelo a tu hosting reemplazando el anterior.");
  }
  $("#dlgSaveOk").addEventListener("click", () => $("#dlgSave").close());

  /* ---------- Firebase: inicio de sesión y publicar ----------
     Usa Authentication (correo y contraseña) y Realtime Database.
     El contenido completo se guarda como texto en /sitio/json; la página lo lee con cargar.js. */
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  let fb = null, user = null;
  const fbLoad = async () => {
    if (fb) return fb;
    const [app, auth, db] = await Promise.all([import(SDK + "firebase-app.js"), import(SDK + "firebase-auth.js"), import(SDK + "firebase-database.js")]);
    const a = app.initializeApp(FB);
    fb = { A: auth, R: db, auth: auth.getAuth(a), db: db.getDatabase(a) };
    return fb;
  };
  const authMsg = (e) => {
    const c = String((e && e.code) || "");
    if (/invalid-credential|wrong-password|user-not-found|invalid-email|missing-password/.test(c)) return "Correo o contraseña incorrectos.";
    if (/too-many-requests/.test(c)) return "Demasiados intentos. Espera unos minutos y vuelve a intentar.";
    if (/network-request-failed/.test(c)) return "Sin conexión a internet.";
    if (/api-key|configuration|operation-not-allowed/.test(c)) return "Firebase no está bien configurado: revisa firebase-config.js y que el acceso con correo y contraseña esté activado.";
    return "No se pudo entrar. " + ((e && e.message) || "");
  };
  const setState = (msg, cls) => { stateEl.className = "top__state" + (cls ? " " + cls : ""); stateEl.textContent = msg; };

  async function publish() {
    const btn = $("#btnSave");
    clearTimeout(saveTimer);
    const json = saveDraft();
    if (json === PUBLISHED && !neverPublished) { setState("No hay cambios por publicar"); return; }
    if (json.length > 9 * 1024 * 1024) { alert("El contenido pesa " + kb(json.length) + " y el límite es de 9 MB. Quita algunas fotos subidas desde el panel o usa fotos más ligeras."); return; }
    btn.disabled = true; btn.textContent = "Publicando…";
    try {
      const { R, db } = await fbLoad();
      await R.set(R.ref(db, "sitio"), { json, actualizado: R.serverTimestamp(), por: (user && user.email) || "" });
      PUBLISHED = json; neverPublished = false; hadDraft = false;
      saveDraft();
      setState("Publicado: tu página ya tiene los cambios", "is-ok");
    } catch (e) {
      alert(/permission/i.test(String((e && (e.code || e.message)) || ""))
        ? "Firebase no dejó guardar: este correo no tiene permiso para publicar. Revisa que las reglas de la base de datos (database.rules.json) tengan exactamente tu correo."
        : "No se pudo publicar. Revisa tu conexión e inténtalo de nuevo.\n\n" + ((e && e.message) || ""));
    }
    btn.disabled = false; btn.textContent = "Publicar";
  }
  $("#btnSave").addEventListener("click", () => (useFirebase ? publish() : download()));

  // Cargar un contenido.js guardado antes (por ejemplo, editado en otro dispositivo)
  $("#fileImport").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const t = await f.text();
      const data = JSON.parse(t.slice(t.indexOf("{", t.indexOf("window.SITIO") >= 0 ? t.indexOf("window.SITIO") : 0), t.lastIndexOf("}") + 1));
      if (!data.paquetes || !data.negocio) throw new Error("formato");
      D = data; saveDraft(); show("inicio");
      alert("Listo: se cargó ese archivo. Revisa y publica cuando quieras.");
    } catch (err) { alert("Ese archivo no parece un contenido.js de esta página."); }
  });

  // Avisa si se cierra la pestaña con el borrador sin guardar por falta de espacio
  addEventListener("beforeunload", (e) => { if (!draftOk) { e.preventDefault(); e.returnValue = ""; } });

  addEventListener("hashchange", () => { const id = (location.hash || "").slice(1); if (id && id !== current) show(id); });

  /* ---------- Arranque ---------- */
  const loginBox = $("#login"), layout = $(".layout"), actions = $(".top__actions");
  const start = () => {
    loginBox.hidden = true; layout.hidden = false; actions.hidden = false;
    saveDraft();
    show((location.hash || "").slice(1) || "inicio");
  };

  if (!useFirebase) start();
  else {
    // Con Firebase: primero inicio de sesión, luego se carga lo publicado
    const form = $("#loginForm"), msg = $("#loginMsg");
    const say = (t, bad) => { msg.textContent = t; msg.className = "login__msg" + (bad ? " is-bad" : ""); };
    const locked = () => { layout.hidden = true; actions.hidden = true; loginBox.hidden = false; setState(""); };
    $("#btnSave").textContent = "Publicar";
    locked(); form.hidden = true; say("Conectando…");
    fbLoad().then(({ A, R, auth, db }) => {
      A.onAuthStateChanged(auth, async (u) => {
        user = u;
        if (!u) { locked(); form.hidden = false; say(""); return; }
        form.hidden = true; say("Cargando tu contenido…");
        try {
          const snap = await R.get(R.ref(db, "sitio/json"));
          const v = snap.exists() ? snap.val() : "";
          if (typeof v === "string" && v && JSON.parse(v).paquetes) { PUBLISHED = v; neverPublished = false; }
          else neverPublished = true; // aún no se publica nada: se parte de contenido.js
        } catch (e) { neverPublished = false; alert("No se pudo leer lo publicado en Firebase. Se muestra el contenido de respaldo; revisa tu conexión antes de publicar."); }
        loadDraft();
        say("");
        start();
      });
    }).catch(() => { form.hidden = true; say("No se pudo conectar con Firebase. Revisa tu conexión y el archivo firebase-config.js.", true); });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!fb) return;
      say("Entrando…");
      try { await fb.A.signInWithEmailAndPassword(fb.auth, $("#loginMail").value.trim(), $("#loginPass").value); $("#loginPass").value = ""; }
      catch (err) { say(authMsg(err), true); }
    });
    $("#loginReset").addEventListener("click", async () => {
      const mail = $("#loginMail").value.trim();
      if (!fb || !mail) { say("Escribe tu correo arriba y vuelve a tocar este enlace.", true); return; }
      try { await fb.A.sendPasswordResetEmail(fb.auth, mail); say("Te enviamos un correo para cambiar tu contraseña."); }
      catch (err) { say(authMsg(err), true); }
    });
  }
})();
