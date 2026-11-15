import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import Marca from '../components/Marca.jsx';
import Confirmar from '../components/Confirmar.jsx';
import { useAjustes, useFondo, usePeticiones } from '../lib/hooks';
import { comprimirImagen } from '../lib/imagen';
import {
  cambiarActivo,
  cambiarEstado,
  cambiarLimite,
  cambiarPedirCodigo,
  cambiarTitulo,
  eliminarPeticion,
  guardarFondo,
  limpiarCola,
  nuevoCodigo,
  nuevoEvento,
  ordenarSonadas,
  quitarFondo,
} from '../lib/datos';
import { hora } from '../lib/texto';
import { DOMINIO_ADMIN, LIMITE_COLA_INICIAL, MAX_CARACTERES, equipoDeCorreo } from '../config';

export default function Admin() {
  const [usuario, setUsuario] = useState(undefined); // undefined = revisando sesión

  useEffect(() => onAuthStateChanged(auth, setUsuario), []);

  if (usuario === undefined) {
    return (
      <div className="pagina">
        <p className="estado-pagina">Cargando…</p>
      </div>
    );
  }
  if (!usuario) return <Login />;

  const equipo = equipoDeCorreo(usuario.email);
  if (!equipo) {
    return (
      <div className="pagina">
        <div className="estado-pagina">
          <p className="estado-pagina__titulo">Este usuario no tiene equipo asignado</p>
          <p>Agrégalo en la lista EQUIPOS de src/config.js.</p>
          <button type="button" className="btn btn--fantasma" onClick={() => signOut(auth)}>
            Salir
          </button>
        </div>
      </div>
    );
  }
  return <Panel equipo={equipo} />;
}

// ======================= LOGIN =======================

function Login() {
  const [nombre, setNombre] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [entrando, setEntrando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setError('');
    setEntrando(true);
    const limpio = nombre.trim().toLowerCase();
    const correo = limpio.includes('@') ? limpio : `${limpio}@${DOMINIO_ADMIN}`;
    try {
      await signInWithEmailAndPassword(auth, correo, clave);
    } catch {
      setError('Usuario o contraseña incorrectos.');
      setEntrando(false);
    }
  }

  return (
    <div className="pagina">
      <Marca chica />
      <main className="contenido">
        <form className="login" onSubmit={entrar}>
          <h2 className="login__titulo">Panel del DJ</h2>
          <label className="campo">
            <span className="campo__etiqueta">Usuario</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              required
            />
          </label>
          <label className="campo">
            <span className="campo__etiqueta">Contraseña</span>
            <input
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" className="btn btn--primario btn--enviar" disabled={entrando}>
            {entrando ? 'Entrando…' : 'Entrar'}
          </button>
          {error && <p className="mensaje mensaje--error">{error}</p>}
        </form>
      </main>
    </div>
  );
}

// ======================= PANEL =======================

