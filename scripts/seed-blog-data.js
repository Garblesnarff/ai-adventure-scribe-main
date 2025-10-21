#!/usr/bin/env node

/**
 * Seed Blog Data Script
 * Creates sample blog authors, categories, tags, and posts for development
 * Run with: node scripts/seed-blog-data.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testUserId = '47599370-2b95-4d7d-9061-3bec0369d199'; // From previous seeding

if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL is required');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedBlogData() {
  console.log('📝 Starting blog data seeding...');

  try {
    // 1. Create blog author profile for test user
    console.log('👤 Creating blog author profile...');

    const { data: existingAuthor } = await supabase
      .from('blog_authors')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    let authorData;

    if (existingAuthor) {
      console.log(`📝 Blog author already exists: ${existingAuthor.display_name}`);
      authorData = existingAuthor;
    } else {
      const { data: newAuthor, error: authorError } = await supabase
        .from('blog_authors')
        .insert({
          user_id: testUserId,
          display_name: 'Game Master Alex',
          slug: 'game-master-alex',
          short_bio: 'Lead developer and dungeon master for Infinite Realms',
          bio: 'Alex has been creating fantasy worlds and telling stories for over a decade. As the lead developer of Infinite Realms, they combine their passion for tabletop RPGs with cutting-edge AI technology to create immersive adventures.',
          avatar_url: 'https://infinite-realms.ai/branding/avatar-placeholder.png',
          website_url: 'https://infinite-realms.ai',
          twitter_handle: 'InfiniteRealmsAI',
          linkedin_url: 'https://linkedin.com/company/infinite-realms'
        })
        .select()
        .single();

      if (authorError) throw authorError;
      authorData = newAuthor;
      console.log(`✅ Blog author created: ${authorData.display_name}`);
    }

    // 2. Create sample categories
    console.log('🏷️ Creating sample categories...');

    const categories = [
      {
        name: 'Game Updates',
        slug: 'game-updates',
        description: 'Latest updates, patches, and new features for Infinite Realms'
      },
      {
        name: 'Developer Blog',
        slug: 'developer-blog',
        description: 'Behind-the-scenes insights into game development and AI technology'
      },
      {
        name: 'Player Guides',
        slug: 'player-guides',
        description: 'Tips, tricks, and guides to help you master Infinite Realms'
      },
      {
        name: 'World Building',
        slug: 'world-building',
        description: 'Deep dives into the lore and world-building of Infinite Realms'
      }
    ];

    const createdCategories = [];

    for (const category of categories) {
      const { data: existingCategory } = await supabase
        .from('blog_categories')
        .select('*')
        .eq('slug', category.slug)
        .single();

      if (existingCategory) {
        console.log(`📝 Category already exists: ${existingCategory.name}`);
        createdCategories.push(existingCategory);
      } else {
        const { data: newCategory, error: categoryError } = await supabase
          .from('blog_categories')
          .insert(category)
          .select()
          .single();

        if (categoryError) throw categoryError;
        createdCategories.push(newCategory);
        console.log(`✅ Category created: ${newCategory.name}`);
      }
    }

    // 3. Create sample tags
    console.log('🔖 Creating sample tags...');

    const tags = [
      { name: 'AI', slug: 'ai', description: 'Posts about artificial intelligence and machine learning' },
      { name: 'RPG', slug: 'rpg', description: 'Role-playing game content and discussions' },
      { name: 'Fantasy', slug: 'fantasy', description: 'Fantasy-themed content and world-building' },
      { name: 'Technology', slug: 'technology', description: 'Technical posts about game development' },
      { name: 'Tutorial', slug: 'tutorial', description: 'Step-by-step guides and tutorials' },
      { name: 'News', slug: 'news', description: 'Latest news and announcements' },
      { name: 'Tips', slug: 'tips', description: 'Helpful tips and tricks' },
      { name: 'Adventure', slug: 'adventure', description: 'Adventure and campaign content' }
    ];

    const createdTags = [];

    for (const tag of tags) {
      const { data: existingTag } = await supabase
        .from('blog_tags')
        .select('*')
        .eq('slug', tag.slug)
        .single();

      if (existingTag) {
        console.log(`📝 Tag already exists: ${existingTag.name}`);
        createdTags.push(existingTag);
      } else {
        const { data: newTag, error: tagError } = await supabase
          .from('blog_tags')
          .insert(tag)
          .select()
          .single();

        if (tagError) throw tagError;
        createdTags.push(newTag);
        console.log(`✅ Tag created: ${newTag.name}`);
      }
    }

    // 4. Create sample blog posts
    console.log('📝 Creating sample blog posts...');

    const posts = [
      {
        title: 'Welcome to Infinite Realms: Your AI-Powered Fantasy Adventure Begins',
        slug: 'welcome-to-infinite-realms',
        summary: 'Discover the magic of AI-powered storytelling in this immersive fantasy RPG experience.',
        content: `# Welcome to Infinite Realms

Embark on an epic journey through the **Infinite Realms**, where artificial intelligence meets classic fantasy role-playing. Our revolutionary platform combines cutting-edge AI technology with timeless storytelling to create truly unique adventures.

## What Makes Us Different

Unlike traditional RPG platforms, Infinite Realms uses advanced AI agents to:

- **Create dynamic worlds** that evolve based on your choices
- **Generate unique characters** with rich backstories and motivations
- **Adapt narratives** in real-time to your playstyle
- **Remember your journey** across multiple sessions

## Your Adventure Awaits

Whether you're a seasoned dungeon master or a curious newcomer, Infinite Realms offers something magical for everyone. Create your character, choose your campaign, and let the AI weave a tale that's uniquely yours.

> "The only limit is your imagination" - Ancient Elven Proverb

## Getting Started

Ready to begin your adventure? Here's how:

1. **Create your character** - Choose from classic fantasy races and classes
2. **Select a campaign** - From dungeon crawls to epic quests
3. **Dive into the story** - Let our AI dungeon master guide you

The realms are waiting. What legend will you write?

---

*Happy adventuring!*  
*The Infinite Realms Team*`,
        featured_image_url: '/blog-assets/images/posts/2025/10-october/welcome-to-infinite-realms/hero_header.png',
        hero_image_alt: 'Welcome to Infinite Realms - AI-powered fantasy RPG',
        seo_title: 'Welcome to Infinite Realms: AI-Powered Fantasy RPG Adventures',
        seo_description: 'Discover the next evolution in tabletop RPG gaming with AI-powered storytelling, dynamic worlds, and endless adventure possibilities.',
        status: 'published',
        published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        category_ids: [createdCategories.find(c => c.slug === 'game-updates')?.id],
        tag_ids: [
          createdTags.find(t => t.slug === 'ai')?.id,
          createdTags.find(t => t.slug === 'rpg')?.id,
          createdTags.find(t => t.slug === 'fantasy')?.id,
          createdTags.find(t => t.slug === 'adventure')?.id
        ].filter(Boolean)
      },
      {
        title: 'Building Better AI Characters: Behind the Scenes',
        slug: 'building-better-ai-characters',
        summary: 'A deep dive into how we create realistic, memorable NPCs using advanced AI techniques.',
        content: `# Building Better AI Characters

At Infinite Realms, we believe that great stories are built on great characters. That's why we've invested heavily in creating AI systems that can generate NPCs with depth, personality, and realistic motivations.

## The Challenge

Creating compelling characters programmatically is no small feat. Traditional approaches often result in:

- **Stereotypical personalities** that feel flat and predictable
- **Inconsistent behavior** that breaks immersion
- **Shallow backstories** that don't hold up to player scrutiny

## Our Solution

We've developed a multi-layered approach that combines several AI techniques:

### 1. Personality Frameworks
Each NPC starts with a rich personality profile that includes:
- Core values and beliefs
- Behavioral tendencies
- Emotional triggers
- Long-term goals and motivations

### 2. Memory Systems
Our AI maintains detailed memories of:
- Past interactions with the player
- Relationships with other NPCs
- Significant events in their backstory
- Personal growth and character development

### 3. Contextual Awareness
Characters adapt their behavior based on:
- Current situation and environment
- Player's reputation and past actions
- Cultural and societal norms
- Personal stakes in the current scenario

## Real-World Results

The difference is night and day. Players tell us stories about NPCs that:

- Remember slights from months ago in the campaign
- Form genuine friendships (or rivalries) with player characters
- Make tough moral choices that feel authentic
- Surprise players with unexpected depth

## What's Next

We're constantly improving our character AI with:
- More sophisticated emotional modeling
- Better integration of player backstories
- Enhanced group dynamics for NPC parties
- Deeper cultural and societal simulation

The future of AI storytelling is character-driven, and we're excited to be leading the way.

---

*What kind of characters would you like to see in your adventures? Let us know in the comments!*`,
        featured_image_url: '/blog-assets/images/posts/2025/10-october/building-better-ai-characters/character-creation.png',
        hero_image_alt: 'AI character creation in Infinite Realms',
        seo_title: 'Building Better AI Characters: Behind the Scenes at Infinite Realms',
        seo_description: 'Learn how we use advanced AI to create NPCs with realistic personalities, memories, and motivations that make every adventure unique.',
        status: 'published',
        published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        category_ids: [createdCategories.find(c => c.slug === 'developer-blog')?.id],
        tag_ids: [
          createdTags.find(t => t.slug === 'ai')?.id,
          createdTags.find(t => t.slug === 'technology')?.id,
          createdTags.find(t => t.slug === 'fantasy')?.id
        ].filter(Boolean)
      },
      {
        title: 'Top 10 Tips for New Infinite Realms Players',
        slug: 'top-10-tips-for-new-players',
        summary: 'Just starting your journey in Infinite Realms? These essential tips will help you make the most of your adventure.',
        content: `# Top 10 Tips for New Infinite Realms Players

Welcome to the Infinite Realms! As you embark on your first adventure, here are ten essential tips to help you get the most out of your AI-powered RPG experience.

## 1. Take Your Time with Character Creation

Your character is your avatar in the Infinite Realms. Spend time crafting a detailed backstory - our AI dungeon master will use this information to create personalized adventures and remember your character's history throughout the campaign.

## 2. Don't Be Afraid to Experiment

The beauty of Infinite Realms is that every choice matters, but nothing is permanent. Feel free to try different approaches, from diplomatic solutions to all-out combat. The AI adapts to your playstyle!

## 3. Pay Attention to NPC Relationships

NPCs in Infinite Realms have memories and motivations. Building (or burning) bridges with characters can have long-term consequences that echo throughout your adventure.

## 4. Use the Journal Feature

The in-game journal isn't just for show - it's a powerful tool for tracking clues, remembering important details, and piecing together complex mysteries.

## 5. Think Creatively About Magic

Magic in Infinite Realms isn't just about fireballs and healing spells. Our AI considers the creative use of magic, so don't be afraid to try unconventional spell combinations.

## 6. Explore Every Corner

The worlds of Infinite Realms are richly detailed. Take time to explore - you never know what secrets, treasures, or adventures you might discover off the beaten path.

## 7. Roleplay with Your Character

The AI responds to how you roleplay. Speaking in character, using your character's personality traits, and making choices consistent with their backstory leads to richer, more personalized stories.

## 8. Don't Rush Combat

Combat in Infinite Realms is tactical and strategic. Take time to assess situations, use the environment to your advantage, and coordinate with NPCs when possible.

## 9. Save Important Moments

Use bookmarks to save particularly memorable moments, interesting NPCs, or important clues. You can reference these later or share them with friends.

## 10. Have Fun and Be Patient

Infinite Realms is an evolving experience. If something doesn't go perfectly on your first try, remember that the AI learns from every interaction and gets better over time.

## Bonus Tip: Join the Community

The Infinite Realms community is full of creative players sharing stories, tips, and custom campaigns. Don't be shy about joining discussions and sharing your own adventures!

---

*What tips would you add for new players? Share your wisdom in the comments below!*`,
        featured_image_url: '/blog-assets/images/posts/2025/10-october/top-10-tips-for-new-players/adventure-tips.png',
        hero_image_alt: 'Tips for new Infinite Realms players',
        seo_title: 'Top 10 Tips for New Infinite Realms Players | Beginner Guide',
        seo_description: 'Essential tips and tricks for new players starting their adventure in Infinite Realms. Learn how to create better characters, make strategic choices, and get the most out of AI-powered RPG gameplay.',
        status: 'published',
        published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        category_ids: [createdCategories.find(c => c.slug === 'player-guides')?.id],
        tag_ids: [
          createdTags.find(t => t.slug === 'tutorial')?.id,
          createdTags.find(t => t.slug === 'tips')?.id,
          createdTags.find(t => t.slug === 'rpg')?.id
        ].filter(Boolean)
      },
      {
        title: 'The Art of World-Building: Creating Immersive Fantasy Realms',
        slug: 'art-of-world-building',
        summary: 'Explore the principles and techniques behind crafting believable, immersive fantasy worlds that players will never want to leave.',
        content: `# The Art of World-Building

Great fantasy worlds don't happen by accident. They require careful planning, creative vision, and attention to detail. At Infinite Realms, we've learned a lot about what makes a virtual world feel alive and compelling.

## Start with the Big Picture

Every great world needs a foundation:

### History and Lore
- **Deep timeline**: Don't just create the "current" world - know its history
- **Cultural evolution**: How have societies changed over centuries?
- **Legendary events**: Myths and legends that shape modern beliefs

### Geography and Environment
- **Diverse biomes**: From frozen tundras to lush jungles
- **Magical anomalies**: Areas where magic behaves differently
- **Natural wonders**: Unique geographical features that inspire awe

## People Make the World

Worlds feel real because of the people who inhabit them:

### Cultures and Societies
- **Unique customs**: Traditions that define different groups
- **Social structures**: How power and influence are distributed
- **Daily life**: What does an average day look like for different people?

### Conflicts and Tensions
- **Political intrigue**: Power struggles between factions
- **Cultural clashes**: When different societies interact
- **Personal stakes**: Individual motivations that drive the story

## Magic and Mystery

In fantasy worlds, magic should feel both wondrous and dangerous:

### Consistent Rules
- **Limitations**: Magic can't solve every problem
- **Costs**: Using magic should have consequences
- **Cultural impact**: How does magic affect society?

### Wonders and Horrors
- **Magical creatures**: From helpful allies to terrifying monsters
- **Ancient artifacts**: Items with rich histories and unique powers
- **Mysterious phenomena**: Unexplained magical events

## Making It Interactive

The best world-building serves the story and gameplay:

### Player Agency
- **Meaningful choices**: Decisions that affect the world
- **Consequential actions**: Changes that persist and matter
- **Personal stakes**: Reasons for players to care about the world

### Adaptability
- **Responsive NPCs**: Characters who react to world events
- **Dynamic environments**: Locations that change based on player actions
- **Evolving stories**: Narratives that grow with the world

## Lessons Learned

After countless campaigns, we've discovered that the most engaging worlds share these traits:

1. **Internal consistency** - Rules and logic that players can understand and use
2. **Emotional resonance** - Elements that players connect with personally
3. **Room for discovery** - Secrets and surprises waiting to be found
4. **Player investment** - Opportunities for players to shape the world

## Your World Awaits

The principles above are guidelines, not rigid rules. Every world is unique, and the most important thing is creating something that excites your imagination and invites players to explore.

What makes a fantasy world compelling to you? Share your thoughts in the comments!

---

*Happy world-building!*  
*The Infinite Realms Team*`,
        featured_image_url: '/blog-assets/images/posts/2025/10-october/art-of-world-building/world-building.png',
        hero_image_alt: 'Fantasy world-building in Infinite Realms',
        seo_title: 'The Art of World-Building: Creating Immersive Fantasy Realms',
        seo_description: 'Learn the principles and techniques behind crafting believable fantasy worlds. From geography and cultures to magic systems and player agency, discover what makes virtual worlds come alive.',
        status: 'published',
        published_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        category_ids: [createdCategories.find(c => c.slug === 'world-building')?.id],
        tag_ids: [
          createdTags.find(t => t.slug === 'fantasy')?.id,
          createdTags.find(t => t.slug === 'world-building')?.id,
          createdTags.find(t => t.slug === 'tutorial')?.id
        ].filter(Boolean)
      }
    ];

    for (const postData of posts) {
      // Check if post already exists
      const { data: existingPost } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', postData.slug)
        .single();

      if (existingPost) {
        console.log(`📝 Blog post already exists: ${existingPost.title}`);
        continue;
      }

      // Create the post
      const { data: newPost, error: postError } = await supabase
        .from('blog_posts')
        .insert({
          author_id: authorData.id,
          title: postData.title,
          slug: postData.slug,
          summary: postData.summary,
          content: postData.content,
          featured_image_url: postData.featured_image_url,
          hero_image_alt: postData.hero_image_alt,
          seo_title: postData.seo_title,
          seo_description: postData.seo_description,
          status: postData.status,
          published_at: postData.published_at
        })
        .select()
        .single();

      if (postError) throw postError;

      // Add categories
      if (postData.category_ids && postData.category_ids.length > 0) {
        const categoryRelations = postData.category_ids.map(categoryId => ({
          post_id: newPost.id,
          category_id: categoryId
        }));

        const { error: categoryError } = await supabase
          .from('blog_post_categories')
          .insert(categoryRelations);

        if (categoryError) throw categoryError;
      }

      // Add tags
      if (postData.tag_ids && postData.tag_ids.length > 0) {
        const tagRelations = postData.tag_ids.map(tagId => ({
          post_id: newPost.id,
          tag_id: tagId
        }));

        const { error: tagError } = await supabase
          .from('blog_post_tags')
          .insert(tagRelations);

        if (tagError) throw tagError;
      }

      console.log(`✅ Blog post created: ${newPost.title}`);
    }

    console.log('\n🎉 Blog data seeding complete!');
    console.log(`📊 Created/Found:`);
    console.log(`   Author: ${authorData.display_name}`);
    console.log(`   Categories: ${createdCategories.length}`);
    console.log(`   Tags: ${createdTags.length}`);
    console.log(`   Posts: ${posts.length}`);

  } catch (error) {
    console.error('❌ Error seeding blog data:', error);
    process.exit(1);
  }
}

// Run the seeding
seedBlogData();
