"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Loader2, UtensilsCrossed, Flame } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Variant {
  id: string;
  name: string;
  nameAr?: string | null;
  priceAdjustment: number;
}

interface ExtraItem {
  id: string;
  name: string;
  nameAr?: string | null;
  price: number;
}

interface Product {
  id: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  basePrice: number;
  variants: Variant[];
  extras: ExtraItem[];
}

interface Category {
  id: string;
  name: string;
  nameAr?: string | null;
  products: Product[];
}

interface PublicMenu {
  tenant: {
    name: string;
    slug: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
  };
  settings?: { currency?: string | null } | null;
  categories: Category[];
}

export default function PublicMenuPage() {
  const { slug } = useParams<{ slug: string }>();
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/menu/public/${slug}`);
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error(
              "المطعم مش متاح حاليًا. الخدمة متوقفة مؤقتًا، برجاء المحاولة لاحقًا."
            );
          }
          throw new Error("المطعم غير موجود");
        }
        const data: PublicMenu = await res.json();
        setMenu(data);
        setActiveCategory(data.categories[0]?.id || "");
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }
    if (slug) load();
  }, [slug]);

  const colors = useMemo(
    () => ({
      primary: menu?.tenant.primaryColor || "#00d4ff",
      secondary: menu?.tenant.secondaryColor || "#7b2ff7",
      accent: menu?.tenant.accentColor || "#00f5d4",
    }),
    [menu]
  );

  const currency = menu?.settings?.currency || "EGP";

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0e1a] text-slate-400 gap-2">
        <UtensilsCrossed className="w-8 h-8" />
        <p>{error || "المطعم غير موجود"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a]" dir="rtl">
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
      >
        <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col items-center text-center">
          {menu.tenant.logoUrl ? (
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-xl mb-4 bg-white/10">
              <Image src={menu.tenant.logoUrl} alt={menu.tenant.name} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-4">
              <UtensilsCrossed className="w-9 h-9 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-white">{menu.tenant.name}</h1>
          <p className="text-white/80 text-sm mt-1">المنيو</p>
        </div>
      </div>

      {/* Sticky category tabs */}
      <div className="sticky top-0 z-20 bg-[#0a0e1a]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {menu.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              className="shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border"
              style={
                activeCategory === cat.id
                  ? {
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                      borderColor: "transparent",
                      color: "white",
                    }
                  : { borderColor: "#1e293b", color: "#94a3b8" }
              }
            >
              {cat.nameAr || cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Categories & products */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-10">
        {menu.categories.map((cat) => (
          <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-20">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span
                className="w-1.5 h-5 rounded-full"
                style={{ background: colors.accent }}
              />
              {cat.nameAr || cat.name}
            </h2>

            <div className="grid gap-3">
              {cat.products.map((p) => (
                <div
                  key={p.id}
                  className="flex gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 transition-transform duration-200 hover:-translate-y-0.5 hover:border-slate-700"
                >
                  {p.imageUrl ? (
                    <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden">
                      <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 shrink-0 rounded-lg bg-slate-800 flex items-center justify-center">
                      <Flame className="w-6 h-6 text-slate-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-white text-sm">{p.nameAr || p.name}</h3>
                      <span
                        className="font-bold text-sm shrink-0"
                        style={{ color: colors.primary }}
                      >
                        {formatPrice(p.basePrice, currency)}
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-slate-500 text-xs mt-1 line-clamp-2">{p.description}</p>
                    )}
                    {p.variants.length > 0 && (
                      <p className="text-slate-600 text-[11px] mt-1">
                        {p.variants.length} خيار متاح
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {cat.products.length === 0 && (
                <p className="text-slate-600 text-sm">لا يوجد أصناف في هذا القسم حاليًا</p>
              )}
            </div>
          </section>
        ))}
      </div>

      <footer className="text-center text-slate-600 text-xs py-8">
        منيو {menu.tenant.name} — بواسطة Fluxio
      </footer>
    </div>
  );
}
