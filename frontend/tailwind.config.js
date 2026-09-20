export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F4EF',
        sidebar: '#F5F4EF',
        panel: '#F5F4EF',
        ink: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
        },
        line: '#E2E8F0',
        brand: {
          DEFAULT: '#2563EB',
          soft: '#EFF6FF',
          hover: '#1D4FD7',
        },
        ok: {
          DEFAULT: '#10B981',
          soft: '#ECFDF5',
        },
        danger: {
          DEFAULT: '#EF4444',
          soft: '#FEF2F2',
        },
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '18px',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.04)',
        soft: '0 4px 16px rgba(15, 23, 42, 0.06)',
        glow: '0 0 0 8px rgba(37, 99, 235, 0.08)',
      },
    },
  },
}
