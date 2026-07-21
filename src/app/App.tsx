import { useState, useRef, useEffect, useCallback } from "react";
import {
  CheckCircle,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  ArrowLeft,
  Volume2,
  Upload,
  Loader2,
  Users,
} from "lucide-react";
import { supabase, type SurveyResponse } from "../lib/supabase";
import { AllResponsesGallery } from "./components/AllResponsesGallery";

const isSupabaseConfigured = Boolean(supabase);

interface Question {
  id: number;
  label: string;
  prompt: string;
  placeholder: string;
  hint?: string;
  dropdownOptions?: { value: string; label: string }[];
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    label: "FREQUENCY",
    prompt: "How many retreats does your organization participate in, organize and/or facilitate per year?",
    placeholder: "e.g., '3-4 retreats annually' or 'One major retreat plus quarterly day-long gatherings'...",
    hint: "Include retreats, trainings, or off-site gatherings focused on planning, reflection, rest, relationship-building, or organizational development.",
    dropdownOptions: [
      { value: "", label: "Select a range (optional)" },
      { value: "0-1", label: "0-1 retreats per year" },
      { value: "2-3", label: "2-3 retreats per year" },
      { value: "4-6", label: "4-6 retreats per year" },
      { value: "7-10", label: "7-10 retreats per year" },
      { value: "11-15", label: "11-15 retreats per year" },
      { value: "16+", label: "16+ retreats per year" },
    ],
  },
  {
    id: 2,
    label: "PURPOSE",
    prompt: "What is the purpose of these retreats?",
    placeholder: "Share the main goals — team building, strategic planning, rest and renewal, skill development...",
    hint: "Think about what your organization hopes to achieve: stronger relationships, clearer vision, leadership development, collective rest, or other outcomes.",
  },
  {
    id: 3,
    label: "IMPACT",
    prompt: "How does retreat based work enable greater impact?",
    placeholder: "Describe the difference retreats make — improved collaboration, new strategies, sustained energy...",
    hint: "Consider changes in strategy, organizational capacity, team relationships, leadership effectiveness, or long-term sustainability of your work.",
  },
  {
    id: 4,
    label: "BUDGET",
    prompt: "What budget do you allocate for retreats?",
    placeholder: "e.g., '$10,000 annually' or 'About 5% of our operating budget' or 'We rely on donated space'...",
    hint: "Include costs for attending, organizing, or hosting retreats: venue rental, facilitators, travel, lodging, food, materials, or staff time.",
    dropdownOptions: [
      { value: "", label: "Select a range (optional)" },
      { value: "$0-$2,500", label: "$0 - $2,500" },
      { value: "$2,500-$5,000", label: "$2,500 - $5,000" },
      { value: "$5,000-$10,000", label: "$5,000 - $10,000" },
      { value: "$10,000-$25,000", label: "$10,000 - $25,000" },
      { value: "$25,000-$50,000", label: "$25,000 - $50,000" },
      { value: "$50,000-$100,000", label: "$50,000 - $100,000" },
      { value: "$100,000+", label: "$100,000+" },
    ],
  },
];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Waveform({ active }: { active: boolean }) {
  if (!active) return null;
  const bars = 28;
  return (
    <div className="flex items-center gap-[2px] w-full h-10">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-primary rounded-full"
          style={{
            animation: `waveBar 0.8s ease-in-out infinite alternate`,
            animationDelay: `${(i * 37) % 800}ms`,
            minHeight: "2px",
          }}
        />
      ))}
      <style>{`
        @keyframes waveBar {
          from { height: 2px; opacity: 0.4; }
          to   { height: 28px; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function PlaybackBar({ recording }: { recording: AudioRecording }) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(recording.url);
    audioRef.current.onended = () => {
      setPlaying(false);
      setElapsed(0);
      if (tickRef.current) clearInterval(tickRef.current);
    };
    return () => {
      audioRef.current?.pause();
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [recording.url]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      if (tickRef.current) clearInterval(tickRef.current);
      setPlaying(false);
    } else {
      audioRef.current.play();
      tickRef.current = setInterval(() => {
        setElapsed(audioRef.current?.currentTime ?? 0);
      }, 100);
      setPlaying(true);
    }
  };

  const pct = recording.duration > 0 ? (elapsed / recording.duration) * 100 : 0;

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
        {formatTime(elapsed)} / {formatTime(recording.duration)}
      </span>
    </div>
  );
}

function AudioRecorder({
  questionId,
  recording,
  onSave,
  onDelete,
}: {
  questionId: number;
  recording: AudioRecording | null;
  onSave: (id: number, rec: AudioRecording) => void;
  onDelete: (id: number) => void;
}) {
  const [state, setState] = useState<"idle" | "recording" | "denied">("idle");
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const startRecording = useCallback(async () => {
    try {
      // Check if MediaDevices API is available
      if (!navigator.mediaDevices?.getUserMedia) {
        console.error('MediaDevices API not available');
        setState("denied");
        return;
      }

      // Request microphone permission
      console.log('Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
      streamRef.current = stream;

      // Find supported MIME type
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg", "audio/mp4"]
        .find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

      console.log('Using MIME type:', mimeType || 'default');

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      
      mr.ondataavailable = (e) => { 
        if (e.data?.size > 0) {
          console.log('Audio chunk received:', e.data.size, 'bytes');
          chunksRef.current.push(e.data);
        }
      };
      
      mr.onstop = () => {
        console.log('Recording stopped, total chunks:', chunksRef.current.length);
        if (tickRef.current) clearInterval(tickRef.current);
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length === 0) { 
          console.error('No audio data recorded');
          setState("idle"); 
          return; 
        }
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        console.log('Created blob:', blob.size, 'bytes, type:', blob.type);
        const url = URL.createObjectURL(blob);
        const duration = (Date.now() - startTimeRef.current) / 1000;
        onSaveRef.current(questionId, { blob, url, duration });
        setState("idle");
        setElapsed(0);
      };

      mr.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        setState("denied");
      };

      mr.start(200);
      mediaRef.current = mr;
      startTimeRef.current = Date.now();
      setState("recording");
      console.log('Recording started');
      tickRef.current = setInterval(() => setElapsed((Date.now() - startTimeRef.current) / 1000), 200);
    } catch (err) {
      console.error('Recording error:', err);
      setState("denied");
    }
  }, [questionId]);

  const stopRecording = () => {
    if (mediaRef.current?.state !== "inactive") mediaRef.current?.stop();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.addEventListener("loadedmetadata", () => {
      onSaveRef.current(questionId, { blob: file, url, duration: isFinite(audio.duration) ? audio.duration : 0 });
      setState("idle");
    });
    audio.addEventListener("error", () => {
      onSaveRef.current(questionId, { blob: file, url, duration: 0 });
      setState("idle");
    });
  };

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (mediaRef.current?.state !== "inactive") mediaRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (state === "recording") {
    return (
      <div className="border border-primary/40 bg-primary/5 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span
              className="text-[10px] text-primary tracking-widest"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              REC {formatTime(elapsed)}
            </span>
          </div>
          <button
            onClick={stopRecording}
            className="flex items-center gap-1.5 text-[10px] text-primary border border-primary px-2 py-1 hover:bg-primary hover:text-primary-foreground transition-colors"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            <Square size={9} fill="currentColor" />
            STOP
          </button>
        </div>
        <Waveform active />
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="border border-border bg-card/60 p-3 space-y-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed" style={{ fontFamily: "'DM Mono', monospace" }}>
          Microphone blocked by this environment. Upload an audio file instead.
        </p>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-[10px] border border-primary text-primary px-3 py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            <Upload size={10} />
            UPLOAD AUDIO FILE
          </button>
          <button
            onClick={startRecording}
            className="text-[10px] text-muted-foreground hover:text-foreground border border-border px-2 py-1.5 transition-colors"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            RETRY MIC
          </button>
        </div>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="border border-border bg-card p-3 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[10px] text-muted-foreground tracking-widest"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            AUDIO ANSWER
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={startRecording}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 px-2 py-0.5 transition-colors"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              <Mic size={9} />
              RE-RECORD
            </button>
            <button
              onClick={() => onDelete(questionId)}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        <PlaybackBar recording={recording} />
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 px-3 py-2 transition-colors w-full justify-center group"
      style={{ fontFamily: "'DM Mono', monospace" }}
    >
      <Mic size={12} className="group-hover:text-primary transition-colors" />
      RECORD AUDIO ANSWER
    </button>
  );
}

// ─── Gallery / Board ──────────────────────────────────────────────────────────

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
  5: [
    { url: "https://images.unsplash.com/photo-1435527173128-983b87201f4d?w=800&h=600&fit=crop&auto=format", alt: "Calendar and planning" },
    { url: "https://images.unsplash.com/photo-1610070835951-156b6921281d?w=800&h=1000&fit=crop&auto=format", alt: "Circle gathering at retreat", tall: true },
  ],
};

function Gallery({
  info,
  answers,
  recordings,
  onBack,
}: {
  info: PersonalInfo;
  answers: Record<number, string>;
  recordings: Record<number, AudioRecording | null>;
  onBack: () => void;
}) {
  const sessionDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });

  // Build flat tile list — interleave images, text, and audio per question
  const tiles: React.ReactNode[] = [];

  QUESTIONS.forEach((q) => {
    const text = (answers[q.id] ?? "").trim();
    const rec = recordings[q.id];
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

    // Text answer as quote card
    if (text) {
      tiles.push(
        <div key={`text-${q.id}`} className="break-inside-avoid mb-3 border border-border bg-card p-5">
          <p className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>
            {q.label}
          </p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Inter', sans-serif" }}>
            &ldquo;{text}&rdquo;
          </p>
        </div>
      );
    }

    // Audio card
    if (rec) {
      tiles.push(
        <div key={`audio-${q.id}`} className="break-inside-avoid mb-3 border border-primary/30 bg-card/80 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Volume2 size={10} className="text-primary" />
            <span className="text-[9px] text-primary tracking-widest uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
              Audio — {q.label}
            </span>
          </div>
          <PlaybackBar recording={rec} />
        </div>
      );
    }

    // Second image
    if (imgs[1]) {
      tiles.push(
        <div key={`img-${q.id}-1`} className="break-inside-avoid mb-3 overflow-hidden bg-muted">
          <img src={imgs[1].url} alt={imgs[1].alt} className="w-full object-cover block"
            style={{ height: imgs[1].tall ? "320px" : "200px" }} />
        </div>
      );
    }

    // Empty state
    if (!text && !rec) {
      tiles.push(
        <div key={`empty-${q.id}`} className="break-inside-avoid mb-3 border border-border/30 p-4">
          <p className="text-[10px] text-muted-foreground/40 italic" style={{ fontFamily: "'DM Mono', monospace" }}>
            No response for this question.
          </p>
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
      <div className="border-b border-border px-6 py-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-primary uppercase mb-2" style={{ fontFamily: "'DM Mono', monospace" }}>
            Response Board · {sessionDate}
          </p>
          <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            ANSWERS
          </h1>
        </div>
        {(info.name || info.organization) && (
          <div className="md:text-right space-y-0.5">
            {info.name && <p className="text-sm text-foreground font-medium" style={{ fontFamily: "'DM Mono', monospace" }}>{info.name}</p>}
            {info.role && <p className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{info.role}</p>}
            {info.organization && <p className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{info.organization}</p>}
            {info.email && <p className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{info.email}</p>}
          </div>
        )}
      </div>

      {/* Masonry board */}
      <div className="p-4 md:p-6">
        <div style={{ columns: "3 260px", columnGap: "12px" }}>
          {tiles}
        </div>
      </div>

      <div className="border-t border-border px-6 py-5">
        <p className="text-[10px] text-muted-foreground/40 text-center" style={{ fontFamily: "'DM Mono', monospace" }}>
          Brooklyn Retreat Center Impact Survey · {sessionDate}
        </p>
      </div>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

interface PersonalInfo {
  name: string;
  email: string;
  organization: string;
  role: string;
}

export default function App() {
  const [info, setInfo] = useState<PersonalInfo>({ name: "", email: "", organization: "", role: "" });
  const [answers, setAnswers] = useState<Record<number, string>>(
    Object.fromEntries(QUESTIONS.map((q) => [q.id, ""]))
  );
  const [recordings, setRecordings] = useState<Record<number, AudioRecording | null>>(
    Object.fromEntries(QUESTIONS.map((q) => [q.id, null]))
  );
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewingAll, setViewingAll] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [activeId, setActiveId] = useState<number | null>(1);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wordCount = (text: string) =>
    text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  const totalWords = Object.values(answers).reduce((sum, a) => sum + wordCount(a ?? ""), 0);
  const answeredCount = QUESTIONS.filter(
    (q) => (answers[q.id] ?? "").trim().length > 0 || recordings[q.id] !== null
  ).length;

  const handleChange = (id: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(true), 1200);
  };

  const handleSaveRecording = (id: number, rec: AudioRecording) => {
    setRecordings((prev) => ({ ...prev, [id]: rec }));
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(true), 1200);
  };

  const handleDeleteRecording = (id: number) => {
    setRecordings((prev) => ({ ...prev, [id]: null }));
  };

  const handleReset = () => {
    setInfo({ name: "", email: "", organization: "", role: "" });
    setAnswers(Object.fromEntries(QUESTIONS.map((q) => [q.id, ""])));
    setRecordings(Object.fromEntries(QUESTIONS.map((q) => [q.id, null])));
    setSaved(false);
    setSubmitted(false);
    setActiveId(1);
  };

  const toggleCollapse = (id: number) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    
    try {
      if (isSupabaseConfigured && supabase) {
        // Upload audio files to Supabase Storage and get URLs
        const audioUrls: Record<number, string | null> = {};
        
        for (const questionId of [1, 2, 3, 4, 5]) {
          const recording = recordings[questionId];
          if (recording) {
            // Generate unique filename
            const timestamp = Date.now();
            const extension = recording.blob.type.split('/')[1] || 'webm';
            const filename = `audio-q${questionId}-${timestamp}.${extension}`;
            
            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
              .from('survey-audio')
              .upload(filename, recording.blob, {
                contentType: recording.blob.type,
              });

            if (error) {
              console.error('Error uploading audio:', error);
              audioUrls[questionId] = null;
            } else {
              // Get public URL
              const { data: { publicUrl } } = supabase.storage
                .from('survey-audio')
                .getPublicUrl(filename);
              audioUrls[questionId] = publicUrl;
            }
          } else {
            audioUrls[questionId] = null;
          }
        }

        // Save response to database
        const surveyData: Omit<SurveyResponse, 'id' | 'created_at'> = {
          name: info.name,
          email: info.email,
          organization: info.organization,
          role: info.role,
          question_1_text: answers[1] || '',
          question_1_audio_url: audioUrls[1],
          question_2_text: answers[2] || '',
          question_2_audio_url: audioUrls[2],
          question_3_text: answers[3] || '',
          question_3_audio_url: audioUrls[3],
          question_4_text: answers[4] || '',
          question_4_audio_url: audioUrls[4],
          question_5_text: answers[5] || '',
          question_5_audio_url: audioUrls[5],
        };

        const { error: dbError } = await supabase
          .from('survey_responses')
          .insert([surveyData]);

        if (dbError) {
          console.error('Error saving response:', dbError);
        }
      } else {
        console.log('Supabase not configured - responses stored locally only');
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Submission error:', error);
      // Still show the gallery even if there's an error
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return <Gallery info={info} answers={answers} recordings={recordings} onBack={() => setSubmitted(false)} />;
  }

  if (viewingAll) {
    return <AllResponsesGallery onBack={() => setViewingAll(false)} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10 bg-background">
        <div className="flex items-center gap-4">
          <span
            className="text-xs tracking-[0.2em] text-muted-foreground uppercase"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            Answer Sheet
          </span>
          <span className="w-px h-4 bg-border" />
          <span
            className="text-xs text-muted-foreground"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            {answeredCount}/{QUESTIONS.length} complete
          </span>
        </div>

        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-primary" style={{ fontFamily: "'DM Mono', monospace" }}>
              <CheckCircle size={12} />
              auto-saved
            </span>
          )}
          <button
            onClick={() => setViewingAll(true)}
            className="flex items-center gap-1.5 text-xs text-foreground hover:text-primary transition-colors px-3 py-1.5 border border-border hover:border-primary/30"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            <Users size={11} />
            View All
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 border border-border hover:border-foreground/30"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            <RotateCcw size={11} />
            Reset
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-12 border-b border-border pb-8">
          <p
            className="text-[10px] tracking-[0.3em] text-primary uppercase mb-3"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            Session /{" "}
            {new Date().toLocaleDateString("en-GB", {
              day: "2-digit", month: "short", year: "numeric",
            })}
          </p>
          <h1
            className="text-4xl md:text-5xl font-black leading-none tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            BROOKLYN RETREAT
            <br />
            CENTER IMPACT SURVEY
          </h1>
          <p className="mt-4 text-sm text-muted-foreground max-w-md leading-relaxed">
            Type or speak your answer for each question. Audio recordings and text both count toward completion.
          </p>
        </div>

        {/* Personal info */}
        <div className="mb-10 border border-border bg-card/20 p-6 space-y-4">
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-2" style={{ fontFamily: "'DM Mono', monospace" }}>
            YOUR INFORMATION
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(["name", "email", "organization", "role"] as const).map((field) => (
              <div key={field} className="space-y-1">
                <label className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
                  {field === "organization" ? "Organization" : field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <input
                  type={field === "email" ? "email" : "text"}
                  value={info[field]}
                  onChange={(e) => setInfo((prev) => ({ ...prev, [field]: e.target.value }))}
                  placeholder={
                    field === "name" ? "Full name" :
                    field === "email" ? "Email address" :
                    field === "organization" ? "Organization or affiliation" :
                    "Your role or title"
                  }
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none border-b border-border focus:border-primary/60 pb-1.5 transition-colors"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-10">
          <div
            className="flex justify-between text-[10px] mb-2 text-muted-foreground"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            <span>PROGRESS</span>
            <span>{totalWords} words typed</span>
          </div>
          <div className="h-px bg-muted w-full relative">
            <div
              className="absolute top-0 left-0 h-px bg-primary transition-all duration-500"
              style={{ width: `${(answeredCount / QUESTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {QUESTIONS.map((q) => {
            const isActive = activeId === q.id;
            const isCollapsed = collapsed[q.id];
            const hasText = (answers[q.id] ?? "").trim().length > 0;
            const hasAudio = recordings[q.id] !== null;
            const hasAnswer = hasText || hasAudio;

            return (
              <div
                key={q.id}
                className={`border transition-all duration-200 ${
                  isActive
                    ? "border-primary/60 bg-card"
                    : hasAnswer
                    ? "border-border bg-card/50"
                    : "border-border bg-card/20"
                }`}
              >
                <div
                  className="flex items-start gap-4 p-5 cursor-pointer"
                  onClick={() => {
                    setActiveId(isActive ? null : q.id);
                    if (isCollapsed) setCollapsed((prev) => ({ ...prev, [q.id]: false }));
                  }}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 flex items-center justify-center text-xs font-medium border transition-colors ${
                      isActive
                        ? "border-primary text-primary"
                        : hasAnswer
                        ? "border-foreground/40 text-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {String(q.id).padStart(2, "0")}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] tracking-[0.2em] ${isActive ? "text-primary" : "text-muted-foreground"}`}
                          style={{ fontFamily: "'DM Mono', monospace" }}
                        >
                          {q.label}
                        </span>
                        {hasAudio && (
                          <span
                            className="text-[9px] text-primary border border-primary/40 px-1 py-px"
                            style={{ fontFamily: "'DM Mono', monospace" }}
                          >
                            AUDIO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {hasText && (
                          <span
                            className="text-[10px] text-muted-foreground"
                            style={{ fontFamily: "'DM Mono', monospace" }}
                          >
                            {wordCount(answers[q.id] ?? "")}w
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCollapse(q.id);
                          }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-foreground leading-snug">{q.prompt}</p>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="px-5 pb-5 pl-[4.25rem] space-y-3">
                    {q.hint && (
                      <p
                        className="text-[11px] text-muted-foreground italic"
                        style={{ fontFamily: "'DM Mono', monospace" }}
                      >
                        ↳ {q.hint}
                      </p>
                    )}
                    
                    {/* Dropdown for questions with predefined ranges */}
                    {q.dropdownOptions && (
                      <div className="space-y-2">
                        <label className="text-[9px] tracking-[0.15em] text-muted-foreground uppercase" style={{ fontFamily: "'DM Mono', monospace" }}>
                          Quick Select Range
                        </label>
                        <select
                          value={answers[q.id]?.startsWith(q.dropdownOptions[1]?.value.split('-')[0] || '') ? 
                            q.dropdownOptions.find(opt => answers[q.id]?.includes(opt.value))?.value || '' : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              handleChange(q.id, e.target.value);
                            }
                          }}
                          onFocus={() => setActiveId(q.id)}
                          className="w-full bg-background text-sm text-foreground border border-border hover:border-primary/40 focus:border-primary/60 px-3 py-2 outline-none transition-colors"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          {q.dropdownOptions.map((option, idx) => (
                            <option key={idx} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px bg-border" />
                          <span
                            className="text-[9px] text-muted-foreground/60 tracking-widest"
                            style={{ fontFamily: "'DM Mono', monospace" }}
                          >
                            OR SPECIFY BELOW
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      </div>
                    )}
                    
                    <textarea
                      value={answers[q.id] ?? ""}
                      onChange={(e) => handleChange(q.id, e.target.value)}
                      onFocus={() => setActiveId(q.id)}
                      placeholder={q.placeholder}
                      rows={4}
                      className={`w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 resize-none outline-none border-b focus:border-primary/60 pb-2 transition-colors leading-relaxed ${
                        isActive ? "border-border/60" : "border-transparent"
                      }`}
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    />
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <span
                        className="text-[9px] text-muted-foreground/60 tracking-widest"
                        style={{ fontFamily: "'DM Mono', monospace" }}
                      >
                        OR
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <AudioRecorder
                      questionId={q.id}
                      recording={recordings[q.id]}
                      onSave={handleSaveRecording}
                      onDelete={handleDeleteRecording}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10 pt-8 border-t border-border flex items-center justify-between">
          <div
            style={{ fontFamily: "'DM Mono', monospace" }}
            className="text-xs text-muted-foreground space-y-0.5"
          >
            <div>{answeredCount} of {QUESTIONS.length} questions answered</div>
            <div>
              {Object.values(recordings).filter(Boolean).length} audio recording
              {Object.values(recordings).filter(Boolean).length !== 1 ? "s" : ""}{" "}
              · {totalWords} words
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors active:scale-95"
            style={{ fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            SUBMIT ANSWERS
          </button>
        </div>

        <p
          className="mt-8 text-[11px] text-muted-foreground/50 text-center"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          Responses are stored locally in this session only.
        </p>
      </div>
    </div>
  );
}
