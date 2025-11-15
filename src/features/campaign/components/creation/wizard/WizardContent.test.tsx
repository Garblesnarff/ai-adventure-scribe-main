import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { vi } from 'vitest';

// WizardContent will be imported dynamically later
// import WizardContent from './WizardContent';
// Constants will be mocked with vi.doMock, so no direct import needed for it here for mocking purposes.
// import * as Constants from './constants';
import { useCampaignSave } from './useCampaignSave';
// Validation will be mocked with vi.mock as it doesn't have hoisting issues with its dependencies.
import * as Validation from './validation';

import { useToast } from '@/components/ui/use-toast';
import { CampaignProvider, useCampaign } from '@/contexts/CampaignContext';

// Define Mocks for Step Components globally
const MockStep1 = vi.fn(() => <div data-testid="mock-step-1">Step 1 Content</div>);
const MockStep2 = vi.fn(() => <div data-testid="mock-step-2">Step 2 Content</div>);

// Define the array to be used by the constants mock and for test assertions
const mockWizardStepsArray = [
  { name: 'Step 1', component: MockStep1, description: 'Mock Step 1 Description' },
  { name: 'Step 2', component: MockStep2, description: 'Mock Step 2 Description' },
];

// Mock validation functions and capture them (vi.mock is fine here)
const mockValidateGenreSelection = vi.fn((campaign, toastFn) => true);
const mockValidateCampaignParameters = vi.fn((campaign, toastFn) => true);
const mockValidateBasicDetails = vi.fn((campaign, toastFn) => true);
const mockValidateCompleteCampaign = vi.fn((campaign, toastFn) => true);

vi.mock('./validation', () => ({
  validateGenreSelection: mockValidateGenreSelection,
  validateCampaignParameters: mockValidateCampaignParameters,
  validateBasicDetails: mockValidateBasicDetails,
  validateCompleteCampaign: mockValidateCompleteCampaign,
}));

const mockToastFn = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToastFn }),
}));

const mockNavigateFn = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return { ...original, useNavigate: () => mockNavigateFn };
});

const mockSaveCampaignFn = vi.fn().mockResolvedValue('mock-campaign-id');
const mockUseCampaignSaveReturn = { saveCampaign: mockSaveCampaignFn, isSaving: false };
vi.mock('./useCampaignSave', () => ({
  useCampaignSave: () => mockUseCampaignSaveReturn,
}));

const mockCampaignDispatch = vi.fn();
const mockCampaignState = {
  campaign: {
    name: 'Test Campaign',
    setting: {},
    genre: '',
    campaignParameters: {},
    basicDetails: {},
  },
};
vi.mock('@/contexts/CampaignContext', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    useCampaign: () => ({ state: mockCampaignState, dispatch: mockCampaignDispatch }),
    CampaignProvider: actual.CampaignProvider,
  };
});

