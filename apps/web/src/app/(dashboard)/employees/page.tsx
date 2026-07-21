"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, X, KeyRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getRoleLabel } from "@/lib/utils";

interface Employee {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
}

const STAFF_ROLES = ["MANAGER", "CASHIER", "CHEF", "WAITER"];

export default function EmployeesPage() {
  const { accessToken } = useAuth();
  const { toast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "WAITER",
  });

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  const loadEmployees = async () => {
    const res = await fetch("/api/users", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.ok) setEmployees(await res.json());
    setIsLoading(false);
  };

  useEffect(() => {
    if (accessToken) loadEmployees();
  }, [accessToken]);

  const createEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "تعذرت الإضافة");
      }
      toast({ title: "تم إضافة الموظف", variant: "success" });
      setForm({ email: "", firstName: "", lastName: "", phone: "", role: "WAITER" });
      setShowForm(false);
      loadEmployees();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (emp: Employee) => {
    const res = await fetch(`/api/users/${emp.id}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ isActive: !emp.isActive }),
    });
    if (res.ok) {
      setEmployees((prev) => prev.map((e) => (e.id === emp.id ? { ...e, isActive: !e.isActive } : e)));
    }
  };

  const resetPassword = async (emp: Employee) => {
    const res = await fetch(`/api/users/${emp.id}/reset-password`, {
      method: "POST",
      headers: authHeaders,
    });
    if (res.ok) {
      toast({ title: `تم إرسال كلمة مرور جديدة لـ ${emp.email}`, variant: "success" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">الموظفين</h1>
          <p className="text-slate-400 text-sm mt-1">إدارة فريق العمل وصلاحياتهم</p>
        </div>
        <Button variant="fluxio" onClick={() => setShowForm((v) => !v)} className="gap-2">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "إلغاء" : "موظف جديد"}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="pt-6">
            <form onSubmit={createEmployee} className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الاسم الأول</Label>
                <Input
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label>الاسم الأخير</Label>
                <Input
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>الوظيفة</Label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {getRoleLabel(r)}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" variant="fluxio" disabled={isSubmitting} className="sm:col-span-2">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة الموظف"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {employees.map((emp) => (
          <Card key={emp.id} className="bg-slate-900/60 border-slate-800">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">
                  {emp.firstName} {emp.lastName}
                </p>
                <p className="text-slate-500 text-xs">{emp.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="info">{getRoleLabel(emp.role)}</Badge>
                <Badge variant={emp.isActive ? "success" : "destructive"}>
                  {emp.isActive ? "نشط" : "موقوف"}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => resetPassword(emp)} title="إعادة تعيين كلمة المرور">
                  <KeyRound className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive(emp)}>
                  {emp.isActive ? "إيقاف" : "تفعيل"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {employees.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-8">لا يوجد موظفين بعد</p>
        )}
      </div>
    </div>
  );
}
