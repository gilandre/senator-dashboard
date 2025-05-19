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

// Function to fix unescaped quotes in all relevant contexts
function fixFile(filePath) {
  console.log(`Processing ${filePath}...`);
  const fullPath = path.resolve(process.cwd(), filePath);
  
  // Read the file content
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // First, completely restore all files to their original state
  const originalContent = content.replace(/&apos;/g, "'");
  fs.writeFileSync(fullPath, originalContent, 'utf8');
  
  let fixedContent = fs.readFileSync(fullPath, 'utf8');
  
  // Replace in JSX strings (both in props and between tags)
  // Approach: Process the file line by line to identify JSX context
  const lines = fixedContent.split('\n');
  const fixedLines = lines.map(line => {
    // Skip lines that are import statements or not JSX
    if (line.trim().startsWith('import ') || !line.includes('<')) {
      return line;
    }
    
    // 1. Fix string literals in JSX attribute values
    let fixedLine = line.replace(
      /=["']([^"']*)'([^"']*)["']/g,
      (match, before, after) => {
        return `="${before}&apos;${after}"`;
      }
    );
    
    // 2. Fix text content between JSX tags
    fixedLine = fixedLine.replace(
      />([^<>]*)'([^<>]*)</g,
      (match, before, after) => {
        return `>${before}&apos;${after}<`;
      }
    );
    
    // 3. Fix string literals inside title, description, etc. metadata properties
    if (line.includes('title:') || line.includes('description:')) {
      fixedLine = fixedLine.replace(
        /: *"([^"]*)'([^"]*)"/g,
        (match, before, after) => {
          return `: "${before}&apos;${after}"`;
        }
      );
    }
    
    return fixedLine;
  });
  
  // Join lines back together and write to file
  fixedContent = fixedLines.join('\n');
  fs.writeFileSync(fullPath, fixedContent, 'utf8');
  console.log(`Fixed ${filePath}`);
}

// Process all files
filesToFix.forEach(fixFile);

console.log('All files processed successfully!'); 