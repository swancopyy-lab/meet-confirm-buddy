import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getInvitationPublic, submitRsvp } from "@/lib/invitations.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QRCard } from "@/components/QRCard";
import { toast } from "sonner";
import { CalendarDays, MapPin, CheckCircle2, XCircle, Sparkles, ShieldCheck, Download, Share2 } from "lucide-react";
import QRCode from "qrcode";

export const Route = createFileRoute("/i/$code")({
  head: ({ loaderData }) => {
    const ev = (loaderData as { event?: { groom_name?: string | null; bride_name?: string | null; title?: string | null; invitation_image_url?: string | null } } | undefined)?.event;
    const title = ev?.groom_name && ev?.bride_name
      ? `دعوة حفل ${ev.groom_name} و ${ev.bride_name}`
      : ev?.title || `دعوة`;
    const desc = "أكّد حضورك للحفل أو اعتذر بلمسة واحدة.";
    const img = ev?.invitation_image_url || undefined;
    const meta: Array<{ title?: string; name?: string; property?: string; content?: string }> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: img ? "summary_large_image" : "summary" },
    ];
    if (img) {
      meta.push({ property: "og:image", content: img });
      meta.push({ name: "twitter:image", content: img });
    }
    return { meta };
  },
  loader: async ({ params }) => {
    const res = await getInvitationPublic({ data: { code: params.code } });
    if (!res) throw notFound();
    return res;
  },
  component: InvitePage,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <p className="text-destructive">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <Card className="max-w-sm border-gold/30">
        <CardContent className="pt-6">
          <XCircle className="mx-auto mb-3 size-12 text-destructive" />
          <h2 className="font-serif text-xl font-bold">دعوة غير موجودة</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            تأكد من الرابط أو رمز الدعوة المرسل إليك.
          </p>
        </CardContent>
      </Card>
    </div>
  ),
});

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  try {
    return new Intl.DateTimeFormat("ar", { dateStyle: "full", timeStyle: "short" }).format(
      new Date(d),
    );
  } catch {
    return d;
  }
}

