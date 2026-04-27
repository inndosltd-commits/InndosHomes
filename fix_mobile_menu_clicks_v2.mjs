import fs from 'fs';

const path = 'client/src/components/layout/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the start of the mobile menu
const startPattern = `{/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed top-20 left-0 w-full h-[calc(100vh-80px)] bg-white z-[90] overflow-y-auto pb-24 border-t shadow-2xl flex flex-col p-4 gap-4 pointer-events-auto" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>`;

const newStart = `{/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 top-20 z-[80] bg-black/20 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="lg:hidden fixed top-20 left-0 w-full max-h-[calc(100vh-80px)] bg-white z-[90] overflow-y-auto pb-24 border-t shadow-2xl flex flex-col p-4 gap-4" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>`;

// Replace the end of the mobile menu
const endPattern = `            </>
          )}
        </div>
      )}
    </nav>`;

const newEnd = `            </>
          )}
        </div>
        </>
      )}
    </nav>`;

if (content.includes(startPattern) && content.includes(endPattern)) {
    content = content.replace(startPattern, newStart);
    content = content.replace(endPattern, newEnd);
    fs.writeFileSync(path, content);
    console.log("Successfully wrapped mobile menu in a portal-like backdrop overlay.");
} else {
    console.log("Could not find exact patterns. Let's try regex.");
    
    // Fallback using Regex
    const mobileMenuStartRegex = /\{\/\*\s*Mobile Menu\s*\*\/\}\s*\{isMobileMenuOpen && \(\s*<div className="lg:hidden fixed top-20 left-0 w-full [^"]+"[^>]*>/;
    
    const match = content.match(mobileMenuStartRegex);
    if (match) {
        content = content.replace(mobileMenuStartRegex, `{/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          <div className="lg:hidden fixed inset-0 top-20 z-[80] bg-black/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="lg:hidden fixed top-20 left-0 w-full max-h-[calc(100vh-80px)] bg-white z-[90] overflow-y-auto pb-24 border-t shadow-2xl flex flex-col p-4 gap-4" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>`);
          
        content = content.replace(/          \)\}\n        <\/div>\n      \)\}\n    <\/nav>/, `          )}\n        </div>\n        </>\n      )}\n    </nav>`);
        
        fs.writeFileSync(path, content);
        console.log("Successfully applied backdrop using Regex.");
    } else {
        console.log("Regex also failed.");
    }
}
