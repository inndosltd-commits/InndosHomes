import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-primary text-white py-12">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
           <h3 className="font-heading font-bold text-2xl mb-4">INNDOS</h3>
           <p className="text-gray-300 text-sm">A unified platform connecting Owners, Landlords, Rental Agencies & Property Sellers with Tenants & Buyers.</p>
        </div>
        <div>
          <h4 className="font-bold mb-4">Platform</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><Link href="/search?type=rent" className="hover:text-white cursor-pointer">For Rent</Link></li>
            <li><Link href="/search?type=sale" className="hover:text-white cursor-pointer">For Sale</Link></li>
            <li><Link href="/dashboard" className="hover:text-white cursor-pointer">List Property</Link></li>
            <li><Link href="/pricing" className="hover:text-white cursor-pointer">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-4">Support</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><Link href="/help" className="hover:text-white cursor-pointer">Help Center</Link></li>
            <li><Link href="/terms" className="hover:text-white cursor-pointer">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:text-white cursor-pointer">Privacy Policy</Link></li>
            <li><Link href="/contact" className="hover:text-white cursor-pointer">Contact Us</Link></li>
          </ul>
        </div>
         <div>
          <h4 className="font-bold mb-4">Contact</h4>
          <p className="text-sm text-gray-300 mb-2">Nairobi, Kenya</p>
          <p className="text-sm text-gray-300 mb-2">support@inndos.com</p>
          <p className="text-sm text-gray-300">+254 713 361799</p>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/10 text-center text-sm text-gray-400">
        © 2025 INNDOS. All rights reserved.
      </div>
    </footer>
  );
}
