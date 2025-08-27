// constants/processes.js
import { Shuffle, ShoppingCart, Palette, Package, Wrench, Factory, Home, CheckSquare } from 'lucide-react';

export const PROCESI = [
  { id: 'općenito', naziv: 'Općenito', ikona: Shuffle, boja: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #fda085 100%)' },
  { id: 'prodaja', naziv: 'Prodaja', ikona: ShoppingCart, boja: '#8b5cf6' },
  { id: 'dizajn', naziv: 'Dizajn', ikona: Palette, boja: '#3b82f6' },
  { id: 'nabava', naziv: 'Nabava', ikona: Package, boja: '#06b6d4' },
  { id: 'teh_priprema', naziv: 'Teh. priprema', ikona: Wrench, boja: '#10b981' },
  { id: 'proizvodnja', naziv: 'Proizvodnja', ikona: Factory, boja: '#f59e0b' },
  { id: 'ugradnja', naziv: 'Ugradnja', ikona: Home, boja: '#ef4444' },
  { id: 'primopredaja', naziv: 'Primopredaja', ikona: CheckSquare, boja: '#ec4899' }
];