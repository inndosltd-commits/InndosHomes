import fs from 'fs';

const path = 'client/src/pages/PropertyDetails.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix Image Gallery
const oldGallery = `{/* Image Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 h-[400px] md:h-[500px] gap-1">
        <div className="h-full bg-gray-200">
           <img src={property.image} className="w-full h-full object-cover hover:brightness-110 transition-all cursor-pointer" />
        </div>
        <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full">`;

const newGallery = `{/* Image Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 h-[300px] md:h-[500px] gap-1">
        <div className="h-full bg-gray-200 relative">
           <img src={property.image} className="w-full h-full object-cover hover:brightness-110 transition-all cursor-pointer" />
           <div className="md:hidden absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
             1/5
           </div>
        </div>
        <div className="hidden md:grid grid-cols-2 grid-rows-2 gap-1 h-full">`;

if (content.includes(oldGallery)) {
    content = content.replace(oldGallery, newGallery);
    console.log("Replaced Image Gallery");
} else {
    console.log("Could not find Image Gallery");
}

// Fix Title and Price Section
const oldTitle = `<div className="flex justify-between items-start mb-4">
               <div>
                 <div className="flex items-center gap-2 mb-2">`;

const newTitle = `<div className="flex flex-col lg:flex-row justify-between items-start mb-6 gap-4">
               <div className="w-full lg:w-auto">
                 <div className="flex flex-wrap items-center gap-2 mb-3">`;

if (content.includes(oldTitle)) {
    content = content.replace(oldTitle, newTitle);
    console.log("Replaced Title section");
} else {
    console.log("Could not find Title section");
}

const oldPrice = `               <div className="text-right">
                 <div className="text-3xl font-bold text-primary">`;

const newPrice = `               <div className="w-full lg:w-auto lg:text-right">
                 <div className="text-3xl font-bold text-primary">`;

if (content.includes(oldPrice)) {
    content = content.replace(oldPrice, newPrice);
    console.log("Replaced Price section");
}

// Fix Stats Row
const oldStats = `<div className="flex items-center justify-between py-6 border-y border-gray-200 mb-8">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="font-bold text-xl flex items-center justify-center gap-2"><BedDouble className="h-5 w-5 text-gray-400"/> {property.specs.beds}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">{t('prop.bedrooms')}</div>
                  </div>
                  <div className="w-px h-10 bg-gray-200"></div>
                  <div className="text-center">
                    <div className="font-bold text-xl flex items-center justify-center gap-2"><Bath className="h-5 w-5 text-gray-400"/> {property.specs.baths}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">{t('prop.bathrooms')}</div>
                  </div>
                  <div className="w-px h-10 bg-gray-200"></div>
                  <div className="text-center">
                    <div className="font-bold text-xl flex items-center justify-center gap-2"><Square className="h-5 w-5 text-gray-400"/> {property.specs.sqft}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">{t('prop.sqft')}</div>
                  </div>
                </div>
                <div className="flex gap-2">`;

const newStats = `<div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 sm:py-6 border-y border-gray-200 mb-8 gap-4 sm:gap-0">
                <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto sm:gap-8">
                  <div className="text-center">
                    <div className="font-bold text-lg sm:text-xl flex items-center justify-center gap-1 sm:gap-2"><BedDouble className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"/> {property.specs.beds}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{t('prop.bedrooms')}</div>
                  </div>
                  <div className="w-px h-8 sm:h-10 bg-gray-200"></div>
                  <div className="text-center">
                    <div className="font-bold text-lg sm:text-xl flex items-center justify-center gap-1 sm:gap-2"><Bath className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"/> {property.specs.baths}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{t('prop.bathrooms')}</div>
                  </div>
                  <div className="w-px h-8 sm:h-10 bg-gray-200"></div>
                  <div className="text-center">
                    <div className="font-bold text-lg sm:text-xl flex items-center justify-center gap-1 sm:gap-2"><Square className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400"/> {property.specs.sqft}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">{t('prop.sqft')}</div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end w-full sm:w-auto border-t sm:border-0 border-gray-100 pt-4 sm:pt-0 mt-2 sm:mt-0">`;

if (content.includes(oldStats)) {
    content = content.replace(oldStats, newStats);
    console.log("Replaced Stats section");
} else {
    console.log("Could not find Stats section");
}

fs.writeFileSync(path, content);
