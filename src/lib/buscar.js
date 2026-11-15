// Sugerencias de canciones con el buscador gratuito de Apple Music (iTunes).
// Se usa el método "JSONP" porque Apple no permite llamadas normales desde otras páginas.
import { claveCancion } from './texto';

let contador = 0;

// Quita agregados como "(feat. ...)", "(En Vivo)" o "- Remastered 2011"
function limpiarTitulo(texto = '') {
  return texto
    .replace(/\s*[([][^)\]]*(feat\.?|ft\.?|with |remaster|en vivo|live|versi[oó]n|edit)[^)\]]*[)\]]/gi, '')
    .replace(/\s+-\s+.*(remaster|en vivo|live).*$/i, '')
    .trim()
    .slice(0, 80);
}

export function buscarCanciones(termino) {
  return new Promise((resolver) => {
    const nombre = `__smBuscar${Date.now()}${contador++}`;
    const script = document.createElement('script');

    const terminar = (resultados) => {
      clearTimeout(limite);
      window[nombre] = () => {}; // por si la respuesta llega tarde
      script.remove();
      resolver(resultados);
    };
    const limite = setTimeout(() => terminar([]), 6000);

    window[nombre] = (datos) => {
      const vistos = new Set();
      const lista = [];
      for (const r of datos?.results ?? []) {
        const artista = limpiarTitulo(r.artistName);
        const cancion = limpiarTitulo(r.trackName);
        const clave = claveCancion(artista, cancion);
        if (!clave || vistos.has(clave)) continue;
        vistos.add(clave);
        lista.push({ id: clave, artista, cancion, portada: r.artworkUrl60 || '' });
        if (lista.length === 5) break;
      }
      terminar(lista);
    };
    script.onerror = () => terminar([]);

    const parametros = new URLSearchParams({
      term: termino,
      media: 'music',
      entity: 'song',
      country: 'MX',
      limit: '12',
      callback: nombre,
    });
    script.src = `https://itunes.apple.com/search?${parametros}`;
    document.head.appendChild(script);
  });
}
