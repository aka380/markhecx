"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { updateDiscoveryQuery } from "@/lib/mark/discovery";
import {
  Home,
  Users,
  Plus,
  Sparkles,
  Gem,
  Ellipsis,
  ChevronDown,
  MessageSquare,
  Bell,
  LogOut,
  UserRound,
  Settings,
  CircleHelp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApp } from "./provider";
import { Button, Brand, Avatar } from "./ui";
import { CreatorSearch } from "./discovery/creator-search";
const menus = {
  Creators: [
    "Discover Creators",
    "Featured Creators",
    "Trending Creators",
    "Recommended",
    "Saved Creators",
    "Categories",
  ],
  Create: ["Portfolio", "Project", "Achievement", "Skill", "AI Generation"],
  Premium: [
    "Premium",
    "AI Pro",
    "Advanced Analytics",
    "Premium Portfolio",
    "Advanced Matching",
    "Unlimited HECX",
    "Upgrade",
  ],
  More: [
    "Match Studio",
    "About",
    "Samples",
    "Guidelines",
    "Help",
    "Activity",
    "Resources",
    "Settings",
  ],
};
export function menuHref(group: string, item: string) {
  const special: Record<string, string> = {
    "Match Studio": "/studio",
    "Create Campaign": "/campaigns/new",
    Campaigns: "/campaigns",
    "Saved Campaigns": "/campaigns/saved",
    Applications: "/applications",
    Invitations: "/invitations",
    Engagements: "/engagements",
    "Brand Dashboard": "/brand",
    Analytics: "/brand/analytics",
    "Brand Page": "/brand/profile",
    "Brand Saved Creators": "/brand/saved",
  };
  if (special[item]) return special[item];
  if (group === "Creators" && item === "Saved Creators")
    return "/creators/saved";
  if (group === "Creators") return "/creators?view=" + encodeURIComponent(item);
  if (group === "Create")
    return item === "Portfolio"
      ? "/portfolio"
      : item === "Project"
        ? "/projects/new"
        : "/create?type=" + encodeURIComponent(item);
  if (group === "Premium")
    return "/premium?feature=" + encodeURIComponent(item);
  return "/" + item.toLowerCase();
}
export function Shell({ children }: { children: React.ReactNode }) {
  const { state, ready, authError, openAuth, logout } = useApp();
  const path = (usePathname() ?? "/");
  const router = useRouter();
  const params = (useSearchParams() ?? new URLSearchParams());
  if (!ready)
    return (
      <div role="status" className="info-line">
        Restoring your MarkHECX session…
      </div>
    );
  if (authError) return null;
  const q = params.get("q") || "";
  const brand = state.signedIn && state.accountType === "Brand";
  const activeMenus = {
    ...menus,
    Create: brand ? ["Create Campaign", ...menus.Create] : menus.Create,
    More: [
      ...(brand
        ? [
            "Brand Dashboard",
            "Campaigns",
            "Brand Saved Creators",
            "Applications",
            "Invitations",
            "Engagements",
            "Analytics",
            "Brand Page",
          ]
        : ["Campaigns", "Saved Campaigns", "Applications", "Invitations", "Engagements"]),
      ...menus.More,
    ],
  };
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="topbar">
        <Link href="/" aria-label="MarkHECX home">
          <Brand />
        </Link>
        <CreatorSearch
          compact
          value={q}
          onChange={(value) => {
            router.replace(
              "/creators?" +
                updateDiscoveryQuery(
                  new URLSearchParams(
                    path.startsWith("/creators") ? params.toString() : "",
                  ),
                  { q: value, view: "All Creators" },
                ),
              { scroll: false },
            );
          }}
        />
        <div className="account-actions">
          {state.signedIn ? (
            <>
              <Button asChild variant="ghost" size="icon" aria-label="Messages">
                <Link href="/messages">
                  <MessageSquare size={19} />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Notifications"
              >
                <Link href="/notifications">
                  <Bell size={19} />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="profile-trigger" aria-label="Profile menu">
                    <Avatar
                      name={state.profile.name}
                      image={state.profile.avatar}
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="mark-menu"
                  sideOffset={12}
                  align="end"
                >
                  <DropdownMenuLabel>
                    <span className="menu-name">{state.profile.name}</span>
                    <span className="small-note">
                      {brand ? "Brand / Agency" : "Creator"} · Account
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {[
                    [
                      brand ? "Brand Profile" : "Profile & Identity",
                      brand ? "/brand/profile" : "/profile",
                      UserRound,
                    ],
                    ["Settings & Models", "/settings", Settings],
                    ["Notifications", "/notifications", Bell],
                    ["Help / Guidelines", "/help", CircleHelp],
                  ].map(([label, href, Icon]) => (
                    <DropdownMenuItem key={String(href)} asChild>
                      <Link href={String(href)}>
                        {typeof Icon !== "string" && <Icon size={16} />}
                        <span>{String(label)}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onSelect={() => {
                      logout();
                      router.push("/");
                    }}
                  >
                    <LogOut size={16} />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => openAuth("Sign In")}>
                Sign In
              </Button>
              <Button
                className="btn-primary"
                onClick={() => openAuth("Sign Up")}
              >
                Sign Up
              </Button>
            </>
          )}
        </div>
      </header>
      <main id="main" className="main-container">
        {children}
      </main>
      <footer className="site-footer">
        <Brand />
        <span>A place for your next chapter.</span>
        <span>MarkHECX · Connected workspace</span>
      </footer>
      <nav className="bottom-nav" aria-label="Main navigation">
        <Link
          className={path === "/" ? "nav-item active" : "nav-item"}
          href="/"
        >
          <Home />
          <span>Home</span>
        </Link>
        {(["Creators", "Create", "HECX", "Premium", "More"] as const).map(
          (group) => {
            const Icon = {
              Creators: Users,
              Create: Plus,
              HECX: Sparkles,
              Premium: Gem,
              More: Ellipsis,
            }[group];
            if (group === "HECX" || group === "Premium")
              return (
                <Link
                  key={group}
                  className={`nav-item ${group === "Premium" ? "premium-nav" : ""} ${path === (group === "HECX" ? "/hecx" : "/premium") ? "active" : ""}`}
                  href={group === "HECX" ? "/hecx" : "/premium"}
                >
                  <Icon />
                  <span>{group}</span>
                </Link>
              );
            return (
              <DropdownMenu key={group}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`nav-item ${(group === "More" ? ["/about", "/samples", "/guidelines", "/help", "/activity", "/resources", "/settings"].includes(path) : group === "Create" ? path === "/create" || path.startsWith("/portfolio") || path.startsWith("/projects") : path.startsWith("/" + group.toLowerCase())) ? "active" : ""}`}
                  >
                    <Icon />
                    <span>{group}</span>
                    <ChevronDown className="nav-chevron" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  sideOffset={16}
                  className="mark-menu"
                  align="center"
                >
                  <DropdownMenuLabel>{group}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {activeMenus[group].map((item) => (
                    <DropdownMenuItem key={item} asChild>
                      <Link
                        href={
                          brand && item === "Saved Creators"
                            ? "/brand/saved"
                            : menuHref(group, item)
                        }
                      >
                        {item}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  {group === "More" && (
                    <DropdownMenuItem asChild className="mobile-premium">
                      <Link href="/premium">Premium & Upgrade</Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          },
        )}
      </nav>
    </>
  );
}
