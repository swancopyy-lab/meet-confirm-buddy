import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, LayoutDashboard, ScanLine, LogOut, ShieldCheck, Clock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMyProfile } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const router = useRouter();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);

  const profileQ = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const profile = profileQ.data;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-gold/20 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="size-5 text-gold" />
            <span className="font-serif text-lg font-bold text-primary">دعوة</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">
                <LayoutDashboard className="size-4" />
                مناسباتي
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/scan">
                <ScanLine className="size-4" />
                مسح
              </Link>
            </Button>
            {profile?.is_super_admin && (
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin">
                  <ShieldCheck className="size-4" />
                  المشرف
                  {profile.pending_count > 0 && (
                    <span className="mr-1 inline-flex items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground min-w-[1.25rem]">
                      {profile.pending_count}
                    </span>
                  )}
                </Link>
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="size-4" />
              خروج
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {profileQ.isLoading ? (
          <p className="text-center py-12 text-muted-foreground">جاري التحميل...</p>
        ) : profile && profile.approval_status === "pending" ? (
          <ApprovalGate
            icon={<Clock className="size-10 text-gold mx-auto" />}
            title="حسابك بانتظار موافقة المشرف"
            body="سيتم تفعيل حسابك بعد مراجعته. تواصل مع المشرف العام لتسريع العملية."
            onSignOut={signOut}
          />
        ) : profile && profile.approval_status === "blocked" ? (
          <ApprovalGate
            icon={<Ban className="size-10 text-destructive mx-auto" />}
            title="تم إيقاف حسابك"
            body="تواصل مع المشرف العام لمعرفة السبب."
            onSignOut={signOut}
          />
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}

function ApprovalGate({
  icon,
  title,
  body,
  onSignOut,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onSignOut: () => void;
}) {
  return (
    <Card className="border-gold/30 max-w-lg mx-auto">
      <CardContent className="py-10 text-center space-y-4">
        {icon}
        <h2 className="font-serif text-xl font-bold text-primary">{title}</h2>
        <p className="text-sm text-muted-foreground">{body}</p>
        <Button variant="outline" onClick={onSignOut}>
          <LogOut className="size-4" /> تسجيل الخروج
        </Button>
      </CardContent>
    </Card>
  );
}
