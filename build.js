import { execSync } from 'child_process';

console.log('Starting project build...');

try {
  // 1. Run Vite build
  console.log('Running vite build...');
  execSync('npx vite build', { stdio: 'inherit' });

  // 2. Build server if not on Cloudflare
  if (!process.env.CF_PAGES && !process.env.CLOUDFLARE) {
    console.log('Building server.ts for AI Studio environment...');
    execSync('npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs', { stdio: 'inherit' });
  } else {
    console.log('Cloudflare Pages environment detected. Skipping server.ts compilation to optimize serverless deploy.');
  }

  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
