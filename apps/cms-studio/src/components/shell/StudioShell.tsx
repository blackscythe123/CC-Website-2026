"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useStudioSession } from "@/lib/hooks/useStudioSession";
import { useReviewQueue } from "@/lib/hooks/useReviewQueue";
import { AccessRequestScreen, PendingInviteScreen, SignInScreen, StudioLoadingScreen } from "@/components/editor/AccessScreens";
import ThemeSwitch from "@/components/theme/ThemeSwitch";
import { IconButton } from "@/components/ui";
import AccountMenu from "./AccountMenu";
import { StudioContext } from "./StudioContext";
import { isActive, navItemsFor, type NavItem } from "./navItems";

const RAIL_KEY = "cms-rail";

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link href="/admin" className="flex min-w-0 items-center gap-2.5 rounded-lg px-1.5 py-1" aria-label="Studio home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/mark.png" alt="" aria-hidden width={30} height={30} className="shrink-0 rounded-lg" />
      {!collapsed ? (
        <span className="min-w-0 leading-tight">
          <span className="block text-[15px] font-bold tracking-tight">Studio</span>
          <span className="block truncate text-[11px] font-medium text-muted">SSN Coding Club</span>
        </span>
      ) : null}
    </Link>
  );
}

function CountBadge({ count, floating = false }: { count: number; floating?: boolean }) {
  if (!count) return null;
  return (
    <span
      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-on-accent ${
        floating ? "absolute -right-1 -top-1" : "ml-auto"
      }`}
    >
      {count}
    </span>
  );
}

function SideNavLink({ item, active, collapsed, count }: { item: NavItem; active: boolean; collapsed: boolean; count: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? `${item.label}${count ? `, ${count} need attention` : ""}` : undefined}
      className={`relative flex items-center gap-3 rounded-lg text-sm transition ${collapsed ? "h-10 w-10 justify-center" : "h-9 px-2.5"} ${
        active ? "bg-surface-2 font-semibold text-text" : "font-medium text-muted hover:bg-surface-2 hover:text-text"
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
      {!collapsed ? <CountBadge count={count} /> : <CountBadge count={count} floating />}
    </Link>
  );
}

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Write",
  "/admin/reviews": "Reviews",
  "/admin/posts": "Articles",
  "/admin/roles": "People",
};

export default function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const session = useStudioSession();
  const queue = useReviewQueue(session.user, session.roleInfo);
  const isEditor = pathname === "/admin";

  // Expanded sidebar preference for desktop (the editor starts as a rail).
  const [collapsedPref, setCollapsedPref] = useState(false);
  const [editorExpanded, setEditorExpanded] = useState(false);
  useEffect(() => {
    try {
      setCollapsedPref(localStorage.getItem(RAIL_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => setEditorExpanded(false), [pathname]);

  const collapsed = isEditor ? !editorExpanded : collapsedPref;
  const toggleCollapsed = () => {
    if (isEditor) {
      setEditorExpanded((v) => !v);
      return;
    }
    setCollapsedPref((v) => {
      try {
        localStorage.setItem(RAIL_KEY, v ? "0" : "1");
      } catch {
        // ignore
      }
      return !v;
    });
  };

  // Toasts sit beside the sidebar on desktop.
  useEffect(() => {
    const width = typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches ? (collapsed ? 64 : 232) : 64;
    document.documentElement.style.setProperty("--sidebar-w", `${width}px`);
  }, [collapsed]);

  if (session.loading) return <StudioLoadingScreen />;
  if (!session.user) return <SignInScreen />;
  if (session.collaboratorStatus && !session.collaboratorStatus.isCollaborator) {
    return session.collaboratorStatus.hasPendingInvite ? (
      <PendingInviteScreen user={session.user} inviteUrl={session.collaboratorStatus.inviteUrl} />
    ) : (
      <AccessRequestScreen user={session.user} />
    );
  }

  const user = session.user;
  const items = navItemsFor(session.roleInfo?.role ?? null, session.roleInfo?.verticals ?? []);
  const countFor = (item: NavItem) => (item.id === "reviews" ? queue.attentionCount : 0);
  const title = PAGE_TITLES[pathname || ""] || "Studio";

  return (
    <StudioContext.Provider value={{ user, roleInfo: session.roleInfo, collaboratorStatus: session.collaboratorStatus, queue }}>
      <div className="min-h-screen bg-bg text-text">
        <a
          href="#studio-main"
          className="sr-only z-[80] rounded-lg bg-bg px-3 py-2 text-sm font-semibold shadow-float focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Skip to content
        </a>

        {/* Sidebar: icon rail on tablets, full or rail on desktop */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-surface py-3 md:flex ${
            collapsed ? "w-16 items-center px-2" : "w-16 items-center px-2 lg:w-[232px] lg:items-stretch lg:px-3"
          }`}
          aria-label="Studio navigation"
        >
          <div className={`mb-4 flex items-center ${collapsed ? "" : "lg:justify-between"}`}>
            <div className="lg:hidden">
              <Brand collapsed />
            </div>
            <div className="hidden lg:block">
              <Brand collapsed={collapsed} />
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {items.map((item) => (
              <div key={item.id}>
                <div className="lg:hidden">
                  <SideNavLink item={item} active={isActive(item, pathname)} collapsed count={countFor(item)} />
                </div>
                <div className="hidden lg:block">
                  <SideNavLink item={item} active={isActive(item, pathname)} collapsed={collapsed} count={countFor(item)} />
                </div>
              </div>
            ))}
          </nav>
          <div className="flex-1" />
          <div className={`flex flex-col gap-2 ${collapsed ? "items-center" : "items-center lg:items-stretch"}`}>
            <div className="hidden lg:block">
              <IconButton
                icon={collapsed ? PanelLeftOpen : PanelLeftClose}
                label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={toggleCollapsed}
              />
            </div>
            {!collapsed ? <ThemeSwitch className="hidden lg:flex" /> : null}
            <div className={collapsed ? "" : "lg:hidden"}>
              <AccountMenu user={user} roleInfo={session.roleInfo} inbox={queue.inbox} compact placement="above" />
            </div>
            {!collapsed ? (
              <div className="hidden border-t border-border pt-2 lg:block">
                <AccountMenu user={user} roleInfo={session.roleInfo} inbox={queue.inbox} placement="above" />
              </div>
            ) : null}
          </div>
        </aside>

        {/* Phone top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-bg/95 px-4 backdrop-blur md:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="" aria-hidden width={28} height={28} className="rounded-lg" />
          <h1 className="min-w-0 flex-1 truncate text-base font-bold tracking-tight">{title}</h1>
          <AccountMenu user={user} roleInfo={session.roleInfo} inbox={queue.inbox} compact align="end" />
        </header>

        <main
          id="studio-main"
          className={`pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0 md:pl-16 ${collapsed ? "" : "lg:pl-[232px]"}`}
        >
          {children}
        </main>

        {/* Phone bottom tabs */}
        <nav
          aria-label="Studio navigation"
          className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item, pathname);
            const count = countFor(item);
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] ${
                  active ? "font-bold text-accent" : "font-medium text-muted"
                }`}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden />
                  <CountBadge count={count} floating />
                </span>
                <span className="max-w-full truncate px-1">{item.id === "join" ? "Join" : item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </StudioContext.Provider>
  );
}
