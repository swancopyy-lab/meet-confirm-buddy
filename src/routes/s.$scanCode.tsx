import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { scanPublicByCode } from "@/lib/invitations.functions";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, XCircle, Loader2, CalendarX } from "lucide-react";

export const Route = createFileRoute("/s/$scanCode")({
  ssr: false,
  head: () => ({ meta: [{ title: "تحقق الحضور" }] }),
  component: ScanLanding,
});

type R =
  | {
      status: "ok";
      guest_name: string | null;
      companions: number;
      scanned_at: string;
      success_image_url: string | null;
      already_image_url: string | null;
    }
  | {
      status: "already";
      guest_name: string | null;
      companions: number;
      scanned_at: string;
      success_image_url: string | null;
      already_image_url: string | null;
    }
  | {
      status: "not_today";
      guest_name: string | null;
      scan_date: string;
      success_image_url: string | null;
      already_image_url: string | null;
    }
  | { status: "not_found" }
  | { status: "error"; message: string };

function ScanLanding() {
  const { scanCode } = Route.useParams();
  const [r, setR] = useState<R | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    scanPublicByCode({ data: { scan_code: scanCode } })
      .then((res) => setR(res as R))
      .catch((e: Error) => setR({ status: "error", message: e.message }));
  }, [scanCode]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md overflow-hidden border-gold/40">
        <CardContent className="space-y-3 p-0 text-center">
          {!r && (
            <div className="p-8">
              <Loader2 className="mx-auto size-12 animate-spin text-gold" />
              <p className="mt-3 text-muted-foreground">جاري التحقق...</p>
            </div>
          )}

          {r?.status === "ok" && (
            <>
              {r.success_image_url ? (
                <img src={r.success_image_url} alt="" className="w-full h-auto" />
              ) : (
                <div className="pt-8">
                  <CheckCircle2 className="mx-auto size-16 text-primary" />
                </div>
              )}
              <div className="space-y-2 p-6">
                <h1 className="font-serif text-2xl font-bold text-primary">تم تسجيل الدخول</h1>
                {r.guest_name && <p className="font-medium">{r.guest_name}</p>}
                <p className="text-sm">
                  عدد الحضور: <span className="font-bold">{r.companions + 1}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.scanned_at).toLocaleString("ar")}
                </p>
              </div>
            </>
          )}

          {r?.status === "already" && (
            <>
              {r.already_image_url ? (
                <img src={r.already_image_url} alt="" className="w-full h-auto" />
              ) : (
                <div className="pt-8">
                  <AlertCircle className="mx-auto size-16 text-destructive" />
                </div>
              )}
              <div className="space-y-2 p-6">
                <h1 className="font-serif text-2xl font-bold text-destructive">
                  تم المسح مسبقاً
                </h1>
                {r.guest_name && <p className="font-medium">{r.guest_name}</p>}
                <p className="text-sm text-muted-foreground">
                  وقت الدخول السابق: {new Date(r.scanned_at).toLocaleString("ar")}
                </p>
              </div>
            </>
          )}

          {r?.status === "not_today" && (
            <div className="space-y-2 p-8">
              <CalendarX className="mx-auto size-16 text-destructive" />
              <h1 className="font-serif text-2xl font-bold">هذا الباركود لا يعمل اليوم</h1>
              <p className="text-sm text-muted-foreground">
                يوم الفعالية: {new Date(r.scan_date).toLocaleDateString("ar", { dateStyle: "full" })}
              </p>
              {r.guest_name && <p className="font-medium">{r.guest_name}</p>}
            </div>
          )}

          {r?.status === "not_found" && (
            <div className="space-y-2 p-8">
              <XCircle className="mx-auto size-16 text-destructive" />
              <h1 className="font-serif text-2xl font-bold">باركود غير معروف</h1>
            </div>
          )}

          {r?.status === "error" && (
            <div className="space-y-2 p-8">
              <XCircle className="mx-auto size-16 text-destructive" />
              <p className="text-destructive">{r.message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
