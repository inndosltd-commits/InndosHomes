import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Upload, Image as ImageIcon, Check, ChevronRight, ChevronLeft, Home, MapPin, List, Camera } from "lucide-react";
import { useState } from "react";
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

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const nextStep = () => setStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = () => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Space Listed Successfully",
        description: "Your B&B space is now live and ready for guests!",
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
                     <Button variant="outline" size="icon">-</Button>
                     <span className="font-bold text-lg w-8 text-center">2</span>
                     <Button variant="outline" size="icon">+</Button>
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
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                        <Upload className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold">Upload at least 5 photos</h3>
                      <p className="text-sm text-muted-foreground">Show off your space!</p>
                    </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price per night (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                    <Input id="price" type="number" className="pl-8 text-lg font-bold" placeholder="50" />
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
    </div>
  );
}
