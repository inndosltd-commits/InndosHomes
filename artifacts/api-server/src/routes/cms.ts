import { Router, type Request, type Response } from "express";
import { createHash } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, cmsPages, users } from "@workspace/db";
import { requireAuth } from "../lib/requireAuth";

type CmsItem = {
  title: string;
  body: string;
  href?: string;
  imageSrc?: string;
  imageAlt?: string;
  iconKey?: "search" | "clipboard-list" | "link" | "home" | "star" | "bed";
  number?: string;
};

type CmsAction = {
  id: string;
  label: string;
  href: string;
  placement: "header" | "footer";
  variant: "ghost" | "primary" | "outline";
};

type CmsSectionSettings = {
  componentKey?: "home-map-search" | "home-process" | "home-property-collection" | "home-bnb-hotels";
  collectionType?: "featured" | "all" | "rent" | "sale" | "bnb-hotels";
  limit?: number;
  emptyStateText?: string;
  searchPlaceholder?: string;
  resultCountLabel?: string;
  showLocateButton?: boolean;
  mapHeight?: number;
  formSubjects?: string[];
  successTitle?: string;
  successText?: string;
  maxPrice?: number;
  actions?: CmsAction[];
};

export type CmsSection = {
  id: string;
  type: "hero" | "content" | "feature" | "cta";
  label: string;
  eyebrow: string;
  title: string;
  body: string;
  buttonText: string;
  buttonHref: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  items: CmsItem[];
  visible: boolean;
  componentKey?: CmsSectionSettings["componentKey"];
  settings?: CmsSectionSettings;
};

export type CmsDocument = {
  templateKey?: "home" | "about" | "contact" | "pricing" | "bnb" | "terms" | "privacy" | "dashboard";
  contentVersion?: number;
  pageTitle: string;
  metaDescription: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  sections: CmsSection[];
};

type CmsGlobalNavChild = {
  id: string;
  label: string;
  href: string;
  visible: boolean;
};

type CmsGlobalNavItem = {
  id: string;
  label: string;
  href: string;
  visible: boolean;
  requiresAuth?: boolean;
  children: CmsGlobalNavChild[];
};

type CmsGlobalFooterLink = {
  id: string;
  label: string;
  href: string;
  visible: boolean;
};

type CmsGlobalFooterColumn = {
  id: string;
  title: string;
  visible: boolean;
  links: CmsGlobalFooterLink[];
};

type CmsGlobalLayoutSectionType =
  | "announcement"
  | "brand"
  | "navigation"
  | "actions"
  | "columns"
  | "contact"
  | "social"
  | "copyright";

type CmsGlobalLayoutSection = {
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

const GLOBAL_CMS_SLUG = "__global__";
const GLOBAL_CONTENT_VERSION = 1;

const cmsItemSchema = z.object({
  title: z.string(),
  body: z.string(),
  href: z.string().optional(),
  imageSrc: z.string().optional(),
  imageAlt: z.string().optional(),
  iconKey: z.enum(["search", "clipboard-list", "link", "home", "star", "bed"]).optional(),
  number: z.string().optional(),
}).strict();

const cmsActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  placement: z.enum(["header", "footer"]),
  variant: z.enum(["ghost", "primary", "outline"]),
}).strict();

const cmsSectionSettingsSchema = z.object({
  componentKey: z.enum(["home-map-search", "home-process", "home-property-collection", "home-bnb-hotels"]).optional(),
  collectionType: z.enum(["featured", "all", "rent", "sale", "bnb-hotels"]).optional(),
  limit: z.number().int().min(1).max(24).optional(),
  emptyStateText: z.string().optional(),
  searchPlaceholder: z.string().optional(),
  resultCountLabel: z.string().optional(),
  showLocateButton: z.boolean().optional(),
  mapHeight: z.number().int().min(320).max(900).optional(),
  formSubjects: z.array(z.string().min(1)).max(20).optional(),
  successTitle: z.string().optional(),
  successText: z.string().optional(),
  maxPrice: z.number().int().min(1).max(1000000).optional(),
  actions: z.array(cmsActionSchema).optional(),
}).strict();

const cmsSectionSchema = z.object({
  id: z.string(),
  type: z.enum(["hero", "content", "feature", "cta"]),
  label: z.string(),
  eyebrow: z.string(),
  title: z.string(),
  body: z.string(),
  buttonText: z.string(),
  buttonHref: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
  accentColor: z.string(),
  items: z.array(cmsItemSchema),
  visible: z.boolean(),
  componentKey: z.enum(["home-map-search", "home-process", "home-property-collection", "home-bnb-hotels"]).optional(),
  settings: cmsSectionSettingsSchema.optional(),
}).strict();

const cmsDocumentSchema = z.object({
  templateKey: z.enum(["home", "about", "contact", "pricing", "bnb", "terms", "privacy", "dashboard"]).optional(),
  contentVersion: z.number().int().optional(),
  pageTitle: z.string(),
  metaDescription: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
  accentColor: z.string(),
  sections: z.array(cmsSectionSchema),
}).strict();

const cmsGlobalNavChildSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  visible: z.boolean(),
}).strict();

const cmsGlobalNavItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  visible: z.boolean(),
  requiresAuth: z.boolean().optional(),
  children: z.array(cmsGlobalNavChildSchema),
}).strict();

const cmsGlobalFooterLinkSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  visible: z.boolean(),
}).strict();

const cmsGlobalLayoutSectionSchema = z.object({
  id: z.string(),
  type: z.enum(["announcement", "brand", "navigation", "actions", "columns", "contact", "social", "copyright"]),
  label: z.string(),
  visible: z.boolean(),
}).strict();

