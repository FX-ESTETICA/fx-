import { IndustryType } from '../types/omni-flow';
import { Utensils, Car, User, Bed, LayoutGrid, Sparkles } from 'lucide-react';

export interface LiquidUIConfig {
  id: IndustryType;
  label: {
    zh: string;
    it: string;
  };
  icon: any;
  color: string;
  accentColor: string;
  viewName: {
    zh: string;
    it: string;
  };
  subtext: {
    zh: string;
    it: string;
  };
  resourceName: {
    zh: string;
    it: string;
  };
  areas?: string[];
}

export const LIQUID_UI_CONFIGS: Record<IndustryType, LiquidUIConfig> = {
  beauty: {
    id: 'beauty',
    label: { zh: '美业', it: 'Bellezza' },
    icon: Sparkles,
    color: 'rose-500',
    accentColor: 'rose-500/20',
    viewName: { zh: '技师看板', it: 'VISTA STAFF' },
    subtext: { zh: '美业模式已激活', it: 'Modalità Bellezza Attiva' },
    resourceName: { zh: '技师', it: 'Staff' },
  },
  restaurant: {
    id: 'restaurant',
    label: { zh: '餐饮', it: 'Ristorazione' },
    icon: Utensils,
    color: 'orange-500',
    accentColor: 'orange-500/20',
    viewName: { zh: '桌位看板', it: 'VISTA TAVOLI' },
    subtext: { zh: '餐厅模式已激活', it: 'Modalità Ristorante Attiva' },
    resourceName: { zh: '桌号', it: 'Tavolo' },
    areas: ['大厅', '包间', '露台'],
  },
  car_wash: {
    id: 'car_wash',
    label: { zh: '洗美', it: 'Lavaggio' },
    icon: Car,
    color: 'blue-500',
    accentColor: 'blue-500/20',
    viewName: { zh: '工位看板', it: 'VISTA POSTAZIONI' },
    subtext: { zh: '洗美模式已激活', it: 'Modalità Lavaggio Attiva' },
    resourceName: { zh: '工位', it: 'Postazione' },
    areas: ['清洗区', '美容区', '检测区'],
  },
  hotel: {
    id: 'hotel',
    label: { zh: '酒店', it: 'Hotel' },
    icon: Bed,
    color: 'emerald-500',
    accentColor: 'emerald-500/20',
    viewName: { zh: '房态看板', it: 'VISTA CAMERE' },
    subtext: { zh: '酒店模式已激活', it: 'Modalità Hotel Attiva' },
    resourceName: { zh: '房号', it: 'Camera' },
    areas: ['标准间', '套房', '总统套'],
  },
  generic: {
    id: 'generic',
    label: { zh: '通用', it: 'Generale' },
    icon: LayoutGrid,
    color: 'zinc-500',
    accentColor: 'zinc-500/20',
    viewName: { zh: '资源看板', it: 'VISTA RISORSE' },
    subtext: { zh: '通用模式已激活', it: 'Modalità Generale Attiva' },
    resourceName: { zh: '资源', it: 'Risorsa' },
  },
};
