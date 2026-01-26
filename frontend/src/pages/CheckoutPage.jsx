import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Shield, Lock, CreditCard, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import Layout from '@/components/layout/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    agreeTerms: false
  });

  const totalWithTax = cartTotal * 1.18;

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.agreeTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);

    try {
      // Create order
      const orderResponse = await axios.post(`${API}/orders/create`, {
        items: cartItems.map(item => ({ product_id: item.id, quantity: 1 })),
        customer_email: formData.email,
        customer_name: formData.name
      });

      const { razorpay_order_id, amount, currency, key_id, order_id } = orderResponse.data;

      if (!razorpay_order_id) {
        // If Razorpay is not configured, simulate success for demo
        toast.success('Order placed successfully (Demo Mode)');
        clearCart();
        navigate(`/order-confirmation/${order_id}`);
        return;
      }

      // Load Razorpay
      const res = await loadRazorpay();
      if (!res) {
        toast.error('Razorpay SDK failed to load');
        setLoading(false);
        return;
      }

      // Initialize Razorpay
      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: 'Devmora Web Solutions',
        description: 'Digital Products Purchase',
        order_id: razorpay_order_id,
        handler: async (response) => {
          try {
            // Verify payment
            await axios.post(`${API}/orders/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            toast.success('Payment successful!');
            clearCart();
            navigate(`/order-confirmation/${order_id}`);
          } catch (error) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email
        },
        theme: {
          color: '#1a2b4a'
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="checkout-page">
        <Link to="/cart" className="text-slate-600 hover:text-navy flex items-center gap-1 mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Checkout Form */}
          <div>
            <h1 className="font-heading text-3xl font-bold text-navy mb-8" data-testid="checkout-title">
              Checkout
            </h1>

            <form onSubmit={handlePayment} className="space-y-6" data-testid="checkout-form">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="font-heading text-lg font-semibold text-navy mb-4">Customer Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your full name"
                      data-testid="checkout-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your@email.com"
                      data-testid="checkout-email"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Your download links will be sent to this email
                    </p>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={formData.agreeTerms}
                  onCheckedChange={(checked) => setFormData({ ...formData, agreeTerms: checked })}
                  data-testid="checkout-terms"
                />
                <label htmlFor="terms" className="text-sm text-slate-600">
                  I agree to the <a href="#" className="text-navy underline">Terms of Service</a> and{' '}
                  <a href="#" className="text-navy underline">Privacy Policy</a>
                </label>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-navy hover:bg-navy-800 text-white rounded-full"
                disabled={loading}
                data-testid="pay-btn"
              >
                {loading ? 'Processing...' : `Pay ₹${totalWithTax.toLocaleString()}`}
                <CreditCard className="ml-2 w-5 h-5" />
              </Button>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Shield className="w-4 h-4 text-green-500" />
                  Secure Payment
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Lock className="w-4 h-4 text-green-500" />
                  256-bit SSL
                </div>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-slate-50 rounded-xl p-6 sticky top-24" data-testid="checkout-summary">
              <h2 className="font-heading text-xl font-semibold text-navy mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                {cartItems.map((item, index) => (
                  <div key={item.id} className="flex gap-4" data-testid={`summary-item-${index}`}>
                    <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-grow">
                      <p className="font-medium text-navy text-sm">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.license_type} License</p>
                    </div>
                    <p className="font-semibold text-navy">₹{item.price.toLocaleString()}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>₹{cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax (GST 18%)</span>
                  <span>₹{(cartTotal * 0.18).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-slate-200">
                  <span className="font-semibold text-navy">Total</span>
                  <span className="text-2xl font-bold text-navy">₹{totalWithTax.toLocaleString()}</span>
                </div>
              </div>

              {/* What you get */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="font-medium text-navy mb-3">What you'll get:</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Instant download access
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Full source files
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    6 months of free updates
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Email support
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CheckoutPage;
