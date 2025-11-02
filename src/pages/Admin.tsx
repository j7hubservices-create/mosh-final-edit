import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, Plus, Upload, X, Package, AlertTriangle, Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SafeImage from "@/components/ui/safe-image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateOrderStatus } from "@/lib/orderHelpers";
import "@/styles/admin.css";

const Admin = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    image_url: "",
    size: "",
    stock: "",
    slug: "",
    original_price: "",
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Orders filters & mobile expansion
  const [filterDate, setFilterDate] = useState("");
  const [filterSize, setFilterSize] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const filteredOrders = orders.filter((order) => {
    const matchDate = filterDate
      ? order.created_at.startsWith(filterDate)
      : true;
    const matchSize = filterSize
      ? order.order_items?.some((item) => item.products?.size === filterSize)
      : true;
    return matchDate && matchSize;
  });

  // ✅ Automatically generate slug
  useEffect(() => {
    if (formData.name) {
      const generatedSlug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setFormData((prev) => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.name]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        navigate("/auth");
      }
    });
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (data) {
      setIsAdmin(true);
      fetchProducts();
      fetchCategories();
      fetchOrders();
      fetchUsers();
      fetchReviews();
    } else {
      navigate("/");
    }
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*, categories(name)")
      .order("created_at", { ascending: false });
    if (data) setProducts(data);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*");
    if (data) setCategories(data);
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select(`*, order_items (*, products (*))`)
      .order("created_at", { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("*, user:user_id(email)")
      .order("id", { ascending: false });
    if (data) setUsers(data);
  };

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("customer_reviews")
      .select("*, products(name)")
      .order("created_at", { ascending: false });
    if (data) setReviews(data);
  };

  const handleOrderStatusUpdate = async (orderId: string, status: string) => {
    const success = await updateOrderStatus(orderId, status);
    if (success) {
      fetchOrders();
    }
  };
