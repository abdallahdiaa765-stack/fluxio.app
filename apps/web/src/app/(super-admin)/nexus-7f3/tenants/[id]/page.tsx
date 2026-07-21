"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  email: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  isActive: boolean;
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
}

interface PlanOption {
  plan: string;
  nameAr: string;
  priceMonthly: number;
  priceYearly: number;
}

const STATUS_LABELS: Record<string, string> = {
  TRIAL: "تجربة مجانية",
  ACTIVE: "نشط",
  PAST_DUE: "متأخر بالدفع",
  EXPIRED: "منتهي",
  SUSPENDED: "موقوف",
  CANCELLED: "ملغي",
};

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-slate-800 border-slate-700 font-mono"
        />
      </div>
    </div>
  );
}

export default function TenantBrandingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const { toast } = useToast();

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [customDuration, setCustomDuration] = useState<string>("");
  const [isActivating, setIsActivating] = useState(false);
  const [form, setForm] = useState({
    brandName: "",
    logoUrl: "",
    primaryColor: "#00d4ff",
    secondaryColor: "#7b2ff7",
    accentColor: "#00f5d4",
  });

  useEffect(() => {
    async function load() {
      const [tenantRes, plansRes] = await Promise.all([
        fetch(`/api/super-admin/tenants/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`/api/subscriptions/plans`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);
      if (tenantRes.ok) {
        const data: TenantDetail = await tenantRes.json();
        setTenant(data);
        setSelectedPlan(data.subscription?.plan || "STARTER");
        setForm({
          brandName: data.name,
          logoUrl: data.logoUrl || "",
          primaryColor: data.primaryColor || "#00d4ff",
          secondaryColor: data.secondaryColor || "#7b2ff7",
          accentColor: data.accentColor || "#00f5d4",
        });
      }
      if (plansRes.ok) {
        setPlans(await plansRes.json());
      }
      setIsLoading(false);
    }
    if (accessToken) load();
  }, [id, accessToken]);

  const saveBranding = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/super-admin/tenants/${id}/branding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("تعذر الحفظ");
      toast({ title: "تم حفظ الهوية البصرية", variant: "success" });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!tenant) return;
    const res = await fetch(`/api/super-admin/tenants/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ isActive: !tenant.isActive }),
    });
    if (res.ok) {
      setTenant({ ...tenant, isActive: !tenant.isActive });
      toast({ title: !tenant.isActive ? "تم تفعيل المطعم" : "تم إيقاف المطعم", variant: "success" });
    }
  };

  const activateSubscription = async () => {
    if (!tenant || !selectedPlan) return;
    setIsActivating(true);
    try {
      const res = await fetch(`/api/super-admin/tenants/${id}/subscription`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          plan: selectedPlan,
          billingCycle,
          ...(customDuration ? { durationDays: Number(customDuration) } : {}),
        }),
      });
      if (!res.ok) throw new Error("تعذر تفعيل الباقة");
      const sub = await res.json();
      setTenant({
        ...tenant,
        isActive: true,
        subscription: { plan: sub.plan, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd },
      });
      toast({ title: "تم تفعيل الباقة للمطعم", variant: "success" });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setIsActivating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    return <div className="p-8 text-slate-400">المطعم غير موجود</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <button
        onClick={() => router.push("/nexus-7f3")}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm"
      >
        <ArrowRight className="w-4 h-4" />
        رجوع لكل المطاعم
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">{tenant.name}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleStatus}
          className={tenant.isActive ? "text-red-400 border-red-900" : "text-emerald-400 border-emerald-900"}
        >
          {tenant.isActive ? "إيقاف المطعم" : "تفعيل المطعم"}
        </Button>
      </div>

      <Card className="bg-slate-900/60 border-slate-800 mb-6">
        <CardHeader>
          <CardTitle className="text-white text-base">الاشتراك والباقة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="text-sm text-slate-400">
            الحالة الحالية:{" "}
            <span className="text-white font-medium">
              {tenant.subscription ? STATUS_LABELS[tenant.subscription.status] || tenant.subscription.status : "لا يوجد اشتراك"}
            </span>
            {tenant.subscription?.currentPeriodEnd && (
              <span>
                {" "}
                — لغاية {new Date(tenant.subscription.currentPeriodEnd).toLocaleDateString("ar-EG")}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                billingCycle === "monthly"
                  ? "bg-fluxio-electric-blue/10 border-fluxio-electric-blue text-fluxio-electric-blue"
                  : "border-slate-700 text-slate-400"
              }`}
            >
              شهري
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                billingCycle === "yearly"
                  ? "bg-fluxio-electric-blue/10 border-fluxio-electric-blue text-fluxio-electric-blue"
                  : "border-slate-700 text-slate-400"
              }`}
            >
              سنوي
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plans.map((p) => (
              <button
                key={p.plan}
                onClick={() => setSelectedPlan(p.plan)}
                className={`rounded-xl border p-3 text-right transition-colors ${
                  selectedPlan === p.plan
                    ? "border-fluxio-electric-blue bg-fluxio-electric-blue/5"
                    : "border-slate-700"
                }`}
              >
                <p className="text-white font-medium text-sm">{p.nameAr}</p>
                <p className="text-slate-400 text-xs mt-1">
                  {billingCycle === "yearly" ? p.priceYearly : p.priceMonthly} ج.م
                </p>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>مدة مخصصة بالأيام (اختياري)</Label>
            <Input
              type="number"
              min={1}
              placeholder={billingCycle === "yearly" ? "365 (افتراضي)" : "30 (افتراضي)"}
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              className="bg-slate-800 border-slate-700"
            />
          </div>

          <Button
            onClick={activateSubscription}
            disabled={isActivating || !selectedPlan}
            variant="fluxio"
            className="w-full gap-2"
          >
            {isActivating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            تفعيل الباقة لهذا المطعم
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-base">الهوية البصرية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>اسم المطعم الظاهر للعميل</Label>
            <Input
              value={form.brandName}
              onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              className="bg-slate-800 border-slate-700"
            />
          </div>

          <div className="space-y-2">
            <Label>رابط اللوجو</Label>
            <Input
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              placeholder="https://..."
              className="bg-slate-800 border-slate-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ColorField
              label="اللون الأساسي"
              value={form.primaryColor}
              onChange={(v) => setForm({ ...form, primaryColor: v })}
            />
            <ColorField
              label="اللون الثانوي"
              value={form.secondaryColor}
              onChange={(v) => setForm({ ...form, secondaryColor: v })}
            />
            <ColorField
              label="لون التمييز"
              value={form.accentColor}
              onChange={(v) => setForm({ ...form, accentColor: v })}
            />
          </div>

          {/* Live preview of how the customer-facing menu header will look */}
          <div
            className="rounded-xl p-5 text-white"
            style={{
              background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})`,
            }}
          >
            <p className="text-sm opacity-80">معاينة صفحة المنيو</p>
            <p className="text-lg font-bold">{form.brandName || tenant.name}</p>
          </div>

          <Button onClick={saveBranding} disabled={isSaving} className="w-full gap-2" variant="fluxio">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ الهوية البصرية
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
