import { create } from 'zustand';

// ============================================================
// Types
// ============================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  needsContext?: 'latestPost' | 'posts' | 'none';
}

// ============================================================
// Storage helpers
// ============================================================

const STORAGE_KEY = 'lp_chat_messages';
const MAX_MESSAGES = 50;
const MAX_STORED = 100;

function loadMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as ChatMessage[];
    // Return last MAX_MESSAGES from stored
    return parsed.slice(-MAX_MESSAGES);
  } catch {
    return [];
  }
}

function persistMessages(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    // Keep only last MAX_STORED
    const toStore = messages.slice(-MAX_STORED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // localStorage full, ignore
  }
}

function generateId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================
// Quick actions (in French)
// ============================================================

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'analyze-post',
    label: 'Analyser mon dernier post',
    icon: 'BarChart3',
    prompt: "Analyse mon dernier post LinkedIn publié. Donne-moi un retour détaillé sur :\n- La force du hook\n- La structure du contenu\n- L'efficacité du CTA\n- Des suggestions concrètes d'amélioration\n- Une note globale sur 10",
    needsContext: 'latestPost',
  },
  {
    id: 'content-ideas',
    label: 'Suggérer des idées de contenu',
    icon: 'Lightbulb',
    prompt: "Propose-moi 5 idées de posts LinkedIn originales et engageantes adaptées à mon profil et à mon historique de publication. Pour chaque idée :\n- Un titre accrocheur\n- L'angle à adopter\n- Le format recommandé (storytelling, listicle, how-to, etc.)\n- Un exemple de hook d'ouverture",
    needsContext: 'posts',
  },
  {
    id: 'strategy',
    label: 'Optimiser ma stratégie',
    icon: 'Target',
    prompt: "Analyse ma stratégie de publication LinkedIn actuelle en te basant sur mes posts et mes métriques. Donne-moi :\n- Un diagnostic de ma fréquence et de mes horaires de publication\n- L'analyse de mes formats les plus performants\n- Des recommandations pour améliorer mon taux d'engagement\n- Un plan d'action concret pour les 2 prochaines semaines",
    needsContext: 'posts',
  },
  {
    id: 'engagement',
    label: 'Conseils pour augmenter l\'engagement',
    icon: 'TrendingUp',
    prompt: "Donne-moi des conseils avancés et actionnables pour augmenter significativement mon engagement sur LinkedIn. Couvre :\n- L'optimisation du timing de publication\n- Les techniques d'écriture qui génèrent le plus de réactions\n- Comment encourager les commentaires et les partages\n- Les erreurs courantes à éviter\n- Des astuces spécifiques à l'algorithme LinkedIn actuel",
    needsContext: 'none',
  },
];

// ============================================================
// Store interface
// ============================================================

interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isTyping: boolean;
  unreadCount: number;

  // Actions
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  sendMessage: (content: string, role?: 'user' | 'assistant') => void;
  setTyping: (typing: boolean) => void;
  clearChat: () => void;
  markAsRead: () => void;
  loadPersistedMessages: () => void;
}

// ============================================================
// Store
// ============================================================

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isOpen: false,
  isTyping: false,
  unreadCount: 0,

  setOpen: (open) => {
    set({ isOpen: open });
    if (open) {
      get().markAsRead();
    }
  },

  toggleOpen: () => {
    const isOpen = !get().isOpen;
    set({ isOpen });
    if (isOpen) {
      get().markAsRead();
    }
  },

  sendMessage: (content, role = 'user') => {
    const newMessage: ChatMessage = {
      id: generateId(),
      role,
      content,
      timestamp: Date.now(),
    };

    set((state) => {
      const updated = [...state.messages, newMessage].slice(-MAX_MESSAGES);
      persistMessages(updated);

      // Increment unread for assistant messages when chat is closed
      const unreadIncrement = role === 'assistant' && !state.isOpen ? 1 : 0;

      return {
        messages: updated,
        unreadCount: state.unreadCount + unreadIncrement,
      };
    });
  },

  setTyping: (typing) => {
    set({ isTyping: typing });
  },

  clearChat: () => {
    set({ messages: [], unreadCount: 0 });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  markAsRead: () => {
    set({ unreadCount: 0 });
  },

  loadPersistedMessages: () => {
    const persisted = loadMessages();
    set({ messages: persisted });
  },
}));
