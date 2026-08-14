import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import * as jwt from "jsonwebtoken";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksUrlCached = "";

export async function verificarTokenSupabase(
  token: string,
  gotrueUrl: string,
  hmacSecret?: string
): Promise<JWTPayload> {
  const base = gotrueUrl.replace(/\/$/, "");
  const jwksUrl = base.includes("/auth/v1")
    ? `${base}/.well-known/jwks.json`
    : `${base}/.well-known/jwks.json`;

  // Cloud: verificación asimétrica (ES256/RS256) vía JWKS.
  try {
    if (!jwks || jwksUrlCached !== jwksUrl) {
      jwks = createRemoteJWKSet(new URL(jwksUrl));
      jwksUrlCached = jwksUrl;
    }
    const { payload } = await jwtVerify(token, jwks, {
      algorithms: ["ES256", "RS256"],
      issuer: base,
      audience: "authenticated",
    });
    return payload;
  } catch (asymError) {
    // Self-hosted (producción): verificación HMAC con el secret compartido.
    if (hmacSecret) {
      try {
        const payload = jwt.verify(token, hmacSecret, {
          algorithms: ["HS256"],
          issuer: base,
          audience: "authenticated",
        }) as jwt.JwtPayload;
        return payload as JWTPayload;
      } catch {
        /* fallthrough */
      }
    }
    throw asymError;
  }
}
