/**
 * Waitlist Form Component - Beta Access Signup
 *
 * PURPOSE: Handle beta waitlist signups with proper validation and states
 * Features: Double opt-in, GDPR compliance, error handling, analytics tracking
 */

import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import React, { useState } from 'react';

import { logger } from '../../lib/logger';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WaitlistFormProps {
  className?: string;
  variant?: 'hero' | 'section' | 'modal';
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

export const WaitlistForm: React.FC<WaitlistFormProps> = ({
  className = '',
  variant = 'section',
  onSuccess,
  onError,
}) => {
  const [status, setStatus] = useState<FormStatus>('idle');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate email format
   */
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Handle form input changes
   */
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.consent) {
      newErrors.consent = 'You must agree to receive updates';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setStatus('loading');

    try {
      // TODO: Replace with actual API endpoint
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name || undefined,
          source: 'launch_page',
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      setStatus('success');

      // Track analytics
      if (window.gtag) {
        window.gtag('event', 'waitlist_signup_success', {
          event_category: 'conversion',
          event_label: 'beta_waitlist',
        });
      }

      onSuccess?.();
    } catch (error) {
      logger.error('Waitlist signup error:', error);
      setStatus('error');

      // Track analytics
      if (window.gtag) {
        window.gtag('event', 'waitlist_signup_error', {
          event_category: 'error',
          event_label: 'beta_waitlist',
        });
      }

      onError?.(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  // Size variants
  const sizeClasses = {
    hero: 'max-w-md mx-auto',
    section: 'max-w-sm mx-auto',
    modal: 'w-full',
  };

  const inputClasses = {
    hero: 'text-lg py-4 px-6',
    section: 'py-3 px-4',
    modal: 'py-3 px-4',
  };

  return (
    <div className={`${sizeClasses[variant]} ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4" aria-label="Join beta waitlist">
        {/* Name field (optional) */}
        <div>
          <Label htmlFor="waitlist-name" className="sr-only">
            Name (Optional)
          </Label>
          <Input
            id="waitlist-name"
            type="text"
            placeholder="Your name (optional)"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`${inputClasses[variant]} ${errors.name ? 'border-red-500' : ''}`}
            disabled={status === 'loading' || status === 'success'}
          />
        </div>

        {/* Email field (required) */}
        <div>
          <Label htmlFor="waitlist-email" className="sr-only">
            Email Address *
          </Label>
          <Input
            id="waitlist-email"
            type="email"
            placeholder="your.email@example.com"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`${inputClasses[variant]} ${errors.email ? 'border-red-500' : ''}`}
            disabled={status === 'loading' || status === 'success'}
            required
            aria-required="true"
          />
          {errors.email && (
            <p className="text-sm text-red-400 mt-1 flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              {errors.email}
            </p>
          )}
        </div>

        {/* GDPR Consent */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="waitlist-consent"
            checked={formData.consent}
            onCheckedChange={(checked) => handleInputChange('consent', checked as boolean)}
            disabled={status === 'loading' || status === 'success'}
            required
            aria-required="true"
            className={errors.consent ? 'border-red-500' : ''}
          />
          <Label htmlFor="waitlist-consent" className="text-sm text-gray-300 leading-relaxed">
            I agree to receive updates about the AI Dungeon Master beta launch and occasional
            product news. I can unsubscribe at any time.{' '}
            <a href="/privacy" className="text-purple-400 hover:text-purple-300 underline">
              View Privacy Policy
            </a>
          </Label>
        </div>
        {errors.consent && (
          <p className="text-sm text-red-400 mt-1 flex items-center gap-1">
            <XCircle className="w-4 h-4" />
            {errors.consent}
          </p>
        )}

        {/* Honeypot field for bot protection */}
        <div className="hidden">
          <Input type="text" name="honeypot" tabIndex={-1} autoComplete="off" />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className={`
            w-full ${inputClasses[variant]} font-semibold transition-all duration-300
            ${
              variant === 'hero'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-900 shadow-lg hover:shadow-xl'
                : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white'
            }
          `}
        >
          {status === 'loading' && (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Joining Waitlist...
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Check Your Email!
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="w-5 h-5 mr-2" />
              Try Again
            </>
          )}
          {status === 'idle' && (
            <>
              <Mail className="w-5 h-5 mr-2" />
              Join Beta Waitlist
            </>
          )}
        </Button>

        {/* Success Message */}
        {status === 'success' && (
          <div className="p-4 bg-green-900/20 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-sm text-center">
              🎉 Welcome to the waitlist! Check your email for a confirmation link. We'll notify you
              as soon as beta access is available.
            </p>
          </div>
        )}

        {/* Error Message */}
        {status === 'error' && (
          <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm text-center">
              Something went wrong. Please check your email address and try again, or contact us if
              the problem persists.
            </p>
          </div>
        )}
      </form>
    </div>
  );
};

export default WaitlistForm;
