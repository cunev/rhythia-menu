export interface SoundSpaceMemoryMap {
  id: string;
  mappers: string[];
  title: string;
  duration: number;
  noteCount: number;
  difficulty: number;
  starRating: number;
  onlineStatus: string;
  notes: [number, number, number][];
}
