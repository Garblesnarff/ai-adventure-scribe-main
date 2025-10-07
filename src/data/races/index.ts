import type { CharacterRace } from '@/types/character';
import { dwarf } from './dwarf';
import { elf } from './elf';
import { halfling } from './halfling';
import { human } from './human';
import { dragonborn } from './dragonborn';
import { gnome } from './gnome';
import { elementalborn } from './elementalborn';
import { celestialborn } from './celestialborn';
import { astralborn } from './astralborn';
import { tiefling } from './tiefling';
import { halfElf } from './half-elf';
import { halfOrc } from './half-orc';
import { forestGiant } from './forest-giant';
import { stoneGiant } from './stone-giant';
import { ravenfolk } from './ravenfolk';
import { lizardfolk } from './lizardfolk';
import { catfolk } from './catfolk';
import { seaborn } from './seaborn';
import { serpentfolk } from './serpentfolk';

export const baseRaces: CharacterRace[] = [
  dwarf,
  elf,
  halfling,
  human,
  dragonborn,
  gnome,
  elementalborn,
  celestialborn,
  astralborn,
  tiefling,
  halfElf,
  halfOrc,
  forestGiant,
  stoneGiant,
  ravenfolk,
  lizardfolk,
  catfolk,
  seaborn,
  serpentfolk,
];

export const races = baseRaces;
