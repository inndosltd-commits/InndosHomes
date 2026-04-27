import fs from 'fs';

// 1. Update language.tsx
let langContent = fs.readFileSync('client/src/lib/language.tsx', 'utf8');

langContent = langContent.replace("'prop.view_all_photos': 'View All Photos',", 
`'prop.view_all_photos': 'View All Photos',
    'prop.dummy_desc': 'Experience the pinnacle of modern living in this stunning property. Featuring spacious interiors flooded with natural light, high-end finishes, and thoughtful design details throughout. The open-concept layout is perfect for entertaining, while private retreats offer serenity and comfort. Located in a prime neighborhood with easy access to amenities, schools, and transportation.',
    'footer.platform': 'Platform',
    'footer.pricing': 'Pricing',
    'footer.support': 'Support & About',
    'footer.about': 'About Us',
    'footer.help': 'Help Center',
    'footer.terms': 'Terms of Service',
    'footer.privacy': 'Privacy Policy',
    'footer.contact': 'Contact Us',
    'footer.follow': 'Contact & Follow Us',`);

langContent = langContent.replace("'prop.view_all_photos': 'Voir toutes les photos',", 
`'prop.view_all_photos': 'Voir toutes les photos',
    'prop.dummy_desc': 'Découvrez le summum de la vie moderne dans cette magnifique propriété. Dotée d\\'intérieurs spacieux inondés de lumière naturelle, de finitions haut de gamme et de détails de conception soignés. L\\'aménagement à aire ouverte est parfait pour recevoir, tandis que les retraites privées offrent sérénité et confort. Située dans un quartier de choix avec un accès facile aux commodités, aux écoles et aux transports.',
    'footer.platform': 'Plateforme',
    'footer.pricing': 'Tarifs',
    'footer.support': 'Support & À propos',
    'footer.about': 'À propos de nous',
    'footer.help': 'Centre d\\'aide',
    'footer.terms': 'Conditions d\\'utilisation',
    'footer.privacy': 'Politique de confidentialité',
    'footer.contact': 'Nous contacter',
    'footer.follow': 'Contact & Suivez-nous',`);

langContent = langContent.replace("'home.explore_bnbs': 'B&B Aufenthalte entdecken',", 
`'home.explore_bnbs': 'B&B Aufenthalte entdecken',
    'prop.dummy_desc': 'Erleben Sie den Höhepunkt des modernen Wohnens in dieser atemberaubenden Immobilie. Mit geräumigen, von natürlichem Licht durchfluteten Innenräumen, hochwertigen Oberflächen und durchdachten Designdetails. Das offene Layout eignet sich perfekt für Unterhaltung, während private Rückzugsorte Ruhe und Komfort bieten. In einer erstklassigen Nachbarschaft mit einfachem Zugang zu Annehmlichkeiten, Schulen und Verkehrsmitteln gelegen.',
    'footer.platform': 'Plattform',
    'footer.pricing': 'Preise',
    'footer.support': 'Support & Über uns',
    'footer.about': 'Über uns',
    'footer.help': 'Hilfe-Center',
    'footer.terms': 'Nutzungsbedingungen',
    'footer.privacy': 'Datenschutzrichtlinie',
    'footer.contact': 'Kontaktieren Sie uns',
    'footer.follow': 'Kontakt & Folgen Sie uns',`);

fs.writeFileSync('client/src/lib/language.tsx', langContent);

// 2. Update Footer.tsx
let footerContent = fs.readFileSync('client/src/components/layout/Footer.tsx', 'utf8');
footerContent = footerContent.replace('export function Footer() {', `import { useLanguage } from "@/lib/language";\n\nexport function Footer() {\n  const { t } = useLanguage();`);

