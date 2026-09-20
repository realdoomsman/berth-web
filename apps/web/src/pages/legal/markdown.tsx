import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** `**bold**`, `` `code` ``, `[label](href)`, `_emphasis_` — first match wins, left to right. */
const INLINE = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|_([^_\n]+)_/g;

const inline = (text: string, key: string): ReactNode[] => {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  INLINE.lastIndex = 0;
  for (let m = INLINE.exec(text); m !== null; m = INLINE.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1] !== undefined) out.push(<strong key={k}>{m[1]}</strong>);
    else if (m[2] !== undefined) out.push(<code key={k}>{m[2]}</code>);
    else if (m[3] !== undefined && m[4] !== undefined) {
      const href = m[4];
      out.push(
        href.startsWith("/") ? (
          <Link key={k} to={href}>
            {m[3]}
          </Link>
        ) : (
          <a key={k} href={href} target="_blank" rel="noreferrer noopener">
            {m[3]}
          </a>
        ),
      );
    } else out.push(<em key={k}>{m[5]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};

const HEADING = /^(#{1,3})\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const NUMBERED = /^\d+\.\s+(.*)$/;

const H3_CLASS = "mt-6 mb-1 text-[0.95rem] font-semibold text-fg";

/**
 * Dependency-free renderer for the legal docs in `public/legal`: headings, paragraphs,
 * `-` bullets, numbered steps, and the inline marks above. Anything else renders as text.
 */
export const Markdown = ({ source }: { source: string }) => {
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let items: string[] = [];
  let ordered = false;

  const flush = () => {
    if (para.length > 0) {
      const text = para.join(" ");
      blocks.push(<p key={`p${blocks.length}`}>{inline(text, `p${blocks.length}`)}</p>);
      para = [];
    }
    if (items.length > 0) {
      const key = `l${blocks.length}`;
      const lis = items.map((it, n) => <li key={`${key}-${n}`}>{inline(it, `${key}-${n}`)}</li>);
      blocks.push(
        ordered ? (
          <ol key={key} className="list-decimal pl-5">
            {lis}
          </ol>
        ) : (
          <ul key={key}>{lis}</ul>
        ),
      );
      items = [];
    }
  };

  for (const raw of source.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      flush();
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      const key = `h${blocks.length}`;
      const body = inline(heading[2], key);
      if (heading[1].length === 1) blocks.push(<h1 key={key}>{body}</h1>);
      else if (heading[1].length === 2) blocks.push(<h2 key={key}>{body}</h2>);
      else
        blocks.push(
          <h3 key={key} className={H3_CLASS}>
            {body}
          </h3>,
        );
      continue;
    }
    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    if (bullet || numbered) {
      const isOrdered = !bullet;
      if (items.length > 0 && ordered !== isOrdered) flush();
      if (para.length > 0) flush();
      ordered = isOrdered;
      items.push((bullet ? bullet[1] : numbered![1]).trim());
      continue;
    }
    // Continuation line of a list item or a paragraph.
    if (items.length > 0) items[items.length - 1] += ` ${line.trim()}`;
    else para.push(line.trim());
  }
  flush();

  return <div className="prose-legal">{blocks}</div>;
};
