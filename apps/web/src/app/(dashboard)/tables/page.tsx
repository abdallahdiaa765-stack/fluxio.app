"use client";

import { useState } from "react";
import { Plus, Users, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const mockTables = [
  { id: "1", number: "T01", capacity: 4, status: "available", posX: 0, posY: 0 },
  { id: "2", number: "T02", capacity: 4, status: "occupied", posX: 150, posY: 0 },
  { id: "3", number: "T03", capacity: 6, status: "available", posX: 300, posY: 0 },
  { id: "4", number: "T04", capacity: 4, status: "reserved", posX: 0, posY: 150 },
  { id: "5", number: "T05", capacity: 8, status: "occupied", posX: 150, posY: 150 },
  { id: "6", number: "T06", capacity: 4, status: "cleaning", posX: 300, posY: 150 },
  { id: "7", number: "T07", capacity: 2, status: "available", posX: 0, posY: 300 },
  { id: "8", number: "T08", capacity: 4, status: "occupied", posX: 150, posY: 300 },
  { id: "9", number: "T09", capacity: 6, status: "available", posX: 300, posY: 300 },
  { id: "10", number: "T10", capacity: 4, status: "available", posX: 450, posY: 0 },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: "فاضية", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  occupied: { label: "مشغولة", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  reserved: { label: "محجوزة", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  cleaning: { label: "تنظيف", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
};

export default function TablesPage() {
  const [filter, setFilter] = useState("ALL");

  const filteredTables = filter === "ALL" ? mockTables : mockTables.filter((t) => t.status === filter);

  const stats = {
    available: mockTables.filter((t) => t.status === "available").length,
    occupied: mockTables.filter((t) => t.status === "occupied").length,
    reserved: mockTables.filter((t) => t.status === "reserved").length,
    total: mockTables.length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">الترابيزات</h1>
          <p className="text-slate-400 text-sm mt-1">إدارة الترابيزات والحجوزات</p>
        </div>
        <Button variant="fluxio">
          <Plus className="w-4 h-4 ml-2" />
          ترابيزة جديدة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800 p-4">
          <p className="text-sm text-slate-400">الإجمالي</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/20 p-4">
          <p className="text-sm text-emerald-400">فاضية</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.available}</p>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20 p-4">
          <p className="text-sm text-red-400">مشغولة</p>
          <p className="text-2xl font-bold text-red-400">{stats.occupied}</p>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20 p-4">
          <p className="text-sm text-amber-400">محجوزة</p>
          <p className="text-2xl font-bold text-amber-400">{stats.reserved}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["ALL", "available", "occupied", "reserved", "cleaning"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === s
                ? "bg-fluxio-electric-blue/10 text-fluxio-electric-blue border border-fluxio-electric-blue/20"
                : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
            }`}
          >
            {s === "ALL" ? "الكل" : statusConfig[s]?.label}
          </button>
        ))}
      </div>

      {/* Floor Plan */}
      <div className="relative bg-slate-900/30 rounded-xl border border-slate-800 p-6 min-h-[500px]">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredTables.map((table) => {
            const config = statusConfig[table.status];
            return (
              <Card
                key={table.id}
                className={`p-4 cursor-pointer hover:scale-105 transition-all ${config.bg}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-lg font-bold ${config.color}`}>{table.number}</span>
                  <Users className={`w-4 h-4 ${config.color}`} />
                </div>
                <p className={`text-sm ${config.color}`}>{table.capacity} أشخاص</p>
                <Badge variant="outline" className={`mt-2 text-xs ${config.bg} ${config.color}`}>
                  {config.label}
                </Badge>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
