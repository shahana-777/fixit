/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { User, GraduationCap, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { Message, ConfusionType } from '../../types';
import { cn } from '../../lib/utils';

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isTyping }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-10 space-y-8 scroll-smooth">
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col w-full mb-8 pt-2"
          >
            <div className="flex flex-col w-full gap-3">
              {message.role === 'user' && (
                <span className="text-sm font-bold text-gray-800 ml-1">Your Question:</span>
              )}
              {message.role === 'assistant' && (
                <span className="text-sm font-bold text-gray-800 ml-1 text-center">Answer:</span>
              )}

              <div className={cn(
                "edu-box w-full transition-all duration-300",
                message.role === 'user' ? "edu-question" : "edu-answer"
              )}>
                <div className="prose max-w-none">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
                
                {message.imageUrl && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-6 border-t border-gray-200 pt-6"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Visual Representation:</p>
                    <img 
                      src={message.imageUrl} 
                      alt="Visual exploration" 
                      className="w-full h-auto rounded-sm border border-gray-200 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                )}
              </div>

              {message.role === 'assistant' && message.confusionMeta && message.confusionMeta.type !== ConfusionType.NONE && (
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 border border-gray-200 rounded-sm w-fit mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Insight: {message.confusionMeta.type}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {isTyping && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-3 w-full"
        >
          <span className="text-sm font-bold text-gray-800 ml-1 text-center">Answer:</span>
          <div className="edu-box edu-answer w-full flex items-center justify-center p-12">
            <div className="flex gap-2 items-center">
              <span className="w-2 h-2 bg-edu-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 bg-edu-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 bg-edu-primary rounded-full animate-bounce"></span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