function Panel({ equipo }) {
  const { cargando, ajustes } = useAjustes(equipo.id);
  const terminado = ajustes?.activo === false;
  // Eventos creados antes del código de fiesta: hay que iniciar uno nuevo
  const sinEvento = !ajustes || !ajustes.codigo;
  const pedirCodigo = ajustes?.pedirCodigo !== false;
  const eventoId = ajustes?.eventoId;
  const peticiones = usePeticiones(eventoId);
  const fondo = useFondo(eventoId);

  const enCola = useMemo(() => peticiones.filter((p) => p.estado === 'cola'), [peticiones]);
  const reproducidas = useMemo(() => ordenarSonadas(peticiones), [peticiones]);

  const [titulo, setTitulo] = useState('');
  const [limite, setLimite] = useState('');
  const [modal, setModal] = useState(null); // { tipo: 'eliminar' | 'limpiar' | 'nuevo', peticion? }
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');
  const temporizador = useRef(null);

  useEffect(() => setTitulo(ajustes?.titulo ?? ''), [ajustes?.titulo]);
  useEffect(
    () => setLimite(String(ajustes?.limiteCola ?? LIMITE_COLA_INICIAL)),
    [ajustes?.limiteCola]
  );
  useEffect(() => () => clearTimeout(temporizador.current), []);

  function mostrarAviso(texto) {
    setAviso(texto);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso(''), 2500);
  }

  async function ejecutar(accion, textoListo, textoError = '⚠️ No se pudo guardar. Revisa tu conexión.') {
    setOcupado(true);
    try {
      await accion();
      setModal(null);
      if (textoListo) mostrarAviso(textoListo);
    } catch (err) {
      console.error(err);
      mostrarAviso(textoError);
    } finally {
      setOcupado(false);
    }
  }

  // Cambios rápidos durante el evento: sin ventana de confirmación
  function marcar(p, estado) {
    cambiarEstado(eventoId, p.id, estado).catch((err) => {
      console.error(err);
      mostrarAviso('⚠️ No se pudo guardar. Revisa tu conexión.');
    });
  }

  function guardarTitulo(e) {
    e.preventDefault();
    const limpio = titulo.trim();
    if (!limpio || limpio === ajustes.titulo) return;
    ejecutar(() => cambiarTitulo(equipo.id, eventoId, limpio), '✓ Título actualizado');
  }

  function guardarLimite(e) {
    e.preventDefault();
    const n = Math.min(200, Math.max(1, parseInt(limite, 10) || LIMITE_COLA_INICIAL));
    setLimite(String(n));
    ejecutar(() => cambiarLimite(equipo.id, eventoId, n), '✓ Límite actualizado');
  }

  function subirFoto(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    ejecutar(
      async () => guardarFondo(eventoId, await comprimirImagen(archivo)),
      '📷 Foto de fondo guardada',
      '⚠️ No se pudo usar esa foto. Prueba con otra en JPG o PNG.'
    );
  }

  function abrirNuevoEvento() {
    setNuevoTitulo('');
    setModal({ tipo: 'nuevo' });
  }

  function crearEvento() {
    const limpio = nuevoTitulo.trim();
    if (!limpio) return;
    ejecutar(
      () => nuevoEvento(equipo.id, limpio, ajustes?.limiteCola ?? LIMITE_COLA_INICIAL, ajustes),
      `🎉 Evento "${limpio}" listo`
    );
  }

  const campoNuevoEvento = (
    <label className="campo">
      <span className="campo__etiqueta">Nombre del evento</span>
      <input
        value={nuevoTitulo}
        onChange={(e) => setNuevoTitulo(e.target.value)}
        placeholder="Bautizo Rafa"
        maxLength={MAX_CARACTERES}
        autoFocus
      />
    </label>
  );

  return (
    <div className="pagina pagina--panel">
      <div className="barra">
        <Marca chica />
        <span className="barra__equipo">{equipo.nombre}</span>
        <button type="button" className="btn btn--fantasma btn--chico" onClick={() => signOut(auth)}>
          Salir
        </button>
      </div>

      <main className="contenido contenido--panel">
        {cargando && <p className="estado-pagina">Cargando…</p>}

        {/* Primera vez: todavía no existe ningún evento */}
        {!cargando && sinEvento && (
          <section className="bloque">
            <h2 className="bloque__titulo">{ajustes ? 'Inicia tu evento de nuevo' : 'Crea tu primer evento'}</h2>
            <p className="bloque__ayuda">
              {ajustes
                ? 'La plataforma se actualizó con el código de fiesta. Inicia el evento otra vez para obtener su código.'
                : 'Así se llamará en la página que ven los invitados.'}
            </p>
            {campoNuevoEvento}
            <button
              type="button"
              className="btn btn--primario btn--enviar"
              onClick={crearEvento}
              disabled={ocupado || !nuevoTitulo.trim()}
            >
              Iniciar evento
            </button>
          </section>
        )}

        {!sinEvento && (
          <>
            {terminado && (
              <section className="bloque bloque--terminado">
                <p className="bloque__titulo">🏁 Evento terminado</p>
                <p className="bloque__ayuda">
                  Los invitados ya no ven este evento. Inicia uno nuevo o reábrelo si fue un error.
                </p>
                <button
                  type="button"
                  className="btn btn--fantasma"
                  disabled={ocupado}
                  onClick={() => ejecutar(() => cambiarActivo(equipo.id, eventoId, true), '✓ Evento abierto de nuevo')}
                >
                  ↩ Reabrir evento
                </button>
              </section>
            )}

            {/* ---------- Evento actual ---------- */}
            <section className="bloque">
              <form className="fila-form" onSubmit={guardarTitulo}>
                <label className="campo campo--crece">
                  <span className="campo__etiqueta">Evento actual</span>
                  <input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    maxLength={MAX_CARACTERES}
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn--primario"
                  disabled={ocupado || !titulo.trim() || titulo.trim() === ajustes.titulo}
                >
                  Guardar
                </button>
              </form>

              {/* ---------- Código de la fiesta ---------- */}
              <div className="codigo-panel">
                <div className="codigo-panel__dato">
                  <span className="codigo-panel__etiqueta">🔑 Código de la fiesta</span>
                  <span className={pedirCodigo ? 'codigo-panel__numero' : 'codigo-panel__numero codigo-panel__numero--apagado'}>
                    {ajustes.codigo}
                  </span>
                  <span className="codigo-panel__ayuda">
                    {pedirCodigo
                      ? 'Dilo por el micrófono o ponlo en la cabina.'
                      : 'Apagado: los invitados entran sin código.'}
                  </span>
                </div>
                <div className="codigo-panel__acciones">
                  <label className="interruptor">
                    <input
                      type="checkbox"
                      checked={pedirCodigo}
                      disabled={ocupado}
                      onChange={(e) => {
                        const valor = e.target.checked;
                        ejecutar(
                          () => cambiarPedirCodigo(equipo.id, eventoId, valor),
                          valor ? '🔑 Ahora se pide código' : 'Los invitados entran sin código'
                        );
                      }}
                    />
                    <span className="interruptor__riel" aria-hidden="true" />
                    <span>Pedir código</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn--fantasma btn--chico"
                    disabled={ocupado}
                    onClick={() => setModal({ tipo: 'codigo' })}
                  >
                    🔄 Nuevo código
                  </button>
                </div>
              </div>

              <div className="foto">
                {fondo ? (
                  <img className="foto__vista" src={fondo} alt="Foto de fondo del evento" />
                ) : (
                  <div className="foto__vista foto__vista--vacia">Sin foto de fondo</div>
                )}
                <div className="foto__acciones">
                  <label className={ocupado ? 'btn btn--fantasma btn--deshabilitado' : 'btn btn--fantasma'}>
                    📷 {fondo ? 'Cambiar foto' : 'Subir foto de fondo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="oculto"
                      onChange={subirFoto}
                      disabled={ocupado}
                    />
                  </label>
                  {fondo && (
                    <button
                      type="button"
                      className="btn btn--fantasma"
                      disabled={ocupado}
                      onClick={() => ejecutar(() => quitarFondo(eventoId), 'Foto de fondo quitada')}
                    >
                      Quitar foto
                    </button>
                  )}
                </div>
              </div>

              <a className="enlace" href="/pedir" target="_blank" rel="noopener noreferrer">
                Ver la página de invitados ↗
              </a>
            </section>

            {/* ---------- Cola ---------- */}
            <section className="bloque">
              <h2 className="bloque__titulo">
                🟡 En cola
                <span className="bloque__cuenta">
                  {enCola.length} / {ajustes.limiteCola ?? LIMITE_COLA_INICIAL}
                </span>
              </h2>

              {enCola.length === 0 ? (
                <p className="cola__vacia">No hay canciones pendientes.</p>
              ) : (
                <ol className="lista">
                  {enCola.map((p, i) => (
                    <li key={p.id} className="pista pista--admin">
                      <span className="pista__num">{i + 1}</span>
                      <span className="pista__texto">
                        <span className="pista__artista">{p.artista}</span>
                        <span className="pista__cancion">{p.cancion}</span>
                        <span className="pista__hora">{hora(p.creada)}</span>
                      </span>
                      <span className="pista__acciones">
                        <button
                          type="button"
                          className="btn btn--reproducida"
                          onClick={() => marcar(p, 'reproducida')}
                        >
                          ✓ REPRODUCIDA
                        </button>
                        <button
                          type="button"
                          className="btn btn--icono"
                          aria-label={`Eliminar ${p.cancion}`}
                          onClick={() => setModal({ tipo: 'eliminar', peticion: p })}
                        >
                          🗑
                        </button>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* ---------- Reproducidas ---------- */}
            {reproducidas.length > 0 && (
              <details className="bloque bloque--plegable">
                <summary className="bloque__titulo">
                  🟢 Reproducidas
                  <span className="bloque__cuenta">{reproducidas.length}</span>
                </summary>
                <ul className="lista lista--reproducidas">
                  {reproducidas.map((p) => (
                    <li key={p.id} className="pista pista--admin pista--sonada">
                      <span className="pista__texto">
                        <span className="pista__artista">{p.artista}</span>
                        <span className="pista__cancion">{p.cancion}</span>
                      </span>
                      <span className="pista__acciones">
                        <button
                          type="button"
                          className="btn btn--fantasma btn--chico"
                          onClick={() => marcar(p, 'cola')}
                        >
                          ↩ Regresar
                        </button>
                        <button
                          type="button"
                          className="btn btn--icono"
                          aria-label={`Eliminar ${p.cancion}`}
                          onClick={() => setModal({ tipo: 'eliminar', peticion: p })}
                        >
                          🗑
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {/* ---------- Ajustes y acciones ---------- */}
            <section className="bloque">
              <form className="fila-form" onSubmit={guardarLimite}>
                <label className="campo campo--crece">
                  <span className="campo__etiqueta">Máximo de canciones pendientes</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="200"
                    value={limite}
                    onChange={(e) => setLimite(e.target.value)}
                  />
                </label>
                <button type="submit" className="btn btn--fantasma" disabled={ocupado}>
                  Guardar
                </button>
              </form>

              <div className="acciones">
                <button type="button" className="btn btn--primario btn--enviar" onClick={abrirNuevoEvento}>
                  🎉 NUEVO EVENTO
                </button>
                <button
                  type="button"
                  className="btn btn--peligro-suave"
                  onClick={() => setModal({ tipo: 'limpiar' })}
                  disabled={peticiones.length === 0}
                >
                  🗑 LIMPIAR TODA LA COLA
                </button>
                {!terminado && (
                  <button
                    type="button"
                    className="btn btn--fantasma acciones__completo"
                    onClick={() => setModal({ tipo: 'terminar' })}
                  >
                    🏁 TERMINAR EVENTO
                  </button>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {aviso && (
        <p className="aviso" role="status">
          {aviso}
        </p>
      )}

      {/* ---------- Ventanas de confirmación ---------- */}
      <Confirmar
        abierto={modal?.tipo === 'eliminar'}
        titulo="¿Eliminar esta canción?"
        mensaje={modal?.peticion ? `${modal.peticion.artista} — ${modal.peticion.cancion}` : ''}
        ocupado={ocupado}
        onCancelar={() => setModal(null)}
        onConfirmar={() => ejecutar(() => eliminarPeticion(eventoId, modal.peticion.id), '🗑 Canción eliminada')}
      />

      <Confirmar
        abierto={modal?.tipo === 'limpiar'}
        titulo="¿Seguro que quieres eliminar todas las peticiones?"
        mensaje="Se borran las canciones en cola y las reproducidas de este evento."
        textoConfirmar="Eliminar todo"
        ocupado={ocupado}
        onCancelar={() => setModal(null)}
        onConfirmar={() => ejecutar(() => limpiarCola(eventoId), '🗑 Cola vacía')}
      />

      <Confirmar
        abierto={modal?.tipo === 'codigo'}
        titulo="¿Cambiar el código?"
        mensaje="Úsalo si alguien que no es de la fiesta se lo aprendió. Los invitados tendrán que escribir el código nuevo."
        textoConfirmar="Cambiar código"
        peligro={false}
        ocupado={ocupado}
        onCancelar={() => setModal(null)}
        onConfirmar={() =>
          ejecutar(() => nuevoCodigo(equipo.id, eventoId, ajustes.codigo), '🔑 Código nuevo listo')
        }
      />

      <Confirmar
        abierto={modal?.tipo === 'terminar'}
        titulo="¿Terminar este evento?"
        mensaje="Los invitados dejarán de verlo. Las canciones no se borran y puedes reabrirlo si te equivocas."
        textoConfirmar="Terminar evento"
        ocupado={ocupado}
        onCancelar={() => setModal(null)}
        onConfirmar={() => ejecutar(() => cambiarActivo(equipo.id, eventoId, false), '🏁 Evento terminado')}
      />

      <Confirmar
        abierto={modal?.tipo === 'nuevo'}
        titulo="Iniciar un nuevo evento"
        mensaje="La cola empieza vacía, sin foto de fondo y con un código nuevo. El QR y la dirección siguen siendo los mismos."
        textoConfirmar="Iniciar evento"
        peligro={false}
        ocupado={ocupado}
        deshabilitado={!nuevoTitulo.trim()}
        onCancelar={() => setModal(null)}
        onConfirmar={crearEvento}
      >
        {campoNuevoEvento}
      </Confirmar>
    </div>
  );
}
