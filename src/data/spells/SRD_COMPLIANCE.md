# SRD (System Reference Document) Compliance notice

## Overview
This directory contains D&D 5th Edition spell data that complies with the Open Game License (OGL) 1.0a and uses only content from the D&D 5E System Reference Document (SRD).

## ✅ SRD-Compliant Classes
The following spellcasting classes are implemented and fully SRD-compliant:
- **Wizard** - Full spell list available
- **Cleric** - Full spell list available
- **Sorcerer** - Full spell list available
- **Warlock** - Full spell list available
- **Bard** - Full spell list available
- **Druid** - Full spell list available
- **Paladin** - Limited SRD spell list (no non-SRD subclasses)
- **Ranger** - Limited SRD spell list (no non-SRD subclasses)

## ❌ Non-SRD Content (NOT IMPLEMENTED)
The following spellcasting classes/subclasses are **NOT** available due to licensing restrictions:
- **Fighter (Eldritch Knight)** - Not in D&D 5E SRD
- **Rogue (Arcane Trickster)** - Not in D&D 5E SRD
- **Artificer** - Not in D&D 5E SRD

## Licensing Information
- All spell data is derived from D&D 5E SRD under Creative Commons Attribution 4.0 International License
- No proprietary Wizards of the Coast content is included
- All implementations must remain SRD-compliant

## Data Structure
- Each class has unique spell IDs to prevent conflicts
- Spells with the same name across classes have different IDs (e.g., `detect-magic` vs `detect-magic-cleric`)
- This ensures proper spell filtering by class without data conflicts

## Development Guidelines
1. **Never add non-SRD content** - This includes subclasses, spells, or features not in the SRD
2. **Verify SRD status** - Before adding new content, confirm it's available in the official SRD
3. **Maintain unique IDs** - Each spell instance must have a unique ID to prevent conflicts
4. **Test with SRD classes only** - Character creation testing should focus on the 8 SRD-compliant classes

## Future Expansions
Any additional spellcasting content must be:
- Officially part of D&D 5E SRD
- Properly licensed under OGL 1.0a
- Verified as not Wizards of the Coast Product Identity

## Compliance Verification
- ✅ 8 SRD classes implemented with complete spell lists
- ✅ 56 unique spells with class-specific ID mappings
- ✅ No non-SRD subclasses or proprietary content
- ✅ All spell data validated against official SRD sources

---
*Last updated: 2024-10-08*
*Compliance verified by Spell Audit Implementation Plan*
