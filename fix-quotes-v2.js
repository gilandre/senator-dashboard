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

// First, let's restore the original files
filesToFix.forEach(filePath => {
  // Get the original content by replacing &apos; with ' in import statements
  const fullPath = path.resolve(process.cwd(), filePath);
  const brokenContent = fs.readFileSync(fullPath, 'utf8');
  
  // Fix the import statements
  const fixedImports = brokenContent.replace(/import.*?from\s+&apos;(.*?)&apos;/g, "import $1 from '$2'");
  
  fs.writeFileSync(fullPath, fixedImports, 'utf8');
});

// Function to fix unescaped quotes only in JSX string content
function fixFile(filePath) {
  console.log(`Processing ${filePath}...`);
  const fullPath = path.resolve(process.cwd(), filePath);
  
  // Read the file content
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // First, completely restore all files to their original state
  const originalContent = content.replace(/&apos;/g, "'");
  fs.writeFileSync(fullPath, originalContent, 'utf8');
  
  // Now read the restored file
  const restoredContent = fs.readFileSync(fullPath, 'utf8');
  
  // Fix unescaped quotes in JSX content - find text in quotes containing apostrophes
  const fixedContent = restoredContent.replace(
    /=["']([^"']*)'([^"']*)["']/g,
    (match, before, after) => {
      return `="${before}&apos;${after}"`;
    }
  );
  
  // Also fix text content inside JSX tags (between > and <)
  const finalContent = fixedContent.replace(
    />([^<>]*)'([^<>]*)</g,
    (match, before, after) => {
      return `>${before}&apos;${after}<`;
    }
  );
  
  // Write the fixed content back to the file
  fs.writeFileSync(fullPath, finalContent, 'utf8');
  console.log(`Fixed ${filePath}`);
}

// Process all files
filesToFix.forEach(fixFile);

console.log('All files processed successfully!'); 