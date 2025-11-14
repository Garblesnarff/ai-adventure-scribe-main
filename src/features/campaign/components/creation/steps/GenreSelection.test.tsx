import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import GenreSelection from './GenreSelection';

// Mock CampaignContext
const mockDispatch = vi.fn();
const mockCampaignState = {
  campaign: {
    genre: '',
    name: 'Test Campaign', // Add other required fields if validation runs
    setting: {},
  },
};

vi.mock('@/contexts/CampaignContext', () => ({
  useCampaign: () => ({
    state: mockCampaignState,
    dispatch: mockDispatch,
  }),
}));

// Mock child components that are not relevant to this test, if any (e.g. TooltipProvider if it causes issues)
// For now, assuming GenreSelection is simple enough not to need this.

describe('GenreSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset state before each test
    mockCampaignState.campaign = {
      genre: '',
      name: 'Test Campaign',
      setting: {},
    };
  });

  it('should render skeleton UI when isLoading is true', () => {
    const { container } = render(<GenreSelection isLoading={true} />);
    // Check for the title skeleton by its specific classes
    const titleSkeleton = container.querySelector('.animate-pulse.h-8.w-48.mb-4');
    expect(titleSkeleton).toBeInTheDocument();

    // Check for multiple card skeletons by common and specific classes
    const skeletonCards = container.querySelectorAll('.animate-pulse.h-16');
    expect(skeletonCards.length).toBeGreaterThanOrEqual(2);
  });

  it('should render genre options and reflect current selection', () => {
    mockCampaignState.campaign.genre = 'dark-fantasy';
    render(<GenreSelection isLoading={false} />);

    // Check a few genres are rendered by their label text
    expect(screen.getByLabelText('Traditional Fantasy')).toBeInTheDocument();
    expect(screen.getByLabelText('Dark Fantasy')).toBeInTheDocument();
    expect(screen.getByLabelText('Science Fantasy')).toBeInTheDocument(); // Corrected "Science Fiction" to "Science Fantasy"

    // Assert the correct radio item is checked
    const darkFantasyRadioItem = screen.getByRole('radio', { name: 'Dark Fantasy' });
    expect(darkFantasyRadioItem).toBeChecked();

    // Also, can verify other items are not checked if necessary
    const traditionalFantasyRadioItem = screen.getByRole('radio', { name: 'Traditional Fantasy' });
    expect(traditionalFantasyRadioItem).not.toBeChecked();
  });

  it('should call dispatch with updated genre when a new genre is selected', () => {
    render(<GenreSelection isLoading={false} />);

    // Find the label for "Science Fantasy" and click it.
    // The actual clickable element might be the Card or a RadioGroupItem associated with the label.
    // In shadcn/ui, clicking the Label associated with a RadioGroupItem usually checks it.
    const scienceFantasyLabel = screen.getByLabelText('Science Fantasy');
    fireEvent.click(scienceFantasyLabel);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_CAMPAIGN',
      payload: { genre: 'science-fantasy' },
    });
  });

  it('should highlight the selected genre card', () => {
    mockCampaignState.campaign.genre = 'steampunk';
    render(<GenreSelection isLoading={false} />);

    // Find the RadioGroupItem by its associated Label text, then find its parent Card.
    // The RadioGroupItem itself should have role="radio" and be checked.
    const steampunkRadioItem = screen.getByRole('radio', { name: 'Steampunk' });
    expect(steampunkRadioItem).toBeChecked();

    // The Card is an ancestor of the RadioGroupItem.
    // We need to find the Card element that contains this radio item.
    // Assuming the Card component is identifiable by a class that includes 'border-2' (common for shadcn cards)
    // and is a div.
    const steampunkCard = steampunkRadioItem.closest('div[class*="border-2"]');
    expect(steampunkCard).toHaveClass('border-primary');

    // Verify another card is not highlighted
    const traditionalFantasyRadioItem = screen.getByRole('radio', { name: 'Traditional Fantasy' });
    expect(traditionalFantasyRadioItem).not.toBeChecked();
    const traditionalFantasyCard = traditionalFantasyRadioItem.closest('div[class*="border-2"]');
    expect(traditionalFantasyCard).not.toHaveClass('border-primary');
    // Default border might be border-transparent or similar, check actual implementation if needed
    // For now, just checking it's not border-primary is sufficient contrast.
  });
});
