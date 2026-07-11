import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ProfileGate = { approval_status: string; invitation_quota: number; is_super_admin: boolean };

async function requireApproved(
  supabase: { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: ProfileGate | null; error: { message: string } | null }> } } } },
  userId: string,
): Promise<ProfileGate> {
  const { data, error } = await supabase.from("profiles").select("approval_status, invitation_quota, is_super_admin").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("لا يوجد ملف شخصي لحسابك");
  if (data.approval_status === "blocked") throw new Error("تم حظر حسابك، تواصل مع المشرف العام");
  if (data.approval_status !== "approved") throw new Error("حسابك بانتظار موافقة المشرف العام");
  return data;
}


function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (let i = 0; i < 10; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function generateScanCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function todayInRiyadh(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 5; // ~5 years

// ---------- Events (multi-event) ----------

export const listMyEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Host events
    const { data: hostEvents, error: hErr } = await supabase
      .from("events")
      .select("*")
      .eq("host_id", userId)
      .order("created_at", { ascending: false });
    if (hErr) throw new Error(hErr.message);
    // Shared events (visible via RLS collaborator policy)
    const { data: allVisible, error: sErr } = await supabase
      .from("events")
      .select("*")
      .neq("host_id", userId)
      .order("created_at", { ascending: false });
    if (sErr) throw new Error(sErr.message);
    return {
      hosted: hostEvents ?? [],
      shared: allVisible ?? [],
    };
  });

export const getEvent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: event, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!event) return null;
    const role: "host" | "assistant" = event.host_id === userId ? "host" : "assistant";
    let permissions: {
      can_send_invitations: boolean;
      can_view_rsvps: boolean;
      can_view_attendee_info: boolean;
    } | null = null;
    if (role === "assistant") {
      const email = (context.claims as { email?: string } | undefined)?.email?.toLowerCase() ?? "";
      if (email) {
        const { data: coll } = await supabase
          .from("event_collaborators")
          .select("can_send_invitations, can_view_rsvps, can_view_attendee_info")
          .eq("event_id", data.id)
          .eq("email", email)
          .maybeSingle();
        if (coll) {
          permissions = {
            can_send_invitations: !!coll.can_send_invitations,
            can_view_rsvps: !!coll.can_view_rsvps,
            can_view_attendee_info: !!coll.can_view_attendee_info,
          };
        }
      }
    }
    return { event, role, permissions };
  });

