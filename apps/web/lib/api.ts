const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (Array.isArray(body.message)) {
        message = body.message.join(", ");
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
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