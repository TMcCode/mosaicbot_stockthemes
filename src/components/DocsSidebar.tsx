"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DOCS_NAV } from "@/lib/docsNav";

import styles from "./DocsSidebar.module.css";

export function DocsSidebar() {
  const pathname = usePathname() || "";
  const onHub = pathname === "/docs" || pathname === "/docs/";

  return (
    <aside className={styles.rail} aria-label="Documentation">
      <div className={styles.railInner}>
        <Link href="/docs" className={styles.brand}>
          Documentation
        </Link>
        <nav className={styles.nav}>
          <ul className={styles.list}>
            {DOCS_NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={active ? `${styles.link} ${styles.linkActive}` : styles.link}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {onHub ? null : (
          <p className={styles.hint}>
            <Link href="/docs">All docs</Link>
          </p>
        )}
      </div>
    </aside>
  );
}
