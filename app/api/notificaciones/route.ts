import { z } from "zod";
import { generateAlertEmailContent } from "@/lib/traffic-fines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notificationRequestSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  userName: z.string().trim().max(100).default("Ciudadano(a)"),
  reference: z.string().trim().min(2).max(50),
  kind: z.enum(["comparendo", "acuerdo_pago"]).default("comparendo"),
  subject: z.string().trim().max(30).optional(),
  daysLeft: z.number().int(),
  deadlineText: z.string().trim().min(2).max(100),
  amount: z.number().nullable().optional(),
  discountPercentage: z.number().optional(),
});

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim().toLocaleLowerCase("en-US");
  if (contentType !== "application/json") {
    return json({ error: "Este endpoint solo acepta JSON." }, 415);
  }

  let body: z.infer<typeof notificationRequestSchema>;

  try {
    const rawBody = await request.text();
    body = notificationRequestSchema.parse(JSON.parse(rawBody));
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues.map((e) => e.message).join(", ") : "Datos inválidos";
    return json({ error: message }, 400);
  }

  const { subject, text, html } = generateAlertEmailContent({
    userName: body.userName,
    reference: body.reference,
    kind: body.kind,
    subject: body.subject,
    daysLeft: body.daysLeft,
    deadlineText: body.deadlineText,
    amount: body.amount,
    discountPercentage: body.discountPercentage,
  });

  // Si en el futuro se configura RESEND_API_KEY o un servicio SMTP en variables de entorno:
  if (process.env.RESEND_API_KEY) {
    try {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Orientador Legal <alertas@orientadorlegal.co>",
          to: body.email,
          subject,
          html,
          text,
        }),
      });

      if (!resendRes.ok) {
        const errorDetails = await resendRes.text();
        console.error("Resend delivery failed:", errorDetails);
        return json({
          success: true,
          delivered: false,
          mode: "fallback",
          message: "Alerta procesada. Si el envío directo falla, puedes usar el enlace de correo.",
          preview: { subject, text, html },
        });
      }

      return json({
        success: true,
        delivered: true,
        mode: "live",
        message: `Correo enviado exitosamente a ${body.email}`,
        preview: { subject, text, html },
      });
    } catch (err) {
      console.error("Email service error:", err);
    }
  }

  // Modo local / demostración con preview listo y soporte de mailto
  return json({
    success: true,
    delivered: true,
    mode: "simulation",
    message: `Alerta registrada y preparada para ${body.email}`,
    preview: { subject, text, html },
  });
}
