import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase environment variables are not configured");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.split(" ")?.[1];

  if (!token) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  try {
    const body = await req.json();
    const templateId = body?.templateId as string | undefined;
    const nameOverride = body?.name as string | undefined;

    if (!templateId) {
      return new Response(
        JSON.stringify({ error: "templateId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      console.error("Failed to authenticate user", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = authData.user.id;

    const { data: template, error: templateError } = await supabase
      .from("campaigns")
      .select(
        "id, name, description, genre, difficulty_level, campaign_length, tone, atmosphere, era, location, setting_details, thematic_elements, status, background_image, art_style, style_config, rules_config, template_version"
      )
      .eq("id", templateId)
      .eq("template", true)
      .eq("visibility", "public")
      .single();

    if (templateError || !template) {
      console.error("Template not found or not public", templateError);
      return new Response(
        JSON.stringify({ error: "Template not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const insertPayload = {
      user_id: userId,
      name: nameOverride?.trim() || template.name,
      description: template.description,
      genre: template.genre,
      difficulty_level: template.difficulty_level,
      campaign_length: template.campaign_length,
      tone: template.tone,
      atmosphere: template.atmosphere,
      era: template.era,
      location: template.location,
      setting_details: template.setting_details,
      thematic_elements: template.thematic_elements,
      status: template.status ?? "active",
      background_image: template.background_image,
      art_style: template.art_style,
      style_config: template.style_config,
      rules_config: template.rules_config,
      template: false,
      visibility: "private",
      slug: null,
      manifest_url: null,
      thumbnail_url: null,
      published_at: null,
      published_by: null,
      source_template_id: template.id,
      template_version: template.template_version ?? 1,
      content_hash: null,
    };

    const { data: newCampaign, error: insertError } = await supabase
      .from("campaigns")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError || !newCampaign) {
      console.error("Failed to create campaign instance", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to clone template" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ campaignId: newCampaign.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("clone-template function error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
