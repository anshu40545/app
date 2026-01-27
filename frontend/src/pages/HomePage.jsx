import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, Code, Globe, Smartphone, Palette, Package, Award,
  CheckCircle, Star, Users, Briefcase, Shield, Clock, Play, ChevronLeft, ChevronRight,
  Sparkles, Zap, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';
import { apiClient } from '@/lib/api';

// Animated counter component
const AnimatedCounter = ({ end, duration = 2000, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (countRef.current) {
      observer.observe(countRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    
    let startTime;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [isVisible, end, duration]);

  return <span ref={countRef}>{count}{suffix}</span>;
};

const HomePage = () => {
  const [stats, setStats] = useState({ years_in_business: 2, completed_projects: 10, happy_clients: 8, products_sold: 25 });
  const [testimonials, setTestimonials] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [products, setProducts] = useState([]);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, testimonialsRes, portfolioRes, productsRes] = await Promise.all([
          apiClient.get('/stats'),
          apiClient.get('/testimonials'),
          apiClient.get('/portfolio?featured=true'),
          apiClient.get('/products')
        ]);
        setStats(statsRes.data);
        setTestimonials(testimonialsRes.data);
        setPortfolio(portfolioRes.data.slice(0, 3));
        setProducts(productsRes.data.slice(0, 4));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    if (testimonials.length > 1) {
      const interval = setInterval(() => {
        setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [testimonials.length]);

  const services = [
    { icon: Code, title: 'Custom Software', description: 'Tailored solutions built to transform your business operations', link: '/services', color: 'from-blue-500 to-indigo-600' },
    { icon: Globe, title: 'Website Development', description: 'High-performance websites that convert visitors into customers', link: '/services', color: 'from-emerald-500 to-teal-600' },
    { icon: Palette, title: 'UI/UX Design', description: 'User-centric designs that delight and engage', link: '/services', color: 'from-pink-500 to-rose-600' },
    { icon: Smartphone, title: 'Android Apps', description: 'Native Android applications with seamless experiences', link: '/services', color: 'from-green-500 to-emerald-600' },
    { icon: Package, title: 'Design Templates', description: 'Premium templates for instant professional presence', link: '/marketplace/template', color: 'from-orange-500 to-amber-600' },
    { icon: Award, title: 'Logo & Branding', description: 'Memorable brand identities that stand out', link: '/marketplace/logo', color: 'from-purple-500 to-violet-600' },
  ];

  const techLogos = [
    { name: 'React', icon: '⚛️' },
    { name: 'Node.js', icon: '🟢' },
    { name: 'Python', icon: '🐍' },
    { name: 'MongoDB', icon: '🍃' },
    { name: 'AWS', icon: '☁️' },
    { name: 'Flutter', icon: '💙' },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white min-h-[90vh] flex items-center" data-testid="hero-section">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1603615659147-ff90178359b7?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-[0.03]" />
        
        {/* Animated background elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-gold/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-navy/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              {/* Trust Badges */}
              <div className="flex flex-wrap gap-3 mb-8 animate-fade-in">
                <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50 py-1.5">
                  <Shield className="w-3 h-3 mr-1" /> SSL Secured
                </Badge>
                <Badge variant="outline" className="border-gold text-navy bg-gold/10 py-1.5">
                  <Award className="w-3 h-3 mr-1" /> Certified Partner
                </Badge>
                <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50 py-1.5">
                  <Sparkles className="w-3 h-3 mr-1" /> Top Rated
                </Badge>
              </div>

              <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-navy leading-tight mb-6" data-testid="hero-title">
                Build Digital
                <span className="block bg-gradient-to-r from-gold via-amber-500 to-gold bg-clip-text text-transparent">Excellence</span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-600 leading-relaxed mb-8 max-w-xl" data-testid="hero-description">
                Premium software development and ready-to-use digital assets. 
                From custom solutions to instant templates, we power your digital success.
              </p>

              <div className="flex flex-wrap gap-4 mb-12">
                <Link to="/services" data-testid="cta-get-quote">
                  <Button size="lg" className="bg-navy hover:bg-navy-800 text-white rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all group">
                    Get a Quote <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/marketplace" data-testid="cta-browse-templates">
                  <Button size="lg" variant="outline" className="border-2 border-navy text-navy hover:bg-navy hover:text-white rounded-full px-8 py-6 text-lg transition-all">
                    Browse Templates
                  </Button>
                </Link>
              </div>

              {/* Stats with animated counters */}
              <div className="grid grid-cols-3 gap-6">
                <div data-testid="stat-years" className="text-center md:text-left">
                  <div className="text-3xl md:text-4xl font-heading font-bold text-navy">
                    <AnimatedCounter end={stats.years_in_business} suffix="+" />
                  </div>
                  <div className="text-sm text-slate-500">Years Experience</div>
                </div>
                <div data-testid="stat-projects" className="text-center md:text-left">
                  <div className="text-3xl md:text-4xl font-heading font-bold text-navy">
                    <AnimatedCounter end={stats.completed_projects} suffix="+" />
                  </div>
                  <div className="text-sm text-slate-500">Projects Delivered</div>
                </div>
                <div data-testid="stat-clients" className="text-center md:text-left">
                  <div className="text-3xl md:text-4xl font-heading font-bold text-navy">
                    <AnimatedCounter end={stats.happy_clients} suffix="+" />
                  </div>
                  <div className="text-sm text-slate-500">Happy Clients</div>
                </div>
              </div>
            </div>

            {/* Hero Image Grid */}
            <div className="lg:col-span-5 hidden lg:block">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-gold/20 to-navy/20 rounded-3xl blur-3xl animate-pulse" />
                <div className="relative grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="relative group">
                      <img 
                        src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=400"
                        alt="Dashboard"
                        className="rounded-2xl shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy/50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span className="text-white text-sm font-medium">Analytics Dashboard</span>
                      </div>
                    </div>
                    <div className="relative group">
                      <img 
                        src="https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=400"
                        alt="Branding"
                        className="rounded-2xl shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy/50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span className="text-white text-sm font-medium">Brand Design</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 pt-8">
                    <div className="relative group">
                      <img 
                        src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=400"
                        alt="Analytics"
                        className="rounded-2xl shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy/50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span className="text-white text-sm font-medium">Data Visualization</span>
                      </div>
                    </div>
                    <div className="relative group">
                      <img 
                        src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=400"
                        alt="Mobile App"
                        className="rounded-2xl shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy/50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span className="text-white text-sm font-medium">Mobile Apps</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden md:block">
          <div className="w-6 h-10 rounded-full border-2 border-navy/30 flex items-start justify-center p-2">
            <div className="w-1.5 h-1.5 bg-navy rounded-full animate-scroll" />
          </div>
        </div>
      </section>

      {/* Tech Stack Banner */}
      <section className="py-8 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <span className="text-sm text-slate-500 font-medium">Powered by:</span>
            {techLogos.map((tech) => (
              <div key={tech.name} className="flex items-center gap-2 text-slate-600 hover:text-navy transition-colors">
                <span className="text-xl">{tech.icon}</span>
                <span className="text-sm font-medium">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 md:py-32 bg-white" data-testid="services-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-gold/10 text-navy border-gold">Our Expertise</Badge>
            <h2 className="font-heading text-4xl md:text-5xl font-semibold text-navy mb-4">
              Services & Solutions
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From concept to launch, we deliver exceptional digital experiences
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <Link 
                key={service.title} 
                to={service.link}
                className="group relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                data-testid={`service-card-${index}`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gold/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${service.color} rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="relative">
                  <div className={`w-14 h-14 bg-gradient-to-br ${service.color} rounded-xl flex items-center justify-center mb-6 shadow-lg`}>
                    <service.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold text-navy mb-3">{service.title}</h3>
                  <p className="text-slate-600 mb-4">{service.description}</p>
                  <span className="text-navy font-medium flex items-center gap-2 group-hover:text-gold transition-colors">
                    Learn More <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Dual Path CTA */}
      <section className="py-20 bg-slate-50" data-testid="dual-path-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Custom Services */}
            <div className="relative overflow-hidden bg-navy rounded-3xl p-8 md:p-12" data-testid="custom-services-card">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />
              <div className="relative">
                <Badge className="mb-6 bg-gold text-navy">Custom Development</Badge>
                <h3 className="font-heading text-3xl font-semibold text-white mb-4">
                  Need Something Unique?
                </h3>
                <p className="text-slate-300 mb-8">
                  Our team crafts bespoke solutions tailored to your specific requirements. 
                  From enterprise software to mobile apps.
                </p>
                <ul className="space-y-3 mb-8">
                  {['Dedicated Project Manager', 'Agile Development', 'Post-Launch Support'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-slate-200">
                      <CheckCircle className="w-5 h-5 text-gold" /> {item}
                    </li>
                  ))}
                </ul>
                <Link to="/services">
                  <Button size="lg" className="bg-gold text-navy hover:bg-gold-light rounded-full px-8">
                    Get a Free Quote <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Ready Templates */}
            <div className="relative overflow-hidden bg-white rounded-3xl p-8 md:p-12 border border-slate-200" data-testid="templates-card">
              <div className="absolute top-0 right-0 w-64 h-64 bg-navy/5 rounded-full blur-3xl" />
              <div className="relative">
                <Badge className="mb-6 bg-navy/10 text-navy">Instant Download</Badge>
                <h3 className="font-heading text-3xl font-semibold text-navy mb-4">
                  Ready-Made Templates
                </h3>
                <p className="text-slate-600 mb-8">
                  Browse our collection of premium templates and design assets. 
                  Download instantly and launch faster.
                </p>
                <ul className="space-y-3 mb-8">
                  {['Instant Download', 'Full Source Code', 'Commercial License'].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-slate-700">
                      <CheckCircle className="w-5 h-5 text-green-500" /> {item}
                    </li>
                  ))}
                </ul>
                <Link to="/marketplace">
                  <Button size="lg" variant="outline" className="border-2 border-navy text-navy hover:bg-navy hover:text-white rounded-full px-8">
                    Browse Marketplace <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {products.length > 0 && (
        <section className="py-20 md:py-32 bg-white" data-testid="products-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <Badge className="mb-4 bg-gold/10 text-navy border-gold">Marketplace</Badge>
                <h2 className="font-heading text-4xl font-semibold text-navy">Featured Products</h2>
              </div>
              <Link to="/marketplace" className="hidden md:flex items-center gap-2 text-navy font-medium hover:text-gold transition-colors">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-navy">₹{product.price.toLocaleString()}</span>
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Star className="w-4 h-4 text-gold fill-gold" /> {product.rating}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Portfolio Preview */}
      {portfolio.length > 0 && (
        <section className="py-20 md:py-32 bg-slate-50" data-testid="portfolio-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-gold/10 text-navy border-gold">Our Work</Badge>
              <h2 className="font-heading text-4xl md:text-5xl font-semibold text-navy mb-4">
                Featured Projects
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Explore our recent success stories and see how we help businesses thrive
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {portfolio.map((item, index) => (
                <Link 
                  key={item.id}
                  to="/portfolio"
                  className="group relative overflow-hidden rounded-2xl"
                  data-testid={`portfolio-item-${index}`}
                >
                  <div className="aspect-[4/3] relative">
                    <img 
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <Badge className="mb-3 bg-gold text-navy">{item.category}</Badge>
                      <h3 className="font-heading text-xl font-semibold text-white mb-2">{item.title}</h3>
                      <p className="text-slate-300 text-sm line-clamp-2">{item.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link to="/portfolio">
                <Button size="lg" variant="outline" className="border-2 border-navy text-navy hover:bg-navy hover:text-white rounded-full px-8">
                  View All Projects <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-20 md:py-32 bg-white" data-testid="testimonials-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-gold/10 text-navy border-gold">Testimonials</Badge>
              <h2 className="font-heading text-4xl md:text-5xl font-semibold text-navy mb-4">
                Client Success Stories
              </h2>
            </div>

            {/* Testimonial Carousel */}
            <div className="relative max-w-4xl mx-auto">
              <div className="overflow-hidden">
                <div 
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}
                >
                  {testimonials.map((testimonial, index) => (
                    <div 
                      key={testimonial.id}
                      className="w-full flex-shrink-0 px-4"
                      data-testid={`testimonial-${index}`}
                    >
                      <div className="bg-gradient-to-br from-slate-50 to-white rounded-3xl p-8 md:p-12 relative shadow-lg border border-slate-100">
                        <div className="absolute top-6 right-8 text-8xl text-gold/10 font-serif">"</div>
                        <div className="flex items-center gap-1 mb-6">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="w-6 h-6 text-gold fill-gold" />
                          ))}
                        </div>
                        <p className="text-xl md:text-2xl text-slate-700 leading-relaxed mb-8 font-medium italic">
                          "{testimonial.content}"
                        </p>
                        <div className="flex items-center gap-4">
                          <img 
                            src={testimonial.avatar}
                            alt={testimonial.client_name}
                            className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                          />
                          <div>
                            <div className="font-heading font-semibold text-navy text-lg flex items-center gap-2">
                              {testimonial.client_name}
                              {testimonial.verified && (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              )}
                            </div>
                            <div className="text-slate-500">{testimonial.role}, {testimonial.company}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              {testimonials.length > 1 && (
                <>
                  <button 
                    onClick={() => setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6 text-navy" />
                  </button>
                  <button 
                    onClick={() => setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 text-navy" />
                  </button>
                  
                  {/* Dots */}
                  <div className="flex justify-center gap-2 mt-8">
                    {testimonials.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentTestimonial(index)}
                        className={`w-3 h-3 rounded-full transition-colors ${
                          index === currentTestimonial ? 'bg-gold' : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="py-20 md:py-32 bg-navy" data-testid="why-us-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-gold text-navy">Why Devmora</Badge>
            <h2 className="font-heading text-4xl md:text-5xl font-semibold text-white mb-4">
              Your Trusted Digital Partner
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Users, title: 'Expert Team', desc: 'Skilled developers and designers with years of experience' },
              { icon: Clock, title: 'On-Time Delivery', desc: '98% projects delivered within agreed timelines' },
              { icon: Shield, title: 'Quality Assured', desc: 'Rigorous testing and code review processes' },
              { icon: Briefcase, title: 'Ongoing Support', desc: 'Dedicated post-launch support and maintenance' },
            ].map((item, index) => (
              <div key={item.title} className="text-center" data-testid={`why-us-${index}`}>
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <item.icon className="w-8 h-8 text-gold" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white" data-testid="cta-section">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-4xl md:text-5xl font-semibold text-navy mb-6">
            Ready to Start Your Project?
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Let's discuss how we can help bring your vision to life
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/contact">
              <Button size="lg" className="bg-navy hover:bg-navy-800 text-white rounded-full px-8 py-6 text-lg">
                Start a Project <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button size="lg" variant="outline" className="border-2 border-gold text-navy hover:bg-gold/10 rounded-full px-8 py-6 text-lg">
                Explore Templates
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HomePage;
