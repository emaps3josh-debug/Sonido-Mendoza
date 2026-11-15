import { Fragment } from 'react';

const EMOJI = /\p{Extended_Pictographic}/u;

// Separa el texto en letras (respetando acentos y emojis)
function partir(texto) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return [...new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(texto)].map((s) => s.segment);
  }
  return Array.from(texto);
}

// Nombre del evento con letras que caen una por una, una y otra vez
export default function TituloAnimado({ texto }) {
  const palabras = texto.trim().split(/\s+/);
  let indice = 1;

  return (
    <h2 className="titulo-animado" aria-label={texto}>
      <span className="titulo-animado__fiesta" aria-hidden="true">
        <span className="titulo-animado__letra" style={{ '--i': 0 }}>🎉</span>
      </span>
      {palabras.map((palabra, p) => (
        <Fragment key={p}>
          {p > 0 && ' '}
          <span className="titulo-animado__palabra" aria-hidden="true">
            {partir(palabra).map((letra, l) => (
              <span
                key={l}
                className={EMOJI.test(letra) ? 'titulo-animado__letra titulo-animado__letra--emoji' : 'titulo-animado__letra'}
                style={{ '--i': indice++ }}
              >
                {letra}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </h2>
  );
}
