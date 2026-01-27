import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Package, 
  ShoppingBag, 
  Download, 
  User, 
  Settings, 
  LogOut, 
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  Grid,
  List,
  ExternalLink,
  FileDown,
  Mail,
  AlertCircle,
  Loader2,
  ChevronRight,
  Eye,
  Receipt,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, loading: authLoading, logout, resendVerification } = useAuth();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'products');
  const [purchases, setPurchases] = useState([]);
  const [orders, setOrders] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [downloadingProducts, setDownloadingProducts] = useState({});
  const [resendingVerification, setResendingVerification] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/dashboard' } } });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return;
      
      setLoading(true);
      try {
        const [purchasesRes, ordersRes, downloadsRes, statsRes] = await Promise.all([
          apiClient.get('/user/purchases'),
          apiClient.get('/user/orders'),
          apiClient.get('/user/downloads'),
          apiClient.get('/user/stats')
        ]);
        
        setPurchases(purchasesRes.data);
        setOrders(ordersRes.data);
        setDownloads(downloadsRes.data);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]);

  const handleDownload = async (productId, productName) => {
    setDownloadingProducts(prev => ({ ...prev, [productId]: true }));
    
    try {
      const response = await apiClient.post(`/user/download/${productId}`);
      
      toast.success(`Download started for ${productName}`);
      
      // Refresh downloads list
      const downloadsRes = await apiClient.get('/user/downloads');
      setDownloads(downloadsRes.data);
      
      // In a real app, you would initiate the actual file download here
      // For demo purposes, we'll just show a success message
      console.log('Download token:', response.data.download_token);
      
    } catch (error) {
      const message = error.response?.data?.detail || 'Download failed';
      toast.error(message);
    } finally {
      setDownloadingProducts(prev => ({ ...prev, [productId]: false }));
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    const result = await resendVerification();
    if (result.success) {
      toast.success('Verification email sent!');
    } else {
      toast.error(result.error);
    }
    setResendingVerification(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  const filteredPurchases = purchases.filter(purchase => 
    purchase.product?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-navy animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Email Verification Banner */}
          {!user.email_verified && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Verify your email</p>
                  <p className="text-sm text-amber-700">
                    Please verify your email address to access all features.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleResendVerification}
                disabled={resendingVerification}
                variant="outline"
                className="border-amber-400 text-amber-700 hover:bg-amber-100"
              >
                {resendingVerification ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Resend Email
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-heading font-bold text-navy">
                Welcome back, {user.name?.split(' ')[0]}!
              </h1>
              <p className="text-slate-600 mt-1">
                Manage your purchases and downloads from your dashboard
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/marketplace">
                <Button variant="outline" className="rounded-xl">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Browse Marketplace
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm">Total Purchases</p>
                  <p className="text-3xl font-bold text-navy mt-1">
                    {stats?.total_purchases || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-navy/10 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-navy" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm">Total Downloads</p>
                  <p className="text-3xl font-bold text-navy mt-1">
                    {stats?.total_downloads || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Download className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm">Total Spent</p>
                  <p className="text-3xl font-bold text-navy mt-1">
                    {formatCurrency(stats?.total_spent || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gold/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-gold" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm">Member Since</p>
                  <p className="text-xl font-bold text-navy mt-1">
                    {stats?.member_since ? formatDate(stats.member_since) : 'N/A'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white border border-slate-200 p-1 rounded-xl">
              <TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-navy data-[state=active]:text-white">
                <Package className="w-4 h-4 mr-2" />
                My Products
              </TabsTrigger>
              <TabsTrigger value="orders" className="rounded-lg data-[state=active]:bg-navy data-[state=active]:text-white">
                <Receipt className="w-4 h-4 mr-2" />
                Order History
              </TabsTrigger>
              <TabsTrigger value="downloads" className="rounded-lg data-[state=active]:bg-navy data-[state=active]:text-white">
                <Download className="w-4 h-4 mr-2" />
                Downloads
              </TabsTrigger>
              <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-navy data-[state=active]:text-white">
                <Settings className="w-4 h-4 mr-2" />
                Profile
              </TabsTrigger>
            </TabsList>

            {/* My Products Tab */}
            <TabsContent value="products" className="space-y-6">
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search your products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 rounded-xl"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                    className="rounded-lg"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                    className="rounded-lg"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-navy animate-spin" />
                </div>
              ) : filteredPurchases.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Package className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-heading font-semibold text-navy mb-2">
                    No Purchases Yet
                  </h3>
                  <p className="text-slate-600 mb-6 max-w-md mx-auto">
                    You haven't purchased any products yet. Browse our marketplace to find premium templates and digital assets.
                  </p>
                  <Link to="/marketplace">
                    <Button className="bg-navy hover:bg-navy/90 rounded-xl">
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Browse Marketplace
                    </Button>
                  </Link>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPurchases.map((purchase, index) => (
                    <div 
                      key={`${purchase.order_id}-${index}`}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-video relative overflow-hidden bg-slate-100">
                        <img
                          src={purchase.product?.image}
                          alt={purchase.product?.name}
                          className="w-full h-full object-cover"
                        />
                        <Badge className="absolute top-3 right-3 bg-navy">
                          {purchase.license_type}
                        </Badge>
                      </div>
                      <div className="p-5">
                        <h3 className="font-heading font-semibold text-navy text-lg mb-1 truncate">
                          {purchase.product?.name}
                        </h3>
                        <p className="text-sm text-slate-500 mb-3">
                          Purchased {formatDate(purchase.purchase_date)}
                        </p>
                        <div className="flex items-center justify-between text-sm mb-4">
                          <span className="text-slate-600">
                            Order: <span className="font-mono text-xs">{purchase.order_id.slice(0, 8)}...</span>
                          </span>
                          <span className="font-semibold text-navy">
                            {formatCurrency(purchase.price_paid)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleDownload(purchase.product?.id, purchase.product?.name)}
                            disabled={downloadingProducts[purchase.product?.id]}
                            className="flex-1 bg-navy hover:bg-navy/90 rounded-xl"
                          >
                            {downloadingProducts[purchase.product?.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </>
                            )}
                          </Button>
                          <Link to={`/product/${purchase.product?.id}`}>
                            <Button variant="outline" size="icon" className="rounded-xl">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                        {purchase.download_count > 0 && (
                          <p className="text-xs text-slate-500 mt-3 text-center">
                            Downloaded {purchase.download_count} time{purchase.download_count > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  {filteredPurchases.map((purchase, index) => (
                    <div 
                      key={`${purchase.order_id}-${index}`}
                      className={`flex items-center gap-4 p-4 ${index > 0 ? 'border-t border-slate-100' : ''}`}
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                        <img
                          src={purchase.product?.image}
                          alt={purchase.product?.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-semibold text-navy truncate">
                          {purchase.product?.name}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {formatDate(purchase.purchase_date)} • {purchase.license_type}
                        </p>
                        <p className="text-sm font-medium text-navy mt-1">
                          {formatCurrency(purchase.price_paid)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleDownload(purchase.product?.id, purchase.product?.name)}
                          disabled={downloadingProducts[purchase.product?.id]}
                          className="bg-navy hover:bg-navy/90 rounded-xl"
                        >
                          {downloadingProducts[purchase.product?.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Order History Tab */}
            <TabsContent value="orders" className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-navy animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Receipt className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-heading font-semibold text-navy mb-2">
                    No Orders Yet
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Your order history will appear here once you make a purchase.
                  </p>
                  <Link to="/marketplace">
                    <Button className="bg-navy hover:bg-navy/90 rounded-xl">
                      Start Shopping
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left py-4 px-6 font-semibold text-slate-700">Order ID</th>
                          <th className="text-left py-4 px-6 font-semibold text-slate-700">Date</th>
                          <th className="text-left py-4 px-6 font-semibold text-slate-700">Items</th>
                          <th className="text-left py-4 px-6 font-semibold text-slate-700">Total</th>
                          <th className="text-left py-4 px-6 font-semibold text-slate-700">Status</th>
                          <th className="text-left py-4 px-6 font-semibold text-slate-700">Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id} className="border-b border-slate-100 last:border-0">
                            <td className="py-4 px-6">
                              <span className="font-mono text-sm">
                                {order.invoice_number || order.id.slice(0, 8)}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-slate-600">
                              {formatDate(order.created_at)}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col gap-1">
                                {order.items?.map((item, i) => (
                                  <span key={i} className="text-sm">
                                    {item.name} × {item.quantity}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-6 font-semibold text-navy">
                              {formatCurrency(order.total_amount)}
                            </td>
                            <td className="py-4 px-6">
                              <Badge className={`${
                                order.status === 'paid' ? 'bg-green-100 text-green-700' :
                                order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </Badge>
                            </td>
                            <td className="py-4 px-6">
                              <Button variant="ghost" size="sm" className="text-navy hover:text-navy/80">
                                <FileDown className="w-4 h-4 mr-2" />
                                Invoice
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Downloads Tab */}
            <TabsContent value="downloads" className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-navy animate-spin" />
                </div>
              ) : downloads.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Download className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-heading font-semibold text-navy mb-2">
                    No Downloads Yet
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Your download history will appear here once you download a purchased product.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  {downloads.map((download, index) => (
                    <div 
                      key={download.id}
                      className={`flex items-center gap-4 p-4 ${index > 0 ? 'border-t border-slate-100' : ''}`}
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                        <img
                          src={download.product?.image}
                          alt={download.product?.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-semibold text-navy truncate">
                          {download.product?.name}
                        </h3>
                        <p className="text-sm text-slate-500">
                          Last downloaded: {formatDate(download.last_downloaded)}
                        </p>
                      </div>
                      <div className="text-center px-4">
                        <p className="text-2xl font-bold text-navy">{download.download_count}</p>
                        <p className="text-xs text-slate-500">Downloads</p>
                      </div>
                      <Button
                        onClick={() => handleDownload(download.product_id, download.product?.name)}
                        disabled={downloadingProducts[download.product_id]}
                        variant="outline"
                        className="rounded-xl"
                      >
                        {downloadingProducts[download.product_id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Re-download
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <ProfileSection user={user} onLogout={handleLogout} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

// Profile Section Component
const ProfileSection = ({ user, onLogout }) => {
  const { updateProfile, changePassword } = useAuth();
  
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: user.name || ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await updateProfile(profileData);
    
    if (result.success) {
      toast.success('Profile updated successfully');
      setEditMode(false);
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    setPasswordLoading(true);
    
    const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
    
    if (result.success) {
      toast.success('Password changed successfully');
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      toast.error(result.error);
    }
    
    setPasswordLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Profile Info */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-heading font-semibold text-navy">
              Personal Information
            </h3>
            {!editMode && (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)} className="rounded-lg">
                Edit Profile
              </Button>
            )}
          </div>
          
          {editMode ? (
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  className="h-11 rounded-xl"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  value={user.email}
                  disabled
                  className="h-11 rounded-xl bg-slate-50"
                />
                <p className="text-xs text-slate-500">Email cannot be changed</p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading} className="bg-navy hover:bg-navy/90 rounded-xl">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditMode(false)} className="rounded-xl">
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-16 h-16 bg-navy rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-navy text-lg">{user.name}</p>
                  <p className="text-slate-600">{user.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-sm text-slate-500">Account Status</p>
                  <Badge className={user.email_verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                    {user.email_verified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Member Since</p>
                  <p className="font-medium text-navy">
                    {new Date(user.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-heading font-semibold text-navy">
              Password & Security
            </h3>
          </div>
          
          {showPasswordForm ? (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="h-11 rounded-xl"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="h-11 rounded-xl"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="h-11 rounded-xl"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={passwordLoading} className="bg-navy hover:bg-navy/90 rounded-xl">
                  {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowPasswordForm(false)} className="rounded-xl">
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="outline" onClick={() => setShowPasswordForm(true)} className="rounded-xl">
              Change Password
            </Button>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-heading font-semibold text-navy mb-4">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <Link to="/marketplace">
              <Button variant="ghost" className="w-full justify-start rounded-xl">
                <ShoppingBag className="w-4 h-4 mr-3" />
                Browse Marketplace
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="ghost" className="w-full justify-start rounded-xl">
                <Mail className="w-4 h-4 mr-3" />
                Contact Support
              </Button>
            </Link>
            <Separator className="my-2" />
            <Button 
              variant="ghost" 
              onClick={onLogout}
              className="w-full justify-start rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
          <h3 className="text-lg font-heading font-semibold text-red-700 mb-2">
            Danger Zone
          </h3>
          <p className="text-sm text-red-600 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <Button 
            variant="outline" 
            className="border-red-300 text-red-600 hover:bg-red-100 rounded-xl"
            onClick={() => toast.info('Contact support to delete your account')}
          >
            Delete Account
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
