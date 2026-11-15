/* ===== Mendoza Sonido y DJ (v26) =====
   El contenido (textos, precios, fotos, videos) viene de contenido.js y lo dibuja render.js.
   Aquí solo está el comportamiento: menú, filtros, buscador, cotizador y ventanas. */

const SITIO = window.SITIO || {};
// El número de WhatsApp se cambia en el panel (Datos del negocio)
const WHATSAPP = String((SITIO.negocio || {}).whatsapp || "527776242702").replace(/\D/g, "");

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const waLink = (text) => "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(text);
const money = (n) => "$" + n.toLocaleString("en-US");
const digits = (el) => (el ? +el.textContent.replace(/\D/g, "") : 0);

/* ---------- Enlaces de WhatsApp con mensaje listo ---------- */
$$("[data-wa]").forEach((a) => {
  a.href = waLink(a.dataset.wa);
  a.target = "_blank";
  a.rel = "noopener";
});
// Respaldo: si el cotizador no abre, el botón del paquete manda directo a WhatsApp
$$("a[data-pack]:not([data-wa])").forEach((a) => {
  a.href = waLink("Hola, me interesa el Paquete " + a.dataset.pack.toUpperCase() + ". Mi evento es el día: ");
});

/* ---------- Menú ---------- */
const nav = $("#nav"), toggle = $("#navToggle"), links = $("#navLinks");
const setMenu = (open) => {
  links.classList.toggle("is-open", open);
  toggle.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", open);
  toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
};
toggle.addEventListener("click", () => setMenu(!links.classList.contains("is-open")));
$$("a", links).forEach((a) => a.addEventListener("click", () => setMenu(false)));
$$("#dock a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

/* ---------- Barra de progreso y menú sólido ---------- */
const progress = $("#progress");
const onScroll = () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = "scaleX(" + (max > 0 ? scrollY / max : 0) + ")";
  nav.classList.toggle("is-solid", scrollY > 20);
};
onScroll();
addEventListener("scroll", onScroll, { passive: true });

/* ---------- Sección activa en el menú y en la barra inferior ---------- */
if ("IntersectionObserver" in window) {
  const map = new Map();
  $$('.nav__links a[href^="#"], .dock a[href^="#"]').forEach((a) => {
    const id = a.getAttribute("href").slice(1);
    if (id) map.set(id, [...(map.get(id) || []), a]);
  });
  const spy = new IntersectionObserver(
    (es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      map.forEach((as) => as.forEach((a) => a.classList.remove("is-current")));
      (map.get(e.target.id) || []).forEach((a) => a.classList.add("is-current"));
    }),
    { rootMargin: "-45% 0px -50% 0px" }
  );
  // #inicio se observa para apagar la marca al volver arriba
  ["inicio", ...map.keys()].forEach((id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
}

/* ---------- Aparición al hacer scroll (solo lo que está fuera de pantalla) ---------- */
if ("IntersectionObserver" in window && !reduceMotion) {
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }),
    { threshold: 0.06, rootMargin: "0px 0px -6% 0px" }
  );
  const groups = [".head", ".jump a", ".incl", ".finder", ".pgroup__head", ".pack", ".compare", ".pvideos", ".reviews", ".kids__photo", ".kids__body",
    ".extra", ".g", ".v", ".steps li", ".faq details", ".cta__box"];
  $$(groups.join(",")).forEach((el) => {
    if (el.getBoundingClientRect().top < innerHeight * 0.95) return; // ya visible: no se oculta
    const sibs = [...el.parentElement.children];
    el.style.setProperty("--d", Math.min(sibs.indexOf(el), 5) * 60 + "ms");
    el.classList.add("rv");
    io.observe(el);
  });
  // Respaldo: si algo falla, todo queda visible
  setTimeout(() => $$(".rv:not(.is-in)").forEach((el) => {
    if (el.getBoundingClientRect().top < innerHeight) el.classList.add("is-in");
  }), 2500);
}

