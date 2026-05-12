import fs from 'fs';

const path = 'client/src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Ensure admin verification UI is clear. We already have handleVerifyUser and handleApprove.
// Let's add a "Verified by Inndos" badge and clear UI in Dashboard for admin.

// Adding explicit Verified By Inndos Badge logic to PropertyDetails
const pathDetails = 'client/src/pages/PropertyDetails.tsx';
let contentDetails = fs.readFileSync(pathDetails, 'utf8');

if (!contentDetails.includes('Verified by Inndos')) {
    const verifiedBadgeOld = /\{property.isVerified && \(\s*<Badge variant="outline" className="border-green-600 text-green-600 flex items-center gap-1">\s*<CheckCircle className="h-3 w-3" \/> \{t\('prop.verified'\)\}\s*<\/Badge>\s*\)\}/;
    const verifiedBadgeNew = `{property.isVerified && (
                     <Badge variant="outline" className="border-green-600 bg-green-50 text-green-700 flex items-center gap-1 px-3 py-1 shadow-sm">
                       <ShieldCheck className="h-4 w-4" /> Verified by Inndos
                     </Badge>
                   )}`;
    
    // Need to make sure ShieldCheck is imported
    if (!contentDetails.includes('ShieldCheck')) {
        contentDetails = contentDetails.replace('CheckCircle, Calendar', 'CheckCircle, Calendar, ShieldCheck');
    }
    
    contentDetails = contentDetails.replace(verifiedBadgeOld, verifiedBadgeNew);
    fs.writeFileSync(pathDetails, contentDetails);
    console.log("Updated Verification Badge in PropertyDetails");
}

