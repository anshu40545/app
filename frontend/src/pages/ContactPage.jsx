import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Mail, Phone, MapPin, Clock, Send, MessageSquare,
  ArrowRight, CheckCircle, ChevronDown, Globe, Linkedin, Twitter, Instagram
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import Layout from '@/components/layout/Layout';
import { apiClient } from '@/lib/api';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    service_type: 'general',
    project_scope: 'small',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const faqs = [
    {
      question: "What is your typical project timeline?",
      answer: "Project timelines vary based on scope. Small projects typically take 1-2 weeks, medium projects 4-8 weeks, and large enterprise projects 3-6 months. We provide detailed timelines during our initial consultation."
    },
    {
      question: "Do you offer ongoing support after project delivery?",
      answer: "Yes! All our projects include a support period. For custom development, we offer 3 months of free bug fixes and support. Extended support plans are available for continued maintenance and updates."
    },
    {
      question: "What is your payment structure?",
      answer: "We typically work with a 40% upfront deposit, 30% at the midpoint milestone, and 30% upon project completion. For larger projects, we can discuss custom payment schedules."
    },
    {
      question: "Can I purchase templates and customize them myself?",
      answer: "Absolutely! Our marketplace templates come with full source code and documentation. You can customize them as needed. We also offer customization services if you need professional help."
    },
    {
      question: "Do you work with international clients?",
      answer: "Yes, we work with clients globally. We use video calls, project management tools, and collaborative platforms to ensure smooth communication regardless of location."
    },
    {
      question: "What technologies do you specialize in?",
      answer: "Our team specializes in React, Next.js, Node.js, Python, Flutter, React Native, MongoDB, PostgreSQL, AWS, and more. We choose the best technology stack based on your project requirements."
    }
  ];

  const socialLinks = [
    { icon: Linkedin, href: "https://linkedin.com/company/devmora", label: "LinkedIn" },
    { icon: Twitter, href: "https://twitter.com/devmora", label: "Twitter" },
    { icon: Instagram, href: "https://instagram.com/devmora", label: "Instagram" },
    { icon: Globe, href: "https://devmora.com", label: "Website" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/contact', formData);
      toast.success('Message sent successfully! We will get back to you soon.');
      setFormData({
        name: '', email: '', phone: '', company: '',
        service_type: 'general', project_scope: 'small', message: ''
      });
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white" data-testid="contact-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Badge className="mb-4 bg-gold/10 text-navy border-gold">Get in Touch</Badge>
            <h1 className="font-heading text-5xl md:text-6xl font-bold text-navy leading-tight mb-6" data-testid="contact-title">
              Let's Start a Conversation
            </h1>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
              Have a project in mind? We'd love to hear about it. Send us a message and we'll respond within 24 hours.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Grid */}
      <section className="py-16 bg-white" data-testid="contact-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact Info */}
            <div className="lg:col-span-1">
              <h2 className="font-heading text-2xl font-semibold text-navy mb-6">Contact Information</h2>
              
              <div className="space-y-6 mb-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-navy/5 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-navy" />
                  </div>
                  <div>
                    <h3 className="font-medium text-navy">Email</h3>
                    <a href="mailto:hello@devmora.com" className="text-slate-600 hover:text-gold transition-colors">
                      hello@devmora.com
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-navy/5 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-navy" />
                  </div>
                  <div>
                    <h3 className="font-medium text-navy">Phone</h3>
                    <a href="tel:+911234567890" className="text-slate-600 hover:text-gold transition-colors">
                      +91 12345 67890
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-navy/5 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-navy" />
                  </div>
                  <div>
                    <h3 className="font-medium text-navy">Location</h3>
                    <p className="text-slate-600">Mumbai, Maharashtra, India</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-navy/5 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-navy" />
                  </div>
                  <div>
                    <h3 className="font-medium text-navy">Business Hours</h3>
                    <p className="text-slate-600">Mon - Fri: 9:00 AM - 6:00 PM IST</p>
                  </div>
                </div>
              </div>

              {/* Response Time */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  <div>
                    <h4 className="font-medium text-green-800">Fast Response</h4>
                    <p className="text-sm text-green-700">Average response time: 2 hours</p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="mt-8">
                <h3 className="font-medium text-navy mb-4">Connect With Us</h3>
                <div className="flex gap-3">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center hover:bg-navy hover:text-white transition-colors"
                      aria-label={social.label}
                    >
                      <social.icon className="w-5 h-5" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="bg-slate-50 rounded-2xl p-8" data-testid="contact-form">
                <h2 className="font-heading text-2xl font-semibold text-navy mb-6">Send us a Message</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                      data-testid="contact-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your@email.com"
                      data-testid="contact-email"
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
                      data-testid="contact-phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                    <Input
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Company name"
                      data-testid="contact-company"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Inquiry Type</label>
                    <Select value={formData.service_type} onValueChange={(v) => setFormData({ ...formData, service_type: v })}>
                      <SelectTrigger data-testid="contact-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Inquiry</SelectItem>
                        <SelectItem value="custom_software">Custom Software</SelectItem>
                        <SelectItem value="website">Website Development</SelectItem>
                        <SelectItem value="uiux">UI/UX Design</SelectItem>
                        <SelectItem value="android">Android Development</SelectItem>
                        <SelectItem value="branding">Logo & Branding</SelectItem>
                        <SelectItem value="support">Technical Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Project Size</label>
                    <Select value={formData.project_scope} onValueChange={(v) => setFormData({ ...formData, project_scope: v })}>
                      <SelectTrigger data-testid="contact-scope">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small Project</SelectItem>
                        <SelectItem value="medium">Medium Project</SelectItem>
                        <SelectItem value="large">Large Project</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your project or question..."
                    rows={5}
                    data-testid="contact-message"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-navy hover:bg-navy-800 text-white rounded-full"
                  disabled={loading}
                  data-testid="contact-submit"
                >
                  {loading ? 'Sending...' : 'Send Message'} <Send className="ml-2 w-5 h-5" />
                </Button>

                <p className="text-sm text-slate-500 text-center mt-4">
                  By submitting, you agree to our Privacy Policy
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ or Additional Info */}
      <section className="py-16 bg-slate-50" data-testid="contact-info">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
              <h3 className="font-heading text-lg font-semibold text-navy mb-3">Custom Development</h3>
              <p className="text-slate-600 mb-4">Need a tailored solution? We offer custom development services.</p>
              <Link to="/services" className="text-gold font-medium flex items-center gap-1 hover:underline">
                Learn More <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
              <h3 className="font-heading text-lg font-semibold text-navy mb-3">Ready Templates</h3>
              <p className="text-slate-600 mb-4">Looking for instant solutions? Browse our marketplace.</p>
              <Link to="/marketplace" className="text-gold font-medium flex items-center gap-1 hover:underline">
                Browse Templates <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
              <h3 className="font-heading text-lg font-semibold text-navy mb-3">View Our Work</h3>
              <p className="text-slate-600 mb-4">See examples of our previous projects and case studies.</p>
              <Link to="/portfolio" className="text-gold font-medium flex items-center gap-1 hover:underline">
                View Portfolio <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white" data-testid="faq-section">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-gold/10 text-navy border-gold">FAQ</Badge>
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-navy mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600">
              Can't find what you're looking for? Send us a message above.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`faq-${index}`}
                className="bg-slate-50 rounded-xl border border-slate-100 px-6"
              >
                <AccordionTrigger className="text-left font-medium text-navy hover:text-gold py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Map Placeholder */}
      <section className="bg-slate-100" data-testid="map-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative h-64 md:h-96 rounded-t-3xl overflow-hidden bg-gradient-to-br from-navy/5 to-slate-100 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gold mx-auto mb-4" />
              <h3 className="font-heading text-xl font-semibold text-navy mb-2">Visit Our Office</h3>
              <p className="text-slate-600">Mumbai, Maharashtra, India</p>
              <a 
                href="https://maps.google.com/?q=Mumbai,Maharashtra,India" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block mt-4"
              >
                <Button variant="outline" className="rounded-full">
                  Open in Google Maps <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ContactPage;