const cmsGlobalDocumentSchema = z.object({
  contentVersion: z.number().int(),
  header: z.object({
    backgroundColor: z.string(),
    textColor: z.string(),
    mutedTextColor: z.string(),
    accentColor: z.string(),
    borderColor: z.string(),
    layoutSections: z.array(cmsGlobalLayoutSectionSchema).default([
      { id: "header-brand", type: "brand", label: "Brand", visible: true },
      { id: "header-navigation", type: "navigation", label: "Navigation", visible: true },
      { id: "header-actions", type: "actions", label: "Actions", visible: true },
    ]),
    navItems: z.array(cmsGlobalNavItemSchema),
    listPropertyLabel: z.string(),
    listPropertyHref: z.string(),
    showListProperty: z.boolean(),
    showAuthActions: z.boolean(),
  }).strict(),
  footer: z.object({
    backgroundColor: z.string(),
    textColor: z.string(),
    mutedTextColor: z.string(),
    accentColor: z.string(),
    layoutSections: z.array(cmsGlobalLayoutSectionSchema).default([
      { id: "footer-brand", type: "brand", label: "Brand", visible: true },
      { id: "footer-columns", type: "columns", label: "Link columns", visible: true },
      { id: "footer-contact", type: "contact", label: "Contact", visible: true },
      { id: "footer-social", type: "social", label: "Social links", visible: true },
      { id: "footer-copyright", type: "copyright", label: "Copyright", visible: true },
    ]),
    brandDescription: z.string(),
    contactText: z.string(),
    columns: z.array(z.object({
      id: z.string(),
      title: z.string(),
      visible: z.boolean(),
      links: z.array(cmsGlobalFooterLinkSchema),
    }).strict()),
    socialLinks: z.array(cmsGlobalFooterLinkSchema),
    copyrightText: z.string(),
  }).strict(),
}).strict();

const DASHBOARD_PANEL_PAGES = [
  { slug: "/dashboard-list-property", label: "List property form" },
  { slug: "/dashboard-settings", label: "My profile" },
  { slug: "/dashboard-messages", label: "Messages & conversations" },
  { slug: "/dashboard-bookings", label: "My bookings" },
  { slug: "/dashboard-saved", label: "Saved properties" },
  { slug: "/dashboard-analytics", label: "Analytics" },
  { slug: "/dashboard-transactions", label: "Transactions" },
  { slug: "/dashboard-listings", label: "My listings" },
  { slug: "/dashboard-reservations", label: "Reservations received" },
  { slug: "/dashboard-notifications", label: "Listing notifications" },
  { slug: "/dashboard-property-likes", label: "Property likes" },
  { slug: "/dashboard-subscription", label: "Subscription" },
  { slug: "/dashboard-all-properties", label: "All properties" },
  { slug: "/dashboard-users", label: "User management" },
  { slug: "/dashboard-admin-subscriptions", label: "Subscription management" },
  { slug: "/dashboard-payment-settings", label: "Payment settings" },
  { slug: "/dashboard-sms-settings", label: "SMS settings" },
  { slug: "/dashboard-admin-reviews", label: "Reviews" },
  { slug: "/dashboard-notif-templates", label: "Notification templates" },
  { slug: "/dashboard-admin-marketing", label: "Marketing" },
  { slug: "/dashboard-my-marketing", label: "My Marketing" },
] as const;

const FRONT_PAGES = [
  { slug: "/", label: "Home" },
  { slug: "/about", label: "About" },
  { slug: "/contact", label: "Contact" },
  { slug: "/pricing", label: "Pricing" },
  { slug: "/bnb", label: "B&B" },
  { slug: "/dashboard", label: "User dashboard" },
  { slug: "/terms", label: "Terms" },
  { slug: "/privacy", label: "Privacy" },
  ...DASHBOARD_PANEL_PAGES,
] as const;

const CURRENT_CONTENT_VERSION = 3;

function globalNav(id: string, label: string, href: string, children: CmsGlobalNavChild[] = [], requiresAuth = false): CmsGlobalNavItem {
  return { id, label, href, visible: true, requiresAuth, children };
}

