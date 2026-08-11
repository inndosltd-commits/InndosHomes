import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      
      <div className="bg-primary text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4">About inndos</h1>
          <p className="text-xl max-w-2xl mx-auto opacity-90">Direct from owner to you. Simple. Fair. Kenyan.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="bg-white rounded-xl shadow-sm p-8 md:p-12 mb-12 border border-gray-100">
          <div className="prose prose-lg max-w-none text-gray-700">
            <p className="text-xl leading-relaxed mb-6 font-medium text-gray-900">
              House hunting in Kenya is broken. Agents take 1-2 months' rent in fees. Listings are fake or hidden. You waste weeks calling numbers that never answer.
            </p>
            <p className="text-lg mb-6">
              <strong className="text-primary">inndos fixes that.</strong>
            </p>
            <p className="mb-6">
              We connect you directly to property owners — no middlemen, no commissions, no drama.
            </p>
            <p className="mb-6">
              Open the app and instantly see B&Bs and rentals around you. Filter amenities like WiFi, security, parking, gym. Chat the owner straight away.
            </p>
            <p className="mb-8">
              Whether you need a same-night B&B or a long-term keja, it's all in one place.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* B&B */}
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 hover:border-primary/30 transition-colors">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 font-heading">B&B – Stay Tonight</h2>
            <p className="text-gray-600 mb-4">Late out? Flight delayed? Need a safe spot right now?</p>
            <p className="text-gray-600 mb-4">inndos shows available B&Bs the moment you open the app.</p>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 mb-6">
              <li>Map lights up with options near you</li>
              <li>Filter: clean bedding, WiFi, hot shower, secure parking</li>
              <li>Chat owner directly</li>
              <li>Book and pay via M-Pesa instantly</li>
            </ul>
            <p className="font-medium text-gray-900 mb-2">No crazy mark-ups. No middlemen.</p>
            <p className="text-sm text-gray-500">List your extra room as a B&B and earn extra cash with zero fees. inndos — your spot tonight, direct from the owner.</p>
          </div>

          {/* Rent */}
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 hover:border-primary/30 transition-colors">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 font-heading">Rent – Find Your Keja</h2>
            <p className="text-gray-600 mb-4">Tired of agents eating your money?</p>
            <p className="text-gray-600 mb-4">inndos lets you find bedsitters, 1-2 bedroom units straight from the owner.</p>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 mb-6">
              <li>Instant map with units around you</li>
              <li>Filter exactly what you want: water tank, WiFi, gym, parking, security</li>
              <li>Chat owner directly</li>
              <li>Move in faster, save thousands</li>
            </ul>
            <p className="font-medium text-gray-900 mb-2">Landlords: List free. Get serious tenants the same day. Keep 100% of the rent.</p>
            <p className="text-sm text-gray-500">No middlemen. No commission. Just your next keja.</p>
          </div>

          {/* Buy */}
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 hover:border-primary/30 transition-colors">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 font-heading">Buy – Direct from Owner</h2>
            <p className="text-gray-600 mb-4">Want to buy a house, apartment or plot without agent fees?</p>
            <p className="text-gray-600 mb-4">inndos connects you straight to real owners.</p>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 mb-6">
              <li>Verified listings</li>
              <li>Filter by location, size, amenities and price</li>
              <li>Chat seller directly</li>
              <li>Negotiate with no middleman drama</li>
            </ul>
            <p className="font-medium text-gray-900 mb-2">Buyers save money. Sellers reach genuine buyers free.</p>
            <p className="text-sm text-gray-500">Direct. Transparent. No commissions.</p>
          </div>

          {/* Hostels */}
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 hover:border-primary/30 transition-colors">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 font-heading">Hostels – Affordable Stays</h2>
            <p className="text-gray-600 mb-4">Student or on a tight budget?</p>
            <p className="text-gray-600 mb-4">inndos has hostels listed directly by owners.</p>
            <ul className="list-disc pl-5 space-y-2 text-gray-600 mb-6">
              <li>See hostels near universities instantly</li>
              <li>Filter by price, WiFi, security, meals, room type</li>
              <li>Chat owner/manager directly</li>
              <li>No agent fees</li>
            </ul>
            <p className="font-medium text-gray-900 mb-2">Perfect for JKUAT, UoN, Kenyatta or anywhere.</p>
            <p className="text-sm text-gray-500">Hostel owners: List free. Fill rooms faster with serious students. Cheap. Safe. Direct from the owner.</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
