import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// Load environment variables from root .env files if present
dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config({ path: path.join(repoRoot, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const bucketName = 'public-campaigns';

const storagePath = (...segments) => segments.filter(Boolean).join('/');

const templates = [
  {
    id: '18d2f5cb-d636-4080-bcd3-c5dfe4543b36',
    slug: 'aethelgard-the-once-and-future-king',
    recommendedLevels: { start: 5, end: 16 },
    synopsis:
      'Reimagine Arthurian legend among the stars as rebel mech pilots hunt for the lost heir who can unite the fractured Aethelgard system.',
    tagline: 'Mythic destiny meets orbital mech warfare.',
    toneDescriptors: ['mythic', 'high-tech', 'rebellious'],
    cover: {
      file: path.join(
        repoRoot,
        '..',
        'infinite-realms',
        'campaign-ideas',
        'aethelgard-the-once-and-future-king',
        'gallery',
        'scenes',
        'the_siege_of_camelot.png'
      ),
      alt: 'Rebel Armigers assault the space fortress Camelot amidst blazing anti-orbital fire.',
    },
    gallery: [
      {
        file: path.join(
          repoRoot,
          '..',
          'infinite-realms',
          'campaign-ideas',
          'aethelgard-the-once-and-future-king',
          'gallery',
          'scenes',
          'arthur_pulling_excalibur.png'
        ),
        alt: 'Arthur draws the command sword Excalibur from the Avalon control core.',
      },
      {
        file: path.join(
          repoRoot,
          '..',
          'infinite-realms',
          'campaign-ideas',
          'aethelgard-the-once-and-future-king',
          'gallery',
          'scenes',
          'dogfight_lyonesse_belt.png'
        ),
        alt: 'Armiger squadrons duel among the shattered asteroids of the Lyonesse Belt.',
      },
      {
        file: path.join(
          repoRoot,
          '..',
          'infinite-realms',
          'campaign-ideas',
          'aethelgard-the-once-and-future-king',
          'gallery',
          'scenes',
          'the_lady_of_the_lakes_revelation.png'
        ),
        alt: 'The techno-mystic Lady of the Lake reveals encrypted schematics within a forest moon data shrine.',
      },
    ],
  },
  {
    id: 'a1872154-d2d5-4771-a6f6-ad7b5a661a58',
    slug: 'the-anomalous-continent-of-xylos',
    recommendedLevels: { start: 3, end: 10 },
    synopsis:
      'Lead the first expedition onto Xylos, a continent where physics falters and ancient anomalies rewrite the rules of reality.',
    tagline: 'Chart the impossible and survive the continent that thinks back.',
    toneDescriptors: ['curious', 'bizarre', 'perilous'],
    cover: {
      file: path.join(
        repoRoot,
        '..',
        'infinite-realms',
        'campaign-ideas',
        'the-anomalous-continent-of-xylos',
        'gallery',
        'scenes',
        'landfall_on_xylos.png'
      ),
      alt: 'Explorers make landfall on Xylos where inverted cliffs loom over a chromatic shoreline.',
    },
    gallery: [
      {
        file: path.join(
          repoRoot,
          '..',
          'infinite-realms',
          'campaign-ideas',
          'the-anomalous-continent-of-xylos',
          'gallery',
          'scenes',
          'navigating_the_gravity_hills.png'
        ),
        alt: 'Reality-weary explorers ascend the Gravity Hills where direction shifts every few steps.',
      },
      {
        file: path.join(
          repoRoot,
          '..',
          'infinite-realms',
          'campaign-ideas',
          'the-anomalous-continent-of-xylos',
          'gallery',
          'scenes',
          'confronting_the_xylosian_echo.png'
        ),
        alt: 'Anomalous avatars of the Xylosian Echo surround the party in cascading fractal light.',
      },
      {
        file: path.join(
          repoRoot,
          '..',
          'infinite-realms',
          'campaign-ideas',
          'the-anomalous-continent-of-xylos',
          'gallery',
          'scenes',
          'first_encounter_with_anomaly.png'
        ),
        alt: 'Surveyors document a crystalline organism that speaks in overlapping colors and sound.',
      },
    ],
  },
];

const readCampaignMetadata = async (templateId) => {
  const { data, error } = await supabase
    .from('campaigns')
    .select(
      'id, name, description, genre, tone, difficulty_level, campaign_length, template_version, published_at, slug'
    )
    .eq('id', templateId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Campaign ${templateId} not found.`);
  }

  return data;
};

const uploadFileToStorage = async (storageKey, fileInput, contentType) => {
  const fileBuffer =
    typeof fileInput === 'string' ? await fs.readFile(fileInput) : Buffer.isBuffer(fileInput) ? fileInput : null;

  if (!fileBuffer) {
    throw new Error(`Unsupported file input for ${storageKey}`);
  }
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(storageKey, fileBuffer, { contentType, upsert: true });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(storageKey);
  return data.publicUrl;
};

const buildAethelgardManifest = (campaign, assetUrls) => ({
  schemaVersion: '2025-10-23',
  template: {
    id: campaign.id,
    slug: campaign.slug,
    version: campaign.template_version,
    publishedAt: campaign.published_at,
    visibility: 'public',
  },
  overview: {
    name: campaign.name,
    tagline: 'Mythic destiny meets orbital mech warfare.',
    synopsis:
      'Uther is dead, Mordred rules through steel, and only a hidden heir can unite the system. Guide brave Armiger pilots across the Aethelgard System to unearth Arthur, reclaim Excalibur, and storm the fortress world of Camelot.',
    genre: ['science-fantasy', 'mecha', 'space opera'],
    tone: ['mythic', 'high-tech', 'rebellious'],
    difficulty: campaign.difficulty_level,
    estimatedLength: '15+ sessions',
    recommendedLevels: { start: 5, end: 16 },
  },
  acts: [
    {
      name: 'Act I — The Spark of Rebellion',
      summary:
        'Survive the coup, rendezvous with MERLIN, and escape Camelot Prime while Mordred brands the party as traitors.',
    },
    {
      name: 'Act II — The Quest for the King',
      summary:
        'Cross the Lyonesse Belt, bargain with rebels, and win the trust of a reluctant Arthur hiding in the fringe worlds.',
    },
    {
      name: 'Act III — The Siege of Camelot',
      summary:
        'Unleash a rebel armada, duel Mordred’s elite, and help Arthur draw Excalibur from the Avalon Station to unify the system.',
    },
  ],
  keyNPCs: [
    {
      name: 'MERLIN',
      role: 'AI tactician and quest giver',
      motivation: 'Secure the system against looming extra-galactic threats by restoring Arthur.',
    },
    {
      name: 'Arthur',
      role: 'The hidden heir apparent',
      motivation: 'Wrestle with destiny while proving worthy of the legend thrust upon him.',
    },
    {
      name: 'Lord Mordred',
      role: 'Usurper and military dictator',
      motivation: 'Impose authoritarian stability before alien forces strike.',
    },
  ],
  locations: [
    { name: 'Camelot Prime', description: 'Fortress world capital wrapped in layered defense grids.' },
    { name: 'Lyonesse Belt', description: 'Asteroid fields riddled with rebel bases and lost tech caches.' },
    { name: 'Brocéliande', description: 'Bio-luminescent moon ruled by the techno-mystic Lady of the Lake.' },
    { name: 'Avalon Station', description: 'Ancient superweapon that houses the Excalibur command sword.' },
  ],
  factions: [
    { name: 'Round Table Rebellion', goal: 'Unite loyalist knights and overthrow Mordred.' },
    { name: 'Mordred’s Dominion', goal: 'Lock the system into martial law to avert external threats.' },
  ],
  mechanics: [
    'Armiger combat frames with strain management and modular upgrades.',
    'Round Table Council downtime actions that grant mission advantages.',
  ],
  hooks: [
    'A rebel courier smuggles the party out of Camelot with MERLIN’s final failsafe data shard.',
    'A disgraced knight begs the party to locate Arthur before Mordred’s assassins do.',
    'An alien signal spike convinces the party that MERLIN’s prophecies are true.',
  ],
  assets: {
    cover: assetUrls.cover,
    gallery: assetUrls.gallery,
  },
  provenance: {
    generator: 'Infinite Realms Campaign Forge',
    source: 'infinite-realms/campaign-ideas/aethelgard-the-once-and-future-king',
    exportedAt: new Date().toISOString(),
  },
});

const buildXylosManifest = (campaign, assetUrls) => ({
  schemaVersion: '2025-10-23',
  template: {
    id: campaign.id,
    slug: campaign.slug,
    version: campaign.template_version,
    publishedAt: campaign.published_at,
    visibility: 'public',
  },
  overview: {
    name: campaign.name,
    tagline: 'Chart the impossible and survive the continent that thinks back.',
    synopsis:
      'Xylos reopens after centuries of isolation, but gravity, time, and biology rebel against reason. Lead an expedition to map reality-warped biomes, decode the Xylosian Echo, and decide whether to stabilize or escape the living anomaly.',
    genre: ['weird fantasy', 'exploration', 'mystery'],
    tone: ['curious', 'bizarre', 'perilous'],
    difficulty: campaign.difficulty_level,
    estimatedLength: '10-12 sessions',
    recommendedLevels: { start: 3, end: 10 },
  },
  acts: [
    {
      name: 'Act I — Landfall on the Impossible',
      summary:
        'Establish base camp, survive singing flora, and catalogue the first anomalies before the expedition fractures.',
    },
    {
      name: 'Act II — Unraveling the Logic',
      summary:
        'Explore echoing ruins, decipher impossible artifacts, and learn that Xylos itself may be sentient.',
    },
    {
      name: 'Act III — The Heart of Anomaly',
      summary:
        'Enter the Nexus of Reality, confront the Xylosian Echo, and determine the fate of the continent and the team.',
    },
  ],
  keyNPCs: [
    {
      name: 'Professor Aris Thorne',
      role: 'Obsessive xenobotanist guide',
      motivation: 'Document every anomaly even as his perceptions warp.',
    },
    {
      name: 'Captain Valerius',
      role: 'Security chief and skeptic',
      motivation: 'Keep the expedition alive after losing a prior crew to Xylos.',
    },
    {
      name: 'The Xylosian Echo',
      role: 'Sentient anomaly antagonist',
      motivation: 'Preserve Xylos’s fluid reality by assimilating intruders.',
    },
  ],
  locations: [
    { name: 'The Shifting Coastline', description: 'A shoreline that breathes, setting the tone for Xylos physics.' },
    { name: 'Chromatic Jungles', description: 'Forests of singing flora that communicate through light and sound.' },
    { name: 'Gravity Hills', description: 'Terraces where directional pull rotates unpredictably.' },
    { name: 'The Nexus of Reality', description: 'Convergent anomaly hub where decisions reshape the continent.' },
  ],
  mechanics: [
    'Reality Flux tracker escalates anomaly events as exploration deepens.',
    'Anomaly Points tempt characters with power at the cost of mutations or altered perception.',
  ],
  hooks: [
    'A royal charter offers the party exclusive rights to Xylos discoveries—if they return alive.',
    'A rival syndicate sabotages the expedition, forcing cooperation or confrontation.',
    'Signals from a failed expedition beacon hint that survivors merged with the anomaly.',
  ],
  assets: {
    cover: assetUrls.cover,
    gallery: assetUrls.gallery,
  },
  provenance: {
    generator: 'Infinite Realms Campaign Forge',
    source: 'infinite-realms/campaign-ideas/the-anomalous-continent-of-xylos',
    exportedAt: new Date().toISOString(),
  },
});

const buildManifest = (template, campaign, assetUrls) => {
  if (template.slug === 'aethelgard-the-once-and-future-king') {
    return buildAethelgardManifest(campaign, assetUrls);
  }
  return buildXylosManifest(campaign, assetUrls);
};

const ensureDirectoryAssetsExist = async (files) => {
  for (const file of files) {
    try {
      await fs.access(file);
    } catch (error) {
      throw new Error(`Asset not found on disk: ${file}`);
    }
  }
};

const main = async () => {
  for (const template of templates) {
    console.log(`\nProcessing template: ${template.slug}`);

    const campaign = await readCampaignMetadata(template.id);
    const assetFiles = [template.cover.file, ...template.gallery.map((g) => g.file)];
    await ensureDirectoryAssetsExist(assetFiles);

    const basePath = storagePath('templates', template.slug);

    console.log('Uploading cover image...');
    const coverStorageKey = storagePath(basePath, 'cover.png');
    const coverUrl = await uploadFileToStorage(coverStorageKey, template.cover.file, 'image/png');

    console.log('Uploading gallery images...');
    const galleryUrls = [];
    for (const galleryItem of template.gallery) {
      const filename = path.basename(galleryItem.file);
      const galleryStorageKey = storagePath(basePath, 'gallery', filename);
      const url = await uploadFileToStorage(galleryStorageKey, galleryItem.file, 'image/png');
      galleryUrls.push({ url, alt: galleryItem.alt, type: 'image/png' });
    }

    const manifest = buildManifest(template, campaign, {
      cover: { url: coverUrl, alt: template.cover.alt, type: 'image/png' },
      gallery: galleryUrls,
    });

    const manifestString = JSON.stringify(manifest, null, 2);
    const manifestStorageKey = storagePath(basePath, 'manifest.json');

    console.log('Uploading manifest...');
    await uploadFileToStorage(manifestStorageKey, Buffer.from(manifestString, 'utf8'), 'application/json');

    const { data: manifestUrlData } = supabase.storage.from(bucketName).getPublicUrl(manifestStorageKey);
    const contentHash = crypto.createHash('sha256').update(manifestString).digest('hex');

    console.log('Updating campaign record...');
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        thumbnail_url: coverUrl,
        manifest_url: manifestUrlData.publicUrl,
        content_hash: contentHash,
      })
      .eq('id', template.id);

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Completed template:', template.slug);
  }

  console.log('\nAll templates processed successfully.');
};

main().catch((error) => {
  console.error('Failed to upload assets:', error);
  process.exit(1);
});
