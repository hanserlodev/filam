import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
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
import { InventarioModule } from "./inventario/inventario.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
    }),
    // Rate limiting global: límite por IP a la API (AUDITORIA.md F2.4).
    // 120 peticiones / minuto por IP; ajustable por entorno.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: Number(process.env.RATE_LIMIT_PER_MINUTE) || 120,
      },
    ]),
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
    InventarioModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
