import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureSuperAdmin(supabase: {
  from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { is_super_admin: boolean } | null }> } } };
}, userId: string) {
  const { data } = await supabase.from("profiles").select("is_super_admin").eq("id", userId).maybeSingle();
  if (!data?.is_super_admin) throw new Error("هذه الصفحة مقصورة على المشرف العام");
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, approval_status, invitation_quota, is_super_admin, is_assistant_account")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    let pending_count = 0;
    if (data?.is_super_admin) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count } = await supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("approval_status", "pending");
      pending_count = count ?? 0;
    }
    return data ? { ...data, pending_count } : null;
  });


export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureSuperAdmin(supabase as never, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, approval_status, invitation_quota, is_super_admin, is_assistant_account, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Fetch emails from auth users
    const { data: usersRes, error: uErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (uErr) throw new Error(uErr.message);
    const emailMap = new Map(usersRes.users.map((u) => [u.id, u.email ?? ""]));

    // Count invitations per host
    const { data: invRows, error: iErr } = await supabaseAdmin
      .from("invitations")
      .select("host_id");
    if (iErr) throw new Error(iErr.message);
    const counts = new Map<string, number>();
    for (const r of invRows ?? []) {
      counts.set(r.host_id, (counts.get(r.host_id) ?? 0) + 1);
    }

    return (profiles ?? []).map((p) => ({
      ...p,
      email: emailMap.get(p.id) ?? "",
      invitations_used: counts.get(p.id) ?? 0,
    }));
  });

export const setUserApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        status: z.enum(["pending", "approved", "blocked"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureSuperAdmin(supabase as never, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ approval_status: data.status })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        quota: z.number().int().min(0).max(1_000_000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureSuperAdmin(supabase as never, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ invitation_quota: data.quota })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ user_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureSuperAdmin(supabase as never, userId);
    if (data.user_id === userId) throw new Error("لا يمكن حذف حسابك");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
