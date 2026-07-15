"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  ChefHat,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice, getOrderStatusColor, getOrderStatusLabel } from "@/lib/utils";

const mockOrders = [
  { id: "1", orderNumber: "ORD-000047", status: "PREPARING", type: "DINE_IN", totalAmount: 285, table: { number: "T05" }, items: [{ name: "دجاج مشوي", quantity: 2 }], createdAt: "2026-07-15T10:30:00Z" },
  { id: "2", orderNumber: "ORD-000046", status: "READY", type: "DINE_IN", totalAmount: 420, table: { number: "T12" }, items: [{ name: "سلطة سيزر", quantity: 1 }, { name: "كيك", quantity: 2 }], createdAt: "2026-07-15T10:25:00Z" },
  { id: "3", orderNumber: "ORD-000045", status: "CONFIRMED", type: "TAKEAWAY", totalAmount: 150, table: null, items: [{ name: "عصير برتقال", quantity: 3 }], createdAt: "2026-07-15T10:18:00Z" },
  { id: "4", orderNumber: "ORD-000044", status: "DELIVERED", type: "DINE_IN", totalAmount: 680, table: { number: "T03" }, items: [{ name: "دجاج مشوي", quantity: 3 }, { name: "سلطة", quantity: 1 }], createdAt: "2026-07-15T09:45:00Z" },
  { id: "5", orderNumber: "ORD-000043", status: "PENDING", type: "DELIVERY", totalAmount: 95, table: null, items: [{ name: "عصير", quantity: 2 }], createdAt: "2026-07-15T09:30:00Z" },
  { id: "6", orderNumber: "ORD-000042", status: "CANCELLED", type: "TAKEAWAY", totalAmount: 200, table: null, items: [{ name: "كيك", quantity: 2 }], createdAt: "2026-07-15T09:15:00Z" },
];

const statusFilters = [
  { value: "ALL", label: "الكل" },
  { value: "PENDING", label: "معلق" },
  { value: "CONFIRMED", label: "مؤكد" },
  { value: "PREPARING", label: "جاري التحضير" },
  { value: "READY", label: "جاهز" },
  { value: "DELIVERED", label: "تم التسليم" },
  { value: "CANCELLED", label: "ملغي" },
];

export default function OrdersPage() {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filteredOrders = mockOrders.filter((order) => {
    const matchesFilter = filter === "ALL" || order.status === filter;
    const matchesSearch = order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.items.some((item) => item.name.includes(search));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">الطلبات</h1>
          <p className="text-slate-400 text-sm mt-1">إدارة ومتابعة جميع الطلبات</p>
        </div>
        <Button variant="fluxio">
          <Plus className="w-4 h-4 ml-2" />
          طلب جديد
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="بحث برقم الطلب أو المنتج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 bg-slate-900 border-slate-800"
          />
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {statusFilters.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filter === s.value
                ? "bg-fluxio-electric-blue/10 text-fluxio-electric-blue border border-fluxio-electric-blue/20"
                : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all group">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-lg font-bold text-white">{order.orderNumber}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {order.table ? `ترابيزة ${order.table.number}` : order.type === "TAKEAWAY" ? "Takeaway" : "Delivery"}
                  </p>
                </div>
                <Badge variant="outline" className={getOrderStatusColor(order.status)}>
                  {getOrderStatusLabel(order.status)}
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-xs">
                      {item.quantity}
                    </span>
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <span className="text-xl font-bold text-white">{formatPrice(order.totalAmount)}</span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {order.status === "PENDING" && (
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </Button>
                  )}
                  {order.status === "PREPARING" && (
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <ChefHat className="w-4 h-4 text-orange-400" />
                    </Button>
                  )}
                  {(order.status === "PENDING" || order.status === "CONFIRMED") && (
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                      <XCircle className="w-4 h-4 text-red-400" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
