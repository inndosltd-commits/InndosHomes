import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PropertyCard, type ApiProperty } from "@/components/property/PropertyCard";
import { Button } from "@/components/ui/button";

export default function ListerProfile() {
  const [, params] = useRoute("/lister/:id");
  const [profile, setProfile] = useState<{ lister: { name: string; businessName?: string | null; propertyCount: number }; properties: ApiProperty[] } | null>(null);
  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/properties/listers/${params.id}`).then(r => r.ok ? r.json() : null).then(setProfile).catch(() => setProfile(null));
  }, [params?.id]);
  return <div className="min-h-screen bg-gray-50"><Navbar /><main className="container mx-auto px-4 py-12">
    {!profile ? <p className="text-center text-muted-foreground">This public lister profile is unavailable.</p> : <>
      <Link href="/"><Button variant="ghost">← Back to discovery</Button></Link>
      <div className="mt-6 mb-8"><p className="text-sm text-primary font-semibold">VERIFIED LISTER</p><h1 className="text-3xl font-bold">{profile.lister.businessName || profile.lister.name}</h1>{profile.lister.businessName && <p className="text-muted-foreground">Managed by {profile.lister.name}</p>}<p className="mt-2 text-muted-foreground">{profile.properties.length} verified, available listing{profile.properties.length === 1 ? "" : "s"}</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{profile.properties.map(p => <PropertyCard key={p.id} property={p} />)}</div>
    </>}</main><Footer /></div>;
}