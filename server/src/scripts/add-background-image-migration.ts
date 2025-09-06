import 'dotenv/config';
import { createClient } from '../lib/db';

async function addBackgroundImageColumn() {
  console.log('🚀 Adding background_image column to campaigns table...');
  
  const db = createClient();
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    // Check if column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'campaigns' 
      AND column_name = 'background_image';
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Column background_image already exists in campaigns table');
      await client.query('ROLLBACK');
      return;
    }

    // Add the background_image column
    await client.query(`
      ALTER TABLE campaigns 
      ADD COLUMN background_image TEXT;
    `);

    // Add comment for documentation
    await client.query(`
      COMMENT ON COLUMN campaigns.background_image IS 'URL of AI-generated background image for campaign cards';
    `);

    await client.query('COMMIT');
    console.log('✅ Successfully added background_image column to campaigns table');
    console.log('🎉 Campaign cards can now store AI-generated background images!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding background_image column:', error);
    throw error;
  } finally {
    client.release();
    await db.end();
  }
}

// Run the migration
addBackgroundImageColumn()
  .then(() => {
    console.log('🎯 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });