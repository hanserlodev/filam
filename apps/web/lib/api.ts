const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // El backend (NestJS) monta todas las rutas bajo el prefijo global "/api"
  const url = `${API_URL}/api${path.startsWith("/") ? path : `/${path}`}`;

  // Timeout con AbortController: una conexión colgada no deja la pantalla
  // congelada (F3.3).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers, signal: controller.signal });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor. Intenta de nuevo.");
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = JSON.parse(text);
      if (Array.isArray(body.message)) {
        message = body.message.join(", ");
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      /* ignore */
    }
    // Sesión vencida: el frontend redirige al login (F3.2).
    if (res.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(res.status, message);
  }

  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string, token?: string | null) =>
    request<T>(path, {}, token),
  post: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }, token),
  patch: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }, token),
  put: <T>(path: string, body: unknown, token?: string | null) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }, token),
  del: <T>(path: string, token?: string | null) =>
    request<T>(path, { method: "DELETE" }, token),
};