import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace generic export/import of Prediction, InfrastructureNode to type import
  // Wait, usually it's `import { fetchZones, fetchInfrastructure, Prediction, InfrastructureNode... }`
  // We can just separate them out.
  
  if (content.includes('Prediction') || content.includes('InfrastructureNode')) {
    // Regex to match the import statement from dataFetcher
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]\.\.?\/utils\/dataFetcher['"];?/;
    const match = content.match(importRegex);
    if (match) {
      let imports = match[1].split(',').map(s => s.trim());
      
      let values = [];
      let types = [];
      
      imports.forEach(i => {
        if (i === 'Prediction' || i === 'InfrastructureNode' || i === 'CascadeAlert') {
          types.push(i);
        } else if (i) {
          values.push(i);
        }
      });
      
      let newImport = '';
      if (values.length > 0) {
        newImport += `import { ${values.join(', ')} } from '../utils/dataFetcher';\n`;
      }
      if (types.length > 0) {
        newImport += `import type { ${types.join(', ')} } from '../utils/dataFetcher';`;
      }
      
      content = content.replace(match[0], newImport);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed imports in ${file}`);
  }
});
