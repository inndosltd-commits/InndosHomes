import { ArrowRight, ArrowUpRight, Bed, CheckCircle, ClipboardList, Home as HomeIcon, Link2, LocateFixed, Mail, Phone, Search } from "lucide-react";
import { AlertCircle, Loader2 } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import type { CmsAction, CmsDocument, CmsItem, CmsPublicPage, CmsSection } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyCard, type ApiProperty } from "@/components/property/PropertyCard";
import PropertyMap from "@/components/ui/PropertyMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getListFeaturedPropertiesQueryKey,
  getListPropertiesQueryKey,
  useListFeaturedProperties,
  useListProperties,
} from "@workspace/api-client-react";
import { propertyCategorySearchValues } from "@workspace/property-categories";
import { GOOGLE_MAPS_LIBRARIES } from "@/lib/maps";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string;

type PlacePrediction = { placeId: string; mainText: string; secondaryText: string };

function ActionLink({ href, children, accent }: { href: string; children: string; accent: string }) {
  const className = "inline-flex items-center gap-2 border px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-75";
  if (href.startsWith("/")) {
    return <Link href={href} className={className} style={{ borderColor: accent, backgroundColor: accent, color: "#f8f7f2" }} data-testid="link-cms-action">{children}<ArrowUpRight className="h-4 w-4" /></Link>;
  }
  return <a href={href} className={className} style={{ borderColor: accent, backgroundColor: accent, color: "#f8f7f2" }} data-testid="link-cms-action">{children}<ArrowUpRight className="h-4 w-4" /></a>;
}

function RuntimeSectionShell({ section, document, children }: { section: CmsSection; document: CmsDocument; children: React.ReactNode }) {
  if (!section.visible) return null;
  const background = section.backgroundColor || document.backgroundColor;
  const color = section.textColor || document.textColor;
  return <section className="border-b px-5 py-16 md:px-10 md:py-24" style={{ backgroundColor: background, color }} data-testid={`cms-section-${section.id}`}><div className="mx-auto max-w-6xl">{children}</div></section>;
}

function RuntimeHeading({ section, document }: { section: CmsSection; document: CmsDocument }) {
  const accent = section.accentColor || document.accentColor;
  return (
    <div className="mb-8 max-w-3xl">
      {section.eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em]" style={{ color: accent }}>{section.eyebrow}</p>}
      <h2 className="text-3xl font-black tracking-[-0.03em] md:text-5xl" style={{ color: section.textColor || document.textColor }}>{section.title}</h2>
      {section.body && <p className="mt-4 whitespace-pre-line text-lg leading-8 opacity-75">{section.body}</p>}
    </div>
  );
}

type HomeRuntimeValue = {
  allProperties: ApiProperty[];
  featuredProperties: ApiProperty[];
  filteredProperties: ApiProperty[];
  matchedProperties: ApiProperty[];
  query: string;
  setQuery: (value: string) => void;
  mapsLoaded: boolean;
  placePredictions: PlacePrediction[];
  listerResults: Array<{ id: string; name: string; businessName?: string | null; propertyCount: number }>;
  selectPlace: (prediction: PlacePrediction) => void;
  onMapLoad: (map: google.maps.Map) => void;
  userLocation: google.maps.LatLngLiteral | null;
  requestLocation: () => void;
  locating: boolean;
};

const HomeRuntimeContext = createContext<HomeRuntimeValue | null>(null);

function HomeRuntimeProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [placePredictions, setPlacePredictions] = useState<PlacePrediction[]>([]);
  const [listerResults, setListerResults] = useState<Array<{ id: string; name: string; businessName?: string | null; propertyCount: number }>>([]);
  const [placeOverride, setPlaceOverride] = useState<ApiProperty[] | null>(null);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const predictionsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isLoaded: mapsLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_API_KEY, libraries: GOOGLE_MAPS_LIBRARIES });
  const { data: allData } = useListProperties(undefined, {
    query: { queryKey: getListPropertiesQueryKey(), staleTime: 30_000, refetchInterval: 60_000, refetchOnWindowFocus: true },
  });
  const { data: featuredData } = useListFeaturedProperties({
    query: { queryKey: getListFeaturedPropertiesQueryKey(), staleTime: 30_000, refetchInterval: 60_000, refetchOnWindowFocus: true },
  });
  const allProperties = (allData ?? []) as ApiProperty[];
  const featuredProperties = (featuredData ?? []) as ApiProperty[];
  const matchedProperties = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return allProperties.filter((property) => [
      property.title,
      property.address,
      property.ownerName,
      property.ownerBusinessName,
      ...propertyCategorySearchValues(property.type, property.subtype),
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized)));
  }, [allProperties, query]);
  const filteredProperties = placeOverride ?? (query.trim() ? matchedProperties : allProperties);
  const setSearchQuery = useCallback((value: string) => {
    setQuery(value);
    setPlaceOverride(null);
    if (predictionsDebounceRef.current) clearTimeout(predictionsDebounceRef.current);
    if (value.trim().length < 2) {
      setPlacePredictions([]);
      setListerResults([]);
      return;
    }
    fetch(`/api/properties/listers?q=${encodeURIComponent(value)}`)
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setListerResults(Array.isArray(data) ? data : []))
      .catch(() => setListerResults([]));
    if (!mapsLoaded) {
      setPlacePredictions([]);
      return;
    }
    predictionsDebounceRef.current = setTimeout(async () => {
      try {
        const { AutocompleteSuggestion } = google.maps.places as unknown as { AutocompleteSuggestion?: { fetchAutocompleteSuggestions: (request: { input: string; includedRegionCodes: string[] }) => Promise<{ suggestions?: Array<{ placePrediction?: { placeId?: string; structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } }; text?: { text?: string } } }> }> } };
        if (!AutocompleteSuggestion) return setPlacePredictions([]);
        const result = await AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: value, includedRegionCodes: ["ke"] });
        setPlacePredictions((result.suggestions ?? []).slice(0, 3).flatMap((suggestion) => {
          const prediction = suggestion.placePrediction;
          if (!prediction?.placeId) return [];
          return [{ placeId: prediction.placeId, mainText: prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? value, secondaryText: prediction.structuredFormat?.secondaryText?.text ?? "" }];
        }));
      } catch {
        setPlacePredictions([]);
      }
    }, 250);
  }, [mapsLoaded]);
  const selectPlace = useCallback((prediction: PlacePrediction) => {
    setPlacePredictions([]);
    setQuery(prediction.mainText);
    if (!mapRef.current || !mapsLoaded) return;
    new google.maps.Geocoder().geocode({ placeId: prediction.placeId }, (results, status) => {
      const geometry = results?.[0]?.geometry;
      if (status !== "OK" || !geometry?.location) return;
      const viewport = geometry.viewport;
      if (viewport) mapRef.current?.fitBounds(viewport);
      else {
        mapRef.current?.panTo(geometry.location);
        mapRef.current?.setZoom(14);
      }
      const northEast = viewport?.getNorthEast();
      const southWest = viewport?.getSouthWest();
      setPlaceOverride(allProperties.filter((property) => {
        const lat = Number(property.lat);
        const lng = Number(property.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
        return northEast && southWest ? lat >= southWest.lat() && lat <= northEast.lat() && lng >= southWest.lng() && lng <= northEast.lng() : Math.abs(lat - geometry.location.lat()) <= 0.08 && Math.abs(lng - geometry.location.lng()) <= 0.08;
      }));
    });
  }, [allProperties, mapsLoaded]);
  const requestLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
    );
  };
  return <HomeRuntimeContext.Provider value={{ allProperties, featuredProperties, filteredProperties, matchedProperties, query, setQuery: setSearchQuery, mapsLoaded, placePredictions, listerResults, selectPlace, onMapLoad: (map) => { mapRef.current = map; }, userLocation, requestLocation, locating }}>{children}</HomeRuntimeContext.Provider>;
}

function useHomeRuntime() {
  const runtime = useContext(HomeRuntimeContext);
  if (!runtime) throw new Error("Home CMS sections must be rendered inside HomeRuntimeProvider");
  return runtime;
}

function homeSettings(section: CmsSection) {
  const settings = section.settings ?? {};
  if (section.id === "home-map-search") {
    return { searchPlaceholder: "Where to?", resultCountLabel: "properties visible on the map", showLocateButton: true, mapHeight: 620, ...settings };
  }
  if (section.id === "home-featured") {
    return { collectionType: "featured" as const, limit: 12, emptyStateText: "Featured listings will appear here when a lister promotes a property.", ...settings };
  }
  if (section.id === "home-rentals") {
    return { collectionType: "rent" as const, limit: 4, emptyStateText: "Rental listings will appear here when they are approved.", ...settings };
  }
  if (section.id === "home-sale") {
    return { collectionType: "sale" as const, limit: 4, emptyStateText: "Properties for sale will appear here when they are approved.", ...settings };
  }
  if (section.id === "home-bnb-hotels") {
    return {
      collectionType: "bnb-hotels" as const,
      limit: 12,
      emptyStateText: "B&B and hotel listings will appear here as they are approved.",
      actions: [
        { id: "view-bnbs", label: "View B&Bs", href: "/search?type=bnb", placement: "header" as const, variant: "ghost" as const },
        { id: "view-hotels", label: "View Hotels", href: "/search?type=hotel", placement: "header" as const, variant: "ghost" as const },
        { id: "explore-bnbs", label: "Explore B&Bs", href: "/search?type=bnb", placement: "footer" as const, variant: "primary" as const },
        { id: "explore-hotels", label: "Explore Hotels", href: "/search?type=hotel", placement: "footer" as const, variant: "outline" as const },
      ],
      ...settings,
    };
  }
  return settings;
}

