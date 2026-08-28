"use client";

/* Static export uses native images so the navigation has no image runtime. */
/* eslint-disable @next/next/no-img-element */

import { forwardRef, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowsClockwise,
  BezierCurve,
  Briefcase,
  CalendarDots,
  ChartLineUp,
  FilmReel,
  GridFour,
  Info,
  InstagramLogo,
  LinkedinLogo,
  List,
  Polygon,
  Shapes,
  SidebarSimple,
  Sword,
  Trophy,
  UsersThree,
  UserCircle,
  VideoCamera,
  X,
} from "@phosphor-icons/react";
import type { Icon, IconProps } from "@phosphor-icons/react";
import { ProjectNavLabel } from "./ProjectNavLabel";
import { ThemeToggle } from "./ThemeToggle";
import { basePath, withBasePath } from "../lib/base-path";
import {
  portfolioSummary,
  type PortfolioClient,
  type PortfolioProjectIcon,
} from "../lib/portfolio-summary";
import {
  syncBrowserThemeColor,
  type ColorTheme,
} from "../lib/theme";

const socialLinks = [
  { key: "linkedin", label: "LinkedIn", Icon: LinkedinLogo },
  { key: "instagram", label: "Instagram", Icon: InstagramLogo },
  { key: "vimeo", label: "Vimeo", Icon: VideoCamera },
] as const;

const NoodlingIcon = forwardRef<SVGSVGElement, IconProps>(
  function NoodlingIcon(
    {
      alt,
      color = "currentColor",
      size = "1em",
      mirrored = false,
      weight: ignoredWeight,
      ...props
    },
    ref,
  ) {
    void ignoredWeight;

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        {...props}
      >
        {alt ? <title>{alt}</title> : null}
        <path
          d="M4 13.25C5.55 15.1 8.05 15.75 10.15 14.7C12.55 13.5 13.85 11.55 13.85 9.9C13.85 8.45 13.05 7.65 11.85 7.65C10.4 7.65 9.35 8.95 9.35 10.55C9.35 12.9 11.25 14.4 13.8 14.75C16.15 15.05 18.25 14.25 19.65 13.05"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={mirrored ? "translate(24 0) scale(-1 1)" : undefined}
        />
      </svg>
    );
  },
);

const projectIcons: Record<PortfolioProjectIcon, Icon> = {
  "make-with-notion": Polygon,
  reel: FilmReel,
  "brand-refresh": ArrowsClockwise,
  ipo: ChartLineUp,
  recap: CalendarDots,
  avatars: UserCircle,
  rplace: GridFour,
  "motion-system": BezierCurve,
  awards: Trophy,
  swordsmith: Sword,
  "ai-team": UsersThree,
  "notion-ai-motion": NoodlingIcon,
};

const clientIdentities: Record<
  PortfolioClient,
  { label: string; logo: string; darkLogo?: string }
> = {
  datadog: {
    label: "Datadog",
    logo: "/brand-logos/datadog.svg",
    darkLogo: "/brand-logos/datadog-dark-e9377862.png",
  },
  reddit: { label: "Reddit", logo: "/brand-logos/reddit.png" },
  notion: { label: "Notion", logo: "/brand-logos/notion.png" },
  "black-math": {
    label: "Black Math",
    logo: "/brand-logos/black-math.png",
  },
};

