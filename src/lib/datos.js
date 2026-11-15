// Todas las operaciones con la base de datos están en este archivo.
//
// ajustes/{equipo}        → PRIVADO: evento actual de cada equipo, con su código
// publico/{id}            → lo que ven los invitados: título, límite, si está abierto
// codigos/{1234}          → a qué evento lleva cada código de fiesta
// eventos/{id}            → cada evento, con el equipo dueño
// eventos/{id}/peticiones → canciones de ese evento
// fondos/{id}             → foto de fondo de ese evento
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { claveCancion, limpiar } from './texto';
import { LIMITE_COLA_INICIAL } from '../config';

const refAjustes = (equipoId) => doc(db, 'ajustes', equipoId);
const refPeticiones = (eventoId) => collection(db, 'eventos', eventoId, 'peticiones');
const refPeticion = (eventoId, id) => doc(db, 'eventos', eventoId, 'peticiones', id);
const refFondo = (eventoId) => doc(db, 'fondos', eventoId);
const refPublico = (eventoId) => doc(db, 'publico', eventoId);
const refCodigo = (codigo) => doc(db, 'codigos', codigo);

// ---------- Tiempo real ----------

// Evento de un equipo (para su panel)
export function escucharAjustes(equipoId, alCambiar, alFallar) {
  return onSnapshot(
    refAjustes(equipoId),
    (snap) => alCambiar(snap.exists() ? snap.data() : null),
    alFallar
  );
}

// Fiestas abiertas que NO piden código (página de invitados)
export function escucharSinCodigo(alCambiar, alFallar) {
  return onSnapshot(
    query(collection(db, 'publico'), where('activo', '==', true), where('pedirCodigo', '==', false)),
    (snap) => alCambiar(snap.docs.map((d) => ({ eventoId: d.id, ...d.data() }))),
    alFallar
  );
}

// Datos públicos de una fiesta (título, límite, si sigue abierta)
export function escucharPublico(eventoId, alCambiar, alFallar) {
  return onSnapshot(
    refPublico(eventoId),
    (snap) => alCambiar(snap.exists() ? snap.data() : null),
    alFallar
  );
}

// Revisa un código de fiesta. Devuelve el eventoId si es válido y la fiesta está abierta.
export async function verificarCodigo(codigo) {
  if (!/^[0-9]{4}$/.test(codigo)) return null;
  const snap = await getDoc(refCodigo(codigo));
  if (!snap.exists()) return null;
  const { eventoId } = snap.data();
  const publico = await getDoc(refPublico(eventoId));
  return publico.exists() && publico.data().activo === true ? eventoId : null;
}

export function escucharPeticiones(eventoId, alCambiar) {
  return onSnapshot(
    refPeticiones(eventoId),
    (snap) => {
      const lista = snap.docs.map((d) => {
        const datos = d.data({ serverTimestamps: 'estimate' });
        return {
          id: d.id,
          ...datos,
          creada: datos.creada?.toDate?.() ?? new Date(),
          sonoEn: datos.sonoEn?.toDate?.() ?? null,
        };
      });
      lista.sort((a, b) => a.creada - b.creada);
      alCambiar(lista);
    },
    (error) => console.error(error)
  );
}

// Foto de fondo del evento (cada evento tiene la suya)
export function escucharFondo(eventoId, alCambiar) {
  return onSnapshot(
    refFondo(eventoId),
    (snap) => alCambiar(snap.exists() ? snap.data().imagen : null),
    (error) => console.error(error)
  );
}

// ---------- Invitados ----------

// Devuelve: 'ok' | 'duplicada' | 'yaSono' | 'invalida'
export async function enviarPeticion(eventoId, artista, cancion, codigo) {
  const clave = claveCancion(artista, cancion);
  if (!clave) return 'invalida';

  const ref = refPeticion(eventoId, clave);
  return runTransaction(db, async (tx) => {
    const existente = await tx.get(ref);
    if (existente.exists()) {
      return existente.data().estado === 'reproducida' ? 'yaSono' : 'duplicada';
    }
    tx.set(ref, {
      artista: limpiar(artista),
      cancion: limpiar(cancion),
      estado: 'cola',
      creada: serverTimestamp(),
      ...(codigo ? { codigo } : {}),
    });
    return 'ok';
  });
}

// ---------- Panel del DJ ----------

