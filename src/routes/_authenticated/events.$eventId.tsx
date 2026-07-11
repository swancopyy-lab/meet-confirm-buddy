import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  addCollaborator,
  bulkUpdateCaptions,
  clearEventImage,
  createCollaboratorAccount,
  createInvitations,
  deleteInvitation,
  getEvent,
  listCollaborators,
  listInvitationsForEvent,
  removeCollaborator,
  updateCollaboratorPermissions,
  updateInvitationDetails,
  uploadEventImage,
  upsertMyEvent,
} from "@/lib/invitations.functions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import QRCode from "qrcode";
import JSZip from "jszip";
import {
  Copy,
  Plus,
  Printer,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ScanLine,
  QrCode,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  MessageCircle,
  ArrowRight,
  Mail,
  BookUser,
  Download,
  Share2,
  Pencil,
  Eye,
} from "lucide-react";
import { QRCard } from "@/components/QRCard";

export const Route = createFileRoute("/_authenticated/events/$eventId")({
  head: () => ({ meta: [{ title: "إدارة المناسبة" }] }),
  component: EventEditor,
  notFoundComponent: () => (
    <div className="py-12 text-center">
      <p className="text-muted-foreground">المناسبة غير موجودة</p>
      <Button asChild variant="link">
        <Link to="/dashboard">العودة للقائمة</Link>
      </Button>
    </div>
  ),
});

type EventRow = {
  id: string;
  title: string;
  groom_name: string | null;
  bride_name: string | null;
  event_date: string | null;
  venue: string | null;
  venue_map_url: string | null;
  notes: string | null;
  invitation_image_url: string | null;
  success_image_url: string | null;
  already_image_url: string | null;
  scan_date: string | null;
  qr_x: number;
  qr_y: number;
  qr_size: number;
  companions_enabled: boolean;
  caption_show_number: boolean;
  caption_text_color: string;
  caption_number_color: string;
  caption_font_family: string;
  caption_font_size: number;
  caption_x: number;
  caption_y: number;
  caption_show_box: boolean;
  number_on_image: boolean;
  number_in_filename: boolean;
  qr_color: string;
  qr_bg_color: string;
  qr_ecc: "L" | "M" | "Q" | "H";
  qr_margin: number;
  caption_align: "left" | "center" | "right";
  caption_font_weight: number;
};

type Invitation = {
  id: string;
  code: string;
  scan_code: string;
  guest_name: string | null;
  phone: string | null;
  rsvp_status: "pending" | "attending" | "declined";
  companions: number;
  scanned_at: string | null;
  apology_message: string | null;
  responded_at: string | null;
  caption_text: string | null;
  display_number: number | null;
};

