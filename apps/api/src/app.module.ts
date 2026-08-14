import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { CategoriasModule } from "./categorias/categorias.module";
import { ProductosModule } from "./productos/productos.module";
import { CajaModule } from "./caja/caja.module";
import { VentasModule } from "./ventas/ventas.module";
import { ComprasModule } from "./compras/compras.module";
import { ClientesModule } from "./clientes/clientes.module";
import { ReportesModule } from "./reportes/reportes.module";
import { ConfiguracionModule } from "./configuracion/configuracion.module";
import { CatalogoModule } from "./catalogo/catalogo.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
    PrismaModule,
    AuthModule,
    CategoriasModule,
    ProductosModule,
    CajaModule,
    VentasModule,
    ComprasModule,
    ClientesModule,
    ReportesModule,
    ConfiguracionModule,
    CatalogoModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
