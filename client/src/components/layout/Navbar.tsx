import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { UserCircle, Menu, PlusCircle } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer group">
            <img 
              src="/images/inndos_modern_flat_minimalist_logo.png" 
              alt="INNDOS" 
              className="h-12 w-12 object-contain transition-transform group-hover:scale-105" 
            />
            <span className="font-heading text-2xl font-bold text-primary tracking-tight">
              INNDOS
            </span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/search?type=rent">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location.includes('rent') ? 'text-primary' : 'text-muted-foreground'}`}>
              Rent
            </span>
          </Link>
          <Link href="/search?type=sale">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location.includes('sale') ? 'text-primary' : 'text-muted-foreground'}`}>
              Buy
            </span>
          </Link>
          <Link href="/dashboard">
            <span className={`text-sm font-medium transition-colors hover:text-primary cursor-pointer ${location === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
              Dashboard
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="hidden md:flex gap-2 text-primary">
              <PlusCircle className="h-4 w-4" />
              List Property
            </Button>
          </Link>
          <Link href="/login">
            <Button className="hidden md:flex gap-2 bg-primary hover:bg-primary/90">
              <UserCircle className="h-4 w-4" />
              Sign In
            </Button>
          </Link>
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
