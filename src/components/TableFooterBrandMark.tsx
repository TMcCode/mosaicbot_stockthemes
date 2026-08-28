import { brandAssetPath } from "@/lib/siteUrl";

type Props = {
  className?: string;
};

/** Icon-only footer mark — readable on light and dark table backgrounds. */
export function TableFooterBrandMark({ className }: Props) {
  return (
    <div className={className} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={brandAssetPath("/brand/logo-icon.svg")}
        alt=""
        width={22}
        height={22}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
