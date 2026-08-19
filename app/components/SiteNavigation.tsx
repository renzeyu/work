"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ArrowsClockwise,
  BezierCurve,
  Briefcase,
  CalendarDots,
  ChartLineUp,
  EnvelopeSimple,
  FilmReel,
  GridFour,
  Info,
  InstagramLogo,
  LinkedinLogo,
  List,
  SidebarSimple,
  Sword,
  Trophy,
  UserCircle,
  VideoCamera,
  X,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { ThemeToggle } from "./ThemeToggle";
import {
  basePath,
  portfolio,
  type PortfolioClient,
  type PortfolioProjectIcon,
  withBasePath,
} from "../lib/portfolio";

const socialLinks = [
  { key: "linkedin", label: "LinkedIn", Icon: LinkedinLogo },
  { key: "instagram", label: "Instagram", Icon: InstagramLogo },
  { key: "vimeo", label: "Vimeo", Icon: VideoCamera },
] as const;

const projectIcons: Record<PortfolioProjectIcon, Icon> = {
  reel: FilmReel,
  "brand-refresh": ArrowsClockwise,
  ipo: ChartLineUp,
  recap: CalendarDots,
  avatars: UserCircle,
  rplace: GridFour,
  "motion-system": BezierCurve,
  awards: Trophy,
  swordsmith: Sword,
};

const clientIdentities: Record<
  PortfolioClient,
  { label: string; logo?: string }
> = {
  datadog: { label: "Datadog", logo: "/brand-logos/datadog.svg" },
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

  return (
    <>
      <nav className="workspace-nav" aria-label="Portfolio">
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
              <span className="nav-count">{portfolio.covers.length}</span>
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
          <li>
            <a
              className="workspace-nav__row"
              href="mailto:hello@zeyuren.com"
              title="Email"
              onClick={onNavigate}
            >
              <EnvelopeSimple aria-hidden="true" weight="regular" />
              <span className="nav-row__label">Email</span>
            </a>
          </li>
        </ul>

        <div className="sidebar-section">
          <p className="sidebar-label">Project pages</p>
          <ul className="project-list">
            {portfolio.covers.map((project) => {
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
                  >
                    <ProjectIcon
                      aria-hidden="true"
                      data-project-icon={project.icon}
                      weight="regular"
                    />
                    <span className="nav-row__label">{project.title}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
      <div className="workspace-utilities">
        <ThemeToggle />
        <nav className="workspace-socials" aria-label="Social profiles">
          {socialLinks.map(({ key, label, Icon }) => (
            <a
              key={key}
              href={portfolio.socials[key]}
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
  const currentProject = portfolio.covers.find(
    (project) => pathname === `/${project.slug}`,
  );
  const client = currentProject?.client ?? "datadog";
  const identity = clientIdentities[client];

  return (
    <div className="workspace-identity">
      <a
        className="workspace-brand"
        href={withBasePath("/work/")}
        title={`${identity.label} work by ${portfolio.brand.name}`}
      >
        <span className={`brand-mark brand-mark--${client}`}>
          {identity.logo ? (
            <Image
              src={withBasePath(identity.logo)}
              alt={identity.label}
              width={128}
              height={128}
              unoptimized
            />
          ) : null}
        </span>
        <span className="brand-copy">
          <strong>{portfolio.brand.name}</strong>
          <small>{portfolio.brand.role}</small>
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
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          <SidebarSimple aria-hidden="true" weight="regular" />
          <span className="nav-row__label">{collapsed ? "Expand" : "Collapse"}</span>
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

  function openMenu() {
    setIsOpen(true);
    document.documentElement.classList.add("menu-open");
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
          triggerRef.current?.focus();
        }}
      >
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
      </dialog>
    </header>
  );
}
