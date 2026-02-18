export type UserFeedback = 'up' | 'down' | null;

export interface Interest {
  domain: string;
  weight: number;
}

export interface UserProfile {
  id?: string;
  interests: Interest[];
  context: string;
  goals: string[];
  tracked_entities: string[];
  updated_at?: string;
}

export interface DigestSource {
  url: string;
  title: string;
  type: 'article' | 'paper' | 'tweet' | 'reddit' | 'github' | 'rss';
  published_at: string;
}

export interface DigestItem {
  id: string;
  week_of: string;
  headline: string;
  summary: string;
  why_it_matters: string;
  opportunity_analysis: string;
  sources: DigestSource[];
  tags: string[];
  score: number;
  is_featured: boolean;
  is_breaking: boolean;
  dismissed: boolean;
  user_feedback: UserFeedback;
  created_at: string;
}

export interface ChatMessage {
  id?: string;
  digest_item_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface Source {
  id: string;
  url: string;
  name: string;
  type: 'rss' | 'api' | 'scrape';
  category: string;
  priority: number;
  active: boolean;
  created_at: string;
}

// Raw items collected from sources before processing
export interface RawItem {
  url: string;
  title: string;
  content: string;
  published_at: string;
  source_name: string;
  source_type: DigestSource['type'];
}

// Scored item after pipeline processing
export interface ScoredItem extends RawItem {
  score: number;
  tags: string[];
  relevance_reason: string;
}

// Fully analyzed item ready for DB insert
export interface AnalyzedItem extends ScoredItem {
  headline: string;
  summary: string;
  why_it_matters: string;
  opportunity_analysis: string;
  is_featured: boolean;
}
