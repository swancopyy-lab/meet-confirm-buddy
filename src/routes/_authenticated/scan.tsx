import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { checkInByScanCode } from "@/lib/invitations.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertCircle, Camera, CameraOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({ meta: [{ title: "مسح الباركود" }] }),
  component: ScanPage,
});

type ResultState =
  | { status: "ok"; name: string | null; companions: number; image: string | null }
  | { status: "already"; name: string | null; scannedAt: string; image: string | null }
  | { status: "not_today"; name: string | null; scanDate: string }
  | { status: "declined"; name: string | null }
  | { status: "not_found" }
  | { status: "error"; message: string };

function extractScanCode(raw: string): string {
  const trimmed = raw.trim();
  // QR encodes /s/<scanCode>; pull the last path segment.
  try {
    const u = new URL(trimmed);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || trimmed;
  } catch {
    return trimmed;
  }
}

function ScanPage() {
  const checkIn = useServerFn(checkInByScanCode);
  const [result, setResult] = useState<ResultState | null>(null);
  const [busy, setBusy] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  async function submitCode(rawCode: string) {
    const code = extractScanCode(rawCode);
    if (!code || code.length < 4) return;
    const now = Date.now();
    if (lastScanRef.current?.code === code && now - lastScanRef.current.at < 3000) return;
    lastScanRef.current = { code, at: now };

    setBusy(true);
    try {
      const r = await checkIn({ data: { scan_code: code } });
      if (r.status === "ok") {
        setResult({
          status: "ok",
          name: r.invitation.guest_name,
          companions: r.invitation.companions,
          image: r.success_image_url ?? null,
        });
      } else if (r.status === "already") {
        setResult({
          status: "already",
          name: r.invitation.guest_name,
          scannedAt: r.invitation.scanned_at!,
          image: r.already_image_url ?? null,
        });
      } else if (r.status === "not_today") {
        setResult({
          status: "not_today",
          name: r.invitation.guest_name,
          scanDate: r.scan_date,
        });
      } else if (r.status === "declined") {
        setResult({ status: "declined", name: r.invitation.guest_name });
      } else {
        setResult({ status: "not_found" });
      }
    } catch (e) {
      setResult({ status: "error", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function startCamera() {
    setCamOn(true);
    const { Html5Qrcode } = await import("html5-qrcode");
    if (!containerRef.current) return;
    const id = "qr-reader";
    containerRef.current.innerHTML = `<div id="${id}" class="w-full"></div>`;
    const scanner = new Html5Qrcode(id);
    scannerRef.current = scanner as unknown as typeof scannerRef.current;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => submitCode(decodedText),
        () => {},
      );
    } catch (e) {
      setResult({ status: "error", message: "تعذر تشغيل الكاميرا. تحقق من الأذونات." });
      setCamOn(false);
    }
  }

  async function stopCamera() {
    try {
      const s = scannerRef.current as unknown as {
        stop: () => Promise<void>;
        clear: () => void;
      } | null;
      if (s) {
        await s.stop();
        s.clear();
      }
    } catch {}
    scannerRef.current = null;
    if (containerRef.current) containerRef.current.innerHTML = "";
    setCamOn(false);
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="font-serif">مسح باركود الحضور</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            ref={containerRef}
            className="overflow-hidden rounded-md bg-black/5"
            style={{ minHeight: camOn ? 240 : 0 }}
          />
          <div className="flex gap-2">
            {!camOn ? (
              <Button onClick={startCamera} className="flex-1">
                <Camera className="size-4" />
                تشغيل الكاميرا
              </Button>
            ) : (
              <Button variant="outline" onClick={stopCamera} className="flex-1">
                <CameraOff className="size-4" />
                إيقاف الكاميرا
              </Button>
            )}
          </div>

          <div className="gold-divider text-xs uppercase tracking-widest">أو</div>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const v = (fd.get("code") as string).trim();
              if (v) submitCode(v);
              (e.currentTarget as HTMLFormElement).reset();
            }}
          >
            <Input
              name="code"
              placeholder="أدخل الرمز يدوياً"
              className="font-mono uppercase tracking-widest"
              autoComplete="off"
            />
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "تحقق"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && <ResultPanel result={result} onClose={() => setResult(null)} />}
    </div>
  );
}

function ResultPanel({ result, onClose }: { result: ResultState; onClose: () => void }) {
  const map = {
    ok: {
      icon: CheckCircle2,
      title: "أهلاً بك، تم تأكيد الحضور",
      tone: "bg-primary/10 border-primary/40 text-primary",
    },
    already: {
      icon: AlertCircle,
      title: "تم المسح مسبقاً",
      tone: "bg-destructive/10 border-destructive/40 text-destructive",
    },
    declined: {
      icon: XCircle,
      title: "هذا المدعو كان قد اعتذر عن الحضور",
      tone: "bg-muted border-border text-foreground",
    },
    not_today: {
      icon: AlertCircle,
      title: "لا يمكن المسح خارج يوم الفعالية",
      tone: "bg-destructive/10 border-destructive/40 text-destructive",
    },
    not_found: {
      icon: XCircle,
      title: "دعوة غير معروفة",
      tone: "bg-destructive/10 border-destructive/40 text-destructive",
    },
    error: {
      icon: XCircle,
      title: "حدث خطأ",
      tone: "bg-destructive/10 border-destructive/40 text-destructive",
    },
  } as const;
  const m = map[result.status];
  const Icon = m.icon;
  const img =
    (result.status === "ok" || result.status === "already") ? result.image : null;

  return (
    <Card className={`border-2 ${m.tone}`}>
      <CardContent className="space-y-3 p-6 text-center">
        {img ? (
          <img src={img} alt="" className="mx-auto max-h-64 rounded-md" />
        ) : (
          <Icon className="mx-auto size-14" />
        )}
        <h3 className="font-serif text-xl font-bold">{m.title}</h3>
        {result.status === "ok" && (
          <>
            {result.name && <p className="font-medium">{result.name}</p>}
            <p className="text-sm">
              عدد الحضور: <span className="font-bold">{result.companions + 1}</span>
            </p>
          </>
        )}
        {result.status === "already" && (
          <>
            {result.name && <p className="font-medium">{result.name}</p>}
            <p className="text-sm">
              وقت الدخول السابق:{" "}
              {new Date(result.scannedAt).toLocaleString("ar", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          </>
        )}
        {result.status === "not_today" && (
          <p className="text-sm">
            يوم الفعالية: {new Date(result.scanDate).toLocaleDateString("ar", { dateStyle: "full" })}
          </p>
        )}
        {result.status === "declined" && result.name && <p>{result.name}</p>}
        {result.status === "error" && <p className="text-sm">{result.message}</p>}
        <Button variant="outline" onClick={onClose}>
          المسح التالي
        </Button>
      </CardContent>
    </Card>
  );
}
