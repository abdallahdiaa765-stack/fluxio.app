"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, DollarSign, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice, getRoleLabel } from "@/lib/utils";

interface SalesReport {
  summary: { totalSales: number; totalOrders: number; avgOrderValue: number };
  topProducts: { id: string; name: string; quantity: number; revenue: number }[];
}

interface RevenueReport {
  revenue: number;
  refunds: number;
  netRevenue: number;
  grossProfit: number;
  grossMargin: number;
}

interface EmployeePerf {
  id: string;
  name: string;
  role: string;
  orders: number;
  revenue: number;
}

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

export default function ReportsPage() {
  const { accessToken } = useAuth();
  const [from, setFrom] = useState(todayISO(-30));
  const [to, setTo] = useState(todayISO());
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [employees, setEmployees] = useState<EmployeePerf[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [locked, setLocked] = useState<{ plan: string } | null>(null);

  const load = async () => {
    setIsLoading(true);
    const headers = { Authorization: `Bearer ${accessToken}` };
    const qs = `from=${from}&to=${to}`;
    const [salesRes, revenueRes, empRes] = await Promise.all([
      fetch(`/api/reports/sales?${qs}`, { headers }),
      fetch(`/api/reports/revenue?${qs}`, { headers }),
      fetch(`/api/reports/employees?${qs}`, { headers }),
    ]);
    if (salesRes.ok) setSales(await salesRes.json());

    if (revenueRes.status === 403) {
      const data = await revenueRes.json();
      if (data.code === "FEATURE_LOCKED") setLocked({ plan: data.requiredPlan });
    } else if (revenueRes.ok) {
      setRevenue(await revenueRes.json());
    }
    if (empRes.status === 403) {
      const data = await empRes.json();
      if (data.code === "FEATURE_LOCKED") setLocked({ plan: data.requiredPlan });
    } else if (empRes.ok) {
      setEmployees(await empRes.json());
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (accessToken) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">التقارير</h1>
        <p className="text-slate-400 text-sm mt-1">المبيعات والإيرادات وأداء الموظفين</p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>من</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-slate-800 border-slate-700"
          />
        </div>
        <div className="space-y-2">
          <Label>إلى</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-slate-800 border-slate-700"
          />
        </div>
        <button
          onClick={load}
          className="h-10 px-4 rounded-lg bg-fluxio-electric-blue/10 text-fluxio-electric-blue text-sm border border-fluxio-electric-blue/30 hover:bg-fluxio-electric-blue/20 transition-colors"
        >
          تحديث
        </button>
      </div>

      {locked && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-fluxio-electric-blue/5 border border-fluxio-electric-blue/20">
          <p className="text-sm text-slate-300">
            الإيرادات التفصيلية وأداء الموظفين متاحين من باقة{" "}
            <span className="text-fluxio-electric-blue font-medium">{locked.plan}</span> فما فوق
          </p>
          <a href="/settings" className="text-sm text-fluxio-electric-blue font-medium shrink-0">
            ترقية الباقة →
          </a>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-fluxio-electric-blue" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{sales?.summary.totalOrders ?? 0}</p>
                  <p className="text-slate-500 text-xs">عدد الطلبات</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">
                    {formatPrice(revenue?.netRevenue ?? sales?.summary.totalSales ?? 0)}
                  </p>
                  <p className="text-slate-500 text-xs">صافي الإيرادات</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">
                    {formatPrice(sales?.summary.avgOrderValue ?? 0)}
                  </p>
                  <p className="text-slate-500 text-xs">متوسط قيمة الطلب</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">أكثر المنتجات مبيعًا</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sales?.topProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                  <p className="text-white text-sm">{p.name}</p>
                  <div className="text-left">
                    <p className="text-white text-sm">{p.quantity} قطعة</p>
                    <p className="text-slate-500 text-xs">{formatPrice(p.revenue)}</p>
                  </div>
                </div>
              ))}
              {(!sales || sales.topProducts.length === 0) && (
                <p className="text-slate-500 text-sm text-center py-6">لا يوجد بيانات في الفترة دي</p>
              )}
            </CardContent>
          </Card>

          {!locked && (
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-base">أداء الموظفين</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">{emp.name}</p>
                      <p className="text-slate-500 text-xs">{getRoleLabel(emp.role)}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm">{emp.orders} طلب</p>
                      <p className="text-slate-500 text-xs">{formatPrice(emp.revenue)}</p>
                    </div>
                  </div>
                ))}
                {employees.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-6">لا يوجد بيانات في الفترة دي</p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
