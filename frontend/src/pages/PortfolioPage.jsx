import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, ExternalLink, Calendar, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PortfolioPage = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const categories = [
    { value: 'all', label: 'All Projects' },
    { value: 'Software Development', label: 'Software' },
    { value: 'Website Development', label: 'Websites' },
    { value: 'App Development', label: 'Mobile Apps' },
    { value: 'Logo Design', label: 'Branding' },
  ];

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const params = filter !== 'all' ? `?category=${filter}` : '';
        const response = await axios.get(`${API}/portfolio${params}`);
        setPortfolio(response.data);
      } catch (error) {
        console.error('Error fetching portfolio:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, [filter]);

  return (
    <Layout>
      {/* Hero */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-slate-50 to-white" data-testid="portfolio-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-gold/10 text-navy border-gold">Our Work</Badge>
            <h1 className="font-heading text-5xl md:text-6xl font-bold text-navy leading-tight mb-6" data-testid="portfolio-title">
              Portfolio & Case Studies
            </h1>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
              Explore our successful projects and see how we've helped businesses achieve their digital goals.
            </p>
          </div>
        </div>
      </section>

      {/* Filter */}
      <section className="py-8 border-b border-slate-200 bg-white sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2" data-testid="portfolio-filters">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilter(cat.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === cat.value
                    ? 'bg-navy text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                data-testid={`filter-${cat.value}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="py-16 bg-white" data-testid="portfolio-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse bg-slate-100 rounded-2xl h-96" />
              ))}
            </div>
          ) : portfolio.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500 text-lg">No projects found in this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {portfolio.map((item, index) => (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-500"
                  data-testid={`portfolio-item-${index}`}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {item.featured && (
                      <Badge className="absolute top-4 left-4 bg-gold text-navy">Featured</Badge>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-3">
                      <Badge variant="outline" className="text-navy">
                        {item.category}
                      </Badge>
                      <span className="text-sm text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {item.year}
                      </span>
                    </div>
                    <h3 className="font-heading text-2xl font-semibold text-navy mb-2 group-hover:text-gold transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-slate-600 mb-4 line-clamp-2">{item.description}</p>
                    
                    {/* Technologies */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {item.technologies.slice(0, 4).map((tech) => (
                        <span
                          key={tech}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-xs text-slate-600"
                        >
                          <Code className="w-3 h-3" /> {tech}
                        </span>
                      ))}
                    </div>

                    {/* Results */}
                    {item.results && item.results.length > 0 && (
                      <div className="border-t border-slate-100 pt-4 mt-4">
                        <h4 className="text-sm font-medium text-navy mb-2">Key Results:</h4>
                        <ul className="space-y-1">
                          {item.results.slice(0, 2).map((result, i) => (
                            <li key={i} className="text-sm text-slate-600 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-gold rounded-full" />
                              {result}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.client && (
                      <p className="text-sm text-slate-500 mt-4">
                        Client: <span className="font-medium text-navy">{item.client}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-navy" data-testid="portfolio-cta">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-semibold text-white mb-4">
            Ready to Start Your Project?
          </h2>
          <p className="text-slate-300 mb-8">
            Let's create something amazing together
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/services">
              <Button size="lg" className="bg-gold text-navy hover:bg-gold-light rounded-full px-8">
                Start a Project <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 rounded-full px-8">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default PortfolioPage;
