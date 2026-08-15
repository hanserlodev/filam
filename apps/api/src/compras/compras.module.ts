import { Module } from "@nestjs/common";
import { ComprasController } from "./compras.controller";
import { InventarioModule } from "../inventario/inventario.module";

@Module({
  imports: [InventarioModule],
  controllers: [ComprasController],
})
export class ComprasModule {}
