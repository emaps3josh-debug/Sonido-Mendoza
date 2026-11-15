import { useEffect, useMemo, useRef, useState } from 'react';
import Marca from '../components/Marca.jsx';
import Redes from '../components/Redes.jsx';
import TituloAnimado from '../components/TituloAnimado.jsx';
import { useFondo, usePeticiones, usePublico, useSinCodigo } from '../lib/hooks';
import { enviarPeticion, ordenarSonadas, verificarCodigo } from '../lib/datos';
import { buscarCanciones } from '../lib/buscar';
import { claveCancion } from '../lib/texto';
import { ESPERA_ENTRE_PETICIONES, LIMITE_COLA_INICIAL, MAX_CARACTERES } from '../config';

const MENSAJES = {
  ok: { tipo: 'exito', texto: '✅ ¡Listo! Tu canción se envió.' },
  duplicada: { tipo: 'aviso', texto: '🎵 Esta canción ya está en la cola.' },
  yaSono: { tipo: 'aviso', texto: '🎶 Esta canción ya sonó en esta fiesta.' },
  llena: {
    tipo: 'aviso',
    texto: '🎶 La lista está llena por ahora. Espera a que se reproduzcan algunas canciones.',
  },
  invalida: { tipo: 'error', texto: 'Escribe el artista y el nombre de la canción.' },
  error: { tipo: 'error', texto: 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.' },
};

// Memoria del celular (sin cuentas)
function leer(clave, porDefecto) {
  try {
    const valor = localStorage.getItem(clave);
    return valor ? JSON.parse(valor) : porDefecto;
  } catch {
    return porDefecto;
  }
}
function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* el celular no permite guardar; no pasa nada */
  }
}

function textoLugar(lugar) {
  if (lugar === 1) return '✅ ¡Listo! Tu canción es la siguiente en la cola.';
  return `✅ ¡Listo! Tu canción va en el lugar #${lugar}.`;
}

// =====================================================================
//  PÁGINA DE INVITADOS: decide si pedir código o mostrar la fiesta
// =====================================================================

