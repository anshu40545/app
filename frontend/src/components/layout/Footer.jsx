import { Link } from 'react-router-dom';
import { Shield, Clock, Award, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-navy text-white" data-testid="footer">
      {/* Trust Indicators */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4" data-testid="trust-security">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h4 className="font-semibold">Secure Payments</h4>
                <p className="text-sm text-slate-400">256-bit SSL encryption</p>
              </div>
            </div>
            <div className="flex items-center gap-4" data-testid="trust-support">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h4 className="font-semibold">24/7 Support</h4>
                <p className="text-sm text-slate-400">Average response: 2 hours</p>
              </div>
            </div>
            <div className="flex items-center gap-4" data-testid="trust-guarantee">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h4 className="font-semibold">Money-Back Guarantee</h4>
                <p className="text-sm text-slate-400">30-day refund policy</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gold rounded-lg flex items-center justify-center">
                <span className="text-navy font-heading font-bold text-xl">D</span>
              </div>
              <div>
                <span className="font-heading font-semibold text-lg">Devmora</span>
                <span className="block text-xs text-slate-400 -mt-1">Web Solutions Pvt. Ltd.</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Premium software development and digital assets for businesses worldwide. 
              Building digital excellence since 2026.
            </p>
            <div className="flex flex-col gap-3 text-sm text-slate-400">
              <a href="mailto:hello@devmora.com" className="flex items-center gap-2 hover:text-gold transition-colors">
                <Mail className="w-4 h-4" /> hello@devmora.com
              </a>
              <a href="tel:+911234567890" className="flex items-center gap-2 hover:text-gold transition-colors">
                <Phone className="w-4 h-4" /> +91 12345 67890
              </a>
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Mumbai, India
              </span>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-6">Services</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><Link to="/services" className="hover:text-gold transition-colors">Custom Software</Link></li>
              <li><Link to="/services" className="hover:text-gold transition-colors">Website Development</Link></li>
              <li><Link to="/services" className="hover:text-gold transition-colors">UI/UX Design</Link></li>
              <li><Link to="/services" className="hover:text-gold transition-colors">Android Development</Link></li>
              <li><Link to="/services" className="hover:text-gold transition-colors">Logo & Branding</Link></li>
            </ul>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-6">Marketplace</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><Link to="/marketplace/template" className="hover:text-gold transition-colors">Website Templates</Link></li>
              <li><Link to="/marketplace/logo" className="hover:text-gold transition-colors">Logo Packages</Link></li>
              <li><Link to="/marketplace/app_template" className="hover:text-gold transition-colors">App Templates</Link></li>
              <li><Link to="/marketplace/design_asset" className="hover:text-gold transition-colors">Design Assets</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-6">Company</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><Link to="/portfolio" className="hover:text-gold transition-colors">Portfolio</Link></li>
              <li><Link to="/contact" className="hover:text-gold transition-colors">Contact Us</Link></li>
              <li><a href="#" className="hover:text-gold transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Refund Policy</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-400">
              © {currentYear} Devmora Web Solutions Pvt. Ltd. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/100px-Visa_Inc._logo.svg.png" alt="Visa" className="h-6 opacity-60" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/100px-Mastercard-logo.svg.png" alt="Mastercard" className="h-6 opacity-60" />
              <img src="https://razorpay.com/assets/razorpay-logo-white.svg" alt="Razorpay" className="h-5 opacity-60" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
