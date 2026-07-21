"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState<number | null>(null);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/subscriptions/current", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSubStatus(data.status);
          setDaysUntilExpiry(data.daysUntilExpiry ?? null);
          setIsExpiringSoon(Boolean(data.isExpiringSoon));
        }
      } finally {
        setChecked(true);
      }
    }
    if (accessToken) check();
    else setChecked(true);
  }, [accessToken]);

  const isOwner = user?.role === "RESTAURANT_OWNER";
  const isBlocked =
    checked && (subStatus === "EXPIRED" || subStatus === "SUSPENDED") && pathname !== "/settings";

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <Sidebar />
      <main className="lg:mr-64 min-h-screen">
        <div className="flex justify-end px-6 lg:px-8 pt-4">
          <NotificationBell />
        </div>
        <div className="p-6 lg:p-8 pt-2">
          {!checked ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
            </div>
          ) : isBlocked ? (
            <div className="flex flex-col items-center justify-center text-center py-24 gap-3">
              <ShieldAlert className="w-10 h-10 text-red-400" />
              {isOwner ? (
                <>
                  <h2 className="text-white font-bold text-lg">الاشتراك منتهي أو موقوف</h2>
                  <p className="text-slate-400 text-sm max-w-sm">
                    اشتراكك في Fluxio انتهى. الخدمة اتوقفت مؤقتًا (المنيو العام، الطلبات، وحسابات
                    الفريق) لحد ما تجدد. بياناتك كلها محفوظة زي ما هي وهترجع تشتغل فورًا بعد
                    التجديد.
                  </p>
                  <Button variant="fluxio" onClick={() => router.push("/settings")}>
                    تجديد الاشتراك
                  </Button>
                </>
              ) : (
                <>
                  <h2 className="text-white font-bold text-lg">الخدمة متوقفة مؤقتًا</h2>
                  <p className="text-slate-400 text-sm max-w-sm">
                    اشتراك المطعم في Fluxio خلص. كلم صاحب المطعم عشان يجدده، وهيرجع حسابك يشتغل
                    تاني أول ما يتجدد.
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              {isExpiringSoon && isOwner && pathname !== "/settings" && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <p className="text-amber-300 text-sm">
                    ⏳ اشتراكك هينتهي بعد {daysUntilExpiry} {daysUntilExpiry === 1 ? "يوم" : "أيام"}
                    . جدد دلوقتي عشان الخدمة متتوقفش.
                  </p>
                  <Button
                    variant="fluxio"
                    className="shrink-0"
                    onClick={() => router.push("/settings")}
                  >
                    تجديد
                  </Button>
                </div>
              )}
              {children}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
