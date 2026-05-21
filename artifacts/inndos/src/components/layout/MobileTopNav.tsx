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

type DropdownKey = "rent" | "buy" | null;

interface DropdownMenuProps {
  items: { label: string; href: string }[];
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

function DropdownMenu({ items, anchorRef, onClose }: DropdownMenuProps) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 6, left: r.left });
    }
    const close = () => onClose();
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [anchorRef, onClose]);

  return (
    <>
      <div className="fixed inset-0 z-[490]" onClick={onClose} />
      <div
        className="fixed z-[500] bg-white border border-gray-100 rounded-xl shadow-xl py-1 min-w-[168px] overflow-hidden"
        style={{ top: coords.top, left: coords.left }}
      >
        {items.map(item => (
          <Link key={item.href} href={item.href}>
            <div
              className="px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
              onClick={onClose}
            >
              {item.label}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

export function MobileTopNav() {
  const [location] = useLocation();
  const [navHash, setNavHash] = useState(window.location.hash);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);

  const rentBtnRef = useRef<HTMLButtonElement>(null);
  const buyBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = () => {
      setNavHash(window.location.hash);
      setOpenDropdown(null);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const isRentActive = location === "/search" && navHash.includes("type=rent");
  const isHostelActive = location === "/search" && navHash.includes("type=hostel");
  const isHotelActive = location === "/search" && navHash.includes("type=hotel");
  const isBuyActive = location === "/search" && navHash.includes("type=sale");
  const isBnbActive = location === "/bnb";

  const pill = (active: boolean) =>
    `flex items-center gap-1 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-all shrink-0 select-none ${
      active ? "bg-black text-white border-black" : "bg-white text-gray-700 border-gray-200"
    }`;

  return (
    <>
      <div className="lg:hidden sticky top-[80px] z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex overflow-x-auto gap-2 px-3 py-2.5 scrollbar-hide">
          <Link href="/bnb">
            <button className={pill(isBnbActive)}>B&amp;B</button>
          </Link>

          <button
            ref={rentBtnRef}
            className={pill(isRentActive)}
            onClick={() => setOpenDropdown(openDropdown === "rent" ? null : "rent")}
          >
            Rent
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === "rent" ? "rotate-180" : ""}`} />
          </button>

          <Link href="/search?type=hostel">
            <button className={pill(isHostelActive)}>Hostels</button>
          </Link>

          <Link href="/search?type=hotel">
            <button className={pill(isHotelActive)}>Hotels</button>
          </Link>

          <button
            ref={buyBtnRef}
            className={pill(isBuyActive)}
            onClick={() => setOpenDropdown(openDropdown === "buy" ? null : "buy")}
          >
            Buy
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === "buy" ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {openDropdown === "rent" && (
        <DropdownMenu
          items={RENT_ITEMS}
          anchorRef={rentBtnRef}
          onClose={() => setOpenDropdown(null)}
        />
      )}
      {openDropdown === "buy" && (
        <DropdownMenu
          items={BUY_ITEMS}
          anchorRef={buyBtnRef}
          onClose={() => setOpenDropdown(null)}
        />
      )}
    </>
  );
}