const DEFAULT_GLOBAL_DOCUMENT: CmsGlobalDocument = {
  contentVersion: GLOBAL_CONTENT_VERSION,
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
      globalNav("bnb", "B&B", "/bnb"),
      globalNav("rent", "Rent", "/search?type=rent", [
        { id: "rent-studio", label: "Studio / Bedsitter", href: "/search?type=rent&filter=studio", visible: true },
        { id: "rent-bedrooms", label: "By Bedrooms", href: "/search?type=rent&filter=bedrooms", visible: true },
        { id: "rent-penthouse", label: "Penthouse", href: "/search?type=rent&filter=penthouse", visible: true },
        { id: "rent-compound", label: "Own Compound", href: "/search?type=rent&filter=own-compound", visible: true },
        { id: "rent-condominium", label: "Condominiums", href: "/search?type=rent&filter=condominium", visible: true },
        { id: "rent-office", label: "Office Space", href: "/search?type=rent-business", visible: true },
        { id: "rent-godown", label: "Godowns", href: "/search?type=rent-godown", visible: true },
        { id: "rent-stall", label: "Stalls", href: "/search?type=rent-stall", visible: true },
        { id: "rent-shop", label: "Shops", href: "/search?type=rent-stall", visible: true },
      ]),
      globalNav("hostels", "Hostels", "/search?type=hostel"),
      globalNav("hotels", "Hotels", "/search?type=hotel"),
      globalNav("buy", "Buy", "/search?type=sale", [
        { id: "buy-apartments", label: "Apartments", href: "/search?type=sale&category=apartments", visible: true },
        { id: "buy-homes", label: "Homes", href: "/search?type=sale&category=homes", visible: true },
        { id: "buy-lands", label: "Lands", href: "/search?type=sale&category=lands", visible: true },
      ]),
      globalNav("dashboard", "Dashboard", "/dashboard", [], true),
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

function templateKeyForSlug(slug: string): NonNullable<CmsDocument["templateKey"]> {
  if (slug.startsWith("/dashboard-")) return "dashboard";
  return slug === "/" ? "home" : slug.replace(/^\/+/, "") as NonNullable<CmsDocument["templateKey"]>;
}

function makeSection(
  id: string,
  type: CmsSection["type"],
  label: string,
  title: string,
  body: string,
  extra: Partial<CmsSection> = {},
): CmsSection {
  return {
    id,
    type,
    label,
    eyebrow: "",
    title,
    body,
    buttonText: "",
    buttonHref: "",
    backgroundColor: "#ffffff",
    textColor: "#111111",
    accentColor: "#111111",
    items: [],
    visible: true,
    ...extra,
  };
}

const DEFAULT_DOCUMENTS: Record<string, CmsDocument> = {
  "/": {
    templateKey: "home",
    contentVersion: CURRENT_CONTENT_VERSION,
    pageTitle: "Home",
    metaDescription: "Discover verified homes, rentals, stays, land, and spaces across Kenya on inndos.",
    backgroundColor: "#ffffff",
    textColor: "#111111",
    accentColor: "#111111",
    sections: [
      makeSection("home-map-search", "hero", "Map & search", "Where to?", "Explore homes, rentals, B&Bs, hotels, land, and spaces around the places you want to live.", {
        componentKey: "home-map-search",
        settings: {
          componentKey: "home-map-search",
          searchPlaceholder: "Where to?",
          resultCountLabel: "properties visible on the map",
          showLocateButton: true,
          mapHeight: 620,
        },
        buttonText: "Explore properties",
        buttonHref: "/search",
        backgroundColor: "#f3f4f6",
      }),
      makeSection("home-process", "feature", "Our process", "Everything starts with the right place.", "From discovering a property to linking up with the right person, inndos makes finding your next place simpler.", {
        componentKey: "home-process",
        settings: { componentKey: "home-process" },
        items: [
          { title: "Discover", body: "Explore homes, rentals and stays in places you actually want to live.", number: "01", iconKey: "search", imageSrc: "/images/process-explore.jpeg", imageAlt: "Person searching for a home" },
          { title: "Compare", body: "Compare features, prices and locations to choose the best fit.", number: "02", iconKey: "clipboard-list", imageSrc: "/images/process-evaluate.jpeg", imageAlt: "Bright modern living room interior" },
          { title: "Link Up", body: "Talk directly with property owners and managers.", number: "03", iconKey: "link", imageSrc: "/images/process-connect.jpeg", imageAlt: "Couple shaking hands with property agent" },
          { title: "Move In", body: "Complete the process and step into your new space with confidence.", number: "04", iconKey: "home", imageSrc: "/images/process-settle.jpeg", imageAlt: "Hand holding house keys" },
        ],
      }),
      makeSection("home-featured", "content", "Featured listings", "Featured listings", "Standout verified places from trusted listers.", {
        componentKey: "home-property-collection",
        settings: { componentKey: "home-property-collection", collectionType: "featured", limit: 12, emptyStateText: "Featured listings will appear here when a lister promotes a property." },
        buttonText: "View featured listings",
        buttonHref: "/search?featured=true",
      }),
      makeSection("home-bnb-hotels", "feature", "B&B & Hotels", "B&B & Hotels", "Unique accommodations, offices, and meeting spaces.", {
        componentKey: "home-bnb-hotels",
        settings: {
          componentKey: "home-bnb-hotels",
          collectionType: "bnb-hotels",
          limit: 12,
          emptyStateText: "B&B and hotel listings will appear here as they are approved.",
          actions: [
            { id: "view-bnbs", label: "View B&Bs", href: "/search?type=bnb", placement: "header", variant: "ghost" },
            { id: "view-hotels", label: "View Hotels", href: "/search?type=hotel", placement: "header", variant: "ghost" },
            { id: "explore-bnbs", label: "Explore B&Bs", href: "/search?type=bnb", placement: "footer", variant: "primary" },
            { id: "explore-hotels", label: "Explore Hotels", href: "/search?type=hotel", placement: "footer", variant: "outline" },
          ],
        },
        items: [
          { title: "View B&Bs", body: "Browse available B&B stays.", },
          { title: "View Hotels", body: "Browse available hotel spaces.", },
          { title: "Explore B&B Stays", body: "Find a place to stay tonight.", },
          { title: "Explore Hotels", body: "Find hotels and meeting spaces.", },
        ],
      }),
      makeSection("home-rentals", "content", "Latest rentals", "Latest Rentals", "Discover top-rated rental properties available now.", {
        componentKey: "home-property-collection",
        settings: { componentKey: "home-property-collection", collectionType: "rent", limit: 4, emptyStateText: "Rental listings will appear here when they are approved." },
        buttonText: "View All",
        buttonHref: "/search?type=rent",
      }),
      makeSection("home-sale", "content", "Properties for sale", "Properties For Sale", "Find your dream home from verified sellers.", {
        componentKey: "home-property-collection",
        settings: { componentKey: "home-property-collection", collectionType: "sale", limit: 4, emptyStateText: "Properties for sale will appear here when they are approved." },
        buttonText: "View All",
        buttonHref: "/search?type=sale",
      }),
    ],
  },
  "/about": {
    templateKey: "about",
    contentVersion: CURRENT_CONTENT_VERSION,
    pageTitle: "About inndos",
    metaDescription: "Learn how inndos connects people directly to property owners across Kenya.",
    backgroundColor: "#f9fafb",
    textColor: "#111827",
    accentColor: "#2563eb",
    sections: [
      makeSection("about-hero", "hero", "About", "About inndos", "Direct from owner to you. Simple. Fair. Kenyan.", {
        backgroundColor: "#2563eb",
        textColor: "#ffffff",
        accentColor: "#ffffff",
      }),
      makeSection("about-story", "content", "Our story", "House hunting in Kenya is broken.", "Agents take 1-2 months' rent in fees. Listings are fake or hidden. You waste weeks calling numbers that never answer.\n\ninndos fixes that.\n\nWe connect you directly to property owners — no middlemen, no commissions, no drama.\n\nOpen the app and instantly see B&Bs and rentals around you. Filter amenities like WiFi, security, parking, gym. Chat the owner straight away.\n\nWhether you need a same-night B&B or a long-term keja, it's all in one place."),
      makeSection("about-offerings", "feature", "What you can find", "One place for your next move", "Find the right space for tonight, this month, or your next chapter.", {
        items: [
          { title: "B&B – Stay Tonight", body: "Late out? Flight delayed? Need a safe spot right now?\n\ninndos shows available B&Bs the moment you open the app.\n\nMap lights up with options near you. Filter clean bedding, WiFi, hot shower, secure parking. Chat the owner directly. Book and pay via M-Pesa instantly.\n\nNo crazy mark-ups. No middlemen.\n\nList your extra room as a B&B and earn extra cash with zero fees. inndos — your spot tonight, direct from the owner.", href: "/search?type=bnb" },
          { title: "Rent – Find Your Keja", body: "Tired of agents eating your money?\n\ninndos lets you find bedsitters, 1-2 bedroom units straight from the owner.\n\nInstant map with units around you. Filter water tank, WiFi, gym, parking, security. Chat the owner directly. Move in faster, save thousands.\n\nLandlords: List free. Get serious tenants the same day. Keep 100% of the rent.\n\nNo middlemen. No commission. Just your next keja.", href: "/search?type=rent" },
          { title: "Buy – Direct from Owner", body: "Want to buy a house, apartment or plot without agent fees?\n\ninndos connects you straight to real owners.\n\nVerified listings. Filter by location, size, amenities and price. Chat the seller directly. Negotiate with no middleman drama.\n\nBuyers save money. Sellers reach genuine buyers free.\n\nDirect. Transparent. No commissions.", href: "/search?type=sale" },
          { title: "Hostels – Affordable Stays", body: "Student or on a tight budget?\n\ninndos has hostels listed directly by owners.\n\nSee hostels near universities instantly. Filter by price, WiFi, security, meals, room type. Chat the owner or manager directly. No agent fees.\n\nPerfect for JKUAT, UoN, Kenyatta or anywhere.\n\nHostel owners: List free. Fill rooms faster with serious students. Cheap. Safe. Direct from the owner.", href: "/search?type=hostel" },
        ],
      }),
    ],
  },
  "/dashboard": {
    templateKey: "dashboard",
    contentVersion: CURRENT_CONTENT_VERSION,
    pageTitle: "Your inndos dashboard",
    metaDescription: "Manage your inndos activity, saved properties, messages, bookings, and listings from one place.",
    backgroundColor: "#f9fafb",
    textColor: "#111827",
    accentColor: "#111827",
    sections: [
      makeSection("dashboard-hero", "hero", "Your dashboard", "Everything you need, in one place.", "Keep track of your property activity, saved places, messages, bookings, and profile from one simple workspace.", {
        backgroundColor: "#111827",
        textColor: "#ffffff",
        accentColor: "#ffffff",
      }),
      makeSection("dashboard-activity", "feature", "Your activity", "Stay close to what matters.", "Your dashboard keeps the next step visible, whether you are finding a place, managing a listing, or connecting with a customer.", {
        items: [
          { title: "Saved properties", body: "Return to the places you want to compare or visit." },
          { title: "Messages & link-ups", body: "Keep conversations with owners, guests, and property seekers moving." },
          { title: "Bookings & reservations", body: "Review your requests, upcoming stays, and incoming customer enquiries." },
        ],
      }),
      makeSection("dashboard-guidance", "content", "Make your next move", "Use your dashboard as your home base.", "Complete your profile, review new activity, and move between your personal and property tools whenever you need them."),
    ],
  },
  "/contact": {
    templateKey: "contact",
    contentVersion: CURRENT_CONTENT_VERSION,
    pageTitle: "Contact inndos",
    metaDescription: "Contact the inndos team about listings, support, partnerships, or technical issues.",
    backgroundColor: "#f9fafb",
    textColor: "#111827",
    accentColor: "#2563eb",
    sections: [
      makeSection("contact-hero", "hero", "Contact", "Get in Touch", "Have questions about listing your property or finding your next home? Our team is here to help you every step of the way.", {
        backgroundColor: "#f9fafb",
        accentColor: "#2563eb",
      }),
      makeSection("contact-details", "feature", "Contact details", "We are here to help.", "Reach the inndos team through the channel that works best for you.", {
        items: [
          { title: "Phone", body: "+254 713 361799", href: "tel:+254713361799" },
          { title: "Email", body: "support@inndos.com", href: "mailto:support@inndos.com" },
          { title: "Office", body: "Nairobi, Kenya" },
          { title: "Hours", body: "Mon-Fri: 9am - 6pm EAT" },
        ],
      }),
      makeSection("contact-form", "cta", "Send us a message", "Send us a Message", "Fill out the form below and we'll get back to you within 24 hours.", {
        buttonText: "Send Message",
        buttonHref: "/contact",
        items: [
          { title: "First Name", body: "Required · placeholder: John" },
          { title: "Last Name", body: "Required · placeholder: Doe" },
          { title: "Email Address", body: "Required · placeholder: john@example.com" },
          { title: "Subject", body: "General Inquiry · Property Listing Support · Technical Issue · Partnership Opportunity" },
          { title: "Message", body: "Required · placeholder: How can we help you?" },
        ],
      }),
    ],
  },
  "/pricing": {
    templateKey: "pricing",
    contentVersion: CURRENT_CONTENT_VERSION,
    pageTitle: "Pricing",
    metaDescription: "Simple, transparent inndos property management plans with no hidden fees.",
    backgroundColor: "#f9fafb",
    textColor: "#111827",
    accentColor: "#111827",
    sections: [
      makeSection("pricing-hero", "hero", "Pricing", "Simple, transparent pricing", "Choose the plan that best fits your property management needs. No hidden fees.", {
        backgroundColor: "#f9fafb",
      }),
      makeSection("pricing-plans", "feature", "Plans", "Choose the plan that fits your needs", "Start free and upgrade as your property portfolio grows.", {
        items: [
          { title: "Free · KES 0 / month", body: "3 listings\n5 photos per listing\nNo video / virtual tour\n0 featured listings / month\nNo brand-profile search\nNo dedicated phone support\n\nCTA: Get Started", href: "/login?role=owner" },
          { title: "Basic · KES 399 / month", body: "7 listings\n10 photos per listing\nNo video / virtual tour\n1 featured listing / month\nBrand-profile search\nNo dedicated phone support\n\nCTA: Upgrade to Basic", href: "/dashboard?tab=subscription" },
          { title: "Pro · KES 599 / month · Popular", body: "15 listings\n20 photos per listing\n1 video / virtual tour per listing\n3 featured listings / month\nBrand-profile search\n\nCTA: Upgrade to Pro", href: "/dashboard?tab=subscription" },
          { title: "Enterprise · Custom pricing", body: "Unlimited listings\nUnlimited photos per listing\n5 videos / virtual tours per listing\nNegotiated featured allocation\nBrand-profile search\n24/7 phone support\nDedicated account manager\n\nCTA: Contact Admin", href: "/dashboard?tab=subscription" },
        ],
      }),
    ],
  },
  "/bnb": {
    templateKey: "bnb",
    contentVersion: CURRENT_CONTENT_VERSION,
    pageTitle: "B&B Stays",
    metaDescription: "Find B&Bs, serviced apartments, hotels, and unique short stays on inndos.",
    backgroundColor: "#ffffff",
    textColor: "#111827",
    accentColor: "#111827",
    sections: [
      makeSection("bnb-hero", "hero", "B&B & Hotels", "All B&B Stays", "Find a comfortable place to stay tonight, from serviced apartments to unique nature-focused stays.", {
        backgroundColor: "#ffffff",
      }),
      makeSection("bnb-categories", "feature", "Categories", "Find the stay that fits.", "Browse by the type of short-stay accommodation you need.", {
        items: [
          { title: "All", body: "All B&B listings" },
          { title: "Serviced Apartments", body: "Fully furnished with hotel-like amenities" },
          { title: "Entire Place", body: "Private home, apartment or villa" },
          { title: "Private Room", body: "Own bedroom, shared common areas" },
          { title: "Shared Room", body: "Shared bedroom and common areas" },
          { title: "Unique Stays", body: "Treehouses, container homes, yurts, houseboats" },
          { title: "Hotel & Boutique", body: "Hotels, hostels or Bed & Breakfasts" },
          { title: "Vacation Homes", body: "Cabins, rustic villas or getaway properties" },
          { title: "Nature-Focused", body: "Cabins, bungalows, containers, villas in nature" },
          { title: "Others", body: "Other short-stay accommodations" },
        ],
      }),
      makeSection("bnb-filters", "content", "Search & filters", "Search by name or location", "Visitors can filter by category, price range from KES 0 to KES 50,000 per night, and search by name or location.", {
        buttonText: "Reset filters",
        buttonHref: "/bnb",
      }),
    ],
  },
  "/terms": {
    templateKey: "terms",
    contentVersion: CURRENT_CONTENT_VERSION,
    pageTitle: "Terms and Conditions for inndos Online Rental System",
    metaDescription: "Terms and Conditions governing use of the inndos online rental system.",
    backgroundColor: "#f9fafb",
    textColor: "#111827",
    accentColor: "#2563eb",
    sections: [
      makeSection("terms-intro", "hero", "Terms", "Terms and Conditions for inndos Online Rental System", "Last Updated: November 27, 2025"),
      makeSection("terms-opening", "content", "Introduction", "Welcome to inndos", "Welcome to inndos, an online marketplace platform designed to connect property owners, tenants, buyers, and agents for rentals, leases, and sales of properties including apartments, houses, shops, hotels, and other spaces. By accessing or using the inndos platform (the \"Platform\"), you agree to be bound by these Terms and Conditions (\"Terms\"). If you do not agree with these Terms, you must not use the Platform.\n\ninndos is operated by inndos Company (\"we,\" \"us,\" or \"our\"). These Terms govern your use of the Platform, including any services, features, or content provided therein. We reserve the right to update these Terms at any time, and we will notify users of material changes via email or through the Platform. Your continued use of the Platform after such changes constitutes acceptance of the updated Terms."),
      makeSection("terms-definitions", "feature", "1. Definitions", "Definitions", "", {
        items: [
          { title: "User", body: "Any individual or entity accessing or using the Platform, including Apartment Owners, Tenants, Property Owners, Hotel Owners, Shop Owners, and Property Agents." },
          { title: "Apartment Owners", body: "Users renting out apartments on a daily, monthly, quarterly, or yearly basis." },
          { title: "Tenants", body: "Users seeking properties for rent on a daily, monthly, quarterly, or yearly basis." },
          { title: "Property Owners", body: "Users listing properties for sale or short/long-term rental." },
          { title: "Hotel Owners", body: "Users listing hotel rooms for daily rental." },
          { title: "Shop Owners", body: "Users leasing or letting out shop spaces on an area-based or rental term basis." },
          { title: "Property Agents", body: "Users listing properties on behalf of other Users." },
          { title: "Listing", body: "Any advertisement or posting of a property, room, or space on the Platform for rental, lease, or sale." },
          { title: "Verification Documents", body: "Contact information, email address, identification document, and a passport-sized photo." },
          { title: "Platform", body: "The inndos website, mobile applications, and related services." },
        ],
      }),
      makeSection("terms-accounts", "content", "2. Eligibility and User Accounts", "Eligibility and User Accounts", "To use the Platform, you must be at least 18 years old or the age of majority in your jurisdiction, whichever is higher, and capable of forming a binding contract. You must provide accurate and complete information during registration.\n\nAll Users must voluntarily provide Verification Documents for account approval. Accounts without complete and verifiable Verification Documents will not be approved or activated. You are responsible for maintaining the confidentiality of your account credentials and for all activities occurring under your account.\n\ninndos reserves the right to suspend or terminate accounts where there is reasonable suspicion of fraud, violation of these terms or failure to comply with verification requirements."),
      makeSection("terms-use", "content", "3. Use of the Platform", "Use of the Platform", "The Platform acts as a marketplace to connect Users, such as landlords with tenants, sellers with buyers, or agents with clients. inndos does not own, control, or endorse any properties or transactions; it merely facilitates connections.\n\ninndos does not act as a real estate broker, agent or property Manager and does not participate in negotiations or transactions between users.\n\ninndos does not verify ownership of properties, legal title or authority to list properties. Users are responsible for conducting their own due diligence before entering into any transaction.", {
        items: [
          { title: "Listings and transactions", body: "Users may create accurate Listings. Prices must be the exact prices charged. Users may list properties for rental, lease, or sale. Tenants and buyers may browse and contact listers directly. Transactions are between Users and are governed by separate contracts outside the Platform." },
          { title: "User conduct", body: "Do not use the Platform for unlawful, fraudulent, or harmful purposes. Prohibited activities include posting false Listings, illegal solicitation, intellectual property or privacy violations, and uploading harmful content." },
        ],
      }),
      makeSection("terms-responsibilities", "content", "4. Company Responsibilities and Liabilities", "Company Responsibilities and Liabilities", "inndos is not responsible for damages, losses, inconveniences, or disputes arising from interactions between Users. We do not guarantee the accuracy, quality, or legality of Listings or User-provided information. Users engage with each other at their own risk.\n\nWhere necessary, inndos may provide User data to law enforcement or relevant authorities in accordance with these Terms and applicable laws. Personal data shall be processed in accordance with the Data Protection Act, 2019 of Kenya."),
      makeSection("terms-ip", "content", "5. Intellectual Property", "Intellectual Property", "All content on the Platform, including text, graphics, logos, and software, is owned by inndos or its licensors and protected by intellectual property laws. You may not copy, modify, or distribute Platform content without our written consent.\n\nUsers grant inndos a non-exclusive, royalty-free license to use, display, and distribute any content they upload for Platform operations."),
      makeSection("terms-ending", "content", "6–11. Ending terms", "Termination, Indemnification, Disclaimers, and Governing Law", "inndos may suspend or terminate accounts for violations of these Terms. You agree to indemnify and hold harmless inndos and its officers, directors, employees, and agents from claims arising from your use of the Services or breach of these Terms.\n\nThe Platform is provided \"as is\" without warranties of any kind. These Terms are governed by the laws of Kenya. Any disputes shall be resolved through binding arbitration in Kenya or in a court of competent jurisdiction.\n\nFor questions about these Terms, contact us at support@inndos.com."),
      makeSection("terms-acceptance", "cta", "Acceptance", "By using the Platform, you acknowledge that you have read, understood, and agree to these Terms and Conditions.", "", {
        buttonText: "Contact inndos",
        buttonHref: "/contact",
      }),
    ],
  },
  "/privacy": {
    templateKey: "privacy",
    contentVersion: CURRENT_CONTENT_VERSION,
    pageTitle: "Terms of Service & Privacy Policy",
    metaDescription: "Read the inndos Terms of Service and Privacy Policy.",
    backgroundColor: "#f9fafb",
    textColor: "#111827",
    accentColor: "#2563eb",
    sections: [
      makeSection("privacy-hero", "hero", "Legal", "Terms of Service & Privacy Policy", "Last updated: November 25, 2025"),
      makeSection("privacy-intro", "content", "1. Introduction", "Introduction", "Welcome to inndos. By using our website and services, you agree to comply with and be bound by the following terms and conditions. Please review the following terms carefully."),
      makeSection("privacy-listings", "content", "2. Property Listings", "Property Listings", "inndos provides a platform for property owners to list properties for rent or sale. We verify listings to the best of our ability but cannot guarantee the accuracy of all information provided by third parties."),
      makeSection("privacy-responsibilities", "content", "3. User Responsibilities", "User Responsibilities", "Users are responsible for maintaining the confidentiality of their account information and for all activities that occur under their account."),
      makeSection("privacy-policy", "feature", "4. Privacy Policy", "Privacy Policy", "We respect your privacy and are committed to protecting your personal data. We collect information such as your name, contact details, and property preferences to provide our services.", {
        items: [
          { title: "Your data", body: "We do not sell your personal data to third parties." },
          { title: "Security", body: "We use industry-standard security measures to protect your information." },
          { title: "Your rights", body: "You have the right to access, correct, or delete your personal data." },
        ],
      }),
      makeSection("privacy-contact", "cta", "5. Contact Us", "Contact Us", "If you have any questions about these Terms, please contact us at support@inndos.com or visit our office in Nairobi, Kenya.", {
        buttonText: "Contact inndos",
        buttonHref: "/contact",
      }),
    ],
  },
};

function defaultDocument(slug: string): CmsDocument {
  if (DEFAULT_DOCUMENTS[slug]) return DEFAULT_DOCUMENTS[slug]!;
  const page = FRONT_PAGES.find((item) => item.slug === slug);
  const label = page?.label ?? slug.replace("/", "").replace(/-/g, " ");
  return {
    templateKey: templateKeyForSlug(slug),
    contentVersion: CURRENT_CONTENT_VERSION,
    pageTitle: label,
    metaDescription: `Learn more about ${label} on inndos.`,
    backgroundColor: "#ffffff",
    textColor: "#111111",
    accentColor: "#111111",
    sections: [
      makeSection(`${label.toLowerCase().replace(/\W+/g, "-")}-intro`, "content", "Introduction", label, "Edit this page content from the developer CMS."),
    ],
  };
}

function isUntouchedLegacyDefault(draft: Partial<CmsDocument> | null, slug: string) {
  if (!draft || draft.templateKey || draft.contentVersion) return false;
  if (slug === "/") {
    return draft.pageTitle === "Home"
      && draft.metaDescription === "Direct property discovery and stays across Kenya."
      && draft.sections?.map((section) => section.id).join("|") === "home-hero|home-value|home-cta";
  }
  const page = FRONT_PAGES.find((item) => item.slug === slug);
  const label = page?.label ?? slug.replace("/", "").replace(/-/g, " ");
  const introId = `${label.toLowerCase().replace(/\W+/g, "-")}-intro`;
  return draft.sections?.length === 1
    && draft.sections[0]?.id === introId
    && draft.sections[0]?.body === "Edit this page content from the developer CMS.";
}

function slugFromRequest(req: Request): string {
  const raw = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  return raw === "home" ? "/" : `/${(raw ?? "").replace(/^\/+/, "")}`;
}

async function requireDeveloper(req: Request, res: Response): Promise<string | null> {
  const userId = requireAuth(req, res);
  if (!userId) return null;
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (!user || user.role !== "developer") {
    res.status(403).json({ error: "Developer access required" });
    return null;
  }
  return userId;
}

async function ensurePage(slug: string, userId?: string) {
  const [existing] = await db.select().from(cmsPages).where(eq(cmsPages.slug, slug)).limit(1);
  if (existing) {
    const draft = existing.draft as Partial<CmsDocument> | null;
    const expectedTemplate = templateKeyForSlug(slug);
    if (draft?.templateKey !== expectedTemplate || draft.contentVersion !== CURRENT_CONTENT_VERSION) {
      if (!isUntouchedLegacyDefault(draft, slug)) return existing;
      const [upgraded] = await db.update(cmsPages).set({
        draft: defaultDocument(slug),
        updatedBy: userId ?? existing.updatedBy,
        updatedAt: new Date(),
      }).where(eq(cmsPages.id, existing.id)).returning();
      return upgraded ?? existing;
    }
    return existing;
  }
  const page = FRONT_PAGES.find((item) => item.slug === slug);
  if (!page) return null;
  const [created] = await db.insert(cmsPages).values({
    slug,
    label: page.label,
    draft: defaultDocument(slug),
    updatedBy: userId,
  }).returning();
  return created;
}

async function ensureGlobalPage(userId?: string) {
  const [existing] = await db.select().from(cmsPages).where(eq(cmsPages.slug, GLOBAL_CMS_SLUG)).limit(1);
  if (existing) {
    const draft = existing.draft as Partial<CmsGlobalDocument> | null;
    if (draft?.contentVersion === GLOBAL_CONTENT_VERSION && draft.header && draft.footer) return existing;
    const [upgraded] = await db.update(cmsPages).set({
      draft: DEFAULT_GLOBAL_DOCUMENT,
      updatedBy: userId ?? existing.updatedBy,
      updatedAt: new Date(),
    }).where(eq(cmsPages.id, existing.id)).returning();
    return upgraded ?? existing;
  }
  const [created] = await db.insert(cmsPages).values({
    slug: GLOBAL_CMS_SLUG,
    label: "Global header & footer",
    draft: DEFAULT_GLOBAL_DOCUMENT,
    updatedBy: userId,
  }).returning();
  return created;
}

function parseDocument(value: unknown) {
  return cmsDocumentSchema.safeParse(value);
}

function parseGlobalDocument(value: unknown) {
  return cmsGlobalDocumentSchema.safeParse(value);
}

function canonicalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeForHash);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalizeForHash(entry)]),
    );
  }
  return value;
}