/* Lleva la vista a un elemento y lo resalta un momento */
const flash = (el) => {
  if (!el) return;
  el.classList.add("is-in");
  el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  el.classList.remove("is-found");
  void el.offsetWidth; // reinicia la animación
  el.classList.add("is-found");
  setTimeout(() => el.classList.remove("is-found"), 2600);
};

/* ---------- Paquetes: precios y filtros ----------
   Los precios y el número de personas se leen de index.html (no hay que repetirlos aquí):
   - <b data-p="sab"> precio en sábado, <b data-p="sem"> precio de domingo a viernes,
     <b data-p="fijo"> un solo precio cualquier día.
   - Personas: el número de la línea "pack__cap".
   - data-tags del paquete: lo que incluye, para el filtro "¿Qué quieres que incluya?". */
const PACKS = $$(".pack").map((card) => ({
  card,
  name: $("h4", card).textContent.trim(),
  cap: digits($(".pack__cap", card)),
  sab: digits($('[data-p="sab"]', card)),
  sem: digits($('[data-p="sem"]', card)),
  fijo: digits($('[data-p="fijo"]', card)),
  tags: (card.dataset.tags || "").split(" ").filter(Boolean),
}));
const packOf = (card) => PACKS.find((p) => p.card === card);

// Precio que se muestra en la tarjeta según el día elegido ("sab", "sem" o "" sin elegir)
const drawCost = (p, day) => {
  let n, when, alt = "", no = false;
  if (p.fijo) { n = p.fijo; when = "5 hrs + 2 de regalo · 7 horas"; }
  else if (!p.sab) { n = p.sem; when = "Domingo a viernes · 7 horas"; alt = "No disponible en sábado"; no = true; }
  else if (day === "sem") { n = p.sem; when = "Domingo a viernes · 7 horas"; alt = "En sábado <b>" + money(p.sab) + "</b>"; }
  else { n = p.sab; when = "Sábado · 7 horas"; alt = "Domingo a viernes <b>" + money(p.sem) + "</b>"; }
  $(".pack__cost", p.card).innerHTML =
    '<p class="pack__price"><sup>$</sup>' + n.toLocaleString("en-US") + "<small>" + when + "</small></p>" +
    (alt ? '<p class="pack__alt' + (no ? " pack__alt--no" : "") + '">' + alt + "</p>" : "");
};

const finder = $("#finder");
const fInputs = $$("input", finder);
const fValue = (name) => (fInputs.find((i) => i.name === name && i.checked) || {}).value || "";
const INC_NAMES = { pantalla: "pantalla", sub: "subwoofer", shots: "carrito de shots", show: "show o botarga", palomitas: "palomitas" };
const joinList = (a) => (a.length > 1 ? a.slice(0, -1).join(", ") + " y " + a[a.length - 1] : a[0] || "");

