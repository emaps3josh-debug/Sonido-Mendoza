// Reduce la foto en el navegador para guardarla directo en la base de datos
// (sin Firebase Storage, que pide tarjeta). Queda de unos 150–400 KB.
export async function comprimirImagen(archivo, ladoMaximo = 1280) {
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise((ok, falla) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = falla;
      i.src = url;
    });

    const escala = Math.min(1, ladoMaximo / Math.max(img.naturalWidth, img.naturalHeight));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(img.naturalWidth * escala);
    lienzo.height = Math.round(img.naturalHeight * escala);
    lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);

    let calidad = 0.78;
    let datos = lienzo.toDataURL('image/jpeg', calidad);
    while (datos.length > 650000 && calidad > 0.4) {
      calidad -= 0.08;
      datos = lienzo.toDataURL('image/jpeg', calidad);
    }
    if (datos.length > 900000) throw new Error('La foto es demasiado grande');
    return datos;
  } finally {
    URL.revokeObjectURL(url);
  }
}
