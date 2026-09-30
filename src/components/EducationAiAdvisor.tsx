import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, RefreshCw, ChevronDown, ChevronUp, BookOpen, GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { apiFetch } from '../lib/apiClient';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export default function EducationAiAdvisor() {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: i18n.language === 'az'
        ? 'Salam! Mən **FF AI Təhsil Bələdçisiyəm**. Bakıdakı dəb və dizayn universitetləri, qəbul qaydaları, təhsil haqları, yaradıcılıq qabiliyyət imtahanları və peşə kursları haqqında suallarınızı verə bilərsiniz.'
        : i18n.language === 'en'
        ? 'Hello! I am your **FF AI Fashion Education Advisor**. Ask me anything about fashion universities in Baku, admissions, portfolio requirements, tuition fees, and courses.'
        : 'Здравствуйте! Я ваш **FF AI Консультант по образованию в сфере моды**. Задайте мне любой вопрос о поступлении в ВУЗы Баку (ADRA, ADMİU, Western Caspian), требованиях к творческому портфолио, стоимости и курсах.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const starterQuestions = [
    {
      az: 'Hansı universitetlərdə geyim dizaynı fakültəsi var?',
      ru: 'В каких ВУЗах Баку есть факультет дизайна одежды?',
      en: 'Which universities in Baku offer fashion design degrees?'
    },
    {
      az: 'ADRA-ya qəbul üçün portfolioda nələr olmalıdır?',
      ru: 'Что должно быть в творческом портфолио для поступления в ADRA?',
      en: 'What are the portfolio requirements for admission to ADRA?'
    },
    {
      az: 'Təhsil haqları nə qədərdir və dövlət sifarişi (qrant) varmı?',
      ru: 'Сколько стоит обучение и есть ли гранты (Dövlət sifarişi)?',
      en: 'What is the tuition fee and are government scholarships available?'
    },
    {
      az: 'Sıfırdan başlayanlar üçün hansı peşə mərkəzləri və kurslar var?',
      ru: 'Какие профессиональные курсы и лицеи есть для начинающих с нуля?',
      en: 'Which vocational schools and courses are best for beginners?'
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [messages, isExpanded]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: textToSend.trim(),
      timestamp: Date.now()
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);
    if (!isExpanded) setIsExpanded(true);

    try {
      const apiHistory = newHistory.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        text: m.content
      }));

      const res = await apiFetch('/api/education-ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend.trim(),
          history: apiHistory,
          locale: i18n.language || 'ru'
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      const botReply = data.reply || 'Извините, не удалось сформировать ответ. Попробуйте еще раз.';

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: botReply,
          timestamp: Date.now()
        }
      ]);
    } catch (err: any) {
      console.error('AI Chat Error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: i18n.language === 'az'
            ? 'Bağışlayın, cavab hazırlanarkən xəta baş verdi. Zəhmət olmasa bir az sonra yenidən cəhd edin.'
            : 'Извините, произошла ошибка связи с AI консультантом. Пожалуйста, повторите вопрос через несколько секунд.',
          timestamp: Date.now()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: i18n.language === 'az'
          ? 'Söhbət yeniləndi! Dəb təhsili ilə bağlı nəyi öyrənmək istəyirsiniz?'
          : 'Чат очищен! Задайте любой вопрос по поступлению, учебным заведениям и программам моды.'
      }
    ]);
  };

  return (
    <div className="mb-8 rounded-3xl border border-brand-dark/[0.08] bg-white shadow-xs overflow-hidden transition-all">
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 sm:p-6 bg-gradient-to-r from-brand-dark via-stone-900 to-brand-dark text-white flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none hover:opacity-95 transition-all"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-brand-accent text-white flex items-center justify-center border border-white/20 shadow-xs shrink-0">
            <GraduationCap size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-xl font-display font-bold uppercase tracking-tight text-white">
                FF AI Education Advisor
              </h3>
              <span className="bg-brand-accent/30 border border-brand-accent/50 text-white text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Academic AI
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-300 font-normal mt-0.5">
              {i18n.language === 'az' 
                ? 'Universitetlər, qəbul imtahanları və təhsil proqramları üzrə süni intellekt bələdçisi' 
                : 'Умный гид по ВУЗам, поступлению, портфолио и грантам в Баку'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClearChat();
            }}
            title="Reset Chat"
            className="px-3 py-1.5 text-white/75 hover:text-white hover:bg-white/10 rounded-full transition-colors text-xs font-mono uppercase flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80">
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </div>

      {/* Collapsed Preview or Expanded Chat Area */}
      {isExpanded ? (
        <div className="p-5 sm:p-6 flex flex-col bg-stone-50/50">
          {/* Quick Starter Chips */}
          <div className="mb-5">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-brand-dark/50 mb-2.5 flex items-center gap-1.5">
              <Sparkles size={13} className="text-brand-accent" />
              <span>Частые вопросы / Tez-tez verilən suallar:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {starterQuestions.map((q, idx) => {
                const text = i18n.language === 'az' ? q.az : i18n.language === 'en' ? q.en : q.ru;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(text)}
                    className="text-xs bg-white text-brand-dark px-3.5 py-2 rounded-full border border-brand-dark/10 hover:border-brand-accent hover:text-brand-accent transition-all text-left shadow-2xs font-normal"
                  >
                    {text}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat Messages Log */}
          <div className="h-72 sm:h-96 overflow-y-auto space-y-3.5 pr-2 mb-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-brand-accent text-white flex items-center justify-center shrink-0 text-xs font-bold mt-1 shadow-2xs">
                    <Bot size={16} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs sm:text-sm shadow-2xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-dark text-white rounded-tr-sm'
                      : 'bg-white text-brand-dark border border-brand-dark/[0.08] rounded-tl-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-xs sm:prose-sm max-w-none prose-p:my-1 prose-headings:my-1.5 prose-strong:text-brand-accent">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span>{msg.content}</span>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 rounded-full bg-brand-accent text-white flex items-center justify-center shrink-0">
                  <Bot size={16} />
                </div>
                <div className="bg-white border border-brand-dark/[0.08] p-3.5 rounded-2xl text-xs font-mono text-brand-dark/60 flex items-center gap-2 shadow-2xs">
                  <div className="w-2 h-2 rounded-full bg-brand-accent animate-ping" />
                  <span>Печатает ответ...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative flex items-center"
          >
            <input
              type="text"
              placeholder={
                i18n.language === 'az'
                  ? 'Dəb təhsili, qəbul və ya kurslar haqqında sualınızı yazın...'
                  : 'Спросите о поступлении, направлениях дизайна или стоимости...'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="w-full bg-white border border-brand-dark/15 rounded-full pl-5 pr-14 py-3 text-xs sm:text-sm text-brand-dark focus:outline-none focus:border-brand-accent/50 focus:ring-1 focus:ring-brand-accent/30 placeholder:text-brand-dark/40 shadow-2xs transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-brand-accent text-white flex items-center justify-center hover:bg-brand-dark transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      ) : (
        <div className="px-5 py-3.5 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-brand-dark/70 truncate">
            <Sparkles size={14} className="text-brand-accent shrink-0" />
            <span className="truncate">
              {i18n.language === 'az'
                ? 'ADRA, ADMİU və digər dəb institutlarına qəbul qaydaları haqqında soruşun.'
                : 'Задайте вопрос ИИ о поступлении в ADRA, ADMİU, портфолио и грантах.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="px-4 py-1.5 rounded-full bg-brand-dark text-white hover:bg-brand-accent transition-colors font-semibold uppercase tracking-wider text-[11px] shrink-0 shadow-2xs"
          >
            Открыть чат
          </button>
        </div>
      )}
    </div>
  );
}
