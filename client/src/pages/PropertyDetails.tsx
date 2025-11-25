import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BedDouble, Bath, Square, MapPin, Share2, Heart, CheckCircle, Calendar, Phone, Mail, MessageSquare, PhoneCall, MessageCircle, Copy } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { PROPERTIES, OWNERS } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function PropertyDetails() {
  const [, params] = useRoute("/property/:id");
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  
  // Handle the duplicate IDs from the list for demo purposes by stripping suffix
  const id = params?.id?.replace('-dup', ''); 
  const property = PROPERTIES.find(p => p.id === id) || PROPERTIES[0];
  
  // Find owner details
  const owner = OWNERS.find(o => o.id === property.ownerId) || OWNERS[0];

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied",
      description: "Property link copied to clipboard.",
    });
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    toast({
      title: isLiked ? "Removed from Favorites" : "Added to Favorites",
      description: isLiked ? "Property removed from your saved list." : "Property saved to your favorites.",
    });
  };

  const handleRequestTour = () => {
    toast({
      title: "Tour Requested",
      description: `Request sent to ${owner.name}. They will contact you shortly.`,
    });
  };

  const handleSendMessage = () => {
    toast({
      title: "Message Sent",
      description: "Your message has been delivered to the owner.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      {/* Image Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 h-[400px] md:h-[500px] gap-1">
        <div className="h-full bg-gray-200">
           <img src={property.image} className="w-full h-full object-cover hover:brightness-110 transition-all cursor-pointer" />
        </div>
        <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full">
           <div className="bg-gray-200"><img src="/images/cozy_modern_bedroom_interior.png" className="w-full h-full object-cover hover:brightness-110 transition-all cursor-pointer"/></div>
           <div className="bg-gray-200"><img src="/images/modern_apartment_exterior.png" className="w-full h-full object-cover hover:brightness-110 transition-all cursor-pointer"/></div>
           <div className="bg-gray-200"><img src="/images/modern_happy_family_moving_into_new_home.png" className="w-full h-full object-cover hover:brightness-110 transition-all cursor-pointer"/></div>
           <div className="bg-gray-200 relative">
             <img src={property.image} className="w-full h-full object-cover hover:brightness-110 transition-all cursor-pointer"/>
             <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold cursor-pointer hover:bg-black/50 transition-colors">
                View All Photos
             </div>
           </div>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Content */}
          <div className="flex-1">
             <div className="flex justify-between items-start mb-4">
               <div>
                 <div className="flex items-center gap-2 mb-2">
                   <Badge className={property.type === 'rent' ? 'bg-primary' : 'bg-secondary'}>
                     For {property.type === 'rent' ? 'Rent' : 'Sale'}
                   </Badge>
                   {property.isVerified && (
                     <Badge variant="outline" className="border-green-600 text-green-600 flex items-center gap-1">
                       <CheckCircle className="h-3 w-3" /> Verified
                     </Badge>
                   )}
                 </div>
                 <h1 className="text-3xl font-bold font-heading text-gray-900 mb-2">{property.title}</h1>
                 <div className="flex items-center text-muted-foreground">
                   <MapPin className="h-4 w-4 mr-1" />
                   {property.address}
                 </div>
               </div>
               <div className="text-right">
                 <div className="text-3xl font-bold text-primary">
                   ${property.price.toLocaleString()}
                   {property.type === 'rent' && <span className="text-lg text-gray-500 font-normal">/mo</span>}
                 </div>
               </div>
             </div>

             <div className="flex items-center justify-between py-6 border-y border-gray-200 mb-8">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="font-bold text-xl flex items-center justify-center gap-2"><BedDouble className="h-5 w-5 text-gray-400"/> {property.specs.beds}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Bedrooms</div>
                  </div>
                  <div className="w-px h-10 bg-gray-200"></div>
                  <div className="text-center">
                    <div className="font-bold text-xl flex items-center justify-center gap-2"><Bath className="h-5 w-5 text-gray-400"/> {property.specs.baths}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Bathrooms</div>
                  </div>
                  <div className="w-px h-10 bg-gray-200"></div>
                  <div className="text-center">
                    <div className="font-bold text-xl flex items-center justify-center gap-2"><Square className="h-5 w-5 text-gray-400"/> {property.specs.sqft}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Sq Ft</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={handleShare} title="Share Property">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant={isLiked ? "default" : "outline"} 
                    size="icon" 
                    onClick={handleLike}
                    className={isLiked ? "bg-red-500 hover:bg-red-600 border-red-500" : ""}
                    title={isLiked ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                  </Button>
                </div>
             </div>

             <div className="space-y-8">
               <section>
                 <h2 className="text-xl font-bold mb-4">Description</h2>
                 <p className="text-gray-600 leading-relaxed">
                   Experience the pinnacle of modern living in this stunning property. Featuring spacious interiors flooded with natural light, high-end finishes, and thoughtful design details throughout. The open-concept layout is perfect for entertaining, while private retreats offer serenity and comfort. Located in a prime neighborhood with easy access to amenities, schools, and transportation.
                 </p>
               </section>

               <section>
                 <h2 className="text-xl font-bold mb-4">Amenities</h2>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                   {property.tags.concat(["Air Conditioning", "Heating", "Dishwasher", "Balcony", "Storage"]).map(tag => (
                     <div key={tag} className="flex items-center gap-2 text-gray-600">
                       <CheckCircle className="h-4 w-4 text-primary/60" />
                       {tag}
                     </div>
                   ))}
                 </div>
               </section>

               <section>
                 <h2 className="text-xl font-bold mb-4">Location</h2>
                 <div className="bg-gray-200 rounded-xl h-64 flex items-center justify-center text-gray-500 relative overflow-hidden">
                   <img src="/images/modern_apartment_exterior.png" className="absolute inset-0 w-full h-full object-cover opacity-50 blur-sm" />
                   <div className="relative z-10 bg-white/80 p-4 rounded-lg flex items-center">
                     <MapPin className="h-8 w-8 mr-2 text-primary" /> 
                     <span className="font-medium">{property.address}</span>
                   </div>
                 </div>
               </section>
             </div>
          </div>

          {/* Sidebar / Contact Card */}
          <div className="lg:w-[350px] shrink-0">
            <Card className="sticky top-24 shadow-lg border-t-4 border-t-primary">
              <CardContent className="p-6">
                 <div className="flex items-center gap-4 mb-6">
                   <Avatar className="h-12 w-12">
                     <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${owner.name}`} />
                     <AvatarFallback>{owner.name.charAt(0)}</AvatarFallback>
                   </Avatar>
                   <div>
                     <h3 className="font-bold">{owner.name}</h3>
                     <p className="text-sm text-muted-foreground capitalize">{owner.role}</p>
                   </div>
                 </div>

                 <div className="space-y-3 mb-6">
                   <Button className="w-full bg-primary hover:bg-primary/90 h-12 text-lg" onClick={handleRequestTour}>
                     Request Tour
                   </Button>
                   <Button variant="outline" className="w-full gap-2" onClick={handleSendMessage}>
                     <MessageSquare className="h-4 w-4" /> Send Message
                   </Button>
                   <a 
                     href="https://wa.me/254713361799" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="flex items-center justify-center w-full h-10 px-4 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-md transition-colors font-medium gap-2"
                   >
                     <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
                   </a>
                 </div>

                 <div className="space-y-4">
                   <a href="tel:+254713361799" className="flex items-center gap-3 text-sm text-gray-600 hover:text-primary transition-colors p-2 hover:bg-gray-50 rounded-md">
                      <PhoneCall className="h-4 w-4" /> 
                      <span>+254 713 361 799</span>
                   </a>
                   <a href={`mailto:${owner.email}`} className="flex items-center gap-3 text-sm text-gray-600 hover:text-primary transition-colors p-2 hover:bg-gray-50 rounded-md">
                      <Mail className="h-4 w-4" /> 
                      <span>{owner.email}</span>
                   </a>
                 </div>

                 <Separator className="my-6" />
                 
                 <div className="text-center">
                   <p className="text-xs text-gray-400">Reference ID: {property.id}</p>
                   <p className="text-xs text-gray-400 mt-1">Listed: {property.isVerified ? 'Verified Listing' : 'Unverified'}</p>
                 </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
      <Footer />
    </div>
  );
}
