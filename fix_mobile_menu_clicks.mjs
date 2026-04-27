import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

// The issue might be related to the overlay pointer events or the fact that z-[90] might still allow clicks through if pointer-events-auto is missing on the overlay or something.
// Let's modify the mobile menu container.
// Old: <div className="lg:hidden fixed top-20 left-0 w-full h-[calc(100vh-80px)] bg-white z-[90] overflow-y-auto pb-24 border-t shadow-2xl flex flex-col p-4 gap-4 pointer-events-auto" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
// New: We should add a full-screen backdrop overlay to capture all clicks OUTSIDE the menu, and make the menu itself a solid block.

const mobileMenuRegex = /\{\s*\/\*\s*Mobile Menu\s*\*\/\s*\}\s*\{isMobileMenuOpen && \(\s*<div className="lg:hidden fixed top-20 left-0 w-full h-\[calc\(100vh-80px\)\] bg-white z-\[90\] overflow-y-auto pb-24 border-t shadow-2xl flex flex-col p-4 gap-4 pointer-events-auto"[^>]*>/m;

if (mobileMenuRegex.test(content)) {
    // Instead of just the menu div, let's wrap it in a proper overlay backdrop
    const replacement = `{/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop overlay to prevent clicks falling through to the page below */}
          <div 
            className="lg:hidden fixed inset-0 top-20 z-[80] bg-black/20 backdrop-blur-sm pointer-events-auto touch-none" 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Menu Content */}
          <div className="lg:hidden fixed top-20 left-0 w-full max-h-[calc(100vh-80px)] bg-white z-[90] overflow-y-auto pb-24 border-t shadow-2xl flex flex-col p-4 gap-4 pointer-events-auto touch-auto" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>`;
    
    content = content.replace(mobileMenuRegex, replacement);
    
    // Also, we need to add the closing tag for the fragment we just introduced.
    // The end of the mobile menu block looks like this:
    //           </Link>
    //         </>
    //       )}
    //     </div>
    //   )}
    // </nav>
    
    const endRegex = /          \}\)\}\n        <\/div>\n      \)\}\n    <\/nav>/m;
    if (endRegex.test(content)) {
        content = content.replace(endRegex, `          })}\n        </div>\n        </>\n      )}\n    </nav>`);
        fs.writeFileSync(path, content);
        console.log("Successfully updated mobile menu with backdrop overlay to trap clicks.");
    } else {
        console.log("Could not find the end of the mobile menu block.");
    }
} else {
    console.log("Could not find the start of the mobile menu block.");
}
