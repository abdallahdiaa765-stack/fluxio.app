"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, MessageCircle, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { VODAFONE_CASH_NUMBER, buildVodafoneCashWhatsAppLink } from "@/lib/billing";

interface TenantMe {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  settings: {
    taxRate: number | null;
    taxNumber: string | null;
    currency: string | null;
    enableTips: boolean;
    enableDelivery: boolean;
    enableReservations: boolean;
  } | null;
}

interface Subscription {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  trialDaysLeft: number;
  isTrial: boolean;
  daysUntilExpiry: number | null;
  isExpiringSoon: boolean;
  planConfig: { name: string; nameAr: string; priceMonthly: number; priceYearly: number };
}

interface PlanOption {
  plan: string;
  name: string;
  nameAr: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
}

const STATUS_LABELS: Record<string, { label: string; variant: "success" | "warning" | "destructive" }> = {
  ACTIVE: { label: "نشط", variant: "success" },
  TRIAL: { label: "تجربة مجانية", variant: "warning" },
  EXPIRED: { label: "منتهي", variant: "destructive" },
  SUSPENDED: { label: "موقوف", variant: "destructive" },
  CANCELLED: { label: "ملغي", variant: "destructive" },
};

export default function SettingsPage() {
  const { accessToken, user } = useAuth();
  const { toast } = useToast();

  const [tenant, setTenant] = useState<TenantMe | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [requestingPlan, setRequestingPlan] = useState<string | null>(null);

  const [form, setForm] = useState({
    phone: "",
    address: "",
    taxRate: "14",
    taxNumber: "",
    currency: "EGP",
  });

  useEffect(() => {
    async function load() {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [tenantRes, subRes, plansRes] = await Promise.all([
        fetch("/api/tenants/me", { headers }),
        fetch("/api/subscriptions/current", { headers }),
        fetch("/api/subscriptions/plans", { headers }),
      ]);

      if (tenantRes.ok) {
        const t: TenantMe = await tenantRes.json();
        setTenant(t);
        setForm({
          phone: t.phone || "",
          address: t.address || "",
          taxRate: String(t.settings?.taxRate ?? 14),
          taxNumber: t.settings?.taxNumber || "",
          currency: t.settings?.currency || "EGP",
        });
      }
      if (subRes.ok) setSubscription(await subRes.json());
      if (plansRes.ok) setPlans(await plansRes.json());
      setIsLoading(false);
    }
    if (accessToken) load();
  }, [accessToken]);

  const saveInfo = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/tenants/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          taxRate: Number(form.taxRate),
          taxNumber: form.taxNumber,
          currency: form.currency,
        }),
      });
      if (!res.ok) throw new Error("تعذر الحفظ");
      toast({ title: "تم حفظ الإعدادات", variant: "success" });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const subscribeViaVodafoneCash = async (plan: PlanOption) => {
    setRequestingPlan(plan.plan);
    try {
      const amount = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;

      // Record the request as a pending manual-payment invoice so it can be
      // confirmed later from the super-admin panel - then hand off to
      // WhatsApp for the actual payment proof/confirmation.
      await fetch("/api/subscriptions/request-vodafone-cash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan: plan.plan, billingCycle }),
      });

      const link = buildVodafoneCashWhatsAppLink({
        restaurantName: tenant?.name || "",
        planNameAr: plan.nameAr,
        amount,
        billingCycle,
      });
      window.open(link, "_blank");
    } catch {
      toast({
        title: "تعذر إرسال الطلب",
        description: "تقدر تتواصل مباشرة على واتساب برضو",
        variant: "destructive",
      });
    } finally {
      setRequestingPlan(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  const statusInfo = subscription ? STATUS_LABELS[subscription.status] : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">الإعدادات</h1>
        <p className="text-slate-400 text-sm mt-1">بيانات المطعم والاشتراك</p>
      </div>

      {/* Restaurant info */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-base">بيانات المطعم</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>العملة</Label>
              <Input
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>نسبة الضريبة (%)</Label>
              <Input
                type="number"
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>الرقم الضريبي</Label>
              <Input
                value={form.taxNumber}
                onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>
          <Button onClick={saveInfo} disabled={isSaving} variant="fluxio" className="gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ
          </Button>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white text-base">الاشتراك</CardTitle>
          {statusInfo && <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
        </CardHeader>
        <CardContent className="space-y-5">
          {subscription && (
            <div className="space-y-1.5">
              <div className="text-sm text-slate-400">
                الباقة الحالية: <span className="text-white font-medium">{subscription.planConfig.nameAr}</span>
                {subscription.isTrial && (
                  <span className="text-amber-400"> — متبقي {subscription.trialDaysLeft} يوم على انتهاء التجربة</span>
                )}
              </div>
              {!subscription.isTrial && subscription.daysUntilExpiry !== null && (
                <div
                  className={`text-sm ${
                    subscription.isExpiringSoon ? "text-amber-400" : "text-slate-500"
                  }`}
                >
                  {subscription.daysUntilExpiry >= 0
                    ? `متبقي ${subscription.daysUntilExpiry} ${subscription.daysUntilExpiry === 1 ? "يوم" : "أيام"} على تجديد الباقة`
                    : "الباقة متأخرة عن التجديد"}
                  {subscription.isExpiringSoon && " — جدد دلوقتي عشان الخدمة متتوقفش"}
                </div>
              )}
            </div>
          )}

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
              سنوي (خصم)
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {plans.map((p) => {
              const price = billingCycle === "yearly" ? p.priceYearly : p.priceMonthly;
              const isCurrent = subscription?.plan === p.plan;
              return (
                <div
                  key={p.plan}
                  className={`rounded-xl border p-4 flex flex-col ${
                    isCurrent ? "border-fluxio-electric-blue bg-fluxio-electric-blue/5" : "border-slate-800"
                  }`}
                >
                  <p className="font-semibold text-white">{p.nameAr}</p>
                  <p className="text-lg font-bold text-white mt-1">
                    {formatPrice(price, subscription?.planConfig ? "EGP" : "EGP")}
                    <span className="text-xs text-slate-500 font-normal">
                      {" "}
                      /{billingCycle === "yearly" ? "سنة" : "شهر"}
                    </span>
                  </p>
                  <ul className="mt-3 space-y-1 flex-1">
                    {p.features.slice(0, 4).map((f) => (
                      <li key={f} className="text-xs text-slate-400 flex items-start gap-1.5">
                        <span className="text-emerald-400 mt-0.5">✓</span>
                        {f}
                      </li>
                    ))}
                    {p.features.length > 4 && (
                      <li className="text-xs text-slate-600">+{p.features.length - 4} مميزات تانية</li>
                    )}
                  </ul>
                  <Button
                    size="sm"
                    variant={isCurrent ? "outline" : "fluxio"}
                    className="mt-4 gap-2"
                    disabled={requestingPlan === p.plan}
                    onClick={() => subscribeViaVodafoneCash(p)}
                  >
                    {requestingPlan === p.plan ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageCircle className="w-4 h-4" />
                    )}
                    {isCurrent ? "تجديد عبر فودافون كاش" : "اشترك عبر فودافون كاش"}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-800">
            <CreditCard className="w-3.5 h-3.5" />
            الدفع عن طريق فودافون كاش على رقم {VODAFONE_CASH_NUMBER} — بعد التحويل هيتفتح واتساب تلقائي بتفاصيل
            الباقة عشان تأكيد الاشتراك.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
