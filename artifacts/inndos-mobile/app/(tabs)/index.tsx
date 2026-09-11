tFamily: "Outfit_700Bold" },
  viewAll: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  row: { flexDirection: "row", gap: 16, marginBottom: 16 },
  exploreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderWidth: 1, borderRadius: 10, marginTop: 4, marginBottom: 8 },
  exploreBtnText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
});

// ── Sub-category modal ───────────────────────────────────────────────────────
interface ModalSection { section: string | null; items: string[]; }

function SubCategoryModal({ visible, onClose, title, sections, activeItem, onSelect, colors }: {
  visible: boolean;
  onClose: () => void;
  title: string;
  sections: ModalSection[];
  activeItem: string | null;
  onSelect: (sub: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={modalS.overlay} onPress={onClose}>
        <Pressable style={[modalS.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={[modalS.handle, { backgroundColor: colors.border }]} />
          <Text style={[modalS.title, { color: colors.foreground }]}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {sections.map((sec, si) => (
              <View key={si}>
                {sec.section && (
                  <Text style={[modalS.sectionLabel, { color: colors.mutedForeground }]}>{sec.section.toUpperCase()}</Text>
                )}
                {sec.items.map((item) => {
                  const isActive = activeItem === item;
                  return (
                    <Pressable key={item} style={[modalS.item, { borderBottomColor: colors.border }, isActive && { backgroundColor: colors.muted }]} onPress={() => onSelect(item)}>
                      <Text style={[modalS.itemText, { color: colors.foreground }]}>{item}</Text>
                      {isActive && <Feather name="check" size={16} color={colors.primary} />}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
          <Pressable style={[modalS.cancelBtn, { borderTopColor: colors.border }]} onPress={onClose}>
            <Text style={[modalS.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const modalS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, maxHeight: "75%" },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontFamily: "Outfit_700Bold", paddingHorizontal: 20, marginBottom: 12 },
  sectionLabel: { fontSize: 10, fontFamily: "Outfit_600SemiBold", letterSpacing: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  itemText: { fontSize: 15, fontFamily: "Outfit_400Regular" },
  cancelBtn: { paddingVertical: 18, alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4 },
  cancelText: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
});

function FilterModal({
  visible,
  onClose,
  colors,
  type,
  isCommercial,
  maxPrice,
  minDraft,
  maxDraft,
  onMinDraftChange,
  onMaxDraftChange,
  onPriceChange,
  selectedBedrooms,
  onBedroomChange,
  selectedAmenities,
  onAmenityToggle,
  onReset,
  resultCount,
}: {
  visible: boolean;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
  type: ListPropertiesParams["type"];
  isCommercial: boolean;
  maxPrice: number;
  minDraft: string;
  maxDraft: string;
  onMinDraftChange: (value: string) => void;
  onMaxDraftChange: (value: string) => void;
  onPriceChange: (low: number, high: number) => void;
  selectedBedrooms: number | null;
  onBedroomChange: (bedrooms: number | null) => void;
  selectedAmenities: string[];
  onAmenityToggle: (id: string) => void;
  onReset: () => void;
  resultCount: number;
}) {
  const amenities = getAmenityFilters(type);
  const low = Math.max(0, Math.min(Number(minDraft) || 0, maxPrice));
  const high = Math.max(low, Math.min(Number(maxDraft) || maxPrice, maxPrice));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={filterS.overlay} onPress={onClose}>
        <Pressable style={[filterS.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={[filterS.handle, { backgroundColor: colors.border }]} />
          <View style={filterS.header}>
            <Text style={[filterS.title, { color: colors.foreground }]}>Filters</Text>
            <Pressable onPress={onReset} hitSlop={8}>
              <Text style={[filterS.reset, { color: colors.primary }]}>Reset all</Text>
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={filterS.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={filterS.section}>
              <View style={filterS.sectionHeader}>
                <Text style={[filterS.sectionTitle, { color: colors.foreground }]}>
                  Price Range{type === "bnb" ? " (KES / night)" : " (KES)"}
                </Text>
                <Text style={[filterS.sectionHint, { color: colors.mutedForeground }]}>
                  0 – {maxPrice.toLocaleString()}{maxPrice >= 200_000_000 ? "+" : ""}
                </Text>
              </View>
              <PriceRangeSlider
                key={String(maxPrice)}
                min={0}
                max={maxPrice}
                low={low}
                high={high}
                onLowChange={(value) => onPriceChange(value, high)}
                onHighChange={(value) => onPriceChange(low, value)}
                onReset={() => onPriceChange(0, maxPrice)}
              />
              <View style={filterS.inputRow}>
                <View style={filterS.inputGroup}>
                  <Text style={[filterS.inputLabel, { color: colors.mutedForeground }]}>Min (KES)</Text>
                  <TextInput
                    style={[filterS.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={minDraft}
                    onChangeText={(value) => onMinDraftChange(value.replace(/[^\d]/g, ""))}
                    onBlur={() => onPriceChange(low, high)}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                </View>
                <Text style={[filterS.dash, { color: colors.mutedForeground }]}>–</Text>
                <View style={filterS.inputGroup}>
                  <Text style={[filterS.inputLabel, { color: colors.mutedForeground }]}>Max (KES)</Text>
                  <TextInput
                    style={[filterS.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={maxDraft}
                    onChangeText={(value) => onMaxDraftChange(value.replace(/[^\d]/g, ""))}
                    onBlur={() => onPriceChange(low, high)}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                </View>
              </View>
            </View>

            {!isCommercial && type !== "bnb" && (
              <View style={filterS.section}>
                <Text style={[filterS.sectionTitle, { color: colors.foreground }]}>Bedrooms</Text>
                <View style={filterS.choiceRow}>
                  {[1, 2, 3, 4, 5].map((bedrooms) => {
                    const selected = selectedBedrooms === bedrooms;
                    return (
                      <Pressable
                        key={bedrooms}
                        style={[filterS.choice, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.background }]}
                        onPress={() => onBedroomChange(selected ? null : bedrooms)}
                      >
                        <Text style={[filterS.choiceText, { color: selected ? colors.primaryForeground : colors.foreground }]}>
                          {bedrooms}{bedrooms === 5 ? "+" : ""}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {type !== "bnb" && (
              <View style={filterS.section}>
                <Text style={[filterS.sectionTitle, { color: colors.foreground }]}>Amenities</Text>
                <View style={filterS.amenities}>
                  {amenities.map((amenity) => {
                    const selected = selectedAmenities.includes(amenity.id);
                    return (
                      <Pressable
                        key={amenity.id}
                        style={filterS.amenityRow}
                        onPress={() => onAmenityToggle(amenity.id)}
                      >
                        <View style={[filterS.checkbox, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.background }]}>
                          {selected && <Feather name="check" size={12} color={colors.primaryForeground} />}
                        </View>
                        <Text style={[filterS.amenityText, { color: colors.foreground }]}>{amenity.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
          <Pressable style={[filterS.showButton, { backgroundColor: colors.primary }]} onPress={onClose}>
            <Text style={[filterS.showButtonText, { color: colors.primaryForeground }]}>
              Show {resultCount.toLocaleString()} {resultCount === 1 ? "property" : "properties"}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const filterS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "88%", paddingTop: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14 },
  title: { fontSize: 20, fontFamily: "Outfit_700Bold" },
  reset: { fontSize: 13, fontFamily: "Outfit_500Medium", textDecorationLine: "underline" },
  content: { paddingHorizontal: 20, paddingBottom: 18, gap: 24 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  sectionHint: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  inputGroup: { flex: 1, gap: 5 },
  inputLabel: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  input: { height: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 14, fontFamily: "Outfit_400Regular" },
  dash: { fontSize: 18, paddingBottom: 10 },
  choiceRow: { flexDirection: "row", gap: 10 },
  choice: { width: 42, height: 36, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  choiceText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  amenities: { gap: 2 },
  amenityRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  amenityText: { flex: 1, fontSize: 14, fontFamily: "Outfit_400Regular" },
  showButton: { marginHorizontal: 20, marginBottom: 18, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  showButtonText: { fontSize: 15, fontFamily: "Outfit_700Bold" },
});

// ── Main screen ──────────────────────────────────────────────────────────────
export default function BrowseScreen() {
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ type?: string | string[]; filters?: string | string[] }>();
  const { user, token } = useAuth();
  const routeFiltersOpen = (Array.isArray(params.filters) ? params.filters[0] : params.filters) === "open";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priceMin, setPriceMin] = useState("0");
  const [priceMax, setPriceMax] = useState("");
  const [activeType, setActiveType] = useState<ListPropertiesParams["type"]>(() => parseBrowseType(params.type));
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
  const [selectedBedrooms, setSelectedBedrooms] = useState<number | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [filtersVisible, setFiltersVisible] = useState(routeFiltersOpen && parseBrowseType(params.type) !== "bnb");
  const [bnbFiltersVisible, setBnbFiltersVisible] = useState(routeFiltersOpen && parseBrowseType(params.type) === "bnb");
  const [categoryViewMode, setCategoryViewMode] = useState<"list" | "map">("list");
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [rentModalVisible, setRentModalVisible] = useState(false);
  const [buyModalVisible, setBuyModalVisible] = useState(false);
  const [locationFilterBounds, setLocationFilterBounds] = useState<MapBBox | null>(null);
  const [mapFocusRegion, setMapFocusRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [placeResults, setPlaceResults] = useState<Array<{ placeId: string; description: string; secondaryText: string }>>([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [placeFocused, setPlaceFocused] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const browseScrollRef = useRef<ScrollView>(null);
  const placeRequestRef = useRef(0);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const tabNavigation = navigation as unknown as {
      addListener: (eventName: "tabPress", listener: () => void) => () => void;
    };
    const unsubscribe = tabNavigation.addListener("tabPress", () => {
      browseScrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return unsubscribe;
  }, [navigation]);
  const categoryMaxPrice = getMaxPrice(activeType);
  const isCommercialCategory = activeType === "rent" &&
    ["Office Space", "Godowns", "Stalls", "Shops"].includes(activeSubCategory ?? "");

  const handleListPropertyPress = () => {
    if (!user) {
      router.push("/(auth)/login" as never);
    } else if (user.role === "tenant" || user.role === "guest") {
      setShowUpgradeModal(true);
    } else {
      router.push("/(tabs)/list-property" as never);
    }
  };

  const listParams: ListPropertiesParams = {
    type: activeType,
    subtype:
      activeSubCategory === "Office Space" ? "business" :
      activeSubCategory === "Godowns" ? "godown" :
      activeSubCategory === "Stalls" ? "stall" :
      activeSubCategory === "Shops" ? "shop" :
      undefined,
  };

  const { data: properties, isLoading, error, refetch } = useListProperties(listParams, {
    query: {
      queryKey: getListPropertiesQueryKey(listParams),
      staleTime: 30_000,
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
    },
  });
  const { data: featuredProperties, refetch: refetchFeatured } = useListFeaturedProperties({
    query: {
      queryKey: getListFeaturedPropertiesQueryKey(),
      staleTime: 30_000,
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
    },
  });

  useFocusEffect(
    React.useCallback(() => {
      void refetch();
      void refetchFeatured();
    }, [refetch, refetchFeatured])
  );

  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    (async () => {
      setLocationLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!active) return;
        if (status !== "granted") {
          setLocationNotice("Location is off. You can still search a place or browse the default map area.");
          return;
        }
        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: 5 * 60 * 1000,
          requiredAccuracy: 2_000,
        });
        if (active && lastKnown) {
          const lastRegion = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          };
          setUserLocation({ lat: lastRegion.latitude, lng: lastRegion.longitude });
          setMapFocusRegion(lastRegion);
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!active) return;
        const region = { latitude: position.coords.latitude, longitude: position.coords.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 };
        setUserLocation({ lat: region.latitude, lng: region.longitude });
        setMapFocusRegion(region);
      } catch {
        if (active) setLocationNotice("Your location could not be loaded. You can still search a place or browse the default map area.");
      } finally {
        if (active) setLocationLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
    placeRequestRef.current += 1;
  }, []);

  useEffect(() => {
    const max = getMaxPrice(activeType);
    setPriceMin("0");
    setPriceMax(activeType ? String(max) : "");
    setSelectedBedrooms(null);
    setSelectedAmenities([]);
    setFiltersVisible(routeFiltersOpen && !!activeType && activeType !== "bnb");
    setBnbFiltersVisible(routeFiltersOpen && activeType === "bnb");
    setCategoryViewMode("list");
    setSearch("");
    setDebouncedSearch("");
    setPlaceResults([]);
    setLocationFilterBounds(null);
  }, [activeType, routeFiltersOpen]);

  const filteredProperties = useMemo<Property[]>(() => {
    if (!properties) return [];
    let arr = [...properties];
    arr = arr.filter((property) => matchesSubCategory(property, activeSubCategory));
    if (activeType === "rent" && !isCommercialCategory) {
      arr = arr.filter((property) => {
        const subtype = normalizePropertySubtype(property.subtype) ?? "";
        return !["business", "office", "godown", "stall", "shop"].includes(subtype);
      });
    }
    arr = arr.filter((property) => matchesPropertySearch(property, debouncedSearch));
    arr = arr.filter((property) => isWithinMapBounds(property, locationFilterBounds));
    const minP = Number(priceMin.replace(/,/g, ""));
    const maxP = priceMax ? Number(priceMax.replace(/,/g, "")) : NaN;
    if (!isNaN(minP) && minP > 0) arr = arr.filter((p) => p.price >= minP);
    if (!isNaN(maxP) && maxP > 0) arr = arr.filter((p) => p.price <= maxP);
    if (activeType && selectedBedrooms !== null && !isCommercialCategory) {
      arr = arr.filter((property) =>
        selectedBedrooms === 5
          ? (property.beds ?? 0) >= 5
          : (property.beds ?? 0) === selectedBedrooms
      );
    }
    if (activeType && selectedAmenities.length > 0) {
      arr = arr.filter((property) => {
        const tags = Array.isArray(property.tags) ? property.tags : [];
        return selectedAmenities.every((amenity) => propertyMatchesAmenity(tags, amenity));
      });
    }
    if (sortBy === "price-asc") arr.sort((a, b) => a.price - b.price);
    else if (sortBy === "price-desc") arr.sort((a, b) => b.price - a.price);
    else if (sortBy === "distance" && userLocation) {
      arr.sort((a, b) => {
        if (!a.lat || !a.lng) return 1;
        if (!b.lat || !b.lng) return -1;
        return haversineKm(userLocation.lat, userLocation.lng, parseFloat(a.lat), parseFloat(a.lng)) -
               haversineKm(userLocation.lat, userLocation.lng, parseFloat(b.lat), parseFloat(b.lng));
      });
    } else {
      arr.sort((a, b) => {
        const aT = new Date(a.approvedAt ?? a.createdAt ?? 0).getTime();
        const bT = new Date(b.approvedAt ?? b.createdAt ?? 0).getTime();
        return bT - aT;
      });
    }
    return arr;
  }, [
    properties,
    sortBy,
    userLocation,
    priceMin,
    priceMax,
    activeType,
    activeSubCategory,
    selectedBedrooms,
    selectedAmenities,
    isCommercialCategory,
    debouncedSearch,
    locationFilterBounds,
  ]);

  // Categorised sections (when no active type filter)
  const bnbHotelProperties = useMemo(
    () => filteredProperties.filter((p) => ["bnb", "hotel", "hostel"].includes(p.type)),
    [filteredProperties]
  );
  const rentProperties = useMemo(
    () => filteredProperties.filter((p) => p.type === "rent"),
    [filteredProperties]
  );
  const saleProperties = useMemo(
    () => filteredProperties.filter((p) => p.type === "sale"),
    [filteredProperties]
  );
  const visibleFeaturedProperties = useMemo(() => {
    const featuredIds = new Set((featuredProperties ?? []).map((property) => property.id));
    return filteredProperties.filter((property) => featuredIds.has(property.id));
  }, [featuredProperties, filteredProperties]);
  // Pins must consume the exact same filtered collection as the listing
  // sections. Automatic map focus is visual only; only an explicit place or
  // "Search this area" action adds locationFilterBounds upstream.
  const mapProperties = filteredProperties;

  // Name/brand searches filter the cards immediately, but the matching pins
  // may be outside the current viewport. Focus the map on the same filtered
  // result set; place searches still use their geocoded region below.
  useEffect(() => {
    if (!debouncedSearch.trim()) return;
    const mappable = filteredProperties
      .filter((property) =>
        property.lat !== null &&
        property.lat !== undefined &&
        String(property.lat).trim() !== "" &&
        property.lng !== null &&
        property.lng !== undefined &&
        String(property.lng).trim() !== ""
      )
      .map((property) => ({
        latitude: Number(property.lat),
        longitude: Number(property.lng),
      }))
      .filter(({ latitude, longitude }) =>
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        Math.abs(latitude) <= 90 &&
        Math.abs(longitude) <= 180
      );
    if (mappable.length === 0) return;
    if (mappable.length === 1) {
      setMapFocusRegion({
        latitude: mappable[0].latitude,
        longitude: mappable[0].longitude,
        latitudeDelta: 0.035,
        longitudeDelta: 0.035,
      });
      return;
    }
    const latitudes = mappable.map(({ latitude }) => latitude);
    const longitudes = mappable.map(({ longitude }) => longitude);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    setMapFocusRegion({
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.035, (maxLat - minLat) * 1.5),
      longitudeDelta: Math.max(0.035, (maxLng - minLng) * 1.5),
    });
  }, [debouncedSearch, filteredProperties]);

  const handleSearch = (text: string) => {
    setSearch(text);
    setLocationFilterBounds(null);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedSearch(text), 400);
    const requestId = ++placeRequestRef.current;
    if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
    if (!token || text.trim().length < 2) {
      setPlaceResults([]);
      setPlaceLoading(false);
      return;
    }
    setPlaceLoading(true);
    placeDebounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `${getApiBaseUrl()}/api/maps/places?query=${encodeURIComponent(text.trim())}&sessiontoken=browse-${Date.now()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const payload = await response.json() as { results?: Array<{ placeId: string; description: string; secondaryText: string }> };
        if (requestId === placeRequestRef.current) setPlaceResults(payload.results ?? []);
      } catch {
        if (requestId === placeRequestRef.current) setPlaceResults([]);
      } finally {
        if (requestId === placeRequestRef.current) setPlaceLoading(false);
      }
    }, 350);
  };

  const selectPlace = async (place: { placeId: string; description: string }) => {
    if (!token) return;
    setPlaceLoading(true);
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/maps/places/${encodeURIComponent(place.placeId)}?sessiontoken=browse-${Date.now()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const payload = await response.json() as { place?: { latitude: number; longitude: number }; error?: string };
      if (!response.ok || !payload.place) throw new Error(payload.error ?? "Place unavailable");
      const region = { latitude: payload.place.latitude, longitude: payload.place.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 };
      const bounds = {
        minLat: region.latitude - region.latitudeDelta / 2,
        maxLat: region.latitude + region.latitudeDelta / 2,
        minLng: region.longitude - region.longitudeDelta / 2,
        maxLng: region.longitude + region.longitudeDelta / 2,
      };
      setSearch(place.description);
      setDebouncedSearch("");
      setPlaceResults([]);
      setPlaceFocused(false);
      setMapFocusRegion(region);
      setLocationFilterBounds(bounds);
    } catch (error) {
      setLocationNotice(error instanceof Error ? error.message : "That place could not be loaded. Please choose another suggestion.");
    } finally {
      setPlaceLoading(false);
    }
  };

  const setPriceRange = (low: number, high: number) => {
    const clampedLow = Math.max(0, Math.min(Math.round(low), categoryMaxPrice));
    const clampedHigh = Math.max(clampedLow, Math.min(Math.round(high), categoryMaxPrice));
    setPriceMin(String(clampedLow));
    setPriceMax(String(clampedHigh));
  };

  const resetAdvancedFilters = () => {
    setPriceRange(0, categoryMaxPrice);
    setSelectedBedrooms(null);
    setSelectedAmenities([]);
  };

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenities((current) =>
      current.includes(amenityId)
        ? current.filter((id) => id !== amenityId)
        : [...current, amenityId]
    );
  };

  const handleUseLocation = async () => {
    setLocationLoading(true);
    try {
      let location = userLocation;
      if (!location) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationNotice("Allow location access to show properties near you.");
          return;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        location = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(location);
      }
      const latitudeDelta = 0.18;
      const longitudeDelta = latitudeDelta / Math.max(Math.cos((location.lat * Math.PI) / 180), 0.35);
      const region = {
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta,
        longitudeDelta,
      };
      setMapFocusRegion(region);
      setLocationFilterBounds({
        minLat: location.lat - latitudeDelta / 2,
        maxLat: location.lat + latitudeDelta / 2,
        minLng: location.lng - longitudeDelta / 2,
        maxLng: location.lng + longitudeDelta / 2,
      });
      setLocationNotice("Showing properties within about 10 km of your location.");
    } catch {
      setLocationNotice("Your location could not be loaded. You can still search by place.");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchFeatured()]);
    setRefreshing(false);
  };

  const handleMapSearchArea = React.useCallback((bounds: MapBBox, source: "focus" | "user") => {
    if (source === "user") setLocationFilterBounds(bounds);
  }, []);

  const handleFilterChipPress = (item: FilterItem) => {
    if (item.hasDropdown) {
      if (activeType !== item.value) {
        setActiveType(item.value);
        setActiveSubCategory(null);
      }
      if (item.value === "rent") setRentModalVisible(true);
      else if (item.value === "sale") setBuyModalVisible(true);
    } else {
      setActiveType(item.value);
      if (activeType !== item.value) setActiveSubCategory(null);
    }
  };

  const handleSubCategorySelect = (mainType: ListPropertiesParams["type"], sub: string) => {
    setActiveType(mainType);
    setActiveSubCategory(sub === "All Rentals" || sub === "All For Sale" ? null : sub);
    setRentModalVisible(false);
    setBuyModalVisible(false);
  };

  const handleSortChange = async (option: SortOption) => {
    if (option === "distance") {
      if (userLocation) { setSortBy("distance"); return; }
      setLocationLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortBy("distance");
      } catch { /* keep previous */ }
      finally { setLocationLoading(false); }
    } else {
      setSortBy(option);
    }
  };

  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top;
  const styles = getStyles(colors, topPadding, width, height);

  const hasAnySections = bnbHotelProperties.length > 0 || rentProperties.length > 0 || saleProperties.length > 0;
  const activeFilterCount = [
    !!activeType && (Number(priceMin) > 0 || (Number(priceMax) > 0 && Number(priceMax) < categoryMaxPrice)),
    selectedBedrooms !== null,
    selectedAmenities.length > 0,
    locationFilterBounds !== null,
  ].filter(Boolean).length;
  const categoryTitle =
    activeType === "bnb" ? (activeSubCategory ?? "All B&B Stays") :
    activeType === "rent" ? (activeSubCategory ?? "All Rentals") :
    activeType === "sale" ? (activeSubCategory ?? "For Sale") :
    activeType === "hostel" ? "Hostels" :
    activeType === "hotel" ? "Hotels" :
    "Properties";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={browseScrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isWeb ? 34 + 100 : insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header, menu, map, and listings intentionally share one scroll surface. */}
        <View style={styles.header}>
          <BrandLogo />
          <Pressable
            style={[styles.listPropertyButton, { borderColor: colors.border, backgroundColor: colors.muted }]}
            onPress={handleListPropertyPress}
            testID="browse-list-property"
          >
            <Feather name="plus-square" size={15} color={colors.foreground} />
            <Text style={[styles.listPropertyButtonText, { color: colors.foreground }]}>List</Text>
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          {FILTER_TYPES.map((item) => {
            const isActive = activeType === item.value || (item.value === "rent" && activeType === "rent") || (item.value === "sale" && activeType === "sale");
            return (
              <Pressable
                key={item.label}
                style={[styles.filterChip, { backgroundColor: isActive ? colors.primary : colors.muted, borderColor: isActive ? colors.primary : colors.border }]}
                onPress={() => handleFilterChipPress(item)}
              >
                <Text numberOfLines={1} style={[styles.filterChipText, { color: isActive ? colors.primaryForeground : colors.foreground }]}>
                  {item.label}
                </Text>
                {item.hasDropdown && <Feather name="chevron-down" size={10} color={isActive ? colors.primaryForeground : colors.mutedForeground} />}
              </Pressable>
            );
          })}
        </View>

        {activeType === "bnb" && (
          <>
            <View style={[styles.individualFilterBar, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.individualChips}>
                {BNB_SUBS.map((item) => {
                  const selected = item.subtype === null ? activeSubCategory === null : activeSubCategory === item.label;
                  return (
                    <Pressable
                      key={item.label}
                      style={[styles.individualChip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.background }]}
                      onPress={() => setActiveSubCategory(item.subtype === null ? null : item.label)}
                    >
                      <Text style={[styles.individualChipText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Pressable
                style={[styles.filtersButton, { backgroundColor: bnbFiltersVisible || activeFilterCount > 0 ? colors.primary : colors.background, borderColor: colors.primary }]}
                onPress={() => setBnbFiltersVisible((visible) => !visible)}
              >
                <Feather name="sliders" size={14} color={bnbFiltersVisible || activeFilterCount > 0 ? colors.primaryForeground : colors.foreground} />
                <Text style={[styles.filtersButtonText, { color: bnbFiltersVisible || activeFilterCount > 0 ? colors.primaryForeground : colors.foreground }]}>Filters</Text>
              </Pressable>
            </View>
            {bnbFiltersVisible && (
              <View style={[styles.bnbPricePanel, { borderBottomColor: colors.border }]}>
                <View style={styles.pricePanelHeader}>
                  <Text style={[styles.pricePanelTitle, { color: colors.foreground }]}>Price Range (KES / night)</Text>
                  <Pressable onPress={() => setPriceRange(0, categoryMaxPrice)}>
                    <Text style={[styles.pricePanelReset, { color: colors.mutedForeground }]}>Reset</Text>
                  </Pressable>
                </View>
                <PriceRangeSlider
                  min={0}
                  max={categoryMaxPrice}
                  low={Number(priceMin) || 0}
                  high={Number(priceMax) || categoryMaxPrice}
                  onLowChange={(value) => setPriceRange(value, Number(priceMax) || categoryMaxPrice)}
                  onHighChange={(value) => setPriceRange(Number(priceMin) || 0, value)}
                  onReset={() => setPriceRange(0, categoryMaxPrice)}
                />
                <View style={styles.priceInputRow}>
                  <View style={styles.priceInputGroup}>
                    <Text style={[styles.priceInputLabel, { color: colors.mutedForeground }]}>Min (KES)</Text>
                    <TextInput
                      style={[styles.priceInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                      value={priceMin}
                      onChangeText={(value) => setPriceMin(value.replace(/[^\d]/g, ""))}
                      onBlur={() => setPriceRange(Number(priceMin) || 0, Number(priceMax) || categoryMaxPrice)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                  </View>
                  <Text style={[styles.priceDash, { color: colors.mutedForeground }]}>–</Text>
                  <View style={styles.priceInputGroup}>
                    <Text style={[styles.priceInputLabel, { color: colors.mutedForeground }]}>Max (KES)</Text>
                    <TextInput
                      style={[styles.priceInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                      value={priceMax}
                      onChangeText={(value) => setPriceMax(value.replace(/[^\d]/g, ""))}
                      onBlur={() => setPriceRange(Number(priceMin) || 0, Number(priceMax) || categoryMaxPrice)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                  </View>
                </View>
              </View>
            )}
            <View style={styles.categorySearchArea}>
              <View style={[styles.categorySearchInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="search" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.categorySearchText, { color: colors.foreground }]}
                  placeholder="Search by name or location…"
                  placeholderTextColor={colors.mutedForeground}
                  value={search}
                  onChangeText={handleSearch}
                  onFocus={() => setPlaceFocused(true)}
                  onBlur={() => setTimeout(() => setPlaceFocused(false), 150)}
                  onSubmitEditing={() => { setDebouncedSearch(search); setPlaceFocused(false); }}
                  returnKeyType="search"
                />
                {search.length > 0 && (
                  <Pressable onPress={() => { setSearch(""); setDebouncedSearch(""); setLocationFilterBounds(null); setPlaceResults([]); }}>
                    <Feather name="x" size={15} color={colors.mutedForeground} />
                  </Pressable>
                )}
              </View>
            </View>
          </>
        )}

        {activeType && activeType !== "bnb" && (
          <>
            {(activeType === "rent" || activeType === "sale") && (
              <View style={[styles.individualFilterBar, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.individualChips}>
                  {(activeType === "rent"
                    ? RENT_SUBS.flatMap((section) => section.items)
                    : BUY_SUBS.flatMap((section) => section.items)
                  ).map((item) => {
                    const isAll = item === "All Rentals" || item === "All For Sale";
                    const selected = isAll ? activeSubCategory === null : activeSubCategory === item;
                    return (
                      <Pressable
                        key={item}
                        style={[styles.individualChip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.background }]}
                        onPress={() => setActiveSubCategory(isAll ? null : item)}
                      >
                        <Text style={[styles.individualChipText, { color: selected ? colors.primaryForeground : colors.foreground }]}>{item}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={styles.categorySearchArea}>
              <View style={[styles.categorySearchInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="search" size={16} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.categorySearchText, { color: colors.foreground }]}
                  placeholder="Search by location, city, or property name…"
                  placeholderTextColor={colors.mutedForeground}
                  value={search}
                  onChangeText={handleSearch}
                  onFocus={() => setPlaceFocused(true)}
                  onBlur={() => setTimeout(() => setPlaceFocused(false), 150)}
                  onSubmitEditing={() => { setDebouncedSearch(search); setPlaceFocused(false); }}
                  returnKeyType="search"
                />
                {search.length > 0 && (
                  <Pressable onPress={() => { setSearch(""); setDebouncedSearch(""); setLocationFilterBounds(null); setPlaceResults([]); }}>
                    <Feather name="x" size={15} color={colors.mutedForeground} />
                  </Pressable>
                )}
              </View>
              <View style={styles.categoryActionRow}>
                <Pressable
                  style={[styles.locationButton, { backgroundColor: locationFilterBounds ? colors.primary : colors.background, borderColor: colors.primary }]}
                  onPress={() => void handleUseLocation()}
                  disabled={locationLoading}
                >
                  {locationLoading
                    ? <ActivityIndicator size={14} color={locationFilterBounds ? colors.primaryForeground : colors.foreground} />
                    : <Feather name="crosshair" size={15} color={locationFilterBounds ? colors.primaryForeground : colors.foreground} />}
                  <Text style={[styles.categoryActionText, { color: locationFilterBounds ? colors.primaryForeground : colors.foreground }]}>Use Location</Text>
                </Pressable>
                <Pressable
                  style={[styles.categoryActionButton, { backgroundColor: activeFilterCount > 0 ? colors.primary : colors.background, borderColor: colors.primary }]}
                  onPress={() => setFiltersVisible(true)}
                >
                  <Feather name="sliders" size={15} color={activeFilterCount > 0 ? colors.primaryForeground : colors.foreground} />
                  <Text style={[styles.categoryActionText, { color: activeFilterCount > 0 ? colors.primaryForeground : colors.foreground }]}>
                    Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.searchButton, { backgroundColor: colors.primary }]}
                  onPress={() => { setDebouncedSearch(search); setPlaceFocused(false); }}
                >
                  <Text style={[styles.searchButtonText, { color: colors.primaryForeground }]}>Search</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}

        {!activeType && (
          <View style={styles.searchRow}>
            <View style={[styles.searchCol, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="tag" size={14} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchColInput, { color: colors.foreground, fontFamily: "Outfit_400Regular" }]}
                placeholder="Max price…"
                placeholderTextColor={colors.mutedForeground}
                value={priceMax}
                onChangeText={setPriceMax}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>
            <View style={[styles.searchCol, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="search" size={14} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchColInput, { color: colors.foreground, fontFamily: "Outfit_400Regular" }]}
                placeholder="Name, area…"
                placeholderTextColor={colors.mutedForeground}
                value={search}
                onChangeText={handleSearch}
                onFocus={() => setPlaceFocused(true)}
                onBlur={() => setTimeout(() => setPlaceFocused(false), 150)}
                returnKeyType="search"
              />
              {search.length > 0 && <Pressable onPress={() => { setSearch(""); setDebouncedSearch(""); setLocationFilterBounds(null); setPlaceResults([]); }}><Feather name="x" size={13} color={colors.mutedForeground} /></Pressable>}
            </View>
          </View>
        )}

        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((opt) => {
            const isActive = sortBy === opt.value;
            const isDistanceLoading = opt.value === "distance" && locationLoading;
            return (
              <Pressable
                key={opt.value}
                style={[styles.sortChip, { backgroundColor: isActive ? colors.primary : colors.muted, borderColor: isActive ? colors.primary : colors.border, opacity: isDistanceLoading ? 0.6 : 1 }]}
                onPress={() => handleSortChange(opt.value)}
                disabled={isDistanceLoading}
              >
                {isDistanceLoading ? <ActivityIndicator size={12} color={colors.mutedForeground} /> : (
                  <Feather name={opt.icon as React.ComponentProps<typeof Feather>["name"]} size={11} color={isActive ? colors.primaryForeground : colors.mutedForeground} />
                )}
                <Text numberOfLines={1} style={[styles.sortChipText, { color: isActive ? colors.primaryForeground : colors.foreground }]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {placeFocused && search.trim().length >= 2 && (
          <View style={[styles.placeSuggestions, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {placeLoading && placeResults.length === 0 ? <ActivityIndicator color={colors.primary} /> : placeResults.map((place) => (
              <Pressable key={place.placeId} style={[styles.placeSuggestion, { borderBottomColor: colors.border }]} onPress={() => void selectPlace(place)}>
                <Feather name="map-pin" size={14} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.placeMain, { color: colors.foreground }]} numberOfLines={1}>{place.description}</Text>
                  {!!place.secondaryText && <Text style={[styles.placeSecondary, { color: colors.mutedForeground }]} numberOfLines={1}>{place.secondaryText}</Text>}
                </View>
              </Pressable>
            ))}
          </View>
        )}
        {locationNotice && <Text style={[styles.locationNotice, { color: colors.mutedForeground }]}>{locationNotice}</Text>}

        {isLoading ? (
          <View style={[styles.center, styles.loadingState]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading properties…</Text>
          </View>
        ) : error ? (
          <View style={[styles.center, styles.loadingState]}>
            <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Failed to load properties</Text>
            <Pressable style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
              <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {activeType && (
              <View style={styles.resultsHeader}>
                <View style={styles.resultsCopy}>
                  <Text style={[styles.resultsCount, { color: colors.foreground }]}>
                    {filteredProperties.length} {filteredProperties.length === 1 ? "property" : "properties"} found
                  </Text>
                  <Text style={[styles.resultsSubtitle, { color: colors.mutedForeground }]}>Showing {categoryTitle}</Text>
                </View>
                <View style={[styles.viewToggle, { borderColor: colors.border }]}>
                  <Pressable
                    style={[styles.viewToggleButton, categoryViewMode === "list" && { backgroundColor: colors.primary }]}
                    onPress={() => setCategoryViewMode("list")}
                  >
                    <Feather name="list" size={14} color={categoryViewMode === "list" ? colors.primaryForeground : colors.foreground} />
                    <Text style={[styles.viewToggleText, { color: categoryViewMode === "list" ? colors.primaryForeground : colors.foreground }]}>List</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.viewToggleButton, categoryViewMode === "map" && { backgroundColor: colors.primary }]}
                    onPress={() => setCategoryViewMode("map")}
                  >
                    <Feather name="map" size={14} color={categoryViewMode === "map" ? colors.primaryForeground : colors.foreground} />
                    <Text style={[styles.viewToggleText, { color: categoryViewMode === "map" ? colors.primaryForeground : colors.foreground }]}>Map</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {(!activeType || categoryViewMode === "map") && (
              <View style={styles.mapWrapper}>
                <PropertyMapView properties={mapProperties} onSearchArea={handleMapSearchArea} focusRegion={mapFocusRegion} />
              </View>
            )}

            {filteredProperties.length === 0 ? (
              <View style={[styles.center, styles.emptyState]}>
                <Feather name="home" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No properties found</Text>
              </View>
            ) : activeType ? (
              categoryViewMode === "list" ? (
                <SectionBlock
                  title={categoryTitle}
                  properties={filteredProperties}
                  total={filteredProperties.length}
                  colors={colors}
                />
              ) : null
            ) : hasAnySections ? (
              <>
                {visibleFeaturedProperties.length > 0 && (
                  <SectionBlock
                    title="Featured Listings"
                    properties={visibleFeaturedProperties.slice(0, 10)}
                    total={visibleFeaturedProperties.length}
                    colors={colors}
                  />
                )}
                <SectionBlock
                  title="B&B & Hotels"
                  properties={bnbHotelProperties.slice(0, 10)}
                  total={bnbHotelProperties.length}
                  onExploreMore={() => { setActiveType("bnb"); setActiveSubCategory(null); }}
                  colors={colors}
                />
                <SectionBlock
                  title="Latest Rentals"
                  properties={rentProperties.slice(0, 10)}
                  total={rentProperties.length}
                  onExploreMore={() => { setActiveType("rent"); setActiveSubCategory(null); }}
                  colors={colors}
                />
                <SectionBlock
                  title="Properties For Sale"
                  properties={saleProperties.slice(0, 10)}
                  total={saleProperties.length}
                  onExploreMore={() => { setActiveType("sale"); setActiveSubCategory(null); }}
                  colors={colors}
                />
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <SubCategoryModal visible={rentModalVisible} onClose={() => setRentModalVisible(false)} title="Rent a Property" sections={RENT_SUBS} activeItem={activeType === "rent" ? activeSubCategory : null} onSelect={(sub) => handleSubCategorySelect("rent", sub)} colors={colors} />
      <SubCategoryModal visible={buyModalVisible} onClose={() => setBuyModalVisible(false)} title="Buy a Property" sections={BUY_SUBS} activeItem={activeType === "sale" ? activeSubCategory : null} onSelect={(sub) => handleSubCategorySelect("sale", sub)} colors={colors} />
      <FilterModal
        visible={filtersVisible && !!activeType && activeType !== "bnb"}
        onClose={() => setFiltersVisible(false)}
        colors={colors}
        type={activeType}
        isCommercial={isCommercialCategory}
        maxPrice={categoryMaxPrice}
        minDraft={priceMin}
        maxDraft={priceMax}
        onMinDraftChange={setPriceMin}
        onMaxDraftChange={setPriceMax}
        onPriceChange={setPriceRange}
        selectedBedrooms={selectedBedrooms}
        onBedroomChange={setSelectedBedrooms}
        selectedAmenities={selectedAmenities}
        onAmenityToggle={toggleAmenity}
        onReset={resetAdvancedFilters}
        resultCount={filteredProperties.length}
      />
      <AccountUpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={() => router.push("/(tabs)/list-property" as never)}
      />
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useColors>, topPadding: number, width: number, height: number) {
  const hPad = 12;
  const chipGap = 6;
  const filterCount = FILTER_TYPES.length;
  const sortCount = SORT_OPTIONS.length;
  const filterChipW = Math.floor((width - hPad * 2 - chipGap * (filterCount - 1)) / filterCount);
  const sortChipW   = Math.floor((width - hPad * 2 - chipGap * (sortCount - 1)) / sortCount);
  const mapHeight = Math.round(height * 0.36);

  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: topPadding + 16, paddingHorizontal: hPad, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    listPropertyButton: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
    listPropertyButtonText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
    scrollView: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    filterRow: { flexDirection: "row", paddingHorizontal: hPad, gap: chipGap },
    filterChip: { width: filterChipW, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 8, borderWidth: 1, borderRadius: 20 },
    filterChipText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
    subCategoryBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginHorizontal: hPad, marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    subCategoryText: { fontSize: 11, fontFamily: "Outfit_400Regular" },
    individualFilterBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: hPad, paddingVertical: 10, marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
    individualChips: { gap: 8, paddingRight: 4 },
    individualChip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
    individualChipText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
    filtersButton: { height: 36, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14 },
    filtersButtonText: { fontSize: 12, fontFamily: "Outfit_700Bold" },
    bnbPricePanel: { paddingHorizontal: hPad, paddingTop: 14, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    pricePanelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    pricePanelTitle: { fontSize: 14, fontFamily: "Outfit_700Bold" },
    pricePanelReset: { fontSize: 12, fontFamily: "Outfit_400Regular", textDecorationLine: "underline" },
    priceInputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
    priceInputGroup: { flex: 1, gap: 5 },
    priceInputLabel: { fontSize: 11, fontFamily: "Outfit_400Regular" },
    priceInput: { height: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 14, fontFamily: "Outfit_400Regular" },
    priceDash: { fontSize: 18, paddingBottom: 10 },
    categorySearchArea: { paddingHorizontal: hPad, paddingTop: 12, gap: 10 },
    categorySearchInput: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12 },
    categorySearchText: { flex: 1, paddingVertical: 10, fontSize: 13, fontFamily: "Outfit_400Regular" },
    categoryActionRow: { flexDirection: "row", gap: 8 },
    locationButton: { flex: 1.2, minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8 },
    categoryActionButton: { flex: 1, minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8 },
    categoryActionText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
    searchButton: { minWidth: 74, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 8, paddingHorizontal: 12 },
    searchButtonText: { fontSize: 13, fontFamily: "Outfit_700Bold" },
    sortRow: { flexDirection: "row", paddingHorizontal: hPad, paddingTop: 8, gap: chipGap },
    sortChip: { width: sortChipW, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 7, borderWidth: 1, borderRadius: 20 },
    sortChipText: { fontSize: 11, fontFamily: "Outfit_600SemiBold" },
    searchRow: { flexDirection: "row", paddingHorizontal: hPad, paddingTop: 8, gap: 8 },
    searchCol: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, borderRadius: 10, gap: 6 },
    searchColInput: { flex: 1, fontSize: 13, padding: 0 },
    placeSuggestions: { marginHorizontal: hPad, borderWidth: 1, borderRadius: 10, overflow: "hidden", zIndex: 3 },
    placeSuggestion: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
    placeMain: { fontSize: 13, fontFamily: "Outfit_500Medium" },
    placeSecondary: { fontSize: 11, fontFamily: "Outfit_400Regular", marginTop: 1 },
    locationNotice: { marginHorizontal: hPad, paddingTop: 6, fontSize: 12, fontFamily: "Outfit_400Regular" },
    resultsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: hPad, paddingTop: 18, paddingBottom: 8 },
    resultsCopy: { flex: 1 },
    resultsCount: { fontSize: 18, fontFamily: "Outfit_700Bold" },
    resultsSubtitle: { fontSize: 12, fontFamily: "Outfit_400Regular", marginTop: 2 },
    viewToggle: { flexDirection: "row", borderWidth: 1, borderRadius: 7, overflow: "hidden" },
    viewToggleButton: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 8 },
    viewToggleText: { fontSize: 11, fontFamily: "Outfit_600SemiBold" },
    mapWrapper: { height: mapHeight, marginTop: 4 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
    loadingState: { minHeight: mapHeight },
    emptyState: { minHeight: mapHeight * 0.5 },
    emptyText: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center" },
    retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 8 },
    retryText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  });
}