const handleDeleteOrder = async (orderId: string) => {
  if (!confirm("Are you sure you want to delete this order?")) return;

  try {
    // 1️⃣ Delete order_items first
    let { error: itemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", orderId);

    if (itemsError) throw itemsError;

    // 2️⃣ Delete the order
    let { error: orderError } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (orderError) throw orderError;

    // 3️⃣ Update UI
    fetchOrders();
    toast.success("Order deleted successfully");
  } catch (err: any) {
    console.error(err);
    toast.error("Failed to delete order: " + err.message);
  }
};


  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const fileArray = Array.from(files);
    setImageFiles((prev) => [...prev, ...fileArray]);

    try {
      const uploadPromises = fileArray.map(async (file) => {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error } = await supabase.storage.from("product-images").upload(fileName, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(fileName);
        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      if (uploadedUrls.length > 0) {
        setFormData((prev) => ({ ...prev, image_url: uploadedUrls[0] }));
        toast.success(`${uploadedUrls.length} image(s) uploaded successfully!`);
      }
    } catch (error: any) {
      toast.error("Error uploading images: " + error.message);
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImageFile = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSoftDelete = async (id: string) => {
    const confirm = window.confirm("Delete this product permanently?");
    if (!confirm) return;

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error("Failed to delete product");
    else {
      toast.success("Product deleted!");
      fetchProducts();
    }
  };

  const handleRestore = async (id: string) => {
    // Not needed since we're doing hard delete
    toast.info("Restore not available");
    return;
  };

  const handleSafeDelete = async (id: string) => {
    const confirm = window.confirm("This will permanently delete the product. Continue?");
    if (!confirm) return;

    const toastId = toast.loading("Deleting product...");

    const { error } = await supabase.from("products").delete().eq("id", id);
    toast.dismiss(toastId);

    if (error) {
      toast.error("Failed to delete product.");
    } else {
      toast.success("Product deleted successfully!");
      fetchProducts();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      category_id: formData.category_id || null,
      image_url: formData.image_url || null,
      size: formData.size || null,
      stock: parseInt(formData.stock),
      slug: formData.slug || null,
    };

    try {
      if (editingProduct) {
        const { error } = await supabase.from("products").update(productData).eq("id", editingProduct.id);
        if (error) throw error;
        toast.success("Product updated!");
      } else {
        const { error } = await supabase.from("products").insert(productData);
        if (error) throw error;
        toast.success("Product added!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save product");
      return;
    }

    setFormData({
      name: "",
      description: "",
      price: "",
      category_id: "",
      image_url: "",
      size: "",
      stock: "",
      slug: "",
      original_price: "",
    });
    setEditingProduct(null);
    setImageFiles([]);
    setDialogOpen(false);
    fetchProducts();
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/10">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-8 flex justify-between items-center flex-wrap gap-3">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button variant="outline" onClick={() => navigate("/admin/sections")}>
            Manage Homepage
          </Button>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="mb-6 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide rounded-lg border bg-muted p-1">
            <TabsTrigger value="products" className="tabs-trigger">Products</TabsTrigger>
            <TabsTrigger value="orders" className="tabs-trigger">Orders ({orders.length})</TabsTrigger>
            <TabsTrigger value="users" className="tabs-trigger">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="reviews" className="tabs-trigger">Reviews ({reviews.length})</TabsTrigger>
          </TabsList>

        {/* ✅ Products Tab */}
          <TabsContent value="products">
            {/* Product Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="mb-6" size="lg">
                  <Plus className="mr-2 h-4 w-4" /> Add New Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Product Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter name"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Description"
                      />
                    </div>

                    <div>
                      <Label>Original Price (₦)</Label>
                      <Input
                        type="number"
                        value={formData.original_price}
                        onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Sale Price (₦)</Label>
                      <Input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Stock</Label>
                      <Input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Category</Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Size</Label>
                      <Input
                        value={formData.size}
                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>SEO Slug (URL)</Label>
                      <Input
                        value={formData.slug}
                        onChange={(e) =>
                          setFormData({ ...formData, slug: e.target.value })
                        }
                        placeholder="Auto-generated from name"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave empty to auto-generate from product name
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <Label>Image Upload</Label>
                      <Button
                        type="button"
                        variant="outline"
                        className="relative mt-2"
                        disabled={uploadingImages}
                      >
                        <Upload
                        className="mr-2 h-4 w-4" /> Upload Image
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </Button>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {imageFiles.map((file, idx) => (
                          <div key={idx} className="relative">
                            <img
                              src={URL.createObjectURL(file)}
                              alt="preview"
                              className="w-20 h-20 object-cover rounded"
                            />
                            <Button
                              size="icon"
                              variant="destructive"
                              className="absolute -top-2 -right-2 p-1"
                              onClick={() => removeImageFile(idx)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  <Button type="submit" className="mt-4 w-full">
                    {editingProduct ? "Update Product" : "Add Product"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Product Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S/N</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product, idx) => (
                  <TableRow key={product.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>₦{product.price?.toLocaleString()}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>{product.categories?.name}</TableCell>
                    <TableCell>
                      <SafeImage
                        src={product.image_url || "/placeholder.jpg"}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        size="icon"
                        onClick={() => {
                          setEditingProduct(product);
                          setFormData({
                            name: product.name,
                            description: product.description,
                            price: product.price,
                            original_price: product.original_price,
                            category_id: product.category_id,
                            image_url: product.image_url,
                            size: product.size,
                            stock: product.stock,
                            slug: product.slug,
                          });
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => handleSafeDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

         {/* ✅ Orders Tab */}
<TabsContent value="orders">
  {/* Filters */}
  <div className="mb-4 flex flex-col md:flex-row md:items-center gap-4">
    <div className="flex flex-col">
      <label className="text-sm font-medium mb-1">Filter by month</label>
      <Input
        type="month"
        value={filterDate || ""}
        onChange={(e) => setFilterDate(e.target.value)}
        placeholder="Select month"
      />
    </div>
    <div className="flex flex-col">
      <label className="text-sm font-medium mb-1">Filter by size</label>
      <Input
        value={filterSize || ""}
        onChange={(e) => setFilterSize(e.target.value)}
        placeholder="Enter size (S, M, L or 8, 10...)"
      />
    </div>
  </div>

  {/* Orders Table */}
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>S/N</TableHead>
        <TableHead>Date</TableHead>
        <TableHead>C/N</TableHead>
        <TableHead>Details</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Tracking</TableHead>
        <TableHead>Total</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>

    <TableBody>
      {filteredOrders
        .filter((order) => {
          // Filter by date
          if (filterDate) {
            const orderMonth = new Date(order.created_at)
              .toISOString()
              .slice(0, 7); // yyyy-mm
            if (orderMonth !== filterDate) return false;
          }
          // Filter by size
          if (filterSize) {
            const hasSize = order.order_items?.some(
              (item) =>
                item.size?.toString().toLowerCase() ===
                filterSize.toLowerCase()
            );
            if (!hasSize) return false;
          }
          return true;
        })
        .map((order, idx) => (
          <TableRow key={order.id}>
            <TableCell>{idx + 1}</TableCell>
            <TableCell>
              {new Date(order.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>{order.customer_name}</TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleOrderDetails(order.id)}
              >
                {expandedOrders.includes(order.id)
                  ? "Hide Details"
                  : "View Details"}
              </Button>
              {expandedOrders.includes(order.id) && (
                <div className="mt-2 p-2 border rounded-md space-y-2 bg-muted">
                  <p>
                    <strong>Email:</strong> {order.customer_email || "—"}
                  </p>
                  <p>
                    <strong>Phone:</strong> {order.customer_phone || "—"}
                  </p>
                  <p className="truncate">
                    <strong>Address:</strong> {order.customer_address || "—"}
                  </p>
                  <p>
                    <strong>Delivery:</strong> {order.delivery_method || "—"}
                  </p>
                  <p>
                    <strong>Payment:</strong> {order.payment_method || "—"}
                  </p>

                  {/* Order Items */}
                  <div className="space-y-1">
                    {order.order_items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 border rounded-md p-1"
                      >
                        <SafeImage
                          src={item.products?.image_url || "/placeholder.jpg"}
                          alt={item.products?.name || "Product"}
                          className="w-8 h-8 object-cover rounded"
                        />
                        <div className="flex flex-col text-xs">
                          <span>{item.products?.name}</span>
                          <span>
                            ₦{item.price?.toLocaleString()} × {item.quantity}
                          </span>
                          {item.size && <span>Size: {item.size}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TableCell>
            <TableCell>
              <Select
                value={order.status}
                onValueChange={(v) => handleOrderStatusUpdate(order.id, v)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <div className="text-xs">
                {order.tracking_number && (
                  <div className="font-mono">{order.tracking_number}</div>
                )}
                {order.tracking_status && (
                  <div className="text-muted-foreground capitalize">
                    {order.tracking_status}
                  </div>
                )}
                {order.tracking_updated_at && (
                  <div className="text-muted-foreground">
                    {new Date(order.tracking_updated_at).toLocaleString()}
                  </div>
                )}
                {!order.tracking_number && (
                  <span className="text-muted-foreground">No tracking</span>
                )}
              </div>
            </TableCell>
            <TableCell>₦{order.total?.toLocaleString()}</TableCell>
            <TableCell>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => handleDeleteOrder(order.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
    </TableBody>
  </Table>
</TabsContent>



          {/* ✅ Users Tab */}
          <TabsContent value="users">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S/N</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, idx) => (
                  <TableRow key={user.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{user.user?.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Featured</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {reviews.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.customer_name}</TableCell>
                      <TableCell>{r.products?.name}</TableCell>
                      <TableCell>{"★".repeat(r.rating)}</TableCell>
                      <TableCell className="max-w-xs truncate">{r.review_text}</TableCell>
                      <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            r.is_featured
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {r.is_featured ? "Yes" : "No"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default Admin;
