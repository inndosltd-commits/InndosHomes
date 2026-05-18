import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Upload, Image as ImageIcon, Check, Camera, X, MapPin, Loader2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import { useUpload } from "@workspace/object-storage-web";

function getImageDisplayUrl(objectPath: string): string {
  if (objectPath.startsWith("/objects/")) {
    return `/api/storage${objectPath}`;
  }
  if (objectPath.startsWith("http")) {
    return objectPath;
  }
  return `/api${objectPath}`;
}

const UNIT_AMENITIES = [
  { id: "instant_shower", label: "Instant shower" },
  { id: "study_desk", label: "Study desk" },
  { id: "safe", label: "Safe" },
  { id: "babycot", label: "Baby court" },
  { id: "housekeeping", label: "Daily housekeeping" },
  { id: "private_chef", label: "Private chef (additional)" },
  { id: "hairdryer", label: "Hair dryer" },
  { id: "ironbox", label: "Iron box" },
  { id: "wifi", label: "WiFi" },
  { id: "laundry", label: "Laundry area" },
  { id: "balcony", label: "Balcony" },
  { id: "ac", label: "Air conditioner" },
  { id: "smoker_alert", label: "Smoker alerts" },
  { id: "fridge", label: "Fridge" },
  { id: "microwave", label: "Microwave" },
  { id: "dishwasher", label: "Dishwasher" },
  { id: "coffee", label: "Coffee maker/kettle" },
  { id: "smart_tv", label: "Smart TV" },
  { id: "smoking_allowed", label: "Smoking allowed" },
  { id: "no_smoking", label: "Smoking not allowed" },
  { id: "self_locking", label: "Self locking/keylocker" }
];

const PREMISE_AMENITIES = [
  { id: "gym", label: "Gym" },
  { id: "borewater", label: "Borehole water" },
  { id: "garden", label: "Garden" },
  { id: "cctv", label: "CCTV" },
  { id: "parking", label: "Parking" },
  { id: "security", label: "24/7 security" },
  { id: "elevator", label: "Elevator" },
  { id: "electric_fence", label: "Electric fence" },
  { id: "solar", label: "Solar water heating" },
  { id: "pool", label: "Swimming pool" },
  { id: "smoking_area", label: "Smoking area" },
  { id: "generator", label: "Backup generator" },
  { id: "pet_friendly", label: "Pet friendly" },
  { id: "dsq", label: "DSQ" }
];

type ApiPropertyType = "rent" | "sale" | "bnb" | "hotel" | "hostel";

function toApiType(raw: string): ApiPropertyType {
  if (raw === "sale") return "sale";
  if (raw === "bnb") return "bnb";
  if (raw === "hotel") return "hotel";
  if (raw === "hostel") return "hostel";
  return "rent";
}

function getEditId(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has("edit")) return searchParams.get("edit");
  const hashParts = window.location.hash.split("?");
  if (hashParts.length > 1) {
    const hp = new URLSearchParams(hashParts[1]);
    if (hp.has("edit")) return hp.get("edit");
  }
  return null;
}

