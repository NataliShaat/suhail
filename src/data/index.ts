import raw from './downtowns.json';
import rawGuides from './guides.json';
import type { Category, Downtown, Guide, Place } from './types';

export type { Category, Downtown, Guide, GuideLang, HotelKind, Metro, Place, Specialty } from './types';
export const FILTER_CATEGORIES: Category[] = ['heritage', 'food', 'coffee', 'music', 'landmark', 'metro'];

export const DOWNTOWNS = raw.downtowns as Downtown[];
export const GUIDES = rawGuides.guides as Guide[];

export function getDowntown(id: string | null): Downtown | undefined {
  return DOWNTOWNS.find((d) => d.id === id);
}

export function allPlaces(d: Downtown): Place[] {
  return d.bonus ? [...d.places, ...d.bonus.places] : d.places;
}

// The bonus zone opens once every place of its unlock category on the main route is checked in.
export function isBonusUnlocked(d: Downtown, visited: Record<string, number>): boolean {
  if (!d.bonus) return false;
  return d.places.filter((p) => p.category === d.bonus!.unlockAfterCategory).every((p) => visited[p.id]);
}
