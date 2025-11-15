import { render, screen } from '@testing-library/react';
import React from 'react';

import CampaignWizard from './campaign-wizard';

// Mock WizardContent
vi.mock('./wizard/WizardContent', () => ({
  default: () => <div data-testid="mocked-wizard-content">Mocked Wizard Content</div>,
}));

describe('CampaignWizard', () => {
  it('renders WizardContent', () => {
    render(<CampaignWizard />);
    expect(screen.getByTestId('mocked-wizard-content')).toBeInTheDocument();
  });
});
