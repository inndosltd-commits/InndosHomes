import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Upload, Image as ImageIcon, Check, ChevronRight, ChevronLeft, Home, MapPin, List, Camera, X } from "lucide-react";
import { useState, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

const BNB_AMENITIES = [
  "WiFi", "Breakfast", "Air Conditioning", "Kitchen", "Work Space", 
  "TV", "Iron", "Hair Dryer", "Pool", "Gym", "Hot Tub", 
  "Free Parking", "EV Charger", "Crib", "BBQ Grill"
];

const BNB_TYPES = [
  "Entire place", "Private room", "Shared room", "Hotel room"
];

export default function AddBNB() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isLocationPinned, setIsLocationPinned] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [guestCapacity, setGuestCapacity] = useState(2);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const incrementGuests = () => setGuestCapacity(prev => prev + 1);
  const decrementGuests = () => setGuestCapacity(prev => Math.max(1, prev - 1));

  const handleCameraClick = () => {
    // In a real mobile app/PWA, this would open the native camera.
    // In a desktop browser or iframe, we fallback to the file picker or show a toast.
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

    // For the mockup, we create local object URLs to preview
    const newImages = Array.from(files).map(file => URL.createObjectURL(file));
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      const title = (document.getElementById('title') as HTMLInputElement)?.value || "New B&B Space";
      const newListing = {
        id: Date.now(),
        title: title,
        type: "B&B",
        submittedBy: "Host", 
        time: "Just now",
        image: images[0] || "/images/cozy_modern_bedroom_interior.png"
      };
      
      const saved = localStorage.getItem('pendingListings');
      let existing = saved ? JSON.parse(saved) : [
        { id: 4, title: "Cozy Cottage in Karen", type: "B&B", submittedBy: "Mama Safi", time: "Just now", image: "/images/cozy_modern_bedroom_interior.png" },
        { id: 5, title: "Modern Apartment in Westlands", type: "Rent", submittedBy: "John Landlord", time: "1h ago", image: "/images/modern_apartment_exterior.png" }
      ];
      
      localStorage.setItem('pendingListings', JSON.stringify([newListing, ...existing]));

      setIsSubmitting(false);
      toast({
        title: "Space Listed Successfully",
        description: "Your B&B space is now pending review by our moderation team.",
      });
      setLocation("/dashboard");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold font-heading">List Your Space</h1>
              <p className="text-muted-foreground">Become a host in a few easy steps.</p>
            </div>
            <div className="text-right">
               <span className="font-bold text-2xl text-primary">Step {step}/{totalSteps}</span>
            </div>
          </div>
          
          <Progress value={progress} className="mb-8" />

          {/* Step 1: Basics */}
          {step === 1 && (
            <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                  <Home className="h-6 w-6" />
                </div>
                <CardTitle>What kind of place will you host?</CardTitle>
                <CardDescription>Let guests know what to expect.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {BNB_TYPES.map((type) => (
                    <div key={type} className="border rounded-lg p-4 hover:border-primary cursor-pointer hover:bg-primary/5 transition-all">
                      <h3 className="font-bold mb-1">{type}</h3>
                      <p className="text-xs text-muted-foreground">Guests have the whole place to themselves.</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                   <Label>Guest Capacity</Label>
                   <div className="flex items-center gap-4">
                     <Button variant="outline" size="icon" onClick={decrementGuests}>-</Button>
                     <span className="font-bold text-lg w-8 text-center">{guestCapacity}</span>
                     <Button variant="outline" size="icon" onClick={incrementGuests}>+</Button>
                   </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={nextStep}>Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
              </CardFooter>
            </Card>
          )}

          {/* Step 2: Location & Description */}
          {step === 2 && (
            <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                  <MapPin className="h-6 w-6" />
                </div>
                <CardTitle>Where's your place located?</CardTitle>
                <CardDescription>Help guests find your listing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Listing Title</Label>
                  <Input id="title" placeholder="e.g. Cozy Cottage in Karen" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" placeholder="e.g. 123 Langata Road" />
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
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" placeholder="Tell guests what makes your place special..." className="min-h-[120px]" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={prevStep}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button onClick={nextStep}>Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
              </CardFooter>
            </Card>
          )}

          {/* Step 3: Amenities */}
          {step === 3 && (
            <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                  <List className="h-6 w-6" />
                </div>
                <CardTitle>What does your place offer?</CardTitle>
                <CardDescription>Select all the amenities available.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                   {BNB_AMENITIES.map((amenity) => (
                     <div key={amenity} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50">
                       <Checkbox id={`amenity-${amenity}`} />
                       <label htmlFor={`amenity-${amenity}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                         {amenity}
                       </label>
                     </div>
                   ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={prevStep}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button onClick={nextStep}>Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
              </CardFooter>
            </Card>
          )}

          {/* Step 4: Photos & Price */}
          {step === 4 && (
            <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                  <Camera className="h-6 w-6" />
                </div>
                <CardTitle>Finish up and publish</CardTitle>
                <CardDescription>Add photos and set your price.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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

                <div className="space-y-2">
                  <Label htmlFor="price">Price per night (KES)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">Ksh</span>
                    <Input id="price" type="number" className="pl-12 text-lg font-bold" placeholder="6500" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={prevStep}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary text-white">
                  {isSubmitting ? "Publishing..." : "Publish Listing"}
                </Button>
              </CardFooter>
            </Card>
          )}

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
          <div className="relative h-[400px] w-full bg-blue-50">
            {/* Mock interactive map */}
            <div className="absolute inset-0 opacity-50 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=-1.2921,36.8219&zoom=13&size=600x400&sensor=false')] bg-cover bg-center"></div>
            
            {/* Draggable pin mockup */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="relative">
                 <MapPin className="h-10 w-10 text-primary -mt-10" />
                 <div className="absolute bottom-0 left-1/2 w-3 h-1 bg-black/20 rounded-[100%] blur-[1px] -translate-x-1/2"></div>
               </div>
            </div>
            
            <div className="absolute top-4 left-4 right-4 z-10">
              <Input placeholder="Search for area or street..." className="bg-white shadow-md border-0" />
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