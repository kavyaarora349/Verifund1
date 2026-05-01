import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number) => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const formatHash = (hash: string) => {
  if (!hash) return '';
  return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
};

export const fakeHash = () => 
  "0x" + Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)).join("");

export const generateFakeAddress = () => 
  "0x" + Array.from({ length: 40 }, () => 
    Math.floor(Math.random() * 16).toString(16)).join("");
