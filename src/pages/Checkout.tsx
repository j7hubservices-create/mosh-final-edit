import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Truck, Store, MapPin, Package, CreditCard, Banknote } from "lucide-react";

const checkoutSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().optional(),
  deliveryMethod: z.string(),
});

const Checkout = () => {
  const navigate = useNavigate();
  const paymentRef = useRef<HTMLDivElement | null>(null);

  const [user, setUser] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedPayment, setSelectedPayment] = useState<"card" | "bank" | "none">("none");
  const [showBankModal, setShowBankModal] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    deliveryMethod: "doorstep" as "doorstep" | "park" | "pickup",
  });

  const [cardData, setCardData] = useState({
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchCart(session.user.id);
        setFormData((prev) => ({ ...prev, email: session.user.email || "" }));
      } else {
        fetchGuestCart();
      }
    });
    // no deps - run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCart = async (userId: string) => {
    const { data } = await supabase
      .from("cart_items")
      .select("*, products (*)")
      .eq("user_id", userId);

    if (!data?.length) {
      navigate("/cart");
    } else {
      setCartItems(data);
    }
    setLoading(false);
  };

  const fetchGuestCart = async () => {
    setLoading(true);
    const guestCart = JSON.parse(localStorage.getItem("guestCart") || "[]");
    if (!guestCart.length) {
      navigate("/cart");
      return;
    }

    const productIds = guestCart.map((i: any) => i.product_id);
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);

    if (products) {
      const cartData = guestCart
        .map((item: any) => ({
          id: item.product_id,
          product_id: item.product_id,
          quantity: item.quantity,
          products: products.find((p: any) => p.id === item.product_id),
        }))
        .filter((x: any) => x.products);
      setCartItems(cartData);
    }
    setLoading(false);
  };

  const getTotalPrice = () =>
    cartItems.reduce((total, item) => total + item.products.price * item.quantity, 0);

  // Save delivery details and scroll to payment area
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      checkoutSchema.parse(formData);
      toast.success("Delivery details saved. Please select a payment option below.");
      // scroll payment into view for user
      setTimeout(() => {
        paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    } catch (err) {
      if (err instanceof z.ZodError) toast.error(err.errors[0].message);
    }
  };

  // Handles both bank confirmation and card (simulated) payments
  const handlePayNow = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // ensure delivery details valid
    try {
      checkoutSchema.parse(formData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error("Please complete delivery details: " + err.errors[0].message);
        return;
      }
    }

    if (selectedPayment === "none") {
      toast.error("Please select a payment method");
      return;
    }

    // If card, validate fields
    if (selectedPayment === "card") {
      if (!cardData.cardName.trim()) {
        toast.error("Enter cardholder name");
        return;
      }
      const digits = cardData.cardNumber.replace(/\D/g, "");
      if (digits.length < 16) {
        toast.error("Enter a valid 16-digit card number");
        return;
      }
      if (!cardData.expiry.trim() || !/^\d{2}\/\d{2}$/.test(cardData.expiry)) {
        toast.error("Enter valid expiry (MM/YY)");
        return;
      }
      if (!cardData.cvv.trim() || cardData.cvv.length < 3) {
        toast.error("Enter valid CVV");
        return;
      }
    }

    setSubmitting(true);

    try {
      // Prepare order payload
      const orderPayload = {
        user_id: user?.id ?? null,
        total: getTotalPrice(),
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: formData.phone,
        customer_address:
          formData.deliveryMethod === "doorstep"
            ? formData.address
            : formData.deliveryMethod === "park"
            ? `Park: ${formData.address}`
            : "Pickup - 9, Bolanle Awosika Street, Coca Cola Road, Oju Oore, Ota, Ogun State",
        delivery_method: formData.deliveryMethod,
        payment_method: selectedPayment === "card" ? "card" : "bank_transfer",
        status: selectedPayment === "card" ? "paid" : "pending",
      };

      // Insert order
      const { data: order, error: orderError } = await supabase.from("orders").insert(orderPayload).select().single();
      if (orderError) throw orderError;

      // Insert order_items
      const orderItems = cartItems.map((it) => ({
        order_id: order.id,
        product_id: it.product_id,
        quantity: it.quantity,
        price: it.products.price,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      // Clear cart (if logged in) or localStorage
      if (user) {
        await supabase.from("cart_items").delete().eq("user_id", user.id);
      } else {
        localStorage.removeItem("guestCart");
      }

      // If bank transfer — show modal with instructions, set order pending
      if (selectedPayment === "bank") {
        setShowBankModal(true);
      } else {
        // card paid
        toast.success("Payment successful! Order confirmed.");
        window.dispatchEvent(new Event("cart-updated"));
        navigate("/thank-you");
      }
    } catch (err: any) {
      toast.error(err?.message || "Payment / order failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="bg-purple-50 border border-purple-100 text-purple-800 text-sm py-3 px-4 rounded-md mb-6 text-center">
          ⚠️ Please make sure you <strong>screenshot your order</strong> or save your order reference.
        </div>

        <h1 className="text-3xl font-bold mb-6 text-center">Checkout</h1>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* ORDER SUMMARY & PAYMENT (shown first on mobile) */}
          <div className="order-1 lg:order-2 lg:col-span-1">
            <Card className="p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">Order Summary</h2>

              <div className="space-y-3 mb-4">
                {cartItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items in cart.</p>
                ) : (
                  cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-start text-sm">
                      <div className="flex-1">
                        <div className="font-medium">{item.products.name}</div>
                        <div className="text-xs text-muted-foreground">Qty: {item.quantity}</div>
                      </div>
                      <div className="font-semibold">
                        ₦{(item.products.price * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-between items-center font-bold text-lg border-t pt-3 mb-4">
                <span>Total</span>
                <span className="text-purple-700">₦{getTotalPrice().toLocaleString()}</span>
              </div>

              {/* payment area */}
              <div ref={paymentRef}>
                <h3 className="text-lg font-semibold mb-3">Payment</h3>

                {/* Bank transfer (always visible) */}
                <div
                  role="radio"
                  aria-checked={selectedPayment === "bank"}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedPayment("bank");
                    }
                  }}
                  onClick={() => setSelectedPayment("bank")}
                  className={`border rounded-lg p-4 mb-3 bg-white cursor-pointer ${selectedPayment === "bank" ? "ring-2 ring-purple-500" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Banknote className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium">Bank Transfer</div>
                        <div className="text-xs text-muted-foreground">Pay directly to our account</div>
                      </div>
                    </div>

                    <input
                      type="radio"
                      name="payment"
                      checked={selectedPayment === "bank"}
                      onChange={() => setSelectedPayment("bank")}
                      aria-label="Select bank transfer"
                    />
                  </div>

                  <div className="mt-3 text-sm text-muted-foreground">
                    <div><strong>Account Name:</strong> Mosh Apparels Ventures</div>
                    <div><strong>Bank:</strong> OPay</div>
                    <div><strong>Account Number:</strong> 6142257816</div>
                    <div className="mt-2 text-xs">After transfer, click "I have paid — Confirm Order". Keep receipt & screenshot.</div>
                  </div>

                  {selectedPayment === "bank" && (
                    <div className="mt-4">
                      <Button onClick={handlePayNow} className="bg-white border border-purple-200 text-purple-700 w-full" disabled={submitting}>
                        I have paid — Confirm Order
                      </Button>
                    </div>
                  )}
                </div>

                {/* Card payment */}
                <div
                  role="radio"
                  aria-checked={selectedPayment === "card"}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedPayment("card");
                    }
                  }}
                  onClick={() => setSelectedPayment("card")}
                  className={`border rounded-lg p-4 bg-white ${selectedPayment === "card" ? "ring-2 ring-purple-500" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium">Card Payment</div>
                        <div className="text-xs text-muted-foreground">Pay with card (Visa, Mastercard, Verve)</div>
                      </div>
                    </div>

                    <input
                      type="radio"
                      name="payment"
                      checked={selectedPayment === "card"}
                      onChange={() => setSelectedPayment("card")}
                      aria-label="Select card payment"
                    />
                  </div>

                  {selectedPayment === "card" && (
                    <form onSubmit={handlePayNow} className="mt-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Cardholder name</Label>
                          <Input
                            value={cardData.cardName}
                            onChange={(e) => setCardData({ ...cardData, cardName: e.target.value })}
                            placeholder="Full name as on card"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Card number</Label>
                          <Input
                            value={cardData.cardNumber}
                            onChange={(e) => {
                              // simple spacing every 4 digits for UX
                              const raw = e.target.value.replace(/\D/g, "").slice(0, 19);
                              const spaced = raw.match(/.{1,4}/g)?.join(" ") ?? raw;
                              setCardData({ ...cardData, cardNumber: spaced });
                            }}
                            placeholder="1234 5678 9012 3456"
                            maxLength={23}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Expiry (MM/YY)</Label>
                          <Input
                            value={cardData.expiry}
                            onChange={(e) => {
                              // auto format MM/YY
                              const vals = e.target.value.replace(/\D/g, "").slice(0, 4);
                              let formatted = vals;
                              if (vals.length >= 3) formatted = `${vals.slice(0, 2)}/${vals.slice(2)}`;
                              setCardData({ ...cardData, expiry: formatted });
                            }}
                            placeholder="MM/YY"
                            maxLength={5}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">CVV</Label>
                          <Input
                            value={cardData.cvv}
                            onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                            placeholder="123"
                            maxLength={4}
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 items-center">
                        <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white" disabled={submitting}>
                          {submitting ? "Processing..." : "Pay Now"}
                        </Button>
                        <div className="text-sm text-muted-foreground">Secure payment — card details handled safely.</div>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* DELIVERY (left on desktop, larger) */}
          <div className="order-2 lg:order-1 lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Delivery Information</h2>

              <form onSubmit={handleProceedToPayment} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Fulfillment Method</Label>
                  <RadioGroup value={formData.deliveryMethod} onValueChange={(v) => setFormData({ ...formData, deliveryMethod: v as any })} className="grid grid-cols-3 gap-3">
                    <div>
                      <RadioGroupItem value="doorstep" id="doorstep" className="peer sr-only" />
                      <Label htmlFor="doorstep" className={`p-3 rounded-md border ${formData.deliveryMethod === "doorstep" ? "border-purple-500 bg-purple-50" : "border-muted"} cursor-pointer`}>
                        <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-purple-600" /><span className="text-sm font-medium">Doorstep</span></div>
                        <div className="text-xs text-muted-foreground">Delivered to your address</div>
                      </Label>
                    </div>

                    <div>
                      <RadioGroupItem value="park" id="park" className="peer sr-only" />
                      <Label htmlFor="park" className={`p-3 rounded-md border ${formData.deliveryMethod === "park" ? "border-purple-500 bg-purple-50" : "border-muted"} cursor-pointer`}>
                        <div className="flex items-center gap-2"><Package className="h-4 w-4 text-purple-600" /><span className="text-sm font-medium">Park</span></div>
                        <div className="text-xs text-muted-foreground">Pick up at nearest park / terminal</div>
                      </Label>
                    </div>

                    <div>
                      <RadioGroupItem value="pickup" id="pickup" className="peer sr-only" />
                      <Label htmlFor="pickup" className={`p-3 rounded-md border ${formData.deliveryMethod === "pickup" ? "border-purple-500 bg-purple-50" : "border-muted"} cursor-pointer`}>
                        <div className="flex items-center gap-2"><Store className="h-4 w-4 text-purple-600" /><span className="text-sm font-medium">Pickup</span></div>
                        <div className="text-xs text-muted-foreground">Collect from store</div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Address / Park / Pickup */}
                {formData.deliveryMethod !== "pickup" && (
                  <div>
                    <Label htmlFor="address">{formData.deliveryMethod === "doorstep" ? "Delivery Address" : "Nearest Park / Terminal"}</Label>
                    <Textarea id="address" rows={3} placeholder={formData.deliveryMethod === "doorstep" ? "Street, house number, area" : "Nearest park / terminal"} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required />
                  </div>
                )}

                {formData.deliveryMethod === "pickup" && (
                  <div className="bg-purple-50 border border-purple-100 rounded-md p-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium">Pickup location</div>
                        <div className="text-sm text-muted-foreground">
                          9, Bolanle Awosika Street, Coca Cola Road, Oju Oore, Ota, Ogun State
                        </div>
                      </div>
                    </div>
                    <div className="text-xs mt-2 text-muted-foreground">We’ll notify you when your order is ready for pickup.</div>
                  </div>
                )}

                <div>
                  <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white">Save & Continue</Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>

      {/* Bank confirmation modal */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-3">Order confirmed</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Thank you — your order has been recorded as pending while we await payment confirmation.
              Please contact the admin if you need help. Keep your payment receipt and a screenshot of this order.
            </p>
            <div className="space-y-2 text-sm">
              <div><strong>Account Name:</strong> Mosh Apparels Ventures</div>
              <div><strong>Bank:</strong> OPay</div>
              <div><strong>Account Number:</strong> 6142257816</div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowBankModal(false); navigate("/"); }}>
                Done
              </Button>
              <Button onClick={() => { setShowBankModal(false); navigate("/thank-you"); }} className="bg-purple-600 hover:bg-purple-700 text-white">
                I've paid — Next
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Checkout;
