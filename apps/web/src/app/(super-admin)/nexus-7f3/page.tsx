"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, LogOut, Loader2, Users, ClipboardList, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface Overview {
  tenantCount: number;
  activeTenantCount: number;
  inactiveTenantCount: number;
  userCount: number;
  ordersToday: number;
  ordersTotal: number;
}

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  email: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  isActive: boolean;
  plan: string | null;
  usersCount: number;
  ordersCount: number;
  productsCount: number;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { accessToken, logout } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        const [overviewRes, tenantsRes] = await Promise.all([
          fetch("/api/super-admin/overview", { headers }),
          fetch("/api/super-admin/tenants", { headers }),
        ]);

        if (!overviewRes.ok || !tenantsRes.ok) {
          throw new Error("تعذر تحميل البيانات");
        }

        setOverview(await overviewRes.json());
        setTenants(await tenantsRes.json());
      } catch (e: any) {
        setError(e.message || "حدث خطأ");
      } finally {
        setIsLoading(false);
      }
    }

    if (accessToken) load();
  }, [accessToken]);

  const handleLogout = () => {
    logout();
    router.replace("/nexus-7f3/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">لوحة تحكم النظام</h1>
          <p className="text-slate-500 text-sm">إدارة كل المطاعم المشتركة في Fluxio</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="w-4 h-4" />
          خروج
        </Button>
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Building2} label="المطاعم" value={overview.tenantCount} />
          <StatCard icon={Building2} label="مطاعم نشطة" value={overview.activeTenantCount} accent="text-emerald-400" />
          <StatCard icon={Users} label="المستخدمين" value={overview.userCount} />
          <StatCard icon={ClipboardList} label="طلبات اليوم" value={overview.ordersToday} />
        </div>
      )}

      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">المطاعم</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tenants.map((t) => (
            <Link
              key={t.id}
              href={`/nexus-7f3/tenants/${t.id}`}
              className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${t.primaryColor || "#00d4ff"}, ${
                      t.secondaryColor || "#7b2ff7"
                    })`,
                  }}
                >
                  {t.name.slice(0, 2)}
                </div>
                <div>
                  <p className="text-white font-medium">{t.name}</p>
                  <p className="text-slate-500 text-xs">
                    /{t.slug} · {t.usersCount} مستخدم · {t.ordersCount} طلب
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={t.isActive ? "success" : "destructive"}>
                  {t.isActive ? "نشط" : "موقوف"}
                </Badge>
                <Palette className="w-4 h-4 text-slate-500" />
              </div>
            </Link>
          ))}
          {tenants.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-6">لا يوجد مطاعم بعد</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <Card className="bg-slate-900/60 border-slate-800">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
          <Icon className={`w-5 h-5 ${accent || "text-slate-400"}`} />
        </div>
        <div>
          <p className={`text-xl font-bold ${accent || "text-white"}`}>{value}</p>
          <p className="text-slate-500 text-xs">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
