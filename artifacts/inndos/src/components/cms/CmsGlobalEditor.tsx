import { useCallback, useEffect, useMemo, useState } from "react";
import { GripVertical, Loader2, Plus, Save, Send, Trash2, Undo2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrandWordmark } from "@/components/layout/BrandWordmark";
import { useAuth } from "@/lib/auth";
import {
  normalizeCmsGlobalDocument,
  type CmsGlobalDocument,
  type CmsGlobalFooterColumn,
  type CmsGlobalFooterLink,
  type CmsGlobalLayoutSection,
  type CmsGlobalLayoutSectionType,
  type CmsGlobalNavChild,
  type CmsGlobalNavItem,
} from "@/lib/cms-global";

type GlobalSurface = "header" | "footer";

type GlobalResponse = {
  draft: CmsGlobalDocument;
  published: CmsGlobalDocument | null;
  publishedBackup: CmsGlobalDocument | null;
  publishedAt: string | null;
  publishedBackupAt: string | null;
  updatedAt: string | null;
};

const panelInput = "border-[#d7d2c7] bg-[#fbfaf6] focus-visible:ring-[#252525]";

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item) next.splice(to, 0, item);
  return next;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5d5850]">
      {label}
      <div className="flex h-10 items-center gap-2 border border-[#d7d2c7] bg-[#fbfaf6] px-2">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-7 w-8 cursor-pointer border-0 bg-transparent p-0" />
        <span className="font-sans text-[10px] font-normal normal-case tracking-normal text-[#777168]">{value}</span>
      </div>
    </label>
  );
}

const HEADER_SECTION_TYPES: CmsGlobalLayoutSectionType[] = ["announcement", "brand", "navigation", "actions"];
const FOOTER_SECTION_TYPES: CmsGlobalLayoutSectionType[] = ["brand", "columns", "contact", "social", "copyright"];

