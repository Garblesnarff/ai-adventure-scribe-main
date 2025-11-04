
#### **InfiniteRealms: Persistent Worlds That Evolve Forever**

**The Problem:** Solo fantasy tabletop RPGs are difficult, and finding a reliable human Game Master (GM) is even harder. Existing AI storytelling tools suffer from short-term memory, leading to generic, repetitive, and forgetful campaigns that lack the depth of a human-led adventure.

**The Solution:** InfiniteRealms provides persistent worlds that evolve across generations. Create campaigns, characters, and stories that live forever in your own personal universe. It's powered by a team of specialized AI agents—a creative Storyteller and a meticulous Rules-Expert—that collaborate in real-time. This unique architecture creates a dynamic, coherent, and deeply personalized narrative that evolves with your choices, delivering the rich, emergent storytelling of a human-led fantasy RPG game.

#### **Key Features**
*   🧠 **Multi-Agent AI Core**: A Game Master agent for storytelling and a Rules Interpreter for mechanics collaborate to ensure creative yet fair gameplay, mimicking the cognitive processes of a human GM.
*   📝 **Persistent Campaign Memory**: The AI remembers every decision, character, and event, creating a truly evolving narrative that reflects your choices. No more forgotten plot points or inconsistent NPC behavior.
*   🤖 **Dynamic NPC Interactions**: NPCs have context-aware dialogue and reactions, driven by the AI's understanding of the ongoing story and your character's history.
*   🗣️ **Voice-Enabled Narration**: Hear your adventure come to life with integrated text-to-speech for immersive GM narration and character dialogue.
*   ✅ **Automated Rules Management**: The AI seamlessly handles complex fantasy RPG rules for actions, combat, and spellcasting, letting you focus on the story instead of the rulebook.
*   🛠️ **Full Campaign & Character Management**: A complete platform to create and manage detailed campaigns and characters through intuitive creation wizards.
*   🔒 **Resilient, Offline-First Messaging**: A production-grade agent messaging system ensures reliable communication and state synchronization, even with intermittent connectivity.
*   🧩 **Modular & Extensible Architecture**: Built with decoupled services and a clear, documented refactoring plan for future development and research.

#### **Technology Stack**
*   **Frontend**: React, Vite, TypeScript, Tailwind CSS, Shadcn UI
*   **Backend & Database**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
*   **AI Integration**: Google Gemini, CrewAI (Agent Orchestration), ElevenLabs (Text-to-Speech), OpenAI Embeddings
*   **State Management**: TanStack Query, React Context
*   **Testing**: Vitest, React Testing Library

#### **Performance & Scalability**

InfiniteRealms implements comprehensive database optimizations for production-scale performance:

*   **Query Optimization**: 83-95% reduction in database queries through batch operations and JOINs
*   **Response Times**: 5-12× faster API responses for character creation and spell validation
*   **Race Condition Prevention**: Unique constraints eliminate duplicate session creation issues
*   **Automatic Archival**: Session archival system maintains 50% smaller database size
*   **Client Storage Management**: IndexedDB auto-cleanup keeps browser storage under 1 MB
*   **Strategic Indexes**: Optimized query performance with targeted database indexes

**📊 Performance Impact:**
- Spell validation: 300-1200ms → 50-200ms (75-95% faster)
- Database queries: 6-12 queries → 1-2 queries (83-93% reduction)
- Database size: Controlled growth with 90-day retention policy

**📚 Documentation:**
- [Database Optimizations Overview](docs/DATABASE_OPTIMIZATIONS.md)
- [Migration Guide](docs/MIGRATION_GUIDE.md)
- [Performance Report](docs/PERFORMANCE_REPORT.md)
- [Monitoring Guide](docs/MONITORING.md)

#### **Quick Start**
1.  **Prerequisites**: Node.js and npm installed.
2.  **Clone the repository**:
    ```bash
    git clone https://github.com/rob-smith/infinite-realms.git
    cd infinite-realms
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Run the development server**:
    *   Create a `.env.local` file and add your Supabase project URL and anon key.
    ```bash
    npm run dev
    ```

#### **Why This Matters**
*   **Play Fantasy RPGs Anytime, Anywhere:** No need to schedule sessions or find a group. Your personal, always-available AI Game Master is ready whenever you are.
*   **A Story That Remembers You:** Unlike other AI tools, your choices have lasting consequences. The AI's persistent memory ensures a unique campaign that truly belongs to you.
*   **Focus on Roleplaying, Not Rulebooks:** The AI handles the complex rules of fantasy RPGs, letting you immerse yourself in your character and the story without getting bogged down in mechanics.
*   **A Platform for Emergent Narrative Research:** Beyond being a game, this project serves as a research platform for studying how multi-agent systems and persistent memory can lead to emergent, conscious-like behaviors in AI.

#### **Breakthrough Innovations**
1.  **Collaborative Multi-Agent System (MCP-based):** This isn't a single monolithic AI. It's a "crew" of specialized agents (a storyteller and a rules expert) that communicate and collaborate via a robust messaging protocol. This division of labor allows for both creative narrative generation and strict adherence to game mechanics, mimicking the cognitive processes of a human GM.
2.  **Long-Term Episodic Memory:** The system implements a sophisticated memory architecture that goes beyond simple context windows. It classifies and stores events, dialogue, and character actions as distinct "memories," complete with importance scores and vector embeddings for semantic retrieval. This allows the AI to recall distant but relevant events, creating a deeply coherent and personalized campaign.
3.  **Resilient, Offline-First Agent Communication:** Built with a production-grade messaging queue that handles asynchronous communication, error recovery, and synchronization. This ensures the complex interactions between AI agents are reliable, even in environments with poor connectivity—a non-trivial engineering feat that bridges the gap between research prototypes and real-world applications.
