import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Star, ShoppingCart, CheckCircle, Download, Shield, 
  ArrowLeft, Share2, Heart, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import Layout from '@/components/layout/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const { addToCart, isInCart } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`${API}/products/${id}`);
        setProduct(response.data);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (isInCart(product.id)) {
      toast.info('Already in cart');
    } else {
      addToCart(product);
      toast.success('Added to cart!');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/4 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="aspect-video bg-slate-200 rounded-2xl" />
              <div className="space-y-4">
                <div className="h-10 bg-slate-200 rounded w-3/4" />
                <div className="h-6 bg-slate-200 rounded w-1/2" />
                <div className="h-32 bg-slate-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-2xl font-heading font-semibold text-navy mb-4">Product Not Found</h1>
          <Link to="/marketplace">
            <Button variant="outline">Back to Marketplace</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const allImages = [product.image, ...(product.preview_images || [])];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="product-detail">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-8" data-testid="breadcrumb">
          <Link to="/marketplace" className="text-slate-500 hover:text-navy flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Marketplace
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500 capitalize">{product.category.replace('_', ' ')}</span>
          <span className="text-slate-300">/</span>
          <span className="text-navy">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div data-testid="product-images">
            <div className="aspect-video rounded-2xl overflow-hidden bg-slate-100 mb-4">
              <img
                src={allImages[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {allImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                      selectedImage === index ? 'border-gold' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="mb-6">
              <Badge className="mb-3 bg-gold/10 text-navy border-gold capitalize">
                {product.category.replace('_', ' ')}
              </Badge>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-navy mb-3" data-testid="product-name">
                {product.name}
              </h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${i < Math.floor(product.rating) ? 'text-gold fill-gold' : 'text-slate-200'}`}
                    />
                  ))}
                  <span className="ml-2 text-slate-600">{product.rating}</span>
                </div>
                <span className="text-slate-400">|</span>
                <span className="text-slate-600 flex items-center gap-1">
                  <Download className="w-4 h-4" /> {product.downloads} downloads
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed" data-testid="product-description">
                {product.description}
              </p>
            </div>

            {/* Price & Actions */}
            <div className="bg-slate-50 rounded-2xl p-6 mb-6">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <span className="text-sm text-slate-500">Price</span>
                  <div className="text-4xl font-bold text-navy" data-testid="product-price">
                    ₹{product.price.toLocaleString()}
                  </div>
                </div>
                <Badge variant="outline" className="border-green-500 text-green-700">
                  {product.license_type} License
                </Badge>
              </div>

              <div className="flex gap-3 mb-4">
                <Button
                  size="lg"
                  onClick={handleAddToCart}
                  className={`flex-grow rounded-full ${isInCart(product.id) ? 'bg-green-600 hover:bg-green-700' : 'bg-navy hover:bg-navy-800'}`}
                  data-testid="add-to-cart-btn"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {isInCart(product.id) ? 'In Cart' : 'Add to Cart'}
                </Button>
                <Button size="lg" variant="outline" className="rounded-full px-4">
                  <Heart className="w-5 h-5" />
                </Button>
                <Button size="lg" variant="outline" className="rounded-full px-4">
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>

              <Link to="/cart" className="block">
                <Button size="lg" variant="outline" className="w-full rounded-full border-gold text-navy hover:bg-gold/10">
                  <Eye className="w-5 h-5 mr-2" /> View Cart & Checkout
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Shield className="w-4 h-4 text-green-500" />
                Secure Purchase
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Download className="w-4 h-4 text-green-500" />
                Instant Download
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Quality Assured
              </div>
            </div>

            {/* Metadata */}
            {(product.platform || product.industry) && (
              <div className="flex flex-wrap gap-2 mb-6">
                {product.platform && (
                  <Badge variant="outline">{product.platform}</Badge>
                )}
                {product.industry && (
                  <Badge variant="outline">{product.industry}</Badge>
                )}
                {product.style && (
                  <Badge variant="outline">{product.style}</Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-12" data-testid="product-tabs">
          <Tabs defaultValue="features">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="license">License</TabsTrigger>
              <TabsTrigger value="support">Support</TabsTrigger>
            </TabsList>
            <TabsContent value="features" className="mt-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-heading text-xl font-semibold text-navy mb-4">What's Included</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-slate-600">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="license" className="mt-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-heading text-xl font-semibold text-navy mb-4">{product.license_type} License</h3>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Use in unlimited personal projects
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    {product.license_type === 'Extended' ? 'Use in commercial projects' : 'Use in one commercial project'}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Modify and customize as needed
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    {product.license_type === 'Extended' ? 'Resell as part of your product' : 'Cannot resell as standalone'}
                  </li>
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="support" className="mt-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-heading text-xl font-semibold text-navy mb-4">Support & Updates</h3>
                <ul className="space-y-3 text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    6 months of free updates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Email support within 24 hours
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Documentation and guides included
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    30-day money-back guarantee
                  </li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetailPage;
