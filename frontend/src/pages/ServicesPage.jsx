import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Code, Globe, Smartphone, Palette, Package, Award, ArrowRight, 
  CheckCircle, Send, Clock, Users, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import Layout from '@/components/layout/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ServicesPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    service_type: '',
    project_scope: '',
    budget_range: '',
    timeline: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const services = [
    {
      icon: Code,
      title: 'Custom Software Development',
      description: 'End-to-end software solutions tailored to your business needs. From enterprise applications to specialized tools.',
      features: ['Enterprise Applications', 'API Development', 'Database Design', 'Cloud Integration', 'Legacy Modernization'],
      color: 'from-blue-500 to-indigo-600'
    },
    {
      icon: Globe,
      title: 'Website Development',
      description: 'High-performance, responsive websites that drive results. Built with modern technologies for speed and SEO.',
      features: ['Corporate Websites', 'E-commerce Platforms', 'Landing Pages', 'CMS Integration', 'Performance Optimization'],
      color: 'from-emerald-500 to-teal-600'
    },
    {
      icon: Palette,
      title: 'UI/UX Design',
      description: 'User-centric designs that enhance engagement and conversions. From wireframes to pixel-perfect interfaces.',
      features: ['User Research', 'Wireframing', 'Visual Design', 'Prototyping', 'Usability Testing'],
      color: 'from-pink-500 to-rose-600'
    },
    {
      icon: Smartphone,
      title: 'Android App Development',
      description: 'Native Android applications with exceptional user experiences. From concept to Play Store deployment.',
      features: ['Native Development', 'Material Design', 'API Integration', 'Push Notifications', 'App Store Optimization'],
      color: 'from-green-500 to-emerald-600'
    },
    {
      icon: Package,
      title: 'Design Templates',
      description: 'Premium, ready-to-use templates for quick deployment. Professionally designed and fully customizable.',
      features: ['Website Templates', 'Dashboard Templates', 'Email Templates', 'Presentation Templates', 'Social Media Kits'],
      color: 'from-orange-500 to-amber-600'
    },
    {
      icon: Award,
      title: 'Logo Design & Branding',
      description: 'Memorable brand identities that stand out. Complete branding packages from logo to guidelines.',
      features: ['Logo Design', 'Brand Guidelines', 'Stationery Design', 'Brand Strategy', 'Visual Identity'],
      color: 'from-purple-500 to-violet-600'
    }
  ];

  const processSteps = [
    { step: '01', title: 'Discovery', desc: 'We analyze your requirements and understand your goals' },
    { step: '02', title: 'Planning', desc: 'Detailed project roadmap with timeline and milestones' },
    { step: '03', title: 'Design', desc: 'Creating intuitive interfaces and visual designs' },
    { step: '04', title: 'Development', desc: 'Building with clean, scalable, and tested code' },
    { step: '05', title: 'Testing', desc: 'Rigorous QA to ensure flawless performance' },
    { step: '06', title: 'Launch & Support', desc: 'Smooth deployment and ongoing maintenance' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.service_type || !formData.project_scope || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/contact`, formData);
      toast.success('Inquiry submitted successfully! We will get back to you soon.');
      setFormData({
        name: '', email: '', phone: '', company: '',
        service_type: '', project_scope: '', budget_range: '', timeline: '', message: ''
      });
    } catch (error) {
      toast.error('Failed to submit inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-b from-slate-50 to-white" data-testid="services-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-gold/10 text-navy border-gold">Our Services</Badge>
            <h1 className="font-heading text-5xl md:text-6xl font-bold text-navy leading-tight mb-6" data-testid="services-title">
              Transform Your Business with Digital Excellence
            </h1>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
              From custom software to stunning designs, we deliver solutions that drive growth and efficiency.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-white" data-testid="services-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div 
                key={service.title}
                className="group relative bg-white rounded-2xl border border-slate-100 p-8 hover:shadow-2xl transition-all duration-500"
                data-testid={`service-detail-${index}`}
              >
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${service.color} rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className={`w-14 h-14 bg-gradient-to-br ${service.color} rounded-xl flex items-center justify-center mb-6 shadow-lg`}>
                  <service.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-navy mb-3">{service.title}</h3>
                <p className="text-slate-600 mb-6">{service.description}</p>
                <ul className="space-y-2">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Process */}
      <section className="py-20 md:py-32 bg-slate-50" data-testid="process-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-gold/10 text-navy border-gold">How We Work</Badge>
            <h2 className="font-heading text-4xl md:text-5xl font-semibold text-navy mb-4">
              Our Process
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              A transparent, collaborative approach to delivering exceptional results
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {processSteps.map((step, index) => (
              <div 
                key={step.step}
                className="relative bg-white rounded-xl p-6 border border-slate-100"
                data-testid={`process-step-${index}`}
              >
                <span className="text-5xl font-heading font-bold text-gold/20">{step.step}</span>
                <h3 className="font-heading text-xl font-semibold text-navy mt-2 mb-2">{step.title}</h3>
                <p className="text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-navy" data-testid="why-choose-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-gold text-navy">Why Choose Us</Badge>
              <h2 className="font-heading text-4xl font-semibold text-white mb-6">
                Excellence in Every Project
              </h2>
              <p className="text-slate-300 mb-8">
                We combine technical expertise with creative excellence to deliver solutions that exceed expectations.
              </p>
              <div className="space-y-6">
                {[
                  { icon: Users, title: 'Expert Team', desc: 'Skilled professionals with years of experience' },
                  { icon: Zap, title: 'Fast Delivery', desc: 'Efficient processes for quick turnaround' },
                  { icon: Clock, title: '24/7 Support', desc: 'Dedicated support throughout your project' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{item.title}</h4>
                      <p className="text-slate-400 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-sm">
              <div className="grid grid-cols-2 gap-8">
                {[
                  { value: '10+', label: 'Projects Delivered' },
                  { value: '98%', label: 'Client Satisfaction' },
                  { value: '24/7', label: 'Support Available' },
                  { value: '2+', label: 'Years Experience' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-4xl font-heading font-bold text-gold">{stat.value}</div>
                    <div className="text-slate-300 text-sm mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Inquiry Form */}
      <section className="py-20 md:py-32 bg-white" data-testid="inquiry-form-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <Badge className="mb-4 bg-gold/10 text-navy border-gold">Get Started</Badge>
              <h2 className="font-heading text-4xl font-semibold text-navy mb-6">
                Request a Free Quote
              </h2>
              <p className="text-slate-600 mb-8">
                Tell us about your project and we'll get back to you with a detailed proposal within 24 hours.
              </p>
              <div className="space-y-6">
                {[
                  { title: 'Free Consultation', desc: 'No obligation discussion about your project needs' },
                  { title: 'Detailed Proposal', desc: 'Comprehensive quote with timeline and milestones' },
                  { title: 'Flexible Engagement', desc: 'Choose the engagement model that works for you' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-navy">{item.title}</h4>
                      <p className="text-slate-600 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-slate-50 rounded-2xl p-8" data-testid="inquiry-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your name"
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 12345 67890"
                    data-testid="input-phone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                  <Input
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Company name"
                    data-testid="input-company"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Service Type *</label>
                  <Select value={formData.service_type} onValueChange={(v) => setFormData({ ...formData, service_type: v })}>
                    <SelectTrigger data-testid="select-service">
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom_software">Custom Software</SelectItem>
                      <SelectItem value="website">Website Development</SelectItem>
                      <SelectItem value="uiux">UI/UX Design</SelectItem>
                      <SelectItem value="android">Android Development</SelectItem>
                      <SelectItem value="branding">Logo & Branding</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project Scope *</label>
                  <Select value={formData.project_scope} onValueChange={(v) => setFormData({ ...formData, project_scope: v })}>
                    <SelectTrigger data-testid="select-scope">
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small (1-2 weeks)</SelectItem>
                      <SelectItem value="medium">Medium (1-2 months)</SelectItem>
                      <SelectItem value="large">Large (3+ months)</SelectItem>
                      <SelectItem value="ongoing">Ongoing Retainer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Budget Range</label>
                  <Select value={formData.budget_range} onValueChange={(v) => setFormData({ ...formData, budget_range: v })}>
                    <SelectTrigger data-testid="select-budget">
                      <SelectValue placeholder="Select budget" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10k-50k">₹10,000 - ₹50,000</SelectItem>
                      <SelectItem value="50k-1l">₹50,000 - ₹1,00,000</SelectItem>
                      <SelectItem value="1l-5l">₹1,00,000 - ₹5,00,000</SelectItem>
                      <SelectItem value="5l+">₹5,00,000+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Timeline</label>
                  <Select value={formData.timeline} onValueChange={(v) => setFormData({ ...formData, timeline: v })}>
                    <SelectTrigger data-testid="select-timeline">
                      <SelectValue placeholder="Select timeline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asap">ASAP</SelectItem>
                      <SelectItem value="1month">Within 1 month</SelectItem>
                      <SelectItem value="3months">Within 3 months</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Details *</label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your project requirements..."
                  rows={4}
                  data-testid="input-message"
                />
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full bg-navy hover:bg-navy-800 text-white rounded-full"
                disabled={loading}
                data-testid="submit-inquiry"
              >
                {loading ? 'Submitting...' : 'Submit Inquiry'} <Send className="ml-2 w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Browse Templates CTA */}
      <section className="py-16 bg-slate-50" data-testid="templates-cta">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl font-semibold text-navy mb-4">
            Need Something Faster?
          </h2>
          <p className="text-slate-600 mb-8">
            Browse our collection of ready-made templates and design assets
          </p>
          <Link to="/marketplace">
            <Button size="lg" variant="outline" className="border-2 border-navy text-navy hover:bg-navy hover:text-white rounded-full px-8">
              Browse Templates <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default ServicesPage;
