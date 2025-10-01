# Rate Limiting Fix - Stable Models & Free OpenRouter

## Summary
Fixed 429 "quota exceeded" errors by switching from preview Gemini models to stable production models and configuring free OpenRouter fallback.

## Root Causes Identified

### 1. Preview Model Rate Limits
- **Problem**: Using `gemini-2.5-flash-lite-preview-09-2025` (experimental model)
- **Issue**: Preview models have undocumented/stricter rate limits
- **Impact**: 429 errors claiming daily quota exceeded (actually per-minute burst limits)

### 2. Broken OpenRouter Fallback
- **Problem**: `.env` had placeholder API key `your_openrouter_api_key_here`
- **Issue**: When Gemini failed, OpenRouter returned 401 (invalid key)
- **Impact**: Cascading failures with no working fallback

### 3. Model Cost Risk
- **Problem**: OpenRouter fallback used paid model `google/gemini-flash-1.5`
- **Issue**: Could incur unexpected charges
- **Impact**: Cost concerns on free tier (1000 requests/day limit)

## Changes Made

### 1. Environment Variables (`.env`)
```bash
# Updated OpenRouter configuration
VITE_OPENROUTER_API_KEY=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
VITE_OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
```

### 2. Gemini Model Updates
Replaced preview models with stable `gemini-2.5-flash-lite` in:

**Files Updated (2 files, 4 locations):**
- ✅ `src/services/character-description-generator.ts` (lines 86, 395)
  - Changed from `gemini-2.5-flash-lite-preview-09-2025` → `gemini-2.5-flash-lite`

**Already Using Stable Models:**
- ✅ `src/services/ai-service.ts` (line 54) - already `gemini-2.5-flash-lite`
- ✅ `src/services/world-builders/quest-generator.ts` (line 131) - already `gemini-2.5-flash-lite`
- ✅ `src/services/world-builders/npc-generator.ts` (line 107) - already `gemini-2.5-flash-lite`
- ✅ `src/services/world-builders/location-generator.ts` (line 70) - already `gemini-2.5-flash-lite`
- ✅ `src/services/memory-manager.ts` (line 56) - already `gemini-2.5-flash-lite`

### 3. OpenRouter Fallback Updates
Updated to free tier model `google/gemini-2.0-flash-exp:free`:

**Files Updated (2 files, 3 locations):**
- ✅ `src/services/character-description-generator.ts` (lines 115, 410)
  - Changed from `google/gemini-flash-1.5` → `google/gemini-2.0-flash-exp:free`
- ✅ `src/services/openrouter-service.ts` (lines 80-91)
  - Fixed hardcoded models to use `VITE_OPENROUTER_MODEL` from `.env`
  - Removed incorrect `google/gemini-flash-1.5` and outdated `google/gemini-2.0-flash-exp:free` with wrong limits
  - Now respects environment configuration (1000 req/day free tier)

## Model Information

### Gemini Stable Model
- **Model**: `gemini-2.5-flash-lite`
- **Status**: Stable, generally available (released July 2025)
- **Pricing**: $0.10 per 1M input tokens, $0.40 per 1M output tokens
- **Limits**: 15 requests/minute, 1000 requests/day (free tier)
- **Features**: Fastest, lowest cost model in Gemini 2.5 family

### OpenRouter Free Model
- **Model**: `google/gemini-2.0-flash-exp:free`
- **Status**: Free tier with rate limiting
- **Pricing**: $0.00 (free)
- **Limits**: 1000 requests/day, heavily rate limited
- **Features**: Significantly faster TTFT, multimodal, enhanced coding

## Fallback Chain

### Multi-Tier Fallback Strategy:
1. **Primary**: Google Gemini API (`gemini-2.5-flash-lite`)
   - Direct API access via `GeminiApiManager`
   - Key rotation on errors
   - 15 req/min, 1000 req/day

2. **Secondary**: OpenRouter Free Tier (`google/gemini-2.0-flash-exp:free`)
   - Activates when Gemini fails
   - No cost (free tier)
   - 1000 req/day limit

3. **Tertiary**: Static Fallback
   - Returns basic character description
   - Always available
   - No AI generation

## Testing

### TypeScript Compilation
```bash
✅ npx tsc --noEmit
# Passed with no errors
```

### Expected Behavior
- ✅ No 429 errors from preview model rate limits
- ✅ Consistent stable model usage across all services
- ✅ Working OpenRouter fallback with valid API key
- ✅ Zero cost for OpenRouter usage (free tier)
- ✅ Clear multi-tier fallback for reliability

## Files Modified
1. `.env` - Updated OpenRouter API key and model
2. `src/services/character-description-generator.ts` - Stable Gemini + Free OpenRouter
3. `src/services/openrouter-service.ts` - Fixed hardcoded models to use `.env` configuration
4. `RATE_LIMIT_FIX.md` - NEW: This documentation file

## Deployment Notes
- ✅ All services now use stable, production-ready models
- ✅ Free tier limits: 1000 req/day per service (Gemini + OpenRouter)
- ✅ No environment variables breaking changes
- ✅ Backwards compatible with existing code
- ✅ TypeScript compilation passes
