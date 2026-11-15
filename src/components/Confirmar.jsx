// Ventana de confirmación reutilizable
export default function Confirmar({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = 'Eliminar',
  peligro = true,
  ocupado = false,
  deshabilitado = false,
  onCancelar,
  onConfirmar,
  children,
}) {
  if (!abierto) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} onClick={onCancelar}>
      <div className="modal__caja" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__titulo">{titulo}</h3>
        {mensaje && <p className="modal__mensaje">{mensaje}</p>}
        {children}
        <div className="modal__botones">
          <button type="button" className="btn btn--fantasma" onClick={onCancelar} disabled={ocupado}>
            Cancelar
          </button>
          <button
            type="button"
            className={peligro ? 'btn btn--peligro' : 'btn btn--primario'}
            onClick={onConfirmar}
            disabled={ocupado || deshabilitado}
          >
            {ocupado ? 'Un momento…' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
