export interface MountCSV {
  ID: number;
  Name_lang: string;
  SourceSpellID: number;
}

export interface ItemEffectCSV {
  ID: number;
  SpellID: number;
  TriggerType: number;
}

export interface ItemXItemEffectCSV {
  ItemID: number;
  ItemEffectID: number;
}