function documentHash(document: CmsDocument) {
  return createHash("sha256").update(JSON.stringify(canonicalizeForHash(document))).digest("hex");
}

function globalDocumentHash(document: CmsGlobalDocument) {
  return createHash("sha256").update(JSON.stringify(canonicalizeForHash(document))).digest("hex");
}

const router = Router();

router.get("/cms/public-global", async (_req, res): Promise<void> => {
  const [page] = await db.select({
    published: cmsPages.published,
    publishedAt: cmsPages.publishedAt,
  }).from(cmsPages).where(eq(cmsPages.slug, GLOBAL_CMS_SLUG)).limit(1);
  if (!page?.published) {
    res.status(404).json({ error: "No published global CMS settings" });
    return;
  }
  res.json(page);
});

router.get("/cms/global", async (req, res): Promise<void> => {
  const userId = await requireDeveloper(req, res);
  if (!userId) return;
  const page = await ensureGlobalPage(userId);
  res.json({
    draft: page.draft,
    published: page.published,
    publishedBackup: page.publishedBackup,
    publishedAt: page.publishedAt,
    publishedBackupAt: page.publishedBackupAt,
    updatedAt: page.updatedAt,
  });
});

router.post("/cms/global/preview", async (req, res): Promise<void> => {
  const userId = await requireDeveloper(req, res);
  if (!userId) return;
  const parsed = parseGlobalDocument(req.body?.draft);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid global CMS draft document",
      details: parsed.error.issues.map(({ code, message, path }) => ({ code, message, path })),
    });
    return;
  }
  const page = await ensureGlobalPage(userId);
  await db.update(cmsPages).set({
    previewedBy: userId,
    previewedDraftHash: globalDocumentHash(parsed.data),
    previewedAt: new Date(),
  }).where(eq(cmsPages.id, page.id));
  res.json({ draft: parsed.data, published: page.published, updatedAt: page.updatedAt });
});

