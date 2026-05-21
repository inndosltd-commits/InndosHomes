import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Check, X, Info } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/lib/language";

export default function Pricing() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-1 container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl font-bold font-heading text-gray-900 mb-4">Simple, transparent pricing</h1>
          <p className="text-lg text-gray-600">Choose the plan that best fits your property management needs. No hidden fees.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Standard Plan */}
          <Card className="flex flex-col relative overflow-hidden bg-white">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Standard</CardTitle>
              <CardDescription>Free tier for individual owners</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">Free</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm"><Check className="h-5 w-5 text-green-500" /> Up to 3 listings</li>
                <li className="flex items-center gap-3 text-sm"><Check className="h-5 w-5 text-green-500" /> Basic property analytics</li>
                <li className="flex items-center gap-3 text-sm"><Check className="h-5 w-5 text-green-500" /> Booking management</li>
                <li className="flex items-center gap-3 text-sm text-gray-400"><X className="h-5 w-5" /> Property videos</li>
                <li className="flex items-center gap-3 text-sm text-gray-400"><X className="h-5 w-5" /> Priority support</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/login?role=owner" className="w-full">
                <Button variant="outline" className="w-full h-12">Get Started</Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Silver Plan */}
          <Card className="flex flex-col relative overflow-hidden bg-zinc-900 text-white border-none shadow-xl scale-105 z-10">
            <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white">Silver</CardTitle>
              <CardDescription className="text-gray-400">For active hosts and agencies</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">KES 200</span>
                <span className="text-gray-400">/mo</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm"><Check className="h-5 w-5 text-primary" /> Up to 7 listings</li>
                <li className="flex items-center gap-3 text-sm"><Check className="h-5 w-5 text-primary" /> Advanced analytics & reporting</li>
                <li className="flex items-center gap-3 text-sm"><Check className="h-5 w-5 text-primary" /> Booking management</li>
                <li className="flex items-center gap-3 text-sm"><Check className="h-5 w-5 text-primary" /> 1 property video (max 30s)</li>
                <li className="flex items-center gap-3 text-sm"><Check className="h-5 w-5 text-primary" /> Priority support</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/dashboard#/dashboard?tab=subscription" className="w-full">
                <Button className="w-full h-12 bg-white text-zinc-900 hover:bg-gray-100">Subscribe via Pesapal</Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Gold Plan */}
          <Card className="flex flex-col relative overflow-hidden border-yellow-300 bg-yellow-50">
            <div className="absolute top-0 right-0 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">BEST VALUE</div>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Gold</CardTitle>
              <CardDescription>For large scale operations</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">KES 300</span>
                <span className="text-gray-500">/mo</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-sm"><Check className="h-5 w-5 text-green-500" /> Unlimited listings</li>
                <li className="flex items-center gap-3 text-sm"><Check className="h-5 w-5 text-green-500" /> Advanced analytics & reporting</li>
                <li className="flex items-center gap-3 text-sm"><Check className="h-5 w-5 text-green-500" /> Booking management</li>
                <li className="flex items-center gap-3 text-sm"><Check className="h-5 w-5 text-green-500" /> 2 property videos (max 30s each)</li>
                <li className="flex items-center gap-3 text-sm"><Check className="h-5 w-5 text-green-500" /> Featured listings + priority support</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/dashboard#/dashboard?tab=subscription" className="w-full">
                <Button className="w-full h-12 bg-yellow-500 hover:bg-yellow-400 text-white">Upgrade to Gold</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        {/* Integration Note */}
        <div className="max-w-3xl mx-auto mt-16 bg-blue-50 border border-blue-100 rounded-xl p-6 flex gap-4 items-start">
          <Info className="h-6 w-6 text-blue-500 shrink-0 mt-1" />
          <div>
            <h4 className="font-bold text-blue-900">Secure Payments via Pesapal</h4>
            <p className="text-sm text-blue-800 mt-1">All subscriptions are processed securely using Pesapal. This is a mockup interface. In the full-stack version, clicking subscribe will redirect to the official Pesapal payment gateway.</p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