footerContent = footerContent.replace('>Platform</h4>', '>{t("footer.platform")}</h4>');
footerContent = footerContent.replace('>For Rent</Link>', '>{t("nav.rent")}</Link>');
footerContent = footerContent.replace('>For Sale</Link>', '>{t("nav.buy")}</Link>');
footerContent = footerContent.replace('>List Property</Link>', '>{t("nav.list_property")}</Link>');
footerContent = footerContent.replace('>Pricing</Link>', '>{t("footer.pricing")}</Link>');
footerContent = footerContent.replace('>Support & About</h4>', '>{t("footer.support")}</h4>');
footerContent = footerContent.replace('>About Us</Link>', '>{t("footer.about")}</Link>');
footerContent = footerContent.replace('>Help Center</Link>', '>{t("footer.help")}</Link>');
footerContent = footerContent.replace('>Terms of Service</Link>', '>{t("footer.terms")}</Link>');
footerContent = footerContent.replace('>Privacy Policy</Link>', '>{t("footer.privacy")}</Link>');
footerContent = footerContent.replace('>Contact Us</Link>', '>{t("footer.contact")}</Link>');
footerContent = footerContent.replace('>Contact & Follow Us</h4>', '>{t("footer.follow")}</h4>');

fs.writeFileSync('client/src/components/layout/Footer.tsx', footerContent);

// 3. Update PropertyDetails.tsx
let pdContent = fs.readFileSync('client/src/pages/PropertyDetails.tsx', 'utf8');
const hardcodedDesc = `Experience the pinnacle of modern living in this stunning property. Featuring spacious interiors flooded with natural light, high-end finishes, and thoughtful design details throughout. The open-concept layout is perfect for entertaining, while private retreats offer serenity and comfort. Located in a prime neighborhood with easy access to amenities, schools, and transportation.`;
pdContent = pdContent.replace(hardcodedDesc, `{t('prop.dummy_desc')}`);
fs.writeFileSync('client/src/pages/PropertyDetails.tsx', pdContent);

// 4. Update Navbar.tsx
let navContent = fs.readFileSync('client/src/components/layout/Navbar.tsx', 'utf8');

if (!navContent.includes('ChevronDown')) {
    navContent = navContent.replace('UserCircle, Menu, PlusCircle, LogOut', 'UserCircle, Menu, PlusCircle, LogOut, ChevronDown');
}

navContent = navContent.replace('const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);', 'const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);\n  const [isRentExpanded, setIsRentExpanded] = useState(false);');

const oldRentSection = `          <div>
            <Link href="/search?type=rent" onClick={() => setIsMobileMenuOpen(false)}>
              <span className={\`block text-lg font-medium transition-colors hover:text-primary cursor-pointer \${location.includes('rent') ? 'text-primary' : 'text-muted-foreground'}\`}>
                {t('nav.rent')}
              </span>
            </Link>
            <div className="pl-4 mt-2 flex flex-col gap-2 border-l-2 border-gray-100 ml-2">
              <Link href="/search?type=rent-business" onClick={() => setIsMobileMenuOpen(false)}>
                <span className="block text-base text-gray-600 hover:text-primary">Business Spaces</span>
              </Link>
              <Link href="/search?type=rent-godown" onClick={() => setIsMobileMenuOpen(false)}>
                <span className="block text-base text-gray-600 hover:text-primary">Godowns</span>
              </Link>
              <Link href="/search?type=rent-stall" onClick={() => setIsMobileMenuOpen(false)}>
                <span className="block text-base text-gray-600 hover:text-primary">Stalls</span>
              </Link>
              <Link href="/search?type=rent-shop" onClick={() => setIsMobileMenuOpen(false)}>
                <span className="block text-base text-gray-600 hover:text-primary">Shops</span>
              </Link>
            </div>
          </div>`;

