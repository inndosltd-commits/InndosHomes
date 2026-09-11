import { useEffect, useState } from "react";

export type CmsGlobalNavChild = {
  id: string;
  label: string;
  href: string;
  visible: boolean;
};

export type CmsGlobalNavItem = {
  id: string;
  label: string;
  href: string;
  visible: boolean;
  requiresAuth?: boolean;
  children: CmsGlobalNavChild[];
};

export type CmsGlobalFooterLink = {
  id: string;
  label: string;
  href: string;
  visible: boolean;
};

export type CmsGlobalFooterColumn = {
  id: string;
  title: string;
  visible: boolean;
  links: CmsGlobalFooterLink[];
};

export type CmsGlobalLayoutSectionType =
  | "announcement"
  | "brand"
  | "navigation"
  | "actions"
  | "columns"
  | "contact"
  | "social"
  | "copyright";

export type CmsGlobalLayoutSection = {
  id: string;
  type: CmsGlobalLayoutSectionType;
  label: string;
  visible: boolean;
};

export type CmsGlobalDocument = {
  contentVersion: number;
  header: {
    backgroundColor: string;
    textColor: string;
    mutedTextColor: string;
    accentColor: string;
    borderColor: string;
    layoutSections: CmsGlobalLayoutSection[];
    navItems: CmsGlobalNavItem[];
    listPropertyLabel: string;
    listPropertyHref: string;
    showListProperty: boolean;
    showAuthActions: boolean;
  };
  footer: {
    backgroundColor: string;
    textColor: string;
    mutedTextColor: string;
    accentColor: string;
    layoutSections: CmsGlobalLayoutSection[];
    brandDescription: string;
    contactText: string;
    columns: CmsGlobalFooterColumn[];
    socialLinks: CmsGlobalFooterLink[];
    copyrightText: string;
  };
};

