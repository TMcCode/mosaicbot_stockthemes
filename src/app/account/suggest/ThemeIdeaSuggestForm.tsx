"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import styles from "@/app/page.module.css";
import formStyles from "@/app/account/suggest/ThemeIdeaSuggestForm.module.css";

import { capturePostHog } from "@/lib/posthogClient";
import { parseThemeNameList, parseTickerList } from "@/lib/parseTickerList";
import { submitThemeIdea, type ThemeIdeaKind } from "@/lib/themeIdeasSubmit";
import { countWords, wordCountInRange } from "@/lib/wordCount";

export type GroupOption = { slug: string; name: string };

type Props = {
  userId: string;
  submitterEmail: string;
  groups: GroupOption[];
};

const MIN_THEMES = 2;
const MIN_TICKERS = 6;
const MIN_WORDS = 20;
const MAX_WORDS = 300;

export function ThemeIdeaSuggestForm({ userId, submitterEmail, groups }: Props) {
  const [kind, setKind] = useState<ThemeIdeaKind>("new_group");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [groupName, setGroupName] = useState("");
  const [themeNamesRaw, setThemeNamesRaw] = useState("");
  const [groupNote, setGroupNote] = useState("");

  const [groupSlug, setGroupSlug] = useState(groups[0]?.slug ?? "");
  const [themeName, setThemeName] = useState("");
  const [tickersRaw, setTickersRaw] = useState("");
  const [themeReasoning, setThemeReasoning] = useState("");

  const groupNoteWords = useMemo(() => countWords(groupNote), [groupNote]);
  const reasoningWords = useMemo(() => countWords(themeReasoning), [themeReasoning]);
  const themeNames = useMemo(() => parseThemeNameList(themeNamesRaw), [themeNamesRaw]);
  const tickers = useMemo(() => parseTickerList(tickersRaw), [tickersRaw]);
  const selectedGroup = groups.find((g) => g.slug === groupSlug);

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setMessage(null);
    setError(null);

    if (kind === "new_group") {
      if (!groupName.trim()) {
        setError("Enter a proposed group name.");
        return;
      }
      if (themeNames.length < MIN_THEMES) {
        setError(`Include at least ${MIN_THEMES} themes (one per line).`);
        return;
      }
      if (!wordCountInRange(groupNote, MIN_WORDS, MAX_WORDS)) {
        setError(`Group note must be ${MIN_WORDS}–${MAX_WORDS} words (currently ${groupNoteWords}).`);
        return;
      }
      setBusy(true);
      const result = await submitThemeIdea(userId, {
        kind: "new_group",
        submitterEmail,
        groupName: groupName.trim(),
        themeNames,
        groupNote: groupNote.trim(),
      });
      setBusy(false);
      if (result.ok) {
        capturePostHog("theme_idea_submitted", { kind: "new_group", submission_id: result.submissionId });
        setMessage("Thanks — your group suggestion was sent to the stockthemes team.");
        setGroupName("");
        setThemeNamesRaw("");
        setGroupNote("");
      } else {
        setError(result.error);
      }
      return;
    }

    if (!groupSlug || !selectedGroup) {
      setError("Choose a group.");
      return;
    }
    if (!themeName.trim()) {
      setError("Enter a theme name.");
      return;
    }
    if (tickers.length < MIN_TICKERS) {
      setError(`Include at least ${MIN_TICKERS} tickers (comma or line-separated).`);
      return;
    }
    if (!wordCountInRange(themeReasoning, MIN_WORDS, MAX_WORDS)) {
      setError(`Reasoning must be ${MIN_WORDS}–${MAX_WORDS} words (currently ${reasoningWords}).`);
      return;
    }

    setBusy(true);
    const result = await submitThemeIdea(userId, {
      kind: "theme_in_group",
      submitterEmail,
      groupSlug,
      groupName: selectedGroup.name,
      themeName: themeName.trim(),
      tickers,
      themeReasoning: themeReasoning.trim(),
    });
    setBusy(false);
    if (result.ok) {
      capturePostHog("theme_idea_submitted", {
        kind: "theme_in_group",
        group_slug: groupSlug,
        submission_id: result.submissionId,
      });
      setMessage("Thanks — your theme suggestion was sent to the stockthemes team.");
      setThemeName("");
      setTickersRaw("");
      setThemeReasoning("");
    } else {
      setError(result.error);
    }
  }

  return (
    <div className={formStyles.wrap}>
      <p className={styles.introCopy}>
        Suggestions go to <strong>themeideas@stockthemes.ai</strong>. We read every submission; not all
        ideas are published.
      </p>

      <div className={formStyles.tabs} role="tablist" aria-label="Suggestion type">
        <button
          type="button"
          role="tab"
          aria-selected={kind === "new_group"}
          className={kind === "new_group" ? formStyles.tabActive : formStyles.tab}
          onClick={() => setKind("new_group")}
        >
          New group
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={kind === "theme_in_group"}
          className={kind === "theme_in_group" ? formStyles.tabActive : formStyles.tab}
          onClick={() => setKind("theme_in_group")}
        >
          Theme in existing group
        </button>
      </div>

      <form className={formStyles.form} onSubmit={(ev) => void onSubmit(ev)}>
        <div className={formStyles.honeypot} aria-hidden="true">
          <input type="text" name="_honey" tabIndex={-1} autoComplete="off" />
        </div>

        <p className={formStyles.field}>
          <label htmlFor="submitter-email">Your email</label>
          <input
            id="submitter-email"
            className={formStyles.input}
            type="email"
            value={submitterEmail}
            readOnly
          />
        </p>

        {kind === "new_group" ? (
          <>
            <p className={formStyles.field}>
              <label htmlFor="group-name">Proposed group name</label>
              <input
                id="group-name"
                className={formStyles.input}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                maxLength={120}
              />
            </p>
            <p className={formStyles.field}>
              <label htmlFor="theme-names">Themes to include (at least {MIN_THEMES})</label>
              <textarea
                id="theme-names"
                className={formStyles.textarea}
                value={themeNamesRaw}
                onChange={(e) => setThemeNamesRaw(e.target.value)}
                placeholder={"Theme A\nTheme B\nTheme C"}
                required
              />
              <span className={formStyles.hint}>One theme per line. {themeNames.length} listed.</span>
            </p>
            <p className={formStyles.field}>
              <label htmlFor="group-note">Why this deserves its own group</label>
              <textarea
                id="group-note"
                className={formStyles.textarea}
                value={groupNote}
                onChange={(e) => setGroupNote(e.target.value)}
                placeholder="Why separate from existing groups? What future sub-themes might follow?"
                required
              />
              <span
                className={`${formStyles.wordCount} ${groupNoteWords < MIN_WORDS || groupNoteWords > MAX_WORDS ? formStyles.wordCountInvalid : ""}`}
              >
                {groupNoteWords} / {MIN_WORDS}–{MAX_WORDS} words
              </span>
            </p>
          </>
        ) : (
          <>
            <p className={formStyles.field}>
              <label htmlFor="group-slug">Existing group</label>
              <select
                id="group-slug"
                className={formStyles.select}
                value={groupSlug}
                onChange={(e) => setGroupSlug(e.target.value)}
                required
                disabled={groups.length === 0}
              >
                {groups.length === 0 ? (
                  <option value="">No groups loaded</option>
                ) : (
                  groups.map((g) => (
                    <option key={g.slug} value={g.slug}>
                      {g.name}
                    </option>
                  ))
                )}
              </select>
            </p>
            <p className={formStyles.field}>
              <label htmlFor="theme-name">Proposed theme name</label>
              <input
                id="theme-name"
                className={formStyles.input}
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                required
                maxLength={160}
              />
            </p>
            <p className={formStyles.field}>
              <label htmlFor="tickers">Tickers (at least {MIN_TICKERS})</label>
              <textarea
                id="tickers"
                className={formStyles.textarea}
                value={tickersRaw}
                onChange={(e) => setTickersRaw(e.target.value)}
                placeholder="NVDA, AMD, AVGO, MRVL, ANET, VRT"
                required
              />
              <span className={formStyles.hint}>{tickers.length} tickers parsed.</span>
            </p>
            <p className={formStyles.field}>
              <label htmlFor="theme-reasoning">Why this theme and these tickers</label>
              <textarea
                id="theme-reasoning"
                className={formStyles.textarea}
                value={themeReasoning}
                onChange={(e) => setThemeReasoning(e.target.value)}
                required
              />
              <span
                className={`${formStyles.wordCount} ${reasoningWords < MIN_WORDS || reasoningWords > MAX_WORDS ? formStyles.wordCountInvalid : ""}`}
              >
                {reasoningWords} / {MIN_WORDS}–{MAX_WORDS} words
              </span>
            </p>
          </>
        )}

        <button type="submit" className={formStyles.submit} disabled={busy}>
          {busy ? "Sending…" : "Submit suggestion"}
        </button>
      </form>

      {message ? <p className={formStyles.messageOk}>{message}</p> : null}
      {error ? <p className={formStyles.messageErr}>{error}</p> : null}

      <p className={styles.introCopy} style={{ marginTop: 24 }}>
        <Link href="/account">← Account</Link>
        {" · "}
        <Link href="/groups">Browse groups</Link>
      </p>
    </div>
  );
}
