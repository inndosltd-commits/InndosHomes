import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Upload, Image as ImageIcon, Check } from "lucide-react";
import { useState } from "react";

export default function AddListing() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
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
            <h1 className="text-3xl font-bold font-heading">Add New Listing</h1>
            <p className="text-muted-foreground">Fill in the details below to publish your property.</p>
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
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (KES)</Label>
                      <Input id="price" type="number" placeholder="e.g. 85000" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Full Address</Label>
                    <Input id="address" placeholder="e.g. 123 Peponi Road, Westlands, Nairobi" required />
                  </div>
                </CardContent>
              </Card>

              {/* Specs */}
              <Card>
                <CardHeader>
                  <CardTitle>Features & Amenities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                  <CardDescription>Upload high quality images of your property</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <Upload className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold">Click to upload photos</h3>
                      <p className="text-sm text-muted-foreground">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4 justify-end">
                <Button variant="outline" type="button" onClick={() => setLocation("/dashboard")}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    "Submitting..."
                  ) : (
                    <span className="flex items-center gap-2">
                      <Check className="h-4 w-4" /> Submit Listing
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
