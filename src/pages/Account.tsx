import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Truck, CheckCircle, Clock } from "lucide-react";

const Account = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchOrders(session.user.id);
      } else {
        navigate('/auth');
      }
    });
  }, []);

  const fetchOrders = async (userId: string) => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setOrders(data);
    setLoading(false);
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
        <h1 className="text-4xl font-bold mb-8">My Account</h1>

        <div className="grid md:grid-cols-4 gap-8">
          <Card className="p-6">
            <h2 className="font-semibold text-lg mb-4">Account Details</h2>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
          </Card>

          <div className="md:col-span-3">
            <h2 className="text-2xl font-bold mb-6">Order History</h2>
            
            {orders.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl text-muted-foreground">No orders yet</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="p-6">
                     <div className="mb-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Order placed on {new Date(order.created_at).toLocaleDateString()}
                          </p>
                          <p className="font-semibold text-lg">
                            Order #{order.id.substring(0, 8)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Status</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                            order.status === 'completed' ? 'bg-green-100 text-green-800' :
                            order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </div>
                      </div>

                      {/* Order Tracking */}
                      <div className="bg-muted/50 p-4 rounded-lg mb-4">
                        <h3 className="font-semibold mb-3">Order Tracking</h3>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col items-center flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              order.status === 'pending' || order.status === 'processing' || order.status === 'completed' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}>
                              <Clock className="h-5 w-5" />
                            </div>
                            <p className="text-xs mt-2 text-center">Pending</p>
                          </div>
                          <div className={`flex-1 h-1 ${
                            order.status === 'processing' || order.status === 'completed' 
                              ? 'bg-primary' 
                              : 'bg-muted'
                          }`} />
                          <div className="flex flex-col items-center flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              order.status === 'processing' || order.status === 'completed' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}>
                              <Truck className="h-5 w-5" />
                            </div>
                            <p className="text-xs mt-2 text-center">Processing</p>
                          </div>
                          <div className={`flex-1 h-1 ${
                            order.status === 'completed' 
                              ? 'bg-primary' 
                              : 'bg-muted'
                          }`} />
                          <div className="flex flex-col items-center flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              order.status === 'completed' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}>
                              <CheckCircle className="h-5 w-5" />
                            </div>
                            <p className="text-xs mt-2 text-center">Completed</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      {order.order_items.map((item: any) => (
                        <div key={item.id} className="flex gap-4">
                          <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                            <img
                              src={item.products.image_url}
                              alt={item.products.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{item.products.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Quantity: {item.quantity} × ₦{item.price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total</span>
                        <span className="text-xl font-bold text-primary">
                          ₦{order.total.toLocaleString()}
                        </span>
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
    </div>
  );
};

export default Account;