function InvitePage() {
  const { code } = Route.useParams();
  const initial = Route.useLoaderData();
  const qc = useQueryClient();
  const getFn = useServerFn(getInvitationPublic);
  const submitFn = useServerFn(submitRsvp);

  const { data } = useQuery({
    queryKey: ["invite", code],
    queryFn: () => getFn({ data: { code } }),
    initialData: initial,
  });

  const inv = data!.invitation;
  const event = data!.event;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const scanUrl = `${origin}/s/${inv.scan_code}`;

  const [mode, setMode] = useState<"attending" | "declined" | null>(
    inv.rsvp_status === "pending" ? null : inv.rsvp_status,
  );
  const [companions, setCompanions] = useState(inv.companions || 0);
  const [name, setName] = useState(inv.guest_name || "");
  const [apology, setApology] = useState(inv.apology_message || "");

  const mutation = useMutation({
    mutationFn: (payload: {
      status: "attending" | "declined";
      companions?: number;
      apology_message?: string;
    }) =>
      submitFn({
        data: {
          code,
          status: payload.status,
          guest_name: name.trim() || undefined,
          companions: payload.companions,
          apology_message: payload.apology_message,
        },
      }),
    onSuccess: () => {
      toast.success("تم استلام ردك، شكراً لك");
      qc.invalidateQueries({ queryKey: ["invite", code] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alreadyResponded = inv.rsvp_status !== "pending";
  const checkedIn = !!inv.scanned_at;
  const qrSize = Number(event?.qr_size ?? 22);
  const qrX = Number(event?.qr_x ?? 50);
  const qrY = Number(event?.qr_y ?? 80);
  const ev2 = event as (typeof event & {
    venue_map_url?: string | null;
    companions_enabled?: boolean;
    caption_show_number?: boolean;
    caption_text_color?: string | null;
    caption_number_color?: string | null;
    caption_font_family?: string | null;
    caption_x?: number | null;
    caption_y?: number | null;
    caption_show_box?: boolean;
    caption_font_size?: number | null;
    caption_font_weight?: number | null;
    caption_align?: "left" | "center" | "right" | null;
    number_on_image?: boolean;
  }) | undefined;
  const inv2 = inv as typeof inv & { caption_text?: string | null; display_number?: number | null };
  const venueMap = ev2?.venue_map_url;
  const companionsEnabled = ev2?.companions_enabled ?? true;
  const showNumber = ev2?.caption_show_number ?? false;
  const captionText = inv2.caption_text || "";
  const displayNumber = inv2.display_number ?? null;
  const captionFont = ev2?.caption_font_family || undefined;
  const numberColor = ev2?.caption_number_color || undefined;
  const textColor = ev2?.caption_text_color || undefined;
  const capX = Number(ev2?.caption_x ?? 50);
  const capY = Number(ev2?.caption_y ?? 92);
  const capShowBox = ev2?.caption_show_box !== false;
  const capFontSize = Number(ev2?.caption_font_size ?? 28);
  const capFontWeight = Number(ev2?.caption_font_weight ?? 600);
  const capAlign = (ev2?.caption_align || "center") as "left" | "center" | "right";
  const capTransform =
    capAlign === "left" ? "translate(0, -50%)" : capAlign === "right" ? "translate(-100%, -50%)" : "translate(-50%, -50%)";

  async function downloadShare(share: boolean) {
    try {
      const canvas = document.createElement("canvas");
      const size = 900;
      canvas.width = size;
      canvas.height = size + 220;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const qrCanvas = document.createElement("canvas");
      await QRCode.toCanvas(qrCanvas, scanUrl, { width: size, margin: 1, color: { dark: "#0F3D2E", light: "#FFFFFF" } });
      ctx.drawImage(qrCanvas, 0, 0, size, size);
      ctx.textAlign = "center";
      let y = size + 30;
      if (showNumber && displayNumber) {
        ctx.fillStyle = numberColor || "#111";
        ctx.font = `bold 72px ${captionFont || "sans-serif"}`;
        ctx.fillText(String(displayNumber), size / 2, y + 60);
        y += 90;
      }
      if (captionText) {
        ctx.fillStyle = textColor || "#111";
        ctx.font = `600 48px ${captionFont || "sans-serif"}`;
        ctx.fillText(captionText, size / 2, y + 40);
      }
      const dataUrl = canvas.toDataURL("image/png");
      const bin = atob(dataUrl.split(",")[1]);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: "image/png" });
      const filename = `invitation-${inv.code}.png`;
      const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean };
      if (share && nav.share && nav.canShare) {
        const file = new File([blob], filename, { type: "image/png" });
        if (nav.canShare({ files: [file] })) {
          try { await nav.share({ files: [file], title: "دعوتي" }); return; } catch { /* fallback */ }
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast.error((e as Error).message || "تعذّرت العملية");
    }
  }

  const invitationBlock = event?.invitation_image_url ? (
    <Card className="overflow-hidden border-gold/40 shadow-2xl shadow-primary/10">
      <div className="relative w-full">
        <img
          src={event.invitation_image_url}
          alt="دعوة"
          className="block w-full h-auto"
        />
        <div
          className="absolute overflow-hidden"
          style={{
            left: `${qrX}%`,
            top: `${qrY}%`,
            width: `${qrSize}%`,
            aspectRatio: "1 / 1",
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="bg-white p-1.5 rounded shadow-md w-full h-full overflow-hidden">
            <QRCard url={scanUrl} size={512} />
          </div>
        </div>
      </div>
      <CardContent className="text-center py-3 space-y-2">
        {showNumber && displayNumber && (
          <p className="font-bold text-lg" style={{ color: numberColor, fontFamily: captionFont }}>{displayNumber}</p>
        )}
        {captionText && (
          <p className="text-sm" style={{ color: textColor, fontFamily: captionFont }}>{captionText}</p>
        )}
        {inv.guest_name && (
          <p className="text-sm text-muted-foreground">
            المدعو:{" "}
            <span className="font-semibold text-foreground">{inv.guest_name}</span>
          </p>
        )}
        {venueMap && (
          <a href={venueMap} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4">
            <MapPin className="size-4" /> فتح موقع القاعة على الخريطة
          </a>
        )}
      </CardContent>
    </Card>
  ) : (
    <Card className="overflow-hidden border-gold/40 shadow-2xl shadow-primary/10">
      <div className="bg-gradient-to-b from-secondary/60 to-transparent px-6 pt-10 pb-6 text-center">
        <Sparkles className="mx-auto mb-3 size-6 text-gold" />
        <div className="gold-divider mx-auto mb-3 max-w-[14rem] text-[10px] uppercase tracking-[0.3em]">
          دعوة خاصة
        </div>
        <h1 className="font-serif text-3xl font-bold text-primary">
          {event?.title || "حفل زفاف"}
        </h1>
        {(event?.groom_name || event?.bride_name) && (
          <p className="mt-3 font-serif text-xl text-gold">
            {event?.groom_name} {event?.groom_name && event?.bride_name && "&"}{" "}
            {event?.bride_name}
          </p>
        )}
        {inv.guest_name && (
          <p className="mt-4 text-sm text-muted-foreground">
            المدعو الكريم:{" "}
            <span className="font-semibold text-foreground">{inv.guest_name}</span>
          </p>
        )}
      </div>
      <CardContent className="space-y-3 py-6">
        {event?.event_date && (
          <div className="flex items-center gap-3 text-sm">
            <CalendarDays className="size-5 text-gold shrink-0" />
            <span>{formatDate(event.event_date)}</span>
          </div>
        )}
        {event?.venue && (
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="size-5 text-gold shrink-0" />
            <span>{event.venue}</span>
          </div>
        )}
        {venueMap && (
          <a
            href={venueMap}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4"
          >
            <MapPin className="size-4" /> فتح موقع القاعة على الخريطة
          </a>
        )}
        {event?.notes && (
          <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            {event.notes}
          </p>
        )}
        <div className="flex justify-center pt-3">
          <div className="bg-white p-2 rounded shadow size-48">
            <QRCard url={scanUrl} size={512} />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          رمز الدعوة: <span className="font-mono tracking-widest">{inv.code}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-xl space-y-6">
        {/* RSVP first so guests always see it before scrolling */}
        <Card className="border-gold/30">
          <CardHeader>
            <CardTitle className="font-serif text-xl">
              {checkedIn
                ? "تم تسجيل دخولك ✓"
                : alreadyResponded
                  ? "تم استلام ردك سابقاً"
                  : "أكّد حضورك"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {checkedIn && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                تم تأكيد حضورك عند الباب. نتمنى لك وقتاً سعيداً.
              </div>
            )}

            {!checkedIn && (
              <>
                {!inv.guest_name && (
                  <div className="space-y-2">
                    <Label htmlFor="g-name">اسمك</Label>
                    <Input
                      id="g-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={120}
                      placeholder="أدخل اسمك الكريم"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={mode === "attending" ? "default" : "outline"}
                    className="h-auto flex-col gap-1 py-4"
                    onClick={() => setMode("attending")}
                  >
                    <CheckCircle2 className="size-5" />
                    سأحضر
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "declined" ? "destructive" : "outline"}
                    className="h-auto flex-col gap-1 py-4"
                    onClick={() => setMode("declined")}
                  >
                    <XCircle className="size-5" />
                    أعتذر
                  </Button>
                </div>

                {mode === "attending" && companionsEnabled && (
                  <div className="space-y-2 rounded-md border border-gold/30 bg-secondary/30 p-4">
                    <Label htmlFor="comp">عدد المرافقين (بدونك)</Label>
                    <Input
                      id="comp"
                      type="number"
                      min={0}
                      max={20}
                      value={companions}
                      onChange={(e) => setCompanions(Math.max(0, Number(e.target.value) || 0))}
                    />
                    <p className="text-xs text-muted-foreground">
                      إجمالي الحضور: {companions + 1}
                    </p>
                  </div>
                )}

                {mode === "declined" && (
                  <div className="space-y-2 rounded-md border border-border bg-muted/40 p-4">
                    <Label htmlFor="apo">رسالة اعتذار (اختياري)</Label>
                    <Textarea
                      id="apo"
                      value={apology}
                      onChange={(e) => setApology(e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="نتمنى لكم التوفيق..."
                    />
                  </div>
                )}

                {mode && (
                  <Button
                    className="w-full"
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        status: mode,
                        companions: mode === "attending" ? companions : undefined,
                        apology_message: mode === "declined" ? apology : undefined,
                      })
                    }
                  >
                    {mutation.isPending ? "جاري الإرسال..." : "إرسال الرد"}
                  </Button>
                )}

                {alreadyResponded && (
                  <p className="text-center text-xs text-muted-foreground">
                    ردك الحالي:{" "}
                    {inv.rsvp_status === "attending"
                      ? companionsEnabled
                        ? `حضور (${inv.companions + 1} أشخاص)`
                        : "حضور"
                      : "اعتذار"}
                  </p>
                )}
              </>
            )}

            {(inv.rsvp_status === "attending" || checkedIn) && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => downloadShare(false)}>
                  <Download className="size-4" /> تنزيل الصورة
                </Button>
                <Button type="button" variant="outline" onClick={() => downloadShare(true)}>
                  <Share2 className="size-4" /> مشاركة للمعرض
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invitation card shown after the RSVP so guests always see the buttons first */}
        {invitationBlock}
      </div>
    </div>
  );
}
