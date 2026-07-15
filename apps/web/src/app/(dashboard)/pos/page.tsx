"use client";

import { useState } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Receipt,
  CreditCard,
  Banknote,
  Calculator,
  X,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

const categories = [
  { id: "1", name: "مقبلات" },
  { id: "2", name: "رئيسي" },
  { id: "3", name: "حلويات" },
  { id: "4", name: "مشروبات" },
];

const products = [
  { id: "1", name: "دجاج مشوي", price: 185, categoryId: "2" },
  { id: "2", name: "سلطة سيزر", price: 85, categoryId: "1" },
  { id: "3", name: "كيك شوكولاتة", price: 65, categoryId: "3" },
  { id: "4", name: "عصير برتقال", price: 35, categoryId: "4" },
  { id: "5", name: "برجر لحم", price: 120, categoryId: "2" },
  { id: "6", name: "بطاطس", price: 45, categoryId: "1" },
  { id: "7", name: "آيس كريم", price: 40, categoryId: "3" },
  { id: "8", name: "مياه معدنية", price: 15, categoryId: "4" },
];

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function POSPage() {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [taxRate] = useState(14);

  const filteredProducts = activeCategory === "ALL"
    ? products
    : products.filter((p) => p.categoryId === activeCategory);

  const addToCart = (product: typeof products[0]) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = (subtotal * discount) / 100;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = (afterDiscount * taxRate) / 100;
  const total = afterDiscount + taxAmount;

  return (
    <div className="h-screen flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
        <h1 className="text-2xl font-bold text-white">نقطة البيع (POS)</h1>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-slate-800">ترابيزة T05</Badge>
          <Badge variant="outline" className="bg-slate-800">Dine-in</Badge>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Products Panel */}
        <div className="flex-1 flex flex-col">
          {/* Categories */}
          <div className="flex gap-2 p-4 overflow-x-auto">
            <button
              onClick={() => setActiveCategory("ALL")}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === "ALL"
                  ? "bg-fluxio-electric-blue text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
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
                    ? "bg-fluxio-electric-blue text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="flex-1 p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-fluxio-electric-blue/50 hover:bg-slate-800 transition-all text-right"
              >
                <p className="font-semibold text-white">{product.name}</p>
                <p className="text-fluxio-electric-blue font-bold mt-1">{formatPrice(product.price)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="w-96 border-r border-slate-800 bg-slate-900/50 flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <h2 className="font-semibold text-white">الفاتورة</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>اضغط على منتج لإضافته</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{item.name}</p>
                    <p className="text-xs text-slate-400">{formatPrice(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-7 h-7 rounded bg-slate-700 flex items-center justify-center hover:bg-slate-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-7 h-7 rounded bg-slate-700 flex items-center justify-center hover:bg-slate-600"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => updateQuantity(item.id, -item.quantity)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          <div className="p-4 border-t border-slate-800 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">المجموع</span>
              <span className="text-white">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">الخصم ({discount}%)</span>
              <span className="text-red-400">-{formatPrice(discountAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">الضريبة ({taxRate}%)</span>
              <span className="text-white">{formatPrice(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-800">
              <span className="text-white">الإجمالي</span>
              <span className="text-fluxio-electric-blue">{formatPrice(total)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="outline" className="border-slate-700">
                <Banknote className="w-4 h-4 ml-2" />
                كاش
              </Button>
              <Button variant="outline" className="border-slate-700">
                <CreditCard className="w-4 h-4 ml-2" />
                فيزا
              </Button>
            </div>
            <Button variant="fluxio" className="w-full mt-2">
              <Printer className="w-4 h-4 ml-2" />
              طباعة ودفع
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
