import { Binoculars, Coffee, Disc3, Landmark, TramFront, UtensilsCrossed, type LucideProps } from 'lucide-react';
import type { Category } from '../data';

const ICONS = {
  heritage: Landmark,
  food: UtensilsCrossed,
  coffee: Coffee,
  music: Disc3,
  landmark: Binoculars,
  metro: TramFront,
} as const;

export function CategoryIcon({ category, size = 18, ...rest }: { category: Category } & LucideProps) {
  const Icon = ICONS[category];
  return <Icon size={size} strokeWidth={2} aria-hidden {...rest} />;
}
