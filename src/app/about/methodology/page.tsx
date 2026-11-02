import { permanentRedirect } from "next/navigation";

/** Legacy URL — canonical docs live at `/docs/methodology`. */
export default function AboutMethodologyRedirectPage() {
  permanentRedirect("/docs/methodology");
}
