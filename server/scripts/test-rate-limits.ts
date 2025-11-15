/**
 * Rate Limit Testing Script
 *
 * This script tests the rate limiting functionality by making rapid requests
 * to various API endpoints and monitoring the rate limit responses.
 *
 * Usage:
 *   npm run test-rate-limits [options]
 *
 * Options:
 *   --endpoint <path>    API endpoint to test (default: /v1/campaigns)
 *   --plan <tier>        Test plan tier: free, pro, enterprise (default: free)
 *   --count <number>     Number of requests to make (default: 100)
 *   --delay <ms>         Delay between requests in milliseconds (default: 50)
 *   --url <base>         Base URL (default: http://localhost:4000)
 */

interface RateLimitTestOptions {
  endpoint: string;
  plan: 'free' | 'pro' | 'enterprise';
  count: number;
  delay: number;
  baseUrl: string;
}

interface RequestResult {
  requestNumber: number;
  status: number;
  rateLimitRemaining?: number;
  rateLimitLimit?: number;
  retryAfter?: number;
  error?: any;
  timestamp: number;
}

function parseArgs(): RateLimitTestOptions {
  const args = process.argv.slice(2);
  const options: RateLimitTestOptions = {
    endpoint: '/v1/campaigns',
    plan: 'free',
    count: 100,
    delay: 50,
    baseUrl: 'http://localhost:4000',
  };

  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case '--endpoint':
        options.endpoint = value;
        break;
      case '--plan':
        options.plan = value as 'free' | 'pro' | 'enterprise';
        break;
      case '--count':
        options.count = parseInt(value, 10);
        break;
      case '--delay':
        options.delay = parseInt(value, 10);
        break;
      case '--url':
        options.baseUrl = value;
        break;
      default:
        console.warn(`Unknown flag: ${flag}`);
    }
  }

  return options;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function makeRequest(
  url: string,
  plan: string,
  requestNumber: number
): Promise<RequestResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Plan': plan,
        'Content-Type': 'application/json',
      },
    });

    const result: RequestResult = {
      requestNumber,
      status: response.status,
      timestamp: Date.now() - startTime,
    };

    if (response.status === 429) {
      const data = await response.json();
      result.error = data;
      result.retryAfter = data.error?.details?.retryAfter;
    }

    return result;
  } catch (error) {
    return {
      requestNumber,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
      timestamp: Date.now() - startTime,
    };
  }
}

async function runRateLimitTest(options: RateLimitTestOptions) {
  console.log('🧪 Rate Limit Testing Script');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📍 Endpoint:    ${options.endpoint}`);
  console.log(`🎯 Plan Tier:   ${options.plan}`);
  console.log(`🔢 Requests:    ${options.count}`);
  console.log(`⏱️  Delay:       ${options.delay}ms`);
  console.log(`🌐 Base URL:    ${options.baseUrl}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  const url = `${options.baseUrl}${options.endpoint}`;
  const results: RequestResult[] = [];
  let successCount = 0;
  let rateLimitedCount = 0;
  let errorCount = 0;

  const startTime = Date.now();

  for (let i = 1; i <= options.count; i++) {
    const result = await makeRequest(url, options.plan, i);
    results.push(result);

    if (result.status === 200) {
      successCount++;
      process.stdout.write(`✅ ${i}`);
    } else if (result.status === 429) {
      rateLimitedCount++;
      process.stdout.write(`🚫 ${i}`);

      if (rateLimitedCount === 1) {
        console.log('');
        console.log('');
        console.log('🚨 Rate limit reached!');
        console.log('───────────────────────────────────────────────────────');
        console.log(`Request #${i}:`);
        console.log(JSON.stringify(result.error, null, 2));
        console.log('───────────────────────────────────────────────────────');
        console.log('');
      }
    } else {
      errorCount++;
      process.stdout.write(`❌ ${i}`);
    }

    if (i % 20 === 0) {
      console.log('');
    }

    if (i < options.count) {
      await sleep(options.delay);
    }
  }

  const totalTime = Date.now() - startTime;
  const avgResponseTime = results.reduce((sum, r) => sum + r.timestamp, 0) / results.length;

  console.log('');
  console.log('');
  console.log('📊 Test Results');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Total Requests:      ${options.count}`);
  console.log(`Successful (200):    ${successCount} (${((successCount / options.count) * 100).toFixed(1)}%)`);
  console.log(`Rate Limited (429):  ${rateLimitedCount} (${((rateLimitedCount / options.count) * 100).toFixed(1)}%)`);
  console.log(`Errors:              ${errorCount} (${((errorCount / options.count) * 100).toFixed(1)}%)`);
  console.log('───────────────────────────────────────────────────────');
  console.log(`Total Time:          ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`Avg Response Time:   ${avgResponseTime.toFixed(0)}ms`);
  console.log(`Requests/Second:     ${((options.count / totalTime) * 1000).toFixed(2)}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // Find when rate limiting kicked in
  const firstRateLimit = results.find(r => r.status === 429);
  if (firstRateLimit) {
    console.log('📈 Rate Limit Analysis');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`First rate limit at request #${firstRateLimit.requestNumber}`);
    console.log(`Retry after: ${firstRateLimit.retryAfter}s`);
    console.log(`Error code: ${firstRateLimit.error?.error?.code}`);
    console.log(`Scope: ${firstRateLimit.error?.error?.details?.scope}`);
    console.log(`Limit: ${firstRateLimit.error?.error?.details?.limit}`);
    console.log(`Window: ${firstRateLimit.error?.error?.details?.window}s`);
    console.log('═══════════════════════════════════════════════════════');
  } else {
    console.log('✨ No rate limits encountered!');
    console.log('   Consider increasing --count or decreasing --delay');
  }

  console.log('');

  // Suggest next steps
  if (rateLimitedCount > 0) {
    console.log('💡 Next Steps:');
    console.log('   1. Review the rate limit response format');
    console.log('   2. Test with different plan tiers: --plan pro or --plan enterprise');
    console.log('   3. Test different endpoints: --endpoint /v1/images or --endpoint /v1/spells');
    console.log('   4. Verify retry-after values are correct');
    console.log('');
  }
}

// Main execution
async function main() {
  try {
    const options = parseArgs();
    await runRateLimitTest(options);
  } catch (error) {
    console.error('❌ Error running rate limit test:', error);
    process.exit(1);
  }
}

main();
