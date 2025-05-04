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

// Function to fix a file by reading its original content and applying specific fixes
function fixFile(filePath) {
  console.log(`Processing ${filePath}...`);
  const fullPath = path.resolve(process.cwd(), filePath);

  // Get the original content
  const content = fs.readFileSync(fullPath, 'utf8');

  // First restore file to completely original state to ensure we're working with clean code
  const restoredContent = content.replace(/&apos;/g, "'");
  fs.writeFileSync(fullPath, restoredContent, 'utf8');
  
  // Read the clean file again
  let cleanContent = fs.readFileSync(fullPath, 'utf8');

  // Fix based on file path and patterns rather than trying to be too clever with regexes
  if (filePath.includes('export/page.tsx')) {
    // Handle the special case of object literals in export/page.tsx
    const fixedExport = cleanContent.replace(
      // Match the pattern of array items and replace single quotes in "period" and "type" fields
      /{ name: '([^']+)', date: '([^']+)', type: '([^']*)'([^']*)'/g,
      (match, name, date, typeBefore, typeAfter) => {
        return `{ name: '${name}', date: '${date}', type: '${typeBefore}\\\'${typeAfter}'`;
      }
    ).replace(
      // Handle period field
      /period: '([^']*)'([^']*)'/g,
      (match, before, after) => {
        return `period: '${before}\\\'${after}'`;
      }
    );

    fs.writeFileSync(fullPath, fixedExport, 'utf8');
  } else if (filePath.includes('security/page.tsx')) {
    // Fix toggle switches in security settings
    const fixedSecurity = cleanContent.replace(
      // Fix the after:content-['"] CSS value
      /after:content-\['"\]/g,
      'after:content-[\'\\"\']'
    );

    fs.writeFileSync(fullPath, fixedSecurity, 'utf8');
  }

  // Now apply general JSX fixes to all files
  // Read the current content which might have been modified by special case code above
  const currentContent = fs.readFileSync(fullPath, 'utf8');
  
  // Fix all JSX properties with unescaped quotes
  let fixedContent = currentContent;
  
  // Only in JSX context (when there are prop="value" patterns), use &apos;
  // Helper function to fix quotes in JSX strings
  const fixJSXStrings = (content) => {
    // Fix JSX props with apostrophes (only when inside double quotes)
    let fixed = content.replace(
      /(title|description|className|aria-label)="([^"]*)'([^"]*)"/g,
      (match, attr, before, after) => {
        return `${attr}="${before}&apos;${after}"`;
      }
    );
    
    // Fix JSX text content with apostrophes
    fixed = fixed.replace(
      />([^<>]*)'([^<>]*)</g,
      (match, before, after) => {
        return `>${before}&apos;${after}<`;
      }
    );
    
    // Fix metadata fields
    fixed = fixed.replace(
      /(title|description): "([^"]*)'([^"]*)"/g,
      (match, field, before, after) => {
        return `${field}: "${before}&apos;${after}"`;
      }
    );
    
    return fixed;
  };
  
  // Apply the fixes
  fixedContent = fixJSXStrings(fixedContent);
  
  // Write the final fixed content
  fs.writeFileSync(fullPath, fixedContent, 'utf8');
  console.log(`Fixed ${filePath}`);
}

// Process each file
filesToFix.forEach(fixFile);
console.log('All files processed successfully!'); 