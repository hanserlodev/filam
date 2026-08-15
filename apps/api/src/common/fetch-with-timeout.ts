/**
 * fetch con timeout y abort (AUDITORIA.md F2.9).
 * Evita que una dependencia externa bloqueada (GoTrue, Storage) mantenga
 * conexiones abiertas y consuma recursos del proceso.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: options.signal ?? controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
