import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import { supabaseService } from '../../lib/supabase.js';
import {
  getClassSpells,
  getSpellById,
  getSpellsByLevel,
  getSpellsBySchool,
  spellProgression,
  spellcastingClasses
} from '../../data/spellData.js';

export default function spellRouter() {
  const router = Router();

  // SECURITY: Require authentication - spell data is for authenticated users in the app
  router.use(requireAuth);
  router.use(planRateLimit('default'));

  // Get all spells with optional filtering
  router.get('/', async (req: Request, res: Response) => {
    const { level, school, class: className, ritual, components } = req.query;

    try {
      let spells;

      // Get spells by class if specified
      if (className) {
        const classSpells = getClassSpells(className as string);
        spells = [...classSpells.cantrips, ...classSpells.spells];
      } else if (level !== undefined) {
        // SECURITY: Bound parseInt to valid spell levels (0-9)
        const levelNum = Math.max(0, Math.min(parseInt(level as string) || 0, 9));
        spells = getSpellsByLevel(levelNum);
      } else if (school) {
        spells = getSpellsBySchool(school as string);
      } else {
        // Get all spells - combine cantrips and level 1+ spells
        const bardSpells = getClassSpells('Bard');
        const druidSpells = getClassSpells('Druid');
        const clericSpells = getClassSpells('Cleric');
        const sorcererSpells = getClassSpells('Sorcerer');
        const warlockSpells = getClassSpells('Warlock');
        const wizardSpells = getClassSpells('Wizard');

        // Combine all unique spells
        const allClassSpells = [
          ...bardSpells.cantrips, ...bardSpells.spells,
          ...druidSpells.cantrips, ...druidSpells.spells,
          ...clericSpells.cantrips, ...clericSpells.spells,
          ...sorcererSpells.cantrips, ...sorcererSpells.spells,
          ...warlockSpells.cantrips, ...warlockSpells.spells,
          ...wizardSpells.cantrips, ...wizardSpells.spells
        ];

        // Remove duplicates by id
        const uniqueSpells = allClassSpells.filter((spell, index, self) =>
          index === self.findIndex(s => s.id === spell.id)
        );

        spells = uniqueSpells;
      }

      // Apply additional filters
      let filteredSpells = spells;

      // Filter by ritual
      if (ritual !== undefined) {
        const isRitual = ritual === 'true';
        filteredSpells = filteredSpells.filter(spell => spell.ritual === isRitual);
      }

      // Filter by components
      if (components) {
        const componentArray = (components as string).split(',');
        componentArray.forEach(component => {
          switch (component.trim().toUpperCase()) {
            case 'V':
              filteredSpells = filteredSpells.filter(spell => spell.verbal);
              break;
            case 'S':
              filteredSpells = filteredSpells.filter(spell => spell.somatic);
              break;
            case 'M':
              filteredSpells = filteredSpells.filter(spell => spell.material);
              break;
          }
        });
      }

      // Sort by level then name
      filteredSpells.sort((a, b) => {
        if (a.level !== b.level) {
          return a.level - b.level;
        }
        return a.name.localeCompare(b.name);
      });

      return res.json(filteredSpells);
    } catch (e) {
      console.error('Error fetching spells:', e);
      return res.status(500).json({ error: 'Failed to fetch spells' });
    }
  });

  // Get spells available to a specific class at a specific level
  router.get('/class/:className/level/:level', async (req: Request, res: Response) => {
    const { className, level } = req.params;

    try {
      const classSpells = getClassSpells(className || '');

      // Filter spells by level (include spells up to the specified level)
      // SECURITY: Bound parseInt to valid spell levels (0-9)
      const maxLevel = Math.max(0, Math.min(parseInt(level || '0') || 0, 9));
      const { cantrips, spells } = classSpells;

      const availableCantrips = cantrips; // Cantrips are always available
      const availableSpells = spells.filter(spell => spell.level <= maxLevel);

      // Combine and sort
      const allSpells = [...availableCantrips, ...availableSpells];
      allSpells.sort((a, b) => {
        if (a.level !== b.level) {
          return a.level - b.level;
        }
        return a.name.localeCompare(b.name);
      });

      return res.json(allSpells);
    } catch (e) {
      console.error('Error fetching class spells:', e);
      return res.status(500).json({ error: 'Failed to fetch class spells' });
    }
  });

  // Get spell progression for a class
  router.get('/progression/:className', async (req: Request, res: Response) => {
    const { className } = req.params;

    try {
      const progression = spellProgression[className as keyof typeof spellProgression];

      if (!progression) {
        return res.status(404).json({ error: `Spell progression not found for class: ${className}` });
      }

      return res.json(progression);
    } catch (e) {
      console.error('Error fetching spell progression:', e);
      return res.status(500).json({ error: 'Failed to fetch spell progression' });
    }
  });

  // Get multiclass spell slots for a given caster level
  router.get('/multiclass/slots/:casterLevel', async (req: Request, res: Response) => {
    const { casterLevel } = req.params;

    try {
      const { data, error } = await supabaseService
        .from('multiclass_spell_slots')
        .select(`
          caster_level, spell_slots_1, spell_slots_2, spell_slots_3, spell_slots_4,
          spell_slots_5, spell_slots_6, spell_slots_7, spell_slots_8, spell_slots_9
        `)
        // SECURITY: Bound parseInt to valid caster levels (1-20)
        .eq('caster_level', Math.max(1, Math.min(parseInt(casterLevel || '1') || 1, 20)))
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Caster level not found' });
        }
        console.error('Error fetching multiclass spell slots:', error);
        return res.status(500).json({ error: 'Failed to fetch multiclass spell slots' });
      }

      return res.json(data);
    } catch (e) {
      console.error('Error fetching multiclass spell slots:', e);
      return res.status(500).json({ error: 'Failed to fetch multiclass spell slots' });
    }
  });

  // Get all classes with their spellcasting information
  router.get('/classes', async (req: Request, res: Response) => {
    try {
      return res.json(spellcastingClasses);
    } catch (e) {
      console.error('Error fetching spellcasting classes:', e);
      return res.status(500).json({ error: 'Failed to fetch spellcasting classes' });
    }
  });

  // Get a specific spell by ID
  router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const spell = getSpellById(id || '');

      if (!spell) {
        return res.status(404).json({ error: 'Spell not found' });
      }

      return res.json(spell);
    } catch (e) {
      console.error('Error fetching spell:', e);
      return res.status(500).json({ error: 'Failed to fetch spell' });
    }
  });

  // Calculate multiclass caster level
  router.post('/multiclass/calculate', async (req: Request, res: Response) => {
    const { classLevels } = req.body;

    if (!Array.isArray(classLevels)) {
      return res.status(400).json({ error: 'classLevels must be an array' });
    }

    try {
      let totalCasterLevel = 0;
      let pactMagicSlots = { level: 0, slots: 0 };

      for (const classLevel of classLevels) {
        const { className, level } = classLevel;

        // Get class caster type
        const { data: classData, error } = await supabaseService
          .from('classes')
          .select('caster_type')
          .eq('name', className)
          .single();

        if (error || !classData) {
          return res.status(400).json({ error: `Class ${className} not found` });
        }

        const casterType = classData.caster_type;

        switch (casterType) {
          case 'full':
            totalCasterLevel += level;
            break;
          case 'half':
            totalCasterLevel += Math.floor(level / 2);
            break;
          case 'third':
            totalCasterLevel += Math.floor(level / 3);
            break;
          case 'pact':
            // Warlock pact magic is separate but can be used with other spell slots
            if (level >= 1) {
              const pactLevel = Math.min(Math.ceil(level / 2), 5);
              pactMagicSlots = {
                level: pactLevel,
                slots: level >= 11 ? 3 : 2
              };
            }
            break;
        }
      }

      // Get multiclass spell slots for the calculated caster level
      let spellSlots = null;
      if (totalCasterLevel > 0) {
        const { data: slotsData } = await supabaseService
          .from('multiclass_spell_slots')
          .select('*')
          .eq('caster_level', Math.min(totalCasterLevel, 20))
          .single();
        spellSlots = slotsData || null;
      }

      return res.json({
        totalCasterLevel,
        spellSlots,
        pactMagicSlots: pactMagicSlots.slots > 0 ? pactMagicSlots : null
      });
    } catch (e) {
      console.error('Error calculating multiclass caster level:', e);
      return res.status(500).json({ error: 'Failed to calculate multiclass caster level' });
    }
  });

  return router;
}
