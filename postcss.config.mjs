import escapeStyleClose from './postcss-escape-style-close.mjs';

const config = {
  plugins: {
    // XSS mitigation: Escape </style> sequences before Tailwind processing
    // This prevents breaking out of HTML <style> tags when CSS is embedded
    [escapeStyleClose]: {},
    "@tailwindcss/postcss": {},
  },
};

export default config;
