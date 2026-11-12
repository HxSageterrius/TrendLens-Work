import type { Metadata } from 'next';
import './globals.css';
import { SITE } from '@/lib/api';
import { DomainProvider } from '@/lib/DomainContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'TrendLens - AI-Powered Visual Trend Analysis & Forecasting',
    template: '%s | TrendLens',
  },
  description:
    'Discover emerging visual trends in fashion and automobiles through intelligent image embeddings, unsupervised style clustering, and predictive time-series forecasting.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent browser extensions (e.g. Bitdefender TrafficLight 'bis_skin_checked') from corrupting DOM before React 19 hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var origSet = Element.prototype.setAttribute;
                  Element.prototype.setAttribute = function(name, val) {
                    if (name === 'bis_skin_checked' || name === 'bis_register' || name === 'bis_size') return;
                    return origSet.apply(this, arguments);
                  };
                  if (typeof MutationObserver !== 'undefined') {
                    var observer = new MutationObserver(function(mutations) {
                      for (var i = 0; i < mutations.length; i++) {
                        var m = mutations[i];
                        if (m.type === 'attributes' && (m.attributeName === 'bis_skin_checked' || m.attributeName === 'bis_register' || m.attributeName === 'bis_size')) {
                          m.target.removeAttribute(m.attributeName);
                        }
                      }
                    });
                    observer.observe(document.documentElement, {
                      attributes: true,
                      subtree: true,
                      attributeFilter: ['bis_skin_checked', 'bis_register', 'bis_size']
                    });
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <DomainProvider>
          <div className="app-container" suppressHydrationWarning>
            <Sidebar />
            <div className="content-wrapper" suppressHydrationWarning>
              <Header />
              <main className="main-content" suppressHydrationWarning>{children}</main>
            </div>
          </div>
        </DomainProvider>
      </body>
    </html>
  );
}
