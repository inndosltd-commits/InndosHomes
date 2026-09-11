import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ExternalLink, Eye, FileText, GitCompare, Globe2, GripVertical, LayoutDashboard, LayoutTemplate, ListPlus, Loader2, LogOut, Monitor, PanelBottom, PanelTop, Plus, Save, Send, ShieldCheck, Smartphone, Undo2, UsersRound, type LucideIcon } from "lucide-react";
import type { CmsDocument, CmsPage, CmsSection } from "@workspace/api-client-react";
import {
  getGetCmsPageQueryKey,
  getGetPublicCmsPageQueryKey,
  getListCmsPagesQueryKey,
  useCreateCmsPreview,
  useGetCmsPage,
  useListCmsPages,
  usePublishCmsPage,
  useRestoreCmsPage,
  useUnpublishCmsPage,
  useUpdateCmsPage,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CmsSectionEditor } from "@/components/cms/CmsSectionEditor";
import { CmsPreviewRenderer, compareCmsDocuments } from "@/components/cms/CmsRenderer";
import { CmsGlobalEditor } from "@/components/cms/CmsGlobalEditor";
import { BrandWordmark } from "@/components/layout/BrandWordmark";

const panelInput = "border-[#d7d2c7] bg-[#fbfaf6] focus-visible:ring-[#252525]";

function formatDate(value: string | null) {
  if (!value) return "Not published";
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "error" in error) return String(error.error);
  return "Something went wrong. Please try again.";
}