function CmsHomeSearch({ section, document }: { section: CmsSection; document: CmsDocument }) {
  const { filteredProperties, matchedProperties, query, setQuery, mapsLoaded, placePredictions, listerResults, selectPlace, onMapLoad, userLocation, requestLocation, locating } = useHomeRuntime();
  const settings = homeSettings(section);
  const accent = section.accentColor || document.accentColor;
  return (
    <section className="relative overflow-hidden border-b" style={{ backgroundColor: section.backgroundColor || document.backgroundColor, color: section.textColor || document.textColor, minHeight: `${settings.mapHeight ?? 620}px` }} data-testid={`cms-section-${section.id}`}>
      <div className="absolute left-1/2 top-6 z-10 w-[min(90%,620px)] -translate-x-1/2">
        <div className="relative flex items-center gap-2 rounded-full bg-white p-2 shadow-[0_4px_20px_rgb(0,0,0,0.14)]">
          <Search className="ml-3 h-4 w-4 shrink-0 opacity-55" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={settings.searchPlaceholder ?? "Where to?"} className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0" />
          <Link href={`/search${query.trim() ? `?query=${encodeURIComponent(query.trim())}` : ""}`}><Button style={{ backgroundColor: accent }} className="rounded-full px-5">Search</Button></Link>
          {query.trim().length > 0 && (placePredictions.length > 0 || matchedProperties.length > 0 || listerResults.length > 0) && <div className="absolute left-0 top-[calc(100%+10px)] z-20 max-h-80 w-full overflow-y-auto rounded-2xl border border-gray-100 bg-white py-2 text-gray-900 shadow-[0_8px_30px_rgb(0,0,0,0.14)]">
            {placePredictions.map((prediction) => <button key={prediction.placeId} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectPlace(prediction)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50"><Search className="mt-0.5 h-4 w-4 shrink-0 opacity-50" /><span><strong className="block text-sm">{prediction.mainText}</strong><span className="text-xs text-gray-500">{prediction.secondaryText}</span></span></button>)}
            {matchedProperties.slice(0, 4).map((property) => <Link key={property.id} href={`/property/${property.id}`} className="flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50"><Search className="mt-0.5 h-4 w-4 shrink-0 opacity-50" /><span><strong className="block text-sm">{property.title}</strong><span className="text-xs text-gray-500">{property.address}</span></span></Link>)}
            {listerResults.slice(0, 3).map((lister) => <Link key={lister.id} href={`/search?lister=${encodeURIComponent(lister.id)}`} className="flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50"><span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-[9px] text-white">L</span><span><strong className="block text-sm">{lister.businessName || lister.name}</strong><span className="text-xs text-gray-500">{lister.propertyCount} listings</span></span></Link>)}
          </div>}
        </div>
      </div>
      <div className="absolute inset-0 z-0">
        <PropertyMap properties={filteredProperties} userLocation={userLocation} onMapLoad={onMapLoad} />
      </div>
      <div className="absolute bottom-6 left-5 z-10 max-w-md border border-white/50 bg-white/95 p-5 shadow-lg md:left-10">
        {section.eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em]" style={{ color: accent }}>{section.eyebrow}</p>}
        <h1 className="text-3xl font-black tracking-[-0.05em] md:text-5xl">{section.title}</h1>
        {section.body && <p className="mt-3 whitespace-pre-line text-sm leading-6 opacity-75">{section.body}</p>}
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] opacity-60">{filteredProperties.length} {settings.resultCountLabel ?? "properties visible on the map"}</p>
      </div>
      {settings.showLocateButton !== false && <button type="button" onClick={requestLocation} className="absolute bottom-6 right-5 z-10 flex items-center gap-2 border border-white/50 bg-white px-4 py-3 text-sm font-semibold shadow-lg md:right-10" title="Show my location"><LocateFixed className="h-4 w-4" /> {locating ? "Locating…" : "Use my location"}</button>}
    </section>
  );
}

function CmsPropertyCollection({ section, document, preview = false }: { section: CmsSection; document: CmsDocument; preview?: boolean }) {
  const { featuredProperties, filteredProperties } = useHomeRuntime();
  const settings = homeSettings(section);
  const source = settings.collectionType ?? (section.id === "home-featured" ? "featured" : section.id === "home-rentals" ? "rent" : "sale");
  const base = source === "featured" ? featuredProperties : filteredProperties;
  const filtered = source === "rent" ? base.filter((property) => property.type === "rent")
    : source === "sale" ? base.filter((property) => property.type === "sale")
      : source === "bnb-hotels" ? base.filter((property) => property.type === "bnb" || property.type === "hotel")
        : base;
  if (source === "featured" && filtered.length === 0) return null;
  const limit = settings.limit ?? (source === "featured" || source === "bnb-hotels" ? 12 : 4);
  return (
    <RuntimeSectionShell section={section} document={document}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <RuntimeHeading section={section} document={document} />
        {section.buttonText && section.buttonHref && <ActionLink href={section.buttonHref} accent={section.accentColor || document.accentColor}>{section.buttonText}</ActionLink>}
      </div>
      {filtered.length === 0 ? <p className="border border-dashed p-10 text-center text-sm opacity-60">{settings.emptyStateText ?? "No listings are available yet."}</p> : <div className={preview ? "grid grid-cols-1 gap-6" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-4"}>{filtered.slice(0, limit).map((property) => <PropertyCard key={property.id} property={property} />)}</div>}
    </RuntimeSectionShell>
  );
}

const homeIconMap = { search: Search, "clipboard-list": ClipboardList, link: Link2, home: HomeIcon } as const;

function CmsHomeProcess({ section, document, preview = false }: { section: CmsSection; document: CmsDocument; preview?: boolean }) {
  const defaults = [
    { title: "Discover", body: "Explore homes, rentals and stays in places you actually want to live.", number: "01", iconKey: "search", imageSrc: "/images/process-explore.jpeg", imageAlt: "Person searching for a home" },
    { title: "Compare", body: "Compare features, prices and locations to choose the best fit.", number: "02", iconKey: "clipboard-list", imageSrc: "/images/process-evaluate.jpeg", imageAlt: "Bright modern living room interior" },
    { title: "Link Up", body: "Talk directly with property owners and managers.", number: "03", iconKey: "link", imageSrc: "/images/process-connect.jpeg", imageAlt: "Couple shaking hands with property agent" },
    { title: "Move In", body: "Complete the process and step into your new space with confidence.", number: "04", iconKey: "home", imageSrc: "/images/process-settle.jpeg", imageAlt: "Hand holding house keys" },
  ] satisfies CmsItem[];
  const items = (section.items.length ? section.items : defaults).map((item, index) => ({ ...defaults[index], ...item }));
  return (
    <RuntimeSectionShell section={section} document={document}>
      <RuntimeHeading section={section} document={document} />
      <div className={preview ? "grid grid-cols-1 gap-4" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"}>
        {items.map((item, index) => {
          const Icon = homeIconMap[item.iconKey as keyof typeof homeIconMap] ?? HomeIcon;
          return <article key={`${item.title}-${index}`} className="flex min-h-40 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex min-w-0 flex-1 flex-col justify-center p-4">
              <div className="mb-2 flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100"><Icon className="h-5 w-5 text-zinc-900" /></span><span className="text-xs font-bold text-zinc-900">{item.number ?? String(index + 1).padStart(2, "0")}</span></div>
              <h3 className="text-sm font-bold leading-snug text-gray-900">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.body}</p>
            </div>
            {item.imageSrc && <div className="w-28 shrink-0 sm:w-32"><img src={item.imageSrc} alt={item.imageAlt ?? item.title} className="h-full w-full object-cover" loading="lazy" /></div>}
          </article>;
        })}
      </div>
    </RuntimeSectionShell>
  );
}

function CmsHomeBnbHotels({ section, document, preview = false }: { section: CmsSection; document: CmsDocument; preview?: boolean }) {
  const { filteredProperties } = useHomeRuntime();
  const settings = homeSettings(section);
  const properties = filteredProperties.filter((property) => property.type === "bnb" || property.type === "hotel");
  const actions = settings.actions ?? [];
  const renderAction = (item: CmsAction) => {
    const button = <Button variant={item.variant === "outline" ? "outline" : item.variant === "ghost" ? "ghost" : "default"} className="gap-2 text-primary">{item.label}<ArrowRight className="h-4 w-4" /></Button>;
    return item.href.startsWith("/") ? <Link key={item.id} href={item.href}>{button}</Link> : <a key={item.id} href={item.href}>{button}</a>;
  };
  return (
    <RuntimeSectionShell section={section} document={document}>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="flex items-start gap-2"><Bed className="mt-1 h-6 w-6 shrink-0 text-primary" /><RuntimeHeading section={section} document={document} /></div>
        <div className="flex flex-wrap gap-2">{actions.filter((item) => item.placement === "header").map(renderAction)}</div>
      </div>
      {properties.length === 0 ? <p className="border border-dashed p-10 text-center text-sm opacity-60">{settings.emptyStateText ?? "B&B and hotel listings will appear here."}</p> : <div className={preview ? "grid grid-cols-1 gap-6" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-4"}>{properties.slice(0, settings.limit ?? 12).map((property) => <PropertyCard key={property.id} property={property} />)}</div>}
      <div className="mt-8 flex justify-center gap-4">{actions.filter((item) => item.placement === "footer").map(renderAction)}</div>
    </RuntimeSectionShell>
  );
}

const BNB_SUBTYPE_BY_LABEL: Record<string, string | null> = {
  All: null,
  "Serviced Apartments": "serviced-apartment",
  "Entire Place": "entire-place",
  "Private Room": "private-room",
  "Shared Room": "shared-room",
  "Unique Stays": "unique-stays",
  "Hotel & Boutique": "hotel-room",
  "Vacation Homes": "vacation-home",
  "Nature-Focused": "nature-stay",
  Others: "other",
};

function CmsBnbDirectory({ section, document }: { section: CmsSection; document: CmsDocument }) {
  const settings = section.settings ?? {};
  const maxPrice = settings.maxPrice ?? 50000;
  const [properties, setProperties] = useState<ApiProperty[]>([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("0");
  const [maxPriceDraft, setMaxPriceDraft] = useState(String(maxPrice));
  useEffect(() => {
    fetch("/api/properties?type=bnb").then((response) => response.json()).then((value) => setProperties(Array.isArray(value) ? value : [])).catch(() => setProperties([]));
  }, []);
  const filtered = properties.filter((property) => {
    const subtype = BNB_SUBTYPE_BY_LABEL[category];
    const price = Number(property.price);
    const query = search.trim().toLowerCase();
    return price >= (Number(minPrice) || 0) && price <= (Number(maxPriceDraft) || maxPrice)
      && (subtype === null || property.subtype === subtype)
      && (!query || property.title.toLowerCase().includes(query) || property.address.toLowerCase().includes(query));
  });
  const categories = section.items.length ? section.items : [{ title: "All", body: "All B&B listings" }];
  return (
    <RuntimeSectionShell section={section} document={document}>
      <RuntimeHeading section={section} document={document} />
      <div className="mb-8 flex flex-wrap gap-2">
        {categories.map((item) => <button key={item.title} type="button" onClick={() => setCategory(item.title)} className="rounded-full border px-3 py-1.5 text-sm" style={category === item.title ? { backgroundColor: section.accentColor || document.accentColor, borderColor: section.accentColor || document.accentColor, color: section.backgroundColor || document.backgroundColor } : { backgroundColor: section.backgroundColor || document.backgroundColor, borderColor: `${section.textColor || document.textColor}33`, color: section.textColor || document.textColor }}>{item.title}</button>)}
      </div>
      <div className="mb-8 grid gap-3 border-y py-4 md:grid-cols-[1fr_140px_140px]">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={settings.searchPlaceholder ?? "Search by name or location…"} />
        <Input value={minPrice} onChange={(event) => setMinPrice(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Min KES" />
        <Input value={maxPriceDraft} onChange={(event) => setMaxPriceDraft(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={`Max KES (${maxPrice.toLocaleString()})`} />
      </div>
      {filtered.length === 0 ? <p className="py-16 text-center text-sm opacity-60">{settings.emptyStateText ?? "No listings in this category yet."}</p> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{filtered.slice(0, settings.limit ?? filtered.length).map((property) => <PropertyCard key={property.id} property={property} />)}</div>}
    </RuntimeSectionShell>
  );
}

const contactIconMap: Record<string, typeof Phone> = { Phone, Email: Mail, Office: LocateFixed, Hours: CheckCircle };

function CmsContactDetails({ section, document }: { section: CmsSection; document: CmsDocument }) {
  return (
    <RuntimeSectionShell section={section} document={document}>
      <RuntimeHeading section={section} document={document} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {section.items.map((item, index) => {
          const Icon = contactIconMap[item.title] ?? [Phone, Mail, LocateFixed, CheckCircle][index % 4]!;
          const value = item.href ? <a href={item.href} className="underline decoration-current/30 underline-offset-4 hover:opacity-70">{item.body}</a> : item.body;
          return <article key={`${item.title}-${index}`} className="border p-5" style={{ borderColor: `${section.textColor || document.textColor}22` }}><Icon className="mb-5 h-5 w-5" style={{ color: section.accentColor || document.accentColor }} /><h3 className="font-bold">{item.title}</h3><p className="mt-2 text-sm opacity-70">{value}</p></article>;
        })}
      </div>
    </RuntimeSectionShell>
  );
}

function CmsContactForm({ section, document }: { section: CmsSection; document: CmsDocument }) {
  const settings = section.settings ?? {};
  const subjects = settings.formSubjects?.length ? settings.formSubjects : ["General Inquiry", "Property Listing Support", "Technical Issue", "Partnership Opportunity"];
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", subject: subjects[0]!, message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please fill in all required fields.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("success");
       setForm({ firstName: "", lastName: "", email: "", subject: subjects[0]!, message: "" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  };
  return (
    <RuntimeSectionShell section={section} document={document}>
      <RuntimeHeading section={section} document={document} />
      {status === "success" ? <div className="border border-green-200 bg-green-50 p-5 text-green-800"><div className="flex items-center gap-3"><CheckCircle className="h-5 w-5" /> <strong>{settings.successTitle ?? "Message sent successfully."}</strong></div><p className="mt-2 text-sm">{settings.successText ?? "We'll get back to you within 24 hours."}</p></div> : <form onSubmit={submit} className="grid max-w-3xl gap-4 md:grid-cols-2">
        <Input placeholder="John" value={form.firstName} onChange={(event) => update("firstName", event.target.value)} required aria-label="First Name" />
        <Input placeholder="Doe" value={form.lastName} onChange={(event) => update("lastName", event.target.value)} required aria-label="Last Name" />
        <Input className="md:col-span-2" type="email" placeholder="john@example.com" value={form.email} onChange={(event) => update("email", event.target.value)} required aria-label="Email Address" />
         <select className="h-10 rounded-md border bg-background px-3 text-sm md:col-span-2" value={form.subject} onChange={(event) => update("subject", event.target.value)} aria-label="Subject">{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select>
        <Textarea className="min-h-36 md:col-span-2" placeholder="How can we help you?" value={form.message} onChange={(event) => update("message", event.target.value)} required aria-label="Message" />
        {status === "error" && <div className="flex items-center gap-2 text-sm text-red-700 md:col-span-2"><AlertCircle className="h-4 w-4" />{error}</div>}
         <Button type="submit" disabled={status === "loading"} style={{ backgroundColor: section.accentColor || document.accentColor }} className="w-fit">{status === "loading" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</> : section.buttonText || "Send Message"}</Button>
      </form>}
    </RuntimeSectionShell>
  );
}

function CmsPricingPlans({ section, document }: { section: CmsSection; document: CmsDocument }) {
  const links: Record<string, string> = { Free: "/login?role=owner", Basic: "/dashboard?tab=subscription", Pro: "/dashboard?tab=subscription", Enterprise: "/dashboard?tab=subscription" };
  return (
    <RuntimeSectionShell section={section} document={document}>
      <RuntimeHeading section={section} document={document} />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{section.items.map((item) => {
        const plan = Object.keys(links).find((name) => item.title.startsWith(name)) ?? "Free";
        const lines = item.body.split("\n").filter((line) => line && !line.startsWith("CTA:"));
        return <article key={item.title} className="flex min-h-72 flex-col border bg-white p-6 shadow-sm"><h3 className="text-lg font-bold">{item.title}</h3><ul className="mt-5 flex-1 space-y-2 text-sm opacity-75">{lines.map((line) => <li key={line}>✓ {line}</li>)}</ul><Link href={item.href || links[plan]}><Button className="mt-5 w-full" variant={plan === "Pro" ? "default" : "outline"}>{item.body.match(/CTA: (.+)/)?.[1] ?? plan}</Button></Link></article>;
      })}</div>
    </RuntimeSectionShell>
  );
}

export type CmsSectionChange = "added" | "removed" | "changed" | "unchanged";

export function compareCmsDocuments(draft: CmsDocument, published: CmsDocument | null) {
  const draftStatuses: Record<string, CmsSectionChange> = {};
  const publishedStatuses: Record<string, CmsSectionChange> = {};
  if (!published) {
    draft.sections.forEach((section) => { draftStatuses[section.id] = "added"; });
    return {
      draftStatuses,
      publishedStatuses,
      added: draft.sections.length,
      removed: 0,
      changed: 0,
      settingsChanged: false,
    };
  }

  const publishedById = new Map(published.sections.map((section, index) => [section.id, { section, index }]));
  const draftById = new Map(draft.sections.map((section, index) => [section.id, { section, index }]));
  let added = 0;
  let removed = 0;
  let changed = 0;

  draft.sections.forEach((section, index) => {
    const live = publishedById.get(section.id);
    if (!live) {
      draftStatuses[section.id] = "added";
      added += 1;
    } else if (JSON.stringify(section) !== JSON.stringify(live.section) || index !== live.index) {
      draftStatuses[section.id] = "changed";
      publishedStatuses[section.id] = "changed";
      changed += 1;
    } else {
      draftStatuses[section.id] = "unchanged";
      publishedStatuses[section.id] = "unchanged";
    }
  });
  published.sections.forEach((section) => {
    if (!draftById.has(section.id)) {
      publishedStatuses[section.id] = "removed";
      removed += 1;
    }
  });

  return {
    draftStatuses,
    publishedStatuses,
    added,
    removed,
    changed,
    settingsChanged: JSON.stringify({
      pageTitle: draft.pageTitle,
      metaDescription: draft.metaDescription,
      backgroundColor: draft.backgroundColor,
      textColor: draft.textColor,
      accentColor: draft.accentColor,
    }) !== JSON.stringify({
      pageTitle: published.pageTitle,
      metaDescription: published.metaDescription,
      backgroundColor: published.backgroundColor,
      textColor: published.textColor,
      accentColor: published.accentColor,
    }),
  };
}

function ComparisonMarker({ status }: { status: CmsSectionChange }) {
  if (status === "unchanged") return null;
  const marker = {
    added: { label: "Added", className: "border-[#9bc5a8] bg-[#e8f3ea] text-[#315a3d]" },
    removed: { label: "Removed", className: "border-[#d7b1a8] bg-[#f8e9e4] text-[#6e2c25]" },
    changed: { label: "Changed", className: "border-[#d6bd75] bg-[#fff6d8] text-[#6a5214]" },
  }[status];
  return <span className={`absolute right-4 top-4 z-10 border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] shadow-sm ${marker.className}`} data-testid={`cms-change-marker-${status}`}>{marker.label}</span>;
}

function SectionBlockContent({ section, document, preview = false }: { section: CmsSection; document: CmsDocument; preview?: boolean }) {
  if (!section.visible) return null;
  const runtimeKey = section.settings?.componentKey ?? section.componentKey ?? section.id;
  if (runtimeKey === "home-map-search") return <CmsHomeSearch section={section} document={document} />;
  if (runtimeKey === "home-process") return <CmsHomeProcess section={section} document={document} preview={preview} />;
  if (runtimeKey === "home-bnb-hotels") return <CmsHomeBnbHotels section={section} document={document} preview={preview} />;
  if (runtimeKey === "home-property-collection" || ["home-featured", "home-rentals", "home-sale"].includes(section.id)) return <CmsPropertyCollection section={section} document={document} preview={preview} />;
  if (runtimeKey === "bnb-directory" || section.id === "bnb-categories" || section.id.startsWith("bnb-directory-")) return <CmsBnbDirectory section={section} document={document} />;
  if (runtimeKey === "contact-details" || section.id.startsWith("contact-details-")) return <CmsContactDetails section={section} document={document} />;
  if (runtimeKey === "contact-form" || section.id.startsWith("contact-form-")) return <CmsContactForm section={section} document={document} />;
  if (runtimeKey === "pricing-plans" || section.id.startsWith("pricing-plans-")) return <CmsPricingPlans section={section} document={document} />;
  const background = section.backgroundColor || document.backgroundColor;
  const color = section.textColor || document.textColor;
  const accent = section.accentColor || document.accentColor;
  const hasItems = section.items?.length > 0;

  if (section.type === "hero") {
    return (
      <section className="relative overflow-hidden border-b px-5 py-24 md:px-10 md:py-36" style={{ backgroundColor: background, color }} data-testid={`cms-section-${section.id}`}>
        <div className="mx-auto max-w-6xl">
          <div className="max-w-4xl">
            {section.eyebrow && <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em]" style={{ color: accent }}>{section.eyebrow}</p>}
            <h1 className="max-w-4xl text-5xl font-black leading-[0.96] tracking-[-0.04em] md:text-8xl" style={{ color }}>{section.title}</h1>
            {section.body && <p className="mt-8 max-w-2xl whitespace-pre-line text-lg leading-8 opacity-75 md:text-xl">{section.body}</p>}
            {section.buttonText && section.buttonHref && <div className="mt-10"><ActionLink href={section.buttonHref} accent={accent}>{section.buttonText}</ActionLink></div>}
          </div>
        </div>
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full border-[36px] opacity-20" style={{ borderColor: accent }} />
      </section>
    );
  }

  if (section.type === "feature") {
    return (
      <section className="border-b px-5 py-20 md:px-10 md:py-28" style={{ backgroundColor: background, color }} data-testid={`cms-section-${section.id}`}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 max-w-2xl">
            {section.eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em]" style={{ color: accent }}>{section.eyebrow}</p>}
            <h2 className="text-4xl font-black tracking-[-0.03em] md:text-6xl" style={{ color }}>{section.title}</h2>
            {section.body && <p className="mt-5 text-lg leading-8 opacity-75">{section.body}</p>}
          </div>
          {hasItems && (
            <div className="grid gap-px border" style={{ borderColor: `${accent}55`, backgroundColor: `${accent}55` }}>
              {section.items.map((item, index) => (
                <article key={`${item.title}-${index}`} className="min-h-48 p-7 md:p-9" style={{ backgroundColor: background }}>
                  <p className="mb-8 font-mono text-xs font-bold" style={{ color: accent }}>{String(index + 1).padStart(2, "0")}</p>
                   {item.href ? <a href={item.href} className="text-xl font-bold underline decoration-current/30 underline-offset-4 hover:opacity-70" style={{ color }}>{item.title}</a> : <h3 className="text-xl font-bold" style={{ color }}>{item.title}</h3>}
                   <p className="mt-3 whitespace-pre-line leading-7 opacity-70">{item.body}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="border-b px-5 py-20 md:px-10 md:py-28" style={{ backgroundColor: background, color }} data-testid={`cms-section-${section.id}`}>
      <div className="mx-auto max-w-6xl">
        {section.eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em]" style={{ color: accent }}>{section.eyebrow}</p>}
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-black tracking-[-0.03em] md:text-6xl" style={{ color }}>{section.title}</h2>
            {section.body && <p className="mt-5 max-w-2xl whitespace-pre-line text-lg leading-8 opacity-75">{section.body}</p>}
          </div>
          {section.buttonText && section.buttonHref && <ActionLink href={section.buttonHref} accent={accent}>{section.buttonText}</ActionLink>}
        </div>
        {hasItems && (
          <div className="mt-12 space-y-5">
            {section.items.map((item, index) => (
              <div key={`${item.title}-${index}`} className="grid gap-3 border-t pt-5 md:grid-cols-[220px_1fr]" style={{ borderColor: `${color}22` }}>
                {item.href ? <a href={item.href} className="font-bold underline decoration-current/30 underline-offset-4 hover:opacity-70" style={{ color }}>{item.title}</a> : <h3 className="font-bold" style={{ color }}>{item.title}</h3>}
                <p className="whitespace-pre-line leading-7 opacity-70">{item.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SectionBlock({ section, document, sectionStatus, preview = false }: { section: CmsSection; document: CmsDocument; sectionStatus?: CmsSectionChange; preview?: boolean }) {
  const content = <SectionBlockContent section={section} document={document} preview={preview} />;
  if (!sectionStatus || sectionStatus === "unchanged" || !content) return content;
  return <div className="relative" data-testid={`cms-comparison-section-${section.id}`}><ComparisonMarker status={sectionStatus} />{content}</div>;
}

const socialMetadata = [
  { selector: 'meta[name="description"]', attribute: "content" },
  { selector: 'meta[property="og:title"]', attribute: "content" },
  { selector: 'meta[property="og:description"]', attribute: "content" },
  { selector: 'meta[name="twitter:title"]', attribute: "content" },
  { selector: 'meta[name="twitter:description"]', attribute: "content" },
] as const;

export const LEGACY_PAGE_METADATA = {
  title: "inndos | Property Platform - B&B, Rent, Hostels, Hotels & Buy",
  description: "Kenya's #1 unified property marketplace. Find houses for sale in Nairobi, apartments for rent in Kenya, luxury & cheap hotels, B&B, hostels, land for sale and real estate listings across Nairobi, Mombasa, Kisumu & Nakuru.",
  ogTitle: "inndos | Buy, Rent & Book Property in Kenya – Nairobi, Mombasa, Kisumu",
  ogDescription: "Kenya's unified property marketplace. Buy houses, rent apartments, book hotels, B&B & hostels across Nairobi, Mombasa, Kisumu & Nakuru. Real estate listings for owners, agents, tenants & guests.",
  twitterTitle: "inndos | Kenya Property – Buy, Rent, Hotels & B&B",
  twitterDescription: "Find houses for sale, apartments for rent, hotels & B&B across Kenya. The smart property platform for Nairobi, Mombasa, Kisumu & beyond.",
} as const;

type PageMetadata = {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
};

function usePageMetadata(metadata: PageMetadata, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const previousTitle = window.document.title;
    const previousMetadata = socialMetadata.map(({ selector }) => {
      const element = window.document.querySelector<HTMLMetaElement>(selector);
      return {
        selector,
        element,
        content: element?.getAttribute("content"),
      };
    });

    window.document.title = metadata.title;
    const metadataValues: Record<(typeof socialMetadata)[number]["selector"], string> = {
      'meta[name="description"]': metadata.description,
      'meta[property="og:title"]': metadata.ogTitle ?? metadata.title,
      'meta[property="og:description"]': metadata.ogDescription ?? metadata.description,
      'meta[name="twitter:title"]': metadata.twitterTitle ?? metadata.title,
      'meta[name="twitter:description"]': metadata.twitterDescription ?? metadata.description,
    };
    socialMetadata.forEach(({ selector }) => {
      const element = window.document.querySelector<HTMLMetaElement>(selector);
      if (element) element.setAttribute("content", metadataValues[selector]);
    });

    return () => {
      window.document.title = previousTitle;
      previousMetadata.forEach(({ element, content }) => {
        if (!element) return;
        if (content === null || content === undefined) {
          element.removeAttribute("content");
        } else {
          element.setAttribute("content", content);
        }
      });
    };
  }, [
    enabled,
    metadata.description,
    metadata.ogDescription,
    metadata.ogTitle,
    metadata.title,
    metadata.twitterDescription,
    metadata.twitterTitle,
  ]);
}

export function useLegacyPageMetadata(enabled: boolean) {
  usePageMetadata(LEGACY_PAGE_METADATA, enabled);
}

function CmsDocumentRenderer({
  slug,
  label,
  document,
  sectionStatuses,
  includeChrome = true,
  previewMode = false,
}: {
  slug: string;
  label: string;
  document: CmsDocument;
  sectionStatuses?: Record<string, CmsSectionChange>;
  includeChrome?: boolean;
  previewMode?: boolean;
}) {
  usePageMetadata({
    title: document.pageTitle || label,
    description: document.metaDescription || "",
  }, includeChrome);

  const content = (
    <main>
      {document.sections.filter((section) => section.visible).map((section) => (
        <SectionBlock key={section.id} section={section} document={document} sectionStatus={sectionStatuses?.[section.id]} preview={previewMode} />
      ))}
    </main>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: document.backgroundColor, color: document.textColor }} data-testid={`cms-public-page-${slug}`}>
      {includeChrome && <Navbar />}
      {document.templateKey === "home" ? <HomeRuntimeProvider>{content}</HomeRuntimeProvider> : content}
      {includeChrome && <Footer />}
    </div>
  );
}

export function CmsPublicRenderer({ page }: { page: CmsPublicPage }) {
  if (!page.published) return null;
  return <CmsDocumentRenderer slug={page.slug} label={page.label} document={page.published} />;
}

export function CmsPreviewRenderer({
  slug,
  label,
  document,
  sectionStatuses,
  includeChrome = true,
  previewMode = false,
}: {
  slug: string;
  label: string;
  document: CmsDocument;
  sectionStatuses?: Record<string, CmsSectionChange>;
  includeChrome?: boolean;
  previewMode?: boolean;
}) {
  return <CmsDocumentRenderer slug={slug} label={label} document={document} sectionStatuses={sectionStatuses} includeChrome={includeChrome} previewMode={previewMode} />;
}

export function CmsDashboardRenderer({ document }: { document: CmsDocument }) {
  return <CmsDocumentRenderer slug="dashboard" label="User dashboard" document={document} includeChrome={false} />;
}