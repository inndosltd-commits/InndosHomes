import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import type { CmsAction, CmsItem, CmsSection } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CmsSectionEditorProps {
  section: CmsSection;
  index: number;
  total: number;
  onChange: (section: CmsSection) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
}

const fieldClass = "border-[#d7d2c7] bg-[#fbfaf6] focus-visible:ring-[#252525]";

const processCardDefaults: CmsItem[] = [
  { title: "Discover", body: "Explore homes, rentals and stays in places you actually want to live.", number: "01", iconKey: "search", imageSrc: "/images/process-explore.jpeg", imageAlt: "Person searching for a home" },
  { title: "Compare", body: "Compare features, prices and locations to choose the best fit.", number: "02", iconKey: "clipboard-list", imageSrc: "/images/process-evaluate.jpeg", imageAlt: "Bright modern living room interior" },
  { title: "Link Up", body: "Talk directly with property owners and managers.", number: "03", iconKey: "link", imageSrc: "/images/process-connect.jpeg", imageAlt: "Couple shaking hands with property agent" },
  { title: "Move In", body: "Complete the process and step into your new space with confidence.", number: "04", iconKey: "home", imageSrc: "/images/process-settle.jpeg", imageAlt: "Hand holding house keys" },
];

export function CmsSectionEditor({
  section,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  isDragging = false,
  isDropTarget = false,
}: CmsSectionEditorProps) {
  const update = <K extends keyof CmsSection>(key: K, value: CmsSection[K]) => onChange({ ...section, [key]: value });
  const updateItem = (itemIndex: number, key: keyof CmsItem, value: string) => {
    const items = section.items.map((item, currentIndex) => currentIndex === itemIndex ? { ...item, [key]: value } : item);
    update("items", items);
  };
  const addItem = () => update("items", [...section.items, { title: "New point", body: "Describe this point." }]);
  const componentKey = section.settings?.componentKey ?? section.componentKey
    ?? (section.id === "home-map-search" ? "home-map-search" : section.id === "home-process" ? "home-process" : section.id === "home-bnb-hotels" ? "home-bnb-hotels" : ["home-featured", "home-rentals", "home-sale"].includes(section.id) ? "home-property-collection" : undefined);
  const runtimeKey = componentKey
    ?? (section.id === "contact-details" || section.id.startsWith("contact-details-") ? "contact-details"
      : section.id === "contact-form" || section.id.startsWith("contact-form-") ? "contact-form"
        : section.id === "pricing-plans" || section.id.startsWith("pricing-plans-") ? "pricing-plans"
          : section.id === "bnb-categories" || section.id.startsWith("bnb-directory-") ? "bnb-directory"
            : section.id === "about-offerings" || section.id.startsWith("about-offerings-") ? "about-offerings" : undefined);
  const settings = {
    ...(section.id === "home-map-search" ? { searchPlaceholder: "Where to?", resultCountLabel: "properties visible on the map", showLocateButton: true, mapHeight: 620 } : {}),
    ...(section.id === "home-featured" ? { limit: 12, emptyStateText: "Featured listings will appear here when a lister promotes a property." } : {}),
    ...(section.id === "home-rentals" ? { limit: 4, emptyStateText: "Rental listings will appear here when they are approved." } : {}),
    ...(section.id === "home-sale" ? { limit: 4, emptyStateText: "Properties for sale will appear here when they are approved." } : {}),
    ...(section.id === "home-bnb-hotels" ? {
      limit: 12,
      emptyStateText: "B&B and hotel listings will appear here as they are approved.",
      actions: [
        { id: "view-bnbs", label: "View B&Bs", href: "/search?type=bnb", placement: "header" as const, variant: "ghost" as const },
        { id: "view-hotels", label: "View Hotels", href: "/search?type=hotel", placement: "header" as const, variant: "ghost" as const },
        { id: "explore-bnbs", label: "Explore B&Bs", href: "/search?type=bnb", placement: "footer" as const, variant: "primary" as const },
        { id: "explore-hotels", label: "Explore Hotels", href: "/search?type=hotel", placement: "footer" as const, variant: "outline" as const },
      ],
    } : {}),
    ...(runtimeKey === "contact-form" ? {
      formSubjects: ["General Inquiry", "Property Listing Support", "Technical Issue", "Partnership Opportunity"],
      successTitle: "Message sent successfully.",
      successText: "We'll get back to you within 24 hours.",
    } : {}),
    ...(runtimeKey === "bnb-directory" ? {
      limit: 24,
      emptyStateText: "No listings in this category yet.",
      searchPlaceholder: "Search by name or location…",
      maxPrice: 50000,
    } : {}),
    ...(section.settings ?? {}),
  };
  const updateSettings = (patch: Partial<typeof settings>) => update("settings", { ...settings, ...patch });
  const updateAction = (index: number, patch: Partial<CmsAction>) => updateSettings({ actions: (settings.actions ?? []).map((action, actionIndex) => actionIndex === index ? { ...action, ...patch } : action) });
  const addAction = (placement: CmsAction["placement"]) => updateSettings({ actions: [...(settings.actions ?? []), { id: `home-action-${Date.now()}`, label: "New action", href: "/search", placement, variant: placement === "header" ? "ghost" : "primary" }] });
  const isHomeBlock = Boolean(runtimeKey?.startsWith("home-"));

  return (
    <article
      className={`border bg-[#fbfaf6] transition-[box-shadow,opacity,border-color] ${section.visible ? "border-[#d7d2c7]" : "border-dashed border-[#aaa49a] opacity-70"} ${isDragging ? "opacity-45 shadow-none" : "shadow-sm"} ${isDropTarget ? "border-t-4 border-t-[#252525] shadow-[0_-8px_0_-4px_#252525]" : ""}`}
      data-testid={`editor-section-${section.id}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#e4dfd5] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-md text-[#8d877d] transition-colors hover:bg-[#eeebe3] hover:text-[#252525] active:cursor-grabbing"
            aria-label={`Drag section ${index + 1} to reorder`}
            title="Drag to reorder"
            data-testid={`button-drag-section-${section.id}`}
          >
            <GripVertical className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8d877d]">Section {String(index + 1).padStart(2, "0")}</p>
            <p className="truncate text-sm font-bold text-[#252525]">{section.label || section.title || "Untitled section"} {isHomeBlock && <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#81796e]">Live Home block</span>}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={onMoveUp} disabled={index === 0} aria-label="Move section up" data-testid={`button-move-section-up-${section.id}`}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onMoveDown} disabled={index === total - 1} aria-label="Move section down" data-testid={`button-move-section-down-${section.id}`}>
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => update("visible", !section.visible)} data-testid={`button-toggle-section-${section.id}`}>
            {section.visible ? "Visible" : "Hidden"}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="text-[#8b3028] hover:bg-[#f4e4df]" onClick={onDelete} aria-label="Delete section" data-testid={`button-delete-section-${section.id}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid gap-5 p-5 md:grid-cols-2">
        <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">
          Section label
          <Input value={section.label} onChange={(event) => update("label", event.target.value)} className={fieldClass} data-testid={`input-section-label-${section.id}`} />
        </label>
        <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">
          Layout
          <select value={isHomeBlock ? "home" : section.type} disabled={isHomeBlock} onChange={(event) => update("type", event.target.value as CmsSection["type"])} className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm font-normal normal-case tracking-normal outline-none ${fieldClass}`} data-testid={`select-section-type-${section.id}`}>
            {isHomeBlock && <option value="home">Home runtime block</option>}
            <option value="hero">Hero</option>
            <option value="content">Content</option>
            <option value="feature">Feature grid</option>
            <option value="cta">Call to action</option>
          </select>
        </label>
        <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850] md:col-span-2">
          Eyebrow
          <Input value={section.eyebrow} onChange={(event) => update("eyebrow", event.target.value)} className={fieldClass} data-testid={`input-section-eyebrow-${section.id}`} />
        </label>
        <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850] md:col-span-2">
          Title
          <Input value={section.title} onChange={(event) => update("title", event.target.value)} className={`${fieldClass} text-base font-semibold`} data-testid={`input-section-title-${section.id}`} />
        </label>
        <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850] md:col-span-2">
          Body copy
          <Textarea value={section.body} onChange={(event) => update("body", event.target.value)} className={`${fieldClass} min-h-24`} data-testid={`textarea-section-body-${section.id}`} />
        </label>
        {componentKey === "home-map-search" && <div className="grid gap-3 border border-[#d7d2c7] bg-[#f2f0e9] p-4 md:col-span-2 md:grid-cols-2">
          <div className="md:col-span-2"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Live map & search settings</p><p className="mt-1 text-xs font-normal normal-case tracking-normal text-[#81796e]">The map, autocomplete, property pins, and listing count are supplied by live property data. These controls only change the composition around that data.</p></div>
          <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Search placeholder<Input value={settings.searchPlaceholder ?? ""} onChange={(event) => updateSettings({ searchPlaceholder: event.target.value })} className={fieldClass} /></label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Count label<Input value={settings.resultCountLabel ?? ""} onChange={(event) => updateSettings({ resultCountLabel: event.target.value })} className={fieldClass} /></label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Map height (px)<Input type="number" min={320} max={900} value={settings.mapHeight ?? 620} onChange={(event) => updateSettings({ mapHeight: Number(event.target.value) || 620 })} className={fieldClass} /></label>
          <label className="flex items-center gap-2 pt-7 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]"><input type="checkbox" checked={settings.showLocateButton !== false} onChange={(event) => updateSettings({ showLocateButton: event.target.checked })} /> Show location control</label>
        </div>}
         {(componentKey === "home-property-collection" || componentKey === "home-bnb-hotels") && <div className="grid gap-3 border border-[#d7d2c7] bg-[#f2f0e9] p-4 md:col-span-2 md:grid-cols-2">
          <div className="md:col-span-2"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Live listing collection</p><p className="mt-1 text-xs font-normal normal-case tracking-normal text-[#81796e]">Cards, prices, images, verification, and availability are always loaded from approved listings. Edit the block copy and how many live cards appear here.</p></div>
          {componentKey === "home-property-collection" && <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Live data source<select value={settings.collectionType ?? "all"} onChange={(event) => updateSettings({ collectionType: event.target.value as NonNullable<typeof settings.collectionType> })} className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm font-normal normal-case tracking-normal outline-none ${fieldClass}`}><option value="all">All approved listings</option><option value="featured">Featured listings</option><option value="rent">Rental listings</option><option value="sale">Properties for sale</option><option value="bnb-hotels">B&B & Hotels</option></select></label>}
          <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Cards to show<Input type="number" min={1} max={24} value={settings.limit ?? (section.id === "home-featured" || section.id === "home-bnb-hotels" ? 12 : 4)} onChange={(event) => updateSettings({ limit: Number(event.target.value) || 1 })} className={fieldClass} /></label>
          <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Empty state copy<Input value={settings.emptyStateText ?? ""} onChange={(event) => updateSettings({ emptyStateText: event.target.value })} className={fieldClass} /></label>
        </div>}
         {runtimeKey === "contact-form" && <div className="grid gap-3 border border-[#d7d2c7] bg-[#f2f0e9] p-4 md:col-span-2">
           <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Live contact form</p><p className="mt-1 text-xs font-normal normal-case tracking-normal text-[#81796e]">The form continues to submit to the real contact endpoint. Edit its subject choices and success copy without changing that behavior.</p></div>
           <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Subject choices<Textarea value={(settings.formSubjects ?? []).join("\n")} onChange={(event) => updateSettings({ formSubjects: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean) })} className={`${fieldClass} min-h-24`} placeholder="One option per line" /></label>
           <div className="grid gap-3 md:grid-cols-2">
             <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Success title<Input value={settings.successTitle ?? ""} onChange={(event) => updateSettings({ successTitle: event.target.value })} className={fieldClass} /></label>
             <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Success message<Input value={settings.successText ?? ""} onChange={(event) => updateSettings({ successText: event.target.value })} className={fieldClass} /></label>
           </div>
         </div>}
         {runtimeKey === "bnb-directory" && <div className="grid gap-3 border border-[#d7d2c7] bg-[#f2f0e9] p-4 md:col-span-2 md:grid-cols-2">
           <div className="md:col-span-2"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Live B&B directory</p><p className="mt-1 text-xs font-normal normal-case tracking-normal text-[#81796e]">Categories, filters, and cards use approved B&B listings from the live API. These controls change the directory composition, not the source data.</p></div>
           <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Search placeholder<Input value={settings.searchPlaceholder ?? ""} onChange={(event) => updateSettings({ searchPlaceholder: event.target.value })} className={fieldClass} /></label>
           <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Maximum price (KES)<Input type="number" min={1} max={1000000} value={settings.maxPrice ?? 50000} onChange={(event) => updateSettings({ maxPrice: Number(event.target.value) || 50000 })} className={fieldClass} /></label>
           <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Cards to show<Input type="number" min={1} max={24} value={settings.limit ?? 24} onChange={(event) => updateSettings({ limit: Number(event.target.value) || 1 })} className={fieldClass} /></label>
           <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">No-results copy<Input value={settings.emptyStateText ?? ""} onChange={(event) => updateSettings({ emptyStateText: event.target.value })} className={fieldClass} /></label>
         </div>}
        <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">
          Button text
          <Input value={section.buttonText} onChange={(event) => update("buttonText", event.target.value)} className={fieldClass} data-testid={`input-section-button-text-${section.id}`} />
        </label>
        <label className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">
          Button link
          <Input value={section.buttonHref} onChange={(event) => update("buttonHref", event.target.value)} className={fieldClass} data-testid={`input-section-button-href-${section.id}`} />
        </label>
        <div className="grid grid-cols-3 gap-3 md:col-span-2">
          {(["backgroundColor", "textColor", "accentColor"] as const).map((key) => (
            <label key={key} className="space-y-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">
              {key.replace("Color", "")}
              <div className="flex h-10 items-center gap-2 rounded-md border border-[#d7d2c7] bg-[#fbfaf6] px-2">
                <input type="color" value={section[key]} onChange={(event) => update(key, event.target.value)} className="h-7 w-8 cursor-pointer border-0 bg-transparent p-0" data-testid={`input-section-${key}-${section.id}`} />
                <span className="font-mono text-[10px] font-normal normal-case tracking-normal text-[#777168]">{section[key]}</span>
              </div>
            </label>
          ))}
        </div>
        {componentKey === "home-process" ? <div className="space-y-3 border-t border-[#e4dfd5] pt-4 md:col-span-2">
          <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Process cards</p><p className="mt-1 text-xs font-normal normal-case tracking-normal text-[#81796e]">These are the four real cards on the Home page. Edit their copy, icon, number, image path, and alt text.</p></div><Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5" /> Add card</Button></div>
          {section.items.map((item, itemIndex) => { const editorItem = { ...processCardDefaults[itemIndex], ...item }; return <div key={`${section.id}-item-${itemIndex}`} className="grid gap-2 border-l-2 border-[#d7d2c7] pl-3 md:grid-cols-2">
            <Input value={editorItem.number ?? ""} onChange={(event) => updateItem(itemIndex, "number", event.target.value)} placeholder="Number (01)" className={fieldClass} />
            <select value={editorItem.iconKey ?? "home"} onChange={(event) => updateItem(itemIndex, "iconKey", event.target.value)} className={`h-10 rounded-md border px-3 text-sm ${fieldClass}`}><option value="search">Search icon</option><option value="clipboard-list">Compare icon</option><option value="link">Link icon</option><option value="home">Home icon</option></select>
            <Input value={editorItem.title} onChange={(event) => updateItem(itemIndex, "title", event.target.value)} placeholder="Card title" className={fieldClass} />
            <Input value={editorItem.imageSrc ?? ""} onChange={(event) => updateItem(itemIndex, "imageSrc", event.target.value)} placeholder="Image path" className={fieldClass} />
            <Textarea value={editorItem.body} onChange={(event) => updateItem(itemIndex, "body", event.target.value)} placeholder="Card description" className={`${fieldClass} min-h-20`} />
            <Input value={editorItem.imageAlt ?? ""} onChange={(event) => updateItem(itemIndex, "imageAlt", event.target.value)} placeholder="Image alt text" className={fieldClass} />
            <Button type="button" variant="ghost" size="sm" className="w-fit text-[#8b3028]" onClick={() => update("items", section.items.filter((_, currentIndex) => currentIndex !== itemIndex))}><Trash2 className="h-4 w-4" /> Delete card</Button>
          </div>; })}
        </div> : <div className="space-y-3 border-t border-[#e4dfd5] pt-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">Items</p>
            <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid={`button-add-item-${section.id}`}><Plus className="h-3.5 w-3.5" /> Add item</Button>
          </div>
          {section.items.map((item, itemIndex) => (
            <div key={`${section.id}-item-${itemIndex}`} className="grid gap-2 border-l-2 border-[#d7d2c7] pl-3 md:grid-cols-[0.7fr_1.3fr_auto]">
              <Input value={item.title} onChange={(event) => updateItem(itemIndex, "title", event.target.value)} placeholder="Item title" className={fieldClass} data-testid={`input-item-title-${section.id}-${itemIndex}`} />
               <Input value={item.body} onChange={(event) => updateItem(itemIndex, "body", event.target.value)} placeholder="Item body" className={fieldClass} data-testid={`input-item-body-${section.id}-${itemIndex}`} />
               <Input value={item.href ?? ""} onChange={(event) => updateItem(itemIndex, "href", event.target.value)} placeholder="Functional link (optional)" className={fieldClass} data-testid={`input-item-href-${section.id}-${itemIndex}`} />
              <Button type="button" variant="ghost" size="icon" onClick={() => update("items", section.items.filter((_, currentIndex) => currentIndex !== itemIndex))} aria-label="Delete item" data-testid={`button-delete-item-${section.id}-${itemIndex}`}><Trash2 className="h-4 w-4 text-[#8b3028]" /></Button>
            </div>
          ))}
        </div>}
        {componentKey === "home-bnb-hotels" && <div className="space-y-3 border-t border-[#e4dfd5] pt-4 md:col-span-2">
          <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5d5850]">B&B & Hotels actions</p><p className="mt-1 text-xs font-normal normal-case tracking-normal text-[#81796e]">These actions control the links above and below the live cards.</p></div><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => addAction("header")}><Plus className="h-3.5 w-3.5" /> Header action</Button><Button type="button" variant="outline" size="sm" onClick={() => addAction("footer")}><Plus className="h-3.5 w-3.5" /> Footer action</Button></div></div>
          {(settings.actions ?? []).map((action, actionIndex) => <div key={action.id} className="grid gap-2 border-l-2 border-[#d7d2c7] pl-3 md:grid-cols-[1fr_1.3fr_0.8fr_0.8fr_auto]">
            <Input value={action.label} onChange={(event) => updateAction(actionIndex, { label: event.target.value })} placeholder="Label" className={fieldClass} />
            <Input value={action.href} onChange={(event) => updateAction(actionIndex, { href: event.target.value })} placeholder="/search?type=bnb" className={fieldClass} />
            <select value={action.placement} onChange={(event) => updateAction(actionIndex, { placement: event.target.value as CmsAction["placement"] })} className={`h-10 rounded-md border px-3 text-sm ${fieldClass}`}><option value="header">Header</option><option value="footer">Footer</option></select>
            <select value={action.variant} onChange={(event) => updateAction(actionIndex, { variant: event.target.value as CmsAction["variant"] })} className={`h-10 rounded-md border px-3 text-sm ${fieldClass}`}><option value="ghost">Ghost</option><option value="primary">Primary</option><option value="outline">Outline</option></select>
            <Button type="button" variant="ghost" size="icon" className="text-[#8b3028]" onClick={() => updateSettings({ actions: (settings.actions ?? []).filter((_, currentIndex) => currentIndex !== actionIndex) })} aria-label="Delete action"><Trash2 className="h-4 w-4" /></Button>
          </div>)}
        </div>}
      </div>
    </article>
  );
}