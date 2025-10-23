import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(repoRoot, '.env') });
dotenv.config({ path: path.join(repoRoot, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYWx5aHRhbGlrd3NvcG9ndWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYyMzc2MDEsImV4cCI6MjA0MTgxMzYwMX0.GaBwZWM0dKP_0hHy8Dzw75u15eXVG3vi8RmD7mv7PkQ';

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error('Missing Supabase configuration. Ensure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY are set.');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const client = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const testEmail = process.env.PUBLIC_TEMPLATES_TEST_EMAIL ?? 'public.templates.tester@example.com';
const testPassword = process.env.PUBLIC_TEMPLATES_TEST_PASSWORD ?? 'TestTemplates123!';

const ensureTestUser = async () => {
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });
  if (createError) {
    if (createError.message?.includes('already registered')) {
      return null;
    }
    throw createError;
  }
  return created.user;
};

const signInTestUser = async () => {
  const { data, error } = await client.auth.signInWithPassword({ email: testEmail, password: testPassword });
  if (error) {
    throw error;
  }
  return data.session;
};

const verifyTemplatesList = async () => {
  const { data, error } = await client
    .from('campaigns')
    .select('id, name, thumbnail_url, manifest_url')
    .eq('template', true)
    .eq('visibility', 'public')
    .order('published_at', { ascending: false, nullsLast: false })
    .order('template_version', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }
  if (!data || data.length < 2) {
    throw new Error(`Expected at least 2 public templates, found ${data?.length ?? 0}`);
  }

  const missingAssets = data.filter((t) => !t.thumbnail_url || !t.manifest_url);
  if (missingAssets.length > 0) {
    throw new Error(
      `Templates missing thumbnail or manifest URLs: ${missingAssets.map((t) => `${t.name} (${t.id})`).join(', ')}`
    );
  }

  return data;
};

const cloneTemplate = async (templateId) => {
  const { data, error } = await client.functions.invoke('clone-template', {
    body: { templateId },
  });
  if (error) {
    throw new Error(`clone-template error: ${error.message}`);
  }
  const campaignId = data?.campaignId;
  if (!campaignId) {
    throw new Error('clone-template response missing campaignId');
  }
  return campaignId;
};

const fetchCampaign = async (campaignId) => {
  const { data, error } = await adminClient
    .from('campaigns')
    .select('id, template, visibility, source_template_id, user_id, manifest_url, name')
    .eq('id', campaignId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Cloned campaign not found');
  return data;
};

const cleanupCampaign = async (campaignId) => {
  await adminClient.from('campaigns').delete().eq('id', campaignId);
};

const run = async () => {
  console.log('Ensuring test user exists...');
  await ensureTestUser();

  console.log('Signing in test user...');
  await signInTestUser();

  console.log('Fetching public templates...');
  const templates = await verifyTemplatesList();
  console.log(`Found ${templates.length} public templates.`);

  const templateToClone = templates[0];
  console.log(`Cloning template: ${templateToClone.name}`);
  const clonedCampaignId = await cloneTemplate(templateToClone.id);
  console.log(`clone-template returned campaignId=${clonedCampaignId}`);

  const campaign = await fetchCampaign(clonedCampaignId);
  if (campaign.template) {
    throw new Error('Cloned campaign should not be marked as template');
  }
  if (campaign.visibility !== 'private') {
    throw new Error('Cloned campaign should be private');
  }
  if (campaign.source_template_id !== templateToClone.id) {
    throw new Error('Cloned campaign did not record source_template_id');
  }
  if (!campaign.user_id) {
    throw new Error('Cloned campaign missing user_id');
  }

  console.log('Clone verification passed. Cleaning up cloned campaign...');
  await cleanupCampaign(clonedCampaignId);

  console.log('UI verification successful.');
};

run().catch((error) => {
  console.error('UI verification failed:', error);
  process.exit(1);
});
