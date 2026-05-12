import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 prose max-w-none">
          <h1 className="text-3xl font-bold font-heading mb-6">Terms and Conditions for inndos Online Rental System</h1>
          <p className="text-sm text-gray-500 mb-8">Last Updated: November 27, 2025</p>

          <p>Welcome to inndos, an online marketplace platform designed to connect property owners, tenants, buyers, and agents for rentals, leases, and sales of properties including apartments, houses, shops, hotels, and other spaces. By accessing or using the inndos platform (the "Platform"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, you must not use the Platform.</p>

          <p>inndos is operated by inndos Company ("we," "us," or "our"). These Terms govern your use of the Platform, including any services, features, or content provided therein. We reserve the right to update these Terms at any time, and we will notify users of material changes via email or through the Platform. Your continued use of the Platform after such changes constitutes acceptance of the updated Terms.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">1. Definitions</h2>
          <ul className="list-disc pl-6 space-y-2 mb-6">
            <li><strong>User:</strong> Any individual or entity accessing or using the Platform, including but not limited to Apartment Owners, Tenants, Property Owners, Hotel Owners, Shop Owners, and Property Agents.</li>
            <li><strong>Apartment Owners:</strong> Users renting out apartments on a daily (e.g., B&B), monthly, quarterly, or yearly basis.</li>
            <li><strong>Tenants:</strong> Users seeking properties for rent on a daily, monthly, quarterly, or yearly basis.</li>
            <li><strong>Property Owners:</strong> Users listing properties for sale or short/long-term rental.</li>
            <li><strong>Hotel Owners:</strong> Users listing hotel rooms for daily rental.</li>
            <li><strong>Shop Owners:</strong> Users leasing or letting out shop spaces on an area-based or rental term basis.</li>
            <li><strong>Property Agents:</strong> Users listing properties on behalf of other Users.</li>
            <li><strong>Listing:</strong> Any advertisement or posting of a property, room, or space on the Platform for rental, lease, or sale.</li>
            <li><strong>Verification Documents:</strong> Includes contact information, email address, identification document (e.g., ID or passport), and a passport-sized photo.</li>
            <li><strong>Platform:</strong> The inndos website, mobile applications, and related services.</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-4">2. Eligibility and User Accounts</h2>
          <p>To use the Platform, you must be at least 18 years old or the age of majority in your jurisdiction, whichever is higher, and capable of forming a binding contract. You must provide accurate and complete information during registration.</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">2.1 Account Creation and Verification</h3>
          <p className="mb-4">All Users must voluntarily provide Verification Documents for account approval. This includes your contact details, email, ID or passport, and a passport-sized photo. For companies, users must provide up to date documentation for account creation and verification, including a copy of your business permit, company registration certificate, KRA Pin, CR12 for registered business. Inndos shall conduct background screening and vetting before account approvals.</p>
          <p className="mb-4">Contact information provided will be made available to other Users viewing your Listings or profiles to facilitate direct communication.</p>
          <p className="mb-4">Accounts without complete and verifiable Verification Documents will not be approved or activated.</p>
          <p className="mb-4">You are responsible for maintaining the confidentiality of your account credentials and for all activities occurring under your account.</p>
          <p className="mb-4">Inndos reserves the right to suspend or terminate accounts where there is reasonable suspicion of fraud, violation of these terms or failure to comply with verification requirements.</p>
          <p className="mb-4">While Inndos may undertake basic verification procedures, it does not guarantee the authenticity, legality or accuracy of any listing.</p>
          <p className="mb-6">Inndos reserves the right to introduce service fees, listing fees or commission charges upon prior notice to users.</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">2.2 Onboarding and Compliance</h3>
          <p className="mb-4">Successfully on-boarded Users must abide by all Platform requirements, including quality standards for images and content.</p>
          <p className="mb-4">Any images or photos uploaded (e.g., property photos or profile pictures) that do not comply with inndos's standards of quality, relevance, or purpose will not be accepted and may result in the rejection of the Listing or account suspension.</p>
          <p className="mb-6">You agree to update your information promptly if it changes.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">3. Use of the Platform</h2>
          <p className="mb-4">The Platform acts as a marketplace to connect Users, such as landlords with tenants, sellers with buyers, or agents with clients. inndos does not own, control, or endorse any properties or transactions; it merely facilitates connections.</p>
          <p className="mb-4">Inndos does not act as a real estate broker, agent or property Manager and does not participate in negotiations or transactions between users.</p>
          <p className="mb-4">Inndos does not verify ownership of properties, legal title or authority to list properties. Users are responsible for conducting their own due diligence before entering into any transaction.</p>
          <p className="mb-4">Property owners and agents are solely responsible for ensuring that their listings comply with applicable tenancy laws and regulations.</p>
          <p className="mb-6">Inndos reserves the right to remove or modify listings that are inaccurate, misleading, fraudulent, unlawful or inconsistent with platform policies.</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">3.1 Listings and Transactions</h3>
          <ul className="list-disc pl-6 space-y-2 mb-6">
            <li>Users may create Listings for properties, ensuring all information is accurate, complete, and not misleading.</li>
            <li>Prices listed on the platform must be the exact prices that will be charged. To avoid user conflicts and transparency, property listers are advised to review and update their prices reguraly.</li>
            <li>Apartment Owners, Property Owners, Hotel Owners, Shop Owners, and Property Agents may list properties for rental (daily, monthly, quarterly, yearly), lease, or sale.</li>
            <li>Tenants and buyers may browse and contact listers directly using the provided contact information.</li>
            <li>All transactions (e.g., rentals, sales) are between Users and are governed by separate contracts and agreements outside the Platform. Inndos is not a party to these transactions. Therefore, any payments and refunds shall be conducted directly by the users of the platform.</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-3">3.2 User Conduct</h3>
          <p className="mb-2">You agree not to use the Platform for any unlawful, fraudulent, or harmful purpose, including scamming, harassment, or misrepresentation.</p>
          <p className="mb-2">Prohibited activities include, but are not limited to:</p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Posting false or misleading Listings.</li>
            <li>Using the Platform to solicit or engage in illegal activities.</li>
            <li>Violating intellectual property rights or privacy laws.</li>
            <li>Uploading harmful content, such as viruses or malware.</li>
          </ul>
          <p className="mb-4">Any User found scamming or misusing the Platform will be investigated, and if verified as a scammer, may be reported and handed over to relevant law enforcement agencies.</p>
          <p className="mb-4">You must comply with all applicable laws in your jurisdiction regarding property transactions, rentals, and data sharing.</p>
          <p className="mb-4">Users are responsible for ensuring the authenticity of the information they provide. Inndos shall not be liable for any misrepresentation by Users.</p>
          <p className="mb-6">By creating a listing, users consent to their contact information being displayed to other users for purpose of facilitating transactions.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">4. Company Responsibilities and Liabilities</h2>
          <h3 className="text-lg font-semibold mt-6 mb-3">4.1 No Liability for User Actions</h3>
          <ul className="list-disc pl-6 space-y-2 mb-6">
            <li>inndos is not responsible for any damages, losses, inconveniences, or disputes arising from interactions between Users, including failed transactions, property conditions, or fraudulent activities.</li>
            <li>We do not guarantee the accuracy, quality, or legality of Listings or User-provided information.</li>
            <li>Users engage with each other at their own risk.</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-3">4.2 Assistance in Investigations</h3>
          <p className="mb-4">Where necessary, inndos may provide User data to law enforcement or relevant authorities if a User is suspected of scamming or inappropriate use of the Platform, in accordance with these Terms and applicable laws.</p>
          <p className="mb-6">For any other requests for User information from agencies or third parties, a valid court order must be provided. inndos will verify the order before releasing any data.</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">4.3 Data Security and Privacy</h3>
          <p className="mb-4">inndos takes reasonable measures to protect User data, but we cannot guarantee absolute security.</p>
          <p className="mb-4">By using the Platform, you consent to the collection, use, and sharing of your information as described in our Privacy Policy (incorporated herein by reference).</p>
          <p className="mb-4">Any User, administrator, or employee found leaking or sharing confidential User data without authorization will be subject to disciplinary action, termination, and potential handover to law enforcement or other agencies in their jurisdiction.</p>
          <p className="mb-6">Personal data shall be processed in accordance with Data Protection Act, 2019 of Kenya.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">5. Intellectual Property</h2>
          <p className="mb-4">All content on the Platform, including text, graphics, logos, and software, is owned by inndos or its licensors and protected by intellectual property laws. You may not copy, modify, or distribute Platform content without our written consent.</p>
          <p className="mb-6">Users grant inndos a non-exclusive, royalty-free license to use, display, and distribute any content they upload (e.g., Listings, photos) for Platform operations.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">6. Termination and Suspension</h2>
          <p className="mb-6">inndos may suspend or terminate your account at any time for violations of these Terms, including non-compliance with verification requirements or prohibited conduct. Upon termination, you must cease all use of the Platform, and any outstanding obligations remain in effect.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">7. Indemnification</h2>
          <p className="mb-6">You agree to indemnify and hold harmless inndos, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Platform, violations of these Terms, or disputes with other Users.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">8. Disclaimer of Warranties</h2>
          <p className="mb-6">The Platform is provided "as is" without warranties of any kind, express or implied, including fitness for a particular purpose or non-infringement.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">9. Limitation of Liability</h2>
          <p className="mb-6">In no event shall inndos be liable for indirect, incidental, special, or consequential damages arising from your use of the Platform, even if advised of the possibility of such damages. Our total liability shall not exceed the fees paid by you to inndos in the preceding 12 months.</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">Indemnity</h3>
          <p className="mb-6">You agree to indemnify Inndos and its officers, directors, employees and agents harmless from any and all claims, demands, losses, liabilities, and expenses (including attorneys' fees) arising out of or in connection with: (i) your use of the Services or services or goods obtained through your use of the Services; (ii) your breach or violation of any of these Terms; (iii) Inndo's use of your User Content; or (iv) your violation of the rights of any third party.</p>

          <h3 className="text-lg font-semibold mt-6 mb-3">Force Majeure</h3>
          <p className="mb-6">Inndos shall not be liable for failure or delay in performance due to events beyond its reasonable control e.g Natural disasters, Acts of God, Terrorism, Acts of War, internet outages, strikes, governmental actions etc.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">10. Governing Law and Dispute Resolution</h2>
          <p className="mb-6">These Terms are governed by the laws of Kenya. Any disputes arising from these Terms shall be resolved through binding arbitration in Kenya or in a court of competent jurisdiction if arbitration is not enforceable.</p>

          <h2 className="text-xl font-bold mt-8 mb-4">11. Miscellaneous</h2>
          <ul className="list-disc pl-6 space-y-2 mb-6">
            <li><strong>Severability:</strong> If any provision of these Terms is held invalid, the remainder shall continue in full force.</li>
            <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and inndos.</li>
            <li><strong>Contact:</strong> For questions about these Terms, contact us at support@inndos.com.</li>
          </ul>

          <p className="font-semibold text-lg mt-8 pt-6 border-t">By using the Platform, you acknowledge that you have read, understood, and agree to these Terms and Conditions.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
