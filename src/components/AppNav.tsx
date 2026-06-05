"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "月次PL" },
  { href: "/leads", label: "リード獲得" },
  { href: "/weekly-ad", label: "週次広告" },
  { href: "/instructors", label: "講師バイト代" },
  { href: "/status", label: "入力状況" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 text-sm rounded bg-slate-100 p-1">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "rounded px-3 py-1.5 font-medium transition-colors whitespace-nowrap",
              active
                ? "bg-[#458BC3] text-white shadow-sm"
                : "text-slate-600 hover:bg-white hover:text-[#458BC3]",
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
