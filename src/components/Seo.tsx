import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

/**
 * The static tags in index.html are not managed by Helmet, so they would
 * otherwise remain in the DOM alongside the per-page ones (duplicate
 * description / og:title). Strip the unmanaged duplicates once mounted.
 */
const DUPLICATE_SELECTORS = [
  'meta[name="description"]:not([data-rh])',
  'meta[property="og:title"]:not([data-rh])',
  'meta[property="og:description"]:not([data-rh])',
  'meta[property="og:url"]:not([data-rh])',
  'meta[name="twitter:title"]:not([data-rh])',
  'meta[name="twitter:description"]:not([data-rh])',
];


export const SITE_URL = "https://www.sheikhpharma.shop";
export const SITE_NAME = "Sheikh Pharma";

interface SeoProps {
  title: string;
  description: string;
  /** Path starting with "/" — used for canonical + og:url */
  path?: string;
  image?: string | null;
  /** Extra JSON-LD blocks (Product, Breadcrumb, etc.) */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

const Seo = ({ title, description, path, image, jsonLd, noindex }: SeoProps) => {
  useEffect(() => {
    DUPLICATE_SELECTORS.forEach((sel) =>
      document.head.querySelectorAll(sel).forEach((el) => el.remove()),
    );
  }, []);

  const url = path ? `${SITE_URL}${path}` : undefined;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {url && <link rel="canonical" href={url} />}
      {noindex && <meta name="robots" content="noindex,follow" />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
      {blocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
};

export default Seo;
