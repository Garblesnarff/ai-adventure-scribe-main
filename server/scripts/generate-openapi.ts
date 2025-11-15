/**
 * Generate OpenAPI Specification File
 *
 * This script generates the complete OpenAPI 3.0 specification
 * for the AI Adventure Scribe API and saves it to docs/openapi.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { specs } from '../src/docs/openapi-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output path for the generated spec
const outputPath = path.join(__dirname, '../../docs/openapi.json');

try {
  // Ensure docs directory exists
  const docsDir = path.dirname(outputPath);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Write the OpenAPI spec
  fs.writeFileSync(outputPath, JSON.stringify(specs, null, 2));

  console.log('✅ OpenAPI specification generated successfully!');
  console.log(`📄 Location: ${outputPath}`);
  console.log(`📊 Stats:`);
  console.log(`   - OpenAPI Version: ${specs.openapi}`);
  console.log(`   - API Title: ${specs.info.title}`);
  console.log(`   - API Version: ${specs.info.version}`);
  console.log(`   - Servers: ${specs.servers?.length || 0}`);
  console.log(`   - Tags: ${specs.tags?.length || 0}`);
  console.log(`   - Paths: ${Object.keys(specs.paths || {}).length}`);
  console.log(`   - Schemas: ${Object.keys(specs.components?.schemas || {}).length}`);
  console.log('');
  console.log('🌐 View documentation:');
  console.log('   - Swagger UI: http://localhost:8888/api-docs');
  console.log('   - JSON Spec: docs/openapi.json');
} catch (error) {
  console.error('❌ Error generating OpenAPI specification:', error);
  process.exit(1);
}