function GlobalLayoutSectionEditor({
  section,
  onChange,
  onDelete,
  onDragStart,
  onDrop,
}: {
  section: CmsGlobalLayoutSection;
  onChange: (section: CmsGlobalLayoutSection) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className="grid gap-3 border border-[#d7d2c7] bg-[#f8f7f2] p-3 sm:grid-cols-[auto_1fr_auto]"
    >
      <GripVertical className="mt-2 h-4 w-4 cursor-grab text-[#938b7f]" />
      <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
        <p className="pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#81796e]">{section.type}</p>
        <Input value={section.label} onChange={(event) => onChange({ ...section, label: event.target.value })} className={panelInput} placeholder="Section label" aria-label={`${section.type} section label`} />
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-[10px] text-[#71695f]"><input type="checkbox" checked={section.visible} onChange={(event) => onChange({ ...section, visible: event.target.checked })} /> Show</label>
        <Button type="button" variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-[#8b3028]" aria-label={`Delete ${section.type} section`}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

function PreviewLayoutSection({
  section,
  surface,
  document,
  onDragStart,
  onDrop,
}: {
  section: CmsGlobalLayoutSection;
  surface: GlobalSurface;
  document: CmsGlobalDocument;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  if (!section.visible) return null;
  const isHeader = surface === "header";
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className="group relative border border-dashed border-transparent p-2 transition-colors hover:border-[#bcb5a9]"
      data-testid={`global-preview-section-${section.id}`}
    >
      <span className="pointer-events-none absolute right-2 top-1 hidden bg-[#1b1b1b] px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-white group-hover:block">{section.label}</span>
      {isHeader && section.type === "announcement" && <div className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ backgroundColor: document.header.accentColor, color: document.header.backgroundColor }}>{section.label}</div>}
      {isHeader && section.type === "brand" && <div className="flex items-center justify-between gap-4"><BrandWordmark className="h-7" /><span className="text-[10px] text-[#81796e]">Brand row</span></div>}
      {isHeader && section.type === "navigation" && <div className="flex flex-wrap items-center justify-end gap-3 text-xs font-semibold" style={{ color: document.header.mutedTextColor }}>{document.header.navItems.filter((item) => item.visible).map((item) => <span key={item.id}>{item.label}{item.children.some((child) => child.visible) ? " ▾" : ""}</span>)}</div>}
      {isHeader && section.type === "actions" && <div className="flex flex-wrap justify-end gap-2"><span className="rounded-full border px-3 py-1 text-[10px]" style={{ borderColor: document.header.accentColor, color: document.header.accentColor }}>List Property</span><span className="rounded-full border px-3 py-1 text-[10px]" style={{ borderColor: document.header.borderColor, color: document.header.mutedTextColor }}>Account actions</span></div>}
      {!isHeader && section.type === "brand" && <div><BrandWordmark className="h-7" /><p className="mt-2 whitespace-pre-line text-xs" style={{ color: document.footer.mutedTextColor }}>{document.footer.brandDescription}</p></div>}
      {!isHeader && section.type === "columns" && <div className="grid gap-4 sm:grid-cols-3">{document.footer.columns.filter((column) => column.visible).map((column) => <div key={column.id}><strong className="text-xs">{column.title}</strong><div className="mt-2 space-y-1">{column.links.filter((link) => link.visible).slice(0, 3).map((link) => <p key={link.id} className="text-xs" style={{ color: document.footer.mutedTextColor }}>{link.label}</p>)}</div></div>)}</div>}
      {!isHeader && section.type === "contact" && <p className="whitespace-pre-line text-xs" style={{ color: document.footer.mutedTextColor }}>{document.footer.contactText}</p>}
      {!isHeader && section.type === "social" && <div className="flex flex-wrap gap-2">{document.footer.socialLinks.filter((link) => link.visible).map((link) => <span key={link.id} className="rounded-full border px-2 py-1 text-[10px]" style={{ borderColor: `${document.footer.textColor}33`, color: document.footer.mutedTextColor }}>{link.label}</span>)}</div>}
      {!isHeader && section.type === "copyright" && <p className="border-t pt-3 text-center text-[10px]" style={{ borderColor: `${document.footer.textColor}1a`, color: document.footer.mutedTextColor }}>{document.footer.copyrightText}</p>}
    </div>
  );
}

function GlobalPreview({
  document,
  surface,
  onLayoutDragStart,
  onLayoutDrop,
}: {
  document: CmsGlobalDocument;
  surface: GlobalSurface;
  onLayoutDragStart: (id: string) => void;
  onLayoutDrop: (id: string) => void;
}) {
  const sections = document[surface].layoutSections;
  return (
    <div className="overflow-hidden rounded border border-[#d7d2c7] bg-white shadow-sm" style={{ backgroundColor: document[surface].backgroundColor, color: document[surface].textColor }}>
      <div className="space-y-2 p-3">
        {sections.filter((section) => section.visible).map((section) => <PreviewLayoutSection key={section.id} section={section} surface={surface} document={document} onDragStart={() => onLayoutDragStart(section.id)} onDrop={() => onLayoutDrop(section.id)} />)}
        {sections.length === 0 && <p className="border border-dashed border-[#bcb5a9] px-4 py-8 text-center text-xs text-[#81796e]">No sections. Add one to build this {surface}.</p>}
      </div>
    </div>
  );
}

function NavChildEditor({
  child,
  onChange,
  onDelete,
  onDragStart,
  onDrop,
}: {
  child: CmsGlobalNavChild;
  onChange: (child: CmsGlobalNavChild) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  return (
    <div draggable onDragStart={onDragStart} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} className="grid gap-2 border-l-2 border-[#d7d2c7] bg-[#fbfaf6] p-2 sm:grid-cols-[auto_1fr_1fr_auto]">
      <GripVertical className="mt-2 h-4 w-4 cursor-grab text-[#938b7f]" />
      <Input value={child.label} onChange={(event) => onChange({ ...child, label: event.target.value })} className={panelInput} placeholder="Submenu label" aria-label="Submenu label" />
      <Input value={child.href} onChange={(event) => onChange({ ...child, href: event.target.value })} className={panelInput} placeholder="/destination" aria-label="Submenu link" />
      <div className="flex items-center gap-1">
        <label className="flex items-center gap-1 text-[10px] text-[#71695f]"><input type="checkbox" checked={child.visible} onChange={(event) => onChange({ ...child, visible: event.target.checked })} /> Show</label>
        <Button type="button" variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-[#8b3028]" aria-label="Delete submenu item"><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

function NavItemEditor({
  item,
  onChange,
  onDelete,
  onDragStart,
  onDrop,
}: {
  item: CmsGlobalNavItem;
  onChange: (item: CmsGlobalNavItem) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const [draggingChildId, setDraggingChildId] = useState<string | null>(null);
  const updateChild = (child: CmsGlobalNavChild) => onChange({ ...item, children: item.children.map((current) => current.id === child.id ? child : current) });
  const addChild = () => onChange({ ...item, children: [...item.children, { id: uid("submenu"), label: "New submenu item", href: "/", visible: true }] });
  const reorderChild = (targetId: string) => {
    if (!draggingChildId || draggingChildId === targetId) return;
    const from = item.children.findIndex((child) => child.id === draggingChildId);
    const to = item.children.findIndex((child) => child.id === targetId);
    onChange({ ...item, children: moveItem(item.children, from, to) });
    setDraggingChildId(null);
  };
  return (
    <div draggable onDragStart={onDragStart} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} className="space-y-3 border border-[#d7d2c7] bg-[#f8f7f2] p-4">
      <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto]">
        <GripVertical className="mt-2 h-4 w-4 cursor-grab text-[#938b7f]" />
        <Input value={item.label} onChange={(event) => onChange({ ...item, label: event.target.value })} className={panelInput} placeholder="Menu label" aria-label="Menu label" />
        <Input value={item.href} onChange={(event) => onChange({ ...item, href: event.target.value })} className={panelInput} placeholder="/destination" aria-label="Menu link" />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[10px] text-[#71695f]"><input type="checkbox" checked={item.visible} onChange={(event) => onChange({ ...item, visible: event.target.checked })} /> Show</label>
          <Button type="button" variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-[#8b3028]" aria-label="Delete menu item"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-[#71695f]"><input type="checkbox" checked={Boolean(item.requiresAuth)} onChange={(event) => onChange({ ...item, requiresAuth: event.target.checked })} /> Only show after sign-in</label>
      <div className="space-y-2 border-t border-[#d7d2c7] pt-3">
        <div className="flex items-center justify-between"><p className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-[#81796e]">Submenu items</p><Button type="button" variant="outline" size="sm" onClick={addChild}><Plus className="h-3 w-3" /> Add submenu</Button></div>
        {item.children.map((child) => <NavChildEditor key={child.id} child={child} onChange={updateChild} onDelete={() => onChange({ ...item, children: item.children.filter((current) => current.id !== child.id) })} onDragStart={() => setDraggingChildId(child.id)} onDrop={() => reorderChild(child.id)} />)}
        {item.children.length === 0 && <p className="text-xs text-[#938b7f]">No submenu items. Add one to create a dropdown or nested mobile menu.</p>}
      </div>
    </div>
  );
}

function FooterLinkEditor({ link, onChange, onDelete, onDragStart, onDrop }: { link: CmsGlobalFooterLink; onChange: (link: CmsGlobalFooterLink) => void; onDelete: () => void; onDragStart: () => void; onDrop: () => void }) {
  return (
    <div draggable onDragStart={onDragStart} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} className="grid gap-2 border-l-2 border-[#d7d2c7] bg-[#fbfaf6] p-2 sm:grid-cols-[auto_1fr_1fr_auto]">
      <GripVertical className="mt-2 h-4 w-4 cursor-grab text-[#938b7f]" />
      <Input value={link.label} onChange={(event) => onChange({ ...link, label: event.target.value })} className={panelInput} placeholder="Link label" aria-label="Footer link label" />
      <Input value={link.href} onChange={(event) => onChange({ ...link, href: event.target.value })} className={panelInput} placeholder="/destination" aria-label="Footer link" />
      <div className="flex items-center gap-1"><label className="flex items-center gap-1 text-[10px] text-[#71695f]"><input type="checkbox" checked={link.visible} onChange={(event) => onChange({ ...link, visible: event.target.checked })} /> Show</label><Button type="button" variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-[#8b3028]" aria-label="Delete footer link"><Trash2 className="h-3.5 w-3.5" /></Button></div>
    </div>
  );
}

function FooterColumnEditor({ column, onChange, onDelete, onDragStart, onDrop }: { column: CmsGlobalFooterColumn; onChange: (column: CmsGlobalFooterColumn) => void; onDelete: () => void; onDragStart: () => void; onDrop: () => void }) {
  const [draggingLinkId, setDraggingLinkId] = useState<string | null>(null);
  const updateLink = (link: CmsGlobalFooterLink) => onChange({ ...column, links: column.links.map((current) => current.id === link.id ? link : current) });
  const addLink = () => onChange({ ...column, links: [...column.links, { id: uid("footer-link"), label: "New link", href: "/", visible: true }] });
  const reorderLink = (targetId: string) => {
    if (!draggingLinkId || draggingLinkId === targetId) return;
    onChange({ ...column, links: moveItem(column.links, column.links.findIndex((link) => link.id === draggingLinkId), column.links.findIndex((link) => link.id === targetId)) });
    setDraggingLinkId(null);
  };
  return (
    <div draggable onDragStart={onDragStart} onDragOver={(event) => event.preventDefault()} onDrop={onDrop} className="space-y-3 border border-[#d7d2c7] bg-[#f8f7f2] p-4">
      <div className="flex items-center gap-2"><GripVertical className="h-4 w-4 cursor-grab text-[#938b7f]" /><Input value={column.title} onChange={(event) => onChange({ ...column, title: event.target.value })} className={`${panelInput} flex-1`} placeholder="Column title" aria-label="Footer column title" /><label className="flex shrink-0 items-center gap-1 text-[10px] text-[#71695f]"><input type="checkbox" checked={column.visible} onChange={(event) => onChange({ ...column, visible: event.target.checked })} /> Show</label><Button type="button" variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-[#8b3028]" aria-label="Delete footer column"><Trash2 className="h-3.5 w-3.5" /></Button></div>
      <div className="space-y-2 border-t border-[#d7d2c7] pt-3"><div className="flex items-center justify-between"><p className="font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-[#81796e]">Column links</p><Button type="button" variant="outline" size="sm" onClick={addLink}><Plus className="h-3 w-3" /> Add link</Button></div>{column.links.map((link) => <FooterLinkEditor key={link.id} link={link} onChange={updateLink} onDelete={() => onChange({ ...column, links: column.links.filter((current) => current.id !== link.id) })} onDragStart={() => setDraggingLinkId(link.id)} onDrop={() => reorderLink(link.id)} />)}</div>
    </div>
  );
}

export function CmsGlobalEditor({ surface }: { surface: GlobalSurface }) {
  const { token } = useAuth();
  const [document, setDocument] = useState<CmsGlobalDocument | null>(null);
  const [published, setPublished] = useState<CmsGlobalDocument | null>(null);
  const [backup, setBackup] = useState<CmsGlobalDocument | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewedFingerprint, setPreviewedFingerprint] = useState<string | null>(null);
  const [confirmedFingerprint, setConfirmedFingerprint] = useState<string | null>(null);
  const [draggingNavId, setDraggingNavId] = useState<string | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [draggingLayoutId, setDraggingLayoutId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/cms/global", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not load global settings.");
       setDocument(normalizeCmsGlobalDocument(payload.draft));
       setPublished(payload.published ? normalizeCmsGlobalDocument(payload.published) : null);
       setBackup(payload.publishedBackup ? normalizeCmsGlobalDocument(payload.publishedBackup) : null);
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Could not load global settings." });
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => { if (token) void load(); }, [load, token]);

  const fingerprint = useMemo(() => document ? JSON.stringify(document) : "", [document]);
  const publishedFingerprint = useMemo(() => published ? JSON.stringify(published) : "", [published]);
  const confirmed = Boolean(fingerprint && previewedFingerprint === fingerprint && confirmedFingerprint === fingerprint);
  const updateHeader = (patch: Partial<CmsGlobalDocument["header"]>) => setDocument((current) => current ? { ...current, header: { ...current.header, ...patch } } : current);
  const updateFooter = (patch: Partial<CmsGlobalDocument["footer"]>) => setDocument((current) => current ? { ...current, footer: { ...current.footer, ...patch } } : current);

  const request = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message ?? payload.error ?? "Request failed.");
    return payload;
  };
  const saveDraft = async () => {
    if (!document) return;
    setSaving(true); setFeedback(null);
    try {
      const payload = await request("/api/cms/global", { method: "PUT", body: JSON.stringify({ draft: document }) });
      setDocument(payload.draft ?? document);
      setPreviewedFingerprint(null); setConfirmedFingerprint(null);
      setFeedback({ type: "success", message: "Global draft saved. Preview it before publishing." });
    } catch (error) { setFeedback({ type: "error", message: error instanceof Error ? error.message : "Could not save global draft." }); } finally { setSaving(false); }
  };
  const previewDraft = async () => {
    if (!document) return;
    setSaving(true); setFeedback(null);
    try {
      await request("/api/cms/global/preview", { method: "POST", body: JSON.stringify({ draft: document }) });
      setPreviewedFingerprint(fingerprint); setConfirmedFingerprint(null);
      setFeedback({ type: "success", message: "Preview opened for this exact global draft. Review it, then confirm publishing." });
    } catch (error) { setFeedback({ type: "error", message: error instanceof Error ? error.message : "Could not prepare preview." }); } finally { setSaving(false); }
  };
  const publish = async () => {
    if (!document || !confirmed) return;
    setSaving(true); setFeedback(null);
    try {
      const payload = await request("/api/cms/global/publish", { method: "POST" });
      setPublished(payload.published ?? document); setBackup(payload.publishedBackup ?? published); setPreviewedFingerprint(null); setConfirmedFingerprint(null);
      setFeedback({ type: "success", message: "Global Header and Footer are now live." });
    } catch (error) { setFeedback({ type: "error", message: error instanceof Error ? error.message : "Could not publish global settings." }); } finally { setSaving(false); }
  };
  const restore = async () => {
    if (!backup) return;
    setSaving(true); setFeedback(null);
    try {
      const payload = await request("/api/cms/global/restore", { method: "POST" });
      setDocument(payload.draft); setPublished(payload.published); setBackup(payload.publishedBackup ?? null); setPreviewedFingerprint(null); setConfirmedFingerprint(null);
      setFeedback({ type: "success", message: "The previous published global version was restored." });
    } catch (error) { setFeedback({ type: "error", message: error instanceof Error ? error.message : "Could not restore global settings." }); } finally { setSaving(false); }
  };
  const unpublish = async () => {
    setSaving(true); setFeedback(null);
    try { await request("/api/cms/global/unpublish", { method: "POST" }); setPublished(null); setFeedback({ type: "success", message: "Global overrides unpublished. The built-in Header and Footer are active." }); }
    catch (error) { setFeedback({ type: "error", message: error instanceof Error ? error.message : "Could not unpublish global settings." }); } finally { setSaving(false); }
  };

  const updateNavItem = (item: CmsGlobalNavItem) => updateHeader({ navItems: document!.header.navItems.map((current) => current.id === item.id ? item : current) });
  const addNavItem = () => updateHeader({ navItems: [...document!.header.navItems, { id: uid("menu"), label: "New menu item", href: "/", visible: true, children: [] }] });
  const reorderNav = (targetId: string) => {
    if (!draggingNavId || draggingNavId === targetId || !document) return;
    updateHeader({ navItems: moveItem(document.header.navItems, document.header.navItems.findIndex((item) => item.id === draggingNavId), document.header.navItems.findIndex((item) => item.id === targetId)) });
    setDraggingNavId(null);
  };
  const updateColumn = (column: CmsGlobalFooterColumn) => updateFooter({ columns: document!.footer.columns.map((current) => current.id === column.id ? column : current) });
  const addColumn = () => updateFooter({ columns: [...document!.footer.columns, { id: uid("column"), title: "New column", visible: true, links: [] }] });
  const reorderColumns = (targetId: string) => {
    if (!draggingColumnId || draggingColumnId === targetId || !document) return;
    updateFooter({ columns: moveItem(document.footer.columns, document.footer.columns.findIndex((column) => column.id === draggingColumnId), document.footer.columns.findIndex((column) => column.id === targetId)) });
    setDraggingColumnId(null);
  };
  const layoutSections = document ? document[surface].layoutSections : [];
  const updateLayoutSection = (section: CmsGlobalLayoutSection) => {
    if (!document) return;
    const next = document[surface].layoutSections.map((current) => current.id === section.id ? section : current);
    if (surface === "header") updateHeader({ layoutSections: next });
    else updateFooter({ layoutSections: next });
  };
  const addLayoutSection = (type: CmsGlobalLayoutSectionType) => {
    const section: CmsGlobalLayoutSection = {
      id: uid(`${surface}-${type}`),
      type,
      label: type === "announcement" ? "New announcement" : type[0].toUpperCase() + type.slice(1),
      visible: true,
    };
    if (surface === "header") updateHeader({ layoutSections: [...layoutSections, section] });
    else updateFooter({ layoutSections: [...layoutSections, section] });
  };
  const deleteLayoutSection = (id: string) => {
    if (surface === "header") updateHeader({ layoutSections: document!.header.layoutSections.filter((section) => section.id !== id) });
    else updateFooter({ layoutSections: document!.footer.layoutSections.filter((section) => section.id !== id) });
  };
  const reorderLayoutSections = (targetId: string) => {
    if (!draggingLayoutId || draggingLayoutId === targetId || !document) return;
    const next = moveItem(layoutSections, layoutSections.findIndex((section) => section.id === draggingLayoutId), layoutSections.findIndex((section) => section.id === targetId));
    if (surface === "header") updateHeader({ layoutSections: next });
    else updateFooter({ layoutSections: next });
    setDraggingLayoutId(null);
  };

  if (loading || !document) return <div className="space-y-4"><div className="h-8 w-72 animate-pulse bg-[#d7d2c7]" /><div className="h-24 animate-pulse bg-[#dfdbd1]" /><div className="h-72 animate-pulse bg-[#dfdbd1]" /></div>;
  const isHeader = surface === "header";
  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-5 border-b border-[#d7d2c7] pb-7 md:flex-row md:items-end">
        <div><p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#81796e]">Editing / Global {isHeader ? "Header" : "Footer"}</p><h2 className="mt-2 text-4xl font-black tracking-[-0.06em]">Control the site chrome.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#71695f]">Add links, rearrange menus, tune colors, and publish the shared {isHeader ? "navigation" : "footer"} without touching page content.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={previewDraft} disabled={saving} className="gap-2 border-[#bcb5a9] bg-[#f8f7f2]"><Eye className="h-4 w-4" /> Preview draft</Button>
          <Button type="button" variant="outline" onClick={saveDraft} disabled={saving} className="gap-2 border-[#bcb5a9] bg-[#f8f7f2]">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft</Button>
          <Button type="button" variant="outline" onClick={restore} disabled={saving || !backup} className="gap-2 border-[#bcb5a9] bg-[#f8f7f2]"><Undo2 className="h-4 w-4" /> Restore</Button>
          <Button type="button" onClick={publish} disabled={saving || !confirmed} className="gap-2 bg-[#1b1b1b] text-[#f8f7f2]"><Send className="h-4 w-4" /> Publish</Button>
          {published && <Button type="button" variant="ghost" onClick={unpublish} disabled={saving} className="gap-2 text-[#8b3028]"><Undo2 className="h-4 w-4" /> Unpublish</Button>}
        </div>
      </div>
      {feedback && <div className={`mb-6 border px-4 py-3 text-sm ${feedback.type === "success" ? "border-[#a9c4af] bg-[#e8f0e8] text-[#315a3d]" : "border-[#d7b1a8] bg-[#f8e9e4] text-[#6e2c25]"}`} role="status">{feedback.message}</div>}
       <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
        <div className="space-y-6">
          {isHeader ? (
            <>
               <section className="border border-[#d7d2c7] bg-[#f8f7f2] p-5 md:p-6">
                 <div className="mb-5 flex items-end justify-between gap-4">
                   <div><p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#81796e]">Visual layout</p><h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">Header sections</h3><p className="mt-1 text-xs text-[#81796e]">Drag sections here or directly in the preview to change the header order.</p></div>
                   <div className="flex flex-wrap justify-end gap-2">{HEADER_SECTION_TYPES.map((type) => <Button key={type} type="button" variant="outline" size="sm" onClick={() => addLayoutSection(type)}><Plus className="h-3.5 w-3.5" /> {type}</Button>)}</div>
                 </div>
                 <div className="space-y-2">{layoutSections.map((section) => <GlobalLayoutSectionEditor key={section.id} section={section} onChange={updateLayoutSection} onDelete={() => deleteLayoutSection(section.id)} onDragStart={() => setDraggingLayoutId(section.id)} onDrop={() => reorderLayoutSections(section.id)} />)}</div>
               </section>
              <section className="border border-[#d7d2c7] bg-[#f8f7f2] p-5 md:p-6"><div className="mb-5"><h3 className="font-bold">Header appearance</h3><p className="text-xs text-[#81796e]">These colors apply to the shared desktop and mobile header.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(["backgroundColor", "textColor", "mutedTextColor", "accentColor", "borderColor"] as const).map((key) => <ColorField key={key} label={key.replace("Color", " color")} value={document.header[key]} onChange={(value) => updateHeader({ [key]: value })} />)}</div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">List property label<Input value={document.header.listPropertyLabel} onChange={(event) => updateHeader({ listPropertyLabel: event.target.value })} className={panelInput} /></label><label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">List property link<Input value={document.header.listPropertyHref} onChange={(event) => updateHeader({ listPropertyHref: event.target.value })} className={panelInput} /></label></div><div className="mt-4 flex flex-wrap gap-4 text-xs text-[#71695f]"><label className="flex items-center gap-2"><input type="checkbox" checked={document.header.showListProperty} onChange={(event) => updateHeader({ showListProperty: event.target.checked })} /> Show list property action</label><label className="flex items-center gap-2"><input type="checkbox" checked={document.header.showAuthActions} onChange={(event) => updateHeader({ showAuthActions: event.target.checked })} /> Show sign-in/account actions</label></div></section>
              <section><div className="mb-4 flex items-end justify-between gap-4"><div><p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#81796e]">Menu architecture</p><h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">Menu items</h3><p className="mt-1 text-xs text-[#81796e]">Drag items to reorder. Each item can have its own submenu.</p></div><Button type="button" variant="outline" size="sm" onClick={addNavItem}><Plus className="h-3.5 w-3.5" /> Add menu item</Button></div><div className="space-y-4">{document.header.navItems.map((item) => <NavItemEditor key={item.id} item={item} onChange={updateNavItem} onDelete={() => updateHeader({ navItems: document.header.navItems.filter((current) => current.id !== item.id) })} onDragStart={() => setDraggingNavId(item.id)} onDrop={() => reorderNav(item.id)} />)}</div></section>
            </>
          ) : (
            <>
               <section className="border border-[#d7d2c7] bg-[#f8f7f2] p-5 md:p-6">
                 <div className="mb-5 flex items-end justify-between gap-4">
                   <div><p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#81796e]">Visual layout</p><h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">Footer sections</h3><p className="mt-1 text-xs text-[#81796e]">Drag sections here or directly in the preview to change the footer order.</p></div>
                   <div className="flex flex-wrap justify-end gap-2">{FOOTER_SECTION_TYPES.map((type) => <Button key={type} type="button" variant="outline" size="sm" onClick={() => addLayoutSection(type)}><Plus className="h-3.5 w-3.5" /> {type}</Button>)}</div>
                 </div>
                 <div className="space-y-2">{layoutSections.map((section) => <GlobalLayoutSectionEditor key={section.id} section={section} onChange={updateLayoutSection} onDelete={() => deleteLayoutSection(section.id)} onDragStart={() => setDraggingLayoutId(section.id)} onDrop={() => reorderLayoutSections(section.id)} />)}</div>
               </section>
              <section className="border border-[#d7d2c7] bg-[#f8f7f2] p-5 md:p-6"><div className="mb-5"><h3 className="font-bold">Footer appearance and content</h3><p className="text-xs text-[#81796e]">Edit the shared site footer, contact block, and legal line.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(["backgroundColor", "textColor", "mutedTextColor", "accentColor"] as const).map((key) => <ColorField key={key} label={key.replace("Color", " color")} value={document.footer[key]} onChange={(value) => updateFooter({ [key]: value })} />)}</div><div className="mt-5 grid gap-4"><label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Brand description<Textarea value={document.footer.brandDescription} onChange={(event) => updateFooter({ brandDescription: event.target.value })} className={`${panelInput} min-h-20`} /></label><label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Contact details<Textarea value={document.footer.contactText} onChange={(event) => updateFooter({ contactText: event.target.value })} className={`${panelInput} min-h-20`} /></label><label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Copyright line<Input value={document.footer.copyrightText} onChange={(event) => updateFooter({ copyrightText: event.target.value })} className={panelInput} /></label></div></section>
              <section><div className="mb-4 flex items-end justify-between gap-4"><div><p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#81796e]">Footer architecture</p><h3 className="mt-1 text-2xl font-black tracking-[-0.04em]">Link columns</h3><p className="mt-1 text-xs text-[#81796e]">Drag columns and links to change the footer arrangement.</p></div><Button type="button" variant="outline" size="sm" onClick={addColumn}><Plus className="h-3.5 w-3.5" /> Add column</Button></div><div className="space-y-4">{document.footer.columns.map((column) => <FooterColumnEditor key={column.id} column={column} onChange={updateColumn} onDelete={() => updateFooter({ columns: document.footer.columns.filter((current) => current.id !== column.id) })} onDragStart={() => setDraggingColumnId(column.id)} onDrop={() => reorderColumns(column.id)} />)}</div></section>
              <section className="border border-[#d7d2c7] bg-[#f8f7f2] p-5"><div className="mb-4"><h3 className="font-bold">Social links</h3><p className="text-xs text-[#81796e]">Update the URLs used by the footer social icons.</p></div><div className="space-y-2">{document.footer.socialLinks.map((link) => <FooterLinkEditor key={link.id} link={link} onChange={(next) => updateFooter({ socialLinks: document.footer.socialLinks.map((current) => current.id === next.id ? next : current) })} onDelete={() => updateFooter({ socialLinks: document.footer.socialLinks.filter((current) => current.id !== link.id) })} onDragStart={() => {}} onDrop={() => {}} />)}</div></section>
            </>
          )}
        </div>
         <aside className="xl:sticky xl:top-24 xl:self-start"><div className="mb-3 flex items-center justify-between"><p className="font-sans text-[10px] uppercase tracking-[0.22em] text-[#81796e]">Live composition</p><span className={`font-sans text-[10px] uppercase tracking-[0.14em] ${published ? "text-[#4a765c]" : "text-[#81796e]"}`}>{published ? "Published" : "Fallback active"}</span></div><GlobalPreview document={document} surface={surface} onLayoutDragStart={setDraggingLayoutId} onLayoutDrop={reorderLayoutSections} /><div className="mt-4 border border-[#d7d2c7] bg-[#e9e6de] p-4 text-xs leading-5 text-[#71695f]"><p className="font-bold text-[#3b3833]">Publishing note</p><p className="mt-1">Preview this exact draft before publishing. Unpublish returns the public site to its built-in Header and Footer.</p></div>{previewedFingerprint === fingerprint && <div className="mt-3 border border-[#a9c4af] bg-[#e8f0e8] p-3 text-xs leading-5 text-[#315a3d]"><p className="font-bold">Preview opened for this exact draft.</p><button type="button" onClick={() => setConfirmedFingerprint(fingerprint)} disabled={confirmed} className="mt-2 border border-[#4a765c] bg-[#4a765c] px-3 py-2 font-semibold text-white disabled:opacity-60">{confirmed ? "Preview confirmed" : "I reviewed this preview"}</button></div>}{!confirmed && <p className="mt-3 text-xs leading-5 text-[#8b3028]">Publishing is locked until this exact draft is previewed and confirmed.</p>}</aside>
      </div>
    </>
  );
}