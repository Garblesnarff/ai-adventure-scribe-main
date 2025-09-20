import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../../middleware/auth.js';

export default function spellRouter(db: Pool) {
  const router = Router();
  router.use(requireAuth);

  // Get all spells with optional filtering
  router.get('/', async (req: Request, res: Response) => {
    const { level, school, class: className, ritual, components } = req.query;
    const client = await db.connect();

    try {
      let query = `
        SELECT DISTINCT s.id, s.name, s.level, s.school, s.ritual, s.concentration,
               s.casting_time, s.range, s.duration, s.description,
               s.components_verbal, s.components_somatic, s.components_material,
               s.material_components, s.attack_save, s.damage_effect
        FROM spells s
      `;
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 0;

      // Filter by class if specified
      if (className) {
        query += ` INNER JOIN class_spells cs ON s.id = cs.spell_id
                   INNER JOIN classes c ON cs.class_id = c.id`;
        conditions.push(`c.name = $${++paramCount}`);
        values.push(className);
      }

      // Filter by spell level
      if (level) {
        conditions.push(`s.level = $${++paramCount}`);
        values.push(parseInt(level as string));
      }

      // Filter by school
      if (school) {
        conditions.push(`s.school = $${++paramCount}`);
        values.push(school);
      }

      // Filter by ritual
      if (ritual) {
        conditions.push(`s.ritual = $${++paramCount}`);
        values.push(ritual === 'true');
      }

      // Filter by components
      if (components) {
        const componentArray = (components as string).split(',');
        componentArray.forEach(component => {
          switch (component.trim().toUpperCase()) {
            case 'V':
              conditions.push(`s.components_verbal = true`);
              break;
            case 'S':
              conditions.push(`s.components_somatic = true`);
              break;
            case 'M':
              conditions.push(`s.components_material = true`);
              break;
          }
        });
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY s.level, s.name`;

      const result = await client.query(query, values);
      return res.json(result.rows);
    } catch (e) {
      console.error('Error fetching spells:', e);
      return res.status(500).json({ error: 'Failed to fetch spells' });
    } finally {
      client.release();
    }
  });

  // Get spells available to a specific class at a specific level
  router.get('/class/:className/level/:level', async (req: Request, res: Response) => {
    const { className, level } = req.params;
    const client = await db.connect();

    try {
      const result = await client.query(`
        SELECT DISTINCT s.id, s.name, s.level, s.school, s.ritual, s.concentration,
               s.casting_time, s.range, s.duration, s.description,
               s.components_verbal, s.components_somatic, s.components_material,
               s.material_components, s.attack_save, s.damage_effect,
               cs.source_feature
        FROM spells s
        INNER JOIN class_spells cs ON s.id = cs.spell_id
        INNER JOIN classes c ON cs.class_id = c.id
        WHERE c.name = $1 AND s.level <= $2
        ORDER BY s.level, s.name
      `, [className, parseInt(level)]);

      return res.json(result.rows);
    } catch (e) {
      console.error('Error fetching class spells:', e);
      return res.status(500).json({ error: 'Failed to fetch class spells' });
    } finally {
      client.release();
    }
  });

  // Get spell progression for a class
  router.get('/progression/:className', async (req: Request, res: Response) => {
    const { className } = req.params;
    const client = await db.connect();

    try {
      const result = await client.query(`
        SELECT sp.character_level, sp.cantrips_known, sp.spells_known,
               sp.spells_prepared_formula,
               sp.spell_slots_1, sp.spell_slots_2, sp.spell_slots_3, sp.spell_slots_4,
               sp.spell_slots_5, sp.spell_slots_6, sp.spell_slots_7, sp.spell_slots_8,
               sp.spell_slots_9
        FROM spell_progression sp
        INNER JOIN classes c ON sp.class_id = c.id
        WHERE c.name = $1
        ORDER BY sp.character_level
      `, [className]);

      return res.json(result.rows);
    } catch (e) {
      console.error('Error fetching spell progression:', e);
      return res.status(500).json({ error: 'Failed to fetch spell progression' });
    } finally {
      client.release();
    }
  });

  // Get multiclass spell slots for a given caster level
  router.get('/multiclass/slots/:casterLevel', async (req: Request, res: Response) => {
    const { casterLevel } = req.params;
    const client = await db.connect();

    try {
      const result = await client.query(`
        SELECT caster_level, spell_slots_1, spell_slots_2, spell_slots_3, spell_slots_4,
               spell_slots_5, spell_slots_6, spell_slots_7, spell_slots_8, spell_slots_9
        FROM multiclass_spell_slots
        WHERE caster_level = $1
      `, [parseInt(casterLevel)]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Caster level not found' });
      }

      return res.json(result.rows[0]);
    } catch (e) {
      console.error('Error fetching multiclass spell slots:', e);
      return res.status(500).json({ error: 'Failed to fetch multiclass spell slots' });
    } finally {
      client.release();
    }
  });

  // Get all classes with their spellcasting information
  router.get('/classes', async (req: Request, res: Response) => {
    const client = await db.connect();

    try {
      const result = await client.query(`
        SELECT id, name, spellcasting_ability, caster_type, spell_slots_start_level
        FROM classes
        WHERE spellcasting_ability IS NOT NULL
        ORDER BY
          CASE caster_type
            WHEN 'full' THEN 1
            WHEN 'pact' THEN 2
            WHEN 'half' THEN 3
            WHEN 'third' THEN 4
          END,
          name
      `);

      return res.json(result.rows);
    } catch (e) {
      console.error('Error fetching spellcasting classes:', e);
      return res.status(500).json({ error: 'Failed to fetch spellcasting classes' });
    } finally {
      client.release();
    }
  });

  // Get a specific spell by ID
  router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const client = await db.connect();

    try {
      const result = await client.query(`
        SELECT s.id, s.name, s.level, s.school, s.ritual, s.concentration,
               s.casting_time, s.range, s.duration, s.description,
               s.components_verbal, s.components_somatic, s.components_material,
               s.material_components, s.attack_save, s.damage_effect,
               array_agg(DISTINCT c.name) as available_classes
        FROM spells s
        LEFT JOIN class_spells cs ON s.id = cs.spell_id
        LEFT JOIN classes c ON cs.class_id = c.id
        WHERE s.id = $1
        GROUP BY s.id, s.name, s.level, s.school, s.ritual, s.concentration,
                 s.casting_time, s.range, s.duration, s.description,
                 s.components_verbal, s.components_somatic, s.components_material,
                 s.material_components, s.attack_save, s.damage_effect
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Spell not found' });
      }

      return res.json(result.rows[0]);
    } catch (e) {
      console.error('Error fetching spell:', e);
      return res.status(500).json({ error: 'Failed to fetch spell' });
    } finally {
      client.release();
    }
  });

  // Calculate multiclass caster level
  router.post('/multiclass/calculate', async (req: Request, res: Response) => {
    const { classLevels } = req.body;

    if (!Array.isArray(classLevels)) {
      return res.status(400).json({ error: 'classLevels must be an array' });
    }

    const client = await db.connect();

    try {
      let totalCasterLevel = 0;
      let pactMagicSlots = { level: 0, slots: 0 };

      for (const classLevel of classLevels) {
        const { className, level } = classLevel;

        // Get class caster type
        const classResult = await client.query(
          'SELECT caster_type FROM classes WHERE name = $1',
          [className]
        );

        if (classResult.rows.length === 0) {
          return res.status(400).json({ error: `Class ${className} not found` });
        }

        const casterType = classResult.rows[0].caster_type;

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
        const slotsResult = await client.query(
          'SELECT * FROM multiclass_spell_slots WHERE caster_level = $1',
          [Math.min(totalCasterLevel, 20)]
        );
        spellSlots = slotsResult.rows[0] || null;
      }

      return res.json({
        totalCasterLevel,
        spellSlots,
        pactMagicSlots: pactMagicSlots.slots > 0 ? pactMagicSlots : null
      });
    } catch (e) {
      console.error('Error calculating multiclass caster level:', e);
      return res.status(500).json({ error: 'Failed to calculate multiclass caster level' });
    } finally {
      client.release();
    }
  });

  return router;
}