export interface ProductInfo {
  productType: string;
  colors: string[];
  style: string;
  sellingPoints: string[];
  targetAudience: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export interface MarketingAnalysis {
  buyerPersona: string;
  drivingEmotion: string;
  fearsAndDesires: string;
  productSuperpower: string;
  triggerWords: string[];
  idealTone: string;
}

export interface GeneratedPost {
  headline: string;
  productDescription: string;
  emotionalSellingText: string;
  cta: string;
  hashtags: string[];
  marketingAnalysis?: MarketingAnalysis;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  credits: number;
  createdAt: string;
}

export interface AdPost {
  id: string;
  userId: string;
  imageUrl: string;
  imageUrls?: string[];
  productInfo: ProductInfo;
  aiConversation: ChatMessage[];
  generatedPost: GeneratedPost;
  hashtags: string[];
  tone: string;
  platform: string;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  activeUsers: number;
  creditsOverview: {
    totalCreditsAllocated: number;
    averageCreditsPerUser: number;
  };
}
