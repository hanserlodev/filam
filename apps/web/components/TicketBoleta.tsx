"use client";

import { formatCurrency } from "@/lib/utils";
import { numeroALetras } from "@/lib/monto-letras";

export interface BoletaItem {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

export interface BoletaData {
  negocio: { nombre_negocio: string; ruc: string | null; direccion: string | null };
  comprobante: string;
  numero: string;
  fecha: string;
  items: BoletaItem[];
  subtotal: number;
  total: number;
}

const IGV_TASA = 0.18;

export default function TicketBoleta({ data, modo }: { data: BoletaData; modo: "a4" | "termica" }) {
  const { items, subtotal, total } = data;

  // El total incluye IGV. Se separa el monto gravado y el IGV.
  const montoGravado = subtotal / (1 + IGV_TASA);
  const igv = subtotal - montoGravado;

  const esA4 = modo === "a4";

  const itemRows = (estilo: "a4" | "termica") => (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 700,
          borderBottom: "1px solid #94a3b8",
          paddingBottom: 4,
          marginBottom: 4,
          fontSize: estilo === "a4" ? 12 : 11,
        }}
      >
        <span>CANT</span>
        <span style={{ flex: 1, paddingLeft: 8 }}>DESCRIPCIÓN</span>
        <span>P. UNIT</span>
        <span style={{ minWidth: 70, textAlign: "right" }}>IMPORTE</span>
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: estilo === "a4" ? 12 : 11,
            padding: "2px 0",
          }}
        >
          <span style={{ minWidth: 34 }}>{item.cantidad}</span>
          <span style={{ flex: 1, paddingLeft: 8 }}>{item.nombre}</span>
          <span style={{ minWidth: 52, textAlign: "right" }}>
            {formatCurrency(item.precio_unitario)}
          </span>
          <span style={{ minWidth: 70, textAlign: "right", fontWeight: 600 }}>
            {formatCurrency(item.cantidad * item.precio_unitario)}
          </span>
        </div>
      ))}
    </>
  );

  const totales = (estilo: "a4" | "termica") => (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}>
        <span>OP. GRAVADAS</span>
        <span>{formatCurrency(montoGravado)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0" }}>
        <span>IGV (18%)</span>
        <span>{formatCurrency(igv)}</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: estilo === "a4" ? 16 : 14,
          fontWeight: 800,
          borderTop: "1px solid #94a3b8",
          borderBottom: "1px solid #94a3b8",
          padding: "6px 0",
          marginTop: 4,
        }}
      >
        <span>TOTAL</span>
        <span>{formatCurrency(total)}</span>
      </div>
      <div style={{ fontSize: 11, marginTop: 6, textAlign: "center", fontWeight: 600 }}>
        {numeroALetras(total)}
      </div>
    </>
  );

  if (esA4) {
    return (
      <div
        style={{
          width: "210mm",
          minHeight: "297mm",
          margin: "0 auto",
          background: "white",
          padding: "14mm",
          fontSize: 12,
          fontFamily: "Arial, Helvetica, sans-serif",
          color: "#0f172a",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #1e40af", paddingBottom: 10 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{data.negocio.nombre_negocio}</div>
            <div>RUC: {data.negocio.ruc || "—"}</div>
            <div>{data.negocio.direccion || ""}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{data.comprobante}</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{data.numero}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, margin: "10px 0", fontSize: 12 }}>
          <div>
            <span style={{ fontWeight: 700 }}>Fecha de emisión: </span>
            {data.fecha}
          </div>
          <div>
            <span style={{ fontWeight: 700 }}>Moneda: </span>Soles (S/)
          </div>
        </div>

        {itemRows("a4")}
        {totales("a4")}

        <div style={{ marginTop: 40, borderTop: "1px solid #94a3b8", paddingTop: 10, textAlign: "center", fontSize: 11 }}>
          {data.negocio.nombre_negocio} — Gracias por su compra
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, color: "#0f172a" }}>
      <div style={{ textAlign: "center", fontWeight: 800, fontSize: 14 }}>
        {data.negocio.nombre_negocio}
      </div>
      <div style={{ textAlign: "center" }}>RUC: {data.negocio.ruc || "—"}</div>
      {data.negocio.direccion && <div style={{ textAlign: "center" }}>{data.negocio.direccion}</div>}
      <div style={{ textAlign: "center", fontWeight: 700, margin: "6px 0" }}>
        {data.comprobante}
      </div>
      <div>N°: {data.numero}</div>
      <div>Emisión: {data.fecha}</div>
      <hr style={{ borderColor: "#94a3b8", margin: "6px 0" }} />
      {itemRows("termica")}
      <hr style={{ borderColor: "#94a3b8", margin: "6px 0" }} />
      {totales("termica")}
      <div style={{ textAlign: "center", marginTop: 10 }}>Gracias por su compra</div>
    </div>
  );
}
