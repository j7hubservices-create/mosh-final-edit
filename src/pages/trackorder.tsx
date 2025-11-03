import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Truck, CheckCircle, Package, Clock } from "lucide-react";

const steps = [
  { key: "processing", label: "Processing", icon: Clock },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "completed", label: "Delivered", icon: CheckCircle },
];

const TrackOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Redirect if user visits the old route /track-out/:id
  useEffect(() => {
    if (location.pathname.startsWith("/track-out")) {
      navigate(`/track-order/${orderId}`, { replace: true });
    }
  }, [location, orderId, navigate]);

  useEffect(() => {
    if (orderId) getOrder(orderId);
  }, [orderId]);

  const getOrder = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          products (id, name, image_url)
        )
      `)
      .or(`short_order_id.eq.${id},id.eq.${id}`)
      .maybeSingle();

    if (error) console.error(error);
    setOrder(data);
    setLoading(false);
  };

  if (loading)
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Loading order...
        </div>
        <Footer />
      </div>
    );

  if (!order)
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Package className="w-16 h-16 text-gray-400 mb-4" />
          <h1 className="text-xl font-semibold mb-2">Order not found</h1>
          <p className="text-gray-500 mb-6">
            We couldn’t find any order with ID <strong>{orderId}</strong>.
          </p>
          <Button onClick={() => navigate("/account")}>Go Back</Button>
        </div>
        <Footer />
      </div>
    );

  const currentStep = steps.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8 flex-1">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-2">Order Tracking</h1>
          <p className="text-sm text-gray-500 mb-6">
            Tracking ID: <strong>{order.short_order_id || order.id}</strong>
          </p>

          {/* Progress */}
          <div className="flex items-center justify-between mb-10">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const active = i <= currentStep;
              return (
                <div
                  key={step.key}
                  className="flex flex-col items-center flex-1 relative"
                >
                  <div
                    className={`rounded-full p-3 ${
                      active
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div
                    className={`text-sm mt-2 ${
                      active ? "text-green-700 font-medium" : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`absolute top-5 left-[55%] w-full h-1 ${
                        active ? "bg-green-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Order summary */}
          <div className="border rounded-lg p-4 mb-6 bg-white">
            <h2 className="font-semibold mb-2">Order Summary</h2>
            <p>
              <strong>Name:</strong> {order.customer_name}
            </p>
            <p>
              <strong>Phone:</strong> {order.customer_phone || "—"}
            </p>
            <p>
              <strong>Address:</strong> {order.customer_address || "—"}
            </p>
            <p>
              <strong>Total:</strong> ₦{Number(order.total).toLocaleString()}
            </p>
            <p>
              <strong>Status:</strong> {order.status}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Placed on {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          {/* Items */}
          <div>
            <h3 className="font-semibold mb-3">Items</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {order.order_items?.map((it: any) => (
                <div
                  key={it.id}
                  className="border rounded-md p-3 flex gap-3 bg-white"
                >
                  <img
                    src={it.products?.image_url || "/placeholder.jpg"}
                    alt={it.products?.name}
                    className="w-20 h-20 object-cover rounded-md"
                    onError={(e: any) =>
                      (e.currentTarget.src = "/placeholder.jpg")
                    }
                  />
                  <div className="flex-1">
                    <div className="font-medium">{it.products?.name}</div>
                    <div className="text-sm text-gray-500">
                      Qty: {it.quantity} × ₦
                      {Number(it.price).toLocaleString()}
                    </div>
                    <div className="text-sm font-semibold mt-1">
                      ₦{(it.price * it.quantity).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default TrackOrder;
