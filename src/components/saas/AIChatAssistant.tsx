'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useAppStore } from '@/store/use-app-store';
import { useChatStore, QUICK_ACTIONS } from '@/store/use-chat-store';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles,
  Send,
  X,
  Trash2,
  BarChart3,
  Lightbulb,
  Target,
  TrendingUp,
  Bot,
} from 'lucide-react';
import type { ChatMessage, QuickAction } from '@/store/use-chat-store';
import type { Post } from '@/types';

// ============================================================
// Icon mapping for quick actions
// ============================================================

const QUICK_ACTION_ICONS: Record<string, React.ReactNode> = {
  BarChart3: <BarChart3 className="w-4 h-4" />,
  Lightbulb: <Lightbulb className="w-4 h-4" />,
  Target: <Target className="w-4 h-4" />,
  TrendingUp: <TrendingUp className="w-4 h-4" />,
};

// ============================================================
// Typing indicator
// ============================================================

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 px-4 py-2">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex items-center gap-1.5">
          <motion.span
            className="w-2 h-2 rounded-full bg-muted-foreground/50"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="w-2 h-2 rounded-full bg-muted-foreground/50"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
          />
          <motion.span
            className="w-2 h-2 rounded-full bg-muted-foreground/50"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Chat message bubble
// ============================================================

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-start gap-2.5 px-4 py-2',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}

      {/* Message content */}
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-md'
            : 'bg-muted text-foreground rounded-tl-md'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none overflow-wrap-anywhere [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-words [&_ol]:pl-4 [&_ul]:pl-4 [&_li]:mb-1 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_h1]:text-base [&_h1]:mb-1 [&_h2]:text-[15px] [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================
// Quick action button
// ============================================================

function QuickActionChip({
  action,
  onClick,
}: {
  action: QuickAction;
  onClick: (action: QuickAction) => void;
}) {
  return (
    <button
      onClick={() => onClick(action)}
      className={cn(
        'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium',
        'bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground',
        'border border-border/50 hover:border-border',
        'transition-all duration-200 w-full text-left',
        'hover:shadow-sm active:scale-[0.98]'
      )}
    >
      <span className="text-primary">{QUICK_ACTION_ICONS[action.icon]}</span>
      <span className="truncate">{action.label}</span>
    </button>
  );
}

// ============================================================
// Empty state (welcome + quick actions)
// ============================================================

function WelcomeState({
  onQuickAction,
}: {
  onQuickAction: (action: QuickAction) => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-4">
        <Sparkles className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-base font-semibold mb-1">Assistant IA DataSphere</h3>
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-[240px]">
        Votre expert en stratégie LinkedIn. Comment puis-je vous aider ?
      </p>
      <div className="w-full space-y-2 max-w-[300px]">
        {QUICK_ACTIONS.map((action) => (
          <QuickActionChip
            key={action.id}
            action={action}
            onClick={onQuickAction}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Main AIChatAssistant component
// ============================================================

export default function AIChatAssistant() {
  const messages = useChatStore((s) => s.messages);
  const isOpen = useChatStore((s) => s.isOpen);
  const isTyping = useChatStore((s) => s.isTyping);
  const unreadCount = useChatStore((s) => s.unreadCount);
  const toggleOpen = useChatStore((s) => s.toggleOpen);
  const setOpen = useChatStore((s) => s.setOpen);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const setTyping = useChatStore((s) => s.setTyping);
  const clearChat = useChatStore((s) => s.clearChat);
  const loadPersistedMessages = useChatStore((s) => s.loadPersistedMessages);

  const currentView = useAppStore((s) => s.currentView);
  const selectedPostId = useAppStore((s) => s.selectedPostId);

  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load persisted messages on mount
  useEffect(() => {
    loadPersistedMessages();
  }, [loadPersistedMessages]);

  // Auto-scroll to bottom when messages change or typing starts
  // Uses Radix ScrollArea viewport directly for reliable scrolling
  useEffect(() => {
    const timer = setTimeout(() => {
      const viewport = messagesEndRef.current?.closest(
        '[data-slot="scroll-area-viewport"]'
      );
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'smooth',
        });
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100); // Small delay to let content render
    return () => clearTimeout(timer);
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [inputValue]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // ============================================================
  // Send message to API
  // ============================================================

  const sendToAI = useCallback(
    async (userMessage: string, extraContext?: Record<string, string>) => {
      if (isSending) return;

      // Add user message
      sendMessage(userMessage, 'user');
      setInputValue('');
      setIsSending(true);
      setTyping(true);

      try {
        // Build messages for API (exclude system messages)
        const currentMessages = useChatStore.getState().messages;
        const apiMessages = currentMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        // Build context
        const context: Record<string, string> = {
          currentView,
        };

        if (selectedPostId) {
          context.selectedPostId = selectedPostId;
        }

        // Merge extra context
        if (extraContext) {
          Object.assign(context, extraContext);
        }

        const data = await apiFetch<{ message: string }>('/api/chat', {
          method: 'POST',
          body: JSON.stringify({
            messages: apiMessages,
            context,
          }),
        });

        // Add assistant response
        sendMessage(data.message, 'assistant');
      } catch (error) {
        console.error('[AIChat] Error:', error);
        sendMessage(
          "Désolé, une erreur est survenue lors de la génération de la réponse. Veuillez réessayer.",
          'assistant'
        );
      } finally {
        setIsSending(false);
        setTyping(false);
      }
    },
    [isSending, currentView, selectedPostId, sendMessage, setTyping]
  );

  // ============================================================
  // Quick action handler
  // ============================================================

  const handleQuickAction = useCallback(
    async (action: QuickAction) => {
      if (isSending) return;

      // For "analyze latest post", fetch the latest post first
      if (action.needsContext === 'latestPost') {
        try {
          const data = await apiFetch<{ posts: Post[] }>(
            '/api/posts?status=posted&limit=1'
          );
          if (data.posts.length > 0) {
            const post = data.posts[0];
            await sendToAI(action.prompt, {
              selectedPostId: post.id,
            });
          } else {
            // No posted posts yet
            sendMessage(action.prompt, 'user');
            setIsSending(true);
            setTyping(true);
            setTimeout(() => {
              sendMessage(
                "Vous n'avez pas encore de posts publiés. Publiez votre premier post LinkedIn, puis revenez me voir pour une analyse détaillée ! En attendant, je peux vous aider à :",
                'assistant'
              );
              setIsSending(false);
              setTyping(false);
            }, 800);
          }
        } catch {
          await sendToAI(action.prompt);
        }
      } else if (action.needsContext === 'posts') {
        // Include post context for strategy/content ideas
        await sendToAI(action.prompt);
      } else {
        await sendToAI(action.prompt);
      }
    },
    [isSending, sendToAI, sendMessage, setTyping]
  );

  // ============================================================
  // Form submit handler
  // ============================================================

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed || isSending) return;
      sendToAI(trimmed);
    },
    [inputValue, isSending, sendToAI]
  );

  // ============================================================
  // Keyboard handler for textarea
  // ============================================================

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  // ============================================================
  // Render
  // ============================================================

  const hasMessages = messages.length > 0;

  return (
    <>
      {/* Chat Toggle Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            onClick={toggleOpen}
            className={cn(
              'fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg',
              'flex items-center justify-center',
              'gradient-primary text-white',
              'hover:shadow-xl hover:scale-105',
              'transition-shadow duration-200',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={
              isOpen
                ? 'Fermer l\'assistant IA'
                : 'Ouvrir l\'assistant IA'
            }
          >
            {/* Pulse ring when unread */}
            {!isOpen && unreadCount > 0 && (
              <motion.span
                className="absolute inset-0 rounded-full gradient-primary"
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ zIndex: -1 }}
              />
            )}

            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="w-6 h-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="sparkles"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Sparkles className="w-6 h-6" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Unread badge */}
            {!isOpen && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-[11px] font-bold text-white shadow-md border-2 border-background">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="left">
          {isOpen ? 'Fermer l\'assistant' : 'Assistant IA'}
        </TooltipContent>
      </Tooltip>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed bottom-24 right-5 z-50',
              'w-[calc(100vw-2.5rem)] sm:w-[400px]',
              'h-[min(600px,calc(100dvh-8rem))]',
              'bg-background border border-border rounded-2xl shadow-2xl',
              'flex flex-col overflow-hidden',
              'backdrop-blur-xl'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold leading-tight">
                    Assistant IA DataSphere
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {isTyping ? 'En train de réfléchir...' : 'En ligne'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={clearChat}
                      aria-label="Effacer la conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Effacer la conversation</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setOpen(false)}
                      aria-label="Fermer"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Fermer</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Messages area */}
            {!hasMessages ? (
              <WelcomeState onQuickAction={handleQuickAction} />
            ) : (
              <>
                <ScrollArea className="flex-1 py-2 chat-messages-scroll">
                  <div className="flex flex-col">
                    {messages.map((message) => (
                      <ChatMessageBubble key={message.id} message={message} />
                    ))}
                    {isTyping && <TypingIndicator />}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Quick actions row (when there are messages) */}
                {messages.length <= 2 && (
                  <div className="px-4 py-2 border-t border-border/50">
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none-x">
                      {QUICK_ACTIONS.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => handleQuickAction(action)}
                          disabled={isSending}
                          className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap',
                            'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground',
                            'border border-transparent hover:border-border/50',
                            'transition-all duration-150',
                            'disabled:opacity-50 disabled:cursor-not-allowed'
                          )}
                        >
                          {QUICK_ACTION_ICONS[action.icon]}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Input area */}
            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-2 px-4 py-3 border-t border-border bg-muted/20"
            >
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrivez votre message..."
                disabled={isSending}
                rows={1}
                className={cn(
                  'flex-1 resize-none bg-background border border-border rounded-xl px-3.5 py-2.5',
                  'text-sm placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'max-h-[120px] min-h-[38px]'
                )}
                aria-label="Message pour l'assistant IA"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim() || isSending}
                className={cn(
                  'h-[38px] w-[38px] rounded-xl shrink-0',
                  'gradient-primary text-white',
                  'hover:opacity-90 disabled:opacity-40',
                  'transition-opacity duration-150'
                )}
                aria-label="Envoyer le message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
