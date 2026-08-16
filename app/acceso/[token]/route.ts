import {
  createRegistrationGate,
  isValidRegistrationToken,
  REGISTRATION_GATE_COOKIE,
  REGISTRATION_GATE_TTL_SECONDS,
} from "@/lib/account-access";

function privateHeaders(extra: Record<string, string> = {}) {
  return {
    "Cache-Control": "no-store, max-age=0",
    Pragma: "no-cache",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    ...extra,
  };
}

function notFoundResponse() {
  return new Response("Not Found", {
    status: 404,
    headers: privateHeaders({ "Content-Type": "text/plain; charset=utf-8" }),
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const configuredToken = process.env.ACCOUNT_REGISTRATION_TOKEN;
  if (!(await isValidRegistrationToken(token, configuredToken))) {
    return notFoundResponse();
  }

  let gate: string;
  try {
    gate = await createRegistrationGate(configuredToken as string);
  } catch {
    return notFoundResponse();
  }

  const url = new URL(request.url);
  const secure = url.protocol === "https:" ? "; Secure" : "";
  const cookie = `${REGISTRATION_GATE_COOKIE}=${gate}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${REGISTRATION_GATE_TTL_SECONDS}${secure}`;

  return new Response(null, {
    status: 303,
    headers: privateHeaders({
      Location: new URL("/acceso", url).toString(),
      "Set-Cookie": cookie,
    }),
  });
}
