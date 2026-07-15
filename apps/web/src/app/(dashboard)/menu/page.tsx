"use client";

import { useState } from "react";
import { Plus, Search, Edit2, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

const categories = [
  { id: "1", name: "مقبلات", nameAr: "مقبلات", count: 8 },
  { id: "2", name: "أطباق رئيسية", nameAr: "أطباق رئيسية", count: 12 },
  { id: "3", name: "حلويات", nameAr: "حلويات", count: 6 },
  { id: "4", name: "مشروبات", nameAr: "مشروبات", count: 10 },
];

const products = [
  { id: "1", name: "دجاج مشوي", nameAr: "دجاج مشوي", basePrice: 185, categoryId: "2", isAvailable: true, variants: [{ name: "Large", priceAdjustment: 30 }, { name: "Medium", priceAdjustment: 0 }], extras: [{ name: "Extra Cheese", price: 15 }] },
  { id: "2", name: "سلطة سيزر", nameAr: "سلطة سيزر", basePrice: 85, categoryId: "1", isAvailable: true, variants: [], extras: [{ name: "Extra Dressing", price: 10 }] },
  { id: "3", name: "كيك الشوكولاتة", nameAr: "كيك الشوكولاتة", basePrice: 65, categoryId: "3", isAvailable: true, variants: [], extras: [] },
  { id: "4", name: "عصير برتقال طازج", nameAr: "عصير برتقال طازج", basePrice: 35, categoryId: "4", isAvailable: true, variants: [{ name: "Large", priceAdjustment: 10 }], extras: [] },
  { id: "5", name: "برجر لحم", nameAr: "برجر لحم", basePrice: 120, categoryId: "2", isAvailable: false, variants: [{ name: "Double", priceAdjustment: 40 }], extras: [{ name: "Bacon", price: 20 }] },
];

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeCategory === "ALL" || p.categoryId === activeCategory;
    const matchesSearch = p.name.includes(search) || p.nameAr.includes(search);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة المنيو</h1>
          <p className="text-slate-400 text-sm mt-1">إضافة وتعديل المنتجات والتصنيفات</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-700">
            <Plus className="w-4 h-4 ml-2" />
            تصنيف جديد
          </Button>
          <Button variant="fluxio">
            <Plus className="w-4 h-4 ml-2" />
            منتج جديد
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="بحث عن منتج..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10 bg-slate-900 border-slate-800"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveCategory("ALL")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
            activeCategory === "ALL"
              ? "bg-fluxio-electric-blue/10 text-fluxio-electric-blue border border-fluxio-electric-blue/20"
              : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
          }`}
        >
          الكل
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? "bg-fluxio-electric-blue/10 text-fluxio-electric-blue border border-fluxio-electric-blue/20"
                : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
            }`}
          >
            {cat.nameAr} ({cat.count})
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all group overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <span className="text-4xl">🍽️</span>
            </div>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-white">{product.nameAr}</h3>
                  <p className="text-xs text-slate-400">{product.name}</p>
                </div>
                <Badge variant={product.isAvailable ? "success" : "destructive"}>
                  {product.isAvailable ? "متاح" : "غير متاح"}
                </Badge>
              </div>

              <p className="text-xl font-bold text-fluxio-electric-blue mb-3">
                {formatPrice(product.basePrice)}
              </p>

              {product.variants.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-slate-400 mb-1">المقاسات:</p>
                  <div className="flex gap-1 flex-wrap">
                    {product.variants.map((v, i) => (
                      <span key={i} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">
                        {v.name} {v.priceAdjustment > 0 && `+${v.priceAdjustment}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.extras.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-slate-400 mb-1">إضافات:</p>
                  <div className="flex gap-1 flex-wrap">
                    {product.extras.map((e, i) => (
                      <span key={i} className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">
                        {e.name} +{e.price}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
                  <Edit2 className="w-3 h-3 ml-1" />
                  تعديل
                </Button>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-400">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
