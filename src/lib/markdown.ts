import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

/**
 * Server-side markdown renderer for feat bodies. Two-step pipeline:
 *   1. marked → raw HTML (we control input shape via flags)
 *   2. DOMPurify with an explicit ALLOWED_* allowlist → safe HTML
 *
 * The output is what we store in feats.body_html and render via
 * dangerouslySetInnerHTML. Nothing from the caller hits the DOM unfiltered.
 */
marked.setOptions({
  gfm: true,
  breaks: false,
  pedantic: false,
});

const ALLOWED_TAGS = [
  "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "em", "del", "ins", "code", "pre", "blockquote",
  "ul", "ol", "li",
  "a",
  "img",
  "table", "thead", "tbody", "tr", "th", "td",
  "kbd", "samp", "sup", "sub",
] as const;

const ALLOWED_ATTR = [
  "href", "title", "alt", "src", "id",
  "colspan", "rowspan",
  "aria-label", "aria-hidden",
  "rel", "target",
] as const;

// Only allow http(s) URLs and same-origin /uploads/ paths.
const URL_RE = /^(?:https?:\/\/|\/uploads\/)/i;

DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
  if (data.attrName === "href" || data.attrName === "src") {
    if (data.attrValue && !URL_RE.test(data.attrValue)) {
      data.keepAttr = false;
    }
  }
});

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    const href = node.getAttribute("href") ?? "";
    if (/^https?:\/\//i.test(href)) {
      node.setAttribute("rel", "noopener nofollow ugc");
      node.setAttribute("target", "_blank");
    }
  }
  if (node.tagName === "IMG") {
    node.setAttribute("loading", "lazy");
    node.setAttribute("decoding", "async");
  }
});

export function renderMarkdown(md: string): string {
  if (!md || !md.trim()) return "";
  const raw = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "link", "meta", "style"],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick", "onmouseover", "onfocus", "formaction"],
  });
}

/** Slugify a title into a URL-safe identifier. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")  // strip combining diacritics
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

const RESERVED_SLUGS = new Set(["new", "edit", "submit", "admin", "api"]);

/** True if the slug looks like a real slug and isn't reserved. */
export function isValidSlug(slug: string): boolean {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,94}[a-z0-9])?$/.test(slug)) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return true;
}
