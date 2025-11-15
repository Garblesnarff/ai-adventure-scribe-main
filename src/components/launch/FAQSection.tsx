/**
 * FAQ Section - Launch-Focused Questions
 *
 * PURPOSE: Address beta-specific questions and set proper expectations
 * Features: Comprehensive Q&A, future-oriented answers, clear beta positioning
 */

import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import React, { useState } from 'react';

import { launchPageContent } from '@/data/launchPageContent';

interface FAQItemProps {
  item: {
    question: string;
    answer: string;
  };
  isOpen: boolean;
  onToggle: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ item, isOpen, onToggle }) => {
  return (
    <div className="border-b border-gray-700/50 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full py-6 text-left flex items-center justify-between hover:bg-gray-800/30 transition-colors duration-200"
        aria-expanded={isOpen}
      >
        <h3 className="text-lg font-semibold text-white pr-4">{item.question}</h3>
        <div className="flex-shrink-0">
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-purple-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-purple-400" />
          )}
        </div>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96 pb-6' : 'max-h-0'
        }`}
      >
        <p className="text-gray-300 leading-relaxed pl-0">{item.answer}</p>
      </div>
    </div>
  );
};

export const FAQSection: React.FC = () => {
  const { faq } = launchPageContent;
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0])); // First item open by default

  const toggleItem = (index: number) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <section className="relative py-24 bg-gray-900">
      <div className="max-w-4xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            {faq.headline}
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">{faq.subtitle}</p>
        </div>

        {/* FAQ List */}
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
          {faq.items.map((item, index) => (
            <FAQItem
              key={index}
              item={item}
              isOpen={openItems.has(index)}
              onToggle={() => toggleItem(index)}
            />
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-16 text-center p-8 bg-gradient-to-r from-purple-900/20 to-amber-900/20 border border-purple-500/20 rounded-xl">
          <div className="flex items-center justify-center gap-3 mb-4">
            <HelpCircle className="w-8 h-8 text-purple-400" />
            <h3 className="text-2xl font-bold text-white">Still Have Questions?</h3>
          </div>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            We're here to help! Reach out to our team for more specific questions about the beta or
            development process.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold rounded-lg transition-all duration-300"
            >
              Contact Us
            </a>
            <a
              href="https://discord.gg/ai-dungeon-master"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-600 hover:border-purple-400 text-gray-300 hover:text-purple-300 font-semibold rounded-lg transition-all duration-300"
            >
              Join Discord Community
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
