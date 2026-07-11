import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode, ScanLine, UserCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "منصة دعوات الزفاف — تأكيد الحضور بالباركود" },
      {
        name: "description",
        content:
          "أنشئ دعوات زفافك بباركود فريد لكل مدعو، أكّد الحضور والمرافقين، وامسح الباركود عند الباب.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gold/20 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-gold" />
            <span className="font-serif text-lg font-bold text-primary">دعوة</span>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              to="/auth"
              className="rounded-md px-4 py-2 text-primary hover:bg-secondary transition-colors"
            >
              تسجيل الدخول
            </Link>
            <Link
              to="/auth"
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              ابدأ الآن
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-20 text-center">
          <div className="gold-divider mx-auto mb-6 max-w-xs text-xs uppercase tracking-widest">
            منصة عربية للأعراس
          </div>
          <h1 className="font-serif text-5xl font-bold leading-tight text-primary md:text-6xl">
            دعواتك بباركود
            <br />
            <span className="text-gold">وحضور بلا فوضى</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            ولّد دعوات بعدد المدعوين، كل دعوة لها رمز QR فريد. المدعو يؤكد حضوره وعدد المرافقين،
            وعند الباب تمسح الرمز مرة واحدة فقط.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              className="rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-105"
            >
              أنشئ دعواتك
            </Link>
          </div>
        </section>

        <section className="grid gap-6 pb-20 md:grid-cols-3">
          {[
            {
              icon: QrCode,
              title: "ولّد الباركودات",
              text: "حدد عدد الدعوات واحصل على رمز QR فريد لكل واحدة، جاهز للطباعة أو الإرسال.",
            },
            {
              icon: UserCheck,
              title: "تأكيد المدعو",
              text: "يؤكد المدعو حضوره ويختار عدد مرافقيه، أو يعتذر برسالة قصيرة.",
            },
            {
              icon: ScanLine,
              title: "مسح واحد عند الباب",
              text: "امسح الرمز عند الدخول؛ لو حاول أحد مسحه مرة ثانية يظهر «تم المسح مسبقاً».",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-gold/20 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-gold/10"
            >
              <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-secondary text-primary group-hover:bg-gold group-hover:text-primary-foreground transition-colors">
                <f.icon className="size-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-primary">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-gold/20 py-6 text-center text-xs text-muted-foreground">
        صُنع بحب لأعراسكم
      </footer>
    </div>
  );
}
