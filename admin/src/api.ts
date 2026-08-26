const DEFAULT_ADMIN_API_URL = "https://cloudbase-d1gtlpks0104b2e4f-1472669803.ap-shanghai.app.tcloudbase.com/api";
const configuredApiUrl = String(import.meta.env.VITE_ADMIN_API_URL || DEFAULT_ADMIN_API_URL).replace(/\/$/, "");
const TOKEN_KEY = "ruc_admin_web_session_v1";

export class AdminApiError extends Error {
  code: string;

  constructor(message: string, code = "ADMIN_API_ERROR") {
    super(message);
    this.code = code;
  }
}

export function getAdminToken() {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

export function clearAdminToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function adminRequest<T>(path: string, options: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  if (!configuredApiUrl) throw new AdminApiError("管理接口尚未完成部署配置", "API_URL_MISSING");
  const response = await fetch(`${configuredApiUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token === "" ? {} : { Authorization: `Bearer ${options.token || getAdminToken()}` }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const result = await response.json().catch(() => ({ ok: false, message: "接口返回格式错误" }));
  if (!response.ok || !result.ok) throw new AdminApiError(result.message || "请求失败", result.code);
  return result as T;
}

export async function loginAdmin(username: string, password: string) {
  const result = await adminRequest<{ ok: true; token: string; username: string }>("/auth/login", {
    method: "POST",
    body: { username, password },
    token: "",
  });
  sessionStorage.setItem(TOKEN_KEY, result.token);
  return result;
}
