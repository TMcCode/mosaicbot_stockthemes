import type { CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { normalizeCommentaryEntryType } from "@/lib/commentaryDisplay";

import styles from "./CommentaryNote.module.css";

type Props = {
  note: string;
  entryType?: string;
  className?: string;
  clampLines?: number;
};

export function CommentaryNote({ note, entryType, className, clampLines }: Props) {
  const kind = normalizeCommentaryEntryType(entryType);
  const clampStyle =
    clampLines && clampLines > 0
      ? ({ WebkitLineClamp: clampLines } as CSSProperties)
      : undefined;

  if (kind === "nightly") {
    return (
      <div
        className={`${styles.markdown} ${className ?? ""} ${clampLines ? styles.clamp : ""}`}
        style={clampStyle}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note}</ReactMarkdown>
      </div>
    );
  }

  return (
    <p
      className={`${styles.regular} ${className ?? ""} ${clampLines ? styles.clamp : ""}`}
      style={clampStyle}
    >
      {note}
    </p>
  );
}
