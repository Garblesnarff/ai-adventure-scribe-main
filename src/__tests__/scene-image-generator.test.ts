import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/openrouter-service', () => {
  return {
    openRouterService: {
      generateImage: vi.fn().mockResolvedValue('data:image/png;base64,AAAA'),
      uploadImage: vi.fn().mockResolvedValue('https://cdn.example.com/campaigns/123/scene.png'),
    },
  };
});

import { openRouterService } from '@/services/openrouter-service';
import { generateSceneImage } from '@/services/scene-image-generator';

describe('scene-image-generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a style-aware prompt and uploads image', async () => {
    const res = await generateSceneImage({
      sceneText: 'A crumbling tower looms over the misty valley.',
      campaign: {
        id: '123',
        name: 'Shadows of Aerilon',
        genre: 'dark-fantasy',
        tone: 'gritty',
        atmosphere: 'oppressive',
        era: 'medieval',
        location: 'Aerilon',
        background_image: null,
      },
      character: null,
      quality: 'low',
      model: 'gpt-image-1-mini',
      storage: { entityType: 'campaign', entityId: '123', label: 'scene-test' },
    });

    expect(openRouterService.generateImage).toHaveBeenCalled();
    expect(openRouterService.uploadImage).toHaveBeenCalled();
    expect(res.prompt).toContain('Genre: dark-fantasy');
    expect(res.prompt).toContain('Tone: gritty');
    expect(res.prompt).toContain('Setting: Aerilon / medieval');
    expect(res.url).toMatch(/^https:\/\//);
  });
});
