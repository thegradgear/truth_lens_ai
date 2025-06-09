import { AppNavbar } from '@/components/layout/AppNavbar';
import { Footer } from '@/components/layout/Footer';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen">
        <AppNavbar />
        <main className="flex-grow container py-8">
          {children}
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
