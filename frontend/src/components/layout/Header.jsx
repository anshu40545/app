import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingCart, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCart } from '@/context/CartContext';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cartCount } = useCart();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
    { name: 'Portfolio', path: '/portfolio' },
    { name: 'Contact', path: '/contact' },
  ];

  const marketplaceLinks = [
    { name: 'All Products', path: '/marketplace' },
    { name: 'Website Templates', path: '/marketplace/template' },
    { name: 'Logo Packages', path: '/marketplace/logo' },
    { name: 'App Templates', path: '/marketplace/app_template' },
    { name: 'Design Assets', path: '/marketplace/design_asset' },
  ];

  return (
    <header className="sticky top-0 z-50 glass border-b border-slate-200/50" data-testid="header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
            <div className="w-10 h-10 bg-navy rounded-lg flex items-center justify-center">
              <span className="text-gold font-heading font-bold text-xl">D</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-heading font-semibold text-navy text-lg">Devmora</span>
              <span className="block text-xs text-slate-500 -mt-1">Web Solutions</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" data-testid="desktop-nav">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'bg-navy text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                data-testid={`nav-${link.name.toLowerCase()}`}
              >
                {link.name}
              </Link>
            ))}

            {/* Marketplace Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                    location.pathname.includes('/marketplace')
                      ? 'bg-navy text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  data-testid="nav-marketplace-dropdown"
                >
                  Marketplace <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                {marketplaceLinks.map((link) => (
                  <DropdownMenuItem key={link.path} asChild>
                    <Link to={link.path} data-testid={`marketplace-${link.name.toLowerCase().replace(/\s/g, '-')}`}>
                      {link.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link to="/cart" className="relative p-2 hover:bg-slate-100 rounded-full transition-colors" data-testid="cart-link">
              <ShoppingCart className="w-5 h-5 text-slate-700" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold text-navy text-xs font-bold rounded-full flex items-center justify-center" data-testid="cart-count">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link to="/services" className="hidden sm:block" data-testid="get-quote-btn">
              <Button className="bg-navy hover:bg-navy-800 text-white rounded-full px-6">
                Get a Quote
              </Button>
            </Link>

            <Link to="/marketplace" className="hidden sm:block" data-testid="browse-templates-btn">
              <Button variant="outline" className="border-gold text-navy hover:bg-gold/10 rounded-full px-6">
                Browse Templates
              </Button>
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-200" data-testid="mobile-nav">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    isActive(link.path) ? 'bg-navy text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="border-t border-slate-200 my-2 pt-2">
                <p className="px-4 text-xs text-slate-500 uppercase tracking-wide mb-2">Marketplace</p>
                {marketplaceLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="px-4 py-2 block rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
