import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Headers,
  UnauthorizedException,
} from "@nestjs/common";
import { RolUsuario } from "@prisma/client";
import { IsEmail, IsIn, IsString, MinLength } from "class-validator";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";
import { Roles } from "./roles.decorator";

class RegistrarUsuarioDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsIn([RolUsuario.cajero, RolUsuario.administrador])
  rol: RolUsuario;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Headers("authorization") authorization?: string) {
    const token = authorization?.replace("Bearer ", "");
    if (!token) throw new UnauthorizedException();
    return this.authService.me(token);
  }

  @Get("usuarios")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.administrador)
  listarUsuarios() {
    return this.authService.listarUsuarios();
  }

  @Post("usuarios")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.administrador)
  registrarUsuario(@Body() dto: RegistrarUsuarioDto) {
    return this.authService.registrarUsuario(
      dto.nombre,
      dto.email,
      dto.password,
      dto.rol
    );
  }
}