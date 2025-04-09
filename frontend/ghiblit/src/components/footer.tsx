import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-amber-50/80 border-t border-amber-100 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="text-sm text-ghibli-dark/80 text-center sm:text-left">
            © 2025 Ghiblit Art. All rights reserved.
          </div>
          
          <div className="flex flex-wrap justify-center gap-x-4 text-xs text-ghibli-dark/70 text-center sm:text-right">
            <Link href="/policies" className="hover:text-ghibli-dark transition-colors hover:underline">
              Privacy Policy
            </Link>
            <Link href="/policies?tab=terms" className="hover:text-ghibli-dark transition-colors hover:underline">
              Terms of Service
            </Link>
            <Link href="/policies?tab=refund" className="hover:text-ghibli-dark transition-colors hover:underline">
              Refund Policy
            </Link>
            <a href="mailto:ghiblit.art@gmail.com" className="hover:text-ghibli-dark transition-colors hover:underline">
              Contact Us
            </a>
            <a href="https://www.linkedin.com/in/pranesh-jahagirdar/" className="hover:text-ghibli-dark transition-colors hover:underline" target="_blank" rel="noopener noreferrer">
              Built by @Pran
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}