import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateDiscountedPrice(price: number, discount?: { type: 'percentage' | 'fixed', value: number, active: boolean }) {
  if (!discount || !discount.active) return price;
  
  if (discount.type === 'percentage') {
    return price * (1 - discount.value / 100);
  } else {
    return Math.max(0, price - discount.value);
  }
}
