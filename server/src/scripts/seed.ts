import 'dotenv/config';
import { createClient } from '../lib/db.js';

const races = [
  { name: 'Human', description: 'Versatile and ambitious.' },
  { name: 'Elf', description: 'Graceful with keen senses.' },
  { name: 'Dwarf', description: 'Stout and hardy.' },
  { name: 'Halfling', description: 'Small and nimble.' },
];

const classes = [
  { name: 'Fighter', hit_die: 10, primary_ability: 'strength', description: 'Martial expert.' },
  { name: 'Wizard', hit_die: 6, primary_ability: 'intelligence', description: 'Arcane spellcaster.' },
  { name: 'Rogue', hit_die: 8, primary_ability: 'dexterity', description: 'Stealthy and cunning.' },
  { name: 'Cleric', hit_die: 8, primary_ability: 'wisdom', description: 'Divine magic user.' },
];

const spells = [
  { name: 'Magic Missile', level: 1, school: 'Evocation', description: 'Automatically hits for force damage.' },
  { name: 'Cure Wounds', level: 1, school: 'Evocation', description: 'Restores hit points.' },
  { name: 'Fireball', level: 3, school: 'Evocation', description: 'A bright streak that explodes.' },
];

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Aborting seed.');
    process.exit(1);
  }

  const db = createClient();
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    for (const r of races) {
      await client.query(
        `INSERT INTO dnd_races (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
        [r.name, r.description]
      );
    }
    for (const c of classes) {
      await client.query(
        `INSERT INTO dnd_classes (name, hit_die, primary_ability, description) VALUES ($1,$2,$3,$4) ON CONFLICT (name) DO NOTHING`,
        [c.name, c.hit_die, c.primary_ability, c.description]
      );
    }
    for (const s of spells) {
      await client.query(
        `INSERT INTO dnd_spells (name, level, school, description) VALUES ($1,$2,$3,$4) ON CONFLICT (name) DO NOTHING`,
        [s.name, s.level, s.school, s.description]
      );
    }

    await client.query('COMMIT');
    console.log('Seed complete.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Seed failed', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.end();
  }
}

run();
