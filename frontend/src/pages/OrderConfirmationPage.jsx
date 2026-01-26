import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Download, ArrowRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const OrderConfirmationPage = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await axios.get(`${API}/orders/${orderId}`);
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20" data-testid="order-confirmation">
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="font-heading text-4xl font-bold text-navy mb-4" data-testid="confirmation-title">
            Thank You for Your Purchase!
          </h1>
          <p className="text-slate-600">
            Your order has been confirmed and your downloads are ready.
          </p>
        </div>

        {order && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-8" data-testid="order-details">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Order ID</p>
                  <p className="font-mono font-medium text-navy">{order.id}</p>
                </div>
                <Badge className={order.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                  {order.status === 'paid' ? 'Paid' : 'Pending'}
                </Badge>
              </div>
            </div>

            <div className="p-6">
              <h3 className="font-heading font-semibold text-navy mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center" data-testid={`order-item-${index}`}>
                    <div>
                      <p className="font-medium text-navy">{item.name}</p>
                      <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-navy">₹{item.item_total.toLocaleString()}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 mt-6 pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span className="text-navy">Total Paid</span>
                  <span className="text-navy">₹{order.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download Section */}
        <div className="bg-navy rounded-xl p-6 mb-8 text-center" data-testid="download-section">
          <Download className="w-10 h-10 text-gold mx-auto mb-4" />
          <h3 className="font-heading text-xl font-semibold text-white mb-2">
            Download Your Files
          </h3>
          <p className="text-slate-300 mb-4 text-sm">
            Your download links have been sent to your email. You can also download directly below.
          </p>
          <Button className="bg-gold text-navy hover:bg-gold-light rounded-full px-8">
            <Download className="w-4 h-4 mr-2" /> Download All Files
          </Button>
        </div>

        {/* Email Notice */}
        <div className="bg-slate-50 rounded-xl p-6 text-center">
          <Mail className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 text-sm">
            A confirmation email with download links has been sent to{' '}
            <span className="font-medium text-navy">{order?.customer_email || 'your email'}</span>
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
          <Link to="/marketplace">
            <Button variant="outline" className="w-full sm:w-auto rounded-full px-6">
              Continue Shopping <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="w-full sm:w-auto rounded-full px-6">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default OrderConfirmationPage;
