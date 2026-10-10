export interface Review {
  author: string
  text: string
}

export const REVIEWS: Record<string, Review[]> = {
  '1': [{ author: 'Inês', text: 'Keeps the coffee warm, and the tiles look hand-painted.' }],
  '3': [{ author: 'Tomás', text: 'Bought as a joke, now it lives on my desk.' }],
  '4': [{ author: 'Marta', text: 'Six coasters, six patterns.' }, { author: 'Rui', text: 'Heavier than expected.' }],
  '5': [{ author: 'Sofia', text: 'The right size for a tawny.' }],
}
