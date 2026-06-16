"use client";

import { useMemo } from "react";

import { ThemeConstituentsTable } from "@/components/ThemeConstituentsTable";
import { useLiveThemeDetailPrices } from "@/hooks/useLiveThemeDetailPrices";
import { buildThemeConstituentTableModel } from "@/lib/themeConstituentTableModel";
import type { ThemeDetailV0 } from "@/types/theme.detail.v0";

type Props = {
  slug: string;
  dataBaseUrl: string;
  serverDetail: ThemeDetailV0;
};

export function ThemeConstituentsTableLive({ slug, dataBaseUrl, serverDetail }: Props) {
  const { detail, livePrices } = useLiveThemeDetailPrices(slug, dataBaseUrl, serverDetail);
  const model = useMemo(() => buildThemeConstituentTableModel(detail), [detail]);
  if (!model.constituentRows.length) return null;
  return <ThemeConstituentsTable detail={detail} model={model} livePrices={livePrices} />;
}
