// Quita espacios repetidos
export function limpiar(texto) {
  return texto.replace(/\s+/g, ' ').trim();
}

// "Tití Me Preguntó!!" → "titi me pregunto"
export function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Identificador único de cada canción, sirve para detectar duplicados.
// "Bad Bunny" + "Tití Me Preguntó" → "bad-bunny_titi-me-pregunto"
export function claveCancion(artista, cancion) {
  const a = normalizar(artista).replace(/ /g, '-');
  const c = normalizar(cancion).replace(/ /g, '-');
  if (!a || !c) return null;
  return `${a}_${c}`;
}

export function hora(fecha) {
  if (!fecha) return '';
  return fecha.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
}
