import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listAllUsers, setUserApproval, setUserQuota, deleteUser } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldCheck, Check, Ban, Clock, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "لوحة المشرف العام" }] }),
  component: AdminPage,
});

type Row = Awaited<ReturnType<typeof listAllUsers>>[number];

function AdminPage() {
  const qc = useQueryClient();
  const list = useServerFn(listAllUsers);
  const approve = useServerFn(setUserApproval);
  const quota = useServerFn(setUserQuota);
  const del = useServerFn(deleteUser);

  const q = useQuery({ queryKey: ["admin-users"], queryFn: () => list() });

  const approveMut = useMutation({
    mutationFn: (v: { user_id: string; status: "pending" | "approved" | "blocked" }) => approve({ data: v }),
    onSuccess: () => {
      toast.success("تم التحديث");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const quotaMut = useMutation({
    mutationFn: (v: { user_id: string; quota: number }) => quota({ data: v }),
    onSuccess: () => {
      toast.success("تم تعديل الحد");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (user_id: string) => del({ data: { user_id } }),
    onSuccess: () => {
      toast.success("تم حذف الحساب");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "blocked">("all");

  if (q.isLoading) return <p className="text-center py-12">جاري التحميل...</p>;
  if (q.error) return <p className="text-center py-12 text-destructive">{(q.error as Error).message}</p>;

  const rows = (q.data ?? []).filter((r) => filter === "all" || r.approval_status === filter);
  const counts = {
    pending: (q.data ?? []).filter((r) => r.approval_status === "pending").length,
    approved: (q.data ?? []).filter((r) => r.approval_status === "approved").length,
    blocked: (q.data ?? []).filter((r) => r.approval_status === "blocked").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-6 text-gold" />
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">لوحة المشرف العام</h1>
          <p className="text-sm text-muted-foreground">
            الموافقة على المستخدمين وتحديد الحد الأقصى لكل حساب
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterBtn label={`الكل (${q.data?.length ?? 0})`} active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterBtn label={`بانتظار (${counts.pending})`} active={filter === "pending"} onClick={() => setFilter("pending")} />
        <FilterBtn label={`موافَق (${counts.approved})`} active={filter === "approved"} onClick={() => setFilter("approved")} />
        <FilterBtn label={`محظور (${counts.blocked})`} active={filter === "blocked"} onClick={() => setFilter("blocked")} />
      </div>

      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="font-serif">المستخدمون ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold/20 text-right">
                <th className="p-2">الاسم / البريد</th>
                <th className="p-2">الحالة</th>
                <th className="p-2">الدعوات المستخدمة / المسموح</th>
                <th className="p-2">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">لا يوجد</td></tr>
              )}
              {rows.map((r) => (
                <UserRow
                  key={r.id}
                  row={r}
                  onApprove={(status) => approveMut.mutate({ user_id: r.id, status })}
                  onQuota={(v) => quotaMut.mutate({ user_id: r.id, quota: v })}
                  onDelete={() => {
                    if (confirm(`حذف حساب ${r.email} نهائياً؟`)) delMut.mutate(r.id);
                  }}
                />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function FilterBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Button size="sm" variant={active ? "default" : "outline"} onClick={onClick}>
      {label}
    </Button>
  );
}

function UserRow({
  row,
  onApprove,
  onQuota,
  onDelete,
}: {
  row: Row;
  onApprove: (status: "pending" | "approved" | "blocked") => void;
  onQuota: (v: number) => void;
  onDelete: () => void;
}) {
  const [quotaVal, setQuotaVal] = useState<number>(row.invitation_quota);
  return (
    <tr className="border-b border-gold/10 align-top">
      <td className="p-2">
        <div className="font-medium text-primary">{row.display_name || "—"}</div>
        <div className="text-xs text-muted-foreground" dir="ltr">{row.email}</div>
        <div className="mt-1 flex gap-1 flex-wrap">
          {row.is_super_admin && <Badge className="bg-gold text-primary-foreground text-[10px]">مشرف عام</Badge>}
          {row.is_assistant_account && <Badge variant="outline" className="text-[10px]">مساعد</Badge>}
        </div>
      </td>
      <td className="p-2">
        {row.approval_status === "approved" ? (
          <Badge className="bg-primary text-primary-foreground"><Check className="size-3" /> موافَق</Badge>
        ) : row.approval_status === "blocked" ? (
          <Badge variant="destructive"><Ban className="size-3" /> محظور</Badge>
        ) : (
          <Badge variant="outline"><Clock className="size-3" /> بانتظار</Badge>
        )}
      </td>
      <td className="p-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{row.invitations_used}</span>
          <span className="text-muted-foreground">/</span>
          <Input
            type="number"
            min={0}
            value={quotaVal}
            onChange={(e) => setQuotaVal(Number(e.target.value))}
            className="h-8 w-24 font-mono"
            disabled={row.is_super_admin}
          />
          {quotaVal !== row.invitation_quota && !row.is_super_admin && (
            <Button size="sm" onClick={() => onQuota(quotaVal)}>حفظ</Button>
          )}
        </div>
      </td>
      <td className="p-2">
        <div className="flex gap-1 flex-wrap">
          {row.approval_status !== "approved" && (
            <Button size="sm" variant="outline" onClick={() => onApprove("approved")} disabled={row.is_super_admin}>
              <Check className="size-3.5" /> موافقة
            </Button>
          )}
          {row.approval_status !== "blocked" && !row.is_super_admin && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onApprove("blocked")}>
              <Ban className="size-3.5" /> حظر
            </Button>
          )}
          {row.approval_status === "blocked" && (
            <Button size="sm" variant="ghost" onClick={() => onApprove("pending")}>
              إلغاء الحظر
            </Button>
          )}
          {!row.is_super_admin && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete} aria-label="حذف">
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
