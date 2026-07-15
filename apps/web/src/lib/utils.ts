import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency: string = "EGP"): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return "منذ لحظات";
  if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
  if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
  return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
}

export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    CONFIRMED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    PREPARING: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    READY: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    DELIVERED: "bg-green-500/10 text-green-500 border-green-500/20",
    CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
    RETURNED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };
  return colors[status] || "bg-slate-500/10 text-slate-500";
}

export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "معلق",
    CONFIRMED: "مؤكد",
    PREPARING: "جاري التحضير",
    READY: "جاهز",
    DELIVERED: "تم التسليم",
    CANCELLED: "ملغي",
    RETURNED: "مرتجع",
  };
  return labels[status] || status;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    SUPER_ADMIN: "سوبر أدمن",
    RESTAURANT_OWNER: "صاحب المطعم",
    MANAGER: "مدير",
    CASHIER: "كاشير",
    CHEF: "شيف",
    WAITER: "ويتر",
    CUSTOMER: "عميل",
  };
  return labels[role] || role;
}

export function generateUsername(firstName: string, lastName: string): string {
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  const random = Math.floor(Math.random() * 1000);
  return `${base}.${random}`;
}
