import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

const RENT_ITEMS = [
  { label: "All Rentals", href: "/search?type=rent" },
  { label: "Studio / Bedsitter", href: "/search?type=rent&filter=studio" },
  { label: "By Bedrooms", href: "/search?type=rent&filter=bedrooms" },
  { label: "Penthouse", href: "/search?type=rent&filter=penthouse" },
  { label: "Own Compound", href: "/search?type=rent&filter=own-compound" },
  { label: "Business Spaces", href: "/search?type=rent-business" },
  { label: "Shops", href: "/search?type=rent-shop" },
];

const BUY_ITEMS = [
  { label: "All Properties", href: "/search?type=sale" },
  { label: "Apartments", href: "/search?type=sale&category=apartments" },
  { label: "Homes", href: "/search?type=sale&category=homes" },
  { label: "Lands", href: "/search?type=sale&category=lands" },
];

export function MobileTopNav() {
  const [location] = useLocation();
  const [navHash, setNavHash] = useState(window.location.hash);
  const [openDropdown, setOpenDropdown] = useState<"rent" | "buy" | null>(null);
  const rentRef = useRef<HTMLDivElement>(null);
  const buyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => {
      setNavHash(window.location.hash);
      setOpenDropdown(null);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        rentRef.current && !rentRef.current.contains(e.target as Node) &&
        buyRef.current && !buyRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isRentActive = location === "/search" && navHash.includes("type=rent");
  const isHostelActive = location === "/search" && navHash.includes("type=hostel");
  const isHotelActive = location === "/search" && navHash.includes("type=hotel");
  const isBuyActive = location === "/search" && navHash.includes("type=sale");
  const isBnbActive = location === "/bnb";

  const pillBase = "flex items-center gap-1 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-all shrink-0 select-none";
  const active = "bg-black text-white border-black";
  const inactive = "bg-white text-gray-700 border-gray-200";

  return (
    <div className="lg:hidden sticky top-[80px] z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex overflow-x-auto gap-2 px-3 py-2.5 scrollbar-hide">
        <Link href="/bnb">
          <button className={`${pillBase} ${isBnbActive ? active : inactive}`}>
            B&B
          </button>
        </Link>

        <div ref={rentRef} className="relative shrink-0">
          <button
            className={`${pillBase} ${isRentActive ? active : inactive}`}
            onClick={() => setOpenDropdown(openDropdown === "rent" ? null : "rent")}
          >
            Rent
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === "rent" ? "rotate-180" : ""}`} />
          </button>
          {openDropdown === "rent" && (
            <div className="absolute top-full left-0 mt-1.5 w-44 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
              {RENT_ITEMS.map(item => (
                <Link key={item.href} href={item.href}>
                  <div
                    className="px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors active:bg-gray-100"
                    onClick={() => setOpenDropdown(null)}
                  >
                    {item.label}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link href="/search?type=hostel">
          <button className={`${pillBase} ${isHostelActive ? active : inactive}`}>
            Hostels
          </button>
        </Link>

        <Link href="/search?type=hotel">
          <button className={`${pillBase} ${isHotelActive ? active : inactive}`}>
            Hotels
          </button>
        </Link>

        <div ref={buyRef} className="relative shrink-0">
          <button
            className={`${pillBase} ${isBuyActive ? active : inactive}`}
            onClick={() => setOpenDropdown(openDropdown === "buy" ? null : "buy")}
          >
            Buy
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === "buy" ? "rotate-180" : ""}`} />
          </button>
          {openDropdown === "buy" && (
            <div className="absolute top-full left-0 mt-1.5 w-40 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
              {BUY_ITEMS.map(item => (
                <Link key={item.href} href={item.href}>
                  <div
                    className="px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors active:bg-gray-100"
                    onClick={() => setOpenDropdown(null)}
                  >
                    {item.label}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
