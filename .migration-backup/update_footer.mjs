import fs from 'fs';

const pathFooter = 'client/src/components/layout/Footer.tsx';
let footerContent = fs.readFileSync(pathFooter, 'utf8');

// Add lucide icons import
if (!footerContent.includes('import { Instagram, Facebook } from "lucide-react"')) {
    footerContent = footerContent.replace(
        'import { Link } from "wouter";',
        'import { Link } from "wouter";\nimport { Instagram, Facebook } from "lucide-react";\n\n// Custom icons for Tiktok and Threads since they aren\'t standard in all icon sets\nconst TikTokIcon = ({ className }: { className?: string }) => (\n  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round">\n    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5v3a3 3 0 0 1-3-3v11a4 4 0 0 1-8-4Z" />\n  </svg>\n);\n\nconst ThreadsIcon = ({ className }: { className?: string }) => (\n  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round">\n    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />\n    <path d="M15.5 12C15.5 13.933 13.933 15.5 12 15.5C10.067 15.5 8.5 13.933 8.5 12C8.5 10.067 10.067 8.5 12 8.5C13.933 8.5 15.5 10.067 15.5 12Z" />\n    <path d="M15.5 12V10.5C15.5 8.567 13.933 7 12 7C10.067 7 8.5 8.567 8.5 10.5V12C8.5 13.933 10.067 15.5 12 15.5" />\n  </svg>\n);\n'
    );
}

// Add About Us link and Social Icons
const oldSupport = `        <div>
          <h4 className="font-bold mb-4">Support</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><Link href="/help" className="hover:text-white cursor-pointer">Help Center</Link></li>
            <li><Link href="/terms" className="hover:text-white cursor-pointer">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:text-white cursor-pointer">Privacy Policy</Link></li>
            <li><Link href="/contact" className="hover:text-white cursor-pointer">Contact Us</Link></li>
          </ul>
        </div>`;

const newSupport = `        <div>
          <h4 className="font-bold mb-4">Support & About</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><Link href="/about" className="hover:text-white cursor-pointer">About Us</Link></li>
            <li><Link href="/help" className="hover:text-white cursor-pointer">Help Center</Link></li>
            <li><Link href="/terms" className="hover:text-white cursor-pointer">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:text-white cursor-pointer">Privacy Policy</Link></li>
            <li><Link href="/contact" className="hover:text-white cursor-pointer">Contact Us</Link></li>
          </ul>
        </div>`;

if (footerContent.includes(oldSupport)) {
    footerContent = footerContent.replace(oldSupport, newSupport);
}

const oldContact = `         <div>
          <h4 className="font-bold mb-4">Contact</h4>
          <p className="text-sm text-gray-300 mb-2">Nairobi, Kenya</p>
          <p className="text-sm text-gray-300 mb-2">support@inndos.com</p>
          <p className="text-sm text-gray-300">+254 713 361799</p>
        </div>`;

const newContact = `         <div>
          <h4 className="font-bold mb-4">Contact & Follow Us</h4>
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
        </div>`;

if (footerContent.includes(oldContact)) {
    footerContent = footerContent.replace(oldContact, newContact);
}

fs.writeFileSync(pathFooter, footerContent);
console.log("Updated footer with About link and social icons");