export default function Pedir() {
  const sinCodigo = useSinCodigo();
  // acceso = { eventoId, codigo? } guardado en el celular
  const [acceso, setAcceso] = useState(() => leer('sm_acceso', null));
  const [cambiando, setCambiando] = useState(false);
  const [aviso, setAviso] = useState(null);

  // Si hay UNA sola fiesta sin código, entra directo (como antes)
  const automatico =
    !acceso && !cambiando && sinCodigo.eventos.length === 1 ? { eventoId: sinCodigo.eventos[0].eventoId } : null;
  const actual = acceso ?? automatico;

  const { cargando, evento } = usePublico(actual?.eventoId);
  const abierta = evento?.activo === true;
  const faltaCodigo = abierta && evento.pedirCodigo !== false && !actual?.codigo;
  const enFiesta = Boolean(actual && abierta && !faltaCodigo);
  const fondo = useFondo(enFiesta ? actual.eventoId : null);

  function entrar(nuevo) {
    setAcceso(nuevo);
    guardar('sm_acceso', nuevo);
    setAviso(null);
    setCambiando(false);
  }

  function salir(texto = null) {
    setAcceso(null);
    guardar('sm_acceso', null);
    setAviso(texto);
    setCambiando(true);
  }

  // La fiesta guardada ya terminó
  useEffect(() => {
    if (acceso && !cargando && !abierta) salir('🏁 Esa fiesta ya terminó.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceso, cargando, abierta]);

  // El DJ cambió el código: hay que volver a escribirlo
  useEffect(() => {
    if (!acceso?.codigo) return undefined;
    let vigente = true;
    verificarCodigo(acceso.codigo)
      .then((id) => {
        if (vigente && id !== acceso.eventoId) salir('🔑 El código de la fiesta cambió. Pídeselo al DJ.');
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceso?.codigo]);

  const preparando = (!actual && sinCodigo.cargando) || (actual && cargando);

  return (
    <div className={fondo ? 'pagina pagina--con-foto' : 'pagina'}>
      {fondo && <div className="fondo" style={{ backgroundImage: `url(${fondo})` }} aria-hidden="true" />}

      <Marca />

      <main className="contenido">
        {preparando && <p className="estado-pagina">Cargando…</p>}

        {!preparando && enFiesta && (
          <Fiesta
            key={actual.eventoId}
            eventoId={actual.eventoId}
            evento={evento}
            codigo={actual.codigo}
            onCambiar={() => salir()}
            onRechazada={() => salir('🔑 No se pudo enviar: la fiesta cerró o el código cambió. Pídeselo al DJ.')}
          />
        )}

        {!preparando && !enFiesta && (
          <PantallaCodigo
            sinCodigo={sinCodigo.eventos}
            aviso={faltaCodigo ? '🔑 Esta fiesta pide código. Pídeselo al DJ.' : aviso}
            onEntrar={entrar}
          />
        )}
      </main>

      <Redes />
    </div>
  );
}

// =====================================================================
//  PANTALLA PARA ESCRIBIR EL CÓDIGO
// =====================================================================

function OpcionFiesta({ evento, onElegir }) {
  const fondo = useFondo(evento.eventoId);
  return (
    <button
      type="button"
      className="fiesta"
      onClick={() => onElegir(evento.eventoId)}
      style={
        fondo
          ? { backgroundImage: `linear-gradient(90deg, rgba(3,5,7,0.88), rgba(3,5,7,0.35)), url(${fondo})` }
          : undefined
      }
    >
      <span className="fiesta__titulo">🎉 {evento.titulo}</span>
      <span className="fiesta__entrar">Entrar →</span>
    </button>
  );
}

function PantallaCodigo({ sinCodigo, aviso, onEntrar }) {
  const [codigo, setCodigo] = useState('');
  const [revisando, setRevisando] = useState(false);
  const [error, setError] = useState(null);

  async function revisar(valor) {
    if (revisando || valor.length !== 4) return;
    setRevisando(true);
    setError(null);
    try {
      const eventoId = await verificarCodigo(valor);
      if (eventoId) onEntrar({ eventoId, codigo: valor });
      else {
        setError('Código incorrecto o la fiesta ya terminó. Revísalo con el DJ.');
        setCodigo('');
      }
    } catch (err) {
      console.error(err);
      setError('No se pudo revisar el código. Revisa tu conexión.');
    } finally {
      setRevisando(false);
    }
  }

  function escribir(e) {
    const valor = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCodigo(valor);
    setError(null);
    if (valor.length === 4) revisar(valor); // entra solo al completar los 4 números
  }

  return (
    <section className="codigo">
      <h2 className="codigo__titulo">Escribe el código de la fiesta</h2>
      <p className="codigo__sub">Son 4 números. Te los da el DJ 🎧</p>

      <form
        className="codigo__form"
        onSubmit={(e) => {
          e.preventDefault();
          revisar(codigo);
        }}
      >
        <input
          className="codigo__input"
          value={codigo}
          onChange={escribir}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          placeholder="••••"
          autoComplete="off"
          aria-label="Código de la fiesta"
          disabled={revisando}
        />
        <button type="submit" className="btn btn--primario btn--enviar" disabled={revisando || codigo.length !== 4}>
          {revisando ? 'Revisando…' : 'ENTRAR 🎉'}
        </button>
      </form>

      <div aria-live="polite">
        {(error || aviso) && <p className={`mensaje mensaje--${error ? 'error' : 'aviso'}`}>{error || aviso}</p>}
      </div>

      {sinCodigo.length > 0 && (
        <div className="codigo__otras">
          <p className="codigo__otras-titulo">Fiestas abiertas sin código:</p>
          <div className="elegir__lista">
            {sinCodigo.map((e) => (
              <OpcionFiesta key={e.eventoId} evento={e} onElegir={(id) => onEntrar({ eventoId: id })} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// =====================================================================
//  LA FIESTA: pedir canción y ver la cola
// =====================================================================

function Fiesta({ eventoId, evento, codigo, onCambiar, onRechazada }) {
  const peticiones = usePeticiones(eventoId);
  const enCola = useMemo(() => peticiones.filter((p) => p.estado === 'cola'), [peticiones]);
  const sonaron = useMemo(() => ordenarSonadas(peticiones), [peticiones]);

  const [pestana, setPestana] = useState('cola');
  const [artista, setArtista] = useState('');
  const [cancion, setCancion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [ultima, setUltima] = useState(null); // la última canción que envió este celular
  const [mias, setMias] = useState(() => leer('sm_mias', []));
  const [sugerencias, setSugerencias] = useState([]);
  const [buscando, setBuscando] = useState(false); // solo busca mientras el invitado escribe
  const campoCancion = useRef(null);

  const limite = evento.limiteCola ?? LIMITE_COLA_INICIAL;

  // Sugerencias: espera a que el invitado deje de teclear y busca
  useEffect(() => {
    if (!buscando) return undefined;
    const termino = `${artista} ${cancion}`.trim();
    if (termino.length < 3) {
      setSugerencias([]);
      return undefined;
    }
    let vigente = true;
    const espera = setTimeout(async () => {
      const resultados = await buscarCanciones(termino);
      if (vigente) setSugerencias(resultados);
    }, 400);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [artista, cancion, buscando]);

  function escribir(cambiar) {
    return (e) => {
      cambiar(e.target.value);
      setBuscando(true);
    };
  }

  function elegir(s) {
    setArtista(s.artista);
    setCancion(s.cancion);
    setSugerencias([]);
    setBuscando(false);
  }

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    setSugerencias([]);
    setBuscando(false);

    const clave = claveCancion(artista, cancion);
    if (!clave) return setMensaje(MENSAJES.invalida);

    const pasaron = Math.floor((Date.now() - leer('sm_ultimo_envio', 0)) / 1000);
    const faltan = ESPERA_ENTRE_PETICIONES - pasaron;
    if (faltan > 0) {
      return setMensaje({ tipo: 'aviso', texto: `⏳ Espera ${faltan} segundos para pedir otra canción.` });
    }

    if (enCola.length >= limite) return setMensaje(MENSAJES.llena);

    setEnviando(true);
    setMensaje(null);
    try {
      const resultado = await enviarPeticion(eventoId, artista, cancion, codigo);
      setMensaje(MENSAJES[resultado]);
      if (resultado === 'ok') {
        guardar('sm_ultimo_envio', Date.now());
        const nuevas = [...mias, `${eventoId}/${clave}`].slice(-30);
        guardar('sm_mias', nuevas);
        setMias(nuevas);
        setUltima(clave);
        setArtista('');
        setCancion('');
      }
    } catch (err) {
      console.error(err);
      if (err?.code === 'permission-denied') return onRechazada();
      setMensaje(MENSAJES.error);
    } finally {
      setEnviando(false);
    }
  }

  // En el campo Artista, la tecla "Enter" pasa al campo Canción en vez de enviar
  function siguienteCampo(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      campoCancion.current?.focus();
    }
  }

  // Después de enviar, el mensaje dice en qué lugar va su canción (en tiempo real)
  let aviso = mensaje;
  if (mensaje === MENSAJES.ok && ultima) {
    const mia = peticiones.find((p) => p.id === ultima);
    if (mia?.estado === 'reproducida') {
      aviso = { tipo: 'exito', texto: '🎶 ¡Tu canción ya sonó!' };
    } else if (mia) {
      aviso = { tipo: 'exito', texto: textoLugar(enCola.findIndex((p) => p.id === ultima) + 1) };
    }
  }

  return (
    <>
      <section className="evento">
        <TituloAnimado key={evento.titulo} texto={evento.titulo} />
        <p className="evento__sub">Pide tu canción para esta fiesta 🎶</p>
        <button type="button" className="cambiar-fiesta" onClick={onCambiar}>
          ¿No es tu fiesta? Cambiar
        </button>

        <form className="formulario" onSubmit={enviar} noValidate>
          <label className="campo">
            <span className="campo__etiqueta">Artista</span>
            <input
              value={artista}
              onChange={escribir(setArtista)}
              onKeyDown={siguienteCampo}
              placeholder="Bad Bunny"
              maxLength={MAX_CARACTERES}
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="next"
            />
          </label>
          <label className="campo">
            <span className="campo__etiqueta">Canción</span>
            <input
              ref={campoCancion}
              value={cancion}
              onChange={escribir(setCancion)}
              placeholder="Tití Me Preguntó"
              maxLength={MAX_CARACTERES}
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="send"
            />
          </label>

          {sugerencias.length > 0 && (
            <div className="sugerencias">
              <p className="sugerencias__titulo">¿Es alguna de estas? Tócala para elegirla</p>
              <ul className="sugerencias__lista">
                {sugerencias.map((s) => (
                  <li key={s.id}>
                    <button type="button" className="sugerencia" onClick={() => elegir(s)}>
                      {s.portada ? (
                        <img className="sugerencia__portada" src={s.portada} alt="" width="44" height="44" loading="lazy" />
                      ) : (
                        <span className="sugerencia__portada" />
                      )}
                      <span className="sugerencia__texto">
                        <span className="sugerencia__cancion">{s.cancion}</span>
                        <span className="sugerencia__artista">{s.artista}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button type="submit" className="btn btn--primario btn--enviar" disabled={enviando}>
            {enviando ? 'Enviando…' : 'ENVIAR PETICIÓN 🎵'}
          </button>

          <div className="formulario__mensaje" aria-live="polite">
            {aviso && <p className={`mensaje mensaje--${aviso.tipo}`}>{aviso.texto}</p>}
          </div>
        </form>
      </section>

      {/* Panel con las canciones de todos los invitados */}
      <section className="tablero">
        <div className="tablero__pestanas" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={pestana === 'cola'}
            className="tablero__pestana"
            onClick={() => setPestana('cola')}
          >
            🎶 En cola <span className="tablero__num">{enCola.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pestana === 'sonaron'}
            className="tablero__pestana"
            onClick={() => setPestana('sonaron')}
          >
            ✅ Ya sonaron <span className="tablero__num">{sonaron.length}</span>
          </button>
        </div>

        <div className="tablero__panel" role="tabpanel" hidden={pestana !== 'cola'}>
          {enCola.length === 0 ? (
            <p className="tablero__vacio">Aún no hay canciones. Pide la primera.</p>
          ) : (
            <ol className="lista">
              {enCola.map((p, i) => {
                const mia = mias.includes(`${eventoId}/${p.id}`);
                return (
                  <li key={p.id} className={mia ? 'pista pista--mia' : 'pista'}>
                    <span className="pista__num">{i + 1}</span>
                    <span className="pista__texto">
                      <span className="pista__artista">{p.artista}</span>
                      <span className="pista__cancion">{p.cancion}</span>
                    </span>
                    {mia && <span className="pista__tuya">Tuya</span>}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="tablero__panel" role="tabpanel" hidden={pestana !== 'sonaron'}>
          {sonaron.length === 0 ? (
            <p className="tablero__vacio">Todavía no suena ninguna petición.</p>
          ) : (
            <ul className="lista">
              {sonaron.map((p) => {
                const mia = mias.includes(`${eventoId}/${p.id}`);
                return (
                  <li key={p.id} className="pista pista--ya">
                    <span className="pista__num">✓</span>
                    <span className="pista__texto">
                      <span className="pista__artista">{p.artista}</span>
                      <span className="pista__cancion">{p.cancion}</span>
                    </span>
                    {mia && <span className="pista__tuya">Tuya</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