function CmsSidebarGroup({
  label,
  description,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  label: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-[#d7d2c7] pb-3 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-[#f0ede6] [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f8f7f2] text-[#5e574e] shadow-sm">
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-[#2e2b27]">{label}</span>
            <span className="mt-0.5 block truncate text-[11px] text-[#81796e]">{description}</span>
          </span>
        </span>
        <span className="text-[#81796e] transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
      </summary>
      <div className="space-y-1 px-2 pb-1 pt-1">{children}</div>
    </details>
  );
}

function CmsReferenceItem({
  icon: Icon,
  label,
  description,
  href,
  status = "Reference",
  onClick,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  href?: string;
  status?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0 text-[#81796e] transition-colors group-hover:text-[#1b1b1b]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-[#4a453e] group-hover:text-[#1b1b1b]">{label}</span>
        <span className="mt-0.5 block truncate text-[10px] text-[#938b7f]">{description}</span>
      </span>
      <span className="shrink-0 rounded-full border border-[#d7d2c7] px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.08em] text-[#8a8378]">{status}</span>
    </>
  );
  const className = `group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${active ? "bg-[#f8f7f2] shadow-sm" : "hover:bg-[#f8f7f2]"}`;
  if (onClick) {
    return <button type="button" onClick={onClick} className={className}>{content}</button>;
  }

  // The web app uses a hash router, while a normal `href="/dashboard?..."`
  // would first navigate the browser pathname and lose the dashboard tab.
  const target = href ?? "/";
  return (
    <a
      href={`#${target}`}
      onClick={(event) => {
        event.preventDefault();
        window.location.hash = target;
      }}
      className={className}
    >
      {content}
    </a>
  );
}

type DashboardPanelReference = {
  icon: LucideIcon;
  label: string;
  description: string;
  href: string;
  cmsSlug: string;
};

const USER_DASHBOARD_COMMON_REFERENCES: DashboardPanelReference[] = [
  { icon: LayoutDashboard, label: "My profile", description: "Account details and verification", href: "/dashboard?tab=settings", cmsSlug: "/dashboard-settings" },
  { icon: UsersRound, label: "Messages & conversations", description: "Live inbox and customer chats", href: "/dashboard?tab=messages", cmsSlug: "/dashboard-messages" },
  { icon: FileText, label: "My bookings", description: "Bookings and stay requests", href: "/dashboard?tab=bookings", cmsSlug: "/dashboard-bookings" },
  { icon: FileText, label: "Saved properties", description: "Personal saved-property collection", href: "/dashboard?tab=saved", cmsSlug: "/dashboard-saved" },
  { icon: Globe2, label: "Analytics", description: "Role-specific activity and performance", href: "/dashboard?tab=analytics", cmsSlug: "/dashboard-analytics" },
  { icon: FileText, label: "Transactions", description: "Property transaction confirmations", href: "/dashboard?tab=transactions", cmsSlug: "/dashboard-transactions" },
];

const USER_DASHBOARD_LISTER_REFERENCES: DashboardPanelReference[] = [
  { icon: ListPlus, label: "List property form", description: "Create and publish a listing", href: "/add-listing", cmsSlug: "/dashboard-list-property" },
  { icon: FileText, label: "My listings", description: "Edit, view, feature or deactivate listings", href: "/dashboard?tab=listings", cmsSlug: "/dashboard-listings" },
  { icon: UsersRound, label: "Reservations received", description: "Incoming guest and customer requests", href: "/dashboard?tab=reservations", cmsSlug: "/dashboard-reservations" },
  { icon: FileText, label: "Listing notifications", description: "Booking and property alerts", href: "/dashboard?tab=notifications", cmsSlug: "/dashboard-notifications" },
  { icon: FileText, label: "Property likes", description: "People who saved your listings", href: "/dashboard?tab=property-likes", cmsSlug: "/dashboard-property-likes" },
  { icon: LayoutTemplate, label: "Subscription", description: "Plan, limits and upgrades", href: "/dashboard?tab=subscription", cmsSlug: "/dashboard-subscription" },
];

const USER_DASHBOARD_ADMIN_REFERENCES: DashboardPanelReference[] = [
  { icon: FileText, label: "All properties", description: "Review, approve and manage listings", href: "/dashboard?tab=all-properties", cmsSlug: "/dashboard-all-properties" },
  { icon: UsersRound, label: "User management", description: "Accounts, roles and approvals", href: "/dashboard?tab=users", cmsSlug: "/dashboard-users" },
  { icon: LayoutTemplate, label: "Subscription management", description: "Plans and user subscriptions", href: "/dashboard?tab=admin-subscriptions", cmsSlug: "/dashboard-admin-subscriptions" },
  { icon: LayoutTemplate, label: "Payment settings", description: "Gateway and payment controls", href: "/dashboard?tab=payment-settings", cmsSlug: "/dashboard-payment-settings" },
  { icon: FileText, label: "SMS settings", description: "Messaging provider configuration", href: "/dashboard?tab=sms-settings", cmsSlug: "/dashboard-sms-settings" },
  { icon: FileText, label: "Reviews", description: "Moderate customer reviews", href: "/dashboard?tab=admin-reviews", cmsSlug: "/dashboard-admin-reviews" },
  { icon: FileText, label: "Notification templates", description: "Manage system notification copy", href: "/dashboard?tab=notif-templates", cmsSlug: "/dashboard-notif-templates" },
  { icon: UsersRound, label: "Marketing", description: "Manage referral and marketer activity", href: "/dashboard?tab=admin-marketing", cmsSlug: "/dashboard-admin-marketing" },
];

type CmsResizeTarget = "sidebar" | "preview";

function CmsResizeHandle({
  target,
  value,
  min,
  max,
  onStart,
  onKeyDown,
}: {
  target: CmsResizeTarget;
  value: number;
  min: number;
  max: number;
  onStart: (event: React.PointerEvent<HTMLDivElement>, target: CmsResizeTarget) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>, target: CmsResizeTarget) => void;
}) {
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={`Resize ${target === "sidebar" ? "page list" : "live composition"} panel`}
      onPointerDown={(event) => onStart(event, target)}
      onKeyDown={(event) => onKeyDown(event, target)}
      className={target === "sidebar"
        ? "group absolute inset-y-0 right-0 z-20 hidden w-3 translate-x-1/2 cursor-col-resize items-center justify-center outline-none lg:flex"
        : "group relative z-20 hidden h-full w-3 cursor-col-resize items-center justify-center outline-none xl:flex"}
      data-testid={`cms-resize-handle-${target}`}
    >
      <span className="flex h-full w-px items-center justify-center bg-[#c8c1b5] transition-colors group-hover:bg-[#1b1b1b] group-focus-visible:bg-[#1b1b1b]">
        <span className="flex h-8 w-4 items-center justify-center border border-[#bcb5a9] bg-[#f8f7f2] text-[#81796e] shadow-sm transition-colors group-hover:text-[#1b1b1b] group-focus-visible:text-[#1b1b1b]">
          <GripVertical className="h-3.5 w-3.5" />
        </span>
      </span>
    </div>
  );
}

function draftSection(type: CmsSection["type"]): CmsSection {
  const id = `${type}-${Date.now()}-${crypto.randomUUID()}`;
  return {
    id,
    type,
    label: type === "hero" ? "New hero" : `New ${type}`,
    eyebrow: "",
    title: "A clear point of view",
    body: "Add the supporting copy for this section.",
    buttonText: "",
    buttonHref: "",
    backgroundColor: "#f8f7f2",
    textColor: "#1b1b1b",
    accentColor: "#1b1b1b",
    items: type === "feature" ? [{ title: "New feature", body: "Describe the feature." }] : [],
    visible: true,
  };
}

function homeDraftSection(componentKey: "home-map-search" | "home-process" | "home-property-collection" | "home-bnb-hotels"): CmsSection {
  const base = draftSection("content");
  const suffix = crypto.randomUUID();
  const presets: Record<typeof componentKey, Partial<CmsSection>> = {
    "home-map-search": {
      label: "Map & search",
      title: "Where to?",
      body: "Explore homes, rentals, B&Bs, hotels, land, and spaces around the places you want to live.",
      settings: { componentKey, searchPlaceholder: "Where to?", resultCountLabel: "properties visible on the map", showLocateButton: true, mapHeight: 620 },
    },
    "home-process": {
      label: "Our process",
      title: "Everything starts with the right place.",
      body: "From discovering a property to linking up with the right person, inndos makes finding your next place simpler.",
      settings: { componentKey },
      items: [
        { title: "Discover", body: "Explore homes, rentals and stays in places you actually want to live.", number: "01", iconKey: "search", imageSrc: "/images/process-explore.jpeg", imageAlt: "Person searching for a home" },
        { title: "Compare", body: "Compare features, prices and locations to choose the best fit.", number: "02", iconKey: "clipboard-list", imageSrc: "/images/process-evaluate.jpeg", imageAlt: "Bright modern living room interior" },
        { title: "Link Up", body: "Talk directly with property owners and managers.", number: "03", iconKey: "link", imageSrc: "/images/process-connect.jpeg", imageAlt: "Couple shaking hands with property agent" },
        { title: "Move In", body: "Complete the process and step into your new space with confidence.", number: "04", iconKey: "home", imageSrc: "/images/process-settle.jpeg", imageAlt: "Hand holding house keys" },
      ],
    },
    "home-property-collection": {
      label: "Live property collection",
      title: "Latest listings",
      body: "Approved live listings from inndos.",
      settings: { componentKey, collectionType: "all", limit: 4, emptyStateText: "Listings will appear here when they are approved." },
    },
    "home-bnb-hotels": {
      label: "B&B & Hotels",
      title: "B&B & Hotels",
      body: "Unique accommodations, offices, and meeting spaces.",
      settings: {
        componentKey,
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
    },
  };
  return { ...base, ...presets[componentKey], id: `${componentKey}-${suffix}` };
}

type CmsPageSectionKey = "about-offerings" | "contact-details" | "contact-form" | "pricing-plans" | "bnb-directory";

function pageDraftSection(componentKey: CmsPageSectionKey): CmsSection {
  const base = draftSection(componentKey === "contact-form" ? "cta" : "feature");
  const suffix = crypto.randomUUID();
  const presets: Record<CmsPageSectionKey, Partial<CmsSection>> = {
    "about-offerings": {
      label: "What you can find",
      title: "One place for your next move",
      body: "Find the right space for tonight, this month, or your next chapter.",
      items: [
        { title: "B&B – Stay Tonight", body: "Show guests comfortable stays for tonight.", href: "/search?type=bnb" },
        { title: "Rent – Find Your Keja", body: "Help tenants discover approved rental listings.", href: "/search?type=rent" },
        { title: "Buy – Direct from Owner", body: "Connect buyers with verified properties for sale.", href: "/search?type=sale" },
        { title: "Hostels – Affordable Stays", body: "Help students find affordable stays near campus.", href: "/search?type=hostel" },
      ],
    },
    "contact-details": {
      label: "Contact details",
      title: "We are here to help.",
      body: "Reach the inndos team through the channel that works best for you.",
      items: [
        { title: "Phone", body: "+254 713 361799", href: "tel:+254713361799" },
        { title: "Email", body: "support@inndos.com", href: "mailto:support@inndos.com" },
        { title: "Office", body: "Nairobi, Kenya" },
        { title: "Hours", body: "Mon-Fri: 9am - 6pm EAT" },
      ],
    },
    "contact-form": {
      label: "Send us a message",
      title: "Send us a Message",
      body: "Fill out the form below and we'll get back to you within 24 hours.",
      buttonText: "Send Message",
      settings: {
        formSubjects: ["General Inquiry", "Property Listing Support", "Technical Issue", "Partnership Opportunity"],
        successTitle: "Message sent successfully.",
        successText: "We'll get back to you within 24 hours.",
      },
    },
    "pricing-plans": {
      label: "Plans",
      title: "Choose the plan that fits your needs",
      body: "Start free and upgrade as your property portfolio grows.",
      items: [
        { title: "Free · KES 0 / month", body: "3 listings\n5 photos per listing\n\nCTA: Get Started", href: "/login?role=owner" },
        { title: "Basic · KES 399 / month", body: "7 listings\n10 photos per listing\n\nCTA: Upgrade to Basic", href: "/dashboard?tab=subscription" },
        { title: "Pro · KES 599 / month · Popular", body: "15 listings\n20 photos per listing\n\nCTA: Upgrade to Pro", href: "/dashboard?tab=subscription" },
        { title: "Enterprise · Custom pricing", body: "Unlimited listings\nDedicated account manager\n\nCTA: Contact Admin", href: "/dashboard?tab=subscription" },
      ],
    },
    "bnb-directory": {
      label: "Categories",
      title: "Find the stay that fits.",
      body: "Browse approved B&B and short-stay listings by category, price, and location.",
      settings: {
        limit: 24,
        emptyStateText: "No listings in this category yet.",
        searchPlaceholder: "Search by name or location…",
        maxPrice: 50000,
      },
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
    },
  };
  return { ...base, ...presets[componentKey], id: `${componentKey}-${suffix}` };
}

function DraftPreview({ document }: { document: CmsDocument }) {
  const visibleSections = document.sections.filter((section) => section.visible);
  return (
    <div className="overflow-hidden border border-[#d7d2c7] bg-[#f8f7f2] shadow-[0_18px_50px_rgba(38,32,22,0.12)]">
      <div className="flex items-center justify-between border-b border-[#d7d2c7] bg-[#eeebe3] px-4 py-2">
        <div className="flex items-center gap-2 font-sans text-[10px] uppercase tracking-[0.18em] text-[#746e63]"><Eye className="h-3.5 w-3.5" /> Draft preview</div>
        <div className="flex items-center gap-1 text-[#746e63]"><Monitor className="h-3.5 w-3.5" /><Smartphone className="h-3.5 w-3.5" /></div>
      </div>
      <div style={{ backgroundColor: document.backgroundColor, color: document.textColor }}>
        {visibleSections.length === 0 ? (
          <div className="px-6 py-24 text-center text-sm opacity-60">Add a visible section to see the page take shape.</div>
        ) : visibleSections.map((section) => (
          <div key={section.id} className="border-b px-6 py-10" style={{ backgroundColor: section.backgroundColor || document.backgroundColor, color: section.textColor || document.textColor }}>
            <p className="mb-3 font-sans text-[9px] uppercase tracking-[0.18em]" style={{ color: section.accentColor || document.accentColor }}>{section.eyebrow || section.type}</p>
            <h3 className={`${section.type === "hero" ? "text-4xl" : "text-2xl"} font-black leading-none tracking-[-0.04em]`}>{section.title || "Untitled section"}</h3>
            {section.body && <p className="mt-4 max-w-md text-sm leading-6 opacity-70">{section.body}</p>}
            {section.items.length > 0 && <div className="mt-5 grid gap-2">{section.items.slice(0, 3).map((item, index) => <div key={`${section.id}-preview-item-${index}`} className="border-t pt-2 text-xs" style={{ borderColor: `${section.textColor || document.textColor}33` }}><strong>{item.title}</strong><span className="ml-2 opacity-65">{item.body}</span></div>)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CmsComparison({
  slug,
  label,
  draft,
  published,
  updatedAt,
}: {
  slug: string;
  label: string;
  draft: CmsDocument;
  published: CmsDocument | null;
  updatedAt: string | null;
}) {
  const comparison = useMemo(() => compareCmsDocuments(draft, published), [draft, published]);
  const totalChanges = comparison.added + comparison.removed + comparison.changed;

  return (
    <section className="mb-8 border border-[#d7d2c7] bg-[#e9e6de]" data-testid="cms-comparison">
      <div className="flex flex-col gap-4 border-b border-[#d7d2c7] px-5 py-5 md:flex-row md:items-start md:justify-between md:px-6">
        <div>
          <div className="flex items-center gap-3">
            <GitCompare className="h-4 w-4 text-[#5e574e]" />
            <h3 className="font-bold">Compare before publishing</h3>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#71695f]">
            Review the last saved draft against the version currently on the public website. Section markers show what will be added, removed, or changed.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 font-sans text-[9px] font-bold uppercase tracking-[0.12em]">
          <span className="border border-[#9bc5a8] bg-[#e8f3ea] px-2 py-1 text-[#315a3d]">{comparison.added} added</span>
          <span className="border border-[#d7b1a8] bg-[#f8e9e4] px-2 py-1 text-[#6e2c25]">{comparison.removed} removed</span>
          <span className="border border-[#d6bd75] bg-[#fff6d8] px-2 py-1 text-[#6a5214]">{comparison.changed} changed</span>
        </div>
      </div>
      <div className="px-5 py-5 md:px-6">
        {!published ? (
          <div className="border border-dashed border-[#bcb5a9] bg-[#f8f7f2] px-6 py-10 text-center" data-testid="cms-comparison-draft-only">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#81796e]">Draft only</p>
            <h4 className="mt-2 text-xl font-black tracking-[-0.03em]">Nothing is published yet.</h4>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#71695f]">This page has no live version to compare. The draft on the left is ready for review and will become public when you publish it.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 font-sans text-[10px] uppercase tracking-[0.16em] text-[#81796e]">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 bg-[#d6a72d]" /> Changed</span>
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 bg-[#6eaa7c]" /> Added</span>
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 bg-[#b45d4e]" /> Removed</span>
                {comparison.settingsChanged && <span className="border border-[#d6bd75] bg-[#fff6d8] px-2 py-1 text-[#6a5214]">Page settings changed</span>}
              </div>
              <p className="text-xs text-[#81796e]">Saved {updatedAt ? formatDate(updatedAt) : "draft timestamp unavailable"}</p>
            </div>
            <div className="grid items-start gap-5 lg:grid-cols-2">
              <article className="min-w-0 overflow-hidden border border-[#d7d2c7] bg-[#f8f7f2]" data-testid="cms-comparison-draft">
                <div className="flex items-center justify-between gap-3 border-b border-[#d7d2c7] bg-[#eeebe3] px-4 py-3">
                  <div><p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#5e574e]">Saved draft</p><p className="mt-1 text-xs text-[#81796e]">Not public until published</p></div>
                  <Eye className="h-4 w-4 text-[#81796e]" />
                </div>
                <div className="max-h-[900px] overflow-y-auto">
                  <CmsPreviewRenderer slug={`${slug}-draft`} label={label} document={draft} sectionStatuses={comparison.draftStatuses} includeChrome={false} />
                </div>
              </article>
              <article className="min-w-0 overflow-hidden border border-[#d7d2c7] bg-[#f8f7f2]" data-testid="cms-comparison-live">
                <div className="flex items-center justify-between gap-3 border-b border-[#d7d2c7] bg-[#eeebe3] px-4 py-3">
                  <div><p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#4a765c]">Currently live</p><p className="mt-1 text-xs text-[#81796e]">Published version</p></div>
                  <span className="h-2 w-2 rounded-full bg-[#4a765c]" title="Published" />
                </div>
                <div className="max-h-[900px] overflow-y-auto">
                  <CmsPreviewRenderer slug={`${slug}-live`} label={label} document={published} sectionStatuses={comparison.publishedStatuses} includeChrome={false} />
                </div>
              </article>
            </div>
            {totalChanges === 0 && !comparison.settingsChanged && <p className="mt-4 border border-[#a9c4af] bg-[#e8f0e8] px-4 py-3 text-sm text-[#315a3d]" data-testid="cms-comparison-no-changes">The saved draft matches the currently published page.</p>}
          </>
        )}
      </div>
    </section>
  );
}

export default function DeveloperCMS() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedLiveHref, setSelectedLiveHref] = useState<string | null>(null);
  const [activeGlobalSurface, setActiveGlobalSurface] = useState<"header" | "footer" | null>(null);
  const [document, setDocument] = useState<CmsDocument | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [previewedDraftFingerprint, setPreviewedDraftFingerprint] = useState<string | null>(null);
  const [previewedLiveFingerprint, setPreviewedLiveFingerprint] = useState<string | null>(null);
  const [confirmedDraftFingerprint, setConfirmedDraftFingerprint] = useState<string | null>(null);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [dropTargetSectionId, setDropTargetSectionId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [previewWidth, setPreviewWidth] = useState(360);
  const [activeResize, setActiveResize] = useState<{ target: CmsResizeTarget; startX: number; startValue: number } | null>(null);
  const initializedForSlug = useRef<string | null>(null);
  const apiSlug = selectedSlug === "/" ? "home" : selectedSlug.replace(/^\/+/, "");
  const pagesQuery = useListCmsPages({ query: { queryKey: getListCmsPagesQueryKey(), enabled: !!user && user.role === "developer", retry: false } });
  const pageQuery = useGetCmsPage(apiSlug, { query: { queryKey: getGetCmsPageQueryKey(apiSlug), enabled: !!apiSlug && !!user && user.role === "developer", retry: false } });
  const saveMutation = useUpdateCmsPage();
  const previewMutation = useCreateCmsPreview();
  const publishMutation = usePublishCmsPage();
  const restoreMutation = useRestoreCmsPage();
  const unpublishMutation = useUnpublishCmsPage();
  const dashboardPanelIsActive = (cmsSlug: string) => selectedSlug === cmsSlug && !activeGlobalSurface;
  const openDashboardPanel = (reference: DashboardPanelReference) => {
    setActiveGlobalSurface(null);
    setSelectedSlug(reference.cmsSlug);
    setSelectedLiveHref(reference.href);
    setDocument(null);
    initializedForSlug.current = null;
    setFeedback(null);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLocation("/login");
    } else if (user.role !== "developer") {
      setLocation("/dashboard");
    }
  }, [authLoading, setLocation, user]);

  useEffect(() => {
    if (pagesQuery.data?.length && !selectedSlug) setSelectedSlug(pagesQuery.data[0].slug);
  }, [pagesQuery.data, selectedSlug]);

  useEffect(() => {
    if (pageQuery.data?.slug === selectedSlug && initializedForSlug.current !== selectedSlug) {
      initializedForSlug.current = selectedSlug;
      setDocument(pageQuery.data.draft);
      setFeedback(null);
      setPreviewedDraftFingerprint(null);
      setPreviewedLiveFingerprint(null);
      setConfirmedDraftFingerprint(null);
    }
  }, [pageQuery.data, selectedSlug]);

  useEffect(() => {
    if (!activeResize) return;
    const handlePointerMove = (event: PointerEvent) => {
      const delta = event.clientX - activeResize.startX;
      if (activeResize.target === "sidebar") setSidebarWidth(clampResize(activeResize.startValue + delta, 220, 440));
      else setPreviewWidth(clampResize(activeResize.startValue - delta, 300, 680));
    };
    const stopResize = () => setActiveResize(null);
    window.document.addEventListener("pointermove", handlePointerMove);
    window.document.addEventListener("pointerup", stopResize);
    window.document.addEventListener("pointercancel", stopResize);
    window.document.body.style.cursor = "col-resize";
    window.document.body.style.userSelect = "none";
    return () => {
      window.document.removeEventListener("pointermove", handlePointerMove);
      window.document.removeEventListener("pointerup", stopResize);
      window.document.removeEventListener("pointercancel", stopResize);
      window.document.body.style.cursor = "";
      window.document.body.style.userSelect = "";
    };
  }, [activeResize]);

  if (authLoading) {
    return <div className="min-h-[100dvh] bg-[#f1efe9] p-8"><div className="mx-auto max-w-7xl animate-pulse space-y-5"><div className="h-16 bg-[#dfdbd1]" /><div className="h-[500px] bg-[#dfdbd1]" /></div></div>;
  }
  if (!user || user.role !== "developer") return null;

  const pages = pagesQuery.data ?? [];
  const frontendPages = pages.filter((page) => page.slug !== "/dashboard" && !page.slug.startsWith("/dashboard-"));
  const dashboardPage = pages.find((page) => page.slug === "/dashboard");
  const selectedPage = pageQuery.data?.slug === selectedSlug ? pageQuery.data : pages.find((page) => page.slug === selectedSlug);
  const savedDraft = selectedPage?.draft ?? document;
  const updateDocument = <K extends keyof CmsDocument>(key: K, value: CmsDocument[K]) => setDocument((current) => current ? { ...current, [key]: value } : current);
  const updateSection = (section: CmsSection) => setDocument((current) => current ? {
    ...current,
    sections: current.sections.map((item) => item.id === section.id ? section : item),
  } : current);
  const deleteSection = (id: string) => setDocument((current) => current ? {
    ...current,
    sections: current.sections.filter((section) => section.id !== id),
  } : current);
  const addSection = (type: CmsSection["type"]) => setDocument((current) => current ? {
    ...current,
    sections: [...current.sections, draftSection(type)],
  } : current);
  const addHomeSection = (componentKey: "home-map-search" | "home-process" | "home-property-collection" | "home-bnb-hotels") => setDocument((current) => current ? {
    ...current,
    sections: [...current.sections, homeDraftSection(componentKey)],
  } : current);
  const addPageSection = (componentKey: CmsPageSectionKey) => setDocument((current) => current ? {
    ...current,
    sections: [...current.sections, pageDraftSection(componentKey)],
  } : current);
  const moveSection = (id: string, direction: -1 | 1) => setDocument((current) => {
    if (!current) return current;
    const index = current.sections.findIndex((section) => section.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= current.sections.length) return current;
    const sections = [...current.sections];
    [sections[index], sections[nextIndex]] = [sections[nextIndex]!, sections[index]!];
    return { ...current, sections };
  });
  const reorderSection = (sourceId: string, targetId: string) => {
    if (!sourceId || sourceId === targetId) return;
    setDocument((current) => {
      if (!current) return current;
      const sourceIndex = current.sections.findIndex((section) => section.id === sourceId);
      const targetIndex = current.sections.findIndex((section) => section.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const sections = [...current.sections];
      const [moved] = sections.splice(sourceIndex, 1);
      const insertionIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      sections.splice(insertionIndex, 0, moved!);
      return { ...current, sections };
    });
  };
  const startDraggingSection = (event: React.DragEvent<HTMLButtonElement>, sectionId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/cms-section-id", sectionId);
    setDraggingSectionId(sectionId);
  };
  const finishDraggingSection = () => {
    setDraggingSectionId(null);
    setDropTargetSectionId(null);
  };
  const saveDraft = async () => {
    if (!document || !selectedSlug) return;
    setFeedback(null);
    try {
      const saved = await saveMutation.mutateAsync({ slug: apiSlug, data: { draft: document } });
      queryClient.setQueryData<CmsPage>(getGetCmsPageQueryKey(apiSlug), saved);
      queryClient.setQueryData<CmsPage[]>(getListCmsPagesQueryKey(), (current) => current?.map((page) => page.slug === saved.slug ? saved : page));
      setFeedback({ type: "success", message: "Draft saved. It is not public until you publish it." });
    } catch (error) {
      setFeedback({ type: "error", message: errorMessage(error) });
    }
  };
  const currentDraftFingerprint = document ? JSON.stringify(document) : null;
  const currentLiveFingerprint = JSON.stringify(selectedPage?.published ?? null);
  const previewConfirmed = Boolean(
    currentDraftFingerprint
      && previewedDraftFingerprint === currentDraftFingerprint
      && previewedLiveFingerprint === currentLiveFingerprint
      && confirmedDraftFingerprint === currentDraftFingerprint,
  );
  const publish = async () => {
    if (!document || !selectedSlug) return;
    if (!previewConfirmed) {
      setShowComparison(true);
      setFeedback({ type: "error", message: "Preview this exact draft and confirm that you reviewed it before publishing." });
      return;
    }
    setFeedback(null);
    try {
      const saved = await saveMutation.mutateAsync({ slug: apiSlug, data: { draft: document } });
      const published = await publishMutation.mutateAsync({ slug: apiSlug });
      const next = published ?? saved;
      queryClient.setQueryData<CmsPage>(getGetCmsPageQueryKey(apiSlug), next);
      queryClient.setQueryData<CmsPage[]>(getListCmsPagesQueryKey(), (current) => current?.map((page) => page.slug === next.slug ? next : page));
      await queryClient.invalidateQueries({ queryKey: getGetPublicCmsPageQueryKey(apiSlug) });
      setFeedback({ type: "success", message: "Published to the public website." });
    } catch (error) {
      setFeedback({ type: "error", message: errorMessage(error) });
    }
  };
  const unpublish = async () => {
    if (!selectedSlug) return;
    if (!window.confirm("Remove this page from the public website? The draft will remain available.")) return;
    setFeedback(null);
    try {
      const unpublished = await unpublishMutation.mutateAsync({ slug: apiSlug });
      queryClient.setQueryData<CmsPage>(getGetCmsPageQueryKey(apiSlug), unpublished);
      queryClient.setQueryData<CmsPage[]>(getListCmsPagesQueryKey(), (current) => current?.map((page) => page.slug === unpublished.slug ? unpublished : page));
      await queryClient.invalidateQueries({ queryKey: getGetPublicCmsPageQueryKey(apiSlug) });
      setFeedback({ type: "success", message: "Unpublished. The legacy page is live again." });
    } catch (error) {
      setFeedback({ type: "error", message: errorMessage(error) });
    }
  };
  const restorePreviousPublished = async () => {
    if (!selectedSlug || !selectedPage?.publishedBackup) return;
    if (!window.confirm("Restore the design that was live before the last publish? This will replace the current public page and draft.")) return;
    setFeedback(null);
    try {
      const restored = await restoreMutation.mutateAsync({ slug: apiSlug });
      setDocument(restored.draft);
      queryClient.setQueryData<CmsPage>(getGetCmsPageQueryKey(apiSlug), restored);
      queryClient.setQueryData<CmsPage[]>(getListCmsPagesQueryKey(), (current) => current?.map((page) => page.slug === restored.slug ? restored : page));
      await queryClient.invalidateQueries({ queryKey: getGetPublicCmsPageQueryKey(apiSlug) });
      setPreviewedDraftFingerprint(null);
      setPreviewedLiveFingerprint(null);
      setConfirmedDraftFingerprint(null);
      setFeedback({ type: "success", message: "Restored the previous published design. The current design is kept as the next restore option." });
    } catch (error) {
      setFeedback({ type: "error", message: errorMessage(error) });
    }
  };
  const openDraftPreview = async () => {
    if (!document) return;
    let previewWindow: Window | null = null;
    const origin = window.location.origin;
    const handlePreviewReady = (event: MessageEvent<{ type?: string }>) => {
      if (!previewWindow || event.origin !== origin || event.source !== previewWindow || event.data?.type !== "cms-preview-ready") return;
      previewWindow.postMessage({ type: "cms-preview-document", document }, origin);
      window.removeEventListener("message", handlePreviewReady);
    };
    window.addEventListener("message", handlePreviewReady);
    previewWindow = window.open(`#/developer/cms/preview/${apiSlug}?mode=unsaved`, "_blank");
    if (!previewWindow) {
      window.removeEventListener("message", handlePreviewReady);
      setFeedback({ type: "error", message: "The preview could not open. Allow pop-ups for this site and try again." });
      return;
    }
    try {
      await previewMutation.mutateAsync({ slug: apiSlug, data: { draft: document } });
      setPreviewedDraftFingerprint(JSON.stringify(document));
      setPreviewedLiveFingerprint(JSON.stringify(selectedPage?.published ?? null));
      setConfirmedDraftFingerprint(null);
      setFeedback({ type: "success", message: "Preview opened. Review it before confirming publication." });
    } catch (error) {
      previewWindow.close();
      window.removeEventListener("message", handlePreviewReady);
      setFeedback({ type: "error", message: errorMessage(error) });
    }
  };
  const isSaving = saveMutation.isPending || previewMutation.isPending || publishMutation.isPending || restoreMutation.isPending || unpublishMutation.isPending;
  const clampResize = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const startResize = (event: React.PointerEvent<HTMLDivElement>, target: CmsResizeTarget) => {
    event.preventDefault();
    setActiveResize({
      target,
      startX: event.clientX,
      startValue: target === "sidebar" ? sidebarWidth : previewWidth,
    });
  };
  const updateResizeWithKeyboard = (event: React.KeyboardEvent<HTMLDivElement>, target: CmsResizeTarget) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    if (target === "sidebar") setSidebarWidth((current) => clampResize(current + direction * 16, 220, 440));
    else setPreviewWidth((current) => clampResize(current - direction * 16, 300, 680));
  };

  return (
    <div className="cms-control-room min-h-[100dvh] bg-[#f1efe9] font-sans text-[#1b1b1b]">
      <header className="sticky top-0 z-30 border-b border-[#d7d2c7] bg-[#f8f7f2]/95 backdrop-blur">
        <div className="flex min-h-16 items-center justify-between gap-4 px-5 md:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2" data-testid="link-cms-logo"><BrandWordmark /></Link>
            <span className="cms-label hidden border-l border-[#d7d2c7] pl-4 font-sans text-[10px] uppercase tracking-[0.2em] text-[#81796e] md:block">Website control room</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[#6f685e] sm:inline">{user.name}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="gap-2 text-[#555047]" data-testid="button-cms-logout"><LogOut className="h-4 w-4" /> Sign out</Button>
          </div>
        </div>
      </header>
      <div className="flex min-h-[calc(100dvh-4rem)] flex-col lg:flex-row">
        <aside className="relative w-full shrink-0 border-b border-[#d7d2c7] bg-[#e9e6de] lg:w-[var(--cms-sidebar-width)] lg:border-b-0 lg:border-r" style={{ "--cms-sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}>
          <CmsResizeHandle target="sidebar" value={sidebarWidth} min={220} max={440} onStart={startResize} onKeyDown={updateResizeWithKeyboard} />
          <div className="border-b border-[#d7d2c7] p-5 md:p-6">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#81796e]">Website control room</p>
            <h1 className="cms-display mt-2 text-2xl font-black tracking-[-0.05em]">Site map</h1>
            <p className="mt-2 max-w-xs text-xs leading-5 text-[#71695f]">Organize the public experience and keep every dashboard surface easy to find.</p>
          </div>
          <div className="space-y-3 overflow-y-auto p-3">
            <CmsSidebarGroup label="Header" description="Global navigation and actions" icon={PanelTop}>
              <CmsReferenceItem icon={LayoutTemplate} label="Global header" description="Brand, navigation, account actions" status="Editable" active={activeGlobalSurface === "header"} onClick={() => { setSelectedLiveHref(null); setActiveGlobalSurface("header"); }} />
            </CmsSidebarGroup>

            <CmsSidebarGroup label="Frontend pages" description={`${frontendPages.length} public page${frontendPages.length === 1 ? "" : "s"} available`} icon={Globe2}>
              {pagesQuery.isLoading ? (
                <div className="space-y-2 px-2 py-1"><div className="h-12 animate-pulse rounded-lg bg-[#d7d2c7]" /><div className="h-12 animate-pulse rounded-lg bg-[#d7d2c7]" /></div>
              ) : pagesQuery.isError ? (
                <div className="rounded-lg border border-[#d7b1a8] bg-[#f8e9e4] p-3 text-xs text-[#8b3028]">Could not load pages. Refresh to retry.</div>
              ) : frontendPages.length === 0 ? (
                <div className="rounded-lg bg-[#f0ede6] p-3 text-xs text-[#6f685e]">No editable pages are configured yet.</div>
              ) : frontendPages.map((page) => {
                const active = page.slug === selectedSlug;
                return (
                  <button
                    key={page.slug}
                    type="button"
                    onClick={() => { setActiveGlobalSurface(null); setSelectedSlug(page.slug); setSelectedLiveHref(null); setDocument(null); initializedForSlug.current = null; setFeedback(null); }}
                    className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${active ? "border-[#1b1b1b] bg-[#f8f7f2] shadow-sm" : "border-transparent hover:bg-[#f8f7f2]"}`}
                    data-testid={`button-select-cms-page-${page.slug}`}
                  >
                    <FileText className={`h-4 w-4 shrink-0 ${active ? "text-[#1b1b1b]" : "text-[#81796e]"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-[#3f3a34]">{page.label}</span>
                      <span className="mt-0.5 block truncate font-sans text-[10px] text-[#8a8378]">{page.slug === "/" ? "/" : page.slug}</span>
                    </span>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${page.published ? "bg-[#4a765c]" : "border border-[#a59d91]"}`} title={page.published ? "Published" : "Draft only"} />
                  </button>
                );
              })}
            </CmsSidebarGroup>

            <CmsSidebarGroup label="Footer" description="Global links and site information" icon={PanelBottom}>
              <CmsReferenceItem icon={LayoutTemplate} label="Global footer" description="Links, legal pages, contact details" status="Editable" active={activeGlobalSurface === "footer"} onClick={() => { setSelectedLiveHref(null); setActiveGlobalSurface("footer"); }} />
            </CmsSidebarGroup>

            <CmsSidebarGroup label="User dashboard" description="All role-based dashboard flows" icon={LayoutDashboard} defaultOpen={false}>
              <CmsReferenceItem
                icon={LayoutDashboard}
                label="Dashboard overview"
                description="Personal activity and account home"
                status={dashboardPage?.published ? "Published" : "Editable"}
                active={selectedSlug === "/dashboard" && !activeGlobalSurface}
                onClick={() => { setActiveGlobalSurface(null); setSelectedSlug("/dashboard"); setSelectedLiveHref(null); setDocument(null); initializedForSlug.current = null; setFeedback(null); }}
              />
              <p className="px-3 pt-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#9a9286]">Shared user panels</p>
              {USER_DASHBOARD_COMMON_REFERENCES.map((item) => <CmsReferenceItem key={item.href} icon={item.icon} label={item.label} description={item.description} status="Editable" active={dashboardPanelIsActive(item.cmsSlug)} onClick={() => openDashboardPanel(item)} />)}
              <p className="px-3 pt-3 text-[9px] font-bold uppercase tracking-[0.16em] text-[#9a9286]">Owner & host panels</p>
              {USER_DASHBOARD_LISTER_REFERENCES.map((item) => <CmsReferenceItem key={item.href} icon={item.icon} label={item.label} description={item.description} status="Editable" active={dashboardPanelIsActive(item.cmsSlug)} onClick={() => openDashboardPanel(item)} />)}
              <CmsReferenceItem icon={Globe2} label="Browse listings" description="Search the public listing directory" href="/search" status="Live page" />
              <p className="px-3 pt-3 text-[9px] font-bold uppercase tracking-[0.16em] text-[#9a9286]">Admin panels</p>
              {USER_DASHBOARD_ADMIN_REFERENCES.map((item) => <CmsReferenceItem key={item.href} icon={item.icon} label={item.label} description={item.description} status="Editable" active={dashboardPanelIsActive(item.cmsSlug)} onClick={() => openDashboardPanel(item)} />)}
              <CmsReferenceItem icon={Globe2} label="Marketer dashboard" description="Personal referral activity" status="Editable" active={dashboardPanelIsActive("/dashboard-my-marketing")} onClick={() => openDashboardPanel({ icon: Globe2, label: "My Marketing", description: "Personal referral activity", href: "/dashboard?tab=my-marketing", cmsSlug: "/dashboard-my-marketing" })} />
            </CmsSidebarGroup>

            <CmsSidebarGroup label="Admin dashboard" description="Platform operations and moderation" icon={ShieldCheck} defaultOpen={false}>
              <CmsReferenceItem icon={LayoutDashboard} label="Admin overview" description="Platform metrics and activity" status="Editable" active={selectedSlug === "/dashboard" && !activeGlobalSurface} onClick={() => { setActiveGlobalSurface(null); setSelectedSlug("/dashboard"); setSelectedLiveHref(null); setDocument(null); initializedForSlug.current = null; setFeedback(null); }} />
              <CmsReferenceItem icon={FileText} label="Property management" description="Review, approve and manage listings" status="Editable" active={dashboardPanelIsActive("/dashboard-all-properties")} onClick={() => openDashboardPanel(USER_DASHBOARD_ADMIN_REFERENCES[0]!)} />
              <CmsReferenceItem icon={UsersRound} label="User management" description="Accounts, roles and approvals" status="Editable" active={dashboardPanelIsActive("/dashboard-users")} onClick={() => openDashboardPanel(USER_DASHBOARD_ADMIN_REFERENCES[1]!)} />
              <CmsReferenceItem icon={ShieldCheck} label="Moderation & reviews" description="Reviews, notifications and controls" status="Editable" active={dashboardPanelIsActive("/dashboard-admin-reviews")} onClick={() => openDashboardPanel(USER_DASHBOARD_ADMIN_REFERENCES[5]!)} />
            </CmsSidebarGroup>
          </div>
          <div className="border-t border-[#d7d2c7] bg-[#e1ded5] p-4">
            <Link href={selectedLiveHref ?? (selectedSlug ? (selectedSlug === "/" ? "/" : selectedSlug) : "/")} className="flex items-center gap-2 text-xs font-semibold text-[#5e574e] hover:text-[#1b1b1b]" data-testid="link-cms-view-page"><ExternalLink className="h-3.5 w-3.5" /> {selectedLiveHref ? "Open live panel" : "View selected page"}</Link>
            <p className="mt-2 text-[10px] leading-4 text-[#81796e]">Frontend pages, Dashboard overview, and dashboard panels are editable here. Published panel content appears above the live functional tools.</p>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl p-5 md:p-8">
            {activeGlobalSurface ? (
              <CmsGlobalEditor surface={activeGlobalSurface} />
            ) : pageQuery.isError ? (
              <div className="border border-[#d7b1a8] bg-[#f8e9e4] p-6"><h2 className="font-bold text-[#6e2c25]">Could not load this draft</h2><p className="mt-2 text-sm text-[#81483e]">{errorMessage(pageQuery.error)}</p></div>
            ) : !selectedSlug || pageQuery.isLoading || !document ? (
              <div className="space-y-4"><div className="h-8 w-72 animate-pulse bg-[#d7d2c7]" /><div className="h-24 animate-pulse bg-[#dfdbd1]" /><div className="h-72 animate-pulse bg-[#dfdbd1]" /></div>
            ) : (
              <>
                <div className="mb-8 flex flex-col justify-between gap-5 border-b border-[#d7d2c7] pb-7 md:flex-row md:items-end">
                  <div><p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#81796e]">Editing / {selectedPage?.label ?? selectedSlug}</p><h2 className="mt-2 text-4xl font-black tracking-[-0.06em]">Shape the public page.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#71695f]">Build the story, tune the signal, then publish when the draft is ready.</p></div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowComparison((current) => !current)} disabled={!savedDraft} aria-expanded={showComparison} className="gap-2 border-[#bcb5a9] bg-[#f8f7f2]" data-testid="button-toggle-cms-comparison"><GitCompare className="h-4 w-4" /> {showComparison ? "Hide comparison" : "Compare with live"}</Button>
                    <Button type="button" variant="outline" onClick={saveDraft} disabled={isSaving} className="gap-2 border-[#bcb5a9] bg-[#f8f7f2]" data-testid="button-save-cms-draft">{saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft</Button>
                    <Button type="button" variant="outline" onClick={restorePreviousPublished} disabled={isSaving || !selectedPage?.publishedBackup} title={selectedPage?.publishedBackup ? "Restore the design that was live before the last publish" : "A previous published design will be available after the next publish"} className="gap-2 border-[#bcb5a9] bg-[#f8f7f2]" data-testid="button-restore-cms-page">{restoreMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />} Restore</Button>
                    <Button type="button" onClick={publish} disabled={isSaving || !previewConfirmed} className="gap-2 bg-[#1b1b1b] text-[#f8f7f2]" data-testid="button-publish-cms-page">{publishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish</Button>
                    {selectedPage?.published && <Button type="button" variant="ghost" onClick={unpublish} disabled={isSaving} className="gap-2 text-[#8b3028]" data-testid="button-unpublish-cms-page">{unpublishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />} Unpublish</Button>}
                  </div>
                </div>
                {feedback && <div className={`mb-6 border px-4 py-3 text-sm ${feedback.type === "success" ? "border-[#a9c4af] bg-[#e8f0e8] text-[#315a3d]" : "border-[#d7b1a8] bg-[#f8e9e4] text-[#6e2c25]"}`} role="status" data-testid="status-cms-feedback">{feedback.message}</div>}
                {showComparison && savedDraft && <CmsComparison slug={apiSlug} label={selectedPage?.label ?? selectedSlug} draft={savedDraft} published={selectedPage?.published ?? null} updatedAt={selectedPage?.updatedAt ?? null} />}
                <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_12px_var(--cms-preview-width)] xl:gap-0" style={{ "--cms-preview-width": `${previewWidth}px` } as React.CSSProperties}>
                  <div className="space-y-6">
                    <section className="border border-[#d7d2c7] bg-[#f8f7f2] p-5 md:p-6">
                      <div className="mb-5 flex items-center gap-3"><FileText className="h-4 w-4 text-[#81796e]" /><div><h3 className="font-bold">Page foundation</h3><p className="text-xs text-[#81796e]">Search metadata and the base color system.</p></div></div>
                      <div className="grid gap-5">
                        <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Page title<Input value={document.pageTitle} onChange={(event) => updateDocument("pageTitle", event.target.value)} className={`${panelInput} text-base font-semibold`} data-testid="input-cms-page-title" /></label>
                        <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Meta description<Textarea value={document.metaDescription} onChange={(event) => updateDocument("metaDescription", event.target.value)} className={`${panelInput} min-h-20`} data-testid="textarea-cms-meta-description" /></label>
                        <div className="grid grid-cols-3 gap-3">
                          {(["backgroundColor", "textColor", "accentColor"] as const).map((key) => <label key={key} className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">{key.replace("Color", "")}<div className="flex h-10 items-center gap-2 border border-[#d7d2c7] bg-[#fbfaf6] px-2"><input type="color" value={document[key]} onChange={(event) => updateDocument(key, event.target.value)} className="h-7 w-8 cursor-pointer border-0 bg-transparent p-0" data-testid={`input-cms-${key}`} /><span className="font-sans text-[10px] font-normal normal-case tracking-normal text-[#777168]">{document[key]}</span></div></label>)}
                        </div>
                      </div>
                    </section>
                     <section>
                       <div className="mb-4 flex items-end justify-between gap-4"><div><p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#81796e]">Page architecture</p><h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">Sections</h3></div><div className="flex flex-wrap justify-end gap-2">{selectedSlug === "/" ? <><Button type="button" variant="outline" size="sm" onClick={() => addHomeSection("home-map-search")} data-testid="button-add-home-map-section"><Plus className="h-3.5 w-3.5" /> Map & search</Button><Button type="button" variant="outline" size="sm" onClick={() => addHomeSection("home-process")} data-testid="button-add-home-process-section"><Plus className="h-3.5 w-3.5" /> Process</Button><Button type="button" variant="outline" size="sm" onClick={() => addHomeSection("home-property-collection")} data-testid="button-add-home-collection-section"><Plus className="h-3.5 w-3.5" /> Listing collection</Button><Button type="button" variant="outline" size="sm" onClick={() => addHomeSection("home-bnb-hotels")} data-testid="button-add-home-bnb-section"><Plus className="h-3.5 w-3.5" /> B&B & Hotels</Button></> : <><Button type="button" variant="outline" size="sm" onClick={() => addSection("content")} data-testid="button-add-content-section"><Plus className="h-3.5 w-3.5" /> Section</Button><Button type="button" variant="outline" size="sm" onClick={() => addSection("feature")} data-testid="button-add-feature-section"><Plus className="h-3.5 w-3.5" /> Feature grid</Button>{selectedSlug === "/about" && <Button type="button" variant="outline" size="sm" onClick={() => addPageSection("about-offerings")} data-testid="button-add-about-offerings-section"><Plus className="h-3.5 w-3.5" /> Offerings</Button>}{selectedSlug === "/contact" && <><Button type="button" variant="outline" size="sm" onClick={() => addPageSection("contact-details")} data-testid="button-add-contact-details-section"><Plus className="h-3.5 w-3.5" /> Contact details</Button><Button type="button" variant="outline" size="sm" onClick={() => addPageSection("contact-form")} data-testid="button-add-contact-form-section"><Plus className="h-3.5 w-3.5" /> Contact form</Button></>}{selectedSlug === "/pricing" && <Button type="button" variant="outline" size="sm" onClick={() => addPageSection("pricing-plans")} data-testid="button-add-pricing-plans-section"><Plus className="h-3.5 w-3.5" /> Pricing plans</Button>}{selectedSlug === "/bnb" && <Button type="button" variant="outline" size="sm" onClick={() => addPageSection("bnb-directory")} data-testid="button-add-bnb-directory-section"><Plus className="h-3.5 w-3.5" /> Live directory</Button>}</>}</div></div>
                      <div className="space-y-4">
                        {document.sections.length === 0 ? <div className="border border-dashed border-[#bcb5a9] px-6 py-12 text-center"><p className="font-bold">This page is empty.</p><p className="mt-2 text-sm text-[#81796e]">Start with a section and assemble the page from there.</p></div> : document.sections.map((section, index) => (
                          <div
                            key={section.id}
                            onDragOver={(event) => {
                              event.preventDefault();
                              if (draggingSectionId && draggingSectionId !== section.id) setDropTargetSectionId(section.id);
                            }}
                            onDragLeave={(event) => {
                              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTargetSectionId(null);
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              reorderSection(event.dataTransfer.getData("text/cms-section-id"), section.id);
                              finishDraggingSection();
                            }}
                          >
                            <CmsSectionEditor
                              section={section}
                              index={index}
                              total={document.sections.length}
                              onChange={updateSection}
                              onDelete={() => deleteSection(section.id)}
                              onMoveUp={() => moveSection(section.id, -1)}
                              onMoveDown={() => moveSection(section.id, 1)}
                              onDragStart={(event) => startDraggingSection(event, section.id)}
                              onDragEnd={finishDraggingSection}
                              isDragging={draggingSectionId === section.id}
                              isDropTarget={dropTargetSectionId === section.id}
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                  <CmsResizeHandle target="preview" value={previewWidth} min={300} max={680} onStart={startResize} onKeyDown={updateResizeWithKeyboard} />
                  <aside className="xl:sticky xl:top-24 xl:self-start">
                    <div className="mb-3 flex items-center justify-between"><p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#81796e]">Live composition</p><span className={`font-sans text-[10px] uppercase tracking-[0.14em] ${selectedPage?.published ? "text-[#4a765c]" : "text-[#81796e]"}`}>{selectedPage?.published ? "Published" : "Draft only"}</span></div>
                     <div className="max-h-[720px] overflow-y-auto border border-[#d7d2c7] bg-[#f8f7f2] shadow-[0_18px_50px_rgba(38,32,22,0.12)]" data-testid="cms-live-composition-preview">
                       <CmsPreviewRenderer slug={`${apiSlug}-draft-composition`} label={selectedPage?.label ?? selectedSlug} document={document} includeChrome={false} previewMode />
                     </div>
                    <button type="button" onClick={openDraftPreview} disabled={isSaving} className="mt-4 flex w-full items-center justify-center gap-2 border border-[#bcb5a9] bg-[#f8f7f2] px-4 py-3 text-sm font-semibold transition-colors hover:bg-[#eeebe3] disabled:cursor-not-allowed disabled:opacity-50" data-testid="link-cms-draft-preview"><Eye className="h-4 w-4" /> {previewMutation.isPending ? "Preparing preview…" : "Open unsaved preview"}</button>
                    {previewedDraftFingerprint === currentDraftFingerprint && previewedLiveFingerprint === currentLiveFingerprint && currentDraftFingerprint && (
                      <div className="mt-3 border border-[#a9c4af] bg-[#e8f0e8] p-3 text-xs leading-5 text-[#315a3d]">
                        <p className="font-bold">Preview opened for this exact draft.</p>
                        <button type="button" onClick={() => setConfirmedDraftFingerprint(currentDraftFingerprint)} disabled={previewConfirmed} className="mt-2 border border-[#4a765c] bg-[#4a765c] px-3 py-2 font-semibold text-white disabled:cursor-default disabled:opacity-60" data-testid="button-confirm-cms-preview">
                          {previewConfirmed ? "Preview confirmed" : "I reviewed this preview"}
                        </button>
                      </div>
                    )}
                    {!previewConfirmed && <p className="mt-3 text-xs leading-5 text-[#8b3028]" data-testid="cms-publish-preview-required">Publishing is locked until this exact draft is previewed and confirmed.</p>}
                    <div className="mt-4 border border-[#d7d2c7] bg-[#e9e6de] p-4 text-xs leading-5 text-[#71695f]"><p className="font-bold text-[#3b3833]">Publishing note</p><p className="mt-1">Publishing replaces the public page immediately. Unpublish restores its existing component fallback.</p></div>
                  </aside>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}