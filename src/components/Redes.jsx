import { FaWhatsapp, FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa';
import { REDES } from '../config';

const LISTA = [
  { clave: 'whatsapp', nombre: 'WhatsApp', Icono: FaWhatsapp },
  { clave: 'facebook', nombre: 'Facebook', Icono: FaFacebookF },
  { clave: 'instagram', nombre: 'Instagram', Icono: FaInstagram },
  { clave: 'tiktok', nombre: 'TikTok', Icono: FaTiktok },
];

export default function Redes() {
  const visibles = LISTA.filter((r) => REDES[r.clave]);
  if (!visibles.length) return null;

  return (
    <footer className="redes">
      <p className="redes__titulo">📲 SÍGUENOS</p>
      <div className="redes__iconos">
        {visibles.map(({ clave, nombre, Icono }) => (
          <a
            key={clave}
            href={REDES[clave]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={nombre}
            className={`redes__icono redes__icono--${clave}`}
          >
            <Icono />
          </a>
        ))}
      </div>
    </footer>
  );
}