const applyFilter = () => {
  const inv = +fValue("inv") || 0, day = fValue("dia");
  const wants = fInputs.filter((i) => i.name === "inc" && i.checked).map((i) => i.value);
  const active = !!(inv || day || wants.length);
  const shown = [], noSat = [];
  PACKS.forEach((p) => {
    const okCap = !inv || p.cap >= inv;
    const okInc = wants.every((t) => p.tags.includes(t));
    const okDay = !(day === "sab" && !p.sab && !p.fijo);
    if (okCap && okInc && !okDay) noSat.push(p.name);
    const ok = okCap && okInc && okDay;
    p.card.hidden = !ok;
    if (active) p.card.classList.add("is-in");
    drawCost(p, day);
    if (ok) shown.push(p);
  });
  // "A la medida": los paquetes cuya capacidad queda más justa para los invitados
  const best = inv && shown.length ? Math.min(...shown.map((p) => p.cap)) : 0;
  const mixed = shown.some((p) => p.cap !== best);
  PACKS.forEach((p) => p.card.classList.toggle("is-rec", !!best && mixed && !p.card.hidden && p.cap === best));
  $$(".pgroup").forEach((g) => { g.hidden = !$$(".pack", g).some((c) => !c.hidden); });

  const n = shown.length;
  $("#fCount").textContent = (n === 1 ? "1 paquete" : n + " paquetes") + (active ? " para tu evento" : "");
  const note = [];
  if (!active) note.push("Del más sencillo al más completo.");
  if (day === "sem") note.push("Precios de domingo a viernes.");
  if (day === "sab") note.push("Precios de sábado.");
  if (noSat.length) note.push(joinList(noSat) + (noSat.length > 1 ? " solo se rentan" : " solo se renta") + " de domingo a viernes.");
  $("#fNote").textContent = note.join(" ");
  $("#fReset").hidden = !active;
  $("#fEmpty").hidden = n > 0;
  if (!n) {
    const want = [];
    if (inv) want.push("para " + (inv === 100 ? "hasta 100" : inv === 150 ? "unas 150" : "unas 180") + " personas");
    if (day) want.push(day === "sab" ? "en sábado" : "de domingo a viernes");
    if (wants.length) want.push("con " + joinList(wants.map((w) => INC_NAMES[w] || w)));
    $("#fAsk").href = waLink("Hola, busco un paquete " + want.join(", ") + ". ¿Qué me recomiendan?");
  }
};
const resetFilter = () => { fInputs.forEach((i) => (i.checked = false)); applyFilter(); };
fInputs.forEach((i) => i.addEventListener("change", () => {
  // Invitados y día: solo una opción a la vez (y se puede desmarcar)
  if (i.name !== "inc" && i.checked) fInputs.forEach((o) => { if (o !== i && o.name === i.name) o.checked = false; });
  applyFilter();
}));
finder.addEventListener("submit", (e) => e.preventDefault());
$("#fReset").addEventListener("click", resetFilter);
applyFilter();

/* ---------- Pestañas de la galería (Fotos / Videos / TikTok) ---------- */
const gtabs = $$("[data-gtab]");
const showGtab = (id) => {
  gtabs.forEach((o) => {
    const on = o.dataset.gtab === id;
    o.classList.toggle("is-on", on);
    o.setAttribute("aria-selected", on);
    document.getElementById(o.dataset.gtab).hidden = !on;
  });
  $$("video").forEach((v) => v.pause());
};
gtabs.forEach((b) => b.addEventListener("click", () => showGtab(b.dataset.gtab)));
// En celular: botón para ver todas las fotos
const gMore = $("#gMore");
if (gMore) gMore.addEventListener("click", () => $("#gallery").classList.add("is-all"));

/* ---------- Videos ---------- */
const vids = $$("video"), vrow = $("#videos");
vids.forEach((v) => v.addEventListener("play", () => vids.forEach((o) => o !== v && o.pause())));
const vstep = (dir) => vrow.scrollBy({ left: dir * vrow.clientWidth * 0.8, behavior: reduceMotion ? "auto" : "smooth" });
$("#vPrev").addEventListener("click", () => vstep(-1));
$("#vNext").addEventListener("click", () => vstep(1));

/* ---------- Videos de YouTube, Instagram y Facebook (se reproducen dentro de la página) ----------
   render.js reconoce el enlace y deja la dirección del reproductor en data-embed. */
const embedFrame = (src, title) => {
  const f = document.createElement("iframe");
  f.src = src;
  f.title = title || "Video";
  f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  f.allowFullscreen = true;
  return f;
};
$$(".yt[data-embed]").forEach((box) => $("button", box).addEventListener("click", () => {
  vids.forEach((o) => o.pause());
  box.replaceChildren(embedFrame(box.dataset.embed, box.dataset.title));
}));

/* ---------- Videos de TikTok (se reproducen dentro de la página) ----------
   Cada reproductor se carga solo cuando el visitante llega a verlo. Si el navegador
   bloquea el reproductor, queda el botón "Ver en TikTok". */
