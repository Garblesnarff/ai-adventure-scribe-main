import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../../middleware/auth.js';
import { supabaseService } from '../../lib/supabase.js';

export default function spellRouter(db: Pool) {
  const router = Router();
  // Removed authentication requirement for spell data - spells are public game information

  // Get all spells with optional filtering
  router.get('/', async (req: Request, res: Response) => {
    const { level, school, class: className, ritual, components } = req.query;

    try {
      let selectClause = `
        id, name, level, school, ritual, concentration,
        casting_time, range_text, duration, description,
        components_verbal, components_somatic, components_material,
        material_components
      `;

      // If filtering by class, include class relationship
      if (className) {
        selectClause = `
          id, name, level, school, ritual, concentration,
          casting_time, range_text, duration, description,
          components_verbal, components_somatic, components_material,
          material_components,
          class_spells!inner(
            source_feature,
            classes!inner(name)
          )
        `;
      }

      let query = supabaseService
        .from('spells')
        .select(selectClause);

      // Filter by class if specified
      if (className) {
        query = query.eq('class_spells.classes.name', className);
      }

      // Filter by spell level
      if (level) {
        query = query.eq('level', parseInt(level as string));
      }

      // Filter by school
      if (school) {
        query = query.eq('school', school);
      }

      // Filter by ritual
      if (ritual) {
        query = query.eq('ritual', ritual === 'true');
      }

      // Filter by components
      if (components) {
        const componentArray = (components as string).split(',');
        componentArray.forEach(component => {
          switch (component.trim().toUpperCase()) {
            case 'V':
              query = query.eq('components_verbal', true);
              break;
            case 'S':
              query = query.eq('components_somatic', true);
              break;
            case 'M':
              query = query.eq('components_material', true);
              break;
          }
        });
      }

      query = query.order('level').order('name');

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching spells:', error);
        return res.status(500).json({ error: 'Failed to fetch spells' });
      }

      return res.json(data);
    } catch (e) {
      console.error('Error fetching spells:', e);
      return res.status(500).json({ error: 'Failed to fetch spells' });
    }
  });

  // Get spells available to a specific class at a specific level
  router.get('/class/:className/level/:level', async (req: Request, res: Response) => {
    const { className, level } = req.params;

    try {
      const { data, error } = await supabaseService
        .from('spells')
        .select(`
          id, name, level, school, ritual, concentration,
          casting_time, range_text, duration, description,
          components_verbal, components_somatic, components_material,
          material_components,
          class_spells!inner(
            source_feature,
            classes!inner(name)
          )
        `)
        .eq('class_spells.classes.name', className)
        .lte('level', parseInt(level))
        .order('level')
        .order('name');

      if (error) {
        console.error('Error fetching class spells:', error);
        return res.status(500).json({ error: 'Failed to fetch class spells' });
      }

      return res.json(data);
    } catch (e) {
      console.error('Error fetching class spells:', e);
      return res.status(500).json({ error: 'Failed to fetch class spells' });
    }
  });

  // Get spell progression for a class
  router.get('/progression/:className', async (req: Request, res: Response) => {
    const { className } = req.params;

    try {
      const { data, error } = await supabaseService
        .from('spell_progression')
        .select(`
          character_level, cantrips_known, spells_known,
          spells_prepared_formula,
          spell_slots_1, spell_slots_2, spell_slots_3, spell_slots_4,
          spell_slots_5, spell_slots_6, spell_slots_7, spell_slots_8,
          spell_slots_9,
          classes!inner(name)
        `)
        .eq('classes.name', className)
        .order('character_level');

      if (error) {
        console.error('Error fetching spell progression:', error);
        return res.status(500).json({ error: 'Failed to fetch spell progression' });
      }

      return res.json(data);
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
        .eq('caster_level', parseInt(casterLevel))
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
      const { data, error } = await supabaseService
        .from('classes')
        .select(`
          id, name, spellcasting_ability, caster_type, spell_slots_start_level
        `)
        .not('spellcasting_ability', 'is', null)
        .order('caster_type')
        .order('name');

      if (error) {
        console.error('Error fetching spellcasting classes:', error);
        return res.status(500).json({ error: 'Failed to fetch spellcasting classes' });
      }

      return res.json(data);
    } catch (e) {
      console.error('Error fetching spellcasting classes:', e);
      return res.status(500).json({ error: 'Failed to fetch spellcasting classes' });
    }
  });

  // Get a specific spell by ID
  router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const { data, error } = await supabaseService
        .from('spells')
        .select(`
          id, name, level, school, ritual, concentration,
          casting_time, range_text, duration, description,
          components_verbal, components_somatic, components_material,
          material_components,
          class_spells(
            classes(name)
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Spell not found' });
        }
        console.error('Error fetching spell:', error);
        return res.status(500).json({ error: 'Failed to fetch spell' });
      }

      // Transform the data to match the expected format
      const result: any = {
        ...data,
        available_classes: data.class_spells?.map((cs: any) => cs.classes.name) || []
      };
      delete result.class_spells;

      return res.json(result);
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
