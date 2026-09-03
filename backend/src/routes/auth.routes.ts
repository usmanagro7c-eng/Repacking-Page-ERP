import { Router } from "express";
import { erpnextConfig } from "../config/erpnext.config.js";

export const authRouter = Router();

/**
 * Helper to get ERPNext base URL
 */
function getErpUrl(customUrl?: string): string {
  const url = customUrl || erpnextConfig.url || "https://dev16.mmmc.pk";
  return url.replace(/\/$/, "");
}

/**
 * Helper to extract Frappe 'sid' session cookie from response
 */
function extractSid(res: Response): string | undefined {
  if (typeof (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === "function") {
    const cookies = (res.headers as unknown as { getSetCookie: () => string[] }).getSetCookie();
    for (const cookie of cookies) {
      const match = cookie.match(/sid=([^;]+)/);
      if (match) return match[1];
    }
  }
  const rawCookie = res.headers.get("set-cookie");
  if (rawCookie) {
    const match = rawCookie.match(/sid=([^;]+)/);
    if (match) return match[1];
  }
  return undefined;
}

/**
 * Helper to fetch a user's roles and profile using multiple fallback methods
 * (Admin token, whitelisted frappe.core.doctype.user.user.get_roles, and session).
 */
async function fetchUserRolesAndProfile(targetBase: string, sid: string, userEmail: string) {
  let roles: string[] = ["System User"];
  let fullName = userEmail;

  // Method 1: Whitelisted Frappe API for logged-in user session
  try {
    const getRolesRes = await fetch(`${targetBase}/api/method/frappe.core.doctype.user.user.get_roles`, {
      headers: {
        Cookie: `sid=${sid}`,
        Accept: "application/json",
      },
    });
    if (getRolesRes.ok) {
      const getRolesJson = (await getRolesRes.json()) as { message?: string[] };
      if (Array.isArray(getRolesJson.message) && getRolesJson.message.length > 0) {
        roles = getRolesJson.message;
      }
    }
  } catch {
    // non-fatal
  }

  // Method 2: Query /api/resource/User with Admin headers (if configured) or session
  try {
    const headers = erpnextConfig.isConfigured
      ? erpnextConfig.headers
      : { Cookie: `sid=${sid}`, Accept: "application/json" };

    const userRes = await fetch(`${targetBase}/api/resource/User/${encodeURIComponent(userEmail)}`, {
      headers,
    });
    if (userRes.ok) {
      const docJson = (await userRes.json()) as {
        data?: { full_name?: string; roles?: Array<{ role: string }> };
      };
      if (docJson.data?.full_name) fullName = docJson.data.full_name;
      if (docJson.data?.roles && docJson.data.roles.length > 0) {
        const fetchedRoles = docJson.data.roles.map((r) => r.role);
        roles = Array.from(new Set([...roles, ...fetchedRoles]));
      }
    }
  } catch {
    // non-fatal
  }

  return { roles, fullName };
}

/**
 * Helper to fetch assigned roles, User Permissions (warehouse restrictions),
 * and Stock Entry doctype permissions from ERPNext.
 */
async function fetchUserPermissions(targetBase: string, sid: string, userEmail: string, roles: string[]) {
  let allowedWarehouses: string[] = [];

  const hasRole = (pattern: string) =>
    roles.some((r) => r.toLowerCase().includes(pattern.toLowerCase()));

  const isSuperUser = hasRole("system manager") || hasRole("administrator");
  const isStockManager = hasRole("stock manager");
  const isStockUser = hasRole("stock user");
  const isMfg = hasRole("manufacturing") || hasRole("item manager");

  let canReadStockEntry = isSuperUser || isStockManager || isStockUser || isMfg;
  let canCreateStockEntry = isSuperUser || isStockManager || isStockUser || isMfg;
  let canSubmitStockEntry = isSuperUser || isStockManager;

  // 1. Fetch User Permission records for Warehouse restrictions in ERPNext
  try {
    const permHeaders = erpnextConfig.isConfigured
      ? erpnextConfig.headers
      : { Cookie: `sid=${sid}`, Accept: "application/json" };

    const permUrl = `${targetBase}/api/resource/User Permission?filters=${encodeURIComponent(
      JSON.stringify([
        ["User Permission", "user", "=", userEmail],
        ["User Permission", "allow", "=", "Warehouse"],
      ])
    )}&fields=${encodeURIComponent(JSON.stringify(["for_value"]))}`;

    const permRes = await fetch(permUrl, {
      headers: permHeaders,
    });

    if (permRes.ok) {
      const permJson = (await permRes.json()) as { data?: Array<{ for_value: string }> };
      if (permJson.data && permJson.data.length > 0) {
        allowedWarehouses = permJson.data.map((p) => String(p.for_value).trim());
      }
    }
  } catch {
    // non-fatal
  }

  // 2. Query Frappe client has_permission API with the user's session
  try {
    const [readRes, createRes, submitRes] = await Promise.all([
      fetch(`${targetBase}/api/method/frappe.client.has_permission?doctype=Stock+Entry&ptype=read`, {
        headers: { Cookie: `sid=${sid}`, Accept: "application/json" },
      }),
      fetch(`${targetBase}/api/method/frappe.client.has_permission?doctype=Stock+Entry&ptype=create`, {
        headers: { Cookie: `sid=${sid}`, Accept: "application/json" },
      }),
      fetch(`${targetBase}/api/method/frappe.client.has_permission?doctype=Stock+Entry&ptype=submit`, {
        headers: { Cookie: `sid=${sid}`, Accept: "application/json" },
      }),
    ]);

    if (readRes.ok) {
      const r = (await readRes.json()) as { message?: boolean | number };
      if (r.message !== undefined) canReadStockEntry = canReadStockEntry || Boolean(r.message);
    }
    if (createRes.ok) {
      const c = (await createRes.json()) as { message?: boolean | number };
      if (c.message !== undefined) canCreateStockEntry = canCreateStockEntry || Boolean(c.message);
    }
    if (submitRes.ok) {
      const s = (await submitRes.json()) as { message?: boolean | number };
      if (s.message !== undefined) canSubmitStockEntry = canSubmitStockEntry || Boolean(s.message);
    }
  } catch {
    // non-fatal
  }

  return {
    roles,
    allowedWarehouses,
    canReadStockEntry,
    canCreateStockEntry,
    canSubmitStockEntry,
  };
}

/**
 * POST /api/auth/login
 * Authenticate against ERPNext via /api/method/login
 */
authRouter.post("/login", async (req, res) => {
  const { usr, pwd, erpUrl } = req.body;

  if (!usr || !pwd) {
    res.status(400).json({
      success: false,
      error: "صارف نام اور پاس ورڈ دونوں درج کرنا لازمی ہے۔ (Username and password are required)",
    });
    return;
  }

  const targetBase = getErpUrl(erpUrl);
  const loginUrl = `${targetBase}/api/method/login`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const frappeRes = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        usr: String(usr).trim(),
        pwd: String(pwd),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const resText = await frappeRes.text();
    let resJson: Record<string, unknown> = {};
    try {
      resJson = JSON.parse(resText);
    } catch {
      // Non-JSON response
    }

    if (!frappeRes.ok) {
      const isAuthError =
        frappeRes.status === 401 ||
        frappeRes.status === 417 ||
        (resJson.message && String(resJson.message).toLowerCase().includes("invalid"));

      if (isAuthError) {
        res.status(401).json({
          success: false,
          error: "صارف کا نام یا پاس ورڈ غلط ہے۔ برائے مہربانی درست معلومات درج کریں۔ (Invalid username or password)",
        });
        return;
      }

      res.status(frappeRes.status).json({
        success: false,
        error:
          (resJson.message as string) ||
          `ERP سرور سے رابطہ منقطع ہے یا سرور نے خرابی بھیجی ہے (HTTP ${frappeRes.status})`,
      });
      return;
    }

    // Login successful
    const sid = extractSid(frappeRes);
    let fullName = (resJson.full_name as string) || String(usr);
    let userEmail = String(usr);
    let roles: string[] = ["System User"];

    // Try to get verified user email & roles using session sid
    if (sid) {
      try {
        const loggedUserRes = await fetch(`${targetBase}/api/method/frappe.auth.get_logged_user`, {
          headers: {
            Cookie: `sid=${sid}`,
            Accept: "application/json",
          },
        });
        if (loggedUserRes.ok) {
          const loggedUserJson = (await loggedUserRes.json()) as { message?: string };
          if (loggedUserJson.message && loggedUserJson.message !== "Guest") {
            userEmail = loggedUserJson.message;
          }
        }
      } catch {
        // non-fatal
      }

      const profile = await fetchUserRolesAndProfile(targetBase, sid, userEmail);
      roles = profile.roles;
      if (profile.fullName && profile.fullName !== userEmail) {
        fullName = profile.fullName;
      }
    }

    let userPermissions = {
      roles: roles,
      allowedWarehouses: [] as string[],
      canReadStockEntry: true,
      canCreateStockEntry: true,
      canSubmitStockEntry: false,
    };

    if (sid) {
      userPermissions = await fetchUserPermissions(targetBase, sid, userEmail, roles);
    }

    res.json({
      success: true,
      message: `خوش آمدید، ${fullName}! آپ کامیابی سے لاگ اِن ہو چکے ہیں۔`,
      user: {
        username: String(usr).trim(),
        fullName: fullName,
        email: userEmail,
        roles: roles,
        permissions: userPermissions,
        sid: sid,
        erpUrl: targetBase,
        loginTime: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const isTimeout = errMsg.toLowerCase().includes("aborted") || errMsg.toLowerCase().includes("timeout");

    res.status(500).json({
      success: false,
      error: isTimeout
        ? "ERP سرور کے جواب کا وقت ختم ہو گیا ہے (Connection Timeout)۔ سرور اور انٹرنیٹ چیک کریں۔"
        : `ERP سرور سے رابطہ نہیں ہو سکا: ${errMsg}`,
    });
  }
});

/**
 * POST /api/auth/login-api-key
 * Authenticate using ERPNext API Key & Secret
 */
authRouter.post("/login-api-key", async (req, res) => {
  const { apiKey, apiSecret, erpUrl } = req.body;

  if (!apiKey || !apiSecret) {
    res.status(400).json({
      success: false,
      error: "API Key اور API Secret دونوں درج کرنا لازمی ہے۔ (Both API Key & Secret are required)",
    });
    return;
  }

  const targetBase = getErpUrl(erpUrl);
  const checkUrl = `${targetBase}/api/method/frappe.auth.get_logged_user`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const checkRes = await fetch(checkUrl, {
      headers: {
        Authorization: `token ${String(apiKey).trim()}:${String(apiSecret).trim()}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!checkRes.ok) {
      res.status(401).json({
        success: false,
        error: "فراہم کردہ API Key یا API Secret درست نہیں ہے (Authentication failed)",
      });
      return;
    }

    const data = (await checkRes.json()) as { message?: string };
    const loggedUser = data.message || "Administrator";

    if (loggedUser === "Guest") {
      res.status(401).json({
        success: false,
        error: "فراہم کردہ API کیز کو اجازت حاصل نہیں ہے (Guest)",
      });
      return;
    }

    let fullName = loggedUser;
    let roles: string[] = ["System User"];

    try {
      const userRes = await fetch(`${targetBase}/api/resource/User/${encodeURIComponent(loggedUser)}`, {
        headers: {
          Authorization: `token ${String(apiKey).trim()}:${String(apiSecret).trim()}`,
          Accept: "application/json",
        },
      });
      if (userRes.ok) {
        const uJson = (await userRes.json()) as {
          data?: { full_name?: string; roles?: Array<{ role: string }> };
        };
        if (uJson.data?.full_name) fullName = uJson.data.full_name;
        if (uJson.data?.roles) roles = uJson.data.roles.map((r) => r.role);
      }
    } catch {
      // non-fatal
    }

    // Update backend runtime config so ERP requests use these keys
    erpnextConfig.updateConfig({
      apiKey: String(apiKey).trim(),
      apiSecret: String(apiSecret).trim(),
      url: targetBase,
    });

    res.json({
      success: true,
      message: `خوش آمدید، ${fullName}! آپ کامیابی سے مربوط ہو چکے ہیں۔`,
      user: {
        username: loggedUser,
        fullName: fullName,
        email: loggedUser,
        roles: roles,
        erpUrl: targetBase,
        authType: "apiKey",
        loginTime: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      success: false,
      error: `ERP سرور سے رابطہ نہیں ہو سکا: ${errMsg}`,
    });
  }
});

/**
 * POST /api/auth/verify
 * Check if session is still valid
 */
authRouter.post("/verify", async (req, res) => {
  const { sid, erpUrl } = req.body;

  if (!sid) {
    res.status(401).json({ success: false, valid: false, message: "کوئی سیشن موجود نہیں ہے" });
    return;
  }

  const targetBase = getErpUrl(erpUrl);

  try {
    const verifyRes = await fetch(`${targetBase}/api/method/frappe.auth.get_logged_user`, {
      headers: {
        Cookie: `sid=${sid}`,
        Accept: "application/json",
      },
    });

    if (!verifyRes.ok) {
      res.status(401).json({ success: false, valid: false, message: "سیشن ختم ہو چکا ہے" });
      return;
    }

    const data = (await verifyRes.json()) as { message?: string };
    if (data.message && data.message !== "Guest") {
      const userEmail = data.message;
      const profile = await fetchUserRolesAndProfile(targetBase, sid, userEmail);
      const roles = profile.roles;
      const fullName = profile.fullName;

      const permissions = await fetchUserPermissions(targetBase, sid, userEmail, roles);

      res.json({
        success: true,
        valid: true,
        user: {
          username: userEmail,
          fullName: fullName,
          email: userEmail,
          roles: roles,
          permissions: permissions,
          sid: sid,
          erpUrl: targetBase,
        },
      });
      return;
    }

    res.status(401).json({ success: false, valid: false, message: "سیشن غیر تصدیق شدہ ہے" });
  } catch {
    res.status(500).json({ success: false, valid: false, message: "توثیق کے دوران نیٹ ورک کا مسئلہ پیش آیا" });
  }
});

/**
 * POST /api/auth/logout
 * Log out from ERPNext
 */
authRouter.post("/logout", async (req, res) => {
  const { sid, erpUrl } = req.body;
  const targetBase = getErpUrl(erpUrl);

  if (sid) {
    try {
      await fetch(`${targetBase}/api/method/logout`, {
        method: "POST",
        headers: { Cookie: `sid=${sid}` },
      });
    } catch {
      // non-fatal
    }
  }

  res.json({
    success: true,
    message: "کامیابی سے لاگ آؤٹ ہو گیا۔",
  });
});