router.put("/cms/global", async (req, res): Promise<void> => {
  const userId = await requireDeveloper(req, res);
  if (!userId) return;
  const parsed = parseGlobalDocument(req.body?.draft);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid global CMS draft document",
      details: parsed.error.issues.map(({ code, message, path }) => ({ code, message, path })),
    });
    return;
  }
  const page = await ensureGlobalPage(userId);
  const draftHash = globalDocumentHash(parsed.data);
  const preservesPreview = page.previewedBy === userId && page.previewedDraftHash === draftHash;
  const [updated] = await db.update(cmsPages).set({
    draft: parsed.data,
    updatedBy: userId,
    updatedAt: new Date(),
    ...(preservesPreview ? {} : {
      previewedBy: null,
      previewedDraftHash: null,
      previewedAt: null,
    }),
  }).where(eq(cmsPages.id, page.id)).returning();
  res.json(updated);
});

router.post("/cms/global/publish", async (req, res): Promise<void> => {
  const userId = await requireDeveloper(req, res);
  if (!userId) return;
  const page = await ensureGlobalPage(userId);
  const draft = page.draft as CmsGlobalDocument;
  if (page.previewedBy !== userId || page.previewedDraftHash !== globalDocumentHash(draft)) {
    res.status(409).json({
      error: "Preview required before publishing",
      code: "CMS_PREVIEW_REQUIRED",
      message: "Open and review the current global draft preview, then confirm it before publishing.",
    });
    return;
  }
  const [updated] = await db.update(cmsPages).set({
    published: page.draft,
    publishedBackup: page.published,
    publishedAt: new Date(),
    publishedBackupAt: page.publishedAt,
    updatedBy: userId,
    updatedAt: new Date(),
    previewedBy: null,
    previewedDraftHash: null,
    previewedAt: null,
  }).where(eq(cmsPages.id, page.id)).returning();
  res.json(updated);
});

