/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Category = 
  | 'محاليل وريدية' 
  | 'فيتامينات' 
  | 'مضادات حيوية' 
  | 'مسكنات' 
  | 'جهاز هضمي' 
  | 'أدوية عامة' 
  | 'مستلزمات طبية';

export type DistributionPoint = string;

export interface Medicine {
  id: number;
  name: string;
  received: number;
  dispensedByPoint: { [point: string]: number };
  unit: string;
  category: Category;
  status: 'متوفر' | 'ناقص';
}

export interface Transaction {
  id: string;
  invoiceId?: string;
  medicineId: number;
  medicineName: string;
  point: string;
  quantity: number;
  date: string;
  notes?: string;
}

export interface InventoryState {
  medicines: Medicine[];
  transactions: Transaction[];
  distributionPoints: string[];
  lastUpdated: string;
}
