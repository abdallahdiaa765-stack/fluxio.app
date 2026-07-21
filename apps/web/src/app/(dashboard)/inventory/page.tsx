"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, X, AlertTriangle, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface InventoryItem {
  id: string;
  name: string;
  nameAr: string | null;
  unitOfMeasure: string;
  currentStock: number;
  minStockLevel: number | null;
  reorderPoint: number | null;
}

export default function InventoryPage() {
  const { accessToken } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lowStockIds, setLowStockIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    unitOfMeasure: "kg",
    currentStock: "0",
    minStockLevel: "5",
  });

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  const load = async () => {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const [itemsRes, lowStockRes] = await Promise.all([
      fetch("/api/inventory", { headers }),
      fetch("/api/inventory/low-stock", { headers }),
    ]);
    if (itemsRes.ok) setItems(await itemsRes.json());
    if (lowStockRes.ok) {
      const low: InventoryItem[] = await lowStockRes.json();
      setLowStockIds(new Set(low.map((i) => i.id)));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (accessToken) load();
  }, [accessToken]);

  const createItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          name: form.name,
          unitOfMeasure: form.unitOfMeasure,
          currentStock: Number(form.currentStock),
          minStockLevel: Number(form.minStockLevel),
        }),
      });
      if (!res.ok) throw new Error("تعذرت الإضافة");
      toast({ title: "تم إضافة الصنف", variant: "success" });
      setForm({ name: "", unitOfMeasure: "kg", currentStock: "0", minStockLevel: "5" });
      setShowForm(false);
      load();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const recordMovement = async (item: InventoryItem, type: "IN" | "OUT") => {
    const qty = window.prompt(type === "IN" ? "الكمية المضافة؟" : "الكمية المخصومة؟");
    if (!qty || isNaN(Number(qty))) return;

    const res = await fetch("/api/inventory/movements", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        itemId: item.id,
        type: type === "IN" ? "IN" : "OUT",
        quantity: Number(qty),
      }),
    });
    if (res.ok) {
      toast({ title: "تم تسجيل الحركة", variant: "success" });
      load();
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
          <h1 className="text-2xl font-bold text-white">المخزون</h1>
          <p className="text-slate-400 text-sm mt-1">متابعة الأصناف وحركة المخزون</p>
        </div>
        <Button variant="fluxio" onClick={() => setShowForm((v) => !v)} className="gap-2">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "إلغاء" : "صنف جديد"}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="pt-6">
            <form onSubmit={createItem} className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2 sm:col-span-3">
                <Label>اسم الصنف</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label>وحدة القياس</Label>
                <Input
                  value={form.unitOfMeasure}
                  onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label>الكمية الحالية</Label>
                <Input
                  type="number"
                  value={form.currentStock}
                  onChange={(e) => setForm({ ...form, currentStock: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label>حد إعادة الطلب</Label>
                <Input
                  type="number"
                  value={form.minStockLevel}
                  onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <Button type="submit" variant="fluxio" disabled={isSubmitting} className="sm:col-span-3">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة الصنف"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {items.map((item) => {
          const isLow = lowStockIds.has(item.id);
          return (
            <Card key={item.id} className={`bg-slate-900/60 ${isLow ? "border-amber-800" : "border-slate-800"}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isLow && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  <div>
                    <p className="text-white font-medium">{item.nameAr || item.name}</p>
                    <p className="text-slate-500 text-xs">
                      {item.currentStock} {item.unitOfMeasure}
                      {isLow && <span className="text-amber-400"> — قرب النفاد</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => recordMovement(item, "IN")} className="gap-1">
                    <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400" />
                    إضافة
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => recordMovement(item, "OUT")} className="gap-1">
                    <ArrowDownCircle className="w-3.5 h-3.5 text-red-400" />
                    خصم
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {items.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-8">لا يوجد أصناف بعد</p>
        )}
      </div>
    </div>
  );
}
