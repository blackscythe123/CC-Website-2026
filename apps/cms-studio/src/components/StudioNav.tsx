"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRoleInfo } from "@/lib/roles";
import { Edit3, CheckSquare, Shield, LogOut, FileText } from "lucide-react";

interface StudioNavProps {
  user: { login: string; name: string; avatar_url: string } | null;
  roleInfo: UserRoleInfo | null;
}

export default function StudioNav({ user, roleInfo }: StudioNavProps) {
  const pathname = usePathname();

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

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-mono text-sm font-bold text-white shadow-xs">
              &lt;/&gt;
            </span>
            <div>
              <span className="text-base font-bold tracking-tight text-gray-900">
                Coding Club
              </span>
              <span className="ml-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                Studio
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                pathname === "/admin"
                  ? "bg-gray-100 text-gray-900 font-semibold"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Edit3 className="h-4 w-4" />
              <span>Canvas Editor</span>
            </Link>

            <Link
              href="/admin/reviews"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                pathname === "/admin/reviews"
                  ? "bg-gray-100 text-gray-900 font-semibold"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <CheckSquare className="h-4 w-4" />
              <span>Editorial Reviews</span>
            </Link>

            {canManagePosts && (
              <Link
                href="/admin/posts"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  pathname === "/admin/posts"
                    ? "bg-gray-100 text-gray-900 font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <FileText className="h-4 w-4 text-emerald-600" />
                <span className="text-gray-700 font-medium">Manage Articles</span>
              </Link>
            )}

            {canManageRoles && (
              <Link
                href="/admin/roles"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  pathname === "/admin/roles"
                    ? "bg-gray-100 text-gray-900 font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Shield className="h-4 w-4 text-purple-600" />
                <span className="text-purple-700 font-semibold">Governance &amp; Roles</span>
              </Link>
            )}
          </nav>
        </div>

        {/* User Info / Auth */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50/80 py-1 pl-1 pr-3">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="h-7 w-7 rounded-full border border-gray-200 object-cover"
                />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-gray-800 leading-tight">
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
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
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
    </header>
  );
}
