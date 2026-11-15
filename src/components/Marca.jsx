import { MARCA } from '../config';

// Encabezado con el logo de Sonido Mendoza
export default function Marca({ chica = false }) {
  return (
    <header className={chica ? 'marca marca--chica' : 'marca'}>
      <h1 className="marca__logo">
        <picture>
          <source srcSet="/logo.webp" type="image/webp" />
          <img src="/logo.png" alt={MARCA.nombre} width="640" height="586" />
        </picture>
      </h1>
      <p className="marca__sub">{MARCA.subtitulo}</p>
    </header>
  );
}
