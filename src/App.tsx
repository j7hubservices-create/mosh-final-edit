import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Auth from "./pages/Auth";
import UserAuth from "./pages/UserAuth";
import Contact from "./pages/Contact";
import Admin from "./pages/Admin";
import AdminSections from "./pages/AdminSections";
import Account from "./pages/Account";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Returns from "./pages/Returns";
import NotFound from "./pages/NotFound";

// ✅ New import for Size Chart page
import SizeChart from "./pages/SizeChart";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/user-auth" element={<UserAuth />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/sections" element={<AdminSections />} />
          <Route path="/account" element={<Account />} />
          <Route path="/about" element={<About />} />
          
          {/* ✅ Added Size Chart Route */}
          <Route path="/size-chart" element={<SizeChart />} />
          
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

