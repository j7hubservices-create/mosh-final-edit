import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
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
import { Pencil, Trash2, Plus, Upload, X, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SafeImage from "@/components/ui/safe-image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import BulkEditPanel from "@/components/admin/BulkEditPanel";

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
    name: '', description: '', price: '', category_id: '', image_url: '', size: '', stock: '', slug: '', original_price: ''
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        navigate('/auth');
      }
    });
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
    if (data) {
      setIsAdmin(true);
      fetchProducts();
      fetchCategories();
      fetchOrders();
      fetchUsers();
      fetchReviews();
    } else {
      navigate('/');
    }
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false });
    if (data) setProducts(data);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    if (data) setCategories(data);
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (*)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (data) setOrders(data);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('*, user:user_id(email)')
      .order('id', { ascending: false });
    
    if (data) setUsers(data);
  };

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('customer_reviews')
      .select('*, products(name)')
      .order('created_at', { ascending: false });
    
    if (data) setReviews(data);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);
    
    if (error) {
      toast.error("Failed to update order status");
    } else {
      toast.success("Order status updated!");
      fetchOrders();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const fileArray = Array.from(files);
    setImageFiles(prev => [...prev, ...fileArray]);

    try {
      const uploadPromises = fileArray.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error } = await supabase.storage.from('product-images').upload(fileName, file);
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      if (uploadedUrls.length > 0) {
        setFormData(prev => ({ ...prev, image_url: uploadedUrls[0] }));
        toast.success(`${uploadedUrls.length} image(s) uploaded successfully!`);
      }
    } catch (error: any) {
      toast.error("Error uploading images: " + error.message);
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImageFile = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
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
    } as any;

    try {
      if (editingProduct) {
        const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
        if (error) throw error;
        toast.success("Product updated!");
      } else {
        const { error } = await supabase.from('products').insert(productData);
        if (error) throw error;
        toast.success("Product added!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save product");
      return;
    }

    setFormData({ name: '', description: '', price: '', category_id: '', image_url: '', size: '', stock: '', slug: '', original_price: '' });
    setEditingProduct(null);
    setImageFiles([]);
    setDialogOpen(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    toast.success("Product deleted!");
    fetchProducts();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/10">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage your store</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/admin/sections')}>
              Manage Homepage
            </Button>
          </div>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mb-6" size="lg">
              <Plus className="mr-2 h-4 w-4" />Add New Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Product Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Enter product name" required />
                </div>
                
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Describe your product" rows={3} />
                </div>

                <div>
                  <Label>Original Price (₦)</Label>
                  <Input type="number" step="0.01" value={formData.original_price} onChange={(e) => setFormData({...formData, original_price: e.target.value})} placeholder="0.00" />
                </div>

                <div>
                  <Label>Sale Price (₦)</Label>
                  <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} placeholder="0.00" required />
                </div>

                <div>
                  <Label>Stock Quantity</Label>
                  <Input type="number" value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})} placeholder="0" required />
                </div>

                <div>
                  <Label>Category</Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({...formData, category_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Size</Label>
                  <Input value={formData.size} onChange={(e) => setFormData({...formData, size: e.target.value})} placeholder="e.g., S, M, L, XL" />
                </div>

                <div className="md:col-span-2">
                  <Label>SEO Slug (URL)</Label>
                  <Input value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} placeholder="Auto-generated from name" />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to auto-generate from product name</p>
                </div>

                <div className="md:col-span-2">
                  <Label>Product Images</Label>
                  <div className="mt-2 space-y-4">
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" className="relative" disabled={uploadingImages}>
                        <Upload className="mr-2 h-4 w-4" />
                        {uploadingImages ? 'Uploading...' : 'Upload Images'}
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          disabled={uploadingImages}
                        />
                      </Button>
                      <span className="text-sm text-muted-foreground">or enter URL below</span>
                    </div>
                    
                    {imageFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {imageFiles.map((file, index) => (
                          <div key={index} className="relative group">
                            <img src={URL.createObjectURL(file)} alt={file.name} className="w-20 h-20 object-cover rounded border" />
                            <button
                              type="button"
                              onClick={() => removeImageFile(index)}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Input 
                      value={formData.image_url} 
                      onChange={(e) => setFormData({...formData, image_url: e.target.value})} 
                      placeholder="Or paste image URL here" 
                    />
                    {formData.image_url && (
                      <SafeImage src={formData.image_url} alt="Preview" className="w-32 h-32 rounded border" />
                    )}
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={uploadingImages}>
                {editingProduct ? 'Update Product' : 'Add Product'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

            <div className="grid gap-4">
              {products.map(product => (
                <Card key={product.id} className="p-6 flex flex-col md:flex-row gap-4 hover:shadow-lg transition-shadow">
                  <SafeImage src={product.image_url} alt={product.name} className="w-full md:w-32 h-32 rounded-lg" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-xl mb-1">{product.name}</h3>
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">{product.categories?.name}</span>
                        {product.slug && <p className="text-xs text-muted-foreground mt-1">/{product.slug}</p>}
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm mb-2 line-clamp-2">{product.description}</p>
                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      {product.original_price && (
                        <span className="text-lg line-through text-muted-foreground">₦{product.original_price.toLocaleString()}</span>
                      )}
                      <p className="text-2xl font-bold text-primary">₦{product.price.toLocaleString()}</p>
                      {product.original_price && (
                        <span className="text-sm text-green-600 font-semibold">
                          {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF
                        </span>
                      )}
                      {product.size && <span className="text-muted-foreground">Size: {product.size}</span>}
                      <span className={`font-medium ${product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                        Stock: {product.stock}
                      </span>
                    </div>
                  </div>
                  <div className="flex md:flex-col gap-2">
                    <Button variant="outline" size="icon" onClick={() => { setEditingProduct(product); setFormData({...product, price: product.price.toString(), stock: product.stock.toString(), original_price: product.original_price?.toString() || '', slug: product.slug || ''}); setDialogOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders">
            {orders.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-xl text-muted-foreground">No orders yet</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="p-4 md:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Order Date</p>
                        <p className="font-semibold text-sm">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Order ID</p>
                        <p className="font-mono text-xs">#{order.id.substring(0, 8)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Customer</p>
                        <p className="font-semibold text-sm">{order.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                        <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Delivery</p>
                        <p className="text-sm">{order.delivery_method === 'delivery' ? 'Home Delivery' : 'Pickup'}</p>
                        {order.delivery_method === 'delivery' && (
                          <p className="text-xs text-muted-foreground mt-1">{order.customer_address}</p>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-4 mb-4">
                      <h3 className="font-semibold mb-3 text-sm md:text-base">Order Items</h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Product</TableHead>
                              <TableHead className="text-xs">Qty</TableHead>
                              <TableHead className="text-xs">Price</TableHead>
                              <TableHead className="text-xs">Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {order.order_items.map((item: any) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={item.products.image_url}
                                      alt={item.products.name}
                                      className="w-10 h-10 object-cover rounded"
                                    />
                                    <span className="font-medium text-xs md:text-sm">{item.products.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs md:text-sm">{item.quantity}</TableCell>
                                <TableCell className="text-xs md:text-sm">₦{item.price.toLocaleString()}</TableCell>
                                <TableCell className="text-xs md:text-sm">₦{(item.quantity * item.price).toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div className="border-t pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="w-full md:w-auto">
                        <Label className="text-xs md:text-sm">Order Status</Label>
                        <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value)}>
                          <SelectTrigger className="w-full md:w-48 mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="text-left md:text-right w-full md:w-auto">
                        <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                        <p className="text-2xl md:text-3xl font-bold text-primary">₦{order.total.toLocaleString()}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users">
            {users.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-xl text-muted-foreground">No users yet</p>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <Card className="p-4 md:p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs md:text-sm">User ID</TableHead>
                        <TableHead className="text-xs md:text-sm">Email</TableHead>
                        <TableHead className="text-xs md:text-sm">Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user, index) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-mono text-xs md:text-sm">USER-{String(index + 1).padStart(4, '0')}</TableCell>
                          <TableCell className="text-xs md:text-sm">{user.user?.email || 'N/A'}</TableCell>
                          <TableCell>
                            <span className={`inline-block px-2 md:px-3 py-1 rounded-full text-xs font-semibold ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            {reviews.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-xl text-muted-foreground">No reviews yet</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{review.customer_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {review.products?.name || 'Product not found'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={i < review.rating ? 'text-yellow-500' : 'text-gray-300'}>
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-3">{review.review_text}</p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                        review.is_featured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {review.is_featured ? 'Featured' : 'Not Featured'}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default Admin;
