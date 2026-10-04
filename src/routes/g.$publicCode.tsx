import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { getEventByPublicCode, joinPublicEvent } from "@/lib/invitations.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CalendarDays, MapPin, Sparkles, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/g/$publicCode")({
  head: ({ loaderData }) => {
    const ev = loaderData as
      | { title?: string | null; groom_name?: string | null; bride_name?: string | null; cover_image_url?: string | null }
      | undefined;
    const title = ev?.groom_name && ev?.bride_name
      ? `دعوة حفل ${ev.groom_name} و ${ev.bride_name}`
      : ev?.title || "دعوة";
    const desc = "سجّل اسمك وأكّد حضورك للحفل.";
    const img = ev?.og_image_url || ev?.cover_image_url || ev?.invitation_image_url || undefined;
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
    const res = await getEventByPublicCode({ data: { code: params.publicCode } });
    if (!res) throw notFound();
    return res;
  },
  component: PublicJoinPage,
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
          <h2 className="font-serif text-xl font-bold">رابط غير صحيح</h2>
          <p className="mt-2 text-sm text-muted-foreground">تأكد من رابط الدعوة المرسل إليك.</p>
        </CardContent>
      </Card>
    </div>
  ),
});

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  try {
    return new Intl.DateTimeFormat("ar", { dateStyle: "full", timeStyle: "short" }).format(new Date(d));
  } catch {
    return d;
  }
}

function PublicJoinPage() {
  const { publicCode } = Route.useParams();
  const event = Route.useLoaderData() as {
    title?: string | null;
    groom_name?: string | null;
    bride_name?: string | null;
    event_date?: string | null;
    venue?: string | null;
    venue_map_url?: string | null;
    notes?: string | null;
    cover_image_url?: string | null;
    companions_enabled?: boolean | null;
    default_max_companions?: number | null;
    public_ask_phone?: boolean | null;
    public_phone_required?: boolean | null;
    public_ask_apology?: boolean | null;
  };
  const navigate = useNavigate();
  const joinFn = useServerFn(joinPublicEvent);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [companions, setCompanions] = useState(0);
  const [apology, setApology] = useState("");
  const [mode, setMode] = useState<"attending" | "declined" | null>(null);

  const maxCompanions = event.default_max_companions ?? 0;
  const companionsEnabled = (event.companions_enabled ?? true) && maxCompanions > 0;
  const over = companions > maxCompanions;
  const askPhone = event.public_ask_phone !== false;
  const phoneRequired = askPhone && event.public_phone_required === true;
  const askApology = event.public_ask_apology !== false;

  const mutation = useMutation({
    mutationFn: (status: "attending" | "declined") =>
      joinFn({
        data: {
          code: publicCode,
          guest_name: name.trim(),
          phone: phone.trim() || undefined,
          status,
          companions: status === "attending" ? companions : 0,
          apology_message: status === "declined" ? apology.trim() || undefined : undefined,
        },
      }),
    onSuccess: (res: { code: string }) => {
      toast.success("تم استلام ردك، شكراً لك");
      navigate({ to: "/i/$code", params: { code: res.code } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(status: "attending" | "declined") {
    if (name.trim().length < 2) {
      toast.error("اكتب اسمك أولاً");
      return;
    }
    if (phoneRequired && phone.trim().length < 8) {
      toast.error("اكتب رقم جوالك أولاً");
      return;
    }
    if (status === "attending" && over) {
      toast.error(`الحد المسموح للمرافقين هو ${maxCompanions}`);
      return;
    }
    setMode(status);
    mutation.mutate(status);
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-xl space-y-6">
        {event.cover_image_url ? (
          <Card className="overflow-hidden border-gold/40 shadow-2xl shadow-primary/10">
            <img src={event.cover_image_url} alt="دعوة" className="block w-full h-auto" />
          </Card>
        ) : (
          <Card className="overflow-hidden border-gold/40">
            <div className="bg-gradient-to-b from-secondary/60 to-transparent px-6 pt-10 pb-6 text-center">
              <Sparkles className="mx-auto mb-3 size-6 text-gold" />
              <h1 className="font-serif text-3xl font-bold text-primary">{event.title || "حفل زفاف"}</h1>
              {(event.groom_name || event.bride_name) && (
                <p className="mt-3 font-serif text-xl text-gold">
                  {event.groom_name} {event.groom_name && event.bride_name && "&"} {event.bride_name}
                </p>
              )}
            </div>
            <CardContent className="space-y-3 py-6">
              {event.event_date && (
                <div className="flex items-center gap-3 text-sm">
                  <CalendarDays className="size-5 text-gold shrink-0" />
                  <span>{formatDate(event.event_date)}</span>
                </div>
              )}
              {event.venue && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="size-5 text-gold shrink-0" />
                  <span>{event.venue}</span>
                </div>
              )}
              {event.notes && (
                <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">{event.notes}</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-gold/30">
          <CardHeader>
            <CardTitle className="font-serif text-xl">سجّل اسمك وأكّد حضورك</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="g-name">اسمك</Label>
              <Input
                id="g-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اكتب اسمك الكامل"
              />
            </div>
            {askPhone && (
              <div className="space-y-2">
                <Label htmlFor="g-phone">رقم الجوال {phoneRequired ? "" : "(اختياري)"}</Label>
                <Input
                  id="g-phone"
                  value={phone}
                  inputMode="tel"
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                />
              </div>
            )}

            {companionsEnabled && (
              <div className="space-y-2">
                <Label htmlFor="g-comp">عدد المرافقين (الحد الأقصى {maxCompanions})</Label>
                <Input
                  id="g-comp"
                  type="number"
                  min={0}
                  max={maxCompanions}
                  value={companions}
                  onChange={(e) => setCompanions(Math.max(0, Number(e.target.value) || 0))}
                />
                {over && (
                  <p className="text-sm text-destructive">
                    تجاوزت الحد المسموح، الرجاء تقليل عدد المرافقين إلى {maxCompanions}.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => submit("attending")}
                disabled={mutation.isPending}
                className="gap-2"
              >
                <CheckCircle2 className="size-4" />
                {mutation.isPending && mode === "attending" ? "جارٍ الإرسال..." : "سأحضر"}
              </Button>
              <Button
                variant="outline"
                onClick={() => submit("declined")}
                disabled={mutation.isPending}
                className="gap-2"
              >
                <XCircle className="size-4" />
                {mutation.isPending && mode === "declined" ? "جارٍ الإرسال..." : "أعتذر"}
              </Button>
            </div>

            {askApology && (
              <div className="space-y-2">
                <Label htmlFor="g-apology">رسالة اعتذار (اختياري)</Label>
                <Textarea
                  id="g-apology"
                  value={apology}
                  onChange={(e) => setApology(e.target.value)}
                  placeholder="اكتب اعتذارك هنا"
                  rows={3}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
