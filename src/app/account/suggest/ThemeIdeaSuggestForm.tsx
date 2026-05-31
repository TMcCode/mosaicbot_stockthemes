"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import styles from "@/app/page.module.css";
import formStyles from "@/app/account/suggest/ThemeIdeaSuggestForm.module.css";

import { capturePostHog } from "@/lib/posthogClient";
import { THEME_IDEAS_EMAIL } from "@/lib/contactEmails";
import { parseThemeNameList, parseTickerList } from "@/lib/parseTickerList";
import { submitThemeIdea, type ThemeIdeaKind } from "@/lib/themeIdeasSubmit";
import { countWords, wordCountInRange } from "@/lib/wordCount";

export type GroupOption = { slug: string; name: string };
export type ThemeOption = { slug: string; name: string; groupName?: string };

type Props = {
  userId: string;
  submitterEmail: string;
  groups: GroupOption[];
  themes: ThemeOption[];
};

const MIN_THEMES = 2;
const MIN_TICKERS = 6;
const MIN_WORDS = 20;
const MAX_WORDS = 300;
const MIN_WEIGHT_CHANGES_CHARS = 5;

export function ThemeIdeaSuggestForm({ userId, submitterEmail, groups, themes }: Props) {
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

  const [editThemeSlug, setEditThemeSlug] = useState(themes[0]?.slug ?? "");
  const [removeTickersRaw, setRemoveTickersRaw] = useState("");
  const [weightChangesRaw, setWeightChangesRaw] = useState("");
  const [editReasoning, setEditReasoning] = useState("");

  const groupNoteWords = useMemo(() => countWords(groupNote), [groupNote]);
  const reasoningWords = useMemo(() => countWords(themeReasoning), [themeReasoning]);
  const editReasoningWords = useMemo(() => countWords(editReasoning), [editReasoning]);
  const themeNames = useMemo(() => parseThemeNameList(themeNamesRaw), [themeNamesRaw]);
  const tickers = useMemo(() => parseTickerList(tickersRaw), [tickersRaw]);
  const tickersToRemove = useMemo(() => parseTickerList(removeTickersRaw), [removeTickersRaw]);
  const selectedGroup = groups.find((g) => g.slug === groupSlug);
  const selectedEditTheme = themes.find((t) => t.slug === editThemeSlug);

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

    if (kind === "theme_in_group") {
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
      return;
    }

    if (!editThemeSlug || !selectedEditTheme) {
      setError("Choose a theme to edit.");
      return;
    }
    const weightChanges = weightChangesRaw.trim();
    if (tickersToRemove.length === 0 && weightChanges.length < MIN_WEIGHT_CHANGES_CHARS) {
      setError("Add tickers to remove and/or describe weight changes (at least one is required).");
      return;
    }
    if (!wordCountInRange(editReasoning, MIN_WORDS, MAX_WORDS)) {
      setError(`Reasoning must be ${MIN_WORDS}–${MAX_WORDS} words (currently ${editReasoningWords}).`);
      return;
    }

    setBusy(true);
    const result = await submitThemeIdea(userId, {
      kind: "theme_edit",
      submitterEmail,
      themeSlug: editThemeSlug,
      themeName: selectedEditTheme.name,
      tickersToRemove,
      weightChanges,
      themeReasoning: editReasoning.trim(),
    });
    setBusy(false);
    if (result.ok) {
      capturePostHog("theme_idea_submitted", {
        kind: "theme_edit",
        theme_slug: editThemeSlug,
        submission_id: result.submissionId,
      });
      setMessage("Thanks — your theme edit suggestion was sent to the stockthemes team.");
      setRemoveTickersRaw("");
      setWeightChangesRaw("");
      setEditReasoning("");
    } else {
      setError(result.error);
    }
  }

  return (
    <div className={formStyles.wrap}>
      <p className={styles.introCopy}>
        Suggestions go to <strong>{THEME_IDEAS_EMAIL}</strong>. We read every submission; not all
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
          Theme in group
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={kind === "theme_edit"}
          className={kind === "theme_edit" ? formStyles.tabActive : formStyles.tab}
          onClick={() => setKind("theme_edit")}
        >
          Edit theme
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
        ) : kind === "theme_in_group" ? (
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
        ) : (
          <>
            <p className={formStyles.field}>
              <label htmlFor="edit-theme-slug">Existing theme</label>
              <select
                id="edit-theme-slug"
                className={formStyles.select}
                value={editThemeSlug}
                onChange={(e) => setEditThemeSlug(e.target.value)}
                required
                disabled={themes.length === 0}
              >
                {themes.length === 0 ? (
                  <option value="">No themes loaded</option>
                ) : (
                  themes.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.groupName ? `${t.name} (${t.groupName})` : t.name}
                    </option>
                  ))
                )}
              </select>
              {selectedEditTheme ? (
                <span className={formStyles.hint}>
                  <Link href={`/themes/${encodeURIComponent(selectedEditTheme.slug)}`}>
                    View current theme page
                  </Link>
                </span>
              ) : null}
            </p>
            <p className={formStyles.field}>
              <label htmlFor="remove-tickers">Tickers to remove (optional)</label>
              <textarea
                id="remove-tickers"
                className={formStyles.textarea}
                value={removeTickersRaw}
                onChange={(e) => setRemoveTickersRaw(e.target.value)}
                placeholder="TICK, ER"
                style={{ minHeight: 72 }}
              />
              <span className={formStyles.hint}>
                Comma or line-separated. {tickersToRemove.length} ticker
                {tickersToRemove.length === 1 ? "" : "s"} parsed.
              </span>
            </p>
            <p className={formStyles.field}>
              <label htmlFor="weight-changes">Weight changes (optional)</label>
              <textarea
                id="weight-changes"
                className={formStyles.textarea}
                value={weightChangesRaw}
                onChange={(e) => setWeightChangesRaw(e.target.value)}
                placeholder={
                  "NVDA 12\nAMD 8\n\nOr describe changes in prose: reduce SMCI, increase VRT…"
                }
                style={{ minHeight: 100 }}
              />
              <span className={formStyles.hint}>
                One ticker + target weight per line, or a short prose description. Provide this
                and/or tickers to remove.
              </span>
            </p>
            <p className={formStyles.field}>
              <label htmlFor="edit-reasoning">Why these edits</label>
              <textarea
                id="edit-reasoning"
                className={formStyles.textarea}
                value={editReasoning}
                onChange={(e) => setEditReasoning(e.target.value)}
                required
              />
              <span
                className={`${formStyles.wordCount} ${editReasoningWords < MIN_WORDS || editReasoningWords > MAX_WORDS ? formStyles.wordCountInvalid : ""}`}
              >
                {editReasoningWords} / {MIN_WORDS}–{MAX_WORDS} words
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
        {" · "}
        <Link href="/themes">Browse themes</Link>
      </p>
    </div>
  );
}
