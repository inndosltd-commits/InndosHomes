import { Switch, Route, Router as WouterRouter } from "wouter";
import { useCallback, useEffect, useState } from "react";
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
import AddBNB from "@/pages/AddBNB";
import BNB from "@/pages/BNB";
import Terms from "@/pages/Terms";
import AdminAnalytics from "@/pages/AdminAnalytics";
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
    const onHashChange = () => setPath(getPath());
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
      <Route path="/contact" component={Contact}/>
      <Route path="/pricing" component={Pricing}/>
      <Route path="/add-listing" component={AddListing}/>
      <Route path="/add-bnb" component={AddBNB}/>
      <Route path="/bnb" component={BNB}/>
      <Route path="/terms" component={Terms}/>
      <Route path="/privacy" component={Legal}/>
      <Route path="/help" component={Contact}/>
      <Route path="/property/:id" component={PropertyDetails}/>
      <Route path="/admin/analytics" component={AdminAnalytics}/>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
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
  );
}

export default App;
