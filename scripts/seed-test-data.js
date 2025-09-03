#!/usr/bin/env node

/**
 * Seed Test Data Script
 * Creates a test user account and sample data for development
 * Run with: node scripts/seed-test-data.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role key for admin operations
const testEmail = process.env.VITE_DEV_TEST_EMAIL || 'test@example.com';
const testPassword = process.env.VITE_DEV_TEST_PASSWORD || 'testpass123';

if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL is required');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required for this operation');
  console.error('   You can find this in your Supabase project settings > API');
  console.error('   Add it to your .env.local file as: SUPABASE_SERVICE_ROLE_KEY=your_key_here');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedTestData() {
  console.log('🌱 Starting test data seeding...');
  
  try {
    // 1. Create or find test user account
    console.log(`📧 Creating test user: ${testEmail}`);
    
    let userId;
    
    // First try to create user with normal signup (sets password correctly)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (signUpError && (signUpError.message.includes('User already registered') || signUpError.code === 'user_already_exists')) {
      // User exists, get their ID and update password
      console.log(`📝 Test user already exists, updating password...`);
      
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        throw listError;
      }
      
      const existingUser = usersData.users.find(u => u.email === testEmail);
      
      if (!existingUser) {
        throw new Error('Could not find existing user');
      }
      
      userId = existingUser.id;
      
      // Update the user's password and confirm email
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: testPassword,
        email_confirm: true
      });
      
      if (updateError) {
        throw updateError;
      }
      
      console.log(`✅ Found existing user and updated password: ${userId}`);
    } else if (signUpError) {
      throw signUpError;
    } else if (signUpData?.user) {
      // New user created successfully
      userId = signUpData.user.id;
      
      // Confirm the email immediately for development
      const { error: confirmError } = await supabase.auth.admin.updateUserById(userId, {
        email_confirm: true
      });
      
      if (confirmError) {
        console.warn('Warning: Could not confirm email for new user:', confirmError);
      }
      
      console.log(`✅ Test user created with ID: ${userId}`);
    } else {
      throw new Error('Unexpected response from user creation');
    }

    // 2. Create or find sample campaign
    console.log('🏰 Creating sample campaign...');
    
    const campaignName = 'The Lost Temple of Mysteries';
    
    // Check if campaign already exists for this user
    const { data: existingCampaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .eq('name', campaignName)
      .single();

    let campaignData;
    
    if (existingCampaign) {
      console.log(`📝 Campaign already exists: ${existingCampaign.name}`);
      campaignData = existingCampaign;
    } else {
      // Create new campaign
      const { data: newCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: userId,
          name: campaignName,
          description: 'A thrilling adventure in an ancient temple filled with magical traps, mysterious creatures, and legendary treasures waiting to be discovered by brave adventurers.',
          genre: 'dark-fantasy',
          difficulty_level: 'easy',
          campaign_length: 'short',
          tone: 'serious',
          era: null,
          location: 'Ancient Temple',
          atmosphere: null,
          setting_details: {
            climate: 'Temperate',
            population: 'Abandoned',
            government: 'Ancient Magic'
          },
          thematic_elements: {
            themes: ['Mystery', 'Ancient Magic', 'Exploration'],
            conflicts: ['Traps vs Adventurers', 'Ancient Guardians']
          },
          status: 'active'
        })
        .select()
        .single();

      if (campaignError) throw campaignError;
      campaignData = newCampaign;
      console.log(`✅ Sample campaign created: ${campaignData.name}`);
    }

    // 3. Create or find sample character
    console.log('🧙 Creating sample character...');
    
    const characterName = 'Eldric the Wise';
    
    // Check if character already exists for this user
    const { data: existingCharacter } = await supabase
      .from('characters')
      .select('*')
      .eq('user_id', userId)
      .eq('name', characterName)
      .single();

    let characterData;
    
    if (existingCharacter) {
      console.log(`📝 Character already exists: ${existingCharacter.name}`);
      characterData = existingCharacter;
    } else {
      // Create new character
      const { data: newCharacter, error: characterError } = await supabase
        .from('characters')
        .insert({
          user_id: userId,
          name: characterName,
          description: 'A skilled wizard with a mysterious past and a thirst for ancient knowledge.',
          race: 'Elf',
          class: 'Wizard',
          level: 3,
          alignment: 'Chaotic Good',
          experience_points: 900
        })
        .select()
        .single();

      if (characterError) throw characterError;
      characterData = newCharacter;
      console.log(`✅ Sample character created: ${characterData.name}`);
    }

    // 4. Create or find sample game session
    console.log('🎮 Creating sample game session...');
    
    // Check if session already exists for this campaign and character
    const { data: existingSession } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('campaign_id', campaignData.id)
      .eq('character_id', characterData.id)
      .single();

    let sessionData;
    
    if (existingSession) {
      console.log(`📝 Game session already exists: Session #${existingSession.session_number}`);
      sessionData = existingSession;
    } else {
      // Create new session
      const { data: newSession, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          campaign_id: campaignData.id,
          character_id: characterData.id,
          session_number: 1,
          status: 'active'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      sessionData = newSession;
      console.log(`✅ Sample game session created: Session #${sessionData.session_number}`);
    }

    // 5. Create sample dialogue history (if none exists)
    console.log('💬 Creating sample dialogue...');
    
    // Check if dialogue already exists for this session
    const { data: existingDialogue } = await supabase
      .from('dialogue_history')
      .select('id')
      .eq('session_id', sessionData.id)
      .limit(1);
    
    if (existingDialogue && existingDialogue.length > 0) {
      console.log('📝 Sample dialogue already exists');
    } else {
      const sampleDialogue = [
        {
          session_id: sessionData.id,
          speaker_type: 'assistant',
          speaker_id: null,
          message: 'Welcome to the Lost Temple of Mysteries! You stand before ancient stone doors covered in mystical runes. The air is thick with magical energy. What would you like to do?',
          context: { scene: 'temple_entrance', mood: 'mysterious' }
        },
        {
          session_id: sessionData.id,
          speaker_type: 'user',
          speaker_id: characterData.id,
          message: 'I examine the runes on the door to see if I can understand their meaning.',
          context: { action: 'examine', target: 'runes' }
        },
        {
          session_id: sessionData.id,
          speaker_type: 'assistant',
          speaker_id: null,
          message: 'Your knowledge of ancient languages serves you well! The runes speak of a trial of wisdom. You notice three glowing symbols that seem to respond to your presence. Which symbol do you choose to touch first?',
          context: { scene: 'temple_entrance', choices: ['wisdom', 'courage', 'magic'] }
        }
      ];

      for (const dialogue of sampleDialogue) {
        const { error: dialogueError } = await supabase
          .from('dialogue_history')
          .insert(dialogue);
        
        if (dialogueError) throw dialogueError;
      }

      console.log(`✅ Sample dialogue created (${sampleDialogue.length} messages)`);
    }

    console.log('\n🎉 Test data seeding complete!');
    console.log('📝 Test Account Details:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   Campaign: ${campaignData.name}`);
    console.log(`   Character: ${characterData.name}`);
    console.log('\n🚀 You can now use the "Quick Login" button in development mode!');
    
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  }
}

// Run the seeding
seedTestData();