function EventEditor() {
  const { eventId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const getEv = useServerFn(getEvent);
  const saveEv = useServerFn(upsertMyEvent);
  const listInv = useServerFn(listInvitationsForEvent);
  const createInv = useServerFn(createInvitations);
  const delInv = useServerFn(deleteInvitation);
  const updDetails = useServerFn(updateInvitationDetails);
  const uploadImg = useServerFn(uploadEventImage);
  const clearImg = useServerFn(clearEventImage);

  const eventQ = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const res = await getEv({ data: { id: eventId } });
      if (!res) throw notFound();
      return res;
    },
  });
  const invQ = useQuery({
    queryKey: ["invitations", eventId],
    queryFn: () => listInv({ data: { event_id: eventId } }),
    enabled: !!eventQ.data,
  });

  const saveMut = useMutation({
    mutationFn: (input: Partial<EventRow> & { title: string }) => saveEv({ data: input }),
    onSuccess: () => {
      toast.success("تم الحفظ");
      qc.invalidateQueries({ queryKey: ["event", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: (v: { count: number; names?: string[]; phones?: string[] }) =>
      createInv({ data: { ...v, event_id: eventId } }),
    onSuccess: (rows) => {
      toast.success(`تم توليد ${rows.length} دعوة`);
      qc.invalidateQueries({ queryKey: ["invitations", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delInv({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations", eventId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const detailsMut = useMutation({
    mutationFn: (v: { id: string; guest_name?: string; phone?: string; caption_text?: string }) =>
      updDetails({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations", eventId] }),
  });

  const uploadMut = useMutation({
    mutationFn: (v: { kind: "invitation" | "success" | "already"; data_url: string }) =>
      uploadImg({ data: { event_id: eventId, ...v } }),
    onSuccess: () => {
      toast.success("تم رفع الصورة");
      qc.invalidateQueries({ queryKey: ["event", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearMut = useMutation({
    mutationFn: (kind: "invitation" | "success" | "already") =>
      clearImg({ data: { event_id: eventId, kind } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["event", eventId] }),
  });

  const stats = useMemo(() => {
    const list = (invQ.data ?? []) as Invitation[];
    const attending = list.filter((i) => i.rsvp_status === "attending");
    const declined = list.filter((i) => i.rsvp_status === "declined");
    const pending = list.filter((i) => i.rsvp_status === "pending");
    const scanned = list.filter((i) => i.scanned_at);
    const totalGuests = attending.reduce((s, i) => s + (i.companions || 0) + 1, 0);
    return {
      total: list.length,
      attending: attending.length,
      declined: declined.length,
      pending: pending.length,
      scanned: scanned.length,
      totalGuests,
    };
  }, [invQ.data]);

  if (eventQ.isLoading) return <p className="text-center py-12">جاري التحميل...</p>;
  if (!eventQ.data) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const ev = eventQ.data.event as EventRow;
  const role = eventQ.data.role;
  const isHost = role === "host";
  const invitations = (invQ.data ?? []) as Invitation[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => nav({ to: "/dashboard" })}>
            <ArrowRight className="size-4" /> عودة
          </Button>
          <h1 className="font-serif text-xl font-bold text-primary">{ev.title}</h1>
          {!isHost && <Badge variant="outline">مساعد</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="إجمالي الدعوات" value={stats.total} icon={QrCode} />
        <StatCard label="مؤكدون" value={stats.attending} icon={CheckCircle2} tone="primary" />
        <StatCard label="معتذرون" value={stats.declined} icon={XCircle} tone="destructive" />
        <StatCard label="بانتظار الرد" value={stats.pending} icon={Clock} />
        <StatCard
          label="حضروا فعلياً"
          value={`${stats.scanned} / ${stats.totalGuests}`}
          icon={ScanLine}
          tone="gold"
        />
      </div>

      <Tabs defaultValue={invitations.length === 0 ? (isHost ? "event" : "invitations") : "invitations"}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="invitations">الدعوات</TabsTrigger>
          <TabsTrigger value="guests">المدعوون</TabsTrigger>
          {isHost && <TabsTrigger value="design">صورة الدعوة</TabsTrigger>}
          {isHost && <TabsTrigger value="scan-pages">صفحات المسح</TabsTrigger>}
          {isHost && <TabsTrigger value="event">تفاصيل الفعالية</TabsTrigger>}
          {isHost && <TabsTrigger value="collab">المساعدون</TabsTrigger>}
        </TabsList>

        <TabsContent value="invitations" className="space-y-4">
          {isHost && (
            <Card className="border-gold/30">
              <CardHeader>
                <CardTitle className="font-serif text-lg">توليد دعوات جديدة</CardTitle>
              </CardHeader>
              <CardContent>
                <BulkCreateForm
                  onCreate={(v) => createMut.mutate(v)}
                  loading={createMut.isPending}
                  canPrint={invitations.length > 0}
                />
              </CardContent>
            </Card>
          )}

          {invitations.length > 0 && (
            <DownloadAllButton ev={ev} invitations={invitations} origin={origin} />
          )}

          {isHost && invitations.length > 0 && (
            <BulkCaptionsButton eventId={ev.id} invitations={invitations} />
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
            {invitations.map((inv, idx) => (
              <InvitationCard
                key={inv.id}
                inv={inv}
                ev={ev}
                origin={origin}
                number={inv.display_number ?? invitations.length - idx}
                canDelete={isHost}
                onDelete={() => delMut.mutate(inv.id)}
                onSaveDetails={(v) => detailsMut.mutate({ id: inv.id, ...v })}
              />
            ))}
          </div>
        </TabsContent>


        <TabsContent value="guests">
          {isHost ? (
            <GuestsTable
              invitations={invitations}
              ev={ev}
              origin={origin}
              onSaveDetails={(v) => detailsMut.mutate(v)}
            />
          ) : (
            <AssistantGuestsView
              invitations={invitations}
              ev={ev}
              origin={origin}
              permissions={eventQ.data.permissions ?? null}
            />
          )}
        </TabsContent>

        {isHost && <TabsContent value="design">
          <InvitationDesigner
            ev={ev}
            invitations={invitations}
            uploading={uploadMut.isPending}
            onUpload={(dataUrl) => uploadMut.mutate({ kind: "invitation", data_url: dataUrl })}
            onClear={() => clearMut.mutate("invitation")}
            onSaveDesign={(patch) => saveMut.mutate({ ...ev, ...patch })}
            saving={saveMut.isPending}
          />
        </TabsContent>}

        {isHost && <TabsContent value="scan-pages">
          <ScanPagesDesigner
            ev={ev}
            uploading={uploadMut.isPending}
            onUpload={(kind, dataUrl) => uploadMut.mutate({ kind, data_url: dataUrl })}
            onClear={(kind) => clearMut.mutate(kind)}
          />
        </TabsContent>}

        {isHost && <TabsContent value="event">
          <Card className="border-gold/30">
            <CardHeader>
              <CardTitle className="font-serif">تفاصيل الفعالية</CardTitle>
            </CardHeader>
            <CardContent>
              <EventForm
                initial={ev}
                onSubmit={(v) => saveMut.mutate({ ...v, id: ev.id })}
                loading={saveMut.isPending}
              />
            </CardContent>
          </Card>
        </TabsContent>}

        {isHost && <TabsContent value="collab">
          <CollaboratorsTab eventId={ev.id} />
        </TabsContent>}
      </Tabs>

    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "primary" | "destructive" | "gold";
}) {
  const toneCls =
    tone === "primary"
      ? "text-primary"
      : tone === "destructive"
        ? "text-destructive"
        : tone === "gold"
          ? "text-gold"
          : "text-foreground";
  return (
    <Card className="border-gold/20">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-md bg-secondary p-2 ${toneCls}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`font-serif text-xl font-bold ${toneCls}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BulkCreateForm({
  onCreate,
  loading,
  canPrint,
}: {
  onCreate: (v: { count: number; names?: string[]; phones?: string[] }) => void;
  loading?: boolean;
  canPrint: boolean;
}) {
  const [mode, setMode] = useState<"count" | "list">("count");
  const [count, setCount] = useState(10);
  const [list, setList] = useState("");

  function submit() {
    if (mode === "count") {
      if (count > 0) onCreate({ count });
      return;
    }
    const lines = list.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error("أدخل الأسماء أولاً");
      return;
    }
    const names: string[] = [];
    const phones: string[] = [];
    for (const line of lines) {
      const parts = line.split(/[,\t،]/).map((p) => p.trim());
      names.push(parts[0] || "");
      // Accept phones even with spaces, +, RTL isolate marks, or Arabic digits.
      phones.push(parts[1] ? normalizePhone(parts[1]) : "");
    }
    onCreate({ count: lines.length, names, phones });
    setList("");
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={mode === "count" ? "default" : "outline"} onClick={() => setMode("count")}>
          عدد فقط
        </Button>
        <Button type="button" size="sm" variant={mode === "list" ? "default" : "outline"} onClick={() => setMode("list")}>
          قائمة أسماء + جوالات
        </Button>
      </div>
      {mode === "count" ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="count">العدد</Label>
            <Input id="count" type="number" min={1} max={500} value={count}
              onChange={(e) => setCount(Number(e.target.value))} className="w-32" />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Label htmlFor="list">قائمة (اسم, رقم الجوال) لكل مدعو سطر</Label>
            {contactsPickerAvailable() && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={async () => {
                  const picks = await pickContacts(true);
                  if (picks.length === 0) return;
                  const lines = picks.map((c) => `${c.name || ""}, ${c.phone || ""}`).join("\n");
                  setList((prev) => (prev ? prev.trimEnd() + "\n" + lines : lines));
                  toast.success(`تم استيراد ${picks.length} جهة`);
                }}
              >
                <BookUser className="size-4" /> استيراد من جهات الاتصال
              </Button>
            )}
          </div>
          <Textarea id="list" value={list} onChange={(e) => setList(e.target.value)} rows={6}
            placeholder={"محمد الأحمد, 966501234567\nفاطمة العلي, 966551234567"} dir="ltr" className="font-mono text-sm" />
          <p className="text-xs text-muted-foreground">
            الرقم اختياري. تنسيق دولي بدون + (مثال: 9665xxxxxxxx) ليعمل مع واتساب.
            {!contactsPickerAvailable() && " (استيراد جهات الاتصال يعمل على متصفح كروم في الأندرويد فقط.)"}
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={submit} disabled={loading}>
          <Plus className="size-4" /> توليد الباركودات
        </Button>
        {canPrint && (
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> طباعة الكل
          </Button>
        )}
      </div>
    </div>
  );
}

function buildWhatsappMessage(ev: EventRow, inv: Invitation, origin: string): string {
  const rsvpUrl = `${origin}/i/${inv.code}`;
  const who = ev.groom_name && ev.bride_name ? `${ev.groom_name} و ${ev.bride_name}` : ev.title || "حفل زفاف";
  const dateStr = ev.event_date
    ? new Date(ev.event_date).toLocaleString("ar", { dateStyle: "full", timeStyle: "short" })
    : "";
  return [
    `يسرّنا دعوتكم لحضور ${who}`,
    inv.guest_name ? `الأخ/ة: ${inv.guest_name}` : "",
    dateStr ? `التاريخ: ${dateStr}` : "",
    ev.venue ? `المكان: ${ev.venue}` : "",
    "",
    "لتأكيد الحضور:",
    rsvpUrl,
  ].filter(Boolean).join("\n");
}

function normalizePhone(p: string): string {
  // Strip everything except ASCII digits; also handles RTL/LTR isolates,
  // spaces, +, dashes, parens, and non-Latin digits pasted from WhatsApp.
  const latinized = p.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
                     .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
  return latinized.replace(/\D+/g, "");
}

async function composeInvitationDataUrl(
  ev: EventRow,
  inv: Invitation,
  number: number,
  origin: string,
): Promise<string> {
  const scanUrl = `${origin}/s/${inv.scan_code}`;
  const showNumber = !!ev.caption_show_number && !!ev.number_on_image;
  const showBox = ev.caption_show_box !== false;
  const captionText = (inv.caption_text || "").trim();
  const numberColor = ev.caption_number_color || "#111111";
  const textColor = ev.caption_text_color || "#111111";
  const fontFamily = ev.caption_font_family || "sans-serif";
  const align = (ev.caption_align || "center") as "left" | "center" | "right";
  const weight = ev.caption_font_weight || 600;
  const qrDark = ev.qr_color || "#0F3D2E";
  const qrLight = ev.qr_bg_color || "#FFFFFF";
  const qrEcc = (ev.qr_ecc || "M") as "L" | "M" | "Q" | "H";
  const qrMargin = Number.isFinite(ev.qr_margin) ? ev.qr_margin : 1;

  // Fallback: no invitation image → export QR + label only
  if (!ev.invitation_image_url) {
    const canvas = document.createElement("canvas");
    const size = 900;
    canvas.width = size;
    canvas.height = size + 200;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, scanUrl, {
      width: size,
      margin: qrMargin,
      errorCorrectionLevel: qrEcc,
      color: { dark: qrDark, light: qrLight },
    });
    ctx.drawImage(qrCanvas, 0, 0, size, size);
    ctx.textAlign = "center";
    let y = size + 20;
    if (showNumber) {
      ctx.fillStyle = numberColor;
      ctx.font = `bold 72px ${fontFamily}`;
      ctx.fillText(String(number), size / 2, y + 60);
      y += 90;
    }
    if (captionText) {
      ctx.fillStyle = textColor;
      ctx.font = `${weight} 48px ${fontFamily}`;
      ctx.fillText(captionText, size / 2, y + 40);
    }
    return canvas.toDataURL("image/png");
  }
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("تعذّر تحميل صورة الدعوة"));
    img.src = ev.invitation_image_url as string;
  });
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  const qrSizePx = (Number(ev.qr_size ?? 22) / 100) * w;
  const qrCx = (Number(ev.qr_x ?? 50) / 100) * w;
  const qrCy = (Number(ev.qr_y ?? 80) / 100) * h;
  const qrX = qrCx - qrSizePx / 2;
  const qrY = qrCy - qrSizePx / 2;
  const pad = qrSizePx * 0.06;

  // Draw white plate behind QR only if bg not transparent-ish
  ctx.fillStyle = qrLight;
  ctx.fillRect(qrX - pad, qrY - pad, qrSizePx + pad * 2, qrSizePx + pad * 2);

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, scanUrl, {
    width: Math.max(256, Math.round(qrSizePx)),
    margin: qrMargin,
    errorCorrectionLevel: qrEcc,
    color: { dark: qrDark, light: qrLight },
  });
  ctx.drawImage(qrCanvas, qrX, qrY, qrSizePx, qrSizePx);

  // Caption block positioned by caption_x / caption_y (percent of image)
  const numberFontSize = Math.max(14, Math.round(qrSizePx * ((ev.caption_font_size ?? 28) / 100)));
  const textFontSize = Math.max(14, Math.round(qrSizePx * ((ev.caption_font_size ?? 28) / 100) * 0.9));
  const capCx = (Number(ev.caption_x ?? 50) / 100) * w;
  const capCy = (Number(ev.caption_y ?? 92) / 100) * h;
  ctx.textAlign = align === "left" ? "left" : align === "right" ? "right" : "center";
  ctx.textBaseline = "middle";

  const lines: Array<{ text: string; color: string; size: number; weight: number | "bold" }> = [];
  if (showNumber) lines.push({ text: String(number), color: numberColor, size: numberFontSize, weight: "bold" });
  if (captionText) lines.push({ text: captionText, color: textColor, size: textFontSize, weight });

  if (lines.length > 0) {
    const gap = 8;
    const totalH = lines.reduce((s, l) => s + l.size + gap, -gap);
    let cy = capCy - totalH / 2 + lines[0].size / 2;
    for (const l of lines) {
      ctx.font = `${l.weight} ${l.size}px ${fontFamily}`;
      if (showBox) {
        const tw = ctx.measureText(l.text).width;
        const padX = 12;
        const padY = 6;
        const boxW = tw + padX * 2;
        const boxH = l.size + padY * 2;
        const boxX = align === "left" ? capCx : align === "right" ? capCx - boxW : capCx - boxW / 2;
        const boxY = cy - boxH / 2;
        ctx.fillStyle = "#fff";
        ctx.fillRect(boxX, boxY, boxW, boxH);
      }
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, capCx, cy);
      cy += l.size + gap;
    }
  }

  return canvas.toDataURL("image/png");
}


function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const mime = /data:([^;]+);/.exec(head)?.[1] || "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type, lastModified: Date.now() });
}

function canShareFiles(files: File[]): boolean {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    return typeof nav.share === "function" && typeof nav.canShare === "function" && nav.canShare({ files });
  } catch {
    return false;
  }
}

async function shareFiles(files: File[], title: string): Promise<boolean> {
  if (!canShareFiles(files)) return false;
  try {
    await navigator.share({ files, title });
    return true;
  } catch (e) {
    // User cancelled — treat as handled
    if ((e as Error).name === "AbortError") return true;
    return false;
  }
}

type ContactPickerNavigator = Navigator & {
  contacts?: {
    select: (
      props: string[],
      opts?: { multiple?: boolean },
    ) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
  };
};

function contactsPickerAvailable(): boolean {
  if (typeof navigator === "undefined") return false;
  return typeof (navigator as ContactPickerNavigator).contacts?.select === "function";
}

async function pickContacts(multiple = true): Promise<Array<{ name: string; phone: string }>> {
  const nav = navigator as ContactPickerNavigator;
  if (!nav.contacts?.select) return [];
  try {
    const res = await nav.contacts.select(["name", "tel"], { multiple });
    return res.map((c) => ({
      name: (c.name?.[0] || "").trim(),
      phone: normalizePhone(c.tel?.[0] || ""),
    }));
  } catch {
    return [];
  }
}

function GuestsTable({
  invitations,
  ev,
  origin,
  onSaveDetails,
}: {
  invitations: Invitation[];
  ev: EventRow;
  origin: string;
  onSaveDetails: (v: { id: string; guest_name?: string; phone?: string }) => void;
}) {
  const [filter, setFilter] = useState<"all" | "attending" | "declined" | "pending">("all");
  const rows = useMemo(
    () => (filter === "all" ? invitations : invitations.filter((i) => i.rsvp_status === filter)),
    [invitations, filter],
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  function startEdit(i: Invitation) {
    setEditing(i.id);
    setName(i.guest_name || "");
    setPhone(i.phone || "");
  }
  function saveEdit(id: string) {
    onSaveDetails({ id, guest_name: name, phone });
    setEditing(null);
  }
  function sendWa(i: Invitation) {
    const msg = buildWhatsappMessage(ev, i, origin);
    const p = normalizePhone(i.phone || "");
    const base = p ? `https://wa.me/${p}` : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <Card className="border-gold/30">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="font-serif">قائمة المدعوين ({rows.length})</CardTitle>
        <div className="flex gap-1 flex-wrap">
          {(["all", "attending", "declined", "pending"] as const).map((k) => (
            <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>
              {k === "all" ? "الكل" : k === "attending" ? "مؤكدون" : k === "declined" ? "معتذرون" : "بانتظار الرد"}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold/20 text-right">
              <th className="p-2">الاسم</th>
              <th className="p-2">الحالة</th>
              <th className="p-2">المرافقون</th>
              <th className="p-2">الجوال</th>
              <th className="p-2">الحضور</th>
              <th className="p-2">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">لا يوجد</td></tr>
            )}
            {rows.map((i) => (
              <tr key={i.id} className="border-b border-gold/10">
                <td className="p-2">
                  {editing === i.id ? (
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
                  ) : (
                    i.guest_name || <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-2">
                  {i.rsvp_status === "attending" ? (
                    <Badge className="bg-primary text-primary-foreground">مؤكد</Badge>
                  ) : i.rsvp_status === "declined" ? (
                    <Badge variant="destructive">معتذر</Badge>
                  ) : (
                    <Badge variant="outline">بانتظار</Badge>
                  )}
                </td>
                <td className="p-2">{i.rsvp_status === "attending" ? i.companions + 1 : "—"}</td>
                <td className="p-2 font-mono text-xs" dir="ltr">
                  {editing === i.id ? (
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 font-mono" />
                  ) : (
                    i.phone || "—"
                  )}
                </td>
                <td className="p-2">
                  {i.scanned_at ? <Badge className="bg-gold text-primary-foreground">دخل</Badge> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="p-2">
                  {editing === i.id ? (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => saveEdit(i.id)}>حفظ</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>إلغاء</Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(i)}>تعديل</Button>
                      <Button size="sm" variant="ghost" className="text-[#25D366]" onClick={() => sendWa(i)}>
                        <MessageCircle className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function ImageUploader({
  label,
  value,
  uploading,
  onFile,
  onClear,
}: {
  label: string;
  value: string | null;
  uploading?: boolean;
  onFile: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  async function handleFile(f: File) {
    if (f.size > 4 * 1024 * 1024) {
      toast.error("الصورة كبيرة جداً. الحد الأقصى 4 ميجابايت.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onFile(String(reader.result));
    reader.readAsDataURL(f);
  }
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input ref={ref} type="file" accept="image/*" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      <div className="flex flex-wrap items-start gap-3">
        {value ? (
          <img src={value} alt={label} className="h-28 w-28 rounded-md border border-gold/30 object-cover" />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-md border-2 border-dashed border-gold/30 text-gold/60">
            <ImageIcon className="size-8" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => ref.current?.click()}>
            <Upload className="size-4" /> {value ? "تغيير" : uploading ? "جاري..." : "رفع صورة"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              <Trash2 className="size-4" /> إزالة
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ScanPagesDesigner({
  ev,
  uploading,
  onUpload,
  onClear,
}: {
  ev: EventRow;
  uploading?: boolean;
  onUpload: (kind: "success" | "already", dataUrl: string) => void;
  onClear: (kind: "success" | "already") => void;
}) {
  return (
    <Card className="border-gold/30">
      <CardHeader>
        <CardTitle className="font-serif">صور صفحات المسح</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          صور تظهر للمدعو بعد مسح الباركود. إذا لم ترفع صورة تظهر الصفحة الافتراضية.
        </p>
        <ImageUploader label="صورة عند تأكيد الدخول بنجاح" value={ev.success_image_url}
          uploading={uploading} onFile={(d) => onUpload("success", d)} onClear={() => onClear("success")} />
        <ImageUploader label="صورة عند المسح المتكرر (تم المسح مسبقاً)" value={ev.already_image_url}
          uploading={uploading} onFile={(d) => onUpload("already", d)} onClear={() => onClear("already")} />
      </CardContent>
    </Card>
  );
}

type DesignPatch = Partial<{
  qr_x: number;
  qr_y: number;
  qr_size: number;
  caption_x: number;
  caption_y: number;
  caption_show_number: boolean;
  caption_show_box: boolean;
  number_on_image: boolean;
  number_in_filename: boolean;
  caption_text_color: string;
  caption_number_color: string;
  caption_font_family: string;
  caption_font_size: number;
  caption_align: "left" | "center" | "right";
  caption_font_weight: number;
  qr_color: string;
  qr_bg_color: string;
  qr_ecc: "L" | "M" | "Q" | "H";
  qr_margin: number;
}>;

function InvitationDesigner({
  ev,
  invitations,
  uploading,
  onUpload,
  onClear,
  onSaveDesign,
  saving,
}: {
  ev: EventRow;
  invitations: Invitation[];
  uploading?: boolean;
  onUpload: (dataUrl: string) => void;
  onClear: () => void;
  onSaveDesign: (patch: DesignPatch) => void;
  saving?: boolean;
}) {
  // Local editable state
  const [qrX, setQrX] = useState<number>(Number(ev.qr_x ?? 50));
  const [qrY, setQrY] = useState<number>(Number(ev.qr_y ?? 80));
  const [qrSize, setQrSize] = useState<number>(Number(ev.qr_size ?? 22));
  const [capX, setCapX] = useState<number>(Number(ev.caption_x ?? 50));
  const [capY, setCapY] = useState<number>(Number(ev.caption_y ?? 92));

  const [showNumber, setShowNumber] = useState<boolean>(!!ev.caption_show_number);
  const [showBox, setShowBox] = useState<boolean>(ev.caption_show_box !== false);
  const [numberOnImage, setNumberOnImage] = useState<boolean>(ev.number_on_image !== false);
  const [numberInFilename, setNumberInFilename] = useState<boolean>(ev.number_in_filename !== false);

  const [textColor, setTextColor] = useState<string>(ev.caption_text_color || "#111111");
  const [numberColor, setNumberColor] = useState<string>(ev.caption_number_color || "#111111");
  const [fontFamily, setFontFamily] = useState<string>(ev.caption_font_family || "sans-serif");
  const [fontSize, setFontSize] = useState<number>(Number(ev.caption_font_size ?? 28));
  const [align, setAlign] = useState<"left" | "center" | "right">((ev.caption_align as "left" | "center" | "right") || "center");
  const [weight, setWeight] = useState<number>(Number(ev.caption_font_weight ?? 600));

  const [qrColor, setQrColor] = useState<string>(ev.qr_color || "#0F3D2E");
  const [qrBgColor, setQrBgColor] = useState<string>(ev.qr_bg_color || "#FFFFFF");
  const [qrEcc, setQrEcc] = useState<"L" | "M" | "Q" | "H">((ev.qr_ecc as "L" | "M" | "Q" | "H") || "M");
  const [qrMargin, setQrMargin] = useState<number>(Number(ev.qr_margin ?? 1));

  const [sampleId, setSampleId] = useState<string>(invitations[0]?.id || "");
  const sample = invitations.find((i) => i.id === sampleId) || invitations[0] || null;
  const sampleNumber = sample?.display_number ?? 1;
  const sampleText = sample?.caption_text || "نموذج للنص";

  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"qr" | "cap" | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Regenerate preview QR when colors/ecc/margin change
  const previewUrl = "https://example.com/preview";
  const qrKey = `${qrColor}|${qrBgColor}|${qrEcc}|${qrMargin}`;
  const qrKeyRef = useRef("");
  if (qrKeyRef.current !== qrKey) {
    qrKeyRef.current = qrKey;
    QRCode.toDataURL(previewUrl, {
      width: 512,
      margin: qrMargin,
      errorCorrectionLevel: qrEcc,
      color: { dark: qrColor, light: qrBgColor },
    }).then(setQrDataUrl).catch(() => {});
  }

  async function onFile(f: File) {
    if (f.size > 4 * 1024 * 1024) { toast.error("الصورة كبيرة جداً. الحد الأقصى 4 ميجابايت."); return; }
    const reader = new FileReader();
    reader.onload = () => onUpload(String(reader.result));
    reader.readAsDataURL(f);
  }

  function pctFromEvent(e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) {
    if (!previewRef.current) return { x: 0, y: 0 };
    const rect = previewRef.current.getBoundingClientRect();
    const cx = "clientX" in e ? e.clientX : 0;
    const cy = "clientY" in e ? e.clientY : 0;
    return {
      x: Math.max(0, Math.min(100, ((cx - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((cy - rect.top) / rect.height) * 100)),
    };
  }

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const p = pctFromEvent(e);
    if (dragging === "qr") { setQrX(p.x); setQrY(p.y); }
    else { setCapX(p.x); setCapY(p.y); }
  }

  function saveAll() {
    onSaveDesign({
      qr_x: qrX, qr_y: qrY, qr_size: qrSize,
      caption_x: capX, caption_y: capY,
      caption_show_number: showNumber,
      caption_show_box: showBox,
      number_on_image: numberOnImage,
      number_in_filename: numberInFilename,
      caption_text_color: textColor,
      caption_number_color: numberColor,
      caption_font_family: fontFamily,
      caption_font_size: fontSize,
      caption_align: align,
      caption_font_weight: weight,
      qr_color: qrColor,
      qr_bg_color: qrBgColor,
      qr_ecc: qrEcc,
      qr_margin: qrMargin,
    });
  }

  const textAlignCss: React.CSSProperties["textAlign"] = align;
  const captionTransform =
    align === "left" ? "translate(0, -50%)" : align === "right" ? "translate(-100%, -50%)" : "translate(-50%, -50%)";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="border-gold/30">
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="font-serif">معاينة صورة الدعوة</CardTitle>
          {invitations.length > 0 && (
            <select
              value={sampleId || invitations[0]?.id || ""}
              onChange={(e) => setSampleId(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs"
            >
              {invitations.map((i) => (
                <option key={i.id} value={i.id}>
                  دعوة #{i.display_number ?? "?"} {i.caption_text ? `— ${i.caption_text}` : ""}
                </option>
              ))}
            </select>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              {uploading ? "جاري الرفع..." : ev.invitation_image_url ? "تغيير الصورة" : "رفع صورة الدعوة"}
            </Button>
            {ev.invitation_image_url && (
              <Button type="button" variant="ghost" size="sm" onClick={onClear}>
                <Trash2 className="size-4" /> إزالة
              </Button>
            )}
          </div>

          {ev.invitation_image_url ? (
            <>
              <p className="text-xs text-muted-foreground">اسحب الباركود أو النص على الصورة لتحديد الموقع.</p>
              <div
                ref={previewRef}
                onPointerMove={handleMove}
                onPointerUp={() => setDragging(null)}
                onPointerLeave={() => setDragging(null)}
                className="relative mx-auto w-full max-w-md overflow-hidden rounded-md border border-gold/30 select-none touch-none"
              >
                <img src={ev.invitation_image_url} alt="معاينة" className="block w-full h-auto" draggable={false} />
                {/* QR overlay */}
                <div
                  onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging("qr"); }}
                  className="absolute cursor-move"
                  style={{ left: `${qrX}%`, top: `${qrY}%`, width: `${qrSize}%`, aspectRatio: "1 / 1", transform: "translate(-50%, -50%)" }}
                >
                  <div className="w-full h-full ring-2 ring-gold/70 overflow-hidden" style={{ background: qrBgColor }}>
                    {qrDataUrl && <img src={qrDataUrl} alt="qr" className="w-full h-full block" draggable={false} />}
                  </div>
                </div>
                {/* Caption overlay */}
                {(showNumber || sampleText) && (
                  <div
                    onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging("cap"); }}
                    className="absolute cursor-move ring-1 ring-dashed ring-gold/50 px-2 py-1"
                    style={{
                      left: `${capX}%`,
                      top: `${capY}%`,
                      transform: captionTransform,
                      textAlign: textAlignCss,
                      fontFamily,
                      minWidth: "40px",
                      background: showBox ? "rgba(255,255,255,0.85)" : "transparent",
                    }}
                  >
                    {showNumber && (
                      <div style={{ color: numberColor, fontSize: `${Math.max(10, fontSize * 0.4)}px`, fontWeight: 700, lineHeight: 1.2 }}>
                        {sampleNumber}
                      </div>
                    )}
                    {sampleText && (
                      <div style={{ color: textColor, fontSize: `${Math.max(9, fontSize * 0.35)}px`, fontWeight: weight, lineHeight: 1.2 }}>
                        {sampleText}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-gold/30 p-12 text-center text-muted-foreground">
              <ImageIcon className="size-10 text-gold/60" />
              <p>ارفع صورة الدعوة لتظهر للمدعوين مع باركودهم في المكان الذي تختاره.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="font-serif text-base">خيارات التصميم</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Barcode */}
          <section className="space-y-2">
            <p className="text-xs font-semibold">الباركود</p>
            <div>
              <Label className="text-xs">الحجم ({Math.round(qrSize)}%)</Label>
              <Slider value={[qrSize]} min={10} max={60} step={1} onValueChange={(v) => setQrSize(v[0])} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">X ({Math.round(qrX)}%)</Label>
                <Slider value={[qrX]} min={0} max={100} step={1} onValueChange={(v) => setQrX(v[0])} />
              </div>
              <div>
                <Label className="text-xs">Y ({Math.round(qrY)}%)</Label>
                <Slider value={[qrY]} min={0} max={100} step={1} onValueChange={(v) => setQrY(v[0])} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">لون النقاط</Label>
                <Input type="color" value={qrColor} onChange={(e) => setQrColor(e.target.value)} className="h-9 p-1" />
              </div>
              <div>
                <Label className="text-xs">لون الخلفية</Label>
                <Input type="color" value={qrBgColor} onChange={(e) => setQrBgColor(e.target.value)} className="h-9 p-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">تصحيح الخطأ</Label>
                <select value={qrEcc} onChange={(e) => setQrEcc(e.target.value as "L" | "M" | "Q" | "H")}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                  <option value="L">L — منخفض</option>
                  <option value="M">M — متوسط</option>
                  <option value="Q">Q — عالي</option>
                  <option value="H">H — الأعلى</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">الهامش ({qrMargin})</Label>
                <Slider value={[qrMargin]} min={0} max={8} step={1} onValueChange={(v) => setQrMargin(v[0])} />
              </div>
            </div>
          </section>

          {/* Caption */}
          <section className="space-y-2 border-t border-gold/20 pt-3">
            <p className="text-xs font-semibold">النص والرقم</p>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={showNumber} onChange={(e) => setShowNumber(e.target.checked)} />
              إظهار رقم الدعوة تحت النص
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={showBox} onChange={(e) => setShowBox(e.target.checked)} />
              خلفية بيضاء خلف النص
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">X ({Math.round(capX)}%)</Label>
                <Slider value={[capX]} min={0} max={100} step={1} onValueChange={(v) => setCapX(v[0])} />
              </div>
              <div>
                <Label className="text-xs">Y ({Math.round(capY)}%)</Label>
                <Slider value={[capY]} min={0} max={100} step={1} onValueChange={(v) => setCapY(v[0])} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">لون النص</Label>
                <Input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-9 p-1" />
              </div>
              <div>
                <Label className="text-xs">لون الرقم</Label>
                <Input type="color" value={numberColor} onChange={(e) => setNumberColor(e.target.value)} className="h-9 p-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">الخط</Label>
              <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                <option value="sans-serif">Sans Serif</option>
                <option value="serif">Serif</option>
                <option value="'Amiri', serif">Amiri (عربي)</option>
                <option value="'Cairo', sans-serif">Cairo (عربي)</option>
                <option value="'Tajawal', sans-serif">Tajawal (عربي)</option>
                <option value="monospace">Monospace</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">الحجم ({fontSize})</Label>
                <Slider value={[fontSize]} min={10} max={80} step={1} onValueChange={(v) => setFontSize(v[0])} />
              </div>
              <div>
                <Label className="text-xs">وزن الخط ({weight})</Label>
                <Slider value={[weight]} min={100} max={900} step={100} onValueChange={(v) => setWeight(v[0])} />
              </div>
            </div>
            <div>
              <Label className="text-xs">المحاذاة</Label>
              <div className="flex gap-1">
                {(["right", "center", "left"] as const).map((a) => (
                  <Button key={a} size="sm" type="button" variant={align === a ? "default" : "outline"} onClick={() => setAlign(a)}>
                    {a === "right" ? "يمين" : a === "left" ? "يسار" : "وسط"}
                  </Button>
                ))}
              </div>
            </div>
          </section>

          {/* Numbering */}
          <section className="space-y-2 border-t border-gold/20 pt-3">
            <p className="text-xs font-semibold">الترقيم</p>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={numberOnImage} onChange={(e) => setNumberOnImage(e.target.checked)} />
              طباعة رقم الدعوة داخل الصورة
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={numberInFilename} onChange={(e) => setNumberInFilename(e.target.checked)} />
              تضمين الرقم في اسم ملف التحميل
            </label>
            <p className="text-[10px] text-muted-foreground">
              يمكن اختيار الاثنين معاً أو أحدهما أو تعطيلهما. الرقم داخل الصورة يعمل عند تفعيل "إظهار رقم الدعوة".
            </p>
          </section>

          <Button className="w-full" disabled={saving} onClick={saveAll}>
            {saving ? "جاري الحفظ..." : "حفظ التصميم"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


function InvitationCard({
  inv,
  ev,
  origin,
  number,
  canDelete,
  onDelete,
  onSaveDetails,
}: {
  inv: Invitation;
  ev: EventRow;
  origin: string;
  number: number;
  canDelete: boolean;
  onDelete: () => void;
  onSaveDetails: (v: { guest_name?: string; phone?: string; caption_text?: string }) => void;
}) {
  const rsvpUrl = `${origin}/i/${inv.code}`;
  const scanUrl = `${origin}/s/${inv.scan_code}`;
  const [name, setName] = useState(inv.guest_name || "");
  const [phone, setPhone] = useState(inv.phone || "");
  const [caption, setCaption] = useState(inv.caption_text || "");
  const [showWa, setShowWa] = useState(false);
  const [waMsg, setWaMsg] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  function copy(url: string, label: string) {
    navigator.clipboard.writeText(url);
    toast.success(`تم نسخ ${label}`);
  }
  function openWhatsapp() {
    const msg = waMsg || buildWhatsappMessage(ev, inv, origin);
    const p = normalizePhone(phone);
    const base = p ? `https://wa.me/${p}` : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const statusBadge =
    inv.rsvp_status === "attending" ? (
      <Badge className="bg-primary text-primary-foreground">مؤكد ({inv.companions + 1})</Badge>
    ) : inv.rsvp_status === "declined" ? (
      <Badge variant="destructive">معتذر</Badge>
    ) : (
      <Badge variant="outline">بانتظار الرد</Badge>
    );

  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const filename = ev.number_in_filename
    ? `invitation-${String(number).padStart(3, "0")}-${inv.code}.png`
    : `invitation-${inv.code}.png`;

  async function downloadCard() {
    try {
      setDownloading(true);
      const dataUrl = await composeInvitationDataUrl(ev, inv, number, origin);
      triggerDownload(dataUrlToBlob(dataUrl), filename);
    } catch (e) {
      toast.error((e as Error).message || "تعذّر تنزيل الصورة");
    } finally {
      setDownloading(false);
    }
  }

  async function shareCard() {
    try {
      setSharing(true);
      const dataUrl = await composeInvitationDataUrl(ev, inv, number, origin);
      const file = blobToFile(dataUrlToBlob(dataUrl), filename);
      if (!canShareFiles([file])) {
        toast.info("المشاركة غير مدعومة على هذا الجهاز — تم التنزيل بدلاً منها");
        triggerDownload(dataUrlToBlob(dataUrl), filename);
        return;
      }
      const ok = await shareFiles([file], `دعوة ${number}`);
      if (!ok) toast.error("تعذّرت المشاركة");
    } catch (e) {
      toast.error((e as Error).message || "تعذّرت المشاركة");
    } finally {
      setSharing(false);
    }
  }

  return (
    <Card className="border-gold/30 break-inside-avoid">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono">{number}</Badge>
            {statusBadge}
            {inv.scanned_at && (
              <Badge className="bg-gold text-primary-foreground">
                <ScanLine className="size-3" /> تم الدخول
              </Badge>
            )}
          </div>
          {canDelete && (
            <Button variant="ghost" size="icon" className="size-7 print:hidden" onClick={onDelete} aria-label="حذف">
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
        <div className="flex justify-center"><div className="size-36 bg-white"><QRCard url={scanUrl} size={512} /></div></div>
        <div className="text-center space-y-1">
          {ev.caption_show_number && (
            <p
              className="font-bold"
              style={{ color: ev.caption_number_color || undefined, fontFamily: ev.caption_font_family || undefined }}
            >
              {number}
            </p>
          )}
          {inv.caption_text && (
            <p
              className="text-sm"
              style={{ color: ev.caption_text_color || undefined, fontFamily: ev.caption_font_family || undefined }}
            >
              {inv.caption_text}
            </p>
          )}
          <p className="font-mono text-xs tracking-widest text-muted-foreground">{number} · {inv.code}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 print:hidden">
          <Button variant="outline" size="sm" disabled={downloading} onClick={downloadCard}>
            <Download className="size-3.5" /> {downloading ? "..." : "تنزيل"}
          </Button>
          <Button variant="outline" size="sm" disabled={sharing} onClick={shareCard}>
            <Share2 className="size-3.5" /> {sharing ? "..." : "مشاركة"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye className="size-3.5" /> معاينة
          </Button>
        </div>
        <InvitationPreviewDialog
          inv={inv}
          ev={ev}
          origin={origin}
          number={number}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          onSaveDetails={(v) => onSaveDetails(v)}
        />



        <div className="space-y-2 print:hidden">
          <Input value={name} onChange={(e) => setName(e.target.value)}
            onBlur={() => name !== (inv.guest_name || "") && onSaveDetails({ guest_name: name })}
            placeholder="اسم المدعو (اختياري)" maxLength={120} />
          <Input value={caption} onChange={(e) => setCaption(e.target.value)}
            onBlur={() => caption !== (inv.caption_text || "") && onSaveDetails({ caption_text: caption })}
            placeholder="نص تحت الباركود (اختياري)" maxLength={200} />
          <div className="flex gap-2">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)}
              onBlur={() => phone !== (inv.phone || "") && onSaveDetails({ phone })}
              placeholder="رقم الجوال (مثال 9665xxxxxxxx)" maxLength={30} dir="ltr" className="font-mono" />
            {contactsPickerAvailable() && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="من جهات الاتصال"
                onClick={async () => {
                  const picks = await pickContacts(false);
                  const first = picks[0];
                  if (!first) return;
                  if (first.phone) {
                    setPhone(first.phone);
                    onSaveDetails({ phone: first.phone, ...(name ? {} : { guest_name: first.name }) });
                    if (!name && first.name) setName(first.name);
                  }
                }}
              >
                <BookUser className="size-4" />
              </Button>
            )}
          </div>
          <Button variant="default" size="sm" className="w-full bg-[#25D366] hover:bg-[#20b858] text-white"
            onClick={() => { setWaMsg(buildWhatsappMessage(ev, inv, origin)); setShowWa(true); }}>
            <MessageCircle className="size-3.5" /> إرسال عبر واتساب
          </Button>
          {showWa && (
            <div className="space-y-2 rounded-md border border-gold/20 p-2">
              <Textarea value={waMsg} onChange={(e) => setWaMsg(e.target.value)} rows={6} className="text-xs" />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={openWhatsapp}>فتح واتساب</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowWa(false)}>إغلاق</Button>
              </div>
            </div>
          )}
          <Button variant="outline" size="sm" className="w-full" onClick={() => copy(rsvpUrl, "رابط الدعوة")}>
            <LinkIcon className="size-3.5" /> نسخ رابط الدعوة
          </Button>
          <Button variant="ghost" size="sm" className="w-full" onClick={() => copy(scanUrl, "رابط الباركود")}>
            <Copy className="size-3.5" /> نسخ رابط الباركود
          </Button>
        </div>
        {inv.guest_name && <p className="hidden print:block text-center text-sm">{inv.guest_name}</p>}
        {inv.apology_message && (
          <p className="rounded bg-muted/50 p-2 text-xs text-muted-foreground print:hidden">✉️ {inv.apology_message}</p>
        )}
      </CardContent>
    </Card>
  );
}

function EventForm({
  initial,
  onSubmit,
  loading,
}: {
  initial?: {
    title: string;
    groom_name: string | null;
    bride_name: string | null;
    event_date: string | null;
    venue: string | null;
    venue_map_url?: string | null;
    notes: string | null;
    scan_date?: string | null;
    companions_enabled?: boolean;
  };
  onSubmit: (v: {
    title: string;
    groom_name?: string;
    bride_name?: string;
    event_date?: string;
    venue?: string;
    venue_map_url?: string;
    notes?: string;
    scan_date?: string | null;
    companions_enabled?: boolean;
  }) => void;
  loading?: boolean;
}) {
  const [companionsOn, setCompanionsOn] = useState<boolean>(initial?.companions_enabled ?? true);

  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      onSubmit({
        title: (fd.get("title") as string) || "حفل زفاف",
        groom_name: (fd.get("groom_name") as string) || undefined,
        bride_name: (fd.get("bride_name") as string) || undefined,
        event_date: (fd.get("event_date") as string) || undefined,
        venue: (fd.get("venue") as string) || undefined,
        venue_map_url: (fd.get("venue_map_url") as string) || undefined,
        notes: (fd.get("notes") as string) || undefined,
        scan_date: (fd.get("scan_date") as string) || null,
        companions_enabled: companionsOn,
      });
    }}>
      <div className="space-y-2">
        <Label htmlFor="title">عنوان الفعالية</Label>
        <Input id="title" name="title" defaultValue={initial?.title || "حفل زفاف"} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="groom_name">اسم العريس</Label>
          <Input id="groom_name" name="groom_name" defaultValue={initial?.groom_name || ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bride_name">اسم العروس</Label>
          <Input id="bride_name" name="bride_name" defaultValue={initial?.bride_name || ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="event_date">التاريخ والوقت</Label>
        <Input id="event_date" name="event_date" type="datetime-local"
          defaultValue={initial?.event_date ? initial.event_date.slice(0, 16) : ""} dir="ltr" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="scan_date">يوم السماح بمسح الباركود</Label>
        <Input id="scan_date" name="scan_date" type="date" defaultValue={initial?.scan_date || ""} dir="ltr" />
        <p className="text-xs text-muted-foreground">اتركه فارغاً للسماح بأي وقت.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="venue">المكان</Label>
        <Input id="venue" name="venue" defaultValue={initial?.venue || ""} placeholder="قاعة..." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="venue_map_url">رابط موقع القاعة على قوقل ماب</Label>
        <Input id="venue_map_url" name="venue_map_url" type="url" dir="ltr"
          defaultValue={initial?.venue_map_url || ""}
          placeholder="https://maps.google.com/..." />
        <p className="text-xs text-muted-foreground">
          افتح موقع القاعة في قوقل ماب ← مشاركة ← نسخ الرابط، ثم الصقه هنا.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">ملاحظات للمدعوين</Label>
        <Textarea id="notes" name="notes" defaultValue={initial?.notes || ""} rows={3} />
      </div>

      <div className="space-y-3 rounded-md border border-gold/30 bg-secondary/30 p-3">
        <p className="font-serif text-sm font-semibold">خيارات المدعوين</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={companionsOn} onChange={(e) => setCompanionsOn(e.target.checked)} />
          السماح للمدعو بإضافة عدد المرافقين
        </label>
      </div>



      <Button type="submit" disabled={loading}>
        <Users className="size-4" /> {loading ? "جاري الحفظ..." : "حفظ"}
      </Button>
    </form>
  );
}

type CollabPerms = {
  can_send_invitations: boolean;
  can_view_rsvps: boolean;
  can_view_attendee_info: boolean;
};

function PermissionsPicker({
  value,
  onChange,
}: {
  value: CollabPerms;
  onChange: (v: CollabPerms) => void;
}) {
  const items: Array<{ key: keyof CollabPerms; label: string; hint: string }> = [
    { key: "can_send_invitations", label: "إرسال الدعوات للمعازيم", hint: "يقدر يفتح واتساب/ينسخ رابط الدعوة." },
    { key: "can_view_rsvps", label: "معرفة من سيحضر ومن اعتذر", hint: "يشاهد حالة رد كل مدعو." },
    { key: "can_view_attendee_info", label: "معلومات الحاضرين", hint: "يشاهد الأسماء والجوالات." },
  ];
  return (
    <div className="space-y-2 rounded-md border border-gold/30 bg-secondary/30 p-3">
      <p className="text-sm font-semibold">صلاحيات المساعد</p>
      {items.map((it) => (
        <label key={it.key} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={value[it.key]}
            onChange={(e) => onChange({ ...value, [it.key]: e.target.checked })}
            className="mt-1"
          />
          <span>
            {it.label}
            <span className="block text-xs text-muted-foreground">{it.hint}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function CollaboratorsTab({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listCollaborators);
  const add = useServerFn(addCollaborator);
  const remove = useServerFn(removeCollaborator);
  const createAcct = useServerFn(createCollaboratorAccount);
  const updPerms = useServerFn(updateCollaboratorPermissions);

  const q = useQuery({
    queryKey: ["collaborators", eventId],
    queryFn: () => list({ data: { event_id: eventId } }),
  });
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const defaultPerms: CollabPerms = {
    can_send_invitations: true,
    can_view_rsvps: true,
    can_view_attendee_info: true,
  };
  const [newPerms, setNewPerms] = useState<CollabPerms>(defaultPerms);
  const [existingPerms, setExistingPerms] = useState<CollabPerms>(defaultPerms);

  const addMut = useMutation({
    mutationFn: () => add({ data: { event_id: eventId, email, ...existingPerms } }),
    onSuccess: () => {
      toast.success("تمت الإضافة");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["collaborators", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: () =>
      createAcct({
        data: { event_id: eventId, email: newEmail, password: newPassword, ...newPerms },
      }),
    onSuccess: () => {
      toast.success("تم إنشاء حساب المساعد وربطه بالمناسبة");
      setNewEmail("");
      setNewPassword("");
      setNewPerms(defaultPerms);
      qc.invalidateQueries({ queryKey: ["collaborators", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const permsMut = useMutation({
    mutationFn: (v: { id: string } & Partial<CollabPerms>) => updPerms({ data: v }),
    onSuccess: () => {
      toast.success("تم تحديث الصلاحيات");
      qc.invalidateQueries({ queryKey: ["collaborators", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collaborators", eventId] }),
  });

  const rows = q.data ?? [];

  return (
    <div className="space-y-4">
      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="font-serif">إنشاء حساب مساعد جديد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            حدد الصلاحيات أولاً ثم أنشئ الحساب. المساعد سيدخل بالبريد وكلمة المرور مباشرة.
          </p>
          <PermissionsPicker value={newPerms} onChange={setNewPerms} />
          <form
            className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newEmail.trim() || newPassword.length < 6) {
                toast.error("أدخل بريداً وكلمة مرور 6 أحرف على الأقل");
                return;
              }
              createMut.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="new-acct-email">البريد الإلكتروني</Label>
              <Input
                id="new-acct-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                dir="ltr"
                placeholder="assistant@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-acct-pass">كلمة المرور</Label>
              <Input
                id="new-acct-pass"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                dir="ltr"
                placeholder="6 أحرف على الأقل"
              />
            </div>
            <Button type="submit" disabled={createMut.isPending}>
              <Plus className="size-4" /> إنشاء الحساب
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="font-serif">إضافة مساعد بحساب موجود</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PermissionsPicker value={existingPerms} onChange={setExistingPerms} />
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim()) return;
              addMut.mutate();
            }}
          >
            <div className="flex-1 min-w-[220px] space-y-2">
              <Label htmlFor="collab-email">البريد الإلكتروني</Label>
              <Input
                id="collab-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="assistant@example.com"
                dir="ltr"
              />
            </div>
            <Button type="submit" disabled={addMut.isPending}>
              <Plus className="size-4" /> إضافة مساعد
            </Button>
          </form>

          <div className="space-y-2">
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">لا يوجد مساعدون بعد</p>
            )}
            {rows.map((r) => {
              const row = r as typeof r & Partial<CollabPerms>;
              const perms: CollabPerms = {
                can_send_invitations: row.can_send_invitations ?? true,
                can_view_rsvps: row.can_view_rsvps ?? true,
                can_view_attendee_info: row.can_view_attendee_info ?? true,
              };
              return (
                <div
                  key={r.id}
                  className="rounded-md border border-gold/20 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-gold" />
                      <span dir="ltr" className="font-mono text-sm">{r.email}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => delMut.mutate(r.id)}
                      aria-label="إزالة"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {(
                      [
                        ["can_send_invitations", "إرسال الدعوات"],
                        ["can_view_rsvps", "معرفة الردود"],
                        ["can_view_attendee_info", "معلومات الحاضرين"],
                      ] as Array<[keyof CollabPerms, string]>
                    ).map(([k, label]) => (
                      <label key={k} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={perms[k]}
                          onChange={(e) =>
                            permsMut.mutate({ id: r.id, [k]: e.target.checked })
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AssistantGuestsView({
  invitations,
  ev,
  origin,
  permissions,
}: {
  invitations: Invitation[];
  ev: EventRow;
  origin: string;
  permissions: {
    can_send_invitations: boolean;
    can_view_rsvps: boolean;
    can_view_attendee_info: boolean;
  } | null;
}) {
  const canViewInfo = permissions?.can_view_attendee_info ?? false;
  const canViewRsvps = permissions?.can_view_rsvps ?? false;
  const canSend = permissions?.can_send_invitations ?? false;

  const [filter, setFilter] = useState<"all" | "attending" | "declined" | "pending" | "scanned" | "not-scanned">("all");
  const rows = useMemo(() => {
    if (filter === "all") return invitations;
    if (filter === "scanned") return invitations.filter((i) => !!i.scanned_at);
    if (filter === "not-scanned") return invitations.filter((i) => !i.scanned_at);
    return invitations.filter((i) => i.rsvp_status === filter);
  }, [invitations, filter]);

  function sendWa(i: Invitation) {
    const msg = buildWhatsappMessage(ev, i, origin);
    const p = normalizePhone(i.phone || "");
    const base = p ? `https://wa.me/${p}` : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(msg)}`, "_blank");
  }
  function copyLink(i: Invitation) {
    navigator.clipboard.writeText(`${origin}/i/${i.code}`);
    toast.success("تم نسخ رابط الدعوة");
  }

  const scanned = invitations.filter((i) => i.scanned_at).length;

  return (
    <Card className="border-gold/30">
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="font-serif flex items-center gap-2">
          <span>قائمة المدعوين ({rows.length})</span>
          <span className="text-sm font-normal text-muted-foreground">دخل {scanned} من {invitations.length}</span>
        </CardTitle>
        <div className="flex gap-1 flex-wrap">
          {(
            [
              ["all", "الكل"],
              ...(canViewRsvps
                ? ([
                    ["attending", "مؤكدون"],
                    ["declined", "معتذرون"],
                    ["pending", "بانتظار"],
                  ] as const)
                : []),
              ["scanned", "دخلوا"],
              ["not-scanned", "لم يدخلوا"],
            ] as const
          ).map(([k, label]) => (
            <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>
              {label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {!permissions && (
          <p className="text-xs text-destructive pb-2">
            لم يتم العثور على صلاحياتك في هذه المناسبة. راجع المضيف.
          </p>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold/20 text-right">
              {canViewInfo && <th className="p-2">الاسم</th>}
              <th className="p-2">الرقم</th>
              {canViewRsvps && <th className="p-2">الحالة</th>}
              {canViewRsvps && <th className="p-2">المرافقون</th>}
              {canViewInfo && <th className="p-2">الجوال</th>}
              <th className="p-2">الحضور</th>
              {canSend && canViewInfo && <th className="p-2">إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">لا يوجد</td>
              </tr>
            )}
            {rows.map((i) => (
              <tr key={i.id} className="border-b border-gold/10">
                {canViewInfo && (
                  <td className="p-2">{i.guest_name || <span className="text-muted-foreground">—</span>}</td>
                )}
                <td className="p-2 font-mono text-xs" dir="ltr">
                  {i.display_number ?? "—"} · {i.code}
                </td>
                {canViewRsvps && (
                  <td className="p-2">
                    {i.rsvp_status === "attending" ? (
                      <Badge className="bg-primary text-primary-foreground">مؤكد</Badge>
                    ) : i.rsvp_status === "declined" ? (
                      <Badge variant="destructive">معتذر</Badge>
                    ) : (
                      <Badge variant="outline">بانتظار</Badge>
                    )}
                  </td>
                )}
                {canViewRsvps && (
                  <td className="p-2">{i.rsvp_status === "attending" ? i.companions + 1 : "—"}</td>
                )}
                {canViewInfo && (
                  <td className="p-2 font-mono text-xs" dir="ltr">
                    {i.phone || "—"}
                  </td>
                )}
                <td className="p-2">
                  {i.scanned_at ? (
                    <Badge className="bg-gold text-primary-foreground">دخل</Badge>
                  ) : (
                    <Badge variant="outline">لم يدخل</Badge>
                  )}
                </td>
                {canSend && canViewInfo && (
                  <td className="p-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="text-[#25D366]" onClick={() => sendWa(i)} aria-label="واتساب">
                        <MessageCircle className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => copyLink(i)} aria-label="نسخ الرابط">
                        <LinkIcon className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function DownloadAllButton({
  ev,
  invitations,
  origin,
}: {
  ev: EventRow;
  invitations: Invitation[];
  origin: string;
}) {
  const [batchSize, setBatchSize] = useState(50);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Oldest first → #1
  const ordered = useMemo(() => [...invitations].reverse(), [invitations]);
  const total = ordered.length;
  const size = Math.max(1, Math.min(batchSize || 1, Math.max(total, 1)));
  const chunks = useMemo(() => {
    const out: { start: number; end: number }[] = [];
    for (let i = 0; i < total; i += size) {
      out.push({ start: i + 1, end: Math.min(i + size, total) });
    }
    return out;
  }, [total, size]);

  const safeTitle = (ev.title || "invitations").replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 40);

  async function buildFiles(startNum: number, endNum: number) {
    const files: File[] = [];
    for (let n = startNum; n <= endNum; n++) {
      const inv = ordered[n - 1];
      if (!inv) continue;
      const dataUrl = await composeInvitationDataUrl(ev, inv, n, origin);
      const filename = ev.number_in_filename
        ? `invitation-${String(n).padStart(3, "0")}-${inv.code}.png`
        : `invitation-${inv.code}.png`;
      files.push(blobToFile(dataUrlToBlob(dataUrl), filename));
      setProgress(Math.round(((n - startNum + 1) / (endNum - startNum + 1)) * 100));
    }
    return files;
  }

  async function downloadRange(startNum: number, endNum: number) {
    const key = `dl-${startNum}-${endNum}`;
    try {
      setBusyKey(key);
      setProgress(0);
      const files = await buildFiles(startNum, endNum);
      if (files.length === 1) {
        triggerDownload(files[0], files[0].name);
      } else {
        const zip = new JSZip();
        for (const f of files) {
          const buf = await f.arrayBuffer();
          zip.file(f.name, buf);
        }
        const blob = await zip.generateAsync({ type: "blob" });
        triggerDownload(blob, `${safeTitle}-${startNum}-${endNum}.zip`);
      }
      toast.success(`تم تنزيل الدعوات ${startNum} - ${endNum}`);
    } catch (e) {
      toast.error((e as Error).message || "تعذّر التنزيل");
    } finally {
      setBusyKey(null);
      setProgress(0);
    }
  }

  async function shareRange(startNum: number, endNum: number) {
    const key = `sh-${startNum}-${endNum}`;
    try {
      setBusyKey(key);
      setProgress(0);
      // Build a small sample first to check capability without heavy work
      const probeInv = ordered[startNum - 1];
      if (!probeInv) return;
      const probeUrl = await composeInvitationDataUrl(ev, probeInv, startNum, origin);
      const probeFile = blobToFile(dataUrlToBlob(probeUrl), `probe-${startNum}.png`);
      if (!canShareFiles([probeFile])) {
        toast.info("المشاركة غير مدعومة على هذا الجهاز — استخدم زر التنزيل");
        return;
      }
      const files = await buildFiles(startNum, endNum);
      // Try sharing all at once (iOS supports multiple images)
      if (canShareFiles(files)) {
        const ok = await shareFiles(files, `دعوات ${startNum}-${endNum}`);
        if (!ok) toast.error("تعذّرت المشاركة");
        else toast.success("تمت المشاركة");
        return;
      }
      // Fallback: share one-by-one
      for (const f of files) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await shareFiles([f], f.name);
        if (!ok) break;
      }
    } catch (e) {
      toast.error((e as Error).message || "تعذّرت المشاركة");
    } finally {
      setBusyKey(null);
      setProgress(0);
    }
  }

  const canShare = typeof navigator !== "undefined" && typeof (navigator as Navigator & { share?: unknown }).share === "function";

  return (
    <Card className="border-gold/30">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-serif text-sm font-semibold">تنزيل / مشاركة الدعوات كصور</p>
            <p className="text-xs text-muted-foreground">
              {total} دعوة — قسّمها لدفعات وشاركها مباشرة على iOS لحفظها في الصور.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="batch-size" className="text-xs">حجم الدفعة</Label>
            <Input
              id="batch-size"
              type="number"
              min={1}
              max={Math.max(total, 1)}
              value={batchSize}
              onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value || "1", 10) || 1))}
              className="h-8 w-20 text-center"
              dir="ltr"
            />
          </div>
        </div>

        {busyKey && (
          <p className="text-xs text-muted-foreground">جاري المعالجة {progress}%</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => downloadRange(1, total)}
            disabled={!!busyKey || total === 0}
          >
            <Download className="size-3.5" />
            {busyKey === `dl-1-${total}` ? `${progress}%` : `تنزيل الكل (${total})`}
          </Button>
          {canShare && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => shareRange(1, total)}
              disabled={!!busyKey || total === 0}
            >
              <Share2 className="size-3.5" />
              {busyKey === `sh-1-${total}` ? `${progress}%` : "مشاركة الكل"}
            </Button>
          )}
        </div>

        {chunks.length > 1 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-semibold">تنزيل على دفعات ({size} لكل دفعة)</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {chunks.map((c) => {
                const dlKey = `dl-${c.start}-${c.end}`;
                const shKey = `sh-${c.start}-${c.end}`;
                return (
                  <div key={dlKey} className="flex items-center gap-2 rounded-md border p-2">
                    <span className="flex-1 font-mono text-xs">#{c.start} - #{c.end}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => downloadRange(c.start, c.end)}
                      disabled={!!busyKey}
                    >
                      <Download className="size-3.5" />
                      {busyKey === dlKey ? `${progress}%` : "تنزيل"}
                    </Button>
                    {canShare && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => shareRange(c.start, c.end)}
                        disabled={!!busyKey}
                      >
                        <Share2 className="size-3.5" />
                        {busyKey === shKey ? `${progress}%` : "مشاركة"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Bulk captions editor ----------
function BulkCaptionsButton({
  eventId,
  invitations,
}: {
  eventId: string;
  invitations: Invitation[];
}) {
  const qc = useQueryClient();
  const bulk = useServerFn(bulkUpdateCaptions);
  const [open, setOpen] = useState(false);
  // Order ascending by display_number to match user's expectation
  const ordered = useMemo(
    () =>
      [...invitations].sort((a, b) => (a.display_number ?? 0) - (b.display_number ?? 0)),
    [invitations],
  );
  const initialText = useMemo(
    () =>
      ordered
        .map((i) => `#${i.display_number ?? "?"}\t${i.caption_text ?? ""}`)
        .join("\n"),
    [ordered],
  );
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);

  function openDialog() {
    setText(initialText);
    setOpen(true);
  }

  async function save() {
    const lines = text.split("\n");
    const byNumber = new Map<number, Invitation>();
    for (const inv of ordered) if (inv.display_number != null) byNumber.set(inv.display_number, inv);
    const entries: { id: string; caption_text: string | null }[] = [];
    for (const line of lines) {
      const m = line.match(/^\s*#?\s*(\d+)\s*[\t:،,-]*\s*(.*)$/);
      if (!m) continue;
      const num = Number(m[1]);
      const inv = byNumber.get(num);
      if (!inv) continue;
      const captionText = m[2].trim() || null;
      entries.push({ id: inv.id, caption_text: captionText });
    }
    if (entries.length === 0) {
      toast.error("لم يتم التعرف على أي دعوة. استخدم التنسيق: #الرقم<TAB>النص");
      return;
    }
    try {
      setSaving(true);
      await bulk({ data: { event_id: eventId, entries } });
      toast.success(`تم تحديث ${entries.length} دعوة`);
      qc.invalidateQueries({ queryKey: ["invitations", eventId] });
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={openDialog}>
        <Pencil className="size-4" /> تحرير نصوص كل الدعوات
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">تحرير نصوص كل الدعوات دفعة واحدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              كل سطر: رقم الدعوة ثم النص. مثال: <span dir="ltr" className="font-mono">#1&nbsp;&nbsp;محمد الأحمد</span>
            </p>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={16}
              className="font-mono text-sm"
              dir="rtl"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "جاري الحفظ..." : "حفظ الكل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------- Single invitation preview & edit ----------
function InvitationPreviewDialog({
  inv,
  ev,
  origin,
  number,
  open,
  onOpenChange,
  onSaveDetails,
}: {
  inv: Invitation;
  ev: EventRow;
  origin: string;
  number: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaveDetails: (v: { caption_text?: string; guest_name?: string }) => void;
}) {
  const [caption, setCaption] = useState(inv.caption_text || "");
  const [name, setName] = useState(inv.guest_name || "");
  const [dataUrl, setDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const previewInv: Invitation = { ...inv, caption_text: caption };

  async function refresh() {
    try {
      setLoading(true);
      const url = await composeInvitationDataUrl(ev, previewInv, number, origin);
      setDataUrl(url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Regenerate whenever dialog opens or caption changes
  const key = `${open}|${caption}`;
  const lastKey = useRef("");
  if (open && lastKey.current !== key) {
    lastKey.current = key;
    refresh();
  }
  if (!open && lastKey.current !== "") lastKey.current = "";

  async function download() {
    if (!dataUrl) return;
    const filename = ev.number_in_filename
      ? `invitation-${String(number).padStart(3, "0")}-${inv.code}.png`
      : `invitation-${inv.code}.png`;
    triggerDownload(dataUrlToBlob(dataUrl), filename);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-serif">معاينة دعوة #{number}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-gold/20 bg-secondary/30 p-2 min-h-[240px] flex items-center justify-center">
            {loading && !dataUrl ? (
              <p className="text-xs text-muted-foreground">جاري التوليد...</p>
            ) : dataUrl ? (
              <img src={dataUrl} alt={`دعوة ${number}`} className="max-h-[60vh] w-auto" />
            ) : (
              <p className="text-xs text-muted-foreground">لا توجد معاينة</p>
            )}
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>اسم المدعو</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-1">
              <Label>النص الظاهر على الدعوة</Label>
              <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} maxLength={200} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  onSaveDetails({
                    caption_text: caption,
                    guest_name: name,
                  });
                }}
              >
                حفظ
              </Button>
              <Button variant="outline" onClick={refresh} disabled={loading}>
                تحديث المعاينة
              </Button>
              <Button variant="secondary" onClick={download} disabled={!dataUrl}>
                <Download className="size-4" /> تنزيل
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              التصميم العام (الخط، الألوان، مواقع الباركود والنص) يُعدل من تبويب "صورة الدعوة".
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



