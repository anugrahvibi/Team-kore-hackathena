import fs from 'fs';
import path from 'path';

const dir = 'Frontend/src/dashboards';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/text-\[8px\]/g, 'text-[12px]');
  content = content.replace(/text-\[9px\]/g, 'text-[12px]');
  content = content.replace(/text-\[10px\]/g, 'text-[12px]');
  content = content.replace(/text-\[11px\]/g, 'text-[13px]');
  content = content.replace(/text-\[12px\]/g, 'text-[13px]');
  content = content.replace(/text-\[15px\]/g, 'text-[12px]'); // Fix previous high-scaling
  content = content.replace(/text-\[16px\]/g, 'text-[13px]'); // Fix previous high-scaling
  content = content.replace(/text-\[17px\]/g, 'text-sm'); // Fix previous high-scaling to standard sm
  
  fs.writeFileSync(filePath, content);
});
