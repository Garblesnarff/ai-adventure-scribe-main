#!/usr/bin/env node

/**
 * Payload Size Measurement Script
 * Measures response payload sizes for optimized endpoints
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

// Helper function to make authenticated requests
function makeRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, SUPABASE_URL);

    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const payloadSize = Buffer.byteLength(data, 'utf8');

        try {
          const json = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: json,
            size: payloadSize,
            sizeFormatted: formatBytes(payloadSize)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            size: payloadSize,
            sizeFormatted: formatBytes(payloadSize)
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Format bytes to human-readable format
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Calculate compression ratio
function calculateCompression(before, after) {
  const reduction = before - after;
  const percentage = (reduction / before) * 100;
  return {
    reduction,
    percentage,
    ratio: `${(before / after).toFixed(2)}x`
  };
}

// Measure character list payload
async function measureCharacterList() {
  console.log('\n=== Measuring Character List Payload ===');

  try {
    // Query with all fields (before optimization)
    const beforeResponse = await makeRequest('/rest/v1/characters?select=*&limit=10');

    // Query with minimal fields (after optimization)
    const afterResponse = await makeRequest(
      '/rest/v1/characters?select=id,name,race,class,level,image_url,avatar_url,campaign_id,created_at,updated_at&limit=10'
    );

    const compression = calculateCompression(beforeResponse.size, afterResponse.size);

    console.log(`Before (all fields): ${beforeResponse.sizeFormatted} (${beforeResponse.body.length} characters)`);
    console.log(`After (minimal fields): ${afterResponse.sizeFormatted} (${afterResponse.body.length} characters)`);
    console.log(`Reduction: ${formatBytes(compression.reduction)} (${compression.percentage.toFixed(1)}%)`);
    console.log(`Per character reduction: ~${formatBytes(compression.reduction / beforeResponse.body.length)}`);

    return {
      name: 'Character List',
      before: beforeResponse.size,
      after: afterResponse.size,
      count: beforeResponse.body.length,
      ...compression
    };
  } catch (error) {
    console.error('Error measuring character list:', error.message);
    return null;
  }
}

// Measure campaign list payload
async function measureCampaignList() {
  console.log('\n=== Measuring Campaign List Payload ===');

  try {
    // Query with all fields including JSONB (before optimization)
    const beforeResponse = await makeRequest('/rest/v1/campaigns?select=*&limit=10');

    // Query with minimal fields excluding JSONB (after optimization)
    const afterResponse = await makeRequest(
      '/rest/v1/campaigns?select=id,name,description,genre,difficulty_level,campaign_length,tone,status,background_image,art_style,created_at,updated_at&limit=10'
    );

    const compression = calculateCompression(beforeResponse.size, afterResponse.size);

    console.log(`Before (all fields): ${beforeResponse.sizeFormatted} (${beforeResponse.body.length} campaigns)`);
    console.log(`After (minimal fields): ${afterResponse.sizeFormatted} (${afterResponse.body.length} campaigns)`);
    console.log(`Reduction: ${formatBytes(compression.reduction)} (${compression.percentage.toFixed(1)}%)`);
    console.log(`Per campaign reduction: ~${formatBytes(compression.reduction / beforeResponse.body.length)}`);

    return {
      name: 'Campaign List',
      before: beforeResponse.size,
      after: afterResponse.size,
      count: beforeResponse.body.length,
      ...compression
    };
  } catch (error) {
    console.error('Error measuring campaign list:', error.message);
    return null;
  }
}

// Measure message list payload
async function measureMessageList() {
  console.log('\n=== Measuring Message List Payload ===');

  try {
    // Find a session with messages
    const sessionResponse = await makeRequest(
      '/rest/v1/dialogue_history?select=session_id&limit=1'
    );

    if (!sessionResponse.body || sessionResponse.body.length === 0) {
      console.log('No sessions with messages found');
      return null;
    }

    const sessionId = sessionResponse.body[0].session_id;

    // Load all messages (before pagination)
    const beforeResponse = await makeRequest(
      `/rest/v1/dialogue_history?select=*,game_sessions(character_id,characters(name,avatar_url))&session_id=eq.${sessionId}`
    );

    // Load first page only (after pagination)
    const afterResponse = await makeRequest(
      `/rest/v1/dialogue_history?select=*,game_sessions(character_id,characters(name,avatar_url))&session_id=eq.${sessionId}&limit=50`
    );

    const compression = calculateCompression(beforeResponse.size, afterResponse.size);

    console.log(`Before (all messages): ${beforeResponse.sizeFormatted} (${beforeResponse.body.length} messages)`);
    console.log(`After (first page): ${afterResponse.sizeFormatted} (${afterResponse.body.length} messages)`);
    console.log(`Reduction: ${formatBytes(compression.reduction)} (${compression.percentage.toFixed(1)}%)`);
    console.log(`Initial load is ${compression.ratio} smaller`);

    return {
      name: 'Message List',
      before: beforeResponse.size,
      after: afterResponse.size,
      count: beforeResponse.body.length,
      pageSize: afterResponse.body.length,
      ...compression
    };
  } catch (error) {
    console.error('Error measuring message list:', error.message);
    return null;
  }
}

// Measure spell data payload
async function measureSpellData() {
  console.log('\n=== Measuring Spell Data Payload ===');

  try {
    // Find a character with spells
    const characterResponse = await makeRequest(
      '/rest/v1/character_spells?select=character_id&limit=1'
    );

    if (!characterResponse.body || characterResponse.body.length === 0) {
      console.log('No characters with spells found');
      return null;
    }

    const characterId = characterResponse.body[0].character_id;

    // Load spells with full data
    const beforeResponse = await makeRequest(
      `/rest/v1/character_spells?select=*,spells(*)&character_id=eq.${characterId}`
    );

    // Load spells with minimal data
    const afterResponse = await makeRequest(
      `/rest/v1/character_spells?select=spell_id,is_prepared,source_feature,spells(id,name,level,school)&character_id=eq.${characterId}`
    );

    const compression = calculateCompression(beforeResponse.size, afterResponse.size);

    console.log(`Before (full spell data): ${beforeResponse.sizeFormatted} (${beforeResponse.body.length} spells)`);
    console.log(`After (minimal spell data): ${afterResponse.sizeFormatted} (${afterResponse.body.length} spells)`);
    console.log(`Reduction: ${formatBytes(compression.reduction)} (${compression.percentage.toFixed(1)}%)`);
    console.log(`Per spell reduction: ~${formatBytes(compression.reduction / beforeResponse.body.length)}`);

    return {
      name: 'Spell Data',
      before: beforeResponse.size,
      after: afterResponse.size,
      count: beforeResponse.body.length,
      ...compression
    };
  } catch (error) {
    console.error('Error measuring spell data:', error.message);
    return null;
  }
}

// Main execution
async function main() {
  console.log('========================================');
  console.log('Payload Size Measurement Suite');
  console.log('========================================');

  const results = [];

  // Run all measurements
  const characterListResult = await measureCharacterList();
  if (characterListResult) results.push(characterListResult);

  const campaignListResult = await measureCampaignList();
  if (campaignListResult) results.push(campaignListResult);

  const messageListResult = await measureMessageList();
  if (messageListResult) results.push(messageListResult);

  const spellDataResult = await measureSpellData();
  if (spellDataResult) results.push(spellDataResult);

  // Generate summary
  console.log('\n========================================');
  console.log('Summary');
  console.log('========================================');

  const totalBefore = results.reduce((sum, r) => sum + r.before, 0);
  const totalAfter = results.reduce((sum, r) => sum + r.after, 0);
  const totalReduction = totalBefore - totalAfter;
  const avgPercentage = results.reduce((sum, r) => sum + r.percentage, 0) / results.length;

  console.log(`\nTotal payload before: ${formatBytes(totalBefore)}`);
  console.log(`Total payload after: ${formatBytes(totalAfter)}`);
  console.log(`Total reduction: ${formatBytes(totalReduction)} (${avgPercentage.toFixed(1)}% average)`);

  // Estimate bandwidth savings at scale
  console.log('\n=== Bandwidth Savings at Scale ===');

  const scenarios = [
    { users: 100, requestsPerDay: 10 },
    { users: 1000, requestsPerDay: 10 },
    { users: 10000, requestsPerDay: 10 }
  ];

  scenarios.forEach(scenario => {
    const dailyRequests = scenario.users * scenario.requestsPerDay;
    const dailySavings = (totalReduction * dailyRequests);
    const monthlySavings = dailySavings * 30;

    console.log(`\n${scenario.users} users @ ${scenario.requestsPerDay} requests/day:`);
    console.log(`  Daily savings: ${formatBytes(dailySavings)}`);
    console.log(`  Monthly savings: ${formatBytes(monthlySavings)}`);
  });

  // Save results to file
  const outputDir = path.join(__dirname, '..', 'benchmark-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `payload-sizes-${timestamp}.json`);

  fs.writeFileSync(outputFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    summary: {
      totalBefore,
      totalAfter,
      totalReduction,
      avgPercentage
    },
    scenarios: scenarios.map(s => ({
      ...s,
      dailyRequests: s.users * s.requestsPerDay,
      dailySavings: totalReduction * s.users * s.requestsPerDay,
      monthlySavings: totalReduction * s.users * s.requestsPerDay * 30
    }))
  }, null, 2));

  console.log(`\nResults saved to: ${outputFile}`);
}

main().catch(console.error);
