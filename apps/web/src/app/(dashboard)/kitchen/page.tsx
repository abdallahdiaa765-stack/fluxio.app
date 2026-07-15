"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";

const mockKitchenOrders = [
  { id: "1", orderNumber: "ORD-000047", status: "CONFIRMED", table: { number: "T05" }, items: [{ name: "دجاج مشوي", quantity: 2, notes: "بدون بصل" }, { name: "سلطة سيزر", quantity: 1 }], createdAt: new Date(Date.now() - 2 * 60000).toISOString() },
  { id: "2", orderNumber: "ORD-000046", status: "PREPARING", table: { number: "T12" }, items: [{ name: "برجر لحم", quantity: 1, notes: "Medium well" }, { name: "بطاطس", quantity: 1 }], createdAt: new Date(Date.now() - 8 * 60000).toISOString() },
  { id: "3", orderNumber: "ORD-000045", status: "CONFIRMED", table: null, items: [{ name: "عصير برتقال", quantity: 3 }], createdAt: new Date(Date.now() - 1 * 60000).toISOString() },
  { id: "4", orderNumber: "ORD-000044", status: "PREPARING", table: { number: "T03" }, items: [{ name: "دجاج مشوي", quantity: 1 }, { name: "رز", quantity: 2 }], createdAt: new Date(Date.now() - 15 * 60000).toISOString() },
  { id: "5", orderNumber: "ORD-000043", status: "READY", table: { number: "T08" }, items: [{ name: "كيك الشوكولاتة", quantity: 2 }], createdAt: new Date(Date.now() - 20 * 60000).toISOString() },
];

const columns = [
  { status: "CONFIRMED", title: "جديد", color: "border-blue-500/30", bg: "bg-blue-500/5" },
  { status: "PREPARING", title: "جاري التحضير", color: "border-orange-500/30", bg: "bg-orange-500/5" },
  { status: "READY", title: "جاهز", color: "border-emerald-500/30", bg: "bg-emerald-500/5" },
];

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState(mockKitchenOrders);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const moveOrder = (orderId: string, newStatus: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  };

  const getColumnOrders = (status: string) => orders.filter((o) => o.status === status);

  return (
    <div className="h-screen flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">شاشة المطبخ</h1>
          <Badge variant="info" className="text-lg px-3 py-1">
            {orders.filter((o) => o.status !== "DELIVERED").length} طلب نشط
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-2xl font-mono text-fluxio-electric-blue">
            {currentTime.toLocaleTimeString("ar-EG")}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="border-slate-700"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden">
        {columns.map((column) => (
          <div key={column.status} className="flex flex-col">
            <div className={`flex items-center justify-between p-3 rounded-t-xl border-t-2 ${column.color} bg-slate-900/50`}>
              <h2 className="font-semibold text-white">{column.title}</h2>
              <Badge variant="outline" className="bg-slate-800">
                {getColumnOrders(column.status).length}
              </Badge>
            </div>
            <div className={`flex-1 rounded-b-xl border border-slate-800 border-t-0 p-3 space-y-3 overflow-y-auto ${column.bg}`}>
              {getColumnOrders(column.status).map((order) => (
                <Card key={order.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-lg font-bold text-white">{order.orderNumber}</p>
                        <p className="text-xs text-slate-400">
                          {order.table ? `ترابيزة ${order.table.number}` : "Takeaway"} • {formatRelativeTime(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)}د
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-fluxio-electric-blue/10 flex items-center justify-center text-sm font-bold text-fluxio-electric-blue">
                            {item.quantity}
                          </span>
                          <span className="text-sm text-white">{item.name}</span>
                          {item.notes && (
                            <span className="text-xs text-amber-400">({item.notes})</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      {column.status === "CONFIRMED" && (
                        <Button
                          size="sm"
                          className="flex-1 bg-orange-500 hover:bg-orange-600"
                          onClick={() => moveOrder(order.id, "PREPARING")}
                        >
                          ابدأ التحضير
                        </Button>
                      )}
                      {column.status === "PREPARING" && (
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                          onClick={() => moveOrder(order.id, "READY")}
                        >
                          جاهز
                        </Button>
                      )}
                      {column.status === "READY" && (
                        <Button
                          size="sm"
                          className="flex-1 bg-blue-500 hover:bg-blue-600"
                          onClick={() => moveOrder(order.id, "DELIVERED")}
                        >
                          تم التسليم
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