router.post("/cms/global/restore", async (req, res): Promise<void> => {
  const userId = await requireDeveloper(req, res);
  if (!userId) return;
  const page = await ensureGlobalPage(userId);
  if (!page.publishedBackup) {
    res.status(409).json({ error: "No previous published version", code: "CMS_RESTORE_UNAVAILABLE" });
    return;
  }
  const now = new Date();
  const [updated] = await db.update(cmsPages).set({
    draft: page.publishedBackup,
    published: page.publishedBackup,
    publishedBackup: page.published,
    publishedAt: page.publishedBackupAt ?? now,
    publishedBackupAt: page.publishedAt,
    updatedBy: userId,
    updatedAt: now,
    previewedBy: null,
    previewedDraftHash: null,
    previewedAt: null,
  }).where(eq(cmsPages.id, page.id)).returning();
  res.json(updated);
});

router.post("/cms/global/unpublish", async (req, res): Promise<void> => {
  const userId = await requireDeveloper(req, res);
  if (!userId) return;
  const page = await ensureGlobalPage(userId);
  const [updated] = await db.update(cmsPages).set({
    published: null,
    publishedAt: null,
    updatedBy: userId,
    updatedAt: new Date(),
  }).where(eq(cmsPages.id, page.id)).returning();
  res.json(updated);
});

