import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listMyEvents, upsertMyEvent, deleteEvent } from "@/lib/invitations.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, CalendarDays, MapPin, Trash2, Users, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "مناسباتي" }] }),
  component: EventsList,
});

function EventsList() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const list = useServerFn(listMyEvents);
  const create = useServerFn(upsertMyEvent);
  const del = useServerFn(deleteEvent);

  const q = useQuery({ queryKey: ["my-events"], queryFn: () => list() });
  const [showNew, setShowNew] = useState(false);

  const createMut = useMutation({
    mutationFn: (v: { title: string }) => create({ data: v }),
    onSuccess: (row) => {
      toast.success("تم إنشاء المناسبة");
      qc.invalidateQueries({ queryKey: ["my-events"] });
      setShowNew(false);
      if (row?.id) nav({ to: "/events/$eventId", params: { eventId: row.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["my-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <p className="text-center py-12">جاري التحميل...</p>;

  const hosted = q.data?.hosted ?? [];
  const shared = q.data?.shared ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">مناسباتي</h1>
          <p className="text-sm text-muted-foreground">جميع الحفلات التي تديرها أو تشارك في تنظيمها</p>
        </div>
        <Button onClick={() => setShowNew((s) => !s)}>
          <Plus className="size-4" /> مناسبة جديدة
        </Button>
      </div>

      {showNew && (
        <Card className="border-gold/40">
          <CardHeader>
            <CardTitle className="font-serif text-lg">إنشاء مناسبة</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const title = (fd.get("title") as string)?.trim() || "حفل زفاف";
                createMut.mutate({ title });
              }}
            >
              <div className="space-y-2 flex-1 min-w-[240px]">
                <Label htmlFor="title">عنوان المناسبة</Label>
                <Input id="title" name="title" defaultValue="حفل زفاف" required />
              </div>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "جاري..." : "إنشاء ومتابعة الإعداد"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {hosted.length === 0 && shared.length === 0 && !showNew && (
        <Card className="border-gold/30">
          <CardContent className="py-12 text-center space-y-3">
            <Sparkles className="mx-auto size-8 text-gold" />
            <p className="text-muted-foreground">لا توجد مناسبات بعد</p>
            <Button onClick={() => setShowNew(true)}>
              <Plus className="size-4" /> ابدأ بمناسبتك الأولى
            </Button>
          </CardContent>
        </Card>
      )}

      {hosted.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-serif text-lg text-primary">مناسبات تُديرها</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {hosted.map((ev) => (
              <EventCard
                key={ev.id}
                ev={ev}
                onDelete={() => {
                  if (confirm("حذف المناسبة وكل دعواتها؟")) delMut.mutate(ev.id);
                }}
              />
            ))}
          </div>
        </section>
      )}

      {shared.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-serif text-lg text-primary">مناسبات مشاركة معك</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {shared.map((ev) => (
              <EventCard key={ev.id} ev={ev} sharedBadge />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EventCard({
  ev,
  onDelete,
  sharedBadge,
}: {
  ev: {
    id: string;
    title: string;
    groom_name: string | null;
    bride_name: string | null;
    event_date: string | null;
    venue: string | null;
  };
  onDelete?: () => void;
  sharedBadge?: boolean;
}) {
  const dateStr = ev.event_date
    ? new Date(ev.event_date).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" })
    : null;
  return (
    <Card className="border-gold/30 hover:border-gold/60 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-serif text-lg font-bold text-primary">{ev.title}</h3>
            {(ev.groom_name || ev.bride_name) && (
              <p className="text-sm text-gold">
                {ev.groom_name} {ev.groom_name && ev.bride_name && "&"} {ev.bride_name}
              </p>
            )}
          </div>
          {sharedBadge && <Badge variant="outline">مساعد</Badge>}
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          {dateStr && (
            <div className="flex items-center gap-2">
              <CalendarDays className="size-3.5" /> {dateStr}
            </div>
          )}
          {ev.venue && (
            <div className="flex items-center gap-2">
              <MapPin className="size-3.5" /> {ev.venue}
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          <Button asChild size="sm" className="flex-1">
            <Link to="/events/$eventId" params={{ eventId: ev.id }}>
              <Users className="size-4" /> فتح
            </Link>
          </Button>
          {onDelete && (
            <Button size="sm" variant="ghost" onClick={onDelete} aria-label="حذف">
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
