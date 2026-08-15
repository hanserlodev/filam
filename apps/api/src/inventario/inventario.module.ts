import { Module } from "@nestjs/common";
import { InventarioController } from "./inventario.controller";
import { PrecioHistoricoService } from "./precio-historico.service";

@Module({
  controllers: [InventarioController],
  providers: [PrecioHistoricoService],
  exports: [PrecioHistoricoService],
})
export class InventarioModule {}
