import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, Phone, MapPin, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const SUBJECTS = [
  "General Inquiry",
  "Property Listing Support",
  "Technical Issue",
  "Partnership Opportunity",
];

export default function Contact() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    subject: SUBJECTS[0],
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.message.trim()) {
      setErrorMsg("Please fill in all required fields.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }
      setStatus("success");
      setForm({ firstName: "", lastName: "", email: "", subject: SUBJECTS[0], message: "" });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold font-heading text-primary mb-4">Get in Touch</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Have questions about listing your property or finding your next home?
            Our team is here to help you every step of the way.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Contact Info Cards */}
          <div className="space-y-6">
            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold">Phone</h3>
                  <p className="text-sm text-muted-foreground">+254 713 361799</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold">Email</h3>
                  <p className="text-sm text-muted-foreground">support@inndos.com</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold">Office</h3>
                  <p className="text-sm text-muted-foreground">Nairobi, Kenya</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold">Hours</h3>
                  <p className="text-sm text-muted-foreground">Mon-Fri: 9am - 6pm EAT</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Send us a Message</CardTitle>
              <CardDescription>Fill out the form below and we'll get back to you within 24 hours.</CardDescription>
            </CardHeader>
            <CardContent>
              {status === "success" ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                  <CheckCircle className="h-14 w-14 text-green-500" />
                  <h3 className="text-xl font-semibold">Message Sent!</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Thank you for reaching out. We've received your message and will get back to you within 24 hours.
                  </p>
                  <Button variant="outline" onClick={() => setStatus("idle")}>
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="firstName" className="text-sm font-medium">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="John"
                        value={form.firstName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="lastName" className="text-sm font-medium">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Doe"
                        value={form.lastName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                    <select
                      id="subject"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      {SUBJECTS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-medium">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="How can we help you?"
                      className="min-h-[150px]"
                      value={form.message}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {status === "error" && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {errorMsg}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full md:w-auto bg-primary hover:bg-primary/90"
                    disabled={status === "loading"}
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
