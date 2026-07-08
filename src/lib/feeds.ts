/**
 * Tiny Atom 1.0 feed builder. No dependency — we just emit a few hundred
 * bytes of XML and let the consumer (any RSS reader, including Feedbin /
 * NetNewsWire / etc.) handle the rest.
 */

export type FeedEntry = {
  id: string;          // permalink or stable URN
  title: string;
  url: string;
  updated: string;     // ISO timestamp
  summary?: string;
  author?: string;
};

export type Feed = {
  title: string;
  subtitle?: string;
  feedUrl: string;     // canonical URL of this feed
  siteUrl: string;     // canonical URL of the site
  updated: string;
  entries: FeedEntry[];
};

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export function renderAtom(feed: Feed): string {
  const entries = feed.entries
    .map((e) => `
  <entry>
    <id>${escapeXml(e.id)}</id>
    <title>${escapeXml(e.title)}</title>
    <link rel="alternate" type="text/html" href="${escapeXml(e.url)}"/>
    <updated>${escapeXml(e.updated)}</updated>
    ${e.author ? `<author><name>${escapeXml(e.author)}</name></author>` : ""}
    ${e.summary ? `<summary type="text">${escapeXml(e.summary)}</summary>` : ""}
  </entry>`)
    .join("");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(feed.title)}</title>
  ${feed.subtitle ? `<subtitle>${escapeXml(feed.subtitle)}</subtitle>` : ""}
  <link rel="self" type="application/atom+xml" href="${escapeXml(feed.feedUrl)}"/>
  <link rel="alternate" type="text/html" href="${escapeXml(feed.siteUrl)}"/>
  <id>${escapeXml(feed.feedUrl)}</id>
  <updated>${escapeXml(feed.updated)}</updated>${entries}
</feed>
`;
}
