/** @type {any} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          charcoal: '#222831',
          slate: '#393E46',
          yellow: '#FFD369',
          'yellow-hover': '#F5C754',
          grey: '#EEEEEE',
          canvas: '#F8F9FA',
          inset: '#F3F4F6',
          surface: '#FFFFFF',
        },
        trajectory: {
          emerging: '#FFD369',
          'emerging-text': '#15803D',
          stable: '#393E46',
          declining: '#DC2626',
          'declining-muted': '#6B7280',
        },
        border: {
          DEFAULT: 'rgba(34, 40, 49, 0.09)',
          subtle: 'rgba(34, 40, 49, 0.04)',
          focus: '#FFD369',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      fontSize: {
        'display-hero': ['2.40rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'page-h1': ['1.75rem', { lineHeight: '1.20', letterSpacing: '-0.015em', fontWeight: '700' }],
        'section-h2': ['1.15rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '700' }],
        'sub-h3': ['0.96rem', { lineHeight: '1.30', letterSpacing: '0em', fontWeight: '600' }],
        'body-dense': ['0.88rem', { lineHeight: '1.55', letterSpacing: '0em', fontWeight: '400' }],
        'interface-btn': ['0.82rem', { lineHeight: '1.25', letterSpacing: '+0.01em', fontWeight: '600' }],
        'kpi-metric': ['1.65rem', { lineHeight: '1.10', letterSpacing: '-0.02em', fontWeight: '700' }],
        'caption-label': ['0.74rem', { lineHeight: '1.25', letterSpacing: '+0.04em', fontWeight: '600' }],
      },
      borderRadius: {
        xs: '3px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        full: '9999px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)',
        elevated: '0 8px 24px rgba(0, 0, 0, 0.08)',
        subtle: '0 1px 2px rgba(0, 0, 0, 0.04)',
      },
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
      maxWidth: {
        container: '1440px',
        measure: '75ch',
      },
    },
  },
  plugins: [],
};
