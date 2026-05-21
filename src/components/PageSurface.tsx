import type { ReactNode } from "react";

import { PageBorderDeco } from "@/components/PageBorderDeco";

import pageStyles from "@/app/page.module.css";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Standard page shell: themed background, gutter deco, centered main column. */
export function PageSurface({ children, className }: Props) {
  const rootClass = ["st-surface", pageStyles.page, className].filter(Boolean).join(" ");
  return (
    <div className={rootClass}>
      <PageBorderDeco />
      {children}
    </div>
  );
}
