export type MediaType = "image" | "video";

export interface DiscoveryItem {
  id: string;
  title: string;
  description?: string;
  mediaUrl: string; // Bunny.net CDN URL
  mediaType: MediaType;
  thumbnailUrl?: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  stats: {
    likes: number;
    comments: number;
    shares: number;
  };
  tags: string[];
  category: "beauty" | "dining" | "hotel" | "lifestyle";
  aspectRatio: number; // For waterfall layout (width/height)
}

export interface DiscoveryFeed {
  items: DiscoveryItem[];
  nextCursor?: string;
  hasMore: boolean;
}
