import { FeedEventCardBody } from "./FeedEventCardBody";
import {
  FeedEventCardFlipper,
  type FeedEventCardProps,
} from "./FeedEventCardFlipper";

export {
  feedKindClass,
  feedKindLabel,
  holdingsFromChangesPreview,
} from "./FeedEventCardBody";
export type { FeedThemeMeta } from "./FeedEventCardBody";
export type { FeedEventCardProps };

/**
 * Server entry: static cards stay RSC; only ≥3-sibling groups mount the
 * client flipper island.
 */
export function FeedEventCard(props: FeedEventCardProps) {
  const themes =
    Array.isArray(props.siblings) && props.siblings.length >= 3 ? props.siblings : null;
  if (themes) {
    return <FeedEventCardFlipper {...props} />;
  }
  return (
    <FeedEventCardBody
      evt={props.evt}
      dateLabel={props.dateLabel}
      compact={props.compact}
      themeMetaBySlug={props.themeMetaBySlug}
      tickersByThemeSlug={props.tickersByThemeSlug}
      thesisBySlug={props.thesisBySlug}
    />
  );
}
