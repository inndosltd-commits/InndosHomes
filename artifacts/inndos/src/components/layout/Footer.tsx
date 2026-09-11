import { Link } from "wouter";
import { Instagram, Facebook, Linkedin } from "lucide-react";

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
import { BrandWordmark } from "./BrandWordmark";
import { usePublicCmsGlobal } from "@/lib/cms-global";

export function Footer() {
  const { t } = useLanguage();
  const { footer } = usePublicCmsGlobal();
  const visibleSocialLinks = footer.socialLinks.filter((link) => link.visible);
  const socialIcon = (id: string) => {
    if (id === "instagram") return <Instagram className="h-5 w-5" />;
    if (id === "facebook") return <Facebook className="h-5 w-5" />;
    if (id === "linkedin") return <Linkedin className="h-5 w-5" />;
    if (id === "tiktok") return <TikTokIcon className="h-5 w-5" />;
    return <ThreadsIcon className="h-5 w-5" />;
  };
  return (
    <footer className="py-12" style={{ backgroundColor: footer.backgroundColor, color: footer.textColor }}>
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
           <div className="mb-4"><BrandWordmark inverse /></div>
           <p className="text-sm whitespace-pre-line" style={{ color: footer.mutedTextColor }}>{footer.brandDescription}</p>
        </div>
        {footer.columns.filter((column) => column.visible).map((column) => (
          <div key={column.id}>
            <h4 className="font-bold mb-4" style={{ color: footer.textColor }}>{column.title}</h4>
            <ul className="space-y-2 text-sm">
              {column.links.filter((link) => link.visible).map((link) => (
                <li key={link.id}>
                  <Link href={link.href} className="cursor-pointer transition-colors" style={{ color: footer.mutedTextColor }}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h4 className="font-bold mb-4" style={{ color: footer.textColor }}>{t("footer.follow")}</h4>
          <p className="text-sm whitespace-pre-line mb-4" style={{ color: footer.mutedTextColor }}>{footer.contactText}</p>
          <div className="flex items-center gap-4 mt-4">
            {visibleSocialLinks.map((link) => (
              <a key={link.id} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label} className="p-2 rounded-full transition-colors" style={{ color: footer.mutedTextColor, backgroundColor: `${footer.textColor}1a` }}>
                {socialIcon(link.id)}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-12 pt-8 border-t text-center text-sm" style={{ borderColor: `${footer.textColor}1a`, color: footer.mutedTextColor }}>
        {footer.copyrightText}
      </div>
    </footer>
  );
}
