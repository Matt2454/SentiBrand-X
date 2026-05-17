/**
 * PostCSS plugin to escape </style> sequences in CSS output
 * Prevents XSS attacks when CSS is embedded in HTML <style> tags
 * 
 * Vulnerability: Unescaped </style> in CSS values can break out of style tags
 * Fix: Replace </style> with <\\/style> in stringified output
 */

export default (opts = {}) => {
  return {
    postcssPlugin: 'postcss-escape-style-close',
    Once(root) {
      root.walkDecls((decl) => {
        if (decl.value && typeof decl.value === 'string') {
          // Escape </style> sequences in CSS values
          decl.value = decl.value.replace(/<\/style>/gi, '<\\/style>');
        }
      });

      root.walkAtRules((atRule) => {
        if (atRule.params && typeof atRule.params === 'string') {
          atRule.params = atRule.params.replace(/<\/style>/gi, '<\\/style>');
        }
      });

      root.walkRules((rule) => {
        if (rule.selector && typeof rule.selector === 'string') {
          rule.selector = rule.selector.replace(/<\/style>/gi, '<\\/style>');
        }
      });
    },
    stringify(node, stringifier) {
      const result = stringifier(node);
      // Also escape at the final output level as a secondary safeguard
      return result.replace(/<\/style>/gi, '<\\/style>');
    }
  };
};

export const postcss = true;
