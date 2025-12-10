export interface RecommenderInput {
  age?: number;
  bodyArea?: string; // "knee", "shoulder", etc.
  painType?: string; // free text: "sharp pain while running; started 2 weeks ago"
  injuryMechanism?: string; // "after 10k run, no fall"
  swelling?: boolean;
  dizziness?: boolean;
  headHit?: boolean;
  pelvicPostpartum?: boolean;
  sport?: string; // "recreational running"
  goal?: string; // "return to running pain-free"
  mentalHealth?: boolean;
  nutritionInterest?: boolean;
  urgency?: 'now' | 'soon' | 'flexible' | string;
}

export interface ServiceRecommendation {
  name: string; // e.g. "Physiotherapy"
  why: string; // explanation for the user
  nextSteps: string[]; // short bullet list
  bookUrl?: string;
  callPhone?: string;
  score?: number; // internal use
}

export interface RedFlagInfo {
  message: string;
  advice: string[];
}

export interface RecommenderOutput {
  topService: ServiceRecommendation;
  backupOption?: ServiceRecommendation;
  redFlag: RedFlagInfo | null;
  tags: string[]; // for debugging / analytics
}
