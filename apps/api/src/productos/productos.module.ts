import { Module } from "@nestjs/common";
import { ProductosController } from "./productos.controller";
import { BarcodeLookupService } from "./barcode-lookup.service";
import { InventarioModule } from "../inventario/inventario.module";

@Module({
  imports: [InventarioModule],
  controllers: [ProductosController],
  providers: [BarcodeLookupService],
})
export class ProductosModule {}
