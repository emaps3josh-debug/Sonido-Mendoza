// ======================================================
//  CONFIGURACIÓN DE SONIDO MENDOZA
//  Aquí cambias nombre, redes sociales y límites.
// ======================================================

export const MARCA = {
  nombre: 'Sonido Mendoza',
  subtitulo: 'Peticiones',
};

// Pega aquí tus enlaces. Si dejas uno vacío (''), ese ícono no aparece.
export const REDES = {
  whatsapp: 'https://wa.me/527776242702',
  facebook: 'https://www.facebook.com/share/1HnRjsYVAi/',
  instagram: 'https://www.instagram.com/sonidoydj_mendoza',
  tiktok: 'https://www.tiktok.com/@sonido.dj.mendoza',
};

// El usuario "admin" se convierte en admin@sonidomendoza.mx para Firebase.
// Si cambias este dominio, cambia también los correos en firestore.rules.
export const DOMINIO_ADMIN = 'sonidomendoza.mx';

// Equipos de sonido. Cada uno tiene su usuario, su panel y su propio evento.
// - usuario: lo que se escribe para entrar al panel (se crea en Firebase → Authentication
//   como usuario@sonidomendoza.mx).
// - id: nombre de su ficha en la base de datos. El del equipo 1 es "actual" porque así
//   se llamó desde el principio: no lo cambies.
// Para agregar otro equipo: agrégalo aquí Y en firestore.rules, y crea su usuario en Firebase.
export const EQUIPOS = [
  { usuario: 'admin', id: 'actual', nombre: 'Sonido Mendoza' },
  { usuario: 'djmartin', id: 'djmartin', nombre: 'DJ Martin' },
  { usuario: 'infantil', id: 'infantil', nombre: 'Infantil' },
];

export function equipoDeCorreo(correo = '') {
  return EQUIPOS.find((e) => `${e.usuario}@${DOMINIO_ADMIN}` === correo.toLowerCase()) ?? null;
}

// Máximo de canciones pendientes al crear un evento (se puede cambiar en el panel)
export const LIMITE_COLA_INICIAL = 30;

// Segundos que debe esperar un celular entre una petición y otra
export const ESPERA_ENTRE_PETICIONES = 60;

// Máximo de letras por campo
export const MAX_CARACTERES = 80;
