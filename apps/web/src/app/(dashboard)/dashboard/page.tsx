"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  ChefHat,
  Clock,
  Package,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, formatRelativeTime, getOrderStatusColor, getOrderStatusLabel } from "@/lib/utils";

interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  activeOrders: number;
  lowStockItems: number;
  recentOrders: any[];
  topProducts: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setStats({
        todaySales: 15420,
        todayOrders: 47,
        activeOrders: 12,
        lowStockItems: 3,
        recentOrders: [
          { id: "1", orderNumber: "ORD-000047", status: "PREPARING", totalAmount: 285, table: { number: "T05" }, createdAt: new Date().toISOString() },
          { id: "2", orderNumber: "ORD-000046", status: "READY", totalAmount: 420, table: { number: "T12" }, createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
          { id: "3", orderNumber: "ORD-000045", status: "CONFIRMED", totalAmount: 150, table: null, createdAt: new Date(Date.now() - 12 * 60000).toISOString() },
          { id: "4", orderNumber: "ORD-000044", status: "DELIVERED", totalAmount: 680, table: { number: "T03" }, createdAt: new Date(Date.now() - 30 * 60000).toISOString() },
          { id: "5", orderNumber: "ORD-000043", status: "PENDING", totalAmount: 95, table: null, createdAt: new Date(Date.now() - 45 * 60000).toISOString() },
        ],
        topProducts: [
          { name: "دجاج مشوي", revenue: 3200, orders: 45 },
          { name: "سلطة سيزر", revenue: 2100, orders: 38 },
          { name: "كيك الشوكولاتة", revenue: 1800, orders: 52 },
          { name: "عصير برتقال", revenue: 1200, orders: 65 },
        ],
      });
      setIsLoading(false);
    }, 1000);
  }, []);

  const statCards = [
    { title: "مبيعات اليوم", value: stats?.todaySales || 0, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { title: "طلبات اليوم", value: stats?.todayOrders || 0, icon: ShoppingCart, color: "text-blue-400", bg: "bg-blue-500/10" },
    { title: "طلبات نشطة", value: stats?.activeOrders || 0, icon: ChefHat, color: "text-orange-400", bg: "bg-orange-500/10" },
    { title: "مخزون منخفض", value: stats?.lowStockItems || 0, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
          <p className="text-slate-400 text-sm mt-1">نظرة عامة على أداء مطعمك</p>
        </div>
        <div className="text-sm text-slate-400">
          {new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{stat.title}</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-24 mt-2" />
                    ) : (
                      <p className={`text-2xl font-bold mt-2 ${stat.color}`}>
                        {stat.title.includes("مبيعات") ? formatPrice(stat.value) : stat.value}
                      </p>
                    )}
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bg}`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-fluxio-electric-blue" />
              آخر الطلبات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {stats?.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-sm font-bold text-white">
                        {order.orderNumber.split("-")[1]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{order.orderNumber}</p>
                        <p className="text-xs text-slate-400">
                          {order.table ? `ترابيزة ${order.table.number}` : "Takeaway"} • {formatRelativeTime(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={getOrderStatusColor(order.status)}>
                        {getOrderStatusLabel(order.status)}
                      </Badge>
                      <span className="text-sm font-medium text-white">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-fluxio-purple" />
              الأكثر مبيعاً
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {stats?.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fluxio-electric-blue/20 to-fluxio-purple/20 flex items-center justify-center text-sm font-bold text-fluxio-electric-blue">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{product.name}</p>
                      <p className="text-xs text-slate-400">{product.orders} طلب</p>
                    </div>
                    <span className="text-sm font-medium text-emerald-400">
                      {formatPrice(product.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
