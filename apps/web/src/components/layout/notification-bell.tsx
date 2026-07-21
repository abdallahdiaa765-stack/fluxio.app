"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `من ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `من ${hours} ساعة`;
  return `من ${Math.floor(hours / 24)} يوم`;
}

export function NotificationBell() {
  const { accessToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch("/api/notifications/unread-count", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setUnreadCount(await res.json());
    } catch {
      // Non-critical - the bell just stays quiet until the next poll.
    }
  };

  const fetchList = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch("/api/notifications?limit=20", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setItems(await res.json());
    } catch {
      // Non-critical.
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) await fetchList();
  };

  const markAllRead = async () => {
    if (!accessToken) return;
    setUnreadCount(0);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await fetch("/api/notifications/read-all", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
        aria-label="الإشعارات"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-sm font-semibold text-white">الإشعارات</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-fluxio-electric-blue hover:underline"
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">مفيش إشعارات دلوقتي</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn("px-4 py-3", !n.isRead && "bg-fluxio-electric-blue/5")}
                >
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-3">{n.body}</p>
                  <p className="text-[11px] text-slate-600 mt-1">{timeAgo(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
