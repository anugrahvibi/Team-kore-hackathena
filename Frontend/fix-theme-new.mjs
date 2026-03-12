import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));
files.forEach((f) => {
  let c = fs.readFileSync(f, 'utf8');
  let init = c;

  // 1. replace bg-white with glass white where needed
  // using negative lookahead for tailwind values like bg-white/70, bg-white, except inside strings that end
  c = c.replace(/className="([^"]*\b)bg-white(\b[^"]*)"/g, (match, p1, p2) => {
     return `className="${p1}bg-white/95 backdrop-blur-3xl shadow-xl border border-white/60${p2}"`;
  });

  // 2. fix ArrowRight
  // replace <ArrowRight ... /> with wrapped one
  c = c.replace(/<ArrowRight([^>]*)className=(["'])([^"']*)(["'])([^>]*)\/>/g, (match, p1, q1, cls, q2, p2) => {
     let newCls = cls.replace(/group-hover:translate-x-[\d\.]+/g, '').trim();
     return `<div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-black/5 group-hover:-rotate-45 transition-all duration-300"><ArrowRight${p1}className=${q1}${newCls}${q2}${p2}/></div>`;
  });

  if (c !== init) {
    fs.writeFileSync(f, c);
    console.log('Fixed:', path.basename(f));
  }
});

// Fix Synchronizing AI data box in MapView.tsx
const mapViewPath = path.join(__dirname, 'src/components/MapView.tsx');
let mapCode = fs.readFileSync(mapViewPath, 'utf8');
mapCode = mapCode.replace(/<div className="glass-card" style={{ borderRadius: 16, padding: '16px 24px'/g, '<div className="glass-card shrink-0" style={{ borderRadius: 16, padding: "16px 24px", minWidth: 220, textAlign: "center", whiteSpace: "nowrap"');
fs.writeFileSync(mapViewPath, mapCode);
console.log('Fixed MapView.tsx');
