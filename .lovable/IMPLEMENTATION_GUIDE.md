# مرشد التطبيق: عدد مرات المسح لكل دعوة

## 🎯 الهدف
إضافة إمكانية تحديد عدد مرات المسح المسموح لكل دعوة (1-5 مرات)، مع ظهور هذا الخيار:
- عند إنشاء الدعوات
- في رابط الدعوة العام

---

## 📋 المتطلبات

### 1️⃣ قاعدة البيانات (Supabase)
**الجدول:** `invitations`

أضف العمود:
```sql
ALTER TABLE invitations ADD COLUMN max_scans INTEGER DEFAULT 1;
ALTER TABLE invitations ADD COLUMN scan_count INTEGER DEFAULT 0;
```

### 2️⃣ الدوال الخادم (src/lib/invitations.functions.ts)

#### في `createInvitations()`:
```typescript
// إضافة max_scans للمعاملات المسموحة
.inputValidator((data: unknown) =>
  z.object({
    // ... الحقول الأخرى
    max_scans: z.array(z.number().int().min(1).max(5)).optional(),
  }).parse(data)
)

// عند إنشاء الصفوف:
const rows = Array.from({ length: data.count }, (_, i) => ({
  // ... الحقول الأخرى
  max_scans: data.max_scans?.[i] ?? 1,
}));
```

#### في `updateInvitationDetails()`:
```typescript
// إضافة max_scans للمعاملات المسموحة
.inputValidator((data: unknown) =>
  z.object({
    // ... الحقول الأخرى
    max_scans: z.number().int().min(1).max(5).optional(),
  }).parse(data)
)

// تحديث الحقل
if (data.max_scans !== undefined) patch.max_scans = data.max_scans;
```

#### في `checkInByScanCode()`:
```typescript
// التحقق من عدد مرات المسح
const { max_scans = 1, scan_count = 0 } = inv as unknown as { 
  max_scans?: number; 
  scan_count?: number; 
};

// إذا تم الوصول للحد الأقصى
if (scan_count >= max_scans) {
  return { status: "already" as const, invitation: inv, ...images };
}

// تحديث عند المسح الناجح
.update({ 
  scanned_at: new Date().toISOString(), 
  scanned_by: userId, 
  scan_count: (scan_count + 1)  // ✅ إضافة هذا
})
```

#### في `scanPublicByCode()`:
```typescript
// اختيار الحقول (إضافة max_scans و scan_count)
.select("id, guest_name, companions, rsvp_status, scanned_at, event_id, max_scans, scan_count")

// التحقق من عدد مرات المسح
const maxScans = inv.max_scans ?? 1;
const scanCount = inv.scan_count ?? 0;

if (scanCount >= maxScans) {
  return { status: "already" as const, ... };
}

// تحديث عند المسح الناجح
.update({ scanned_at: now, scan_count: (scanCount + 1) })
```

#### في `getInvitationPublic()`:
```typescript
// اختيار الحقول (إضافة max_scans و scan_count)
.select("..., max_scans, scan_count")
```

---

### 3️⃣ واجهة الإنشاء (src/routes/_authenticated/events.$eventId.tsx)

#### في `BulkCreateForm`:
```tsx
// إضافة حقل عدد مرات المسح
const [maxScans, setMaxScans] = useState("1");

return (
  <form onSubmit={(e) => {
    e.preventDefault();
    const ms = list ? undefined : parseInt(maxScans, 10) || 1;
    onCreate({
      count: n,
      // ...
      max_scans: ms ? Array(n).fill(ms) : undefined, // ✅ إضافة هذا
    });
  }}>
    {/* ... الحقول الأخرى */}
    <div className="space-y-2">
      <Label htmlFor="maxScans">عدد مرات المسح المسموح</Label>
      <Input 
        id="maxScans" 
        type="number" 
        min="1" 
        max="5" 
        value={maxScans} 
        onChange={(e) => setMaxScans(e.target.value)} 
      />
      <p className="text-xs text-muted-foreground">
        1 = مسح واحد فقط، 2+ = السماح بمسح متكرر
      </p>
    </div>
  </form>
);
```

