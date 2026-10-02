import { useMemo, useState } from "react";
import {
  Stethoscope,
  FlaskConical,
  Pill,
  AlertTriangle,
  ShieldAlert,
  Ban,
  Baby,
  Thermometer,
  Info,
  ChevronDown,
  Repeat,
  Syringe,
  type LucideIcon,
} from "lucide-react";

interface Section {
  title: string;
  html: string;
}

const ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /indication|therapeutic/i, icon: Stethoscope },
  { match: /pharmacolog|composition|mode of action/i, icon: FlaskConical },
  { match: /dosage|administration|direction/i, icon: Pill },
  { match: /side ?effect|adverse/i, icon: AlertTriangle },
  { match: /precaution|warning/i, icon: ShieldAlert },
  { match: /contraindicat/i, icon: Ban },
  { match: /pregnan|lactation|child/i, icon: Baby },
  { match: /storage|stability/i, icon: Thermometer },
  { match: /interaction/i, icon: Repeat },
  { match: /overdose|injection/i, icon: Syringe },
];

const iconFor = (title: string): LucideIcon =>
  ICONS.find((i) => i.match.test(title))?.icon ?? Info;

const parseSections = (html: string): Section[] => {
  const out: Section[] = [];
  const re = /<section[^>]*class="product-section"[^>]*>\s*<h3[^>]*>([\s\S]*?)<\/h3>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/section>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const title = m[1].replace(/<[^>]+>/g, "").trim();
    const body = m[2].trim();
    if (title && body.replace(/<[^>]+>/g, "").trim()) out.push({ title, html: body });
  }
  return out;
};

/** Break a raw HTML body into readable blocks: paragraphs, bullet items, label rows. */
type Block =
  | { kind: "para"; html: string }
  | { kind: "bullet"; html: string }
  | { kind: "label"; label: string; html: string };

const MAX_SENTENCES = 3;

const splitLongText = (text: string): string[] => {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g);
  if (!sentences || sentences.length <= MAX_SENTENCES) return [text];
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += MAX_SENTENCES) {
    chunks.push(sentences.slice(i, i + MAX_SENTENCES).join("").trim());
  }
  return chunks.filter(Boolean);
};

const toBlocks = (html: string): Block[] => {
  const normalized = html
    .replace(/<\/(p|div|li|tr)>/gi, "\n")
    .replace(/<(br|\/?ul|\/?ol|li|p|div)[^>]*>/gi, "\n")
    .replace(/&nbsp;/gi, " ");

  const lines = normalized
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.replace(/<[^>]+>/g, "").trim().length > 0);

  const blocks: Block[] = [];
  for (const line of lines) {
    const bulletMatch = line.match(/^\s*(?:[-•*·–]|\d+[.)])\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({ kind: "bullet", html: bulletMatch[1] });
      continue;
    }
    const plain = line.replace(/<[^>]+>/g, "");
    const labelMatch = plain.match(/^([A-Z][A-Za-z0-9 ()/&'-]{2,40}):\s*(.+)$/);
    if (labelMatch && labelMatch[2].length > 0 && !/<[a-z]/i.test(line.slice(0, line.indexOf(":")))) {
      blocks.push({ kind: "label", label: labelMatch[1].trim(), html: labelMatch[2].trim() });
      continue;
    }
    for (const chunk of splitLongText(line)) blocks.push({ kind: "para", html: chunk });
  }
  return blocks;
};

const SectionBody = ({ html }: { html: string }) => {
  const blocks = useMemo(() => toBlocks(html), [html]);

  if (blocks.length === 0) {
    return (
      <div
        className="product-desc-body text-[13px] leading-7 text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {blocks.map((b, i) => {
        if (b.kind === "bullet") {
          return (
            <div key={i} className="flex gap-2.5">
              <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
              <p
                className="product-desc-body flex-1 text-[13px] leading-7 text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: b.html }}
              />
            </div>
          );
        }
        if (b.kind === "label") {
          return (
            <div
              key={i}
              className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2"
            >
              <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
                {b.label}
              </p>
              <p
                className="product-desc-body text-[13px] leading-7 text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: b.html }}
              />
            </div>
          );
        }
        return (
          <p
            key={i}
            className="product-desc-body text-[13px] leading-7 text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: b.html }}
          />
        );
      })}
    </div>
  );
};


const SectionCard = ({ section, index }: { section: Section; index: number }) => {
  const Icon = iconFor(section.title);
  const [open, setOpen] = useState(index < 2);

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md animate-fade-in"
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: "backwards" }}
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-accent" />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 text-sm font-semibold text-foreground md:text-base">
          <span className="bg-gradient-to-r from-primary/60 to-accent/60 bg-[length:100%_2px] bg-bottom bg-no-repeat pb-0.5">
            {section.title}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pl-11">
            <SectionBody html={section.html} />
          </div>
        </div>

      </div>
    </div>
  );
};

const ProductDescriptionSections = ({ html }: { html: string }) => {
  const sections = useMemo(() => parseSections(html), [html]);

  if (sections.length === 0) {
    return (
      <div>
        <h3 className="mb-2 font-semibold text-foreground">Description</h3>
        <SectionBody html={html} />

      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
        Description
        <span className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {sections.length} sections
        </span>
      </h3>
      <div className="space-y-2.5">
        {sections.map((s, i) => (
          <SectionCard key={`${s.title}-${i}`} section={s} index={i} />
        ))}
      </div>
    </div>
  );
};

export default ProductDescriptionSections;
