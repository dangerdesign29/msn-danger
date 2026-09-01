import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Assinatura = { endpoint: string; p256dh: string; auth: string };

export const chavePush = createServerFn({ method: "GET" }).handler(async () => ({
  chave: process.env["VAPID_PUBLIC_KEY"] ?? "",
}));

export const salvarAssinatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Assinatura) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_assinaturas").upsert(
      {
        usuario_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removerAssinatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { endpoint: string }) => data)
  .handler(async ({ data, context }) => {
    await context.supabase.from("push_assinaturas").delete().eq("endpoint", data.endpoint);
    return { ok: true };
  });

type Aviso = { paraId?: string; grupoId?: string; titulo: string; corpo: string };

export const enviarPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Aviso) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let destinatarios: string[] = [];
    if (data.grupoId) {
      const { data: membros } = await supabase
        .from("grupo_membros")
        .select("usuario_id")
        .eq("grupo_id", data.grupoId);
      destinatarios = (membros ?? []).map((m) => m.usuario_id).filter((id) => id !== userId);
    } else if (data.paraId) {
      const { data: vinculo } = await supabase
        .from("contatos")
        .select("contato_id")
        .eq("usuario_id", userId)
        .eq("contato_id", data.paraId)
        .maybeSingle();
      if (vinculo) destinatarios = [data.paraId];
    }
    if (destinatarios.length === 0) return { enviados: 0 };

    const publicKey = process.env["VAPID_PUBLIC_KEY"];
    const privateKey = process.env["VAPID_PRIVATE_KEY"];
    const subject = process.env["VAPID_SUBJECT"] ?? "mailto:push@lovable.app";
    if (!publicKey || !privateKey) return { enviados: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: assinaturas } = await supabaseAdmin
      .from("push_assinaturas")
      .select("endpoint, p256dh, auth")
      .in("usuario_id", destinatarios);
    if (!assinaturas || assinaturas.length === 0) return { enviados: 0 };

    const { buildPushPayload } = await import("@block65/webcrypto-web-push");
    const conteudo = JSON.stringify({
      titulo: data.titulo,
      corpo: data.corpo,
      url: "/messenger",
      tag: data.grupoId ?? userId,
    });

    let enviados = 0;
    await Promise.all(
      assinaturas.map(async (a) => {
        try {
          const payload = await buildPushPayload(
            { data: conteudo, options: { ttl: 300, urgency: "high" } },
            {
              endpoint: a.endpoint,
              expirationTime: null,
              keys: { p256dh: a.p256dh, auth: a.auth },
            },
            { subject, publicKey, privateKey },
          );
          const res = await fetch(a.endpoint, payload as unknown as RequestInit);
          if (res.status === 404 || res.status === 410) {
            await supabaseAdmin.from("push_assinaturas").delete().eq("endpoint", a.endpoint);
          } else if (res.ok) {
            enviados += 1;
          }
        } catch (e) {
          console.error("[push] falha ao enviar", e);
        }
      }),
    );

    return { enviados };
  });
