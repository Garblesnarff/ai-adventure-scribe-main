export interface RollRecord {
  sceneId: string; 
  actorId: string; 
  kind: 'check' | 'save' | 'attack' | 'damage';
  d: number; 
  mod: number; 
  value: number; 
  total: number; 
  rationale?: string;
  serverSeedHash: string; 
  clientSeed: string; 
  nonce: number; 
  proof: string;
  at: number;
}

const rolls: RollRecord[] = [];

export function recordRoll(r: RollRecord) { 
  rolls.push(r); 
}

export function getRolls(sceneId: string) { 
  return rolls.filter(x => x.sceneId === sceneId); 
}

export function clearRolls() {
  rolls.length = 0;
}

export function getRollsForActor(sceneId: string, actorId: string) {
  return rolls.filter(x => x.sceneId === sceneId && x.actorId === actorId);
}

export function getRollsByType(sceneId: string, kind: RollRecord['kind']) {
  return rolls.filter(x => x.sceneId === sceneId && x.kind === kind);
}

export function getRollByProof(sceneId: string, proof: string) {
  return rolls.find(x => x.sceneId === sceneId && x.proof === proof);
}