router.get("/cms/public/:slug", async (req, res): Promise<void> => {
  const slug = slugFromRequest(req);
  const [page] = await db.select({
    slug: cmsPages.slug,
    label: cmsPages.label,
    published: cmsPages.published,
    publishedAt: cmsPages.publishedAt,
  }).from(cmsPages).where(eq(cmsPages.slug, slug)).limit(1);
  if (!page?.published) {
    res.status(404).json({ error: "No published CMS page" });
    return;
  }
  res.json(page);
});

router.get("/cms/preview/:slug", async (req, res): Promise<void> => {
  const userId = await requireDeveloper(req, res);
  if (!userId) return;
  const slug = slugFromRequest(req);
  const page = await ensurePage(slug, userId);
  if (!page) {
    res.status(404).json({ error: "CMS page not found" });
    return;
  }
  await db.update(cmsPages).set({
    previewedBy: userId,
    previewedDraftHash: documentHash(page.draft as CmsDocument),
    previewedAt: new Date(),
  }).where(eq(cmsPages.id, page.id));
  res.json({
    slug: page.slug,
    label: page.label,
    draft: page.draft,
    published: page.published,
    updatedAt: page.updatedAt,
  });
});

router.post("/cms/preview/:slug", async (req, res): Promise<void> => {
  const userId = await requireDeveloper(req, res);
  if (!userId) return;
  const slug = slugFromRequest(req);
  const parsedDocument = parseDocument(req.body?.draft);
  if (!parsedDocument.success) {
    res.status(400).json({
      error: "Invalid CMS draft document",
      details: parsedDocument.error.issues.map(({ code, message, path }) => ({ code, message, path })),
    });
    return;
  }
  const page = await ensurePage(slug, userId);
  if (!page) {
    res.status(404).json({ error: "CMS page not found" });
    return;
  }
  await db.update(cmsPages).set({
    previewedBy: userId,
    previewedDraftHash: documentHash(parsedDocument.data),
    previewedAt: new Date(),
  }).where(eq(cmsPages.id, page.id));
  res.json({
    slug: page.slug,
    label: page.label,
    draft: parsedDocument.data,
    published: page.published,
    updatedAt: page.updatedAt,
  });
});

