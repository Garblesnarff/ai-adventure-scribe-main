/**
 * Test Character AI Generation
 * 
 * Run this in the browser console to test character description and image generation.
 * 
 * Usage:
 * 1. npm run dev
 * 2. Open browser console
 * 3. Copy and paste this code
 */

// Test character data
const testCharacterData = {
  name: 'Elaria Moonwhisper',
  description: 'A mysterious elven ranger with silver hair and keen green eyes',
  race: 'Elf',
  class: 'Ranger',
  background: 'Outlander',
  alignment: 'Chaotic Good',
  level: 5
};

/**
 * Test character description generation
 */
async function testDescriptionGeneration() {
  console.log('🖋️ Testing character description generation...');
  
  try {
    const { characterDescriptionGenerator } = await import('./src/services/character-description-generator.js');
    
    console.log('📝 Character data:', JSON.stringify(testCharacterData, null, 2));
    console.log('🚀 Generating enhanced description...');
    
    const enhancedDescription = await characterDescriptionGenerator.generateDescription(
      testCharacterData,
      {
        enhanceExisting: true,
        includeBackstory: true,
        includePersonality: true,
        includeAppearance: true,
        tone: 'heroic'
      }
    );
    
    console.log('✅ Enhanced description generated!');
    console.log('📖 Description:', enhancedDescription.description);
    console.log('👁️ Appearance:', enhancedDescription.appearance);
    console.log('💭 Personality:', enhancedDescription.personality_traits);
    console.log('📚 Backstory:', enhancedDescription.backstory_elements);
    
  } catch (error) {
    console.error('❌ Description generation test failed:', error);
  }
}

/**
 * Test character image generation
 */
async function testImageGeneration() {
  console.log('🎨 Testing character image generation...');
  
  try {
    const { characterImageGenerator } = await import('./src/services/character-image-generator.js');
    
    console.log('📝 Character data:', JSON.stringify(testCharacterData, null, 2));
    console.log('🚀 Generating character portrait...');
    
    const imageUrl = await characterImageGenerator.generateCharacterImage(
      testCharacterData,
      { style: 'portrait' }
    );
    
    console.log('✅ Character image generated!');
    console.log('🖼️ Image URL:', imageUrl);
    
    // Display the image in console (if browser supports it)
    if (imageUrl.startsWith('data:image/')) {
      console.log('🖼️ Generated image:');
      console.log('%c ', `
        font-size: 200px; 
        background: url(${imageUrl}) no-repeat center center; 
        background-size: contain;
        line-height: 200px;
      `);
    }
    
  } catch (error) {
    console.error('❌ Image generation test failed:', error);
  }
}

/**
 * Test both generation services together
 */
async function testFullCharacterGeneration() {
  console.log('🎭 Testing complete character AI generation...');
  
  try {
    console.log('🔄 Step 1: Generating enhanced description...');
    await testDescriptionGeneration();
    
    console.log('🔄 Step 2: Generating character portrait...');
    await testImageGeneration();
    
    console.log('🎉 Full character generation test completed!');
    
    // Test model usage tracking
    const { modelUsageTracker } = await import('./src/services/model-usage-tracker.js');
    const freeModelId = 'google/gemini-2.5-flash-image-preview:free';
    const stats = modelUsageTracker.getUsageStats(freeModelId, 1000);
    console.log('📊 Free tier usage stats:', stats);
    
  } catch (error) {
    console.error('❌ Full generation test failed:', error);
  }
}

/**
 * Test different character archetypes
 */
async function testVariousCharacters() {
  console.log('🎪 Testing various character archetypes...');
  
  const characterTypes = [
    {
      name: 'Grimjaw Ironbeard',
      race: 'Dwarf',
      class: 'Fighter',
      background: 'Soldier',
      description: 'A battle-scarred dwarf warrior'
    },
    {
      name: 'Luna Starweaver',
      race: 'Human',
      class: 'Wizard',
      background: 'Sage',
      description: 'A young human mage with extraordinary potential'
    },
    {
      name: 'Shadowstep',
      race: 'Halfling',
      class: 'Rogue',
      background: 'Criminal',
      description: 'A nimble halfling thief with a mysterious past'
    }
  ];
  
  try {
    const { characterDescriptionGenerator } = await import('./src/services/character-description-generator.js');
    
    for (const char of characterTypes) {
      console.log(`\n🎭 Testing ${char.name} (${char.race} ${char.class}):`);
      
      const quickDesc = await characterDescriptionGenerator.generateQuickDescription(char);
      console.log('📝 Quick description:', quickDesc);
    }
    
    console.log('🎉 Character archetype tests completed!');
    
  } catch (error) {
    console.error('❌ Character archetype test failed:', error);
  }
}

// Instructions for manual testing
console.log(`
🔧 Character AI Generation Testing Instructions:

Available Test Functions:
1. testDescriptionGeneration() - Test AI description enhancement
2. testImageGeneration() - Test AI character portrait generation  
3. testFullCharacterGeneration() - Test both services together
4. testVariousCharacters() - Test different character archetypes

Example Usage:
- Run 'testFullCharacterGeneration()' for a complete test
- Run 'testVariousCharacters()' to test multiple character types
- Individual functions for specific testing

Note: Make sure you have VITE_OPENROUTER_API_KEY and VITE_GEMINI_API_KEYS set in your .env file
`);

// Export functions for global access
window.testDescriptionGeneration = testDescriptionGeneration;
window.testImageGeneration = testImageGeneration;
window.testFullCharacterGeneration = testFullCharacterGeneration;
window.testVariousCharacters = testVariousCharacters;