#### في `InvitationCard`:
```tsx
// إضافة محرر max_scans لكل دعوة
const [maxScans, setMaxScans] = useState(inv.max_scans ?? 1);

return (
  <Card>
    {/* ... */}
    <div className="space-y-1">
      <Label htmlFor={`max-scans-${inv.id}`} className="text-xs">
        عدد مرات المسح المسموح
      </Label>
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
    {/* ... */}
  </Card>
);
```

---

### 4️⃣ واجهة الدعوة العام (src/routes/i.$code.tsx)

#### عند عرض الرابط العام:
```tsx
// يمكن إضافة معلومة إذا كانت الدعوة تقبل مسح متكرر
const maxScans = inv.max_scans ?? 1;
const scanCount = inv.scan_count ?? 0;

// اختياري: عرض معلومة للمسح المتكرر
{maxScans > 1 && (
  <p className="text-xs text-muted-foreground">
    ✓ يمكن المسح حتى {maxScans} مرات ({scanCount} مرات مسح)
  </p>
)}
```

---

## 🔄 سير العمل الكامل

```
1️⃣ المضيف ينشئ دعوات
   ↓
2️⃣ يختار "عدد مرات المسح المسموح" (1-5)
   ↓
3️⃣ تُحفظ الدعوات مع max_scans في قاعدة البيانات
   ↓
4️⃣ المدعو يفتح رابط الدعوة: /i/{code}
   ↓
5️⃣ عند المسح (الكاميرا أو QR):
   ├─ يتحقق من: scan_count < max_scans
   ├─ إذا ✓ → يحدّث scan_count += 1
   └─ إذا ✗ → يرسل "تم المسح مسبقاً"
```

---

## 📱 واجهة المستخدم

### عند الإنشاء:
```
┌─────────────────────────────┐
│ توليد دعوات جديدة          │
├─────────────────────────────┤
│ عدد الدعوات: [1]            │
│ عدد مرات المسح المسموح: [1] │
│ قائمة (اسم, جوال):         │
│ [...]                       │
│ ✓ توليد الدعوات            │
└─────────────────────────────┘
```

### لكل دعوة:
```
┌──────────────────────────────┐
│ دعوة #1        CODE: ABC123  │
├──────────────────────────────┤
│ اسم المدعو: [محمد]           │
│ الجوال: [96650...]           │
│ عدد مرات المسح: [1] ▼         │
├──────────────────────────────┤
│ 👁 معاينة | 🗑 حذف           │
└──────────────────────────────┘
```

---

## ✅ قائمة التحقق

- [ ] إضافة الأعمدة في قاعدة البيانات
- [ ] تحديث `createInvitations()` 
- [ ] تحديث `updateInvitationDetails()`
- [ ] تحديث `checkInByScanCode()`
- [ ] تحديث `scanPublicByCode()`
- [ ] تحديث `getInvitationPublic()`
- [ ] إضافة حقل max_scans في BulkCreateForm
- [ ] إضافة محرر max_scans في InvitationCard
- [ ] اختبار المسح المتكرر
- [ ] اختبار الوصول للحد الأقصى

---

## 🧪 اختبار

### حالة 1: مسح واحد فقط (الافتراضي)
```
1. إنشاء دعوة بـ max_scans = 1
2. مسح الدعوة → ✓ "تم تأكيد الحضور"
3. مسح الدعوة مرة أخرى → ✗ "تم المسح مسبقاً"
```

### حالة 2: مسح متكرر
```
1. إنشاء دعوة بـ max_scans = 3
2. مسح الدعوة → ✓ "تم تأكيد الحضور" (1/3)
3. مسح الدعوة مرة أخرى → ✓ "تم تأكيد الحضور" (2/3)
4. مسح الدعوة مرة ثالثة → ✓ "تم تأكيد الحضور" (3/3)
5. مسح الدعوة رابعة → ✗ "تم المسح مسبقاً"
```

---

## 📝 ملاحظات

- القيمة الافتراضية `max_scans = 1` لضمان التوافقية مع الدعوات القديمة
- يتم تخزين `scan_count` لتتبع عدد مرات المسح
- يمكن تعديل `max_scans` لكل دعوة من واجهة الإدارة
