"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [checked, setChecked] = useState(false);

  const isLoginPage = pathname === "/nexus-7f3/login";

  useEffect(() => {
    if (isLoginPage) {
      setChecked(true);
      return;
    }
    if (!isAuthenticated || user?.role !== "SUPER_ADMIN") {
      router.replace("/nexus-7f3/login");
      return;
    }
    setChecked(true);
  }, [isLoginPage, isAuthenticated, user, router]);

  if (isLoginPage) return <>{children}</>;

  if (!checked || !isAuthenticated || user?.role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05070d]">
        <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
      </div>
    );
  }

  return <div className="min-h-screen bg-[#05070d]">{children}</div>;
}
