import { Module } from "@nestjs/common";
import { CajaController } from "./caja.controller";
import { EvidenciasController } from "./evidencias.controller";

@Module({
  controllers: [CajaController, EvidenciasController],
})
export class CajaModule {}
