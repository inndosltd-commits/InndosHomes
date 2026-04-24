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
import { Upload, Image as ImageIcon, Check, Camera, X, MapPin } from "lucide-react";
import { useState, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";

const AMENITIES = [
  "WiFi", "Parking", "Swimming Pool", "Gym", "24/7 Security", 
  "Backup Generator", "Borehole Water", "Elevator", "Balcony", 
  "Garden", "Pet Friendly", "Furnished", "CCTV", "Electric Fence",
  "DSQ", "Laundry Area", "Solar Water Heating"
];

export default function AddListing() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isLocationPinned, setIsLocationPinned] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("Nairobi, Kenya");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Check if we are editing an existing listing
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Handle both standard query params and hash-based query params
  const getQueryParam = (param: string) => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has(param)) return searchParams.get(param);
    
    // Check hash for params if using hash routing
    const hashParts = window.location.hash.split('?');
    if (hashParts.length > 1) {
      const hashParams = new URLSearchParams(hashParts[1]);
      return hashParams.get(param);
    }
    return null;
  };

  useState(() => {
    const editParam = getQueryParam("edit");
    if (editParam) {
      setIsEditing(true);
      setEditId(editParam);
      // In a real app we'd fetch the existing data here
      // For mockup, we just set some dummy data if editing
      setTimeout(() => {
        const titleEl = document.getElementById('title') as HTMLInputElement;
        if (titleEl) titleEl.value = "Edited Listing Title";
        const descEl = document.getElementById('description') as HTMLTextAreaElement;
        if (descEl) descEl.value = "This is an edited property description.";
        setSearchQuery("Kilimani, Nairobi");
      }, 100);
    }
  });

  const handleCameraClick = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
      toast({
        title: "Camera Access",
        description: "On mobile devices, this opens the camera. On desktop, it opens the file browser.",
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // In a real app, this would upload to storage (S3, Cloudinary, etc.)
    // For the mockup, we create local object URLs to preview
    const newImages = Array.from(files).map(file => URL.createObjectURL(file));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      const title = (document.getElementById('title') as HTMLInputElement)?.value || "New Property";
      const newListing = {
        id: Date.now(),
        title: title,
        type: "Listing",
        submittedBy: "Owner", 
        time: "Just now",
        image: images[0] || "/images/modern_apartment_exterior.png"
      };
      
      const saved = localStorage.getItem('pendingListings');
      let existing = saved ? JSON.parse(saved) : [
        { id: 4, title: "Cozy Cottage in Karen", type: "B&B", submittedBy: "Mama Safi", time: "Just now", image: "/images/cozy_modern_bedroom_interior.png" },
        { id: 5, title: "Modern Apartment in Westlands", type: "Rent", submittedBy: "John Landlord", time: "1h ago", image: "/images/modern_apartment_exterior.png" }
      ];
      
      localStorage.setItem('pendingListings', JSON.stringify([newListing, ...existing]));

      setIsSubmitting(false);
      toast({
        title: "Listing Submitted Successfully",
        description: "Your property is now pending review by our moderation team.",
      });
      setLocation("/dashboard");
    }, 1500);
  };

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
                    <Input id="title" placeholder="e.g. Modern Apartment in Westlands" required />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Listing Type</Label>
                      <Select required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rent">For Rent</SelectItem>
                          <SelectItem value="sale">For Sale</SelectItem>
                          <SelectItem value="bnb">B&B / Short Stay</SelectItem>
                          <SelectItem value="hotel">Hotel</SelectItem>
                          <SelectItem value="hostel">Hostel (Student Rentals)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (KES)</Label>
                      <Input id="price" type="number" placeholder="e.g. 85000" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment_term">Payment Term (For Hostels/Rentals)</Label>
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
                    <p className="text-xs text-muted-foreground">Select the required payment term so students/tenants know as they book.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Full Address</Label>
                    <Input id="address" placeholder="e.g. 123 Peponi Road, Westlands, Nairobi" required />
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
                      <Input id="beds" type="number" min="0" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="baths">Bathrooms</Label>
                      <Input id="baths" type="number" min="0" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sqft">Square Ft</Label>
                      <Input id="sqft" type="number" min="0" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="mb-2 block">Amenities</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {AMENITIES.map((item) => (
                        <div key={item} className="flex items-center space-x-2">
                          <Checkbox id={`amenity-${item}`} />
                          <label
                            htmlFor={`amenity-${item}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {item}
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
                  
                  {images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {images.map((img, i) => (
                        <div key={i} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                          <img src={img} alt={`Upload ${i}`} className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
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
                <Button type="submit" className="bg-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
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