if ("IntersectionObserver" in window) {
  let tkBlocked = false;
  document.addEventListener("securitypolicyviolation", (e) => {
    if (!String(e.blockedURI || "").includes("tiktok")) return;
    tkBlocked = true;
    $$(".tk iframe").forEach((f) => f.remove());
  });
  const tko = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting || tkBlocked) return;
    tko.unobserve(e.target);
    const f = document.createElement("iframe");
    f.src = "https://www.tiktok.com/player/v1/" + e.target.dataset.tk + "?music_info=0&description=0&rel=0";
    f.title = "Video de TikTok de Mendoza Sonido y DJ";
    f.allow = "fullscreen; encrypted-media; picture-in-picture";
    f.allowFullscreen = true;
    f.loading = "lazy";
    e.target.appendChild(f);
  }), { rootMargin: "200px 0px" });
  $$(".tk[data-tk]").forEach((t) => tko.observe(t));
}

/* ---------- Visor de fotos y videos ---------- */
const lb = $("#lightbox"), lbImg = $("#lbImg"), lbVid = $("#lbVid"), lbYt = $("#lbYt");
if (lb && lb.showModal) {
  // Fotos de la galería
  $$("#gallery .g").forEach((g) => g.addEventListener("click", () => {
    lbVid.hidden = true; lbYt.hidden = true; lbImg.hidden = false;
    lbImg.src = g.dataset.full;
    lbImg.alt = $("img", g).alt;
    $("#lbCap").textContent = g.dataset.cap;
    lb.showModal();
  }));
  // Botones "ver video" (personajes, adicionales, paquetes): abren el enlace que tengan en data-vurl
  $$("[data-vurl]").forEach((b) => b.addEventListener("click", () => {
    const url = b.dataset.vurl, info = window.videoInfo ? window.videoInfo(url) : { tipo: "file" };
    if (!info.tipo) return;
    if (info.tipo === "link") { window.open(url, "_blank", "noopener"); return; } // enlace que no se puede incrustar
    vids.forEach((o) => o.pause());
    lbImg.hidden = true;
    $("#lbCap").textContent = b.dataset.cap;
    if (info.embed) { // YouTube, TikTok, Instagram o Facebook
      lbVid.hidden = true; lbYt.hidden = false;
      lbYt.replaceChildren(embedFrame(info.embed, b.dataset.cap));
      lb.showModal();
      return;
    }
    lbYt.hidden = true; lbVid.hidden = false;
    if (b.dataset.poster) lbVid.poster = b.dataset.poster; else lbVid.removeAttribute("poster");
    lbVid.src = url;
    lb.showModal();
    const p = lbVid.play();
    if (p && p.catch) p.catch(() => {});
  }));
  $("#lbClose").addEventListener("click", () => lb.close());
  lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener("close", () => { lbVid.pause(); lbVid.removeAttribute("src"); lbVid.load(); lbYt.replaceChildren(); });
}

/* ---------- Ventana de cada paquete: fotos y detalles ----------
   Las fotos de cada paquete se editan en el panel (Paquetes > Fotos). */
