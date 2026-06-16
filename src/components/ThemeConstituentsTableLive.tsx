"use client";

import { useMemo } from "react";

import { ThemeConstituentsTable } from "@/components/ThemeConstituentsTable";
import { useLiveThemeDetailPrices } from "@/hooks/useLiveThemeDetailPrices";
import { buildThemeConstituentTableModel } from "@/lib/themeConstituentTableModel";
import type { ManifestSelectedDateV0 } from "@/types/manifest.v0";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";

type Props = {
  slug: string;
  dataBaseUrl: string;
  serverDetail: ThemeDetailV0;
  selectedDates?: ManifestSelectedDateV0[];
};

export function ThemeConstituentsTableLive({
  slug,
  dataBaseUrl,
  serverDetail,
  selectedDates,
}: Props) {
  const { detail, livePrices } = useLiveThemeDetailPrices(slug, dataBaseUrl, serverDetail);
  const model = useMemo(() => buildThemeConstituentTableModel(detail), [detail]);
  if (!model.constituentRows.length) return null;
  return (
    <ThemeConstituentsTable
      detail={detail}
      model={model}
      livePrices={livePrices}
      selectedDates={selectedDates}
    />
  );
}