// Legacy: returns first event (for old dashboards that don't specify id)
export const getMyEvent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("host_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertMyEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().trim().min(1).max(120),
        groom_name: z.string().trim().max(80).optional().nullable(),
        bride_name: z.string().trim().max(80).optional().nullable(),
        event_date: z.string().optional().nullable(),
        venue: z.string().trim().max(200).optional().nullable(),
        venue_map_url: z.string().trim().max(500).optional().nullable(),
        notes: z.string().trim().max(1000).optional().nullable(),
        scan_date: z.string().optional().nullable(),
        qr_x: z.number().min(0).max(100).optional(),
        qr_y: z.number().min(0).max(100).optional(),
        qr_size: z.number().min(5).max(80).optional(),
        companions_enabled: z.boolean().optional(),
        caption_show_number: z.boolean().optional(),
        caption_text_color: z.string().trim().max(20).optional(),
        caption_number_color: z.string().trim().max(20).optional(),
        caption_font_family: z.string().trim().max(80).optional(),
        caption_font_size: z.number().int().min(10).max(120).optional(),
        caption_x: z.number().min(0).max(100).optional(),
        caption_y: z.number().min(0).max(100).optional(),
        caption_show_box: z.boolean().optional(),
        number_on_image: z.boolean().optional(),
        number_in_filename: z.boolean().optional(),
        qr_color: z.string().trim().max(20).optional(),
        qr_bg_color: z.string().trim().max(20).optional(),
        qr_ecc: z.enum(["L", "M", "Q", "H"]).optional(),
        qr_margin: z.number().int().min(0).max(8).optional(),
        caption_align: z.enum(["left", "center", "right"]).optional(),
        caption_font_weight: z.number().int().min(100).max(900).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = { ...data, host_id: userId };
    if (data.id) {
      const { data: row, error } = await supabase
        .from("events")
        .update(payload)
        .eq("id", data.id)
        .eq("host_id", userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    // Creating a new event requires an approved account
    await requireApproved(supabase as never, userId);
    const { data: row, error } = await supabase
      .from("events")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });


export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", data.id)
      .eq("host_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Image upload to storage → signed URL saved on event ----------

export const uploadEventImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        event_id: z.string().uuid(),
        kind: z.enum(["invitation", "success", "already"]),
        data_url: z.string().max(8_000_000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Only host can change event images
    const { data: ev, error: evErr } = await supabase
      .from("events")
      .select("id, host_id")
      .eq("id", data.event_id)
      .eq("host_id", userId)
      .maybeSingle();
    if (evErr) throw new Error(evErr.message);
    if (!ev) throw new Error("غير مصرح");

    const m = data.data_url.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!m) throw new Error("صيغة الصورة غير صحيحة");
    const mime = m[1];
    const ext = mime.split("/")[1].replace("jpeg", "jpg");
    const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    const path = `${userId}/${data.event_id}/${data.kind}-${Date.now()}.${ext}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin.storage
      .from("event-images")
      .upload(path, bin, { contentType: mime, upsert: true });
    if (upErr) throw new Error(upErr.message);

    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("event-images")
      .createSignedUrl(path, SIGNED_URL_TTL);
    if (sErr || !signed) throw new Error(sErr?.message || "تعذّر إنشاء الرابط");

    const col =
      data.kind === "invitation"
        ? "invitation_image_url"
        : data.kind === "success"
          ? "success_image_url"
          : "already_image_url";
    const patch: Record<string, string> = { [col]: signed.signedUrl };
    const { data: updated, error: uErr } = await supabase
      .from("events")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", data.event_id)
      .eq("host_id", userId)
      .select()
      .single();
    if (uErr) throw new Error(uErr.message);
    return { url: signed.signedUrl, event: updated };
  });

export const clearEventImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        event_id: z.string().uuid(),
        kind: z.enum(["invitation", "success", "already"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const col =
      data.kind === "invitation"
        ? "invitation_image_url"
        : data.kind === "success"
          ? "success_image_url"
          : "already_image_url";
    const patch: Record<string, null> = { [col]: null };
    const { error } = await supabase
      .from("events")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", data.event_id)
      .eq("host_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Collaborators ----------

export const listCollaborators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ event_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("event_collaborators")
      .select("id, email, created_at, can_send_invitations, can_view_rsvps, can_view_attendee_info")
      .eq("event_id", data.event_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const permissionsSchema = z.object({
  can_send_invitations: z.boolean().optional(),
  can_view_rsvps: z.boolean().optional(),
  can_view_attendee_info: z.boolean().optional(),
});

export const addCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        event_id: z.string().uuid(),
        email: z.string().trim().toLowerCase().email().max(200),
      })
      .merge(permissionsSchema)
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ev } = await supabase
      .from("events")
      .select("id")
      .eq("id", data.event_id)
      .eq("host_id", userId)
      .maybeSingle();
    if (!ev) throw new Error("لا تملك هذه المناسبة");
    const { data: row, error } = await supabase
      .from("event_collaborators")
      .insert({
        event_id: data.event_id,
        email: data.email,
        invited_by: userId,
        can_send_invitations: data.can_send_invitations ?? true,
        can_view_rsvps: data.can_view_rsvps ?? true,
        can_view_attendee_info: data.can_view_attendee_info ?? true,
      })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("هذا الإيميل مضاف مسبقاً");
      throw new Error(error.message);
    }
    return row;
  });

export const updateCollaboratorPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid() }).merge(permissionsSchema).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch: { can_send_invitations?: boolean; can_view_rsvps?: boolean; can_view_attendee_info?: boolean } = {};
    if (data.can_send_invitations !== undefined) patch.can_send_invitations = data.can_send_invitations;
    if (data.can_view_rsvps !== undefined) patch.can_view_rsvps = data.can_view_rsvps;
    if (data.can_view_attendee_info !== undefined) patch.can_view_attendee_info = data.can_view_attendee_info;
    const { error } = await supabase
      .from("event_collaborators")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("event_collaborators")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createCollaboratorAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        event_id: z.string().uuid(),
        email: z.string().trim().toLowerCase().email().max(200),
        password: z.string().min(6).max(72),
        display_name: z.string().trim().max(80).optional(),
      })
      .merge(permissionsSchema)
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Must own the event
    const { data: ev } = await supabase
      .from("events")
      .select("id")
      .eq("id", data.event_id)
      .eq("host_id", userId)
      .maybeSingle();
    if (!ev) throw new Error("لا تملك هذه المناسبة");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Try to create the user; if already exists, continue with existing.
    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.display_name || data.email.split("@")[0] },
    });
    if (created.error && !/registered|exists/i.test(created.error.message)) {
      throw new Error(created.error.message);
    }
    // Mark this account as an approved assistant with zero quota
    const listRes = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const assistantUser = listRes.data.users.find((u) => u.email?.toLowerCase() === data.email);
    if (assistantUser) {
      await supabaseAdmin.from("profiles").upsert({
        id: assistantUser.id,
        display_name: data.display_name || data.email.split("@")[0],
        approval_status: "approved",
        invitation_quota: 0,
        is_assistant_account: true,
      });
    }
    // Add as collaborator (unique on event+email)
    const { error: insErr } = await supabaseAdmin
      .from("event_collaborators")
      .insert({
        event_id: data.event_id,
        email: data.email,
        invited_by: userId,
        can_send_invitations: data.can_send_invitations ?? true,
        can_view_rsvps: data.can_view_rsvps ?? true,
        can_view_attendee_info: data.can_view_attendee_info ?? true,
      });
    if (insErr && insErr.code !== "23505") throw new Error(insErr.message);
    return { ok: true, email: data.email };
  });



export const listInvitationsForEvent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ event_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("invitations")
      .select("*")
      .eq("event_id", data.event_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });


// legacy
export const listMyInvitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .eq("host_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createInvitations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        count: z.number().int().min(1).max(500),
        event_id: z.string().uuid(),
        names: z.array(z.string().trim().max(120)).optional(),
        phones: z.array(z.string().trim().max(30)).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Host-only: assistants cannot generate barcodes
    const { data: event, error: evErr } = await supabase
      .from("events")
      .select("id")
      .eq("id", data.event_id)
      .eq("host_id", userId)
      .single();
    if (evErr || !event) throw new Error("توليد الباركود مقصور على المضيف");

    // Approval + quota gates (skip for super admin)
    const profile = await requireApproved(supabase as never, userId);
    if (!profile.is_super_admin) {
      const { data: countRow, error: cErr } = await supabase.rpc("get_user_invitation_count", { _user_id: userId });
      if (cErr) throw new Error(cErr.message);
      const currentCount = Number(countRow ?? 0);
      if (currentCount + data.count > profile.invitation_quota) {
        const remaining = Math.max(0, profile.invitation_quota - currentCount);
        throw new Error(`تجاوزت الحد الأقصى للدعوات (${profile.invitation_quota}). المتبقي لك: ${remaining}`);
      }
    }

    // Find current max display_number for this event to continue numbering
    const { data: maxRow } = await supabase
      .from("invitations")
      .select("display_number")
      .eq("event_id", data.event_id)
      .order("display_number", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const startNum = Number((maxRow as { display_number?: number | null } | null)?.display_number ?? 0) + 1;

    const rows = Array.from({ length: data.count }, (_, i) => ({
      event_id: data.event_id,
      host_id: userId,
      code: generateCode(),
      scan_code: generateScanCode(),
      guest_name: data.names?.[i]?.trim() || null,
      phone: data.phones?.[i]?.trim() || null,
      display_number: startNum + i,
    }));
    const { data: inserted, error } = await supabase
      .from("invitations")
      .insert(rows)
      .select();
    if (error) throw new Error(error.message);
    return inserted ?? [];
  });


export const updateInvitationDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        guest_name: z.string().trim().max(120).optional().nullable(),
        phone: z.string().trim().max(30).optional().nullable(),
        caption_text: z.string().trim().max(200).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const patch: { guest_name?: string | null; phone?: string | null; caption_text?: string | null } = {};
    if (data.guest_name !== undefined) patch.guest_name = data.guest_name || null;
    if (data.phone !== undefined) patch.phone = data.phone || null;
    if (data.caption_text !== undefined) patch.caption_text = data.caption_text || null;
    // Load the invitation to determine ownership / event scope.
    const { data: inv, error: invErr } = await supabase
      .from("invitations")
      .select("id, host_id, event_id")
      .eq("id", data.id)
      .maybeSingle();
    if (invErr) throw new Error(invErr.message);
    if (!inv) throw new Error("لم يتم العثور على الدعوة");
    let allowed = inv.host_id === userId;
    if (!allowed) {
      const email = (claims as { email?: string } | null)?.email?.toLowerCase();
      if (email) {
        const { data: collab } = await supabase
          .from("event_collaborators")
          .select("can_send_invitations")
          .eq("event_id", inv.event_id)
          .eq("email", email)
          .maybeSingle();
        if (collab?.can_send_invitations) allowed = true;
      }
    }
    if (!allowed) throw new Error("لا تملك صلاحية التعديل");
    const { error } = await supabase
      .from("invitations")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkUpdateCaptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        event_id: z.string().uuid(),
        entries: z
          .array(
            z.object({
              id: z.string().uuid(),
              caption_text: z.string().trim().max(200).nullable(),
            }),
          )
          .max(1000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Must own the event
    const { data: ev } = await supabase
      .from("events")
      .select("id")
      .eq("id", data.event_id)
      .eq("host_id", userId)
      .maybeSingle();
    if (!ev) throw new Error("لا تملك هذه المناسبة");
    for (const entry of data.entries) {
      const { error } = await supabase
        .from("invitations")
        .update({ caption_text: entry.caption_text || null })
        .eq("id", entry.id)
        .eq("event_id", data.event_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true, count: data.entries.length };
  });




export const deleteInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("invitations")
      .delete()
      .eq("id", data.id)
      .eq("host_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Door check-in (camera scan, authed) ----------

export const checkInByScanCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ scan_code: z.string().trim().min(4).max(64) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: inv, error } = await supabase
      .from("invitations")
      .select("*, events(scan_date, success_image_url, already_image_url)")
      .eq("scan_code", data.scan_code)
      .eq("host_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) return { status: "not_found" as const };
    const ev = (inv as unknown as { events: { scan_date: string | null; success_image_url: string | null; already_image_url: string | null } | null }).events;
    const images = {
      success_image_url: ev?.success_image_url ?? null,
      already_image_url: ev?.already_image_url ?? null,
    };
    if (inv.rsvp_status === "declined") return { status: "declined" as const, invitation: inv, ...images };
    if (inv.scanned_at) return { status: "already" as const, invitation: inv, ...images };
    if (ev?.scan_date && ev.scan_date !== todayInRiyadh()) {
      return { status: "not_today" as const, invitation: inv, scan_date: ev.scan_date, ...images };
    }
    const { data: updated, error: upErr } = await supabase
      .from("invitations")
      .update({ scanned_at: new Date().toISOString(), scanned_by: userId })
      .eq("id", inv.id)
      .eq("host_id", userId)
      .select()
      .single();
    if (upErr) throw new Error(upErr.message);
    return { status: "ok" as const, invitation: updated, ...images };
  });

// ---------- Public ----------

export const scanPublicByCode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ scan_code: z.string().trim().min(4).max(64) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv, error } = await supabaseAdmin
      .from("invitations")
      .select("id, guest_name, companions, rsvp_status, scanned_at, event_id")
      .eq("scan_code", data.scan_code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) return { status: "not_found" as const };
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("scan_date, success_image_url, already_image_url")
      .eq("id", inv.event_id)
      .maybeSingle();
    const images = {
      success_image_url: event?.success_image_url ?? null,
      already_image_url: event?.already_image_url ?? null,
    };
    if (inv.scanned_at) {
      return {
        status: "already" as const,
        guest_name: inv.guest_name,
        companions: inv.companions,
        scanned_at: inv.scanned_at,
        ...images,
      };
    }
    if (event?.scan_date && event.scan_date !== todayInRiyadh()) {
      return {
        status: "not_today" as const,
        guest_name: inv.guest_name,
        scan_date: event.scan_date,
        ...images,
      };
    }
    const now = new Date().toISOString();
    const { error: upErr } = await supabaseAdmin
      .from("invitations")
      .update({ scanned_at: now })
      .eq("id", inv.id);
    if (upErr) throw new Error(upErr.message);
    return {
      status: "ok" as const,
      guest_name: inv.guest_name,
      companions: inv.companions,
      scanned_at: now,
      ...images,
    };
  });

export const getInvitationPublic = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ code: z.string().trim().min(4).max(64) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.toUpperCase();
    const { data: inv, error } = await supabaseAdmin
      .from("invitations")
      .select(
        "id, code, scan_code, guest_name, rsvp_status, companions, apology_message, responded_at, scanned_at, event_id, caption_text, display_number",
      )
      .eq("code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!inv) return null;
    const { data: event } = await supabaseAdmin
      .from("events")
      .select(
        "title, groom_name, bride_name, event_date, venue, venue_map_url, notes, invitation_image_url, qr_x, qr_y, qr_size, companions_enabled, caption_show_number, caption_text_color, caption_number_color, caption_font_family, caption_font_size",
      )
      .eq("id", inv.event_id)
      .single();
    return { invitation: inv, event };
  });

export const submitRsvp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        code: z.string().trim().min(4).max(64),
        status: z.enum(["attending", "declined"]),
        guest_name: z.string().trim().max(120).optional(),
        companions: z.number().int().min(0).max(20).optional(),
        apology_message: z.string().trim().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.toUpperCase();
    const { data: inv, error: findErr } = await supabaseAdmin
      .from("invitations")
      .select("id, scanned_at, guest_name")
      .eq("code", code)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);
    if (!inv) throw new Error("الدعوة غير موجودة");
    if (inv.scanned_at) throw new Error("لا يمكن تعديل الرد بعد التحقق من الدخول");

    const isAttending = data.status === "attending";
    const { error } = await supabaseAdmin
      .from("invitations")
      .update({
        rsvp_status: data.status,
        responded_at: new Date().toISOString(),
        guest_name: data.guest_name && !inv.guest_name ? data.guest_name : inv.guest_name,
        companions: isAttending ? (data.companions ?? 0) : 0,
        apology_message: isAttending ? null : data.apology_message || null,
      })
      .eq("id", inv.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