export const DEFAULT_CMS_GLOBAL_DOCUMENT: CmsGlobalDocument = {
  contentVersion: 1,
  header: {
    backgroundColor: "#ffffff",
    textColor: "#111111",
    mutedTextColor: "#6b7280",
    accentColor: "#111111",
    borderColor: "#e5e7eb",
    layoutSections: [
      { id: "header-brand", type: "brand", label: "Brand", visible: true },
      { id: "header-navigation", type: "navigation", label: "Navigation", visible: true },
      { id: "header-actions", type: "actions", label: "Actions", visible: true },
    ],
    navItems: [
      { id: "bnb", label: "B&B", href: "/bnb", visible: true, children: [] },
      {
        id: "rent",
        label: "Rent",
        href: "/search?type=rent",
        visible: true,
        children: [
          { id: "rent-studio", label: "Studio / Bedsitter", href: "/search?type=rent&filter=studio", visible: true },
          { id: "rent-bedrooms", label: "By Bedrooms", href: "/search?type=rent&filter=bedrooms", visible: true },
          { id: "rent-penthouse", label: "Penthouse", href: "/search?type=rent&filter=penthouse", visible: true },
          { id: "rent-compound", label: "Own Compound", href: "/search?type=rent&filter=own-compound", visible: true },
          { id: "rent-condominium", label: "Condominiums", href: "/search?type=rent&filter=condominium", visible: true },
          { id: "rent-office", label: "Office Space", href: "/search?type=rent-business", visible: true },
          { id: "rent-godown", label: "Godowns", href: "/search?type=rent-godown", visible: true },
          { id: "rent-stall", label: "Stalls", href: "/search?type=rent-stall", visible: true },
          { id: "rent-shop", label: "Shops", href: "/search?type=rent-shop", visible: true },
        ],
      },
      { id: "hostels", label: "Hostels", href: "/search?type=hostel", visible: true, children: [] },
      { id: "hotels", label: "Hotels", href: "/search?type=hotel", visible: true, children: [] },
      {
        id: "buy",
        label: "Buy",
        href: "/search?type=sale",
        visible: true,
        children: [
          { id: "buy-apartments", label: "Apartments", href: "/search?type=sale&category=apartments", visible: true },
          { id: "buy-homes", label: "Homes", href: "/search?type=sale&category=homes", visible: true },
          { id: "buy-lands", label: "Lands", href: "/search?type=sale&category=lands", visible: true },
        ],
      },
      { id: "dashboard", label: "Dashboard", href: "/dashboard", visible: true, requiresAuth: true, children: [] },
    ],
    listPropertyLabel: "List Property",
    listPropertyHref: "/add-listing",
    showListProperty: true,
    showAuthActions: true,
  },
  footer: {
    backgroundColor: "#111111",
    textColor: "#ffffff",
    mutedTextColor: "#d1d5db",
    accentColor: "#ffffff",
    layoutSections: [
      { id: "footer-brand", type: "brand", label: "Brand", visible: true },
      { id: "footer-columns", type: "columns", label: "Link columns", visible: true },
      { id: "footer-contact", type: "contact", label: "Contact", visible: true },
      { id: "footer-social", type: "social", label: "Social links", visible: true },
      { id: "footer-copyright", type: "copyright", label: "Copyright", visible: true },
    ],
    brandDescription: "A unified platform connecting Owners, Landlords, Rental Agencies & Property Sellers with Tenants & Buyers.",
    contactText: "Nairobi, Kenya\nsupport@inndos.com\n+254 143 361799",
    columns: [
      {
        id: "platform",
        title: "Platform",
        visible: true,
        links: [
          { id: "platform-rent", label: "Rent", href: "/search?type=rent", visible: true },
          { id: "platform-buy", label: "Buy", href: "/search?type=sale", visible: true },
          { id: "platform-list", label: "List Property", href: "/dashboard", visible: true },
          { id: "platform-pricing", label: "Pricing", href: "/pricing", visible: true },
        ],
      },
      {
        id: "support",
        title: "Support",
        visible: true,
        links: [
          { id: "support-about", label: "About", href: "/about", visible: true },
          { id: "support-help", label: "Help", href: "/help", visible: true },
          { id: "support-terms", label: "Terms", href: "/terms", visible: true },
          { id: "support-privacy", label: "Privacy", href: "/privacy", visible: true },
          { id: "support-contact", label: "Contact", href: "/contact", visible: true },
        ],
      },
      {
        id: "company",
        title: "Company",
        visible: true,
        links: [
          { id: "company-bnb", label: "B&B stays", href: "/bnb", visible: true },
          { id: "company-hostels", label: "Hostels", href: "/search?type=hostel", visible: true },
          { id: "company-hotels", label: "Hotels", href: "/search?type=hotel", visible: true },
        ],
      },
    ],
    socialLinks: [
      { id: "instagram", label: "Instagram", href: "https://www.instagram.com/inndos_global", visible: true },
      { id: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@inndos_global", visible: true },
      { id: "facebook", label: "Facebook", href: "https://www.facebook.com", visible: true },
      { id: "threads", label: "Threads", href: "https://www.threads.com/@inndos_global", visible: true },
      { id: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com", visible: true },
    ],
    copyrightText: "© 2026 inndos. All rights reserved.",
  },
};

export function cloneCmsGlobalDocument(): CmsGlobalDocument {
  return JSON.parse(JSON.stringify(DEFAULT_CMS_GLOBAL_DOCUMENT)) as CmsGlobalDocument;
}

export function normalizeCmsGlobalDocument(value: Partial<CmsGlobalDocument> | null | undefined): CmsGlobalDocument {
  const defaults = cloneCmsGlobalDocument();
  if (!value) return defaults;
  return {
    ...defaults,
    ...value,
    header: { ...defaults.header, ...(value.header ?? {}), layoutSections: value.header?.layoutSections ?? defaults.header.layoutSections },
    footer: { ...defaults.footer, ...(value.footer ?? {}), layoutSections: value.footer?.layoutSections ?? defaults.footer.layoutSections },
  };
}

export function usePublicCmsGlobal() {
  // Kept as a small hook-local fetch instead of a generated query so public
  // chrome remains available even when the optional global CMS record is absent.
  const [document, setDocument] = useState<CmsGlobalDocument>(DEFAULT_CMS_GLOBAL_DOCUMENT);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/cms/public-global")
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!cancelled && payload?.published) setDocument(normalizeCmsGlobalDocument(payload.published));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return document;
}