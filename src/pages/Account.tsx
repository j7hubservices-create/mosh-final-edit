import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Truck, CheckCircle, Clock, User, Edit2 } from "lucide-react";
import { toast } from "sonner";

const generateShortOrderId = () =>
  `MOSH-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

const Account = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile form state
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<any>({ full_name: "", phone: "", address: "", avatar_url: "" });

  // Drawer / detail state
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchOrders(session.user.id);
      } else {
        navigate("/auth");
      }
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (data) setProfile({
        full_name: data.full_name || "",
        phone: data.phone || "",
        address: data.address || "",
        avatar_url: data.avatar_url || ""
      });
      // fallback: if no profile, try to get display name from auth user metadata (if available)
      if (!data) {
        const { data: authUser } = await supabase.auth.getUser();
        const display = (authUser?.user?.user_metadata as any)?.full_name;
        if (display) setProfile(prev => ({ ...prev, full_name: display }));
      }
    } catch (err) {
      console.error("Profile fetch error", err);
    }
  };

  const fetchOrders = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            *,
            products (id, name, image_url, price)
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Ensure short_order_id exists locally and attempt to persist
      const updatedOrders = await Promise.all(
        (data || []).map(async (o: any) => {
          if (!o.short_order_id) {
            const shortId = generateShortOrderId();
            try {
              await supabase.from("orders").update({ short_order_id: shortId }).eq("id", o.id);
              o.short_order_id = shortId;
            } catch (err) {
              console.warn("Failed to set short_order_id for", o.id, err);
            }
          }
          return o;
        })
      );

      setOrders(updatedOrders);
    } catch (err) {
      console.error("Orders fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  // Profile save handler
  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const payload = {
        id: user.id,
        full_name: profile.full_name,
        phone: profile.phone,
        address: profile.address,
        avatar_url: profile.avatar_url || null,
      };
      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;
      setEditing(false);
      toast.success("Profile saved");
    } catch (err) {
      console.error("Profile save error", err);
      toast.error("Failed to save profile");
    }
  };

  // Avatar upload handler
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const filePath = `profiles/${user.id}/${Date.now()}_${file.name}`;
      // upload to bucket 'profiles' (create this bucket in Supabase -> Storage)
      const { error: uploadErr } = await supabase.storage.from("profiles").upload(filePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage.from("profiles").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;
      // upsert to profiles table
      const { error: upsertErr } = await supabase.from("profiles").upsert({ id: user.id, avatar_url: publicUrl }, { returning: "minimal" });
      if (upsertErr) throw upsertErr;
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Profile photo updated");
    } catch (err: any) {
      console.error("Avatar upload error", err);
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      // clear input to allow same file reselect
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Open order detail drawer
  const openOrder = (order: any) => {
    setActiveOrder(order);
    setDetailOpen(true);
  };

  const closeOrder = () => {
    setActiveOrder(null);
    setDetailOpen(false);
  };

  // Navigate to a dedicated tracking page
  const goToTrack = (order: any) => {
    const idToUse = order.short_order_id || order.id;
    navigate(`/track-order/${idToUse}`);
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex flex-col md:flex-row md:items-start gap-8">
          {/* Left: profile card */}
          <div className="md:w-1/3">
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-14 h-14 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center overflow-hidden cursor-pointer"
                  onClick={handleAvatarClick}
                  title="Upload profile photo"
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7" />
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />

                <div>
                  <div className="text-sm text-muted-foreground">Welcome back,</div>
                  <div className="font-semibold text-lg">
                    {profile.full_name || (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0]}
                  </div>
                </div>
              </div>

              {!editing ? (
                <>
                  <div className="space-y-3 text-sm mb-4">
                    <div>
                      <div className="text-muted-foreground text-xs">Email</div>
                      <div className="font-medium">{user?.email}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Phone</div>
                      <div className="font-medium">{profile.phone || "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Address</div>
                      <div className="font-medium">{profile.address || "—"}</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="ghost" className="flex-1" onClick={() => setEditing(true)}>
                      <Edit2 className="mr-2 h-4 w-4" /> Edit Profile
                    </Button>
                    <Button onClick={() => navigate("/products")}>Shop More</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    <div>
                      <Label>Full name</Label>
                      <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleSaveProfile}>Save</Button>
                    <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </>
              )}
            </Card>

            {/* Quick stats */}
            <div className="mt-6 space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Total Orders</div>
                    <div className="font-bold text-2xl">{orders.length}</div>
                  </div>
                  <div className="text-purple-600">
                    <Package className="w-7 h-7" />
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Last Order</div>
                    <div className="font-semibold text-sm">
                      {orders[0] ? new Date(orders[0].created_at).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div className="text-green-600">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Right: orders list */}
          <div className="md:w-2/3">
            <h1 className="text-3xl font-bold mb-4">My Orders</h1>

            {orders.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl text-muted-foreground">You haven’t placed any orders yet.</p>
                <div className="mt-6">
                  <Button onClick={() => navigate("/products")}>Start Shopping</Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order, idx) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-xs text-muted-foreground">S/N</div>
                          <div className="font-semibold">{idx + 1}</div>

                          <div className="ml-6 text-xs text-muted-foreground">Order</div>
                          <button
                            onClick={() => goToTrack(order)}
                            className="ml-2 text-purple-600 font-semibold hover:underline"
                          >
                            {order.short_order_id || order.id.substring(0, 8)}
                          </button>

                          <div className="ml-auto md:ml-6 text-xs text-muted-foreground">Placed</div>
                          <div className="ml-2 text-sm">{new Date(order.created_at).toLocaleDateString()}</div>
                        </div>

                        <div className="text-sm text-muted-foreground mb-2 truncate max-w-full">
                          {order.customer_name ? `Customer: ${order.customer_name}` : ""}
                        </div>

                        {/* Products preview horizontal on desktop, stacked on mobile */}
                        <div className="flex gap-3 overflow-x-auto py-2">
                          {order.order_items?.map((item: any) => (
                            <div key={item.id} className="min-w-[160px] flex-shrink-0 bg-white rounded-md border p-2">
                              <div className="w-full h-28 bg-gray-100 rounded overflow-hidden mb-2">
                                <img
                                  src={item.products?.image_url || "/placeholder.jpg"}
                                  alt={item.products?.name || "Product"}
                                  className="w-full h-full object-cover"
                                  onError={(e: any) => (e.currentTarget.src = "/placeholder.jpg")}
                                />
                              </div>
                              <div className="text-xs">
                                <div className="font-medium truncate">{item.products?.name}</div>
                                <div className="text-muted-foreground">
                                  {item.quantity} × ₦{Number(item.price).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Status</div>
                          <div className={`inline-block px-3 py-1 rounded-full font-semibold text-sm ${
                            order.status === "completed" ? "bg-green-100 text-green-800" :
                            order.status === "processing" ? "bg-blue-100 text-blue-800" :
                            "bg-yellow-100 text-yellow-800"
                          }`}>
                            {order.status?.charAt(0)?.toUpperCase() + order.status?.slice(1)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Total</div>
                          <div className="font-bold text-lg">₦{Number(order.total).toLocaleString()}</div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="ghost" onClick={() => openOrder(order)}>View</Button>
                          <Button onClick={() => goToTrack(order)}>Track</Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* Order Detail Drawer */}
      {detailOpen && activeOrder && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={closeOrder} />
          <div className="relative ml-auto w-full md:max-w-2xl bg-white h-full overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold">Order {activeOrder.short_order_id || activeOrder.id.substring(0, 8)}</h2>
                <div className="text-sm text-muted-foreground">{new Date(activeOrder.created_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { navigator.clipboard?.writeText(activeOrder.short_order_id || activeOrder.id); toast.success("Copied"); }}>Copy ID</Button>
                <Button onClick={() => goToTrack(activeOrder)}>Open Tracker</Button>
                <Button variant="destructive" onClick={closeOrder}>Close</Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Customer</h3>
                <p><strong>Name:</strong> {activeOrder.customer_name}</p>
                <p><strong>Email:</strong> {activeOrder.customer_email || "—"}</p>
                <p><strong>Phone:</strong> {activeOrder.customer_phone || "—"}</p>
                <p className="truncate"><strong>Address:</strong> {activeOrder.customer_address || "—"}</p>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Items</h3>
                <div className="space-y-3">
                  {activeOrder.order_items?.map((it: any) => (
                    <div key={it.id} className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                        <img src={it.products?.image_url || "/placeholder.jpg"} alt={it.products?.name} className="w-full h-full object-cover" onError={(e:any)=>e.currentTarget.src="/placeholder.jpg"} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{it.products?.name}</div>
                        <div className="text-sm text-muted-foreground">Qty: {it.quantity} × ₦{Number(it.price).toLocaleString()}</div>
                      </div>
                      <div className="font-semibold">₦{(it.price * it.quantity).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Payment</div>
                  <div className="font-medium">{activeOrder.payment_method || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Delivery</div>
                  <div className="font-medium">{activeOrder.delivery_method || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="font-bold text-lg">₦{Number(activeOrder.total).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => window.print()}>Print</Button>
              <Button onClick={() => navigate("/products")}>Shop More</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Account;
