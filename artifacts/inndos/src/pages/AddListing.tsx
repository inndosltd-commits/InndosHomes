 priceUnit: listingType === "bnb" ? "night" : (priceUnit || undefined),
        lat: pinPosition?.lat != null ? String(pinPosition.lat) : undefined,
        lng: pinPosition?.lng != null ? String(pinPosition.lng) : undefined,
      };

      const url = isEditing ? `/api/properties/${editId}` : "/api/properties";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string; details?: { fieldErrors?: Record<string, string[]> } };
        if (data.details?.fieldErrors && Object.keys(data.details.fieldErrors).length > 0) {
          const mappedFieldErrors = Object.entries(data.details.fieldErrors).reduce<Record<string, string[]>>(
            (mapped, [field, messages]) => {
              const leaf = field
                .replace(/\[([^\]]+)\]/g, ".$1")
                .replace(/^details\./, "")
                .split(".")
                .filter(Boolean)
                .at(-1) ?? field;
              const target =
                leaf === "type" ? "listingType" :
                ["image", "images", "photos", "imageUrl"].includes(leaf) ? "images" :
                ["video", "videos"].includes(leaf) ? "videos" :
                ["plotSize", "plotSizeFt"].includes(leaf) ? "plotSizeFt" :
                ["latitude", "longitude", "lat", "lng"].includes(leaf) ? "location" :
                leaf;
              mapped[target] = messages;
              return mapped;
            },
            {},
          );
          setFieldErrors(mappedFieldErrors);
          const firstInvalidField = Object.keys(mappedFieldErrors)[0];
          requestAnimationFrame(() => {
            document.getElementById(firstInvalidField)?.scrollIntoView({ behavior: "smooth", block: "center" });
            document.getElementById(firstInvalidField)?.focus();
          });
          toast({
            title: isEditing ? "Update failed" : "Submission failed",
            description: data.error || "Please fix the highlighted errors below.",
            variant: "destructive",
          });
        } else {
          toast({
            title: isEditing ? "Update failed" : "Submission failed",
            description: data.error || "Could not submit listing. Please try again.",
            variant: "destructive",
          });
        }
        return;
      }
      setFieldErrors({});
      clearDraftAfterSubmit();
      toast({
        title: isEditing ? "Listing Updated" : "Listing Submitted for Review",
        description: isEditing
          ? "Your property has been updated."
          : "Your listing has been submitted and is pending admin approval before it goes live.",
      });
      setLocation("/dashboard");
    } catch {
      toast({ title: "Network error", description: "Could not reach the server. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditing && (isLoadingProperty || (!editLoadError && loadedEditId !== editId))) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-muted-foreground">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (isEditing && editLoadError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="font-semibold">Listing unavailable</p>
          <p className="text-sm text-muted-foreground">{editLoadError}</p>
          <Button onClick={() => setLocation("/dashboard")}>Back to My Listings</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {isPublishedCmsPage(listPropertyCmsPage) && (
            <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" data-testid="dashboard-cms-list-property">
              <CmsDashboardRenderer document={listPropertyCmsPage.published} />
            </div>
          )}
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-heading">{isEditing ? "Edit Listing" : "Add New Listing"}</h1>
            <p className="text-muted-foreground">{isEditing ? "Update your property details below." : "Fill in the details below to publish your property. Admin approval is required before the listing goes live."}</p>
          </div>

          {/* Draft banner — new listings only */}
          {!isEditing && hasSavedDraft && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <RotateCcw className="h-4 w-4 text-blue-600 shrink-0" />
              <p className="flex-1 text-sm text-blue-800 font-medium">You have a saved draft. Restore it to continue where you left off. Drafts saved to your account are available on all your devices.</p>
              <Button size="sm" variant="outline" onClick={restoreDraft} disabled={isDraftSyncing} className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100">
                {isDraftSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Restore Draft"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowDiscardConfirm(true)} className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                Discard
              </Button>
            </div>
          )}

          {/* Discard confirmation dialog */}
          <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Discard Draft?</DialogTitle>
                <DialogDescription>
                  This will permanently delete your saved draft, including any uploaded photos and videos referenced in it. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowDiscardConfirm(false)}>Cancel</Button>
                <Button variant="destructive" onClick={discardDraft}>Discard Draft</Button>
              </div>
            </DialogContent>
          </Dialog>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Details</CardTitle>
                  <CardDescription>The basics about your property</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Property Title</Label>
                    <Input id="title" placeholder="e.g. Modern Apartment in Westlands" value={title} onChange={e => { setTitle(e.target.value); setFieldErrors(prev => ({ ...prev, title: [] })); }} required className={fieldErrors.title?.length ? "border-red-500" : ""} />
                    {fieldErrors.title?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Listing Type</Label>
                      <Select
                        value={listingType}
                        onValueChange={(value) => {
                          setListingType(value);
                          setSubtype("");
                          setPriceUnit("");
                          setFieldErrors(prev => ({ ...prev, type: [], subtype: [], priceUnit: [] }));
                        }}
                        required
                      >
                        <SelectTrigger id="type" className={fieldErrors.type?.length ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rent">For Rent</SelectItem>
                          <SelectItem value="rent-business">For Rent - Office Space</SelectItem>
                          <SelectItem value="rent-godown">For Rent - Godown</SelectItem>
                          <SelectItem value="rent-stall">For Rent - Stall</SelectItem>
                          <SelectItem value="rent-shop">For Rent - Shop</SelectItem>
                          <SelectItem value="sale-apartment">For Sale - Apartment</SelectItem>
                          <SelectItem value="sale-home">For Sale - House / Home</SelectItem>
                          <SelectItem value="sale-land">For Sale - Land</SelectItem>
                          <SelectItem value="bnb">B&B / Short Stay</SelectItem>
                          <SelectItem value="hotel">Hotel</SelectItem>
                          <SelectItem value="hostel">Hostel (Student Rentals)</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldErrors.type?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    </div>
                    {listingType !== 'bnb' && (
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (KES)</Label>
                      <Input id="price" type="number" placeholder="e.g. 85000" value={price} onChange={e => { setPrice(e.target.value); setFieldErrors(prev => ({ ...prev, price: [] })); }} required className={fieldErrors.price?.length ? "border-red-500" : ""} />
                      {fieldErrors.price?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    </div>
                    )}
                  </div>

                  {/* Subtype selector — Rent: apartment category; Sale: property category */}
                  {(listingType === 'rent') && (
                  <div className="space-y-2">
                    <Label htmlFor="subtype">Apartment Type</Label>
                    <Select value={subtype} onValueChange={setSubtype}>
                      <SelectTrigger id="subtype" className={fieldErrors.subtype?.length ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select apartment type (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="studio">Studio / Bedsitter</SelectItem>
                        <SelectItem value="1-bedroom">1 Bedroom</SelectItem>
                        <SelectItem value="2-bedroom">2 Bedrooms</SelectItem>
                        <SelectItem value="3-bedroom">3 Bedrooms</SelectItem>
                        <SelectItem value="4-bedroom">4+ Bedrooms</SelectItem>
                        <SelectItem value="penthouse">Penthouse</SelectItem>
                        <SelectItem value="own-compound">Own Compound</SelectItem>
                        <SelectItem value="condominium">Condominium</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.subtype?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    <p className="text-xs text-muted-foreground">Helps guests find your property under the right category.</p>
                  </div>
                  )}

                  {/* Price Per — standard rent */}
                  {listingType === 'rent' && (
                  <div className="space-y-2">
                    <Label htmlFor="rent_price_unit">Price Per</Label>
                    <Select value={priceUnit} onValueChange={setPriceUnit}>
                      <SelectTrigger id="priceUnit" className={fieldErrors.priceUnit?.length ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select payment period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Per Month</SelectItem>
                        <SelectItem value="week">Per Week</SelectItem>
                        <SelectItem value="year">Per Year</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.priceUnit?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    <p className="text-xs text-muted-foreground">Select how often the rent is charged.</p>
                  </div>
                  )}

                  {/* B&B Type selector */}
                  {listingType === 'bnb' && (
                  <div className="space-y-3">
                    <Label htmlFor="bnb_subtype">B&B Property Type</Label>
                    <Select value={subtype} onValueChange={setSubtype}>
                      <SelectTrigger id="subtype" className={fieldErrors.subtype?.length ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select B&B type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="serviced-apartment">
                          <div>
                            <div className="font-medium">Serviced Apartment</div>
                            <div className="text-xs text-muted-foreground">Fully furnished with hotel-like amenities</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="entire-place">
                          <div>
                            <div className="font-medium">Entire Place</div>
                            <div className="text-xs text-muted-foreground">Private home, apartment or villa with dedicated entrance</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="private-room">
                          <div>
                            <div className="font-medium">Private Room</div>
                            <div className="text-xs text-muted-foreground">Own bedroom; shared kitchen, living room or bathroom</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="shared-room">
                          <div>
                            <div className="font-medium">Shared Room</div>
                            <div className="text-xs text-muted-foreground">Shared bedroom and common areas with other guests</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="unique-stays">
                          <div>
                            <div className="font-medium">Unique Stays</div>
                            <div className="text-xs text-muted-foreground">Treehouses, container homes, yurts, houseboats and more</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="hotel-room">
                          <div>
                            <div className="font-medium">Hotel Room / Boutique Hotel</div>
                            <div className="text-xs text-muted-foreground">Rooms in hotels, hostels or Bed & Breakfasts</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="vacation-home">
                          <div>
                            <div className="font-medium">Vacation Home</div>
                            <div className="text-xs text-muted-foreground">Cabins, rustic villas or standalone getaway properties</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="nature-stay">
                          <div>
                            <div className="font-medium">Nature-Focused Stay</div>
                            <div className="text-xs text-muted-foreground">Cabins, bungalows, container homes, villas in nature settings</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="other">
                          <div>
                            <div className="font-medium">Other</div>
                            <div className="text-xs text-muted-foreground">Any other type of short-stay accommodation</div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.subtype?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    <p className="text-xs text-muted-foreground">Helps guests understand what kind of stay they are booking.</p>
                  </div>
                  )}

                  {/* B&B Pricing — daily (existing price) + optional hourly rate */}
                  {listingType === 'bnb' && (
                  <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div>
                      <Label className="text-sm font-semibold text-blue-800">B&B Pricing Options</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Set daily rate, hourly rate, or both.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="price_bnb" className="text-sm">Daily Rate (KES)</Label>
                        <Input id="price_bnb" type="number" min="0" placeholder="e.g. 5000" value={price} onChange={e => { setPrice(e.target.value); setFieldErrors(prev => ({ ...prev, price: [] })); }} />
                        <p className="text-xs text-muted-foreground">Price per night/day</p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="hourly_rate" className="text-sm">Hourly Rate (KES) <span className="text-gray-400 font-normal">(optional)</span></Label>
                        <Input id="hourly_rate" type="number" min="0" placeholder="e.g. 800" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
                        <p className="text-xs text-muted-foreground">Leave blank if hourly is not available</p>
                      </div>
                    </div>
                  </div>
                  )}

                  {listingType === 'hostel' && (
                  <div className="space-y-2">
                    <Label htmlFor="hostel_price_unit">Price Per</Label>
                    <Select value={priceUnit} onValueChange={setPriceUnit}>
                      <SelectTrigger id="priceUnit" className={fieldErrors.priceUnit?.length ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select payment period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="night">Per Night</SelectItem>
                        <SelectItem value="month">Per Month</SelectItem>
                        <SelectItem value="semester">Per Semester / Term</SelectItem>
                        <SelectItem value="year">Per Year</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.priceUnit?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    <p className="text-xs text-muted-foreground">Select the payment period so students know when they book.</p>
                  </div>
                  )}

                  {listingType === 'hotel' && (
                  <div className="space-y-2">
                    <Label htmlFor="hotel_price_unit">Price Per</Label>
                    <Select value={priceUnit} onValueChange={setPriceUnit}>
                      <SelectTrigger id="priceUnit" className={fieldErrors.priceUnit?.length ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select pricing period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="night">Per Night</SelectItem>
                        <SelectItem value="month">Per Month</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.priceUnit?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    <p className="text-xs text-muted-foreground">Default is per night. Choose per month for long-stay guests.</p>
                  </div>
                  )}

                  {isCommercialVariant(listingType) && (
                  <div className="space-y-2">
                    <Label htmlFor="commercial_price_unit">Price Per</Label>
                    <Select value={priceUnit} onValueChange={setPriceUnit}>
                      <SelectTrigger id="priceUnit" className={fieldErrors.priceUnit?.length ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select pricing unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Per Month</SelectItem>
                        <SelectItem value="sqft">Per Sq Ft</SelectItem>
                        <SelectItem value="year">Per Year</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.priceUnit?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    <p className="text-xs text-muted-foreground">Select the pricing unit for this commercial space.</p>
                  </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="address">Full Address</Label>
                    <Input id="address" placeholder="e.g. 123 Peponi Road, Westlands, Nairobi" value={address} onChange={e => { setAddress(e.target.value); setFieldErrors(prev => ({ ...prev, address: [] })); }} required className={fieldErrors.address?.length ? "border-red-500" : ""} />
                    {fieldErrors.address?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                  </div>

                  <div id="location" tabIndex={-1} className="space-y-2">
                    <Label>Map Location (Pin)</Label>
                    <div className="text-sm text-gray-500 mb-2">Set the exact location of your property on the map. This helps guests find your property easily.</div>
                    <div 
                      className={`bg-gray-100 rounded-lg h-[200px] border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-colors ${fieldErrors.location?.length ? "border-red-500 ring-1 ring-red-200" : isLocationPinned ? 'border-green-500' : 'border-gray-200'}`}
                      onClick={() => setIsMapModalOpen(true)}
                    >
                      <img src="/images/modern_apartment_exterior.png" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm" />
                      <div className="relative z-10 flex flex-col items-center bg-white/90 p-4 rounded-lg shadow-sm">
                        {isLocationPinned ? (
                          <>
                            <Check className="h-8 w-8 text-green-500 mb-2" />
                            <span className="font-medium text-sm text-green-600">Location Pinned! Click to edit</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="h-8 w-8 text-primary mb-2" />
                            <span className="font-medium text-sm">Click to set exact pin location</span>
                          </>
                        )}
                      </div>
                      {fieldErrors.location?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Specs */}
              <Card>
                <CardHeader>
                  <CardTitle>Features & Amenities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">

                  {/* ── Standard beds / baths / sqft (hidden for land + commercial variants) ── */}
                  {!hideBedsBaths(listingType) && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="beds">{listingType === "hostel" ? "Beds / Units" : "Bedrooms"}</Label>
                      <Input id="beds" type="number" min="0" value={beds} onChange={e => { setBeds(e.target.value); setFieldErrors(prev => ({ ...prev, beds: [] })); }} className={fieldErrors.beds?.length ? "border-red-500" : ""} />
                      {fieldErrors.beds?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="baths">Bathrooms</Label>
                      <Input id="baths" type="number" min="0" value={baths} onChange={e => { setBaths(e.target.value); setFieldErrors(prev => ({ ...prev, baths: [] })); }} className={fieldErrors.baths?.length ? "border-red-500" : ""} />
                      {fieldErrors.baths?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sqft">Square Ft</Label>
                      <Input id="sqft" type="number" min="0" value={sqft} onChange={e => { setSqft(e.target.value); setFieldErrors(prev => ({ ...prev, sqft: [] })); }} className={fieldErrors.sqft?.length ? "border-red-500" : ""} />
                      {fieldErrors.sqft?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    </div>
                  </div>
                  )}

                  {/* ── LAND-specific fields ──────────────────────────── */}
                  {isLandType(listingType) && (
                  <div className="space-y-6">
                    {/* Size */}
                    <div>
                      <Label className="text-sm font-semibold">Size of Land</Label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="space-y-1">
                          <Label htmlFor="acres" className="text-xs text-muted-foreground">Acres</Label>
                          <Input id="acres" type="number" min="0" step="0.01" placeholder="e.g. 0.5" value={acres} onChange={e => { setAcres(e.target.value); setFieldErrors(prev => ({ ...prev, acres: [], plotSizeFt: [] })); }} className={fieldErrors.acres?.length ? "border-red-500" : ""} />
                          {fieldErrors.acres?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="plotSizeFt" className="text-xs text-muted-foreground">Plot size (feet)</Label>
                          <Input
                            id="plotSizeFt"
                            type="text"
                            inputMode="text"
                            placeholder="e.g. 50 by 60, 60*80, or 60x70"
                            value={plotSizeFt}
                            onChange={e => {
                              setPlotSizeFt(e.target.value);
                              setFieldErrors(prev => ({ ...prev, plotSizeFt: [], acres: [] }));
                            }}
                            className={fieldErrors.plotSizeFt?.length ? "border-red-500" : ""}
                          />
                          {fieldErrors.plotSizeFt?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                        </div>
                      </div>
                    </div>

                    {/* Land / Parcel Features */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Land / Parcel Features</Label>
                      <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                        <div className="space-y-1">
                          <Label htmlFor="soilType" className="text-xs">Soil type</Label>
                          <Input id="soilType" placeholder="e.g. Red clay, Sandy loam" value={soilType} onChange={e => setSoilType(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="surveyMaps" className="text-xs">Survey maps & beacons</Label>
                            <Select value={surveyMaps} onValueChange={setSurveyMaps}>
                              <SelectTrigger><SelectValue placeholder="Yes / No" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="titleDeed" className="text-xs">Ready title deed / land ref no.</Label>
                            <Select value={titleDeed} onValueChange={setTitleDeed}>
                              <SelectTrigger><SelectValue placeholder="Yes / No" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="yes">Yes</SelectItem>
                                <SelectItem value="no">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Utilities on the Land */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Utilities on the Land</Label>
                      <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border">
                        {LAND_UTILITIES.map(opt => (
                          <div key={opt.id} className="flex items-center space-x-2">
                            <Checkbox id={opt.id} checked={selectedAmenities.includes(opt.id)} onCheckedChange={() => toggleAmenity(opt.id)} />
                            <label htmlFor={opt.id} className="text-sm cursor-pointer">{opt.label}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Surrounding Amenities */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Premise & Surrounding Amenities</Label>
                      <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border">
                        {LAND_SURROUNDING.map(opt => (
                          <div key={opt.id} className="flex items-center space-x-2">
                            <Checkbox id={opt.id} checked={selectedAmenities.includes(opt.id)} onCheckedChange={() => toggleAmenity(opt.id)} />
                            <label htmlFor={opt.id} className="text-sm cursor-pointer">{opt.label}</label>
                          </div>
                        ))}
                      </div>
                      {/* Zoning classification */}
                      <div className="space-y-2 pt-2">
                        <Label className="text-xs font-medium text-gray-600">Zoning classification</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {LAND_ZONING_OPTIONS.map(opt => (
                            <div key={opt.id} className="flex items-center space-x-2">
                              <Checkbox id={opt.id} checked={selectedAmenities.includes(opt.id)} onCheckedChange={() => toggleAmenity(opt.id)} />
                              <label htmlFor={opt.id} className="text-sm cursor-pointer">{opt.label}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Legal / Financial */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Legal / Financial</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
                        <div className="space-y-1">
                          <Label htmlFor="legalRates" className="text-xs">Rates / land rent status</Label>
                          <Input id="legalRates" placeholder="e.g. Up to date" value={legalRates} onChange={e => setLegalRates(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="legalEncumbrances" className="text-xs">Encumbrances or disputes</Label>
                          <Input id="legalEncumbrances" placeholder="e.g. None" value={legalEncumbrances} onChange={e => setLegalEncumbrances(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="paymentPlan" className="text-xs">Payment plan options</Label>
                          <Input id="paymentPlan" placeholder="e.g. Installments available" value={paymentPlan} onChange={e => setPaymentPlan(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="pricePerUnit" className="text-xs">Price per unit (acre / sqm)</Label>
                          <Input id="pricePerUnit" placeholder="e.g. KES 2M per acre" value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Number of Units (hidden for land) */}
                  {!isLandType(listingType) && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="totalUnits" className="text-sm font-semibold">Number of Units Available</Label>
                        <p className="text-xs text-muted-foreground">
                          How many identical units do you have for this listing? (e.g. 5 apartments in a block, 10 hotel rooms of the same type). Guests can book any available unit on their chosen dates — once all units are booked, the dates are shown as unavailable.
                        </p>
                      </div>
                      <div className="w-24 shrink-0">
                        <Input
                          id="totalUnits"
                          type="number"
                          min="1"
                          value={totalUnits}
                          onChange={e => setTotalUnits(e.target.value)}
                          className="text-center font-semibold"
                        />
                      </div>
                    </div>
                    {parseInt(totalUnits, 10) > 1 && (
                      <p className="text-xs text-blue-600 font-medium">
                        ✓ Up to {totalUnits} bookings can be confirmed for the same dates simultaneously.
                      </p>
                    )}
                  </div>
                  )}

                  {/* ── Dynamic amenities (all non-land types) ─────────── */}
                  {hasStandardAmenities(listingType) && (() => {
                    const { unit, premise } = getAmenityLists(listingType, subtype);
                    return (
                      <>
                        {/* Unit Amenities */}
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm font-semibold">Unit Amenities</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Features inside the individual unit/space</p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg border">
                            {unit.map((item) => (
                              <div key={item.id} className="flex items-center space-x-2">
                                <Checkbox id={`amenity-${item.id}`} checked={selectedAmenities.includes(item.id)} onCheckedChange={() => toggleAmenity(item.id)} />
                                <label htmlFor={`amenity-${item.id}`} className="text-sm leading-none cursor-pointer">{item.label}</label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Premise Amenities */}
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm font-semibold">Premise Amenities</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Shared facilities available on the property</p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg border">
                            {premise.map((item) => (
                              <div key={item.id} className="flex items-center space-x-2">
                                <Checkbox id={`amenity-${item.id}`} checked={selectedAmenities.includes(item.id)} onCheckedChange={() => toggleAmenity(item.id)} />
                                <label htmlFor={`amenity-${item.id}`} className="text-sm leading-none cursor-pointer">{item.label}</label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Describe the property features, neighborhood, etc." 
                      className={`min-h-[150px] ${fieldErrors.description?.length ? "border-red-500" : ""}`}
                      value={description}
                      onChange={e => { setDescription(e.target.value); setFieldErrors(prev => ({ ...prev, description: [] })); }}
                      required 
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Photos */}
              <Card id="images" tabIndex={-1} className={fieldErrors.images?.length ? "border-red-500 ring-1 ring-red-200" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5">Photos <span className="text-red-500 text-base">*</span></CardTitle>
                  <CardDescription>
                    At least one photo is required. Upload or take high quality images of your property.
                    {imageLimit > 0 && (
                      <span className="ml-1 font-medium text-gray-700">
                        ({images.length}/{imageLimit} used — your plan allows {imageLimit} photo{imageLimit === 1 ? "" : "s"})
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {fieldErrors.images?.map(err => <p key={err} className="mb-3 text-xs text-red-500">{err}</p>)}
                  <div className="flex gap-4 mb-4">
                    <div
                      className="relative flex-1 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleUploadZoneDrop}
                    >
                      <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary pointer-events-none">
                        <Upload className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-sm pointer-events-none">Upload Photos</h3>
                      <p className="text-xs text-muted-foreground pointer-events-none">Tap to browse or drag files here</p>
                      {imageLimit > 0 && (
                        <p className="text-xs text-muted-foreground pointer-events-none">{images.length}/{imageLimit} used</p>
                      )}
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        disabled={imageLimit > 0 && images.length >= imageLimit}
                      />
                    </div>

                    <div
                      className="relative flex-1 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
                    >
                      <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 pointer-events-none">
                        <Camera className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-sm pointer-events-none">Take Photo</h3>
                      <p className="text-xs text-muted-foreground pointer-events-none">Open camera</p>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        ref={cameraInputRef}
                        onChange={handleImageUpload}
                        disabled={imageLimit > 0 && images.length >= imageLimit}
                      />
                    </div>
                  </div>

                  {/* Plan-aware image limit warning */}
                  {imageLimit > 0 && images.length >= imageLimit && (
                    <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-3">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Photo limit reached ({imageLimit} photos). Upgrade your plan to upload more.
                      <a href="/#/pricing" className="ml-auto text-xs text-primary underline underline-offset-2 shrink-0">Upgrade</a>
                    </div>
                  )}
                  
                  {(images.length > 0 || uploadingCount > 0) ? (
                    <>
                      {images.length > 1 && (
                        <p className="text-xs text-muted-foreground mb-2 mt-4 flex items-center gap-1">
                          <GripVertical className="h-3 w-3" /> Drag to reorder on desktop · use arrows on mobile. First photo is the cover.
                        </p>
                      )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {images.map((img, i) => (
                        <div
                          key={img}
                          draggable
                          onDragStart={() => handleDragStart(i)}
                          onDragOver={e => handleDragOver(e, i)}
                          onDrop={e => handleDrop(e, i)}
                          onDragEnd={handleDragEnd}
                          className={`relative aspect-square bg-gray-100 rounded-lg overflow-hidden group cursor-grab active:cursor-grabbing transition-all ${dragOverIndex === i && dragSrcRef.current !== i ? "ring-2 ring-primary scale-105" : ""}`}
                        >
                          <img src={getImageDisplayUrl(img)} alt={`Photo ${i + 1}`} className="w-full h-full object-cover pointer-events-none" />
                          {i === 0 && (
                            <span className="absolute bottom-1 left-1 bg-primary text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">Cover</span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-md"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          {images.length > 1 && (
                            <div className="absolute bottom-1 right-1 flex gap-0.5">
                              {i > 0 && (
                                <button
                                  type="button"
                                  onClick={() => moveImage(i, -1)}
                                  className="bg-black/60 text-white rounded px-1 py-0.5 text-[10px] font-bold leading-none hover:bg-black/80"
                                  title="Move left"
                                >←</button>
                              )}
                              {i < images.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => moveImage(i, 1)}
                                  className="bg-black/60 text-white rounded px-1 py-0.5 text-[10px] font-bold leading-none hover:bg-black/80"
                                  title="Move right"
                                >→</button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {Array.from({ length: uploadingCount }).map((_, i) => (
                        <div key={`uploading-${i}`} className="relative aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="sr-only">Uploading…</span>
                        </div>
                      ))}
                    </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 opacity-50">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Videos */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle>Property Videos</CardTitle>
                      <CardDescription>
                        {videoLimit === 0
                          ? "Video upload is included with Pro (1 video) and Enterprise (5 videos)"
                          : `Upload up to ${videoLimit} video${videoLimit === 1 ? "" : "s"}, max 5 minutes each`}
                      </CardDescription>
                      {pendingVideoPaths.size > 0 && (
                        <p className="mt-1 text-xs font-medium text-amber-700">Each newly selected video must be trimmed and applied before submission.</p>
                      )}
                    </div>
                    {videoLimit === 0 && (
                      <a href="/#/pricing" className="text-xs text-primary underline underline-offset-2 shrink-0 mt-1">Upgrade plan</a>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {videoLimit === 0 ? (
                    <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Free and Basic packages do not include property videos. Upgrade to Pro for 1 video or Enterprise for up to 5 videos per listing.
                    </div>
                  ) : (
                    <>
                      {videos.length < videoLimit && (
                        <div
                          className={`relative border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 ${uploadingVideoCount > 0 ? "opacity-50 pointer-events-none" : ""}`}
                        >
                          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary pointer-events-none">
                            <Video className="h-5 w-5" />
                          </div>
                          <h3 className="font-semibold text-sm pointer-events-none">Upload Video</h3>
                          <p className="text-xs text-muted-foreground pointer-events-none">{videos.length}/{videoLimit} used · max 5 minutes</p>
                          <input
                            type="file"
                            accept="video/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            ref={videoInputRef}
                            onChange={handleVideoUpload}
                          />
                        </div>
                      )}

                      {(videos.length > 0 || uploadingVideoCount > 0) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                          {videos.map((url, i) => (
                            <div key={url} className="relative rounded-lg overflow-hidden bg-black group">
                              <video
                                src={url.startsWith("/objects/") ? `/api/storage${url}` : url}
                                className="w-full aspect-video object-cover"
                                controls
                                preload="metadata"
                                playsInline
                              />
                              {/* Remove — always visible on mobile, hover-revealed on desktop */}
                              <button
                                type="button"
                                onClick={() => removeVideo(i)}
                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full transition-opacity sm:opacity-0 sm:group-hover:opacity-100 shadow"
                                title="Remove video"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                              {/* Edit — always visible on mobile, hover-revealed on desktop */}
                              <button
                                type="button"
                                onClick={() => openVideoEditor(i)}
                                className="absolute top-2 right-10 bg-gray-900/80 hover:bg-gray-900 text-white p-1.5 rounded-full transition-opacity sm:opacity-0 sm:group-hover:opacity-100 shadow"
                                title="Edit video (trim, crop, caption)"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">Video {i + 1}</span>
                               {pendingVideoPaths.has(url) && (
                                 <span className="absolute bottom-2 right-2 bg-amber-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">Trim required</span>
                               )}
                            </div>
                          ))}
                          {Array.from({ length: uploadingVideoCount }).map((_, i) => (
                            <div key={`uploading-video-${i}`} className="relative aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              <span className="sr-only">Uploading…</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {fieldErrors.videos?.map(error => <p key={error} className="mt-3 text-sm text-destructive">{error}</p>)}
                </CardContent>
              </Card>

              {/* Video Edit Modal */}
              {editingVideoIdx !== null && editingVideoSrc && (
                <VideoEditModal
                  videoSrc={editingVideoSrc}
                  onSave={handleVideoEditSave}
                  onClose={() => { setEditingVideoIdx(null); setEditingVideoSrc(""); }}
                />
              )}

              <div className="flex gap-4 justify-end">
                {/* Save Draft — new listings only */}
                {!isEditing && (
                  <Button variant="outline" type="button" onClick={saveDraft} disabled={isDraftSyncing} className="gap-2">
                    {isDraftSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isDraftSyncing ? "Syncing…" : "Save Draft"}
                  </Button>
                )}
                <Button variant="outline" type="button" onClick={() => setLocation("/dashboard")}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary" disabled={isSubmitting || uploadingCount > 0 || uploadingVideoCount > 0 || pendingVideoPaths.size > 0}>
                  {uploadingCount > 0 || uploadingVideoCount > 0 ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Uploading media…</span>
                  ) : isSubmitting ? (
                    isEditing ? "Updating..." : "Submitting..."
                  ) : (
                    isEditing ? "Update Property" : <span className="flex items-center gap-2"><Check className="h-4 w-4" /> Submit for Approval</span>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
        <DialogContent
          className="sm:max-w-[600px] p-0 overflow-hidden"
          onInteractOutside={(e) => {
            // Prevent Radix from treating clicks on Google autocomplete dropdown as "outside" the dialog
            const target = e.target as Element | null;
            if (target?.closest?.(".pac-container")) e.preventDefault();
          }}
        >
          <DialogHeader className="p-4 bg-white border-b">
            <DialogTitle>Pin Property Location</DialogTitle>
            <DialogDescription>
              Click the map to drop a pin. Drag the pin to fine-tune the position.
            </DialogDescription>
          </DialogHeader>
          <div className="relative h-[400px] w-full overflow-hidden">
            {mapsLoaded ? (
              <>
                <Autocomplete
                  onLoad={(ref) => { autocompleteRef.current = ref; }}
                  onPlaceChanged={handlePlaceChanged}
                  options={{ componentRestrictions: { country: "ke" } }}
                >
                  <div className="absolute top-3 left-3 right-3 z-10">
                    <div className="relative">
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search for a neighbourhood or address…"
                        className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
                        onKeyDown={handleSearchKeyDown}
                      />
                      <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                    {(isResolvingLocation || locationSearchError) && (
                      <p className={`mt-1 rounded px-2 py-1 text-xs shadow ${locationSearchError ? "bg-red-50 text-red-700" : "bg-white text-gray-600"}`}>
                      {isResolvingLocation ? "Finding the address… your coordinates are already saved." : locationSearchError}
                      </p>
                    )}
                  </div>
                </Autocomplete>
                <GoogleMap
                  mapContainerClassName="w-full h-full"
                  center={mapCenter}
                  zoom={14}
                  options={{ mapId: "c7cd60c6a53a720a14502d1b", mapTypeControl: false, streetViewControl: false, fullscreenControl: false }}
                  onLoad={(map) => { mapRef.current = map; }}
                  onClick={(e) => {
                    if (e.latLng) {
                      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                      reverseGeocodeDraft(pos);
                    }
                  }}
                >
                  {draftPin && (
                    <AdvancedMarker
                      position={draftPin}
                      draggable
                      onDragEnd={(e) => {
                        if (e.latLng) {
                          const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                          reverseGeocodeDraft(pos);
                        }
                      }}
                    />
                  )}
                </GoogleMap>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            )}
            {draftPin && draftAddress && (
              <div className="absolute bottom-4 left-4 right-4 z-30 bg-white rounded-md shadow-lg px-3 py-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm text-gray-700 truncate">{draftAddress}</span>
              </div>
            )}
            {!draftPin && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none text-center">
                <div className="bg-white/90 rounded-lg shadow px-4 py-2 text-sm text-gray-600">
                  Click anywhere on the map to pin your property
                </div>
              </div>
            )}
          </div>
          <div className="p-4 bg-white border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsMapModalOpen(false)}>Cancel</Button>
            <Button
              className="bg-primary"
              disabled={!draftPin}
              onClick={() => {
                if (!draftPin) return;
                applyResolvedLocation(draftPin, draftAddress);
                setIsMapModalOpen(false);
                toast({
                  title: "Location Saved",
                  description: "Your property location has been pinned.",
                });
              }}
            >
              Confirm Location
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
