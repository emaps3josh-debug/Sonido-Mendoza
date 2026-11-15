/* ===== Mendoza Sonido y DJ: carga el contenido y arranca la página =====
   1. Si Firebase está configurado (firebase-config.js), trae lo último que publicaste en el panel.
   2. Si Firebase no responde, usa la última copia guardada en este navegador.
   3. Si no hay nada de lo anterior, usa contenido.js (el contenido de respaldo).
   Después carga render.js (dibuja la página) y script.js (menú, filtros, buscador). */
(async () => {
  const cfg = window.FIREBASE_CONFIG || {};
  const CACHE_KEY = "mendoza-publicado";
  const valid = (d) => d && typeof d === "object" && d.paquetes && d.negocio;

  // La vista previa del panel (?borrador) usa el borrador de este navegador: no hace falta pedir nada
  let hasDraft = false;
  try { hasDraft = new URLSearchParams(location.search).has("borrador") && !!localStorage.getItem("mendoza-borrador"); } catch (e) { /* sin almacenamiento */ }

  if (cfg.databaseURL && !hasDraft) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 5000); // si tarda más de 5 s, se usa el respaldo
      const res = await fetch(String(cfg.databaseURL).replace(/\/+$/, "") + "/sitio/json.json", { signal: ctl.signal, cache: "no-store" });
      clearTimeout(timer);
      if (!res.ok) throw new Error("Firebase respondió " + res.status);
      const json = await res.json(); // el contenido completo, guardado como texto
      if (typeof json === "string" && json) {
        const data = JSON.parse(json);
        if (valid(data)) {
          window.SITIO = data;
          try { localStorage.setItem(CACHE_KEY, json); } catch (e) { /* sin espacio: no pasa nada */ }
        }
      }
    } catch (err) {
      try {
        const data = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (valid(data)) window.SITIO = data;
      } catch (e) { /* se queda contenido.js */ }
    }
  }

  for (const src of ["render.js", "script.js"]) {
    await new Promise((done) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = s.onerror = done;
      document.body.appendChild(s);
    });
  }
})();
