"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  EnvelopeSimple,
  FilmStrip,
  Info,
  InstagramLogo,
  LinkedinLogo,
  List,
  SidebarSimple,
  VideoCamera,
  X,
} from "@phosphor-icons/react";
import { basePath, portfolio, withBasePath } from "../lib/portfolio";

const socialLinks = [
  { key: "linkedin", label: "LinkedIn", Icon: LinkedinLogo },
  { key: "instagram", label: "Instagram", Icon: InstagramLogo },
  { key: "vimeo", label: "Vimeo", Icon: VideoCamera },
] as const;

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
              return (
                <li key={project.slug}>
                  <a
                    className="workspace-nav__row workspace-nav__row--project"
                    href={withBasePath(`${route}/`)}
                    aria-current={pathname === route ? "page" : undefined}
                    onClick={onNavigate}
                    aria-label={project.title}
                  >
                    <FilmStrip aria-hidden="true" weight="regular" />
                    <span className="nav-row__label">{project.title}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
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
    </>
  );
}

function Identity() {
  return (
    <div className="workspace-identity">
      <a
        className="workspace-brand"
        href={withBasePath("/work/")}
        title={`${portfolio.brand.name}, ${portfolio.brand.role}`}
      >
        <span className="brand-mark">ZR</span>
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
