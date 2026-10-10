export interface Specs {
  material: string
  weightGrams: number
}

export const SPECS: Record<string, Specs> = {
  '1': { material: 'Ceramic', weightGrams: 340 },
  '2': { material: 'Cork and recycled paper', weightGrams: 210 },
  '3': { material: 'Tin', weightGrams: 95 },
  '5': { material: 'Glass', weightGrams: 180 },
}
