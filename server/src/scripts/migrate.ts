import 'dotenv/config';
import { createClient } from '../lib/db.js';

async function run() {
  const db = createClient();
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        plan TEXT DEFAULT 'free',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        genre TEXT,
        difficulty_level TEXT,
        campaign_length TEXT,
        tone TEXT,
        era TEXT,
        location TEXT,
        atmosphere TEXT,
        setting_details JSONB,
        thematic_elements JSONB,
        status TEXT,
        background_image TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add background_image column to existing campaigns table if it doesn't exist
    await client.query(`
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS background_image TEXT;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        race TEXT NOT NULL,
        class TEXT NOT NULL,
        level INT DEFAULT 1,
        alignment TEXT,
        experience_points INT,
        image_url TEXT,
        appearance TEXT,
        personality_traits TEXT,
        backstory_elements TEXT,
        background TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add new character fields if they don't exist (for existing databases)
    await client.query(`
      ALTER TABLE characters ADD COLUMN IF NOT EXISTS image_url TEXT;
    `);
    await client.query(`
      ALTER TABLE characters ADD COLUMN IF NOT EXISTS appearance TEXT;
    `);
    await client.query(`
      ALTER TABLE characters ADD COLUMN IF NOT EXISTS personality_traits TEXT;
    `);
    await client.query(`
      ALTER TABLE characters ADD COLUMN IF NOT EXISTS backstory_elements TEXT;
    `);
    await client.query(`
      ALTER TABLE characters ADD COLUMN IF NOT EXISTS background TEXT;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
        character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
        session_number INT,
        status TEXT,
        start_time TIMESTAMPTZ DEFAULT NOW(),
        end_time TIMESTAMPTZ,
        summary TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // D&D reference tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS dnd_races (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS dnd_classes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        hit_die INT,
        primary_ability TEXT,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS dnd_spells (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        level INT NOT NULL,
        school TEXT,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS memories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        category TEXT,
        subcategory TEXT,
        content TEXT NOT NULL,
        importance INT,
        embedding TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS dialogue_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
        speaker_type TEXT,
        speaker_id UUID,
        message TEXT NOT NULL,
        context JSONB,
        images JSONB,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Ensure images column exists for existing databases
    await client.query(`
      ALTER TABLE dialogue_history ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
    `);

    await client.query('COMMIT');
    console.log('Migration completed.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.end();
  }
}

run();

