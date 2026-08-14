-- Invariantes que deben mantenerse aunque alguien escriba fuera de NestJS.
ALTER TABLE public.productos
  ADD CONSTRAINT productos_precio_nonnegative CHECK (precio >= 0),
  ADD CONSTRAINT productos_costo_nonnegative CHECK (costo IS NULL OR costo >= 0),
  ADD CONSTRAINT productos_stock_nonnegative CHECK (stock >= 0),
  ADD CONSTRAINT productos_stock_minimo_nonnegative CHECK (stock_minimo >= 0);

ALTER TABLE public.caja_sesiones
  ADD CONSTRAINT caja_sesiones_apertura_nonnegative CHECK (monto_apertura >= 0),
  ADD CONSTRAINT caja_sesiones_cierre_nonnegative CHECK (monto_cierre IS NULL OR monto_cierre >= 0);

ALTER TABLE public.ventas
  ADD CONSTRAINT ventas_total_nonnegative CHECK (total >= 0);

ALTER TABLE public.venta_items
  ADD CONSTRAINT venta_items_cantidad_positive CHECK (cantidad > 0),
  ADD CONSTRAINT venta_items_precio_nonnegative CHECK (precio_unitario >= 0);

ALTER TABLE public.compras
  ADD CONSTRAINT compras_total_nonnegative CHECK (total >= 0);

ALTER TABLE public.compra_items
  ADD CONSTRAINT compra_items_cantidad_positive CHECK (cantidad > 0),
  ADD CONSTRAINT compra_items_costo_nonnegative CHECK (costo_unitario >= 0);

CREATE UNIQUE INDEX caja_sesiones_usuario_abierta_uidx
  ON public.caja_sesiones (usuario_id)
  WHERE estado = 'abierta';

CREATE INDEX venta_items_producto_id_idx ON public.venta_items (producto_id);
CREATE INDEX compra_items_producto_id_idx ON public.compra_items (producto_id);
CREATE INDEX productos_atributos_gin_idx ON public.productos USING GIN (atributos);