export default function AddListing() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProperty, setIsLoadingProperty] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [images, setImages] = useState<string[]>([]);
  const [isLocationPinned, setIsLocationPinned] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("Nairobi, Kenya");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile } = useUpload({
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  // Controlled state for Select fields
  const [listingType, setListingType] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [subtype, setSubtype] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");

  const toggleAmenity = (id: string) => {
    setSelectedAmenities(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const editId = getEditId();
  const isEditing = editId !== null;

  // Fetch existing property data when in edit mode
  useEffect(() => {
    if (!editId || !token) return;
    setIsLoadingProperty(true);
    fetch(`/api/properties/${editId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Property not found");
        return res.json();
      })
      .then((prop: { title: string; type: string; price: number; address: string; beds: number; baths: number; sqft: number; image?: string; images?: string[]; description?: string; tags?: string[]; subtype?: string; hourlyRate?: number }) => {
        setTitle(prop.title ?? "");
        setListingType(prop.type ?? "");
        setPrice(prop.price != null ? String(prop.price) : "");
        setAddress(prop.address ?? "");
        setBeds(prop.beds != null ? String(prop.beds) : "");
        setBaths(prop.baths != null ? String(prop.baths) : "");
        setSqft(prop.sqft != null ? String(prop.sqft) : "");
        setDescription(prop.description ?? "");
        if (prop.images && prop.images.length > 0) {
          setImages(prop.images);
        } else if (prop.image) {
          setImages([prop.image]);
        }
        if (prop.tags) setSelectedAmenities(prop.tags);
        if (prop.subtype) setSubtype(prop.subtype);
        if (prop.hourlyRate != null) setHourlyRate(String(prop.hourlyRate));
      })
      .catch(() => {
        toast({ title: "Could not load property", description: "The property could not be fetched for editing.", variant: "destructive" });
      })
      .finally(() => setIsLoadingProperty(false));
  }, [editId, token]);

  const handleCameraClick = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
      toast({
        title: "Camera Access",
        description: "On mobile devices, this opens the camera. On desktop, it opens the file browser.",
      });
    }
  };

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    e.target.value = "";

    const fileArray = Array.from(files);
    setUploadingCount(prev => prev + fileArray.length);

    const results = await Promise.all(
      fileArray.map(async (file) => {
        const result = await uploadFile(file);
        return result?.objectPath ?? null;
      })
    );

    const uploaded = (results as (string | null)[]).filter((p): p is string => p !== null);
    if (uploaded.length < fileArray.length) {
      toast({ title: "Some uploads failed", description: "One or more photos could not be uploaded.", variant: "destructive" });
    }
    if (uploaded.length > 0) {
      setImages(prev => [...prev, ...uploaded]);
    }
    setUploadingCount(prev => prev - fileArray.length);
  }, [uploadFile, toast]);

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({ title: "Sign in required", description: "Please sign in to add a listing.", variant: "destructive" });
      return;
    }
    if (!listingType) {
      toast({ title: "Missing field", description: "Please select a listing type.", variant: "destructive" });
      return;
    }
    if (uploadingCount > 0) {
      toast({ title: "Upload in progress", description: "Please wait for all photos to finish uploading.", variant: "destructive" });
      return;
    }

    const parsedPrice = parseInt(price, 10);
    const parsedBeds = parseInt(beds, 10);
    const parsedBaths = parseInt(baths, 10);
    const parsedSqft = parseInt(sqft, 10);

    const clientErrors: Record<string, string[]> = {};
    if (!title.trim()) clientErrors.title = ["Title is required"];
    if (isNaN(parsedPrice) || parsedPrice <= 0) clientErrors.price = ["Price must be greater than 0"];
    if (!address.trim() && !searchQuery.trim()) clientErrors.address = ["Address is required"];
    if (!isNaN(parsedBeds) && parsedBeds < 0) clientErrors.beds = ["Bedrooms cannot be negative"];
    if (!isNaN(parsedBaths) && parsedBaths < 0) clientErrors.baths = ["Bathrooms cannot be negative"];

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      toast({ title: "Please fix the errors below", variant: "destructive" });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const body = {
        title,
        type: toApiType(listingType),
        price: parsedPrice,
        address: address || searchQuery,
        beds: isNaN(parsedBeds) ? 0 : parsedBeds,
        baths: isNaN(parsedBaths) ? 0 : parsedBaths,
        sqft: isNaN(parsedSqft) ? 0 : parsedSqft,
        description: description || null,
        images,
        tags: selectedAmenities,
        subtype: subtype || undefined,
        hourlyRate: (listingType === "bnb" && hourlyRate) ? parseInt(hourlyRate, 10) : undefined,
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
          setFieldErrors(data.details.fieldErrors);
          toast({
            title: isEditing ? "Update failed" : "Submission failed",
            description: "Please fix the highlighted errors below.",
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

  if (isLoadingProperty) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <p className="text-muted-foreground">Loading property details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-heading">{isEditing ? "Edit Listing" : "Add New Listing"}</h1>
            <p className="text-muted-foreground">{isEditing ? "Update your property details below." : "Fill in the details below to publish your property. Admin approval is required before the listing goes live."}</p>
          </div>

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
                      <Select value={listingType} onValueChange={setListingType} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rent">For Rent</SelectItem>
                          <SelectItem value="rent-business">For Rent - Business Space</SelectItem>
                          <SelectItem value="rent-godown">For Rent - Godown</SelectItem>
                          <SelectItem value="rent-stall">For Rent - Stall</SelectItem>
                          <SelectItem value="rent-shop">For Rent - Shop</SelectItem>
                          <SelectItem value="sale">For Sale</SelectItem>
                          <SelectItem value="bnb">B&B / Short Stay</SelectItem>
                          <SelectItem value="hotel">Hotel</SelectItem>
                          <SelectItem value="hostel">Hostel (Student Rentals)</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <SelectTrigger>
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
                    <p className="text-xs text-muted-foreground">Helps guests find your property under the right category.</p>
                  </div>
                  )}

                  {listingType === 'sale' && (
                  <div className="space-y-2">
                    <Label htmlFor="subtype">Property Category</Label>
                    <Select value={subtype} onValueChange={setSubtype}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="home">Home / House</SelectItem>
                        <SelectItem value="land">Land</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Helps buyers filter by property category.</p>
                  </div>
                  )}

                  {/* BnB Type selector */}
                  {listingType === 'bnb' && (
                  <div className="space-y-3">
                    <Label htmlFor="bnb_subtype">B&B Property Type</Label>
                    <Select value={subtype} onValueChange={setSubtype}>
                      <SelectTrigger>
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
                    <p className="text-xs text-muted-foreground">Helps guests understand what kind of stay they are booking.</p>
                  </div>
                  )}

                  {/* BnB Pricing — daily (existing price) + optional hourly rate */}
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
                    <Label htmlFor="payment_term">Payment Term</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment term" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Per Month</SelectItem>
                        <SelectItem value="quarterly">For 3 Months (Quarterly)</SelectItem>
                        <SelectItem value="yearly">Per Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Select the required payment term so students know when they book.</p>
                  </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="address">Full Address</Label>
                    <Input id="address" placeholder="e.g. 123 Peponi Road, Westlands, Nairobi" value={address} onChange={e => { setAddress(e.target.value); setFieldErrors(prev => ({ ...prev, address: [] })); }} required className={fieldErrors.address?.length ? "border-red-500" : ""} />
                    {fieldErrors.address?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                  </div>

                  <div className="space-y-2">
                    <Label>Map Location (Pin)</Label>
                    <div className="text-sm text-gray-500 mb-2">Set the exact location of your property on the map. This helps guests find your property easily.</div>
                    <div 
                      className={`bg-gray-100 rounded-lg h-[200px] border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-colors ${isLocationPinned ? 'border-green-500' : 'border-gray-200'}`}
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
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="beds">Bedrooms</Label>
                      <Input id="beds" type="number" min="0" value={beds} onChange={e => { setBeds(e.target.value); setFieldErrors(prev => ({ ...prev, beds: [] })); }} required className={fieldErrors.beds?.length ? "border-red-500" : ""} />
                      {fieldErrors.beds?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="baths">Bathrooms</Label>
                      <Input id="baths" type="number" min="0" value={baths} onChange={e => { setBaths(e.target.value); setFieldErrors(prev => ({ ...prev, baths: [] })); }} required className={fieldErrors.baths?.length ? "border-red-500" : ""} />
                      {fieldErrors.baths?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sqft">Square Ft</Label>
                      <Input id="sqft" type="number" min="0" value={sqft} onChange={e => { setSqft(e.target.value); setFieldErrors(prev => ({ ...prev, sqft: [] })); }} className={fieldErrors.sqft?.length ? "border-red-500" : ""} />
                      {fieldErrors.sqft?.map(err => <p key={err} className="text-xs text-red-500">{err}</p>)}
                    </div>
                  </div>
                  
                  {/* Unit Amenities */}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-semibold">Unit Amenities</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Features inside the individual unit/room</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg border">
                      {UNIT_AMENITIES.map((item) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`amenity-${item.id}`}
                            checked={selectedAmenities.includes(item.id)}
                            onCheckedChange={() => toggleAmenity(item.id)}
                          />
                          <label
                            htmlFor={`amenity-${item.id}`}
                            className="text-sm leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {item.label}
                          </label>
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
                      {PREMISE_AMENITIES.map((item) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`amenity-${item.id}`}
                            checked={selectedAmenities.includes(item.id)}
                            onCheckedChange={() => toggleAmenity(item.id)}
                          />
                          <label
                            htmlFor={`amenity-${item.id}`}
                            className="text-sm leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {item.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Describe the property features, neighborhood, etc." 
                      className="min-h-[150px]"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      required 
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Photos */}
              <Card>
                <CardHeader>
                  <CardTitle>Photos</CardTitle>
                  <CardDescription>Upload or take high quality images of your property</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-4">
                    <div 
                      className="flex-1 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <Upload className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-sm">Upload Photos</h3>
                      <p className="text-xs text-muted-foreground">Browse files</p>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                      />
                    </div>

                    <div 
                      className="flex-1 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2"
                      onClick={handleCameraClick}
                    >
                      <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                        <Camera className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-sm">Take Photo</h3>
                      <p className="text-xs text-muted-foreground">Use camera</p>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        className="hidden" 
                        ref={cameraInputRef}
                        onChange={handleImageUpload}
                      />
                    </div>
                  </div>
                  
                  {(images.length > 0 || uploadingCount > 0) ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {images.map((img, i) => (
                        <div key={img} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                          <img src={getImageDisplayUrl(img)} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                          {i === 0 && (
                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">Cover</span>
                          )}
                          <button 
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {Array.from({ length: uploadingCount }).map((_, i) => (
                        <div key={`uploading-${i}`} className="relative aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="sr-only">Uploading…</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 opacity-50">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-4 justify-end">
                <Button variant="outline" type="button" onClick={() => setLocation("/dashboard")}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary" disabled={isSubmitting || uploadingCount > 0}>
                  {uploadingCount > 0 ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Uploading photos…</span>
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
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
          <DialogHeader className="p-4 bg-white border-b">
            <DialogTitle>Pin Property Location</DialogTitle>
            <DialogDescription>
              Drag the map to pinpoint the exact location of your property.
            </DialogDescription>
          </DialogHeader>
          <div className="relative h-[400px] w-full bg-[#e5e3df] overflow-hidden">
            {/* Real Interactive Map Iframe */}
            <iframe 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              loading="lazy" 
              allowFullScreen 
              src={`https://maps.google.com/maps?q=${encodeURIComponent(searchQuery || 'Nairobi, Kenya')}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
              className="absolute inset-0 z-0"
            ></iframe>
            
            {/* Search Input - Must be above map */}
            <div className="absolute top-4 left-4 right-4 z-30">
              <div className="relative shadow-lg rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <Input 
                  placeholder="Search for area or street..." 
                  className="bg-white border-0 relative z-50 h-12 pl-10 text-base" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  autoComplete="off"
                  name="location-search"
                  spellCheck="false"
                />
              </div>
            </div>
          </div>
          <div className="p-4 bg-white border-t flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsMapModalOpen(false)}>Cancel</Button>
            <Button 
              className="bg-primary" 
              onClick={() => {
                setIsLocationPinned(true);
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