const PACK_PHOTOS = {};
(((SITIO.paquetes || {}).lista) || []).forEach((p) => {
  PACK_PHOTOS[p.id] = (p.fotos || []).filter((f) => f.foto).map((f) => [f.foto, f.texto || ""]);
});
const pview = $("#packView");
if (pview && pview.showModal) {
  const strip = $("#pvStrip"), pvCap = $("#pvCap"), pvCount = $("#pvCount");
  let pvCard = null, pvShots = [];
  const pvIndex = () => Math.round(strip.scrollLeft / Math.max(strip.clientWidth, 1));
  const pvSync = () => {
    const i = Math.min(pvIndex(), pvShots.length - 1);
    if (i < 0) return;
    pvCap.textContent = pvShots[i][1];
    pvCount.textContent = i + 1 + " / " + pvShots.length;
  };
  const pvGo = (dir) => strip.scrollBy({ left: dir * strip.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
  const openPack = (card) => {
    pvCard = card;
    pvShots = PACK_PHOTOS[card.id] || [];
    strip.replaceChildren(...pvShots.map(([src, alt]) => {
      const im = new Image();
      im.src = src; im.alt = alt;
      return im;
    }));
    pview.classList.toggle("pview--nophoto", !pvShots.length);
    $("#pvNav").hidden = pvShots.length < 2;
    $("#pvTitle").innerHTML = $("h4", card).innerHTML;
    $("#pvPeople").innerHTML = $(".pack__cap", card).innerHTML;
    $("#pvPrice").replaceChildren(...$$(".pack__cost > *, .pack__extra", card).map((n) => n.cloneNode(true)));
    $("#pvList").innerHTML = $(".pack__list", card).innerHTML;
    const vid = $(".pack__video", card), slot = $("#pvVideo");
    slot.hidden = !vid;
    slot.onclick = vid ? () => vid.click() : null;
    pview.showModal();
    pview.scrollTop = 0; strip.scrollLeft = 0;
    pvSync();
  };
  $$(".pack").forEach((card) => card.addEventListener("click", (e) => {
    const viewBtn = e.target.closest("[data-view]");
    if (!viewBtn && e.target.closest("a, button")) return; // los demás botones hacen lo suyo
    openPack(card);
  }));
  strip.addEventListener("scroll", () => requestAnimationFrame(pvSync), { passive: true });
  $("#pvPrev").addEventListener("click", () => pvGo(-1));
  $("#pvNext").addEventListener("click", () => pvGo(1));
  $("#pvWant").addEventListener("click", () => { pview.close(); if (pvCard) $("[data-pack]", pvCard).click(); });
  $("#pvClose").addEventListener("click", () => pview.close());
  pview.addEventListener("click", (e) => { if (e.target === pview) pview.close(); });
}

/* ---------- Cotizador: fecha, invitados, lugar y adicionales ---------- */
const quote = $("#quote");
if (quote && quote.showModal) {
  const qSend = $("#qSend"), qSum = $("#qSum");
  let qPack = "", qSat = "", qWeek = "", qNoSat = false;
  const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const boxes = () => $$(".qx:not([hidden]) input", quote).filter((i) => i.checked);
  const refresh = () => {
    const extras = boxes().map((i) => i.value);
    const d = $("#qDate").value, g = $("#qGuests").value, p = $("#qPlace").value.trim();
    // Precio según el día: sábado precio fijo; domingo a viernes con descuento
    const day = d ? new Date(d + "T12:00:00").getDay() : -1;
    const isSat = day === 6, blocked = qNoSat && isSat;
    let price, dayNote = "";
    if (!qWeek) price = qSat;                                   // paquete sin descuento por día
    else if (day < 0) price = qNoSat ? qWeek + ", de domingo a viernes" : qSat + " en sábado, " + qWeek + " de domingo a viernes";
    else if (isSat) { price = qSat; dayNote = "Tu evento cae en sábado: precio fijo de " + qSat + "."; }
    else { price = qWeek; dayNote = "Tu evento cae en " + DAYS[day] + ": precio de domingo a viernes, " + qWeek + "."; }
    $("#qPrice").textContent = day < 0 ? (qNoSat ? qWeek : qSat) : (isSat ? (qSat || qWeek) : (qWeek || qSat));
    $("#qDay").textContent = blocked ? "" : dayNote;
    const lines = ["Hola, me interesa el Paquete " + qPack.toUpperCase() + " (" + price + ")."];
    if (extras.length) lines.push("Adicionales: " + extras.join(", ") + ".");
    if (d) lines.push("Fecha del evento: " + DAYS[day] + " " + d.split("-").reverse().join("/") + ".");
    if (g) lines.push("Invitados: " + g + ".");
    if (p) lines.push("Lugar: " + p + ".");
    qSend.href = waLink(lines.join("\n"));
    qSend.setAttribute("aria-disabled", blocked);
    qSum.classList.toggle("is-warn", blocked);
    qSum.textContent = blocked
      ? "El Paquete " + qPack + " solo está disponible de domingo a viernes. Elige otra fecha u otro paquete."
      : extras.length
        ? "Paquete " + qPack + " + " + extras.length + (extras.length === 1 ? " adicional" : " adicionales") + ": " + extras.join(", ") + "."
        : "Solo el paquete, sin adicionales.";
  };
  $$("[data-pack]").forEach((btn) => btn.addEventListener("click", (e) => {
    e.preventDefault();
    qPack = btn.dataset.pack;
    const p = packOf(btn.closest(".pack"));
    if (p) { // paquete de la lista: los precios salen de su tarjeta
      qNoSat = !p.fijo && !p.sab;
      qSat = p.fijo ? money(p.fijo) : p.sab ? money(p.sab) : "";
      qWeek = p.fijo ? "" : money(p.sem);
    } else { // botón suelto (p. ej. Infantil): un solo precio en data-price
      qNoSat = false; qSat = btn.dataset.price || ""; qWeek = "";
    }
    $("#qPack").textContent = qPack;
    $$(".qx", quote).forEach((l) => {
      const hide = (l.dataset.only && l.dataset.only !== qPack) || (l.dataset.not && l.dataset.not.split("|").includes(qPack));
      l.hidden = !!hide;
      $("input", l).checked = false;
    });
    refresh();
    quote.showModal();
    quote.scrollTop = 0;
  }));
  $("#qForm").addEventListener("input", refresh);
  $("#qForm").addEventListener("submit", (e) => e.preventDefault());
  $("#qClose").addEventListener("click", () => quote.close());
  quote.addEventListener("click", (e) => { if (e.target === quote) quote.close(); });
}

/* ---------- Buscador ----------
   El índice se arma solo con lo que hay en la página (paquetes, adicionales, pasos y preguntas),
   así que al editar textos en index.html el buscador se actualiza sin tocar nada aquí.
   Para que algo se encuentre con más palabras, agrégalas en su atributo data-keys. */
const search = $("#search");
const openSearchButtons = $$("[data-search]");
if (search && search.showModal) {
  const sInput = $("#sInput"), sList = $("#sList"), sQuick = $("#sQuick"), sNone = $("#sNone"), sHead = $("#sHead");
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const text = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const INDEX = [];
  const add = (type, title, sub, el, keys, go, onlyKeys) =>
    INDEX.push({ type, title, sub, el, go, t: norm(title), x: norm([title, sub, onlyKeys ? "" : text(el), el.dataset.keys || "", keys || ""].join(" ")) });

  // Aviso del descuento entre semana
  const deal = $(".deal");
  if (deal && !deal.hidden) add("Descuento", text($("b", deal)), text(deal).replace(text($("b", deal)), "").trim(), deal, "sabado descuento promocion oferta entre semana rebaja", null, true);

  // Paquetes
  PACKS.forEach((p) => {
    const price = p.fijo ? money(p.fijo) : p.sab ? money(p.sab) + " en sábado · " + money(p.sem) + " de domingo a viernes" : money(p.sem) + " · solo de domingo a viernes";
    add("Paquete", "Paquete " + p.name, price + " · " + text($(".pack__cap", p.card)).toLowerCase(), p.card, "paquete sonido dj sabado domingo viernes", () => {
      if (p.card.hidden) resetFilter();
      flash(p.card);
    });
  });
  const kids = $("#infantil .kids__body");
  if (kids) add("Paquete", "Paquete Infantil", text($(".kids__price b", kids)) + " " + text($(".kids__price span", kids)) + " · sonido, palomitas, burbujas e inflable", kids, "niños niñas fiesta infantil cumpleaños brincolin castillo precio costo cuanto cuesta");
  // Adicionales y shows
  $$(".extra").forEach((x) => {
    const prices = $$(".price b", x).map((b) => text(b));
    add("Adicional", text($("h3", x)), prices.length ? "Desde " + prices[prices.length - 1] : "Precio al cotizar", x, "adicional extra agregar");
  });
  $$(".chips button").forEach((b) => add("Show", b.dataset.cap, "Toca para ver su video", b, "show botarga personaje video"));
  // Lo que incluyen todos, pasos y preguntas
  $$(".always li").forEach((li) => add("Incluido en todos", text($("b", li)), text($("span", li)), li, "incluye incluido"));
  $$(".steps li").forEach((li) => add("Cómo apartar", text($("h3", li)), text($("p", li)), li, ""));
  $$(".faq details").forEach((d) => add("Pregunta", text($("summary", d)), text($("p", d)), d, "", () => { d.open = true; flash(d); }));
  // Secciones
  const sec = (title, sub, sel, keys, tab) => { const el = $(sel); if (el) add("Sección", title, sub, el, keys, () => { if (tab) showGtab(tab); flash(el); }, true); };
  sec("Cómo apartar tu fecha", "4 pasos: cotiza, lee el contrato, aparta con $500 y recibe tu contrato", "#proceso .steps", "apartar reservar reserva anticipo deposito pago separar fecha pasos proceso", null);
  sec("Comparar los paquetes de sonido", "Tabla con precios, personas y equipo de cada paquete", "#comparar", "comparar comparacion tabla diferencias cual elegir", null);
  sec("Fotos de nuestros montajes", "Galería de fotos del equipo en eventos", "#g-fotos", "fotos imagenes galeria montaje equipo", "g-fotos");
  sec("Videos", "Shows, carrito de shots e invitaciones en video", "#g-videos", "videos galeria ver", "g-videos");
  if (!$('[data-gtab="g-tiktok"]').hidden) sec("TikTok", "Nuestros videos de " + ((SITIO.negocio || {}).tiktokUsuario || "TikTok"), "#g-tiktok", "tiktok videos redes", "g-tiktok");
  sec("Opiniones de clientes", "Reseñas reales en Google Maps", "#resenas", "opiniones reseñas resenas referencias google maps calificacion confiable recomendaciones", null);
  sec("Contacto y redes sociales", "WhatsApp " + ((SITIO.negocio || {}).telefono || "") + ", Facebook, Instagram, TikTok y Google Maps", "#contacto", "contacto telefono numero celular whatsapp cotizar facebook instagram tiktok ubicacion direccion donde estan", null);
  const compare = $("#comparar");
  if (compare) INDEX.find((e) => e.el === compare).go = () => { if ($("#sonido").hidden) resetFilter(); compare.open = true; flash(compare); };

  // Palabras que la gente usa y que la página dice de otra forma
  const SYN = {
    tele: "pantalla", tv: "pantalla", television: "pantalla", televisor: "pantalla", proyector: "pantalla", video: "pantalla",
    brincolin: "inflable", brincolines: "inflable", castillo: "inflable", juegos: "inflable",
    bajo: "subwoofer", bajos: "subwoofer", sub: "subwoofer", woofer: "subwoofer", buffer: "subwoofer", bufer: "subwoofer",
    costo: "precio", costos: "precio", cuesta: "precio", cuestan: "precio", cuanto: "precio", cobran: "precio", tarifa: "precio",
    reservar: "apartar", reserva: "apartar", separar: "apartar", deposito: "anticipo", pago: "anticipo",
    horario: "horas", tiempo: "horas", duracion: "horas", dura: "horas",
    personaje: "show", personajes: "show", animacion: "animador", animadores: "animador",
    bebida: "shots", tragos: "shots", alcohol: "shots", dulces: "snacks", botana: "snacks", botanas: "snacks",
    iluminacion: "luces", luz: "luces", bocina: "bocinas", micro: "microfonos", microfono: "microfonos",
    ninos: "infantil", ninas: "infantil", nino: "infantil", cumpleanos: "infantil", pinata: "infantil",
    zona: "zonas", lugar: "zonas", cobertura: "zonas", jiutepec: "zonas", temixco: "zonas", morelos: "zonas",
    invitados: "personas", gente: "personas", resenas: "opiniones", referencias: "opiniones",
  };
  const STOP = new Set("de del la las el los un una unos unas y o a en con para por que me mi su al es hay se lo le como cual quiero busco necesito tienen tiene ocupo dan".split(" "));
  const forms = (tok) => { // variantes de una palabra: tal cual, sin plural y su sinónimo
    const f = [tok];
    if (tok.length > 4 && tok.endsWith("es")) f.push(tok.slice(0, -2));
    if (tok.length > 3 && tok.endsWith("s")) f.push(tok.slice(0, -1));
    f.slice().forEach((v) => { if (SYN[v]) f.push(SYN[v]); });
    return f;
  };
  const find = (q) => {
    // "150 personas", "120 invitados" o solo "150": paquetes donde cabe esa cantidad
    const people = norm(q).match(/^(?:para |de |hasta |como |unas |unos )*(\d{2,3})(?: (?:personas|persona|invitados|gente|asistentes|pax))?$/);
    if (people) {
      const n = +people[1];
      return PACKS.filter((p) => p.cap >= n).sort((a, b) => a.cap - b.cap).map((p) => INDEX.find((e) => e.el === p.card)).slice(0, 8);
    }
    let toks = norm(q).split(" ").filter(Boolean);
    const useful = toks.filter((t) => !STOP.has(t) && t.length > 1);
    if (useful.length) toks = useful;
    if (!toks.length) return [];
    const scored = INDEX.map((e, i) => {
      let hits = 0, score = 0;
      toks.forEach((tok) => {
        const f = forms(tok);
        if (f.some((v) => e.t.includes(v))) { hits++; score += 5; }
        else if (f.some((v) => (/^\d+$/.test(v) ? (" " + e.x + " ").includes(" " + v + " ") : e.x.includes(v)))) { hits++; score += 1; }
      });
      return { e, i, hits, score };
    }).filter((r) => r.hits);
    const all = scored.filter((r) => r.hits === toks.length);
    return (all.length ? all : scored).sort((a, b) => b.hits - a.hits || b.score - a.score || a.i - b.i).slice(0, 8).map((r) => r.e);
  };

  const go = (e) => {
    search.close();
    setMenu(false);
    setTimeout(() => (e.go ? e.go() : flash(e.el)), 60); // espera a que cierre la ventana
  };
  const render = () => {
    const q = sInput.value.trim();
    const res = q ? find(q) : [];
    sQuick.hidden = !!q;
    sHead.hidden = !res.length;
    sHead.textContent = res.length === 1 ? "1 resultado" : res.length + " resultados";
    sNone.hidden = !q || res.length > 0;
    if (q && !res.length) {
      $("#sTerm").textContent = "«" + q + "»";
      $("#sAsk").href = waLink("Hola, estoy buscando: " + q + ". ¿Lo manejan?");
    }
    sList.replaceChildren(...res.map((e) => {
      const li = document.createElement("li"), b = document.createElement("button");
      b.type = "button";
      [["em", e.type], ["b", e.title], ["small", e.sub], ["span", "→"]].forEach(([tag, txt]) => {
        if (!txt) return;
        const n = document.createElement(tag);
        n.textContent = txt;
        b.appendChild(n);
      });
      b.addEventListener("click", () => go(e));
      li.appendChild(b);
      return li;
    }));
  };
  const openSearch = (q = "") => {
    setMenu(false);
    sInput.value = q;
    render();
    if (!search.open) search.showModal();
    $(".search__body", search).scrollTop = 0;
    if (q) sInput.blur(); else sInput.focus();
  };
  openSearchButtons.forEach((b) => b.addEventListener("click", () => openSearch(b.dataset.search || "")));
  $$("[data-q]", search).forEach((b) => b.addEventListener("click", () => { sInput.value = b.dataset.q; render(); }));
  sInput.addEventListener("input", render);
  $("#sForm").addEventListener("submit", (e) => { // Enter: abre el primer resultado
    e.preventDefault();
    const first = $("button", sList);
    if (first) first.click();
  });
  $("#sClose").addEventListener("click", () => search.close());
  search.addEventListener("click", (e) => { if (e.target === search) search.close(); });
  // Atajos: "/" o Ctrl+K abren el buscador
  addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || "")) || e.target.isContentEditable;
    if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey))) {
      if (document.querySelector("dialog[open]:not(#search)")) return;
      e.preventDefault();
      openSearch();
    }
  });
} else {
  // Navegador sin ventanas <dialog>: los botones de búsqueda llevan a los paquetes
  openSearchButtons.forEach((b) => b.addEventListener("click", () => $("#paquetes").scrollIntoView()));
}

$("#year").textContent = new Date().getFullYear();