export function cambiarTitulo(equipoId, eventoId, titulo) {
  const lote = writeBatch(db);
  lote.update(refAjustes(equipoId), { titulo });
  lote.update(doc(db, 'eventos', eventoId), { titulo });
  lote.update(refPublico(eventoId), { titulo });
  return lote.commit();
}

export function cambiarLimite(equipoId, eventoId, limiteCola) {
  const lote = writeBatch(db);
  lote.update(refAjustes(equipoId), { limiteCola });
  lote.update(refPublico(eventoId), { limiteCola });
  return lote.commit();
}

// Terminar: los invitados dejan de ver el evento. Reabrir: vuelve a aparecer.
export function cambiarActivo(equipoId, eventoId, activo) {
  const lote = writeBatch(db);
  lote.update(refAjustes(equipoId), { activo });
  lote.update(refPublico(eventoId), { activo });
  return lote.commit();
}

// Encender o apagar el código de fiesta
export function cambiarPedirCodigo(equipoId, eventoId, pedirCodigo) {
  const lote = writeBatch(db);
  lote.update(refAjustes(equipoId), { pedirCodigo });
  lote.update(refPublico(eventoId), { pedirCodigo });
  return lote.commit();
}

// Aparta un código de 4 números que nadie más esté usando
async function apartarCodigo(equipoId, eventoId) {
  for (let intento = 0; intento < 25; intento++) {
    const codigo = String(1000 + Math.floor(Math.random() * 9000));
    const ref = refCodigo(codigo);
    const libre = await runTransaction(db, async (tx) => {
      if ((await tx.get(ref)).exists()) return false;
      tx.set(ref, { eventoId, equipo: equipoId });
      return true;
    });
    if (libre) return codigo;
  }
  throw new Error('No se pudo crear un código');
}

function soltarCodigo(codigo) {
  if (codigo) deleteDoc(refCodigo(codigo)).catch(() => {});
}

// Cambia el código de la fiesta (por si alguien que no debía se lo aprendió)
export async function nuevoCodigo(equipoId, eventoId, codigoViejo) {
  const codigo = await apartarCodigo(equipoId, eventoId);
  await updateDoc(refAjustes(equipoId), { codigo });
  soltarCodigo(codigoViejo);
}

// estado: 'cola' | 'reproducida'
export function cambiarEstado(eventoId, id, estado) {
  return updateDoc(refPeticion(eventoId, id), {
    estado,
    sonoEn: estado === 'reproducida' ? serverTimestamp() : null,
  });
}

// Más recientes primero
export function ordenarSonadas(lista) {
  return lista
    .filter((p) => p.estado === 'reproducida')
    .sort((a, b) => (b.sonoEn ?? b.creada) - (a.sonoEn ?? a.creada));
}

export function eliminarPeticion(eventoId, id) {
  return deleteDoc(refPeticion(eventoId, id));
}

export function guardarFondo(eventoId, imagen) {
  return setDoc(refFondo(eventoId), { imagen });
}

export function quitarFondo(eventoId) {
  return deleteDoc(refFondo(eventoId));
}

export async function limpiarCola(eventoId) {
  const snap = await getDocs(refPeticiones(eventoId));
  // Se borran en grupos pequeños para respetar los límites del candado de Firebase
  for (let i = 0; i < snap.docs.length; i += 20) {
    await Promise.all(snap.docs.slice(i, i + 20).map((d) => deleteDoc(d.ref)));
  }
}

// Crea un evento nuevo con su propia cola vacía y un código nuevo. Misma URL, mismo QR.
// Los eventos anteriores quedan guardados (útil para un historial futuro).
export async function nuevoEvento(equipoId, titulo, limiteCola = LIMITE_COLA_INICIAL, anterior = null) {
  const refEvento = doc(collection(db, 'eventos'));
  const eventoId = refEvento.id;
  const pedirCodigo = anterior?.pedirCodigo ?? true;
  const codigo = await apartarCodigo(equipoId, eventoId);

  const lote = writeBatch(db);
  lote.set(refEvento, { titulo, equipo: equipoId, creado: serverTimestamp() });
  lote.set(refPublico(eventoId), { titulo, limiteCola, activo: true, pedirCodigo, equipo: equipoId });
  lote.set(refAjustes(equipoId), { eventoId, titulo, limiteCola, activo: true, pedirCodigo, codigo });
  if (anterior?.eventoId) {
    // El evento anterior deja de verse
    lote.set(refPublico(anterior.eventoId), { activo: false, equipo: equipoId }, { merge: true });
  }
  await lote.commit();
  soltarCodigo(anterior?.codigo);
}
