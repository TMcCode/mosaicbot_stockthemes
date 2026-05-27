/** Constituents table earnings columns on `/themes/[slug]` (see `docs/THEME_CONSTITUENTS_EARNINGS_QUARTER_LOGIC.md`). */

export type ConstituentEarningsColumnId =
  | "prev_report_date"
  | "current_quarter_report_date"
  | "last_quarter_earnings_move"
  | "earnings_move"
  | "intra_quarter_move"
  | "since_last_report";

export type ConstituentEarningsColumnDef = {
  id: ConstituentEarningsColumnId;
  label: string;
  tooltip: string;
};

export const CONSTITUENT_EARNINGS_COLUMNS: ConstituentEarningsColumnDef[] = [
  {
    id: "prev_report_date",
    label: "Prev Rpt",
    tooltip:
      "Previous Quarter Report Date — most recent earnings report on file, with BMO (before market) or AMC (after market) when known.",
  },
  {
    id: "current_quarter_report_date",
    label: "Next Rpt",
    tooltip:
      "Next Expected Report Date — current fiscal quarter (ET): scheduled or completed report when known, otherwise next scheduled date; quarter placeholder if none set yet.",
  },
  {
    id: "last_quarter_earnings_move",
    label: "Lst Q Ern %",
    tooltip:
      "Last Quarter Earnings Move % — earnings-day price move for the prior completed quarter once this quarter has reported; otherwise latest earnings-day reaction on file.",
  },
  {
    id: "earnings_move",
    label: "Ern Move %",
    tooltip:
      "Earnings Move % (LstRpt%) — price change from the pre-earnings anchor through two calendar days after the report (BMO/AMC adjusted). Asterisk (*) = still provisional.",
  },
  {
    id: "intra_quarter_move",
    label: "Intra-Qtr %",
    tooltip:
      "Intra-Quarter Move % — before this quarter reports: change since last earnings report. After reporting: pre-earnings run-up into the current quarter's report.",
  },
  {
    id: "since_last_report",
    label: "Since Rpt %",
    tooltip:
      "Since Last Report % — price change since the last earnings report date, after this quarter counts as reported under ET timing (BMO/AMC).",
  },
];
