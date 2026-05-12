import { Link } from "wouter";
import { Instagram, Facebook } from "lucide-react";

// Custom icons for Tiktok and Threads since they aren't standard in all icon sets
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5v3a3 3 0 0 1-3-3v11a4 4 0 0 1-8-4Z" />
  </svg>
);

const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
    <path d="M15.5 12C15.5 13.933 13.933 15.5 12 15.5C10.067 15.5 8.5 13.933 8.5 12C8.5 10.067 10.067 8.5 12 8.5C13.933 8.5 15.5 10.067 15.5 12Z" />
    <path d="M15.5 12V10.5C15.5 8.567 13.933 7 12 7C10.067 7 8.5 8.567 8.5 10.5V12C8.5 13.933 10.067 15.5 12 15.5" />
  </svg>
);


import { useLanguage } from "@/lib/language";

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-primary text-white py-12">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
           <h3 className="font-heading font-bold text-2xl mb-4">INNDOS</h3>
           <p className="text-gray-300 text-sm">A unified platform connecting Owners, Landlords, Rental Agencies & Property Sellers with Tenants & Buyers.</p>
        </div>
        <div>
          <h4 className="font-bold mb-4">{t("footer.platform")}</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><Link href="/search?type=rent" className="hover:text-white cursor-pointer">{t("nav.rent")}</Link></li>
            <li><Link href="/search?type=sale" className="hover:text-white cursor-pointer">{t("nav.buy")}</Link></li>
            <li><Link href="/dashboard" className="hover:text-white cursor-pointer">{t("nav.list_property")}</Link></li>
            <li><Link href="/pricing" className="hover:text-white cursor-pointer">{t("footer.pricing")}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-4">{t("footer.support")}</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><Link href="/about" className="hover:text-white cursor-pointer">{t("footer.about")}</Link></li>
            <li><Link href="/help" className="hover:text-white cursor-pointer">{t("footer.help")}</Link></li>
            <li><Link href="/terms" className="hover:text-white cursor-pointer">{t("footer.terms")}</Link></li>
            <li><Link href="/privacy" className="hover:text-white cursor-pointer">{t("footer.privacy")}</Link></li>
            <li><Link href="/contact" className="hover:text-white cursor-pointer">{t("footer.contact")}</Link></li>
          </ul>
        </div>
         <div>
          <h4 className="font-bold mb-4">{t("footer.follow")}</h4>
          <p className="text-sm text-gray-300 mb-4">Nairobi, Kenya<br/>support@inndos.com<br/>+254 713 361799</p>
          
          <div className="flex items-center gap-4 mt-4">
            <a href="https://www.instagram.com/inndos_global?igsh=OThzbHkydmh5ZHYw&utm_source=qr" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="https://www.tiktok.com/@inndos_global?_r=1&_t=ZS-95srzxOYY6y" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
              <TikTokIcon className="h-5 w-5" />
            </a>
            <a href="https://www.facebook.com/share/1FsxLtSy5y/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
              <Facebook className="h-5 w-5" />
            </a>
            <a href="https://www.threads.com/@inndos_global?igshid=NTc4MTIwNjQ2YQ==" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
              <ThreadsIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-12 pt-8 border-t border-white/10 text-center text-sm text-gray-400">
        © 2025 INNDOS. All rights reserved. Developed & Designed By Web Expert Solutions
      </div>
    </footer>
  );
}
