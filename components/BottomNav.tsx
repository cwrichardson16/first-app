"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Dumbbell, Camera, Settings, BarChart3, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

export function BottomNav({ hasPartner }: { hasPartner: boolean }) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/today", label: "Today", icon: CalendarDays },
    { href: "/dashboard", label: "Stats", icon: BarChart3 },
    { href: "/workouts", label: "Lifts", icon: Dumbbell },
    { href: "/photos", label: "Photos", icon: Camera },
    ...(hasPartner ? [{ href: "/partner", label: "Partner", icon: Users }] : []),
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-safe">
      <ul className="flex justify-around items-stretch">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/today" && pathname.startsWith(href));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-xs",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
