"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bookmark, Settings, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Search", icon: Search },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/briefs", label: "Briefs", icon: FileText },
  { href: "/profile", label: "Brand Profile", icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        background: "var(--bg-card)",
        borderBottom: "1px solid var(--border)",
      }}
      className="sticky top-0 z-40"
    >
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #ff3b6b, #9b5de5)" }}
          >
            S
          </div>
          <span className="font-semibold text-sm tracking-wide">
            SoMe Scrub
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/"
                ? pathname === "/" || pathname.startsWith("/results")
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                  active
                    ? "text-white"
                    : "text-[var(--text-secondary)] hover:text-white"
                )}
                style={
                  active
                    ? { background: "var(--bg-card-hover)" }
                    : undefined
                }
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
