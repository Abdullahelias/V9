import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Volume2, Loader2, Play, Pause, TrendingUp, Calendar, DollarSign } from "lucide-react";
import { supabase, type SurveyResponse } from "../../lib/supabase";

const isSupabaseConfigured = Boolean(supabase);

const QUESTIONS = [
  { id: 1, label: "FREQUENCY" },
  { id: 2, label: "PURPOSE" },
  { id: 3, label: "IMPACT" },
  { id: 4, label: "BUDGET" },
];

const THEME_IMAGES: Record<number, { url: string; alt: string; tall?: boolean }[]> = {
  1: [
    { url: "https://images.unsplash.com/photo-1758797316165-986ec92e7ad2?w=800&h=600&fit=crop&auto=format", alt: "Group relaxing on a retreat porch" },
    { url: "https://images.unsplash.com/photo-1779583654685-cd9a0be3c23b?w=800&h=1000&fit=crop&auto=format", alt: "Stone labyrinth near a lake", tall: true },
  ],
  2: [
    { url: "https://images.unsplash.com/photo-1517456793572-1d8efd6dc135?w=800&h=600&fit=crop&auto=format", alt: "Community gathering" },
    { url: "https://images.unsplash.com/photo-1563902242731-bcde8ffa1d36?w=800&h=500&fit=crop&auto=format", alt: "People sitting together" },
  ],
  3: [
    { url: "https://images.unsplash.com/photo-1732383970910-3e9032719886?w=800&h=1000&fit=crop&auto=format", alt: "Forest stream through trees", tall: true },
    { url: "https://images.unsplash.com/photo-1762689744282-a2de3fd6dae0?w=800&h=500&fit=crop&auto=format", alt: "Golden sunlight on open field" },
  ],
  4: [
    { url: "https://images.unsplash.com/photo-1582641857491-7e9987c2e415?w=800&h=500&fit=crop&auto=format", alt: "Sunset horizon" },
    { url: "https://images.unsplash.com/photo-1768659051822-f343e79e786c?w=800&h=1000&fit=crop&auto=format", alt: "Stupa on misty mountainside", tall: true },
  ],
};

