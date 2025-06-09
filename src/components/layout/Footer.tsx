
import { Logo } from './Logo';
import Link from 'next/link';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background text-muted-foreground">
      <div className="container py-12 px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* Column 1: Brand and Contact */}
          <div className="space-y-4">
            <Logo size="medium" />
            <p className="text-sm">
              Veritas AI: Unmasking truth and understanding bias in the digital age.
            </p>
            <div className="flex items-center space-x-2 pt-2">
              <Mail className="h-5 w-5 text-primary" />
              <a href="mailto:contact@veritasai.com" className="hover:text-primary transition-colors text-sm">
                contact@veritasai.com
              </a>
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div className="md:justify-self-center">
            <h5 className="font-semibold text-foreground mb-4">Navigate</h5>
            <ul className="space-y-3">
              <li><Link href="/" className="hover:text-primary transition-colors text-sm">Home</Link></li>
              <li><Link href="/#features" className="hover:text-primary transition-colors text-sm">Features</Link></li>
              <li><Link href="/#about" className="hover:text-primary transition-colors text-sm">About Us</Link></li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div className="md:justify-self-end">
            <h5 className="font-semibold text-foreground mb-4">Resources</h5>
            <ul className="space-y-3">
              <li><Link href="/contact" className="hover:text-primary transition-colors text-sm">Contact Page</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors text-sm">Privacy Policy</Link></li>
              {/* Example for a potential future link:
              <li><Link href="/terms" className="hover:text-primary transition-colors text-sm">Terms of Service</Link></li>
              */}
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Socials and Copyright */}
        <div className="mt-10 pt-8 border-t border-border/20 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="flex space-x-5">
            <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="text-muted-foreground hover:text-primary transition-colors">
              <Github className="h-6 w-6" />
            </Link>
            <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors">
              <Twitter className="h-6 w-6" />
            </Link>
            <Link href="#" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary transition-colors">
              <Linkedin className="h-6 w-6" />
            </Link>
          </div>
          <p className="text-xs text-center sm:text-right">
            &copy; {new Date().getFullYear()} Veritas AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
