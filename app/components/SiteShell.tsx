import { DesktopSidebar, MobileHeader } from "./SiteNavigation";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="site-frame" id="top">
        <DesktopSidebar />
        <section className="workspace-panel" aria-label="Portfolio workspace">
          <MobileHeader />
          <div className="main-column">
            <main id="main-content" className="site-main" tabIndex={-1}>
              {children}
            </main>
            <footer className="site-footer">
              <p>© {new Date().getFullYear()} Zeyu Ren</p>
              <a href="mailto:hello@zeyuren.com">Email</a>
            </footer>
          </div>
        </section>
      </div>
    </>
  );
}
