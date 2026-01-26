import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import Layout from '@/components/layout/Layout';

const CartPage = () => {
  const { cartItems, removeFromCart, clearCart, cartTotal } = useCart();

  if (cartItems.length === 0) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center" data-testid="empty-cart">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-slate-400" />
          </div>
          <h1 className="font-heading text-3xl font-semibold text-navy mb-4">Your Cart is Empty</h1>
          <p className="text-slate-600 mb-8">
            Looks like you haven't added any items to your cart yet.
          </p>
          <Link to="/marketplace">
            <Button size="lg" className="bg-navy hover:bg-navy-800 text-white rounded-full px-8">
              Browse Marketplace <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" data-testid="cart-page">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-navy" data-testid="cart-title">
            Shopping Cart
          </h1>
          <Link to="/marketplace" className="text-slate-600 hover:text-navy flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {cartItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex gap-4 p-6 ${index !== cartItems.length - 1 ? 'border-b border-slate-100' : ''}`}
                  data-testid={`cart-item-${index}`}
                >
                  <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-grow">
                    <Link to={`/product/${item.id}`} className="font-heading font-semibold text-navy hover:text-gold transition-colors">
                      {item.name}
                    </Link>
                    <p className="text-sm text-slate-500 capitalize">{item.category.replace('_', ' ')}</p>
                    <p className="text-sm text-slate-500">{item.license_type} License</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-navy">₹{item.price.toLocaleString()}</p>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 mt-2"
                      data-testid={`remove-item-${index}`}
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={clearCart}
              className="mt-4 text-sm text-slate-500 hover:text-red-500 flex items-center gap-1"
              data-testid="clear-cart"
            >
              <Trash2 className="w-4 h-4" /> Clear Cart
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-slate-50 rounded-xl p-6 sticky top-24" data-testid="order-summary">
              <h2 className="font-heading text-xl font-semibold text-navy mb-6">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})</span>
                  <span>₹{cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax (GST 18%)</span>
                  <span>₹{(cartTotal * 0.18).toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="font-semibold text-navy">Total</span>
                  <span className="text-2xl font-bold text-navy" data-testid="cart-total">
                    ₹{(cartTotal * 1.18).toLocaleString()}
                  </span>
                </div>
              </div>

              <Link to="/checkout">
                <Button size="lg" className="w-full bg-navy hover:bg-navy-800 text-white rounded-full" data-testid="checkout-btn">
                  Proceed to Checkout <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>

              <p className="text-xs text-slate-500 text-center mt-4">
                Secure checkout powered by Razorpay
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CartPage;
