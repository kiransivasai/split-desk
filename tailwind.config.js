/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        c0: '#08090c',
        c1: '#0d0f14',
        c2: '#13161e',
        c3: '#1a1e29',
        c4: '#222838',
        border: 'rgba(255,255,255,0.065)',
        'border-hi': 'rgba(255,255,255,0.11)',
        'border-focus': 'rgba(0,210,160,0.4)',
        t1: '#f1f2f5',
        t2: '#9499a8',
        t3: '#454d62',
        t4: '#2a3045',
        accent: '#00D2A0',
        'accent-soft': '#00b88a',
        'accent-dim': 'rgba(0,210,160,0.07)',
        'accent-mid': 'rgba(0,210,160,0.14)',
        'accent-glow': 'rgba(0,210,160,0.22)',
        red: '#f87171',
        'red-dim': 'rgba(248,113,113,0.08)',
        amber: '#f59e0b',
        'amber-dim': 'rgba(245,158,11,0.08)',
        blue: '#60a5fa',
        'blue-dim': 'rgba(96,165,250,0.08)',
        violet: '#a78bfa',
        'violet-dim': 'rgba(167,139,250,0.08)',
      },
      borderRadius: {
        r: '10px',
        'r-lg': '16px',
        'r-xl': '22px',
      },
      fontFamily: {
        sans: ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
