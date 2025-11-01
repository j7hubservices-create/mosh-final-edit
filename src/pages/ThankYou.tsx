import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle, CreditCard, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client"; // ✅ make sure this path is correct

export default function ThankYou() {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestOrder = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(*))")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("Error fetching latest order:", error);
      } else {
        setOrder(data);
      }
      setLoading(false);
    };

    fetchLatestOrder();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-600">
        Loading your order details...
      </div>
    );

  if (!order)
    return (
      <div className="flex flex-col justify-center items-center h-screen text-gray-600">
        <p>No recent order found.</p>
        <a href="/" className="text-purple-600 hover:underline mt-4">
          Back to Home
        </a>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-8">
          {/* ✅ Header */}
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-purple-700 mb-2">
              Thank You for Your Order!
            </h1>
            <p className="text-gray-600">
              Your order has been received and is pending payment confirmation.
            </p>
          </div>

          {/* ✅ Order Summary */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 text-purple-700">
              Order Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
              <p><strong>Order Number:</strong> {order.short_order_id || order.id}</p>
              <p><strong>Status:</strong> {order.status}</p>
              <p><strong>Total:</strong> ₦{Number(order.total).toLocaleString()}</p>
              <p><strong>Created At:</strong> {new Date(order.created_at).toLocaleString()}</p>
              <p><strong>Delivery Method:</strong> {order.delivery_method}</p>
              <p><strong>Payment Method:</strong> {order.payment_method}</p>
            </div>
          </div>

          {/* ✅ Customer Info */}
          <div className="mb-8 border-t pt-4">
            <h2 className="text-xl font-semibold mb-4 text-purple-700">
              Your Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
              <p><strong>Name:</strong> {order.customer_name}</p>
              <p><strong>Email:</strong> {order.customer_email}</p>
              <p><strong>Phone:</strong> {order.customer_phone}</p>
              <p><strong>Address:</strong> {order.customer_address}</p>
            </div>
          </div>

          {/* ✅ Ordered Items */}
          <div className="mb-8 border-t pt-4">
            <h2 className="text-xl font-semibold mb-4 text-purple-700">
              Ordered Items
            </h2>
            <div className="space-y-3">
              {order.order_items?.length > 0 ? (
                order.order_items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border rounded-lg p-3 bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={item.products?.image_url || "/placeholder.jpg"}
                        alt={item.products?.name || "Product"}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div>
                        <p className="font-medium">{item.products?.name || item.name}</p>
                        <p className="text-sm text-gray-600">
                          Qty: {item.quantity} × ₦{item.price?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-purple-700">
                      ₦{(item.quantity * item.price).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No items found in this order.</p>
              )}
            </div>
          </div>

          {/* ✅ Payment Instructions */}
          <div className="mb-8 border-t pt-4">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 text-purple-700">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Payment Instructions
            </h2>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Bank Name:</strong> OPay</p>
              <p><strong>Account Name:</strong> Mosh Apparels Ventures</p>
              <p><strong>Account Number:</strong> 6142257816</p>
              <p>
                Use your <strong>name or order number</strong> as payment reference.
              </p>
            </div>
          </div>

          {/* ✅ Delivery Info */}
          <div className="mb-8 border-t pt-4">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 text-purple-700">
              <MapPin className="w-5 h-5 text-purple-600" />
              Delivery
            </h2>
            <p className="text-sm text-gray-700">
              Your order will be delivered according to the method you selected at checkout.
            </p>
          </div>

          {/* ✅ Buttons */}
          <div className="flex flex-col md:flex-row gap-3 justify-center">
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white w-full md:w-auto"
              onClick={() => (window.location.href = "/")}
            >
              Back to Home
            </Button>
            <Button
              variant="outline"
              className="w-full md:w-auto"
              onClick={() => window.print()}
            >
              Print Order
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
