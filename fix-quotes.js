const fs = require('fs');
const path = require('path');

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

// Function to fix unescaped quotes in a file
function fixFile(filePath) {
  console.log(`Processing ${filePath}...`);
  const fullPath = path.resolve(process.cwd(), filePath);
  
  // Read the file content
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Replace all unescaped single quotes in JSX text with &apos;
  // This regex finds single quotes in JSX text content
  const fixedContent = content.replace(
    /(\s|>)([^<>]*?)'([^<>]*?)(\s|<)/g, 
    (match, before, textBefore, textAfter, after) => {
      return `${before}${textBefore}&apos;${textAfter}${after}`;
    }
  );
  
  // Write the fixed content back to the file
  fs.writeFileSync(fullPath, fixedContent, 'utf8');
  console.log(`Fixed ${filePath}`);
}

// Process all files
filesToFix.forEach(fixFile);

console.log('All files processed successfully!'); 