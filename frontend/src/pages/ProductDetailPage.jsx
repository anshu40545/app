import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Star, ShoppingCart, CheckCircle, Download, Shield, 
  ArrowLeft, Share2, Heart, Eye, Copy, Facebook, Twitter, Linkedin,
  ChevronLeft, ChevronRight, Zap, Clock, RefreshCw
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
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const { addToCart, isInCart } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`${API}/products/${id}`);
        setProduct(response.data);
        
        // Fetch related products
        const relatedResponse = await axios.get(`${API}/products?category=${response.data.category}&limit=4`);
        setRelatedProducts(relatedResponse.data.filter(p => p.id !== id).slice(0, 3));
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
    setSelectedImage(0);
  }, [id]);

  const handleAddToCart = () => {
    if (isInCart(product.id)) {
      toast.info('Already in cart');
    } else {
      addToCart(product);
      toast.success('Added to cart!');
    }
  };

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const text = `Check out ${product.name} on Devmora!`;
    
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

  const nextImage = () => {
    if (allImages.length > 1) {
      setSelectedImage((prev) => (prev + 1) % allImages.length);
    }
  };

  const prevImage = () => {
    if (allImages.length > 1) {
      setSelectedImage((prev) => (prev - 1 + allImages.length) % allImages.length);
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
          <span className="text-navy font-medium">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div data-testid="product-images">
            <div className="aspect-video rounded-2xl overflow-hidden bg-slate-100 mb-4 relative group">
              <img
                src={allImages[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {allImages.length > 1 && (
                <>
                  <button 
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft className="w-5 h-5 text-navy" />
                  </button>
                  <button 
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight className="w-5 h-5 text-navy" />
                  </button>
                </>
              )}
              <Badge className="absolute top-4 right-4 bg-white/90 text-navy">
                {selectedImage + 1} / {allImages.length}
              </Badge>
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {allImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-24 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                      selectedImage === index ? 'border-gold shadow-lg' : 'border-transparent hover:border-slate-200'
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
                  <span className="ml-2 text-slate-600 font-medium">{product.rating}</span>
                </div>
                <span className="text-slate-400">|</span>
                <span className="text-slate-600 flex items-center gap-1">
                  <Download className="w-4 h-4" /> {product.downloads} downloads
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed text-lg" data-testid="product-description">
                {product.description}
              </p>
            </div>

            {/* Price & Actions */}
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 mb-6 border border-slate-100">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <span className="text-sm text-slate-500">Price</span>
                  <div className="text-4xl font-bold text-navy" data-testid="product-price">
                    ₹{product.price.toLocaleString()}
                  </div>
                  <span className="text-sm text-green-600 font-medium">✓ Instant delivery</span>
                </div>
                <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                  {product.license_type} License
                </Badge>
              </div>

              <div className="flex gap-3 mb-4">
                <Button
                  size="lg"
                  onClick={handleAddToCart}
                  className={`flex-grow rounded-full text-lg py-6 ${isInCart(product.id) ? 'bg-green-600 hover:bg-green-700' : 'bg-navy hover:bg-navy-800'}`}
                  data-testid="add-to-cart-btn"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {isInCart(product.id) ? 'In Cart' : 'Add to Cart'}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className={`rounded-full px-4 ${isWishlisted ? 'border-red-500 text-red-500' : ''}`}
                  onClick={handleWishlist}
                >
                  <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500' : ''}`} />
                </Button>
                <div className="relative">
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="rounded-full px-4"
                    onClick={() => setShowShareMenu(!showShareMenu)}
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                  {showShareMenu && (
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 w-48">
                      <button onClick={() => handleShare('copy')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-left">
                        <Copy className="w-4 h-4" /> Copy Link
                      </button>
                      <button onClick={() => handleShare('facebook')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-left">
                        <Facebook className="w-4 h-4" /> Facebook
                      </button>
                      <button onClick={() => handleShare('twitter')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-left">
                        <Twitter className="w-4 h-4" /> Twitter
                      </button>
                      <button onClick={() => handleShare('linkedin')} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-left">
                        <Linkedin className="w-4 h-4" /> LinkedIn
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <Link to="/cart" className="block">
                <Button size="lg" variant="outline" className="w-full rounded-full border-gold text-navy hover:bg-gold/10 py-6">
                  <Eye className="w-5 h-5 mr-2" /> View Cart & Checkout
                </Button>
              </Link>
            </div>

            {/* Quick Benefits */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-slate-50 rounded-xl">
                <Zap className="w-6 h-6 text-gold mx-auto mb-2" />
                <span className="text-xs text-slate-600">Instant Download</span>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-xl">
                <RefreshCw className="w-6 h-6 text-gold mx-auto mb-2" />
                <span className="text-xs text-slate-600">Free Updates</span>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-xl">
                <Clock className="w-6 h-6 text-gold mx-auto mb-2" />
                <span className="text-xs text-slate-600">24h Support</span>
              </div>
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

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 pt-16 border-t border-slate-200" data-testid="related-products">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-heading text-2xl font-semibold text-navy">Related Products</h2>
              <Link to={`/marketplace/${product.category}`} className="text-gold font-medium hover:underline">
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  to={`/product/${relatedProduct.id}`}
                  className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300"
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={relatedProduct.image}
                      alt={relatedProduct.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <Badge className="absolute top-3 left-3 bg-white/90 text-navy capitalize">
                      {relatedProduct.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="p-5">
                    <h3 className="font-heading font-semibold text-navy mb-2 group-hover:text-gold transition-colors">
                      {relatedProduct.name}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{relatedProduct.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-navy">₹{relatedProduct.price.toLocaleString()}</span>
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Star className="w-4 h-4 text-gold fill-gold" /> {relatedProduct.rating}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
};

export default ProductDetailPage;
