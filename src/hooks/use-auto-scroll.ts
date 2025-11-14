import { useCallback } from 'react';

/**
 * Custom hook for auto-scrolling functionality in character creation wizard
 * Provides smooth scrolling to navigation area after user selections
 */
export const useAutoScroll = () => {
  /**
   * Smoothly scrolls to the step navigation area
   * Uses a slight delay to allow for UI state updates
   */
  const scrollToNavigation = useCallback(() => {
    // Small delay to allow UI updates to complete
    setTimeout(() => {
      // Look for the step navigation container
      const navigationElement =
        document.querySelector('[data-testid="step-navigation"]') ||
        document.querySelector('.flex.justify-between') ||
        // Fallback: look for navigation buttons containing specific text
        Array.from(document.querySelectorAll('button')).find(
          (btn) =>
            btn.textContent?.includes('Continue') ||
            btn.textContent?.includes('Complete') ||
            btn.textContent?.includes('Next'),
        );

      if (navigationElement) {
        navigationElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      } else {
        // Fallback: scroll to bottom of the page
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 150);
  }, []);

  /**
   * Scrolls to the top of the page with smooth animation
   * Useful when navigating to new wizard steps
   */
  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  /**
   * Scrolls to the bottom of the page with smooth animation
   * Useful as a fallback or for simpler implementations
   */
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth',
      });
    }, 100);
  }, []);

  /**
   * Scrolls to a specific element by selector
   * @param selector - CSS selector for the target element
   * @param options - ScrollIntoViewOptions for customizing scroll behavior
   */
  const scrollToElement = useCallback(
    (
      selector: string,
      options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'nearest' },
    ) => {
      setTimeout(() => {
        const element = document.querySelector(selector);
        if (element) {
          element.scrollIntoView(options);
        }
      }, 100);
    },
    [],
  );

  return {
    scrollToNavigation,
    scrollToTop,
    scrollToBottom,
    scrollToElement,
  };
};
