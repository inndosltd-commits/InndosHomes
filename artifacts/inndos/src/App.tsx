import { Switch, Route, Router as WouterRouter } from "wouter";
import { useCallback, useEffect, useState, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Search from "@/pages/Search";
import Dashboard from "@/pages/Dashboard";
import PropertyDetails from "@/pages/PropertyDetails";
import Login from "@/pages/Login";
import Contact from "@/pages/Contact";
import Legal from "@/pages/Legal";
import Pricing from "@/pages/Pricing";
import AddListing from "@/pages/AddListing";
import BNB from "@/pages/BNB";
import Terms from "@/pages/Terms";
import AdminAnalytics from "@/pages/AdminAnalytics";
import AdminNotifications from "@/pages/AdminNotifications";
import ListerProfile from "@/pages/ListerProfile";
import { AuthProvider } from "./lib/auth";
import { CurrencyProvider } from "./lib/currency";
import { LanguageProvider } from "./lib/language";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

function useHashLocationWithQuery(): [string, (to: string) => void] {
  const getPath = () => {
    const hash = window.location.hash.replace(/^#/, "") || "/";
    return hash.split("?")[0] || "/";
  };

  const [path, setPath] = useState(getPath);

  useEffect(() => {
    const onHashChange = () => {
      setPath(getPath());
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  return [path, navigate];
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      <Route path="/about" component={About}/>
      <Route path="/search" component={Search}/>
      <Route path="/dashboard" component={Dashboard}/>
      <Route path="/login" component={Login}/>
      <Route path="/reset-password" component={Login}/>
      <Route path="/contact" component={Contact}/>
      <Route path="/pricing" component={Pricing}/>
      <Route path="/add-listing" component={AddListing}/>
      <Route path="/add-bnb">{() => { window.location.hash = "/add-listing"; return null; }}</Route>
      <Route path="/bnb" component={BNB}/>
      <Route path="/terms" component={Terms}/>
      <Route path="/privacy" component={Legal}/>
      <Route path="/help" component={Contact}/>
      <Route path="/property/:id" component={PropertyDetails}/>
       <Route path="/lister/:id" component={ListerProfile}/>
      <Route path="/properties/:id">{(params) => { window.location.hash = `/property/${params.id}`; return null; }}</Route>
      <Route path="/admin/analytics" component={AdminAnalytics}/>
      <Route path="/admin/notifications" component={AdminNotifications}/>
      <Route component={NotFound} />
    </Switch>
  );
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || "Unknown error" };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {}
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", padding: "2rem", background: "#fff" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ color: "#666", marginBottom: "1.5rem", maxWidth: 400, textAlign: "center" }}>{this.state.message}</p>
          <button onClick={() => { this.setState({ hasError: false, message: "" }); window.location.hash = "/"; }} style={{ padding: "0.5rem 1.5rem", background: "#000", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "1rem" }}>
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <CurrencyProvider>
          <WouterRouter hook={useHashLocationWithQuery}>
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <div className="pb-16 lg:pb-0">
                  <Router />
                </div>
                <CookieBanner />
                <MobileBottomNav />
              </TooltipProvider>
            </AuthProvider>
          </WouterRouter>
        </CurrencyProvider>
      </LanguageProvider>
    </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
