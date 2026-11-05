import { build } from 'esbuild'

await build({
  entryPoints: ['src/engine/StandaloneViewer.tsx'],
  bundle: true,
  minify: true,
  legalComments: 'none',
  format: 'iife',
  target: ['es2020'],
  outfile: 'assets/dualforce-engine.js',
})

console.log('Built assets/dualforce-engine.js')
