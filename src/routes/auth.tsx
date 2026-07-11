import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — منصة دعوات الزفاف" },
      { name: "description", content: "سجل دخول أو أنشئ حساب مضيف لإدارة دعوات زفافك." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function signIn(email: string, password: string) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("فشل تسجيل الدخول", { description: error.message });
      return;
    }
    toast.success("مرحباً بك");
    navigate({ to: "/dashboard" });
  }

  async function signUp(email: string, password: string, name: string) {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: name },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("فشل إنشاء الحساب", { description: error.message });
      return;
    }
    toast.success("تم إنشاء الحساب", { description: "يمكنك تسجيل الدخول الآن" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <Sparkles className="size-5 text-gold" />
          <span className="font-serif text-xl font-bold text-primary">دعوة</span>
        </Link>

        <Card className="border-gold/30 shadow-xl shadow-primary/5">
          <CardHeader className="text-center">
            <CardTitle className="font-serif text-2xl">لوحة المضيف</CardTitle>
            <CardDescription>سجل دخول لإدارة دعواتك أو أنشئ حساباً جديداً</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">دخول</TabsTrigger>
                <TabsTrigger value="signup">حساب جديد</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form
                  className="space-y-4 pt-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    signIn(fd.get("email") as string, fd.get("password") as string);
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="si-email">البريد الإلكتروني</Label>
                    <Input id="si-email" name="email" type="email" required dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-pw">كلمة المرور</Label>
                    <Input id="si-pw" name="password" type="password" required minLength={6} dir="ltr" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "جاري الدخول..." : "تسجيل الدخول"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form
                  className="space-y-4 pt-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    signUp(
                      fd.get("email") as string,
                      fd.get("password") as string,
                      fd.get("name") as string,
                    );
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="su-name">الاسم</Label>
                    <Input id="su-name" name="name" required maxLength={80} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">البريد الإلكتروني</Label>
                    <Input id="su-email" name="email" type="email" required dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pw">كلمة المرور</Label>
                    <Input id="su-pw" name="password" type="password" required minLength={6} dir="ltr" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "جاري الإنشاء..." : "إنشاء الحساب"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