function AudioPlayback({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Create audio element
    const audio = new Audio(url);
    audioRef.current = audio;

    // Set duration when metadata loads
    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };

    // Handle playback end
    audio.onended = () => {
      setPlaying(false);
      setElapsed(0);
      if (tickRef.current) clearInterval(tickRef.current);
    };

    // Cleanup
    return () => {
      audio.pause();
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [url]);
  
  const toggle = () => {
    if (!audioRef.current) return;
    
    if (playing) {
      // Pause
      audioRef.current.pause();
      if (tickRef.current) clearInterval(tickRef.current);
      setPlaying(false);
    } else {
      // Play
      audioRef.current.play();
      tickRef.current = setInterval(() => {
        setElapsed(audioRef.current?.currentTime ?? 0);
      }, 100);
      setPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const pct = duration > 0 ? (elapsed / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 w-full">
      <button
        onClick={toggle}
        className="flex-shrink-0 w-7 h-7 flex items-center justify-center border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        {playing ? <Pause size={12} /> : <Play size={12} />}
      </button>
      <div className="flex-1 relative h-px bg-border">
        <div 
          className="absolute top-0 left-0 h-px bg-primary transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className="text-[10px] text-muted-foreground flex-shrink-0 tabular-nums"
        style={{ fontFamily: "'DM Mono', monospace" }}
      >
        {formatTime(elapsed)} / {formatTime(duration)}
      </span>
    </div>
  );
}

export function AllResponsesGallery({ onBack }: { onBack: () => void }) {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResponses() {
      if (!isSupabaseConfigured || !supabase) {
        // When Supabase is not configured, show a message explaining how to enable cross-user sharing
        console.log('Supabase is not configured');
        setError(null);
        setResponses([]); // No responses available without Supabase
        setLoading(false);
        return;
      }

      try {
        console.log('Attempting to fetch responses from Supabase...');
        const { data, error } = await supabase
          .from('survey_responses')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase query error:', error);
          throw new Error(`Database error: ${error.message}`);
        }
        
        console.log('Successfully loaded responses:', data?.length || 0);
        setResponses(data || []);
        setError(null);
      } catch (err) {
        console.error('Error loading responses:', err);
        setError(err instanceof Error ? err.message : 'Failed to load responses');
      } finally {
        setLoading(false);
      }
    }

    loadResponses();
  }, []);

  const sessionDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
            Loading all responses...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="max-w-md text-center">
          <p className="text-sm text-destructive mb-4">{error}</p>
          <button
            onClick={onBack}
            className="flex items-center gap-2 mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors border border-border hover:border-foreground/30 px-3 py-1.5"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            <ArrowLeft size={11} />
            BACK TO FORM
          </button>
        </div>
      </div>
    );
  }

  // Build tiles from ALL responses
  const tiles: React.ReactNode[] = [];
  let tileKey = 0;

  // ===== ANALYTICS & INSIGHTS =====
  
  // Calculate statistics
  const totalResponses = responses.length;
  const responseRateByQuestion = QUESTIONS.map(q => {
    const textCount = responses.filter(r => {
      const text = (r as any)[`question_${q.id}_text`];
      return text && text.trim().length > 0;
    }).length;
    const audioCount = responses.filter(r => {
      const audio = (r as any)[`question_${q.id}_audio_url`];
      return audio && audio.trim().length > 0;
    }).length;
    return {
      name: `Q${q.id}`,
      question: q.label,
      questionNum: q.id,
      text: textCount,
      audio: audioCount,
      total: textCount + audioCount,
    };
  });

  // Word count analysis
  const wordCountsByQuestion = QUESTIONS.map(q => {
    const allTexts = responses
      .map(r => (r as any)[`question_${q.id}_text`] || '')
      .filter(t => t.trim().length > 0);
    
    const totalWords = allTexts.reduce((sum, text) => {
      return sum + text.trim().split(/\s+/).length;
    }, 0);
    
    const avgWords = allTexts.length > 0 ? Math.round(totalWords / allTexts.length) : 0;
    
    return {
      name: `Q${q.id}`,
      avgWords,
      responses: allTexts.length,
    };
  });

  // Extract common themes (simple keyword extraction)
  const extractKeywords = (texts: string[]): { word: string; count: number }[] => {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'my', 'your', 'their']);
    
    const wordCounts: Record<string, number> = {};
    
    texts.forEach(text => {
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w));
      
      words.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
    });
    
    return Object.entries(wordCounts)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  };

  // Get all text responses
  const allTextResponses: string[] = [];
  QUESTIONS.forEach(q => {
    responses.forEach(r => {
      const text = (r as any)[`question_${q.id}_text`];
      if (text && text.trim().length > 0) {
        allTextResponses.push(text);
      }
    });
  });

  const topKeywords = extractKeywords(allTextResponses);

  // ===== EXTRACT NUMERICAL DATA =====
  
  // Extract retreat frequency numbers from Q1
  const extractRetreatFrequency = (text: string): number | null => {
    const lower = text.toLowerCase();
    
    // Look for explicit numbers like "3", "4-5", "10"
    const numberMatches = text.match(/\b(\d+)(?:\s*-\s*(\d+))?\s*(?:retreat|training|gathering|time|event|per|annually|yearly|year)?/i);
    if (numberMatches) {
      const num1 = parseInt(numberMatches[1]);
      const num2 = numberMatches[2] ? parseInt(numberMatches[2]) : null;
      // If range like "3-4", take the average
      return num2 ? (num1 + num2) / 2 : num1;
    }
    
    // Look for word-based frequencies
    if (lower.includes('weekly') || lower.includes('every week')) return 52;
    if (lower.includes('biweekly') || lower.includes('bi-weekly') || lower.includes('every other week')) return 26;
    if (lower.includes('monthly') || lower.includes('every month')) return 12;
    if (lower.includes('bimonthly') || lower.includes('bi-monthly')) return 6;
    if (lower.includes('quarterly') || lower.includes('every quarter')) return 4;
    if (lower.includes('twice a year') || lower.includes('semi-annual')) return 2;
    if (lower.includes('annual') || lower.includes('once a year') || lower.includes('one per year')) return 1;
    
    // Word numbers
    const wordNumbers: Record<string, number> = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'once': 1, 'twice': 2, 'thrice': 3
    };
    
    for (const [word, num] of Object.entries(wordNumbers)) {
      if (lower.includes(word)) return num;
    }
    
    return null;
  };
  
  // Extract budget amounts from Q4
  const extractBudgetAmount = (text: string): number | null => {
    const lower = text.toLowerCase();
    
    // Look for dollar amounts with K or thousand
    const dollarKMatch = text.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*[kK](?:\s|$|\.)/);
    if (dollarKMatch) {
      return parseFloat(dollarKMatch[1].replace(/,/g, '')) * 1000;
    }
    
    // Look for explicit dollar amounts
    const dollarMatch = text.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)/);
    if (dollarMatch) {
      return parseFloat(dollarMatch[1].replace(/,/g, ''));
    }
    
    // Look for number followed by "thousand"
    const thousandMatch = text.match(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*thousand/i);
    if (thousandMatch) {
      return parseFloat(thousandMatch[1].replace(/,/g, '')) * 1000;
    }
    
    // Look for number followed by "million"
    const millionMatch = text.match(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*million/i);
    if (millionMatch) {
      return parseFloat(millionMatch[1].replace(/,/g, '')) * 1000000;
    }
    
    // Look for standalone numbers (assume dollars if > 100, otherwise might be percentage)
    const plainNumberMatch = text.match(/\b(\d+(?:,\d{3})*)\b/);
    if (plainNumberMatch) {
      const num = parseFloat(plainNumberMatch[1].replace(/,/g, ''));
      // Only consider as dollar amount if it's reasonably large (> 100)
      if (num > 100 && num < 10000000) {
        return num;
      }
    }
    
    return null;
  };
  
  // Calculate average retreat frequency
  const frequencyData = responses
    .map(r => (r as any).question_1_text || '')
    .filter(t => t.trim().length > 0)
    .map(text => extractRetreatFrequency(text))
    .filter((n): n is number => n !== null && n > 0 && n < 365); // Filter out nulls and unrealistic values
  
  const avgRetreatFrequency = frequencyData.length > 0
    ? frequencyData.reduce((sum, n) => sum + n, 0) / frequencyData.length
    : null;
  
  // Calculate average budget
  const budgetData = responses
    .map(r => (r as any).question_4_text || '')
    .filter(t => t.trim().length > 0)
    .map(text => extractBudgetAmount(text))
    .filter((n): n is number => n !== null && n > 0 && n < 100000000); // Filter out nulls and unrealistic values
  
  const avgBudget = budgetData.length > 0
    ? budgetData.reduce((sum, n) => sum + n, 0) / budgetData.length
    : null;
  
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    } else {
      return `$${Math.round(amount)}`;
    }
  };

  // ===== BUILD TILES WITH ANALYTICS INTERSPERSED =====

  // Add KEY METRICS DASHBOARD at the very beginning
  if (avgRetreatFrequency !== null && avgBudget !== null && frequencyData.length > 0 && budgetData.length > 0) {
    const totalBudget = budgetData.reduce((sum, n) => sum + n, 0);
    const totalFrequency = frequencyData.reduce((sum, n) => sum + n, 0);
    
    tiles.push(
      <div key="key-metrics-dashboard" className="break-inside-avoid mb-3 col-span-full border-2 border-primary bg-gradient-to-br from-primary/10 to-accent/10 p-6 space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-primary" />
          <span className="text-[10px] text-primary tracking-[0.25em] uppercase font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>
            KEY METRICS DASHBOARD
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Average Frequency */}
          <div className="border border-primary/30 bg-background/80 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Calendar size={11} className="text-primary" />
              <span className="text-[8px] text-primary tracking-[0.2em] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
                AVG FREQUENCY
              </span>
            </div>
            <div className="text-3xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
              {avgRetreatFrequency.toFixed(1)}
            </div>
            <div className="text-[9px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
              retreats per year (avg)
            </div>
          </div>

          {/* Collective Frequency */}
          <div className="border border-accent/30 bg-background/80 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Calendar size={11} className="text-accent" />
              <span className="text-[8px] text-accent tracking-[0.2em] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
                COLLECTIVE FREQUENCY
              </span>
            </div>
            <div className="text-3xl font-bold text-accent" style={{ fontFamily: "'Playfair Display', serif" }}>
              {Math.round(totalFrequency)}
            </div>
            <div className="text-[9px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
              total retreats per year
            </div>
          </div>

          {/* Average Budget */}
          <div className="border border-primary/30 bg-background/80 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign size={11} className="text-primary" />
              <span className="text-[8px] text-primary tracking-[0.2em] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
                AVG ANNUAL BUDGET
              </span>
            </div>
            <div className="text-3xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
              {formatCurrency(avgBudget)}
            </div>
            <div className="text-[9px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
              per organization
            </div>
          </div>

          {/* Collective Budget */}
          <div className="border border-accent/30 bg-background/80 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign size={11} className="text-accent" />
              <span className="text-[8px] text-accent tracking-[0.2em] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
                COLLECTIVE BUDGET
              </span>
            </div>
            <div className="text-3xl font-bold text-accent" style={{ fontFamily: "'Playfair Display', serif" }}>
              {formatCurrency(totalBudget)}
            </div>
            <div className="text-[9px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
              total annual investment
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-primary/20">
          <p className="text-[10px] text-foreground/70 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
            Based on {Math.min(frequencyData.length, budgetData.length)} organizations with complete data
          </p>
        </div>
      </div>
    );
  }

  // Add overview stats card at the beginning
  if (totalResponses > 0) {
    tiles.push(
      <div key="overview-stats" className="break-inside-avoid mb-3 border-2 border-primary bg-primary/5 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={12} className="text-primary" />
          <span className="text-[9px] text-primary tracking-[0.2em] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
            SURVEY INSIGHTS
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-3xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
              {totalResponses}
            </div>
            <div className="text-[10px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
              Total Responses
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
              {responses.filter(r => 
                [1, 2, 3, 4].some(qId => (r as any)[`question_${qId}_audio_url`])
              ).length}
            </div>
            <div className="text-[10px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
              Audio Submissions
            </div>
          </div>
        </div>
        <div className="pt-2 border-t border-primary/20">
          <div className="text-[11px] text-foreground leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
            Community voices on retreat work for social movements
          </div>
        </div>
      </div>
    );
  }

  // Add response rate chart
  if (totalResponses > 0) {
    tiles.push(
      <div key="response-rate-summary" className="break-inside-avoid mb-3 border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
            RESPONSES BY QUESTION
          </span>
        </div>
        <div className="space-y-2">
          {responseRateByQuestion.map(q => (
            <div key={q.questionNum} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {q.name}
                </span>
                <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {q.total} {q.total === 1 ? 'response' : 'responses'}
                </span>
              </div>
              <div className="h-1.5 bg-muted relative overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-primary transition-all"
                  style={{ width: `${(q.total / totalResponses) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Add keyword frequency card
  if (topKeywords.length > 0) {
    tiles.push(
      <div key="keyword-frequency" className="break-inside-avoid mb-3 border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
            COMMON THEMES
          </span>
        </div>
        <div className="space-y-2">
          {topKeywords.map((kw, idx) => {
            const maxCount = topKeywords[0]?.count || 1;
            const percentage = (kw.count / maxCount) * 100;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-foreground capitalize" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {kw.word}
                  </span>
                  <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {kw.count}×
                  </span>
                </div>
                <div className="h-1 bg-muted relative overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-primary/60 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Add average word count summary
  if (wordCountsByQuestion.some(q => q.avgWords > 0)) {
    tiles.push(
      <div key="word-count-summary" className="break-inside-avoid mb-3 border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
            AVG WORDS PER RESPONSE
          </span>
        </div>
        <div className="space-y-2">
          {wordCountsByQuestion.map(q => (
            <div key={q.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {q.name}
                </span>
                <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {q.avgWords} words
                </span>
              </div>
              <div className="h-1.5 bg-muted relative overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-primary/70 transition-all"
                  style={{ width: `${Math.min((q.avgWords / 200) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Add retreat frequency analytics card
  if (avgRetreatFrequency !== null && frequencyData.length > 0) {
    tiles.push(
      <div key="retreat-frequency-avg" className="break-inside-avoid mb-3 border-2 border-primary/30 bg-primary/5 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar size={12} className="text-primary" />
          <span className="text-[9px] text-primary tracking-[0.2em] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
            AVG RETREAT FREQUENCY
          </span>
        </div>
        <div>
          <div className="text-4xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
            {avgRetreatFrequency.toFixed(1)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>
            retreats per year
          </div>
        </div>
        <div className="pt-2 border-t border-primary/20">
          <p className="text-[11px] text-foreground leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
            Based on {frequencyData.length} {frequencyData.length === 1 ? 'response' : 'responses'} with numerical data
          </p>
        </div>
      </div>
    );
  }

  // Add budget analytics card
  if (avgBudget !== null && budgetData.length > 0) {
    const totalBudget = budgetData.reduce((sum, n) => sum + n, 0);
    
    tiles.push(
      <div key="budget-avg" className="break-inside-avoid mb-3 border-2 border-primary/30 bg-primary/5 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <DollarSign size={12} className="text-primary" />
          <span className="text-[9px] text-primary tracking-[0.2em] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
            AVG ANNUAL BUDGET
          </span>
        </div>
        <div>
          <div className="text-4xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
            {formatCurrency(avgBudget)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>
            collective average
          </div>
        </div>
        <div className="pt-2 border-t border-primary/20">
          <p className="text-[11px] text-foreground leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
            Based on {budgetData.length} {budgetData.length === 1 ? 'response' : 'responses'} with budget amounts
          </p>
        </div>
      </div>
    );
    
    // Add total collective budget card
    tiles.push(
      <div key="budget-total" className="break-inside-avoid mb-3 border-2 border-accent/40 bg-accent/10 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={12} className="text-accent" />
          <span className="text-[9px] text-accent tracking-[0.2em] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
            COLLECTIVE INVESTMENT
          </span>
        </div>
        <div>
          <div className="text-4xl font-bold text-accent" style={{ fontFamily: "'Playfair Display', serif" }}>
            {formatCurrency(totalBudget)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>
            total annual spending
          </div>
        </div>
        <div className="pt-2 border-t border-accent/20">
          <p className="text-[11px] text-foreground leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
            Combined retreat budget from {budgetData.length} {budgetData.length === 1 ? 'organization' : 'organizations'}
          </p>
        </div>
      </div>
    );
  }

  // Add summary insights for each question
  QUESTIONS.forEach(q => {
    const textResponses = responses.filter(r => {
      const text = (r as any)[`question_${q.id}_text`];
      return text && text.trim().length > 0;
    });

    const audioResponses = responses.filter(r => {
      const audio = (r as any)[`question_${q.id}_audio_url`];
      return audio && audio.trim().length > 0;
    });

    // Generate simple summary
    const totalForQuestion = textResponses.length + audioResponses.length;
    const avgWords = textResponses.length > 0 
      ? Math.round(textResponses.reduce((sum, r) => {
          const text = (r as any)[`question_${q.id}_text`];
          return sum + text.trim().split(/\s+/).length;
        }, 0) / textResponses.length)
      : 0;

    if (totalForQuestion > 0) {
      tiles.push(
        <div key={`summary-${q.id}`} className="break-inside-avoid mb-3 border border-primary/40 bg-primary/5 p-4 space-y-2">
          <p className="text-[9px] text-primary tracking-[0.2em] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
            Q{q.id} SUMMARY
          </p>
          <p className="text-xs text-foreground leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
            {totalForQuestion} {totalForQuestion === 1 ? 'person' : 'people'} responded to "{q.label.toLowerCase()}"
            {textResponses.length > 0 && ` with an average of ${avgWords} words`}.
            {audioResponses.length > 0 && ` ${audioResponses.length} included audio responses.`}
          </p>
        </div>
      );
    }
  });

  // Add images first to establish visual rhythm
  QUESTIONS.forEach((q) => {
    const imgs = THEME_IMAGES[q.id] ?? [];
    
    // Label chip
    tiles.push(
      <div key={`label-${q.id}`} className="break-inside-avoid mb-3">
        <span className="inline-flex items-center bg-primary px-2.5 py-1">
          <span className="text-[9px] text-primary-foreground tracking-[0.2em] uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
            {String(q.id).padStart(2, "0")} — {q.label}
          </span>
        </span>
      </div>
    );

    // First image
    if (imgs[0]) {
      tiles.push(
        <div key={`img-${q.id}-0`} className="break-inside-avoid mb-3 overflow-hidden bg-muted">
          <img src={imgs[0].url} alt={imgs[0].alt} className="w-full object-cover block"
            style={{ height: imgs[0].tall ? "320px" : "200px" }} />
        </div>
      );
    }

    // Get text and audio responses for this specific question
    const textResponsesForQ = responses.filter(r => {
      const text = (r as any)[`question_${q.id}_text`];
      return text && text.trim().length > 0;
    });

    const audioResponsesForQ = responses.filter(r => {
      const audio = (r as any)[`question_${q.id}_audio_url`];
      return audio && audio.trim().length > 0;
    });

    // Add text response cards
    textResponsesForQ.forEach((response) => {
      const text = (response as any)[`question_${q.id}_text`];
      tiles.push(
        <div key={`text-${tileKey++}`} className="break-inside-avoid mb-3 border border-border bg-card p-5">
          <p className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>
            {q.label}
          </p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Inter', sans-serif" }}>
            &ldquo;{text}&rdquo;
          </p>
          {response.name && (
            <p className="text-[10px] text-muted-foreground mt-3" style={{ fontFamily: "'DM Mono', monospace" }}>
              — {response.name}
            </p>
          )}
        </div>
      );
    });

    // Add audio response cards
    audioResponsesForQ.forEach((response) => {
      const audioUrl = (response as any)[`question_${q.id}_audio_url`];
      tiles.push(
        <div key={`audio-${tileKey++}`} className="break-inside-avoid mb-3 border border-primary/30 bg-card/80 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Volume2 size={10} className="text-primary" />
            <span className="text-[9px] text-primary tracking-widest uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
              Audio — {q.label}
            </span>
          </div>
          <AudioPlayback url={audioUrl} />
          {response.name && (
            <p className="text-[10px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
              — {response.name}
            </p>
          )}
        </div>
      );
    });

    // Second image
    if (imgs[1]) {
      tiles.push(
        <div key={`img-${q.id}-1`} className="break-inside-avoid mb-3 overflow-hidden bg-muted">
          <img src={imgs[1].url} alt={imgs[1].alt} className="w-full object-cover block"
            style={{ height: imgs[1].tall ? "320px" : "200px" }} />
        </div>
      );
    }
  });

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10 bg-background">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border hover:border-foreground/30 px-3 py-1.5"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          <ArrowLeft size={11} />
          BACK TO FORM
        </button>
        <span className="text-[10px] text-muted-foreground tracking-widest" style={{ fontFamily: "'DM Mono', monospace" }}>
          BRC RETREAT CENTER SURVEY
        </span>
      </header>

      {/* Hero */}
      <div className="border-b border-border px-6 py-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-primary uppercase mb-2" style={{ fontFamily: "'DM Mono', monospace" }}>
            All Responses · {responses.length} {responses.length === 1 ? 'Submission' : 'Submissions'}
          </p>
          <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            COLLECTIVE
            <br />
            WISDOM
          </h1>
          <p className="mt-4 text-sm text-muted-foreground max-w-md">
            Voices from the movement sharing insights on retreat-based work for social change.
          </p>
        </div>
      </div>

      {/* Masonry board */}
      <div className="p-4 md:p-6">
        {!isSupabaseConfigured ? (
          <div className="max-w-2xl mx-auto text-center py-20 space-y-6">
            <div className="border-2 border-primary/30 bg-primary/5 p-8 space-y-4">
              <TrendingUp size={32} className="text-primary mx-auto" />
              <h2 className="text-2xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
                Cross-User Sharing Not Enabled
              </h2>
              <p className="text-sm text-foreground leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
                To view responses from all users and enable the analytics dashboard, you need to deploy this app 
                with Supabase configured. Follow the instructions in <code className="text-xs bg-muted px-2 py-0.5 rounded">SUPABASE_SETUP.md</code> to:
              </p>
              <ul className="text-left text-sm text-muted-foreground space-y-2 max-w-md mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Create a free Supabase project</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Set up the database tables</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Add environment variables to Netlify</span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground italic" style={{ fontFamily: "'DM Mono', monospace" }}>
                Currently, responses are stored in your browser session only.
              </p>
            </div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors border border-border hover:border-foreground/30 px-3 py-1.5"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              <ArrowLeft size={11} />
              BACK TO FORM
            </button>
          </div>
        ) : tiles.length > 0 ? (
          <div style={{ columns: "3 260px", columnGap: "12px" }}>
            {tiles}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
              No responses yet. Be the first to share your insights!
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-border px-6 py-5">
        <p className="text-[10px] text-muted-foreground/40 text-center" style={{ fontFamily: "'DM Mono', monospace" }}>
          BRC Retreat Center Survey · {sessionDate}
        </p>
      </div>
    </div>
  );
}