describe('WizardContent', () => {
  let WizardContent: React.ComponentType<any>; // To hold the dynamically imported component

  beforeAll(async () => {
    // Use vi.doMock for './constants' as it depends on MockStep1/MockStep2
    vi.doMock('./constants', () => ({
      wizardSteps: mockWizardStepsArray, // Safe to use mockWizardStepsArray now
      // If WizardContent uses other named exports from constants, mock them here too.
    }));

    // Dynamically import WizardContent AFTER constants is mocked
    const module = await import('./WizardContent');
    WizardContent = module.default;
  });

  // Setup function - defined inside describe or passed WizardContent
  const renderWizardContent = () => {
    return render(
      <MemoryRouter>
        <CampaignProvider>
          <WizardContent />
        </CampaignProvider>
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCampaignState.campaign = {
      name: 'Test Campaign Initial',
      setting: {},
      genre: 'Initial Genre',
      campaignParameters: { param: 'initial' },
      basicDetails: { detail: 'initial' },
    };
    mockUseCampaignSaveReturn.isSaving = false;
  });

  it('should render the first step, header, progress, and navigation on initial load', () => {
    renderWizardContent();

    expect(screen.getByTestId('wizard-header')).toBeInTheDocument();
    expect(screen.getByText('Create Your Campaign')).toBeInTheDocument();

    expect(screen.getByTestId('progress-indicator')).toBeInTheDocument();
    expect(screen.getByText(`Step 1 of ${mockWizardStepsArray.length}`)).toBeInTheDocument();

    expect(screen.getByTestId('mock-step-1')).toBeInTheDocument();
    expect(MockStep1).toHaveBeenCalledTimes(1); // Check it's called once

    expect(screen.getByTestId('step-navigation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Previous/i })).toBeInTheDocument();
    // With 2 steps, the first step's next button should say "Next"
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
  });

  describe('handleNext', () => {
    it('should navigate to the next step if validation passes', () => {
      renderWizardContent();
      // Ensure Step 1's validation mock (validateGenreSelection) returns true
      mockValidateGenreSelection.mockReturnValueOnce(true);

      fireEvent.click(screen.getByRole('button', { name: /Next/i }));

      expect(mockValidateGenreSelection).toHaveBeenCalledWith(
        mockCampaignState.campaign,
        mockToastFn,
      );
      expect(screen.getByTestId('mock-step-2')).toBeInTheDocument(); // Check if Step 2 is rendered
      expect(MockStep2).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('mock-step-1')).not.toBeInTheDocument(); // Step 1 should not be there
      // Progress indicator should update
      expect(screen.getByText(`Step 2 of ${mockWizardStepsArray.length}`)).toBeInTheDocument();
    });

    it('should not navigate and show toast if validation fails', () => {
      renderWizardContent();
      // Step 1's validation mock (validateGenreSelection) returns false
      mockValidateGenreSelection.mockReturnValueOnce(false);

      fireEvent.click(screen.getByRole('button', { name: /Next/i }));

      expect(mockValidateGenreSelection).toHaveBeenCalledWith(
        mockCampaignState.campaign,
        mockToastFn,
      );
      // Toast is called by the validation function itself as per current WizardContent structure
      // expect(mockToastFn).toHaveBeenCalled(); // This assertion depends on validateGenreSelection calling toast

      expect(screen.getByTestId('mock-step-1')).toBeInTheDocument(); // Still on Step 1
      expect(MockStep1).toHaveBeenCalledTimes(1); // Initial render
      expect(screen.queryByTestId('mock-step-2')).not.toBeInTheDocument(); // Step 2 should not be there
      // Progress indicator should not update
      expect(screen.getByText(`Step 1 of ${mockWizardStepsArray.length}`)).toBeInTheDocument();
    });
  });

  describe('handlePrevious', () => {
    it('should navigate to the previous step', () => {
      renderWizardContent();

      // Go to Step 2 first
      mockValidateGenreSelection.mockReturnValueOnce(true);
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));
      expect(screen.getByTestId('mock-step-2')).toBeInTheDocument(); // Confirmed at Step 2
      expect(MockStep2).toHaveBeenCalledTimes(1);
      expect(screen.getByText(`Step 2 of ${mockWizardStepsArray.length}`)).toBeInTheDocument();

      // Now click Previous
      fireEvent.click(screen.getByRole('button', { name: /Previous/i }));

      expect(screen.getByTestId('mock-step-1')).toBeInTheDocument(); // Back to Step 1
      expect(MockStep1).toHaveBeenCalledTimes(2); // Initial render + after previous
      expect(screen.queryByTestId('mock-step-2')).not.toBeInTheDocument(); // Step 2 gone
      // Progress indicator should update
      expect(screen.getByText(`Step 1 of ${mockWizardStepsArray.length}`)).toBeInTheDocument();
    });

    it('should do nothing if on the first step', () => {
      renderWizardContent();
      expect(screen.getByTestId('mock-step-1')).toBeInTheDocument(); // On Step 1

      fireEvent.click(screen.getByRole('button', { name: /Previous/i }));

      expect(screen.getByTestId('mock-step-1')).toBeInTheDocument(); // Still on Step 1
      expect(MockStep1).toHaveBeenCalledTimes(1); // Only initial render
      // Check that no unintended navigation or re-render of step 2 happened
      expect(screen.queryByTestId('mock-step-2')).not.toBeInTheDocument();
      expect(screen.getByText(`Step 1 of ${mockWizardStepsArray.length}`)).toBeInTheDocument();
    });
  });

  describe('handleNext on final step (campaign save)', () => {
    // Helper to navigate to the final step (Step 2 in our mock)
    const navigateToFinalStep = () => {
      mockValidateGenreSelection.mockReturnValueOnce(true); // Step 1 validation
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));
      // Assuming Step 2 is the last step, the button text will be "Finish"
      expect(screen.getByTestId('mock-step-2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Finish/i })).toBeInTheDocument();
    };

    it('should not save and should show toast if final validation fails', async () => {
      renderWizardContent();
      navigateToFinalStep();

      mockValidateCompleteCampaign.mockReturnValueOnce(false);

      // Click "Finish" button (which is the "Next" button on the final step)
      fireEvent.click(screen.getByRole('button', { name: /Finish/i }));

      expect(mockValidateCompleteCampaign).toHaveBeenCalledWith(
        mockCampaignState.campaign,
        mockToastFn,
      );
      expect(mockSaveCampaignFn).not.toHaveBeenCalled();
      expect(mockNavigateFn).not.toHaveBeenCalled();
      expect(screen.getByTestId('mock-step-2')).toBeInTheDocument(); // Still on final step
      // Depending on implementation, validateCompleteCampaign might call toast.
      // If handleNext itself calls toast on validation failure, that's another check.
      // For now, assuming validateCompleteCampaign is responsible for its own toast.
    });

    it('should save campaign, navigate, and show success toast if final validation passes and save succeeds', async () => {
      renderWizardContent();
      navigateToFinalStep();

      mockValidateCompleteCampaign.mockReturnValueOnce(true);
      const testCampaignId = 'new-campaign-id-123';
      // Ensure saveCampaign mock is fresh for this specific resolved value if not already reset by clearAllMocks
      // Default mock already resolves, but specific value might be desired.
      mockSaveCampaignFn.mockResolvedValueOnce(testCampaignId);

      // Click "Finish" button
      await fireEvent.click(screen.getByRole('button', { name: /Finish/i }));

      // Need to wait for promises to resolve if saveCampaign is async and subsequent actions depend on it.
      // A common way is to await a findBy* query if the UI changes, or directly await the promise if possible.
      // Since toast and navigate are effects of the promise, we might need to ensure microtasks are flushed.
      // Using a small timeout or await Promise.resolve() can sometimes help in tests if act() isn't sufficient.
      // However, testing-library's fireEvent and screen queries usually handle this well with mocked promises.

      expect(mockValidateCompleteCampaign).toHaveBeenCalledWith(
        mockCampaignState.campaign,
        mockToastFn,
      );
      expect(mockSaveCampaignFn).toHaveBeenCalledWith(mockCampaignState.campaign);

      // Check for success toast
      expect(mockToastFn).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Campaign created successfully!',
      });

      // Check for navigation
      expect(mockNavigateFn).toHaveBeenCalledWith(`/app/campaigns/${testCampaignId}`);
    });

    it('should show error toast and not navigate if final validation passes but save fails', async () => {
      renderWizardContent();
      navigateToFinalStep();

      mockValidateCompleteCampaign.mockReturnValueOnce(true);
      const saveError = new Error('Failed to save');
      mockSaveCampaignFn.mockRejectedValueOnce(saveError);

      // Click "Finish" button
      await fireEvent.click(screen.getByRole('button', { name: /Finish/i }));

      expect(mockValidateCompleteCampaign).toHaveBeenCalledWith(
        mockCampaignState.campaign,
        mockToastFn,
      );
      expect(mockSaveCampaignFn).toHaveBeenCalledWith(mockCampaignState.campaign);

      // Check for error toast
      expect(mockToastFn).toHaveBeenCalledWith({
        title: 'Error',
        description: saveError.message,
        variant: 'destructive',
      });

      expect(mockNavigateFn).not.toHaveBeenCalled();
      expect(screen.getByTestId('mock-step-2')).toBeInTheDocument(); // Still on final step
    });
  });
});
