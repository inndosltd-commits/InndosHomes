import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";

export default function Legal() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-12">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-8 prose max-w-none">
            <h1 className="text-3xl font-bold font-heading text-primary mb-6">Terms of Service & Privacy Policy</h1>
            
            <p className="text-muted-foreground mb-8">Last updated: November 25, 2025</p>

            <h2 className="text-xl font-bold mt-8 mb-4">1. Introduction</h2>
            <p>Welcome to INNDOS. By using our website and services, you agree to comply with and be bound by the following terms and conditions. Please review the following terms carefully.</p>

            <h2 className="text-xl font-bold mt-8 mb-4">2. Property Listings</h2>
            <p>INNDOS provides a platform for property owners to list properties for rent or sale. We verify listings to the best of our ability but cannot guarantee the accuracy of all information provided by third parties.</p>

            <h2 className="text-xl font-bold mt-8 mb-4">3. User Responsibilities</h2>
            <p>Users are responsible for maintaining the confidentiality of their account information and for all activities that occur under their account.</p>

            <h2 className="text-xl font-bold mt-8 mb-4">4. Privacy Policy</h2>
            <p>We respect your privacy and are committed to protecting your personal data. We collect information such as your name, contact details, and property preferences to provide our services.</p>
            
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>We do not sell your personal data to third parties.</li>
              <li>We use industry-standard security measures to protect your information.</li>
              <li>You have the right to access, correct, or delete your personal data.</li>
            </ul>

            <h2 className="text-xl font-bold mt-8 mb-4">5. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at support@inndos.com or visit our office in Nairobi, Kenya.</p>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
