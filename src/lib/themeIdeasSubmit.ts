/** Inbox for theme / group suggestions (FormSubmit.co on static Pages). */
import { THEME_IDEAS_EMAIL } from "@/lib/contactEmails";

export { THEME_IDEAS_EMAIL };

export type {
  ThemeIdeaKind,
  NewGroupPayload,
  ThemeInGroupPayload,
  ThemeEditPayload,
  ThemeIdeaPayload,
} from "@/lib/themeIdeas/payload";

import { recordThemeIdeaSubmission } from "@/lib/themeIdeas/recordSubmission";
import type { ThemeIdeaPayload } from "@/lib/themeIdeas/payload";

function subjectFor(payload: ThemeIdeaPayload): string {
  if (payload.kind === "new_group") {
    return `[stockthemes] New group: ${payload.groupName}`;
  }
  if (payload.kind === "theme_edit") {
    return `[stockthemes] Edit theme: ${payload.themeName}`;
  }
  return `[stockthemes] Theme in ${payload.groupName}: ${payload.themeName}`;
}

function bodyFields(payload: ThemeIdeaPayload): Record<string, string> {
  if (payload.kind === "new_group") {
    return {
      submission_type: "New group",
      submitter_email: payload.submitterEmail,
      group_name: payload.groupName,
      themes_included: payload.themeNames.join("\n"),
      theme_count: String(payload.themeNames.length),
      group_note: payload.groupNote,
    };
  }
  if (payload.kind === "theme_edit") {
    return {
      submission_type: "Edit existing theme",
      submitter_email: payload.submitterEmail,
      theme_slug: payload.themeSlug,
      theme_name: payload.themeName,
      tickers_to_remove:
        payload.tickersToRemove.length > 0 ? payload.tickersToRemove.join(", ") : "(none)",
      remove_count: String(payload.tickersToRemove.length),
      weight_changes: payload.weightChanges.trim() || "(none)",
      edit_reasoning: payload.themeReasoning,
    };
  }
  return {
    submission_type: "Theme in existing group",
    submitter_email: payload.submitterEmail,
    group_slug: payload.groupSlug,
    group_name: payload.groupName,
    theme_name: payload.themeName,
    tickers: payload.tickers.join(", "),
    ticker_count: String(payload.tickers.length),
    theme_reasoning: payload.themeReasoning,
  };
}

async function sendThemeIdeaEmail(
  payload: ThemeIdeaPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(THEME_IDEAS_EMAIL)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      _subject: subjectFor(payload),
      _template: "table",
      _captcha: "false",
      ...bodyFields(payload),
    }),
  });

  let data: { success?: string; message?: string } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    /* ignore */
  }

  if (res.ok && data.success === "true") {
    return { ok: true };
  }

  const msg =
    typeof data.message === "string" && data.message.trim()
      ? data.message.trim()
      : `Could not send your suggestion. Try again or email ${THEME_IDEAS_EMAIL} directly.`;
  return { ok: false, error: msg };
}

export type ThemeIdeaSubmitResult =
  | { ok: true; submissionId: string }
  | { ok: false; error: string };

/**
 * Saves to Supabase (contributor ledger), then emails the team via FormSubmit.co.
 * Works on static GitHub Pages — both steps run in the browser.
 */
export async function submitThemeIdea(
  userId: string,
  payload: ThemeIdeaPayload,
): Promise<ThemeIdeaSubmitResult> {
  const saved = await recordThemeIdeaSubmission(userId, payload);
  if (!saved.ok) {
    return saved;
  }

  const emailed = await sendThemeIdeaEmail(payload);
  if (!emailed.ok) {
    const shortId = saved.id.slice(0, 8);
    return {
      ok: false,
      error: `${emailed.error} Your suggestion was saved (ref ${shortId}); try again or email ${THEME_IDEAS_EMAIL}.`,
    };
  }

  return { ok: true, submissionId: saved.id };
}
