import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Download, ArrowRight, Mail, Share2, Copy, Facebook, Twitter, Linkedin, FileDown, Package, Clock, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Layout from '@/components/layout/Layout';
import { apiClient } from '@/lib/api';

const OrderConfirmationPage = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingItem, setDownloadingItem] = useState(null);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await apiClient.get(`/orders/${orderId}`);
        setOrder(response.data);
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const handleDownload = (itemIndex) => {
    setDownloadingItem(itemIndex);
    // Simulate download
    setTimeout(() => {
      setDownloadingItem(null);
      toast.success('Download started!');
    }, 1500);
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const text = 'I just made a purchase on Devmora! Check out their amazing digital products.';
    
    const shareUrls = {
      copy: () => {
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      },
      facebook: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank'),
      twitter: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank'),
      linkedin: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank'),
    };
    
    shareUrls[platform]?.();
    setShowShareMenu(false);
  };

  const benefits = [
    { icon: FileDown, title: 'Instant Download', desc: 'Access your files immediately' },
    { icon: Clock, title: '6 Months Updates', desc: 'Free updates and improvements' },
    { icon: Shield, title: 'Secure License', desc: 'Use in your projects legally' },
    { icon: Mail, title: 'Email Support', desc: '24h response time guaranteed' },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="animate-pulse">
            <div className="w-24 h-24 bg-slate-200 rounded-full mx-auto mb-6" />
            <div className="h-8 bg-slate-200 rounded w-3/4 mx-auto mb-4" />
            <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20" data-testid="order-confirmation">
        {/* Success Animation */}
        <div className="text-center mb-12">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-navy mb-4" data-testid="confirmation-title">
            Thank You! 🎉
          </h1>
          <p className="text-lg text-slate-600 mb-2">
            Your order has been confirmed and your downloads are ready.
          </p>
          <p className="text-sm text-slate-500">
            Order ID: <span className="font-mono font-medium text-navy">{orderId}</span>
          </p>
        </div>

        {order && (
          <>
            {/* Order Details Card */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-8 shadow-lg" data-testid="order-details">
              <div className="bg-gradient-to-r from-navy to-navy-800 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm">Order Placed</p>
                    <p className="font-medium text-white">{new Date().toLocaleDateString('en-IN', { 
                      day: 'numeric', month: 'long', year: 'numeric' 
                    })}</p>
                  </div>
                  <Badge className={`${order.status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'} text-white shadow-lg`}>
                    {order.status === 'paid' ? '✓ Paid' : '⏳ Processing'}
                  </Badge>
                </div>
              </div>

              <div className="p-6">
                <h3 className="font-heading font-semibold text-navy mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" /> Order Items
                </h3>
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                      data-testid={`order-item-${index}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-12 bg-slate-200 rounded-lg overflow-hidden">
                          {item.image && (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-navy">{item.name}</p>
                          <p className="text-sm text-slate-500">Qty: {item.quantity} • {item.license_type || 'Standard'} License</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-semibold text-navy">₹{item.item_total.toLocaleString()}</p>
                        <Button
                          size="sm"
                          onClick={() => handleDownload(index)}
                          disabled={downloadingItem === index}
                          className="bg-gold text-navy hover:bg-gold-light rounded-full"
                        >
                          {downloadingItem === index ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                              Preparing...
                            </span>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-1" /> Download
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 mt-6 pt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-navy">Total Paid</span>
                    <span className="text-2xl text-navy">₹{order.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Download All Section */}
            <div className="bg-gradient-to-br from-navy via-navy-800 to-navy rounded-2xl p-8 mb-8 text-center relative overflow-hidden" data-testid="download-section">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />
              <div className="relative">
                <Sparkles className="w-10 h-10 text-gold mx-auto mb-4" />
                <h3 className="font-heading text-2xl font-semibold text-white mb-2">
                  Download All Your Files
                </h3>
                <p className="text-slate-300 mb-6 text-sm max-w-md mx-auto">
                  Get all your purchased items in one convenient ZIP file. Your download links have also been sent to your email.
                </p>
                <Button 
                  size="lg" 
                  className="bg-gold text-navy hover:bg-gold-light rounded-full px-8 shadow-lg"
                  onClick={() => handleDownload('all')}
                >
                  <Download className="w-5 h-5 mr-2" /> Download All Files (.zip)
                </Button>
              </div>
            </div>

            {/* Benefits Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="bg-slate-50 rounded-xl p-4 text-center">
                  <benefit.icon className="w-8 h-8 text-gold mx-auto mb-2" />
                  <h4 className="font-medium text-navy text-sm">{benefit.title}</h4>
                  <p className="text-xs text-slate-500">{benefit.desc}</p>
                </div>
              ))}
            </div>

            {/* Email Notice */}
            <div className="bg-blue-50 rounded-xl p-6 flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Check Your Email</h4>
                <p className="text-blue-700 text-sm">
                  A confirmation email with download links has been sent to{' '}
                  <span className="font-medium">{order?.customer_email || 'your email address'}</span>
                </p>
              </div>
            </div>

            {/* Share & Social */}
            <div className="text-center mb-8">
              <p className="text-slate-600 mb-4">Enjoyed your purchase? Share it with others!</p>
              <div className="relative inline-block">
                <Button 
                  variant="outline" 
                  className="rounded-full"
                  onClick={() => setShowShareMenu(!showShareMenu)}
                >
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </Button>
                {showShareMenu && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 w-48">
                    <button onClick={() => handleShare('copy')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-left">
                      <Copy className="w-4 h-4" /> Copy Link
                    </button>
                    <button onClick={() => handleShare('facebook')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-left">
                      <Facebook className="w-4 h-4 text-blue-600" /> Facebook
                    </button>
                    <button onClick={() => handleShare('twitter')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-left">
                      <Twitter className="w-4 h-4 text-sky-500" /> Twitter
                    </button>
                    <button onClick={() => handleShare('linkedin')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-left">
                      <Linkedin className="w-4 h-4 text-blue-700" /> LinkedIn
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/marketplace">
            <Button size="lg" className="w-full sm:w-auto bg-navy hover:bg-navy-800 text-white rounded-full px-8">
              Continue Shopping <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Link to="/">
            <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-8">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default OrderConfirmationPage;
