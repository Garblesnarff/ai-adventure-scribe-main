import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'; // Added waitFor
import React from 'react';
import { vi } from 'vitest';

import { useCampaignSave } from './useCampaignSave';

import type { Campaign } from '@/types/campaign';

// Mock Supabase Client
// Define mocks that will be asserted on, if any, outside the factory.
// For this case, we assert on mockSupabaseInsert, so it needs to be accessible.
const mockSupabaseSingle = vi.fn();
const mockSupabaseSelect = vi.fn(() => ({ single: mockSupabaseSingle }));
// mockSupabaseInsert needs to be accessible for assertions.
const mockSupabaseInsert = vi.fn(() => ({ select: mockSupabaseSelect }));

vi.mock('@/integrations/supabase/client', () => {
  // These are now local to the factory, or we use the module-scoped ones if they are correctly set up.
  // To allow mockSupabaseInsert to be asserted from outside, it must be the one defined in module scope.
  // The functions in the chain leading to it can be local if not asserted on.
  // const localMockSupabaseSingle = vi.fn(); // not needed if using module-scoped mockSupabaseSingle
  // const localMockSupabaseSelect = vi.fn(() => ({ single: mockSupabaseSingle })); // uses module-scoped mockSupabaseSingle
  // const localMockSupabaseInsert = vi.fn(() => ({ select: localMockSupabaseSelect })); // uses localMockSupabaseSelect

  // The key is that the `from` property must return a function that eventually calls the
  // module-scoped mockSupabaseInsert.
  const localMockSupabaseFrom = vi.fn(() => ({ insert: mockSupabaseInsert })); // Uses module-scoped mockSupabaseInsert

  return {
    supabase: {
      from: localMockSupabaseFrom,
    },
  };
});

// Mock useToast (even if not directly used by the hook's core logic being tested, it's an import)
const mockToastFn = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToastFn }),
}));

// Helper Test Component
let hookResult: any; // To store the hook's return value

const TestComponent: React.FC<{ campaignDataToSave?: Partial<Campaign> }> = ({
  campaignDataToSave,
}) => {
  const { saveCampaign, isSaving } = useCampaignSave();
  hookResult = { saveCampaign, isSaving }; // Store for access outside component scope

  return (
    <div>
      <div data-testid="isSaving">{isSaving.toString()}</div>
      <button
        onClick={async () => {
          if (campaignDataToSave) {
            try {
              await saveCampaign(campaignDataToSave);
            } catch (e) {
              // Error handling can be tested by checking mocks or error messages if displayed
            }
          }
        }}
      >
        Save
      </button>
    </div>
  );
};

describe('useCampaignSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset any specific mock implementations if they were changed in a test
    mockSupabaseSingle.mockReset();
    mockSupabaseInsert.mockClear(); // Clear call history etc.
    mockSupabaseSelect.mockClear();
    // mockSupabaseFrom is no longer module-scoped, so it cannot be cleared here.
    // Its behavior is defined within the vi.mock factory for supabase client.
  });

  it('initial state should have isSaving as false', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('isSaving').textContent).toBe('false');
  });

  it('saveCampaign should set isSaving to true during operation and false after success', async () => {
    mockSupabaseSingle.mockResolvedValueOnce({ data: { id: 'campaign-123' }, error: null });
    render(<TestComponent />); // Render the component once

    mockSupabaseSingle.mockResolvedValueOnce({ data: { id: 'campaign-123' }, error: null });

    let savePromise: Promise<any>;

    // Call saveCampaign - this will set isSaving to true synchronously within the hook's state
    act(() => {
      savePromise = hookResult.saveCampaign({ name: 'Test' });
    });

    // Wait for the DOM to update to reflect isSaving = true
    await waitFor(() => {
      expect(screen.getByTestId('isSaving').textContent).toBe('true');
    });

    // Wait for the save operation to complete
    await act(async () => {
      await savePromise;
    });

    // Check isSaving is false after completion
    expect(screen.getByTestId('isSaving').textContent).toBe('false');
  });

  it('saveCampaign should return campaign ID on successful insert', async () => {
    mockSupabaseSingle.mockResolvedValueOnce({ data: { id: 'campaign-xyz' }, error: null });
    render(<TestComponent />);

    let result;
    const campaignData = { name: 'Test Campaign' };
    await act(async () => {
      result = await hookResult.saveCampaign(campaignData);
    });

    expect(result).toBe('campaign-xyz');
    expect(mockSupabaseInsert).toHaveBeenCalledWith([
      // Corrected status to 'active' as per hook implementation
      { name: 'Test Campaign', status: 'active', setting_details: {} },
    ]);
  });

  it('saveCampaign should throw error if Supabase returns error', async () => {
    const supabaseError = { message: 'Supabase error' };
    mockSupabaseSingle.mockResolvedValueOnce({ data: null, error: supabaseError });
    render(<TestComponent />);

    await act(async () => {
      await expect(hookResult.saveCampaign({ name: 'Error Campaign' })).rejects.toThrow(
        supabaseError.message,
      );
    });
    expect(screen.getByTestId('isSaving').textContent).toBe('false');
  });

  it('saveCampaign should throw error if no data is returned from insert', async () => {
    mockSupabaseSingle.mockResolvedValueOnce({ data: null, error: null }); // No error, but also no data
    render(<TestComponent />);

    await act(async () => {
      await expect(hookResult.saveCampaign({ name: 'No Data Campaign' })).rejects.toThrow(
        'No data returned from insert',
      );
    });
    expect(screen.getByTestId('isSaving').textContent).toBe('false');
  });

  it('saveCampaign should ensure setting_details is an object', async () => {
    mockSupabaseSingle.mockResolvedValueOnce({ data: { id: 'campaign-abc' }, error: null });
    render(<TestComponent />);

    // Test with setting_details as null
    await act(async () => {
      await hookResult.saveCampaign({ name: 'Test', setting_details: null });
    });
    expect(mockSupabaseInsert).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Test', setting_details: {} }),
    ]);

    // Reset mocks for next call within the same test
    mockSupabaseInsert.mockClear();
    mockSupabaseSingle.mockClear(); // ensure it's clean for the next resolve
    mockSupabaseSingle.mockResolvedValueOnce({ data: { id: 'campaign-def' }, error: null });

    // Test with provided setting_details
    const myDetails = { world: 'Mystara' };
    await act(async () => {
      await hookResult.saveCampaign({ name: 'Test 2', setting_details: myDetails });
    });
    expect(mockSupabaseInsert).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Test 2', setting_details: myDetails }),
    ]);
  });
});
