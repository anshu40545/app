import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Search, Filter, Star, ShoppingCart, Grid, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import Layout from '@/components/layout/Layout';
import { apiClient } from '@/lib/api';

const MarketplacePage = () => {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: category || 'all',
    subcategory: '',
    platform: 'all',
    industry: 'all',
    priceRange: [0, 10000]
  });

  const { addToCart, isInCart } = useCart();

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'template', label: 'Website Templates' },
    { value: 'software', label: 'Software' },
    { value: 'logo', label: 'Logo & Branding' },
    { value: 'app_template', label: 'Mobile App Templates' },
    { value: 'design_asset', label: 'Design Assets' },
  ];

  const platforms = [
    { value: 'all', label: 'All Platforms' },
    { value: 'React', label: 'React' },
    { value: 'Next.js', label: 'Next.js' },
    { value: 'Vue.js', label: 'Vue.js' },
    { value: 'Flutter', label: 'Flutter' },
    { value: 'React Native', label: 'React Native' },
    { value: 'Electron', label: 'Electron' },
    { value: 'Python + React', label: 'Python + React' },
    { value: 'React + Electron', label: 'React + Electron' },
    { value: 'React + Node.js', label: 'React + Node.js' },
  ];

  const industries = [
    { value: 'all', label: 'All Industries' },
    { value: 'Business', label: 'Business' },
    { value: 'Technology', label: 'Technology' },
    { value: 'Creative', label: 'Creative' },
    { value: 'Retail', label: 'Retail' },
    { value: 'Food & Beverage', label: 'Food & Beverage' },
    { value: 'Health & Fitness', label: 'Health & Fitness' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Real Estate', label: 'Real Estate' },
    { value: 'Education', label: 'Education' },
    { value: 'Social', label: 'Social' },
    { value: 'Travel', label: 'Travel' },
    { value: 'Fashion', label: 'Fashion' },
    { value: 'Environment', label: 'Environment' },
    { value: 'General', label: 'General' },
  ];

  useEffect(() => {
    if (category) {
      setFilters(prev => ({ ...prev, category }));
    }
  }, [category]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.category && filters.category !== 'all') params.append('category', filters.category);
        if (filters.subcategory) params.append('subcategory', filters.subcategory);
        if (filters.platform && filters.platform !== 'all') params.append('platform', filters.platform);
        if (filters.industry && filters.industry !== 'all') params.append('industry', filters.industry);
        if (filters.search) params.append('search', filters.search);
        if (filters.priceRange[0] > 0) params.append('min_price', filters.priceRange[0]);
        if (filters.priceRange[1] < 10000) params.append('max_price', filters.priceRange[1]);

        const response = await apiClient.get(`/products?${params.toString()}`);
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filters]);

  const handleAddToCart = (product, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInCart(product.id)) {
      toast.info('Already in cart');
    } else {
      addToCart(product);
      toast.success('Added to cart');
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      subcategory: '',
      platform: 'all',
      industry: 'all',
      priceRange: [0, 10000]
    });
  };

  const getCategoryTitle = () => {
    if (!filters.category || filters.category === 'all') return 'All Products';
    const cat = categories.find(c => c.value === filters.category);
    return cat ? cat.label : 'Products';
  };

  return (
    <Layout>
      {/* Header */}
      <section className="py-12 bg-gradient-to-b from-slate-50 to-white" data-testid="marketplace-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="mb-4 bg-gold/10 text-navy border-gold">Marketplace</Badge>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-navy mb-4" data-testid="marketplace-title">
            {getCategoryTitle()}
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            Premium digital assets ready for instant download. Templates, logos, and more.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0" data-testid="desktop-filters">
            <div className="sticky top-24 bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading font-semibold text-navy">Filters</h3>
                <button onClick={clearFilters} className="text-sm text-gold hover:underline">
                  Clear all
                </button>
              </div>

              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Search products..."
                    className="pl-10"
                    data-testid="search-input"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
                  <SelectTrigger data-testid="filter-category">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Platform */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Platform</label>
                <Select value={filters.platform} onValueChange={(v) => setFilters({ ...filters, platform: v })}>
                  <SelectTrigger data-testid="filter-platform">
                    <SelectValue placeholder="All Platforms" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Industry */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Industry</label>
                <Select value={filters.industry} onValueChange={(v) => setFilters({ ...filters, industry: v })}>
                  <SelectTrigger data-testid="filter-industry">
                    <SelectValue placeholder="All Industries" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((i) => (
                      <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Price Range: ₹{filters.priceRange[0]} - ₹{filters.priceRange[1]}
                </label>
                <Slider
                  value={filters.priceRange}
                  min={0}
                  max={10000}
                  step={500}
                  onValueChange={(v) => setFilters({ ...filters, priceRange: v })}
                  className="mt-4"
                  data-testid="price-slider"
                />
              </div>
            </div>
          </aside>

          {/* Mobile Filter Button */}
          <div className="lg:hidden flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-2"
              data-testid="mobile-filter-btn"
            >
              <Filter className="w-4 h-4" /> Filters
            </Button>
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Mobile Filters Modal */}
          {showFilters && (
            <div className="fixed inset-0 z-50 lg:hidden" data-testid="mobile-filters-modal">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
              <div className="absolute right-0 top-0 h-full w-80 bg-white p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-heading font-semibold text-navy">Filters</h3>
                  <button onClick={() => setShowFilters(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {/* Same filter content as desktop */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                    <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
                      <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Platform</label>
                    <Select value={filters.platform} onValueChange={(v) => setFilters({ ...filters, platform: v })}>
                      <SelectTrigger><SelectValue placeholder="All Platforms" /></SelectTrigger>
                      <SelectContent>
                        {platforms.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => setShowFilters(false)} className="w-full">
                    Apply Filters
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="flex-grow">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-600" data-testid="products-count">
                {products.length} product{products.length !== 1 ? 's' : ''} found
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-navy text-white' : 'bg-slate-100'}`}
                  data-testid="view-grid"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-navy text-white' : 'bg-slate-100'}`}
                  data-testid="view-list"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Products */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-slate-100 rounded-xl h-80" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16" data-testid="no-products">
                <p className="text-slate-500 text-lg mb-4">No products found</p>
                <Button onClick={clearFilters} variant="outline">Clear Filters</Button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="products-grid">
                {products.map((product, index) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300"
                    data-testid={`product-card-${index}`}
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <Badge className="absolute top-3 left-3 bg-white/90 text-navy capitalize">
                        {product.category.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="p-5">
                      <h3 className="font-heading font-semibold text-navy mb-2 group-hover:text-gold transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{product.description}</p>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xl font-bold text-navy">₹{product.price.toLocaleString()}</span>
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Star className="w-4 h-4 text-gold fill-gold" /> {product.rating}
                        </div>
                      </div>
                      <Button
                        onClick={(e) => handleAddToCart(product, e)}
                        className={`w-full rounded-full ${isInCart(product.id) ? 'bg-green-600 hover:bg-green-700' : 'bg-navy hover:bg-navy-800'}`}
                        data-testid={`add-to-cart-${index}`}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {isInCart(product.id) ? 'In Cart' : 'Add to Cart'}
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="space-y-4" data-testid="products-list">
                {products.map((product, index) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="group flex gap-6 bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-all duration-300"
                    data-testid={`product-list-${index}`}
                  >
                    <div className="w-48 h-32 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge className="mb-2 bg-slate-100 text-navy capitalize">
                            {product.category.replace('_', ' ')}
                          </Badge>
                          <h3 className="font-heading text-lg font-semibold text-navy group-hover:text-gold transition-colors">
                            {product.name}
                          </h3>
                        </div>
                        <span className="text-xl font-bold text-navy">₹{product.price.toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-500 mb-3">{product.description}</p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Star className="w-4 h-4 text-gold fill-gold" /> {product.rating}
                        </div>
                        {product.platform && (
                          <Badge variant="outline">{product.platform}</Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MarketplacePage;
