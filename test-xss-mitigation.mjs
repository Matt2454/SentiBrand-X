import postcss from 'postcss';
import escapeStyleClose from './postcss-escape-style-close.mjs';

/**
 * Test: PostCSS XSS vulnerability mitigation
 * Verifies that </style> sequences are properly escaped in CSS output
 */

async function testEscapeStyleClose() {
  console.log('Testing PostCSS XSS Mitigation...\n');

  // Test cases
  const testCases = [
    {
      name: 'Basic XSS attempt',
      input: 'body { content: "</style><script>alert(1)</script><style>"; }',
      description: 'CSS with script injection attempt'
    },
    {
      name: 'Multiple </style> sequences',
      input: '.class { content: "</style></style>"; before: "</style>"; }',
      description: 'Multiple </style> in different properties'
    },
    {
      name: 'Case-insensitive variants',
      input: '.class { content: "</STYLE><img src=x onerror=alert(1)>"; }',
      description: 'Uppercase </STYLE>'
    },
    {
      name: 'Safe CSS (should pass through)',
      input: 'body { background: blue; color: red; }',
      description: 'Normal CSS without XSS attempts'
    }
  ];

  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`);
    console.log(`   Description: ${testCase.description}`);

    try {
      const result = await postcss([escapeStyleClose]).process(testCase.input, {
        from: undefined
      });

      const output = result.css;
      const containsUnescapedTag = /<\/style>/i.test(output);

      console.log(`   Input:  ${testCase.input}`);
      console.log(`   Output: ${output}`);
      console.log(`   ✅ Unescaped </style> found: ${containsUnescapedTag}`);

      if (containsUnescapedTag) {
        console.warn('   ⚠️  WARNING: Unescaped </style> still present!');
      } else {
        console.log('   ✅ XSS mitigated: </style> properly escaped');
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }

    console.log();
  }

  console.log('Testing complete!');
}

testEscapeStyleClose().catch(console.error);
