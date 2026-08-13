import type { CategoryId, StatusId } from "@/lib/relay"

// Inner SVG markup for each category glyph (paths taken from lucide-react).
const GLYPH: Record<CategoryId, string> = {
  entrance: `<path d="M11 20H2"/><path d="M11 4.562v16.157a1 1 0 0 0 1.242.97L19 20V5.562a2 2 0 0 0-1.515-1.94l-4-1A2 2 0 0 0 11 4.561z"/><path d="M11 4H8a2 2 0 0 0-2 2v14"/><path d="M14 12h.01"/><path d="M22 20h-3"/>`,
  elevator: `<path d="M12 2v20"/><path d="m8 18 4 4 4-4"/><path d="m8 6 4-4 4 4"/>`,
  restroom: `<path d="M7 12h13a1 1 0 0 1 1 1 5 5 0 0 1-5 5h-.598a.5.5 0 0 0-.424.765l1.544 2.47a.5.5 0 0 1-.424.765H5.402a.5.5 0 0 1-.424-.765L7 18"/><path d="M8 18a5 5 0 0 1-5-5V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8"/>`,
  curb_cut: `<circle cx="16" cy="4" r="1"/><path d="m18 19 1-7-6 1"/><path d="m5 8 3-3 5.5 3-2.36 3.5"/><path d="M4.24 14.5a5 5 0 0 0 6.88 6"/><path d="M13.76 17.5a5 5 0 0 0-6.88-6"/>`,
  blocker: `<rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/>`,
}

const STATUS_COLOR: Record<StatusId, string> = {
  accessible: "var(--accessible)",
  limited: "var(--limited)",
  blocked: "var(--blocked)",
}

/**
 * Builds the HTML for a teardrop map pin: a colored circle (status) holding a
 * white category glyph, with a small pointer beneath it.
 */
export function markerHtml(category: CategoryId, status: StatusId, selected: boolean): string {
  const color = STATUS_COLOR[status]
  const glyph = GLYPH[category]
  const size = selected ? 44 : 36
  const glyphSize = selected ? 22 : 18
  const scale = selected ? "scale(1.06)" : "scale(1)"
  return `
    <div style="transform:${scale};transform-origin:bottom center;transition:transform .15s ease;">
      <div style="
        width:${size}px;height:${size}px;border-radius:9999px;
        background:${color};
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 10px rgba(0,0,0,.35), 0 0 0 3px var(--card);
        ${selected ? "outline:3px solid var(--primary);outline-offset:2px;" : ""}
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="${glyphSize}" height="${glyphSize}" viewBox="0 0 24 24"
          fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          ${glyph}
        </svg>
      </div>
      <div style="
        width:0;height:0;margin:-2px auto 0;
        border-left:6px solid transparent;border-right:6px solid transparent;
        border-top:9px solid ${color};
        filter:drop-shadow(0 3px 2px rgba(0,0,0,.25));
      "></div>
    </div>`
}
