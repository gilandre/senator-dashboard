const fs = require('fs');
const path = require('path');

// List of files with ESLint errors
const filesToFix = [
  './src/app/access/page.tsx',
  './src/app/access-history/page.tsx',
  './src/app/anomalies/page.tsx',
  './src/app/employees/page.tsx',
  './src/app/export/page.tsx',
  './src/app/import/page.tsx',
  './src/app/settings/page.tsx',
  './src/app/settings/profiles/page.tsx',
  './src/app/settings/security/page.tsx',
  './src/app/visitors/page.tsx'
];

// Function to fix quotes in a file
function fixFile(filePath) {
  console.log(`Processing ${filePath}...`);
  const fullPath = path.resolve(process.cwd(), filePath);
  
  // Read the file content
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // We need a simpler, more direct approach to fix specifically the issues found by ESLint
  // First, restore the file to its original state (just in case previous scripts modified it)
  content = content.replace(/&apos;/g, "'");
  
  // Fix all the specific patterns we've seen in the error messages
  const patterns = [
    // title property
    {
      regex: /title="([^"]*)'([^"]*)"/g, 
      replacement: 'title="$1&apos;$2"'
    },
    // description property
    {
      regex: /description="([^"]*)'([^"]*)"/g,
      replacement: 'description="$1&apos;$2"'
    },
    // period property (in export/page.tsx)
    {
      regex: /period: '([^']*)'([^']*)'/g,
      replacement: "period: '$1&apos;$2'"
    },
    // type property (in export/page.tsx)
    {
      regex: /type: '([^']*)'([^']*)'/g,
      replacement: "type: '$1&apos;$2'"
    },
    // metadata title
    {
      regex: /title: "([^"]*)'([^"]*)"/g,
      replacement: 'title: "$1&apos;$2"'
    },
    // metadata description
    {
      regex: /description: "([^"]*)'([^"]*)"/g,
      replacement: 'description: "$1&apos;$2"'
    }
  ];
  
  // Apply all patterns
  patterns.forEach(pattern => {
    content = content.replace(pattern.regex, pattern.replacement);
  });
  
  // Save the file
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Fixed ${filePath}`);
}

// Process each file
filesToFix.forEach(fixFile);
console.log('All files processed successfully!'); 