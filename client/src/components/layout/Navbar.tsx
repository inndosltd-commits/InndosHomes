import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { UserCircle, Menu, PlusCircle } from "lucide-react";
import logo from "@assets/generated_images/inndos_modern_flat_minimalist_logo.png";

export function Navbar() {
  const [location] = useLocation();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <img src={logo} alt="INNDOS" className="h-8 w-8 object-contain" />
            <span className="font-heading text-xl font-bold text-primary tracking-tight">
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
          <Button variant="ghost" size="sm" className="hidden md:flex gap-2 text-primary">
            <PlusCircle className="h-4 w-4" />
            List Property
          </Button>
          <Button className="hidden md:flex gap-2 bg-primary hover:bg-primary/90">
            <UserCircle className="h-4 w-4" />
            Sign In
          </Button>
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
