"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRoleInfo } from "@/lib/roles";
import {
  Edit3,
  CheckSquare,
  Shield,
  LogOut,
  FileText,
  Bell,
  Clock,
  AlertCircle,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";

interface StudioNavProps {
  user: { login: string; name: string; avatar_url: string } | null;
  roleInfo: UserRoleInfo | null;
}

interface NavNotification {
  number: number;
  title: string;
  vertical: string;
  type: "submitted" | "changes_requested" | "needs_approval";
}

export default function StudioNav({ user, roleInfo }: StudioNavProps) {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<NavNotification[]>([]);
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the mobile menu on navigation and on Escape
  useEffect(() => {
    setShowMobileMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!showMobileMenu) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMobileMenu(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showMobileMenu]);

  useEffect(() => {
    if (!user) return;

    fetch("/api/posts/reviews")
      .then((res) => res.json())
      .then((data) => {
        if (!data.prs) return;
        const notifs: NavNotification[] = [];

        data.prs.forEach((pr: { number: number; title: string; vertical: string; author: string; changesRequested?: boolean }) => {
          const isAuthor = pr.author.toLowerCase() === user.login.toLowerCase();
          if (isAuthor) {
            if (pr.changesRequested) {
              notifs.push({
                number: pr.number,
                title: pr.title,
                vertical: pr.vertical,
                type: "changes_requested",
              });
            } else {
              notifs.push({
                number: pr.number,
                title: pr.title,
                vertical: pr.vertical,
                type: "submitted",
              });
            }
          } else {
            // Check if current user has reviewer authority over this vertical
            // (Only notify if NOT changes_requested, because it's currently with the author to revise)
            if (!pr.changesRequested) {
              const isSuperadmin = roleInfo?.role === "superadmin";
              const isVerticalLead =
                (roleInfo?.role === "vertical_head" || roleInfo?.role === "deputy") &&
                roleInfo?.verticals.includes(pr.vertical);
              if (isSuperadmin || isVerticalLead) {
                notifs.push({
                  number: pr.number,
                  title: pr.title,
                  vertical: pr.vertical,
                  type: "needs_approval",
                });
              }
            }
          }
        });

        setNotifications(notifs);
      })
      .catch(() => {});
  }, [user, roleInfo]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowBellDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    window.location.href = "/";
  };

  const canManageRoles =
    roleInfo?.role === "superadmin" ||
    roleInfo?.role === "vertical_head" ||
    roleInfo?.role === "deputy";

  const canManagePosts =
    roleInfo?.role === "superadmin" || roleInfo?.role === "vertical_head";

  const totalNotifs = notifications.length;

  // `label` fits the desktop bar without wrapping; `fullLabel` is used in the mobile menu and as a tooltip
  const navLinks = [
    { href: "/admin", label: "Write", fullLabel: "Canvas Editor", icon: Edit3, iconClass: "", badge: 0, visible: true },
    { href: "/admin/reviews", label: "Reviews", fullLabel: "Editorial Reviews", icon: CheckSquare, iconClass: "", badge: totalNotifs, visible: true },
    { href: "/admin/posts", label: "Articles", fullLabel: "Manage Articles", icon: FileText, iconClass: "text-emerald-600", badge: 0, visible: canManagePosts },
    { href: "/admin/roles", label: "Roles", fullLabel: "Governance & Roles", icon: Shield, iconClass: "text-purple-600", badge: 0, visible: canManageRoles },
  ].filter((link) => link.visible);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/admin" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-mono text-sm font-bold text-white shadow-xs">
              &lt;/&gt;
            </span>
            <div>
              <span className="text-base font-bold tracking-tight text-gray-900">
                Coding Club
              </span>
              <span className="ml-1.5 hidden rounded-full sm:inline bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                Studio
              </span>
            </div>
          </Link>

          {/* Navigation Links (desktop) */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-medium">
            {navLinks.map(({ href, label, fullLabel, icon: Icon, iconClass, badge }) => (
              <Link
                key={href}
                href={href}
                title={fullLabel}
                aria-current={pathname === href ? "page" : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 transition ${
                  pathname === href
                    ? "bg-gray-100 text-gray-900 font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${iconClass}`} />
                <span>{label}</span>
                {badge > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-xs">
                    {badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* User Info / Auth */}
        <div className="flex shrink-0 items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notification Bell with Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowBellDropdown(!showBellDropdown)}
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition"
                  title="Notifications & Review Status"
                  aria-label={`Notifications (${totalNotifs})`}
                  aria-expanded={showBellDropdown}
                >
                  <Bell className="h-4 w-4" />
                  {totalNotifs > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-xs">
                      {totalNotifs}
                    </span>
                  )}
                </button>

                {showBellDropdown && (
                  <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-96 sm:w-96 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl z-50 space-y-2">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2 px-1">
                      <span className="text-xs font-bold text-gray-900">
                        Editorial Notifications ({totalNotifs})
                      </span>
                      <Link
                        href="/admin/reviews"
                        onClick={() => setShowBellDropdown(false)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                      >
                        View All in Reviews &rarr;
                      </Link>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-gray-400">
                        No pending reviews or notifications. You&apos;re all caught up!
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto space-y-1.5 divide-y divide-gray-50">
                        {notifications.map((n) => (
                          <Link
                            key={`${n.type}-${n.number}`}
                            href="/admin/reviews"
                            onClick={() => setShowBellDropdown(false)}
                            className="flex items-start gap-2.5 rounded-xl p-2 hover:bg-gray-50 transition text-left block"
                          >
                            {n.type === "changes_requested" ? (
                              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                            ) : n.type === "needs_approval" ? (
                              <CheckSquare className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                            ) : (
                              <Clock className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                            )}
                            <div className="text-xs space-y-0.5 min-w-0">
                              <div className="font-semibold text-gray-900 truncate">
                                PR #{n.number}: {n.title}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {n.type === "changes_requested" ? (
                                  <span className="text-amber-700 font-medium">Changes Requested by Reviewer</span>
                                ) : n.type === "needs_approval" ? (
                                  <span className="text-emerald-700 font-medium">Awaiting your approval in [{n.vertical}]</span>
                                ) : (
                                  <span className="text-blue-700 font-medium">Submitted for review in [{n.vertical}]</span>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Avatar & Role */}
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50/80 p-1 sm:pr-3">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="h-7 w-7 rounded-full border border-gray-200 object-cover"
                />
                <div className="hidden flex-col text-left sm:flex">
                  <span className="whitespace-nowrap text-xs font-bold text-gray-800 leading-tight">
                    @{user.login}
                  </span>
                  <span className="text-[10px] font-semibold text-blue-600 capitalize leading-tight">
                    {roleInfo?.role?.replace("_", " ") || "Member"}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-xs hover:bg-gray-50 hover:text-red-600 transition"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMobileMenu((open) => !open)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition lg:hidden"
                aria-label={showMobileMenu ? "Close menu" : "Open menu"}
                aria-expanded={showMobileMenu}
                aria-controls="studio-mobile-menu"
              >
                {showMobileMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          ) : (
            <a
              href="/api/auth"
              className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-black transition"
            >
              Sign In
            </a>
          )}
        </div>
      </div>

      {/* Navigation Links (mobile / tablet) */}
      {user && showMobileMenu && (
        <nav
          id="studio-mobile-menu"
          className="border-t border-gray-100 bg-white px-4 py-2 shadow-lg lg:hidden"
        >
          {navLinks.map(({ href, fullLabel, icon: Icon, iconClass, badge }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setShowMobileMenu(false)}
              aria-current={pathname === href ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${
                pathname === href
                  ? "bg-gray-100 text-gray-900 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className={`h-4 w-4 ${iconClass}`} />
              <span className="flex-1">{fullLabel}</span>
              {badge > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