router.get("/cms/pages", async (req, res): Promise<void> => {
  const userId = await requireDeveloper(req, res);
  if (!userId) return;
  const pages = await Promise.all(FRONT_PAGES.map(async (page) => {
    const ensured = await ensurePage(page.slug, userId);
    return {
      slug: page.slug,
      label: page.label,
      draft: ensured?.draft ?? defaultDocument(page.slug),
      published: ensured?.published ?? null,
      publishedBackup: ensured?.publishedBackup ?? null,
      publishedAt: ensured?.publishedAt ?? null,
      publishedBackupAt: ensured?.publishedBackupAt ?? null,
      updatedAt: ensured?.updatedAt ?? null,
    };
  }));
  res.json(pages);
});

router.get("/cms/pages/:slug", async (req, res): Promise<void> => {
  const userId = await requireDeveloper(req, res);
  if (!userId) return;
  const slug = slugFromRequest(req);
  const page = await ensurePage(slug, userId);
  if (!page) {
    res.status(404).json({ error: "CMS page not found" });
    return;
  }
  res.json(page);
});

router.put("/cms/pages/:slug", async (req, res): Promise<void> => {
  const userId = await requireDeveloper(req, res);
  if (!userId) return;
  const slug = slugFromRequest(req);
  const parsedDocument = parseDocument(req.body?.draft);
  if (!parsedDocument.success) {
    res.status(400).json({
      error: "Invalid CMS draft document",
      details: parsedDocument.error.issues.map(({ code, message, path }) => ({ code, message, path })),
    });
    return;
  }
  const document = parsedDocument.data;
  const page = await ensurePage(slug, userId);
  if (!page) {
    res.status(404).json({ error: "CMS page not found" });
    return;
  }
  const draftHash = documentHash(document);
  const preservesPreview = page.previewedBy === userId && page.previewedDraftHash === draftHash;
  const [updated] = await db.update(cmsPages).set({
    draft: document,
    updatedBy: userId,
    updatedAt: new Date(),
    ...(preservesPreview ? {} : {
      previewedBy: null,
      previewedDraftHash: null,
      previewedAt: null,
    }),
  }).where(and(eq(cmsPages.id, page.id), eq(cmsPages.slug, slug))).returning();
  res.json(updated);
});

router.post("/cms/pages/:slug/publish", async (req, res): Promise<void> => {
  const userId = await requireDeveloper(req, res);
  if (!userId) return;
  const slug = slugFromRequest(req);
  const page = await ensurePage(slug, userId);
  if (!page) {
    res.status(404).json({ error: "CMS page not found" });
    return;
  }
  const currentDraftHash = documentHash(page.draft as CmsDocument);
  if (page.previewedBy !== userId || page.previewedDraftHash !== currentDraftHash) {
    res.status(409).json({
      error: "Preview required before publishing",
      code: "CMS_PREVIEW_REQUIRED",
      message: "Open and review the current draft preview, then confirm it before publishing.",
    });
    return;
  }
  const [updated] = await db.update(cmsPages).set({
    published: page.draft,
    publishedBackup: page.published,
    publishedAt: new Date(),
    publishedBackupAt: page.publishedAt,
    updatedBy: userId,
    updatedAt: new Date(),
    previewedBy: null,
    previewedDraftHash: null,
    previewedAt: null,
  }).where(eq(cmsPages.id, page.id)).returning();
  res.json(updated);
});

router.post("/cms/pages/:slug/restore", async (req, res): Promise<void> => {
  const userId = await requireDeveloper(req, res);
  if (!userId) return;
  const slug = slugFromRequest(req);
  const page = await ensurePage(slug, userId);
  if (!page) {
    res.status(404).json({ error: "CMS page not found" });
    return;
  }
  if (!page.publishedBackup) {
    res.status(409).json({
      error: "No previous published version",
      code: "CMS_RESTORE_UNAVAILABLE",
      message: "This page has no previous published version to restore.",
    });
    return;
  }
  const now = new Date();
  const [updated] = await db.update(cmsPages).set({
    draft: page.publishedBackup,
    published: page.publishedBackup,
    publishedBackup: page.published,
    publishedAt: page.publishedBackupAt ?? now,
    publishedBackupAt: page.publishedAt,
    updatedBy: userId,
    updatedAt: now,
    previewedBy: null,
    previewedDraftHash: null,
    previewedAt: null,
  }).where(and(eq(cmsPages.id, page.id), eq(cmsPages.slug, slug))).returning();
  res.json(updated);
});

router.post("/cms/pages/:slug/unpublish", async (req, res): Promise<void> => {
  const userId = await requireDeveloper(req, res);
  if (!userId) return;
  const slug = slugFromRequest(req);
  const page = await ensurePage(slug, userId);
  if (!page) {
    res.status(404).json({ error: "CMS page not found" });
    return;
  }
  const [updated] = await db.update(cmsPages).set({
    published: null,
    publishedAt: null,
    updatedBy: userId,
    updatedAt: new Date(),
  }).where(eq(cmsPages.id, page.id)).returning();
  res.json(updated);
});

export default router;