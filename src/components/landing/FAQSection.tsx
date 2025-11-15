/**
 * FAQ Section - Turn Objections Into Desires
 *
 * PURPOSE: Address fears while making them MORE excited to try
 *
 * Co-Founder Strategy:
 * - Every objection answer should END with a desire trigger
 * - Format: Acknowledge fear � Flip to benefit � End with excitement
 *
 * BAD: "You can cancel anytime in your account settings"
 * GOOD: "Cancel anytime. But honestly? Most people upgrade within 48 hours because they get addicted to their world remembering them"
 */

import { Sparkles } from 'lucide-react';
import React from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const FAQSection: React.FC = () => {
  const faqs = [
    {
      question: "I've never played D&D. Will I be lost?",
      answer:
        "Perfect. You're actually at an advantage. You don't have years of 'rules' cluttering your brain. The AI handles all the mechanics - you just make choices and watch your story unfold. Most first-timers send their first message within 60 seconds. No rulebook required.",
    },
    {
      question: 'How is this different from ChatGPT with a D&D prompt?',
      answer:
        "ChatGPT forgets what you did 10 messages ago. Ours remembers EVERYTHING - every lie, every promise, every NPC you saved or betrayed. Come back weeks later, and your world is exactly how you left it, with NPCs who remember your reputation. It's the difference between a chat and a living world.",
    },
    {
      question: 'Can I play with friends or is it solo only?',
      answer:
        "Right now it's your personal adventure - which honestly is the magic. No scheduling conflicts, no waiting for Dave to show up 30 minutes late, no awkward group dynamics. Just you and a DM that's available 24/7. (Multiplayer is on the roadmap if there's demand.)",
    },
    {
      question: "What if I don't like my story? Can I start over?",
      answer:
        "Yes, but here's the thing - most people who think they 'messed up' actually created the most interesting storylines. That NPC you accidentally insulted? They become your nemesis. That town you failed to save? Haunts your character for sessions. The 'mistakes' make better stories than perfect playthroughs.",
    },
    {
      question: 'Is the free tier actually usable or is it a trap?',
      answer:
        "It's genuinely usable - you can complete short campaigns on free. But here's what happens: You'll get hooked on your world. You'll want NPCs to remember you. You'll crave that 'holy shit' moment when the AI recalls something from 10 sessions ago. Then you'll upgrade. We're banking on you loving it too much to leave.",
    },
    {
      question: "How does the AI 'remember' things long-term?",
      answer:
        "Every significant choice, conversation, and action gets stored with importance scores. When you interact with the world, the AI retrieves relevant memories and weaves them into the narrative. That merchant you saved 3 sessions ago? The AI knows. That lie you told? Recorded. It's like having a DM with perfect memory who's obsessed with your story.",
    },
    {
      question: 'Can I export my campaign as an actual book?',
      answer:
        "Yes (Legend tier). The AI formats your entire campaign into a readable novel - dialogue, narration, character development, the works. It's not a transcript. It's an actual story you'd want to read. Some players get it printed and give it to friends. It's wild.",
    },
    {
      question: 'What happens if I cancel? Do I lose everything?',
      answer:
        "Your campaigns are saved for 90 days after cancellation. But between us? Almost no one cancels. Once your world starts remembering you, it's hard to walk away. It's like leaving a book unfinished where YOU'RE the main character.",
    },
  ];

  return (
    <section className="relative py-24 bg-gradient-to-b from-gray-900 to-purple-900/30">
      <div className="max-w-4xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            Questions?{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-400">
              We've Got Answers
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Everything you're wondering (and some things you didn't know you should ask)
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-8 backdrop-blur-sm">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-b border-gray-700/50 last:border-0"
              >
                <AccordionTrigger className="text-left text-lg font-semibold text-white hover:text-purple-400 transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400 leading-relaxed pt-4 pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Still Have Questions CTA */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col items-center gap-4 px-8 py-6 bg-gradient-to-br from-purple-900/40 to-amber-900/40 border border-purple-500/30 rounded-2xl backdrop-blur-sm">
            <Sparkles className="w-8 h-8 text-amber-400" />
            <p className="text-xl text-white font-semibold">Still got questions?</p>
            <p className="text-gray-400">Try it free for 5 minutes. That'll answer everything.</p>
            <p className="text-sm text-purple-400">(Most people are hooked by message 3)</p>
          </div>
        </div>
      </div>
    </section>
  );
};
