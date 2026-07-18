import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import {
  getEvent,
  upsertMyEvent,
  listInvitationsForEvent,
  createInvitations,
  updateInvitationDetails,
  deleteInvitation,
  uploadEventImage,
  clearEventImage,
  bulkUpdateCaptions,
  uploadInvitationImage,
  clearInvitationImage,
  listCollaborators,
  addCollaborator,
  removeCollaborator,
  updateCollaboratorPermissions,
  createCollaboratorAccount,
} from "@/lib/invitations.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { QRCard } from "@/components/QRCard";
import QRCode from "qrcode";
import { Sparkles, Plus, Trash2, Eye, Download, Share2, Edit2, X, Save, AlertCircle, Users, BookUser, Copy, Mail } from "lucide-react";
import { validateInvitationScan, formatScanCount } from "@/lib/invitation-utils";

type EventRow = Awaited<ReturnType<ReturnType<typeof getEvent>>>['data'];
type Invitation = Awaited<ReturnType<ReturnType<typeof listInvitationsForEvent>>>>[0];
type DesignPatch = Parameters<typeof upsertMyEvent>[0];

export const Route = createFileRoute("/_authenticated/events/$eventId")({
  head: () => ({ meta: [{ title: "إدارة المناسبة" }] }),
  component: EventEditor,
});

