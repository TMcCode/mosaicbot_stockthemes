import { permanentRedirect } from "next/navigation";

/** Legacy URL — canonical docs live at `/docs/about`. */
export default function AboutRedirectPage() {
  permanentRedirect("/docs/about");
}
