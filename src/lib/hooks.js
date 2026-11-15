import { useEffect, useState } from 'react';
import { escucharAjustes, escucharFondo, escucharPeticiones, escucharPublico, escucharSinCodigo } from './datos';

// Evento de un equipo en tiempo real (panel del DJ)
export function useAjustes(equipoId) {
  const [estado, setEstado] = useState({ cargando: true, ajustes: null, error: false });

  useEffect(() => {
    if (!equipoId) return undefined;
    return escucharAjustes(
      equipoId,
      (ajustes) => setEstado({ cargando: false, ajustes, error: false }),
      (error) => {
        console.error(error);
        setEstado({ cargando: false, ajustes: null, error: true });
      }
    );
  }, [equipoId]);

  return estado;
}

// Fiestas abiertas sin código, en tiempo real (página de invitados)
export function useSinCodigo() {
  const [estado, setEstado] = useState({ cargando: true, eventos: [] });

  useEffect(
    () =>
      escucharSinCodigo(
        (eventos) => setEstado({ cargando: false, eventos }),
        (error) => {
          console.error(error);
          setEstado({ cargando: false, eventos: [] });
        }
      ),
    []
  );

  return estado;
}

// Datos públicos de una fiesta en tiempo real
export function usePublico(eventoId) {
  // Se guarda de qué fiesta son los datos para no mezclar los de una anterior
  const [estado, setEstado] = useState({ id: null, evento: null, listo: false });

  useEffect(() => {
    if (!eventoId) return undefined;
    return escucharPublico(
      eventoId,
      (evento) => setEstado({ id: eventoId, evento, listo: true }),
      (error) => {
        console.error(error);
        setEstado({ id: eventoId, evento: null, listo: true });
      }
    );
  }, [eventoId]);

  if (!eventoId) return { cargando: false, evento: null };
  if (estado.id !== eventoId || !estado.listo) return { cargando: true, evento: null };
  return { cargando: false, evento: estado.evento };
}

// Canciones del evento en tiempo real
export function usePeticiones(eventoId) {
  const [peticiones, setPeticiones] = useState([]);

  useEffect(() => {
    setPeticiones([]);
    if (!eventoId) return undefined;
    return escucharPeticiones(eventoId, setPeticiones);
  }, [eventoId]);

  return peticiones;
}

// Foto de fondo del evento en tiempo real
export function useFondo(eventoId) {
  const [fondo, setFondo] = useState(null);

  useEffect(() => {
    setFondo(null);
    if (!eventoId) return undefined;
    return escucharFondo(eventoId, setFondo);
  }, [eventoId]);

  return fondo;
}
