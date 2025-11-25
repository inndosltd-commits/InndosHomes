import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold font-heading text-primary mb-4">Simple, Transparent Pricing</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that's right for you. Whether you're a single landlord or a large agency, we have you covered.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Basic Plan */}
          <Card className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-bold">Basic Landlord</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Perfect for trying out INNDOS</p>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3 mt-4">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" /> 1 Active Listing
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" /> Basic Analytics
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" /> Standard Support
                </li>
              </ul>
              <Button className="w-full mt-8" variant="outline">Get Started</Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="flex flex-col relative border-primary shadow-lg scale-105 z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-3 py-1 rounded-full text-xs font-bold">
              MOST POPULAR
            </div>
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-bold">Professional</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">$29</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">For growing property portfolios</p>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3 mt-4">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" /> Up to 10 Listings
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" /> Verified Badge
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" /> Advanced Analytics
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" /> Featured Placement (1x/mo)
                </li>
              </ul>
              <Button className="w-full mt-8 bg-primary hover:bg-primary/90">Start Free Trial</Button>
            </CardContent>
          </Card>

          {/* Agency Plan */}
          <Card className="flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-bold">Agency</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">$99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Complete solution for agencies</p>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3 mt-4">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" /> Unlimited Listings
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" /> Team Management
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" /> Priority Support (24/7)
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" /> API Access
                </li>
              </ul>
              <Button className="w-full mt-8" variant="outline">Contact Sales</Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
