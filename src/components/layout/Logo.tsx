import Link from 'next/link';
import { Newspaper } from 'lucide-react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function Logo({ size = 'medium', className }: LogoProps) {
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-8 w-8',
    large: 'h-10 w-10',
  };
  const textSizeClasses = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-2xl',
  }

  return (
    <Link href="/" className={`flex items-center space-x-2 text-primary ${className}`}>
      <Newspaper className={`${sizeClasses[size]}`} />
      <span className={`font-bold ${textSizeClasses[size]} font-headline`}>Veritas AI</span>
    </Link>
  );
}
