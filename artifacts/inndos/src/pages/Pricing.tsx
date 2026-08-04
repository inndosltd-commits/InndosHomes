import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Gift, Zap, Crown } from "lucide-react";
import { Link } from "wouter";

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 container mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl font-bold font-heading text-gray-900 mb-4">Simple, transparent pricing</h1>
          <p className="text-lg text-gray-600">Choose the plan that best fits your property management needs. No hidden fees.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">

          {/* Free */}
          <Card className="border-2 border-zinc-200 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="h-5 w-5 text-zinc-400" />
                <CardTitle className="text-base font-bold">Free</CardTitle>
              </div>
              <CardDescription className="text-2xl font-black text-zinc-900">
                KES 0<span className="text-gray-400 text-sm font-normal"> / month</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 gap-4">
              <ul className="space-y-2 text-sm text-gray-600 flex-1">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> 3 active listings</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> <strong>5 photos</strong> per listing</li>
                <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> No video / virtual tour</li>
                <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> 0 featured listings / mo</li>
                <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> No search boost</li>
                <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> No phone support</li>
              </ul>
              <Link href="/login?role=owner" className="w-full mt-auto">
                <Button variant="outline" className="w-full">Get Started</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Basic */}
          <Card className="border-2 border-zinc-200 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-5 w-5 text-zinc-500" />
                <CardTitle className="text-base font-bold">Basic</CardTitle>
              </div>
              <CardDescription>
                <span className="text-2xl font-black text-zinc-900">KES 199</span>
                <span className="text-gray-400 text-sm"> / month</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 gap-4">
              <ul className="space-y-2 text-sm text-gray-600 flex-1">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> 10 active listings</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> <strong>15 photos</strong> per listing</li>
                <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> No video / virtual tour</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> 1 featured listing / mo</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Low search boost</li>
                <li className="flex items-center gap-2 text-gray-400"><X className="h-4 w-4 shrink-0" /> No phone support</li>
              </ul>
              <Link href="/dashboard?tab=subscription" className="w-full mt-auto">
                <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white">Upgrade to Basic</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Pro */}
          <Card className="border-2 border-yellow-300 bg-yellow-50 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-base font-bold">Pro</CardTitle>
                <Badge className="text-[10px] bg-yellow-100 text-yellow-800 border-yellow-300">Popular</Badge>
              </div>
              <CardDescription>
                <span className="text-2xl font-black text-zinc-900">KES 249</span>
                <span className="text-gray-400 text-sm"> / month</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 gap-4">
              <ul className="space-y-2 text-sm text-gray-600 flex-1">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> 50 active listings</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> <strong>30 photos</strong> per listing</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> <strong>1 video</strong> / virtual tour per listing</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> 3 featured listings / mo</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> High search boost</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Phone support</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Export leads</li>
              </ul>
              <Link href="/dashboard?tab=subscription" className="w-full mt-auto">
                <Button className="w-full bg-yellow-500 hover:bg-yellow-400 text-white font-semibold">Upgrade to Pro</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Enterprise */}
          <Card className="border-2 border-purple-300 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-base font-bold">Enterprise</CardTitle>
              </div>
              <CardDescription className="text-2xl font-black text-zinc-900">
                Custom<span className="text-gray-400 text-sm font-normal"> pricing</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 gap-4">
              <ul className="space-y-2 text-sm text-gray-600 flex-1">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Unlimited active listings</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> <strong>Unlimited photos</strong> per listing</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> <strong>5 videos</strong> / virtual tours per listing</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Negotiable featured listings</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Highest search boost</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> 24/7 phone support</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> Dedicated account manager</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500 shrink-0" /> API access + Export leads</li>
              </ul>
              <Link href="/dashboard?tab=subscription" className="w-full mt-auto">
                <Button variant="outline" className="w-full border-purple-300 text-purple-700 hover:bg-purple-50">Contact Admin</Button>
              </Link>
            </CardContent>
          </Card>

        </div>
      </div>

      <Footer />
    </div>
  );
}
