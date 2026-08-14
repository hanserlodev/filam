import { PrismaClient, RolUsuario, UnidadMedida, MetodoPago } from "@prisma/client";

const prisma = new PrismaClient();

const GOTRUE_ADMIN_URL = process.env.GOTRUE_URL
  ? `${process.env.GOTRUE_URL.replace(/\/$/, "")}/admin`
  : "";
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY || "";

async function crearUsuarioGoTrue(
  nombre: string,
  email: string,
  password: string,
  rol: RolUsuario
): Promise<string> {
  const res = await fetch(`${GOTRUE_ADMIN_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, rol },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (body?.msg?.includes("already been registered")) {
      const listado = await fetch(`${GOTRUE_ADMIN_URL}/users?per_page=1000`, {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }).then((r) => r.json());
      const existente = listado.users?.find((u: { email?: string }) => u.email === email);
      if (existente?.id) return existente.id;
    }
    throw new Error(`Error creando ${email} en GoTrue: ${body?.msg || res.status}`);
  }

  const goTrueUser = (await res.json()) as { id: string };
  return goTrueUser.id;
}

async function main() {
  if (!GOTRUE_ADMIN_URL || !SERVICE_ROLE_KEY) {
    throw new Error("GOTRUE_URL y SERVICE_ROLE_KEY son requeridas para el seed (creación de usuarios en GoTrue).");
  }

  const adminId = await crearUsuarioGoTrue(
    "Administrador",
    "admin@filam.pe",
    "admin123",
    RolUsuario.administrador
  );
  const cajeroId = await crearUsuarioGoTrue(
    "Cajero Demo",
    "cajero@filam.pe",
    "cajero123",
    RolUsuario.cajero
  );

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@filam.pe" },
    update: { id: adminId },
    create: {
      id: adminId,
      nombre: "Administrador",
      email: "admin@filam.pe",
      rol: RolUsuario.administrador,
    },
  });

  const cajero = await prisma.usuario.upsert({
    where: { email: "cajero@filam.pe" },
    update: { id: cajeroId },
    create: {
      id: cajeroId,
      nombre: "Cajero Demo",
      email: "cajero@filam.pe",
      rol: RolUsuario.cajero,
    },
  });

  const categorias = [
    { nombre: "Herramientas", orden: 1 },
    { nombre: "Insumos eléctricos", orden: 2 },
    { nombre: "Materiales de construcción", orden: 3 },
    { nombre: "Ferretería general", orden: 4 },
    { nombre: "Fijaciones", orden: 5 },
    { nombre: "Pinturas", orden: 6 },
  ];

  const catMap: Record<string, string> = {};
  for (const c of categorias) {
    const creada = await prisma.categoria.upsert({
      where: { nombre: c.nombre },
      update: {},
      create: c,
    });
    catMap[c.nombre] = creada.id;
  }

  const productos = [
    {
      nombre: "Martillo de uña 16oz",
      codigo_barras: "7750199000101",
      sku: "HERR-MART-016",
      precio: 28.5,
      costo: 18.0,
      stock: 25,
      unidad_medida: UnidadMedida.unidad,
      stock_minimo: 5,
      categoria: "Herramientas",
      atributos: { marca: "Tramontina", presentacion: "1 unidad" },
    },
    {
      nombre: "Taladro percutor 600W",
      codigo_barras: "7750199000102",
      sku: "HERR-TALA-600",
      precio: 189.0,
      costo: 130.0,
      stock: 8,
      unidad_medida: UnidadMedida.unidad,
      stock_minimo: 3,
      categoria: "Herramientas",
      atributos: { marca: "Black+Decker", presentacion: "1 unidad" },
    },
    {
      nombre: "Cable eléctrico 3x2.5mm",
      codigo_barras: "7750199000103",
      sku: "ELEC-CBLE-025",
      precio: 4.8,
      costo: 3.2,
      stock: 200,
      unidad_medida: UnidadMedida.metro,
      stock_minimo: 50,
      categoria: "Insumos eléctricos",
      atributos: { marca: "Indeco", presentacion: "por metro" },
    },
    {
      nombre: "Interruptor simple",
      codigo_barras: "7750199000104",
      sku: "ELEC-INT-SIMP",
      precio: 6.9,
      costo: 4.1,
      stock: 60,
      unidad_medida: UnidadMedida.unidad,
      stock_minimo: 10,
      categoria: "Insumos eléctricos",
      atributos: { marca: "Bticino", presentacion: "1 unidad" },
    },
    {
      nombre: "Cemento portland 42.5kg",
      codigo_barras: "7750199000105",
      sku: "MATE-CEMT-425",
      precio: 32.0,
      costo: 26.5,
      stock: 40,
      unidad_medida: UnidadMedida.unidad,
      stock_minimo: 10,
      categoria: "Materiales de construcción",
      atributos: { marca: "Sol", presentacion: "bolsa 42.5kg" },
    },
    {
      nombre: "Arena gruesa",
      codigo_barras: "7750199000106",
      sku: "MATE-AREN-GRU",
      precio: 45.0,
      costo: 35.0,
      stock: 0,
      unidad_medida: UnidadMedida.caja,
      stock_minimo: 2,
      categoria: "Materiales de construcción",
      atributos: { presentacion: "m3" },
    },
    {
      nombre: "Tornillo autorroscante 1/2x8",
      codigo_barras: "7750199000107",
      sku: "FIJ-TORN-008",
      precio: 0.25,
      costo: 0.12,
      stock: 1000,
      unidad_medida: UnidadMedida.unidad,
      stock_minimo: 200,
      categoria: "Fijaciones",
      atributos: { material: "acero", presentacion: "unidad" },
    },
    {
      nombre: "Clavo acero 3\"",
      codigo_barras: "7750199000108",
      sku: "FIJ-CLAV-003",
      precio: 12.0,
      costo: 8.0,
      stock: 15,
      unidad_medida: UnidadMedida.caja,
      stock_minimo: 5,
      categoria: "Fijaciones",
      atributos: { material: "acero", presentacion: "caja 1kg" },
    },
    {
      nombre: "Pintura esmalte blanco 1L",
      codigo_barras: "7750199000109",
      sku: "PINT-ESM-001",
      precio: 38.0,
      costo: 27.0,
      stock: 18,
      unidad_medida: UnidadMedida.litro,
      stock_minimo: 6,
      categoria: "Pinturas",
      atributos: { marca: "Tekno", presentacion: "lata 1L" },
    },
    {
      nombre: "Thinner x 1L",
      codigo_barras: "7750199000110",
      sku: "PINT-THN-001",
      precio: 15.0,
      costo: 9.5,
      stock: 4,
      unidad_medida: UnidadMedida.litro,
      stock_minimo: 5,
      categoria: "Pinturas",
      atributos: { presentacion: "botella 1L" },
    },
    {
      nombre: "Candado 40mm",
      codigo_barras: "7750199000111",
      sku: "FERR-CAND-040",
      precio: 22.0,
      costo: 14.0,
      stock: 30,
      unidad_medida: UnidadMedida.unidad,
      stock_minimo: 8,
      categoria: "Ferretería general",
      atributos: { marca: "Fortress", presentacion: "1 unidad" },
    },
    {
      nombre: "Cinta aislante negra",
      codigo_barras: "7750199000112",
      sku: "ELEC-CINT-AIS",
      precio: 3.5,
      costo: 2.0,
      stock: 80,
      unidad_medida: UnidadMedida.unidad,
      stock_minimo: 20,
      categoria: "Insumos eléctricos",
      atributos: { marca: "3M", presentacion: "1 unidad" },
    },
  ];

  for (const p of productos) {
    await prisma.producto.upsert({
      where: { codigo_barras: p.codigo_barras },
      update: {},
      create: {
        nombre: p.nombre,
        codigo_barras: p.codigo_barras,
        sku: p.sku,
        precio: p.precio,
        costo: p.costo,
        stock: p.stock,
        unidad_medida: p.unidad_medida,
        stock_minimo: p.stock_minimo,
        categoria_id: catMap[p.categoria],
        atributos: p.atributos,
      },
    });
  }

  const sesionAbierta = await prisma.cajaSesion.findFirst({
    where: { usuario_id: cajero.id, estado: "abierta" },
  });

  if (!sesionAbierta) {
    await prisma.cajaSesion.create({
      data: {
        usuario_id: cajero.id,
        monto_apertura: 200,
        estado: "abierta",
      },
    });
  }

  console.log("Seed completado.");
  console.log(`  Admin: ${admin.email} (${admin.rol})`);
  console.log(`  Cajero: ${cajero.email} (${cajero.rol})`);
  console.log(`  ${productos.length} productos en ${categorias.length} categorías`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
