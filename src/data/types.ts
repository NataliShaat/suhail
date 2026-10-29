// The shapes of the app's data, with no runtime imports, so the server (plain Node ESM) can share them.
import type { ThemeId } from '../config.js';
import type { Hours } from './hours.js';

export type Category = 'heritage' | 'food' | 'coffee' | 'music' | 'landmark' | 'metro';

export type VoucherOffer = 'pct10' | 'pct15' | 'saudiCoffee' | 'pastry' | 'bogoDessert';

export interface Place {
  id: string;
  category: Exclude<Category, 'metro'>;
  lat: number;
  lng: number;
  final?: boolean;
  free?: boolean;
  evening?: boolean;
  alsoCoffee?: boolean;
  hours: Hours;
  /** A café or restaurant offer, unlocked by checking in. `offer` keys i18n `voucher.offers`. */
  voucher?: { offer: VoucherOffer; code: string };
  /** Short facts in English, for the assistant. */
  highlights: string[];
  /** Fields that hold prototype sample values (see the note in downtowns.json). */
  prototype?: string[];
}

export interface Metro {
  id: string;
  line: 'blue';
  lat: number;
  lng: number;
}

export type HotelKind = 'ramada' | 'babsamhan' | 'comfort';

export interface Downtown {
  id: string;
  theme: ThemeId;
  hotel: { lat: number; lng: number; kind: HotelKind; model: string | null };
  /** The hotel discount for visiting every place on the main route. */
  reward: { code: string; percent: number };
  route: string[];
  places: Place[];
  bonus?: {
    id: string;
    theme: ThemeId;
    unlockAfterCategory: Category;
    route: string[];
    places: Place[];
  };
  metro: Metro[];
  noMetroHint?: boolean;
}

export type GuideLang = 'ar' | 'en' | 'zh-CN';
export type Specialty = 'history' | 'architecture' | 'food' | 'coffee' | 'art' | 'music' | 'photography';

export interface Guide {
  id: string;
  /** Downtown ids this guide covers. */
  downtowns: string[];
  languages: GuideLang[];
  specialties: Specialty[];
  rating: number;
  rate: number;
  availability: { kind: 'now' } | { kind: 'tomorrow' } | { kind: 'from'; hour: number };
}
