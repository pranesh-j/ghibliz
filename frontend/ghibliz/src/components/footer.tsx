export function Footer() {
    return (
      <footer className="bg-amber-50/80 border-t border-amber-100 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="text-sm text-ghibli-dark/80 text-center sm:text-left">
              © 2025 Ghiblit Art. All rights reserved.
            </div>
            <div className="text-xs text-ghibli-dark/70 text-center sm:text-right">
              Built by <a href="https://linkedin.com/in/your-profile" className="hover:text-ghibli-dark transition-colors underline" target="_blank" rel="noopener noreferrer">@Pran</a>
            </div>
          </div>
        </div>
      </footer>
    )
  }