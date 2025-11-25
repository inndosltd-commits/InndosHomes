import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Search from "@/pages/Search";
import Dashboard from "@/pages/Dashboard";
import PropertyDetails from "@/pages/PropertyDetails";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      <Route path="/search" component={Search}/>
      <Route path="/dashboard" component={Dashboard}/>
      <Route path="/property/:id" component={PropertyDetails}/>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
