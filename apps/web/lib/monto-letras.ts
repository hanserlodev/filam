const UNIDADES = [
  "", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE",
  "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS",
  "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE",
];
const DECENAS = [
  "", "", "VEINTI", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA",
  "SETENTA", "OCHENTA", "NOVENTA",
];
const CENTENAS = [
  "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
  "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS",
];

function convertirTresDigitos(n: number): string {
  if (n === 0) return "";
  const centenas = Math.floor(n / 100);
  const resto = n % 100;
  let texto = "";
  if (centenas === 1 && resto === 0) texto = "CIEN";
  else texto = CENTENAS[centenas];

  if (resto === 0) return texto;

  let decena;
  if (resto <= 20) {
    decena = UNIDADES[resto];
  } else {
    const dec = Math.floor(resto / 10);
    const uni = resto % 10;
    if (dec === 2 && uni === 0) {
      decena = "VEINTE";
    } else if (dec === 2 && uni > 0) {
      decena = `VEINTI${UNIDADES[uni]}`;
    } else {
      decena = `${DECENAS[dec]}${uni > 0 ? ` Y ${UNIDADES[uni]}` : ""}`;
    }
  }

  return texto ? `${texto} ${decena}` : decena;
}

export function numeroALetras(numero: number): string {
  const entero = Math.floor(Math.abs(numero));
  const centavos = Math.round((Math.abs(numero) - entero) * 100);

  const millones = Math.floor(entero / 1000000);
  const milesYResto = entero % 1000000;
  const miles = Math.floor(milesYResto / 1000);
  const resto = milesYResto % 1000;

  let texto = "";

  if (millones === 1) texto = "UN MILLÓN";
  else if (millones > 1) texto = `${convertirTresDigitos(millones)} MILLONES`;

  if (miles === 1) {
    texto = texto ? `${texto} MIL` : "MIL";
  } else if (miles > 1) {
    const milesTexto = convertirTresDigitos(miles);
    texto = texto ? `${texto} ${milesTexto} MIL` : `${milesTexto} MIL`;
  }

  const restoTexto = convertirTresDigitos(resto);
  if (restoTexto) {
    texto = texto ? `${texto} ${restoTexto}` : restoTexto;
  }

  if (!texto) texto = "CERO";

  // Formato SUNAT: "SON: ... Y NN/100 SOLES"
  return `SON: ${texto} Y ${centavos.toString().padStart(2, "0")}/100 SOLES`;
}
