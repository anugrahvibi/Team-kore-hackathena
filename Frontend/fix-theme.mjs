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
  if (file.includes('App.tsx') || file.includes('Login.tsx') || file.includes('Signup.tsx')) {
    // skip these as we already handled them correctly manually
    return;
  }
  let content = fs.readFileSync(file, 'utf8');

  let newContent = content
    .replace(/bg-gray-950/g, 'bg-gray-50')
    .replace(/bg-gray-900\/40/g, 'bg-white shadow-sm')
    .replace(/bg-gray-900/g, 'bg-white shadow-sm')
    .replace(/bg-gray-800\/50/g, 'bg-gray-50')
    .replace(/bg-gray-800/g, 'bg-gray-100')
    .replace(/border-gray-800/g, 'border-gray-200')
    .replace(/border-gray-700/g, 'border-gray-200')
    .replace(/text-gray-100/g, 'text-gray-900')
    .replace(/text-gray-200/g, 'text-gray-800')
    .replace(/text-gray-300/g, 'text-gray-700')
    .replace(/text-gray-400/g, 'text-gray-600')
    // reduce neon colors
    .replace(/test-emerald-400/g, 'text-emerald-600')
    .replace(/text-emerald-500/g, 'text-emerald-700')
    .replace(/text-red-400/g, 'text-red-600')
    .replace(/text-red-500/g, 'text-red-700')
    .replace(/text-amber-400/g, 'text-amber-600')
    .replace(/text-blue-400/g, 'text-blue-600')
    .replace(/text-blue-500/g, 'text-blue-700')
    // fix AI ugliness (monospaced text everywhere to sans bolder)
    .replace(/font-mono/g, 'font-sans font-semibold text-gray-700')
    .replace(/tracking-widest/g, 'tracking-wide')
    // rounded edges
    .replace(/rounded-md/g, 'rounded-2xl')
    .replace(/rounded-lg/g, 'rounded-2xl')
    .replace(/rounded"/g, 'rounded-xl"')
    .replace(/rounded /g, 'rounded-xl ');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated theme for ${file}`);
  }
});
