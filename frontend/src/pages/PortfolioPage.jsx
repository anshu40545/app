import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, ExternalLink, Calendar, Code, X, ChevronLeft, ChevronRight, Award, Users, Clock, Target, Monitor, Smartphone, Palette, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Layout from '@/components/layout/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PortfolioPage = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const categories = [
    { value: 'all', label: 'All Projects', icon: Target, color: 'bg-slate-600' },
    { value: 'Software', label: 'Software', icon: Settings, color: 'bg-blue-600' },
    { value: 'Website', label: 'Websites', icon: Monitor, color: 'bg-green-600' },
    { value: 'Mobile App', label: 'Mobile Apps', icon: Smartphone, color: 'bg-purple-600' },
    { value: 'Branding', label: 'Branding & Logos', icon: Palette, color: 'bg-orange-500' },
  ];

  const stats = [
    { icon: Award, value: '100%', label: 'Client Satisfaction' },
    { icon: Users, value: '50+', label: 'Projects Completed' },
    { icon: Clock, value: '98%', label: 'On-Time Delivery' },
    { icon: Target, value: '3x', label: 'Avg. ROI Increase' },
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

  const openProjectModal = (project) => {
    setSelectedProject(project);
    setCurrentImageIndex(0);
  };

  const closeProjectModal = () => {
    setSelectedProject(null);
  };

  const nextImage = () => {
    if (selectedProject?.preview_images?.length > 0) {
      setCurrentImageIndex((prev) => 
        (prev + 1) % (selectedProject.preview_images.length + 1)
      );
    }
  };

  const prevImage = () => {
    if (selectedProject?.preview_images?.length > 0) {
      setCurrentImageIndex((prev) => 
        (prev - 1 + selectedProject.preview_images.length + 1) % (selectedProject.preview_images.length + 1)
      );
    }
  };

  const getProjectImages = (project) => {
    if (!project) return [];
    return [project.image, ...(project.preview_images || [])];
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden" data-testid="portfolio-hero">
        <div className="absolute top-20 right-10 w-72 h-72 bg-gold/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-navy/5 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-gold/10 text-navy border-gold">Our Work</Badge>
            <h1 className="font-heading text-5xl md:text-6xl font-bold text-navy leading-tight mb-6" data-testid="portfolio-title">
              Portfolio & Case Studies
            </h1>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
              Explore our successful projects and see how we've helped businesses achieve their digital goals.
            </p>
          </div>
          
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm text-center">
                <stat.icon className="w-8 h-8 text-gold mx-auto mb-3" />
                <div className="text-2xl font-heading font-bold text-navy">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filter */}
      <section className="py-8 border-b border-slate-200 bg-white sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3" data-testid="portfolio-filters">
            {categories.map((cat) => {
              const IconComponent = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => setFilter(cat.value)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                    filter === cat.value
                      ? `${cat.color} text-white shadow-lg`
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  data-testid={`filter-${cat.value}`}
                >
                  <IconComponent className="w-4 h-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="py-16 bg-white" data-testid="portfolio-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-slate-100 rounded-2xl h-80" />
              ))}
            </div>
          ) : portfolio.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500 text-lg">No projects found in this category</p>
              <Button onClick={() => setFilter('all')} variant="outline" className="mt-4">
                View All Projects
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {portfolio.map((item, index) => (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer hover:-translate-y-2"
                  onClick={() => openProjectModal(item)}
                  data-testid={`portfolio-item-${index}`}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                        <ExternalLink className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    {item.featured && (
                      <Badge className="absolute top-4 left-4 bg-gold text-navy shadow-lg">⭐ Featured</Badge>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="outline" className="text-navy border-navy/20">
                        {item.category}
                      </Badge>
                      <span className="text-sm text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {item.year}
                      </span>
                    </div>
                    <h3 className="font-heading text-xl font-semibold text-navy mb-2 group-hover:text-gold transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-slate-600 text-sm line-clamp-2">{item.description}</p>
                    
                    {/* Technologies */}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {item.technologies.slice(0, 3).map((tech) => (
                        <span
                          key={tech}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600"
                        >
                          {tech}
                        </span>
                      ))}
                      {item.technologies.length > 3 && (
                        <span className="text-xs text-slate-400">+{item.technologies.length - 3} more</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Project Detail Modal */}
      <Dialog open={!!selectedProject} onOpenChange={closeProjectModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {selectedProject && (
            <>
              {/* Image Gallery */}
              <div className="relative aspect-video bg-slate-100">
                <img
                  src={getProjectImages(selectedProject)[currentImageIndex]}
                  alt={selectedProject.title}
                  className="w-full h-full object-cover"
                />
                {getProjectImages(selectedProject).length > 1 && (
                  <>
                    <button 
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                    >
                      <ChevronLeft className="w-5 h-5 text-navy" />
                    </button>
                    <button 
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                    >
                      <ChevronRight className="w-5 h-5 text-navy" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {getProjectImages(selectedProject).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-2.5 h-2.5 rounded-full transition-colors ${
                            idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              <div className="p-6 md:p-8">
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline">{selectedProject.category}</Badge>
                    <span className="text-sm text-slate-500">{selectedProject.year}</span>
                    {selectedProject.featured && (
                      <Badge className="bg-gold text-navy">Featured</Badge>
                    )}
                  </div>
                  <DialogTitle className="font-heading text-2xl md:text-3xl font-bold text-navy">
                    {selectedProject.title}
                  </DialogTitle>
                </DialogHeader>
                
                <p className="text-slate-600 leading-relaxed mt-4">{selectedProject.description}</p>
                
                {/* Technologies */}
                <div className="mt-6">
                  <h4 className="font-medium text-navy mb-3 flex items-center gap-2">
                    <Code className="w-4 h-4" /> Technologies Used
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.technologies.map((tech) => (
                      <Badge key={tech} variant="secondary" className="bg-slate-100 text-slate-700">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Results */}
                {selectedProject.results && selectedProject.results.length > 0 && (
                  <div className="mt-6 bg-green-50 rounded-xl p-6">
                    <h4 className="font-medium text-green-800 mb-3">📈 Key Results</h4>
                    <ul className="space-y-2">
                      {selectedProject.results.map((result, i) => (
                        <li key={i} className="text-green-700 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                          {result}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {selectedProject.client && (
                  <p className="text-sm text-slate-500 mt-6">
                    Client: <span className="font-medium text-navy">{selectedProject.client}</span>
                  </p>
                )}
                
                <div className="flex gap-3 mt-8">
                  <Link to="/contact" className="flex-1">
                    <Button className="w-full bg-navy hover:bg-navy-800 text-white rounded-full">
                      Start Similar Project <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