function EventEditor() {
  const navigate = useNavigate();
  const { eventId } = useParams({ from: "/_authenticated/events/$eventId" });
  const qc = useQueryClient();
  const getFn = useServerFn(getEvent);
  const invitationsFn = useServerFn(listInvitationsForEvent);
  const saveEv = useServerFn(upsertMyEvent);
  const createInv = useServerFn(createInvitations);
  const delInv = useServerFn(deleteInvitation);
  const updateInvDet = useServerFn(updateInvitationDetails);
  const uploadEvImg = useServerFn(uploadEventImage);
  const clearEvImg = useServerFn(clearEventImage);
  const updateCap = useServerFn(bulkUpdateCaptions);
  const listCollab = useServerFn(listCollaborators);
  const addCollab = useServerFn(addCollaborator);
  const removeCollab = useServerFn(removeCollaborator);

  const eventQ = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => getFn({ data: { id: eventId } }),
    enabled: !!eventId,
  });

  const invitationsQ = useQuery({
    queryKey: ["invitations", eventId],
    queryFn: () => invitationsFn({ data: { event_id: eventId } }),
    enabled: !!eventId,
  });

  const collabQ = useQuery({
    queryKey: ["collaborators", eventId],
    queryFn: () => listCollab({ data: { event_id: eventId } }),
    enabled: !!eventId,
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
    mutationFn: (v: { count: number; names?: string[]; phones?: string[]; max_scans?: number[] }) =>
      createInv({ data: { ...v, event_id: eventId } }),
    onSuccess: (rows) => {
      toast.success(`تم توليد ${rows.length} دعوة`);
      qc.invalidateQueries({ queryKey: ["invitations", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delInv({ data: { id } }),
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["invitations", eventId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ev = eventQ.data?.event;
  const isHost = eventQ.data?.role === "host";
  const invitations = invitationsQ.data ?? [];
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (eventQ.isLoading) {
    return <div className="p-4 text-center text-muted-foreground">جاري التحميل...</div>;
  }

  if (!ev) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>المناسبة غير موجودة</p>
        <Button onClick={() => navigate({ to: "/dashboard" })} className="mt-4">
          العودة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-primary">{ev.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {invitations.length} دعوة، {invitations.filter((i) => i.rsvp_status === "attending").length} تأكيد
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
          ← العودة
        </Button>
      </div>

      <Tabs defaultValue="event" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="event">المناسبة</TabsTrigger>
          <TabsTrigger value="invitations">الدعوات ({invitations.length})</TabsTrigger>
          <TabsTrigger value="collaborators">المتعاونون</TabsTrigger>
        </TabsList>

        <TabsContent value="event" className="space-y-4">
          <EventBasicsCard ev={ev} onSave={(patch) => saveMut.mutate({ ...patch, id: ev.id, title: ev.title })} saving={saveMut.isPending} />
        </TabsContent>

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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
              {invitations.map((inv, idx) => (
                <InvitationCard
                  key={inv.id}
                  inv={inv}
                  ev={ev}
                  origin={origin}
                  number={inv.display_number ?? idx + 1}
                  canDelete={isHost}
                  onDelete={() => delMut.mutate(inv.id)}
                  onSaveDetails={(patch) => updateInvDet.mutate({ id: inv.id, ...patch })}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="collaborators" className="space-y-4">
          {isHost && (
            <Card className="border-gold/30">
              <CardHeader>
                <CardTitle className="font-serif text-lg">إدارة المتعاونين</CardTitle>
              </CardHeader>
              <CardContent>
                <CollaboratorsManagement eventId={eventId} />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EventBasicsCard({ ev, onSave, saving }: { ev: EventRow; onSave: (patch: DesignPatch) => void; saving: boolean }) {
  const [title, setTitle] = useState(ev.title);
  const [groomName, setGroomName] = useState(ev.groom_name || "");
  const [brideName, setBrideName] = useState(ev.bride_name || "");
  const [eventDate, setEventDate] = useState(ev.event_date || "");
  const [venue, setVenue] = useState(ev.venue || "");
  const [companionsEnabled, setCompanionsEnabled] = useState(ev.companions_enabled ?? false);

  return (
    <Card className="border-gold/30">
      <CardHeader>
        <CardTitle className="font-serif text-lg">بيانات المناسبة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">عنوان المناسبة</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title !== ev.title && onSave({ title })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">تاريخ المناسبة</Label>
            <Input id="date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} onBlur={() => onSave({ event_date: eventDate })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="groom">اسم العريس</Label>
            <Input id="groom" value={groomName} onChange={(e) => setGroomName(e.target.value)} onBlur={() => onSave({ groom_name: groomName })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bride">اسم العروس</Label>
            <Input id="bride" value={brideName} onChange={(e) => setBrideName(e.target.value)} onBlur={() => onSave({ bride_name: brideName })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="venue">المكان</Label>
            <Input id="venue" value={venue} onChange={(e) => setVenue(e.target.value)} onBlur={() => onSave({ venue })} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="comp-enabled"
            checked={companionsEnabled}
            onChange={(e) => {
              setCompanionsEnabled(e.target.checked);
              onSave({ companions_enabled: e.target.checked });
            }}
          />
          <Label htmlFor="comp-enabled" className="cursor-pointer">
            السماح بتأكيد المرافقين
          </Label>
        </div>
        {saving && <p className="text-xs text-muted-foreground">جاري الحفظ...</p>}
      </CardContent>
    </Card>
  );
}

function BulkCreateForm({
  onCreate,
  loading,
  canPrint,
}: {
  onCreate: (v: { count: number; names?: string[]; phones?: string[]; max_scans?: number[] }) => void;
  loading?: boolean;
  canPrint: boolean;
}) {
  const [count, setCount] = useState("1");
  const [list, setList] = useState("");
  const [maxScans, setMaxScans] = useState("1");

  const lines = list.trim().split("\n").filter(Boolean);
  const names = lines.map((l) => l.split(",")[0]?.trim() || "");
  const phones = lines.map((l) => l.split(",")[1]?.trim() || "");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const n = parseInt(count, 10) || 1;
        const ms = list ? undefined : parseInt(maxScans, 10) || 1;
        onCreate({
          count: n,
          names: list ? names : undefined,
          phones: list ? phones : undefined,
          max_scans: ms ? Array(n).fill(ms) : undefined,
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="count">عدد الدعوات</Label>
        <Input id="count" type="number" min="1" max="500" value={count} onChange={(e) => setCount(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxScans">عدد مرات المسح المسموح</Label>
        <Input id="maxScans" type="number" min="1" max="5" value={maxScans} onChange={(e) => setMaxScans(e.target.value)} />
        <p className="text-xs text-muted-foreground">1 = مسح واحد فقط، 2+ = السماح بمسح متكرر</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="list">قائمة (اسم, رقم الجوال) لكل مدعو سطر</Label>
        <Textarea
          id="list"
          value={list}
          onChange={(e) => setList(e.target.value)}
          rows={6}
          placeholder={"محمد الأحمد, 966501234567\nفاطمة العلي, 966551234567"}
          dir="ltr"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">{lines.length > 0 ? `سيتم إنشاء ${lines.length} دعوة` : "اتركه فارغاً لإنشاء دعوات بدون بيانات"}</p>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "جاري التوليد..." : "توليد الدعوات"}
      </Button>
    </form>
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
  onSaveDetails: (v: { guest_name?: string; phone?: string; caption_text?: string; max_scans?: number }) => void;
}) {
  const [name, setName] = useState(inv.guest_name || "");
  const [phone, setPhone] = useState(inv.phone || "");
  const [maxScans, setMaxScans] = useState(inv.max_scans ?? 1);
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <Card className="border-gold/20 print:border-black print:page-break-inside-avoid">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-base">دعوة #{number}</CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {inv.code}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 print:hidden">
        <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== (inv.guest_name || "") && onSaveDetails({ guest_name: name })} placeholder="اسم المدعو (اختياري)" maxLength={120} />
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => phone !== (inv.phone || "") && onSaveDetails({ phone })} placeholder="رقم الجوال (مثال 9665xxxxxxxx)" maxLength={30} dir="ltr" className="font-mono" />
        <div className="space-y-1">
          <Label htmlFor={`max-scans-${inv.id}`} className="text-xs">عدد مرات المسح المسموح</Label>
          <Input
            id={`max-scans-${inv.id}`}
            type="number"
            min="1"
            max="5"
            value={maxScans}
            onChange={(e) => setMaxScans(Number(e.target.value))}
            onBlur={() => onSaveDetails({ max_scans: maxScans })}
          />
        </div>
        <div className="flex gap-2">
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex-1">
                <Eye className="size-4" /> معاينة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>معاينة الدعوة #{number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <QRCard code={inv.code} origin={origin} />
              </div>
            </DialogContent>
          </Dialog>
          {canDelete && (
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CollaboratorsManagement({ eventId }: { eventId: string }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <p>إدارة المتعاونين - قريباً</p>
    </div>
  );
}

// Stats card and other components...
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
  const tones = {
    default: "bg-secondary text-foreground",
    primary: "bg-primary text-primary-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    gold: "bg-gold/10 text-gold",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`size-8 rounded ${tones[tone]} p-1`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
