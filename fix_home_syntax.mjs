import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
let content = fs.readFileSync(path, 'utf8');

// I notice the error is at the end of the file.
// "Missing closing div tag before end of file in /home/runner/workspace/client/src/pages/Home.tsx:202:0"
// "Unterminated JSX contents. (199:10)"

// Let's look at the end of the file from the last read.
// 195→        </div>
// 196→      </section>
// 197→      
// 198→      <Footer />
// 199→    </div>

// It seems there might be a missing closing tag or an extra closing tag higher up due to my replacements.
// Let's check the replacement I made.
/*
const replacement = `<div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 w-full">
                 {/* Filter Pills - Scrollable on mobile *\/}
                 <div className="w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0 flex-shrink-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <div className="flex items-center gap-2 w-max pr-4 md:pr-0">
                      ... Links ...
                    </div>
                 </div>
                 
                 {/* Right Side: List Property & Search Bar *\/}
                 <div className="flex w-full md:w-auto items-center gap-3 ml-auto">
                    ... Link & div ...
                 </div>
              </div>`;

I replaced:
const endStr = `              </div>\n          </div>\n      </div>`;

Let's check the previous structure:
      <div className="bg-white pt-4 pb-0">
          <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-6 w-full">
                 ...
                 ...
              </div>
          </div>
      </div>

If I replaced it with `replacement` and my `endStr` was `              </div>\n          </div>\n      </div>`,
I might have replaced the closing tags of the container and wrapper div.
Let's see the replacement string again:
My replacement string is just the inner `div` (the flex flex-col md:flex-row).
But I replaced up to the endStr `              </div>\n          </div>\n      </div>`
Wait! `content.substring(end)` would include `              </div>\n          </div>\n      </div>` because `substring(end)` starts at `end`.
Let's check the exact substring logic I used:
`content.substring(0, start) + replacement + content.substring(end)`
If `end` is the index of `              </div>\n          </div>\n      </div>`, then `content.substring(end)` INCLUDES those closing tags.
So the closing tags are preserved!
Then why is there an error?

Let's re-read the file around the replacement area to see if there's a missing tag.
*/

const oldContent = fs.readFileSync(path, 'utf8');

// Let's count div tags
const openDivs = (oldContent.match(/<div(\s|>)/g) || []).length;
const closeDivs = (oldContent.match(/<\/div>/g) || []).length;
console.log(`Open divs: ${openDivs}, Close divs: ${closeDivs}`);

const openSections = (oldContent.match(/<section(\s|>)/g) || []).length;
const closeSections = (oldContent.match(/<\/section>/g) || []).length;
console.log(`Open sections: ${openSections}, Close sections: ${closeSections}`);

// If Open > Close, we are missing closing tags.
if (openDivs > closeDivs) {
    console.log(`Missing ${openDivs - closeDivs} closing div tags!`);
    // Let's find where they are missing. Most likely in the replacement.
} else if (closeDivs > openDivs) {
    console.log(`Extra ${closeDivs - openDivs} closing div tags!`);
}

// Let's print out the exact replacement area currently in the file
const lines = oldContent.split('\n');
console.log("Lines 40-80:");
for(let i=39; i<80; i++) {
    if(lines[i] !== undefined) console.log(`${i+1}: ${lines[i]}`);
}

