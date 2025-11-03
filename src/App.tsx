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
import ThankYou from "@/pages/ThankYou";
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
import SizeChart from "./pages/SizeChart"; // ✅ Size Chart page
import TrackOrder from "./pages/trackorder"; // ✅ Track Order page

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
          {/* ✅ Main Routes */}
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
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/returns" element={<Returns />} />

          {/* ✅ Size Chart Route */}
          <Route path="/size-chart" element={<SizeChart />} />

          {/* ✅ Thank You Routes (Both Formats) */}
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/thank-you/:id" element={<ThankYou />} />
          <Route path="/thankyou" element={<ThankYou />} />
          <Route path="/thankyou/:id" element={<ThankYou />} />

         {/* ✅ Order Tracking Routes (supporting multiple URL formats) */}
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/track-order/:orderId" element={<TrackOrder />} />
          <Route path="/trackout" element={<TrackOrder />} />
          <Route path="/trackout/:orderId" element={<TrackOrder />} />
          <Route path="/trackorder" element={<TrackOrder />} />
          <Route path="/trackorder/:orderId" element={<TrackOrder />} />


          {/* ✅ 404 Page (Keep this last) */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
