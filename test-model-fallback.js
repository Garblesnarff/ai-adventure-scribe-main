/**
 * Test Model Fallback System
 * 
 * Run this in the browser console to test the free tier model usage tracking
 * and fallback to paid models when the free tier is exhausted.
 * 
 * Usage:
 * 1. npm run dev
 * 2. Open browser console
 * 3. Copy and paste this code
 */

// Test the model usage tracker
async function testModelFallback() {
  console.log('🧪 Testing model fallback system...');
  
  try {
    // Import modules
    const { modelUsageTracker } = await import('./src/services/model-usage-tracker.js');
    const { openRouterService } = await import('./src/services/openrouter-service.js');
    
    console.log('📊 Getting usage stats before test...');
    const statsBefore = openRouterService.getUsageStats();
    console.log('Usage before test:', statsBefore);
    
    // Test campaign data with the campaign name
    const testCampaign = {
      name: 'The Enchanted Realm',
      genre: 'high-fantasy',
      tone: 'heroic',
      description: 'An epic high fantasy adventure in a magical realm',
      location: 'forest',
      era: 'medieval',
      atmosphere: 'magical'
    };
    
    console.log('🎮 Testing campaign:', testCampaign.name);
    
    // Import and test campaign image generator
    const { campaignImageGenerator } = await import('./src/services/campaign-image-generator.js');
    
    console.log('🖼️ Generating campaign image with free model...');
    const imageUrl = await campaignImageGenerator.generateCampaignImage(testCampaign);
    
    console.log('✅ Image generated successfully!');
    console.log('📷 Image URL:', imageUrl);
    
    console.log('📊 Getting usage stats after test...');
    const statsAfter = openRouterService.getUsageStats();
    console.log('Usage after test:', statsAfter);
    
    // Test if we can still use the model
    const freeModelId = 'google/gemini-2.5-flash-image-preview:free';
    const canUse = modelUsageTracker.canUseModel(freeModelId, 1000);
    console.log(`Can still use free model: ${canUse}`);
    
    const remaining = modelUsageTracker.getRemainingUsage(freeModelId, 1000);
    console.log(`Remaining uses today: ${remaining}`);
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('📋 Full error details:', error);
  }
}

// Test usage tracking manually
async function testUsageTracking() {
  console.log('📈 Testing usage tracking...');
  
  try {
    const { modelUsageTracker } = await import('./src/services/model-usage-tracker.js');
    
    const modelId = 'google/gemini-2.5-flash-image-preview:free';
    const dailyLimit = 1000;
    
    console.log('Before recording usage:');
    console.log('- Can use model:', modelUsageTracker.canUseModel(modelId, dailyLimit));
    console.log('- Remaining:', modelUsageTracker.getRemainingUsage(modelId, dailyLimit));
    
    // Record some usage
    modelUsageTracker.recordUsage(modelId, dailyLimit);
    modelUsageTracker.recordUsage(modelId, dailyLimit);
    
    console.log('After recording 2 uses:');
    console.log('- Can use model:', modelUsageTracker.canUseModel(modelId, dailyLimit));
    console.log('- Remaining:', modelUsageTracker.getRemainingUsage(modelId, dailyLimit));
    console.log('- Stats:', modelUsageTracker.getUsageStats(modelId, dailyLimit));
    
    console.log('✅ Usage tracking test completed!');
    
  } catch (error) {
    console.error('❌ Usage tracking test failed:', error);
  }
}

// Instructions for manual testing
console.log(`
🔧 Model Fallback Testing Instructions:

1. Run 'testModelFallback()' to test image generation with fallback
2. Run 'testUsageTracking()' to test the usage counting system
3. Check localStorage to see persistent usage data
4. Try generating multiple images to test the free tier limit

Note: Make sure you have VITE_OPENROUTER_API_KEY set in your .env file
`);

// Export functions for global access
window.testModelFallback = testModelFallback;
window.testUsageTracking = testUsageTracking;