import { permanentRedirect } from "next/navigation";

/** Legacy URL — renamed to `/most-talked-about` (conversation heat, not a long book). */
export default function ThemesInMotionRedirectPage() {
  permanentRedirect("/most-talked-about");
}