const newRentSection = `          <div className="border-b border-gray-50 pb-2">
            <div className="flex items-center justify-between cursor-pointer py-1" onClick={() => setIsRentExpanded(!isRentExpanded)}>
              <span className={\`block text-lg font-medium transition-colors hover:text-primary \${location.includes('rent') ? 'text-primary' : 'text-muted-foreground'}\`}>
                {t('nav.rent')}
              </span>
              <ChevronDown className={\`h-5 w-5 text-gray-400 transition-transform duration-200 \${isRentExpanded ? 'rotate-180' : ''}\`} />
            </div>
            
            {isRentExpanded && (
              <div className="pl-4 mt-3 flex flex-col gap-3 border-l-2 border-primary/20 ml-2 animate-in slide-in-from-top-2 duration-200">
                <Link href="/search?type=rent" onClick={() => setIsMobileMenuOpen(false)}>
                  <span className="block text-base font-medium text-gray-700 hover:text-primary">All Rentals</span>
                </Link>
                <Link href="/search?type=rent-business" onClick={() => setIsMobileMenuOpen(false)}>
                  <span className="block text-base text-gray-600 hover:text-primary">Business Spaces</span>
                </Link>
                <Link href="/search?type=rent-godown" onClick={() => setIsMobileMenuOpen(false)}>
                  <span className="block text-base text-gray-600 hover:text-primary">Godowns</span>
                </Link>
                <Link href="/search?type=rent-stall" onClick={() => setIsMobileMenuOpen(false)}>
                  <span className="block text-base text-gray-600 hover:text-primary">Stalls</span>
                </Link>
                <Link href="/search?type=rent-shop" onClick={() => setIsMobileMenuOpen(false)}>
                  <span className="block text-base text-gray-600 hover:text-primary">Shops</span>
                </Link>
              </div>
            )}
          </div>`;

navContent = navContent.replace(oldRentSection, newRentSection);

const oldMobileSelects = `<div className="flex items-center justify-between mb-2 z-[110] relative">
             <span className="text-base font-medium text-gray-500">Language</span>
             <select 
               value={language} 
               onChange={(e) => setLanguage(e.target.value)}
               className="h-10 w-[120px] text-sm border border-gray-200 rounded-md px-3 bg-white outline-none focus:ring-2 focus:ring-primary"
             >
               <option value="EN">🇺🇸 EN</option>
               <option value="FR">🇫🇷 FR</option>
               <option value="DE">🇩🇪 DE</option>
             </select>
          </div>

          <div className="flex items-center justify-between mb-4 z-[110] relative">
             <span className="text-base font-medium text-gray-500">Currency</span>
             <select 
               value={currency} 
               onChange={(e) => setCurrency(e.target.value)}
               className="h-10 w-[120px] text-sm border border-gray-200 rounded-md px-3 bg-white outline-none focus:ring-2 focus:ring-primary"
             >
               <option value="KES">KES</option>
               <option value="USD">USD</option>
               <option value="EUR">EUR</option>
               <option value="GBP">GBP</option>
             </select>
          </div>`;

const newMobileSelects = `          <div className="flex items-center justify-between mb-2">
             <span className="text-base font-medium text-gray-500">Language</span>
             <div className="w-[120px]">
               <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                 <SelectTrigger className="h-10 text-sm border-gray-200 bg-white">
                   <SelectValue placeholder="Lang" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="EN">🇺🇸 EN</SelectItem>
                   <SelectItem value="FR">🇫🇷 FR</SelectItem>
                   <SelectItem value="DE">🇩🇪 DE</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </div>

          <div className="flex items-center justify-between mb-4">
             <span className="text-base font-medium text-gray-500">Currency</span>
             <div className="w-[120px]">
               <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
                 <SelectTrigger className="h-10 text-sm border-gray-200 bg-white">
                   <SelectValue placeholder="Currency" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="KES">KES</SelectItem>
                   <SelectItem value="USD">USD</SelectItem>
                   <SelectItem value="EUR">EUR</SelectItem>
                   <SelectItem value="GBP">GBP</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </div>`;

navContent = navContent.replace(oldMobileSelects, newMobileSelects);

const oldMenuContainer = `className="lg:hidden fixed inset-0 top-20 bg-white z-[90] overflow-y-auto pb-24 border-t shadow-2xl flex flex-col p-4 gap-4 pointer-events-auto"`;
const newMenuContainer = `className="lg:hidden fixed inset-0 top-20 bg-white z-[90] overflow-y-auto pb-24 border-t shadow-2xl flex flex-col p-4 gap-4 pointer-events-auto" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}`;

if (navContent.includes(oldMenuContainer)) {
    navContent = navContent.replace(oldMenuContainer, newMenuContainer);
}

fs.writeFileSync('client/src/components/layout/Navbar.tsx', navContent);

console.log("Translation and Navbar layout fixes applied.");