function currentRoute(pathname: string) {
  const route = basePath && pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname;
  return route.replace(/\/$/, "") || "/";
}

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = currentRoute(usePathname());
  const workActive = pathname === "/" || pathname === "/work";
  const navigationRef = useRef<HTMLElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  useEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return;

    let mounted = true;
    let animationFrame = 0;

    const measureScrollBoundary = () => {
      if (!mounted) return;
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const nextCanScrollDown =
          navigation.scrollHeight - navigation.scrollTop - navigation.clientHeight > 1;
        setCanScrollDown((current) =>
          current === nextCanScrollDown ? current : nextCanScrollDown,
        );
      });
    };

    measureScrollBoundary();
    navigation.addEventListener("scroll", measureScrollBoundary, {
      passive: true,
    });

    const resizeObserver = new ResizeObserver(measureScrollBoundary);
    resizeObserver.observe(navigation);
    for (const child of navigation.children) resizeObserver.observe(child);
    void document.fonts.ready.then(measureScrollBoundary);

    return () => {
      mounted = false;
      cancelAnimationFrame(animationFrame);
      navigation.removeEventListener("scroll", measureScrollBoundary);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <>
      <div
        className="workspace-nav-shell"
        data-can-scroll-down={canScrollDown}
      >
        <nav ref={navigationRef} className="workspace-nav" aria-label="Portfolio">
          <ul className="workspace-nav__primary">
            <li>
              <a
                className="workspace-nav__row"
                href={withBasePath("/work/")}
                aria-current={workActive ? "page" : undefined}
                title="Work"
                onClick={onNavigate}
              >
                <Briefcase aria-hidden="true" weight="regular" />
                <span className="nav-row__label">Work</span>
              </a>
            </li>
            <li>
              <a
                className="workspace-nav__row"
                href={withBasePath("/playground/")}
                aria-current={pathname === "/playground" ? "page" : undefined}
                title="Playground"
                onClick={onNavigate}
              >
                <Shapes aria-hidden="true" weight="regular" />
                <span className="nav-row__label">Playground</span>
              </a>
            </li>
            <li>
              <a
                className="workspace-nav__row"
                href={withBasePath("/contact/")}
                aria-current={pathname === "/contact" ? "page" : undefined}
                title="About"
                onClick={onNavigate}
              >
                <Info aria-hidden="true" weight="regular" />
                <span className="nav-row__label">About</span>
              </a>
            </li>
          </ul>

          <div className="sidebar-section">
            <p className="sidebar-label">Projects</p>
            <ul className="project-list">
              {portfolioSummary.covers.map((project) => {
                const route = `/${project.slug}`;
                const ProjectIcon = projectIcons[project.icon];
                return (
                  <li key={project.slug}>
                    <a
                      className="workspace-nav__row workspace-nav__row--project"
                      href={withBasePath(`${route}/`)}
                      aria-current={pathname === route ? "page" : undefined}
                      onClick={onNavigate}
                      aria-label={project.title}
                      title={project.title}
                    >
                      <ProjectIcon
                        aria-hidden="true"
                        data-project-icon={project.icon}
                        weight="regular"
                      />
                      <ProjectNavLabel>{project.title}</ProjectNavLabel>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>
      <div className="workspace-utilities">
        <ThemeToggle />
        <nav className="workspace-socials" aria-label="Social profiles">
          {socialLinks.map(({ key, label, Icon }) => (
            <a
              key={key}
              href={portfolioSummary.socials[key]}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              onClick={onNavigate}
            >
              <Icon aria-hidden="true" weight="regular" />
              <span className="nav-row__label">{label}</span>
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}

function Identity() {
  const pathname = currentRoute(usePathname());
  const currentProject = portfolioSummary.covers.find(
    (project) => pathname === `/${project.slug}`,
  );
  const client = currentProject?.client ?? "datadog";
  const identity = clientIdentities[client];

  return (
    <div className="workspace-identity">
      <a
        className="workspace-brand"
        href={withBasePath("/work/")}
        title={`${identity.label} work by ${portfolioSummary.brand.name}`}
      >
        <span
          className={`brand-mark brand-mark--${client}`}
          role="img"
          aria-label={identity.label}
        >
          <img
            className="brand-logo brand-logo--light"
            src={withBasePath(identity.logo)}
            alt=""
            aria-hidden="true"
            width={128}
            height={128}
            loading="lazy"
            decoding="async"
          />
          {identity.darkLogo ? (
            <img
              className="brand-logo brand-logo--dark"
              src={withBasePath(identity.darkLogo)}
              alt=""
              aria-hidden="true"
              width={128}
              height={128}
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </span>
        <span className="brand-copy">
          <strong>{portfolioSummary.brand.name}</strong>
          <small>{portfolioSummary.brand.role}</small>
        </span>
      </a>
    </div>
  );
}

export function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className="desktop-sidebar" data-collapsed={collapsed}>
      <div className="desktop-sidebar__inner">
        <Identity />
        <button
          className="sidebar-toggle"
          type="button"
          data-sidebar-toggle
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          <SidebarSimple aria-hidden="true" weight="regular" />
          <span className="nav-row__label">
            {collapsed ? "Expand" : "Collapse"}
          </span>
        </button>
        <NavigationLinks />
      </div>
    </aside>
  );
}

export function MobileHeader() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  function syncMobileChrome(scrimmed: boolean) {
    const theme: ColorTheme = document.documentElement.dataset.theme === "dark"
      ? "dark"
      : "light";
    syncBrowserThemeColor(theme, scrimmed);
  }

  function openMenu() {
    setIsOpen(true);
    document.documentElement.classList.add("menu-open");
    syncMobileChrome(true);
    dialogRef.current?.showModal();
  }

  function closeMenu() {
    dialogRef.current?.close();
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      dialogRef.current?.close();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <header className="mobile-header">
      <Identity />
      <button
        ref={triggerRef}
        className="menu-button"
        type="button"
        aria-label="Open navigation"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={openMenu}
      >
        <List aria-hidden="true" weight="regular" />
      </button>
      <dialog
        ref={dialogRef}
        id="mobile-navigation"
        className="mobile-menu"
        aria-label="Site navigation"
        onCancel={(event) => {
          event.preventDefault();
          closeMenu();
        }}
        onClose={() => {
          setIsOpen(false);
          document.documentElement.classList.remove("menu-open");
          syncMobileChrome(false);
          triggerRef.current?.focus();
        }}
      >
        {isOpen ? (
          <>
            <div className="mobile-menu__top">
              <Identity />
              <button
                className="menu-close"
                type="button"
                aria-label="Close navigation"
                onClick={closeMenu}
              >
                <X aria-hidden="true" weight="regular" />
              </button>
            </div>
            <div className="mobile-menu__content">
              <NavigationLinks onNavigate={closeMenu} />
            </div>
          </>
        ) : null}
      </dialog>
    </header>
  );
}
