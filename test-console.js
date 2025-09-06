// Browser console test for campaign image generation
// Copy and paste this entire script into the browser console at http://localhost:8085/

console.log('🖼️ Testing campaign image generation...');

const testCampaign = {
  name: 'Test Campaign',
  genre: 'dark-fantasy',
  tone: 'serious',
  description: 'A dark fantasy campaign in a gothic setting',
  location: 'forest',
  era: 'medieval',
  atmosphere: 'mysterious'
};

console.log('📝 Campaign data:', JSON.stringify(testCampaign, null, 2));
console.log('🚀 Generating image...');

// Test the image generation
(async function testImageGeneration() {
  try {
    // Import the campaign image generator
    const { campaignImageGenerator } = await import('./src/services/campaign-image-generator.js');
    
    // Generate the image
    const imageUrl = await campaignImageGenerator.generateCampaignImage(testCampaign);
    
    console.log('✅ Success! Generated image URL:', imageUrl);
    console.log('🎉 Test completed successfully!');
    
    // Display the image in the console (if it's a data URL) or show the URL
    if (imageUrl.startsWith('data:image/')) {
      console.log('📸 Generated data URL image (base64)');
      const img = new Image();
      img.src = imageUrl;
      img.style.maxWidth = '200px';
      console.log('Image object created:', img);
    } else {
      console.log('🔗 Generated public URL:', imageUrl);
      // Try to fetch the image to verify it's accessible
      try {
        const response = await fetch(imageUrl);
        if (response.ok) {
          console.log('✅ Image URL is accessible');
        } else {
          console.log('⚠️ Image URL returned status:', response.status);
        }
      } catch (fetchError) {
        console.log('⚠️ Could not fetch image URL:', fetchError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📋 Full error:', error);
    
    // Check specific error types
    if (error.message.includes('API key')) {
      console.log('💡 Check that VITE_OPENROUTER_API_KEY is set in .env.local');
    } else if (error.message.includes('fetch')) {
      console.log('💡 Check network connection and API availability');
    }
  }
})();