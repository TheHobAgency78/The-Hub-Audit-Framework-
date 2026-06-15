/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ClientDataInput {
  clientName: string;
  niche: string;
  platform: 'instagram' | 'tiktok' | 'youtube_shorts' | 'x' | 'all';
  followersCount: string;
  activeCommunitySize: string; // engagement observations (active commenting/sharing)
  first3sRetention: string;   // e.g. "30%", "60%", "not_sure"
  watchTimeCompletion: string; // e.g. "15%", "40%", "not_sure"
  averageLikes: string;
  averageComments: string;
  averageShares: string;
  averageSaves: string;
  contentHooksExample: string;
  contentCaptionStyle: string;
  postingFrequency: string;
  communityInteraction: string; // how they interact with comments/DMs
  customNotes: string;
}

export interface HubScoreDimension {
  name: string; // Name in Arabic
  score: number; // 1 to 10
  analysis: string; // Brief analysis
}

export interface CriticalBottleneck {
  rank: number;
  title: string;
  description: string;
  algorithmicImpact: string;
  commercialImpact: string;
}

export interface UntappedOpportunity {
  title: string;
  rationale: string;
  expectedDigitalReturn: string;
  expectedCommercialReturn: string;
  easeOfImplementation: 'سهل' | 'متوسط' | 'صعب' | string;
}

export interface QuickWin {
  title: string;
  description: string;
  implementationCost: 'منخفضة' | 'متوسطة' | 'مرتفعة' | string;
  impactLevel: 'عالي جداً' | 'عالي' | 'متوسط' | string;
  timeframeDays: number;
}

export interface MonthPlan {
  month: number;
  objectives: string[];
  actions: string[];
  kpis: string[];
}

export interface RecommendedService {
  serviceId: string;
  name: string;
  whyApplied: string;
  expectedValue: string;
}

export interface AuditReport {
  id: string;
  timestamp: string;
  inputData: ClientDataInput;
  
  // Phase 0
  confidenceScore: number; // 0 - 100
  missingDataPoints: string[];
  assumptions: string[];
  
  // Phase 1
  hubScore: number; // 0 - 100
  dimensions: HubScoreDimension[];
  
  // Phase 2
  bottlenecks: CriticalBottleneck[];
  
  // Phase 3
  opportunities: UntappedOpportunity[];
  
  // Phase 4
  strategicQuestions: string[];
  
  // Phase 5
  quickWins: QuickWin[];
  
  // Phase 6
  plan90Days: MonthPlan[];
  
  // Phase 7
  recommendedServices: RecommendedService[];
}
