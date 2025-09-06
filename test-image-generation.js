/**
 * Test script for campaign image generation
 * Run with: npm run dev and then test via browser console
 */

// This file is for reference - actual testing should be done in dev environment
console.log(`
To test image generation:
1. Run 'npm run dev'
2. Open browser console
3. Copy and paste this test code:

// Test campaign image generation
const testCampaign = {
  name: 'Test Campaign',
  genre: 'dark-fantasy',
  tone: 'serious',
  description: 'A dark fantasy campaign in a gothic setting',
  location: 'forest',
  era: 'medieval',
  atmosphere: 'mysterious'
};

// Import and test (in browser environment)
import('./src/services/campaign-image-generator.js')
  .then(module => {
    const { campaignImageGenerator } = module;
    return campaignImageGenerator.generateCampaignImage(testCampaign);
  })
  .then(imageUrl => {
    console.log('✅ Success! Generated image URL:', imageUrl);
    console.log('🎉 Test completed successfully!');
  })
  .catch(error => {
    console.error('❌ Test failed:', error.message);
    console.error('📋 Full error:', error);
  });
`);

async function testImageGeneration() {
  console.log('🖼️ Testing campaign image generation with prominent title display...');
  
  const testCampaign = {
    name: 'The Lost Temple',
    genre: 'dark-fantasy',
    tone: 'mysterious',
    description: 'A dark fantasy campaign exploring ancient ruins',
    location: 'underground',
    era: 'ancient',
    atmosphere: 'foreboding'
  };

  try {
    console.log('📝 Campaign data:', JSON.stringify(testCampaign, null, 2));
    console.log('🚀 Generating image...');
    
    const imageUrl = await campaignImageGenerator.generateCampaignImage(testCampaign);
    
    console.log('✅ Success! Generated image URL:', imageUrl);
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📋 Full error:', error);
  }
}

testImageGeneration();