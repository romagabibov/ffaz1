import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  Trash2, 
  Send, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  RefreshCw, 
  X,
  FileAudio
} from 'lucide-react';
import { uploadMediaFile } from '../lib/upload';
import { useTranslation } from 'react-i18next';

export interface RecordedVoiceData {
  audioUrl: string;
  audioDuration: number;
  waveform: number[];
}

interface VoiceMessageRecorderProps {
  onSendVoice: (data: RecordedVoiceData) => Promise<void> | void;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
  maxDurationSec?: number;
}

/**
 * Resilient Multi-tier microphone stream request.
 * Falls back across multiple constraint profiles and legacy APIs.
 */
async function requestMicrophoneStream(): Promise<MediaStream> {
  // Strategy 1: Standard constraints
  if (navigator?.mediaDevices?.getUserMedia) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
    } catch (err1: any) {
      console.warn('Strategy 1 (constrained) failed, attempting Strategy 2 (basic audio: true):', err1);
    }

    // Strategy 2: Permissive basic audio (bypasses OverconstrainedError & mobile constraint blocks)
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err2: any) {
      console.warn('Strategy 2 (audio: true) failed:', err2);
      throw err2;
    }
  }

  // Strategy 3: Legacy browser getUserMedia
  const legacyGetUserMedia = (navigator as any).getUserMedia ||
                             (navigator as any).webkitGetUserMedia ||
                             (navigator as any).mozGetUserMedia ||
                             (navigator as any).msGetUserMedia;

  if (legacyGetUserMedia) {
    return new Promise<MediaStream>((resolve, reject) => {
      legacyGetUserMedia.call(navigator, { audio: true }, resolve, reject);
    });
  }

  throw new Error('MediaDevices not supported in this browser environment');
}

export default function VoiceMessageRecorder({
  onSendVoice,
  onCancel,
  disabled = false,
  className = '',
  maxDurationSec = 180
}: VoiceMessageRecorderProps) {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveVolumeBars, setLiveVolumeBars] = useState<number[]>(new Array(16).fill(0.2));
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const waveformSamplesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Clean up all streams and contexts on unmount
  const cleanupRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, [cleanupRecording]);

  // Live visualizer loop
  const startVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLiveWaveform = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Compute average volume & 16 responsive frequency bars
        const bars: number[] = [];
        const step = Math.floor(bufferLength / 16) || 1;
        let sum = 0;
        for (let i = 0; i < 16; i++) {
          const val = dataArray[i * step] || 0;
          sum += val;
          bars.push(Math.max(0.15, Math.min(1, val / 255)));
        }
        setLiveVolumeBars(bars);

        const avgNorm = Math.max(0.1, Math.min(1, (sum / (16 * 255)) * 1.5));
        waveformSamplesRef.current.push(Number(avgNorm.toFixed(2)));

        animationFrameRef.current = requestAnimationFrame(updateLiveWaveform);
      };

      updateLiveWaveform();
    } catch (e) {
      console.warn('Web Audio Visualizer not supported or failed:', e);
    }
  };

  // Start live microphone recording
  const handleStartRecording = async () => {
    if (disabled || isRecording || isUploading) return;
    setPermissionError(null);
    setShowErrorDialog(false);
    audioChunksRef.current = [];
    waveformSamplesRef.current = [];
    setRecordingSeconds(0);

    try {
      const stream = await requestMicrophoneStream();
      audioStreamRef.current = stream;

      // Determine best supported MIME type
      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined') {
        if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
            mimeType = 'audio/ogg;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else {
            mimeType = '';
          }
        }
      }

      const recorder = mimeType 
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(100); // 100ms slices for smooth capture
      startTimeRef.current = Date.now();
      setIsRecording(true);

      // Start live visualizer
      startVisualizer(stream);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev + 1 >= maxDurationSec) {
            handleStopAndSend();
            return maxDurationSec;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone access notice:', err?.message || err);
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || String(err?.message || '').toLowerCase().includes('permission denied');
      
      const errorMsg = isDenied
        ? (isInIframe
            ? t('mic_iframe_blocked', 'Доступ к микрофону во встроенном фрейме заблокирован политикой безопасности браузера. Откройте приложение в новой вкладке или выберите аудиофайл.')
            : t('mic_permission_denied', 'Доступ к микрофону заблокирован. Разрешите микрофон в настройках браузера (значок замка / настроек рядом с адресом).'))
        : t('mic_generic_error', 'Не удалось получить доступ к микрофону. Проверьте подключение аудиоустройства.');

      setPermissionError(errorMsg);
      setShowErrorDialog(true);
      cleanupRecording();
      setIsRecording(false);
    }
  };

  // Cancel recording
  const handleCancelRecording = () => {
    cleanupRecording();
    setIsRecording(false);
    setRecordingSeconds(0);
    setPermissionError(null);
    setShowErrorDialog(false);
    onCancel?.();
  };

  // Stop recording and send voice message (with trailing speech preservation & accurate waveform decoding)
  const handleStopAndSend = async () => {
    if (!mediaRecorderRef.current || !isRecording || isUploading) return;

    const recorder = mediaRecorderRef.current;
    setIsUploading(true);

    // Stop timer and visualizer immediately to freeze UI smoothly
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Preserve trailing voice buffer (300ms) so final syllable/word is never cut off
    await new Promise(r => setTimeout(r, 300));

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        try {
          const mimeType = recorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

          if (audioBlob.size < 200) {
            console.warn('Audio recording too small or empty');
            setIsUploading(false);
            cleanupRecording();
            setIsRecording(false);
            resolve();
            return;
          }

          // Calculate precise duration and genuine waveform using AudioContext
          let calculatedDuration = (Date.now() - startTimeRef.current) / 1000;
          let calculatedWaveform: number[] = [];

          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              const arrayBuffer = await audioBlob.arrayBuffer();
              const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
              if (audioBuffer && audioBuffer.duration > 0) {
                calculatedDuration = audioBuffer.duration;
              }

              // Extract 30 accurate amplitude bars directly from decoded audio data
              const channelData = audioBuffer.getChannelData(0);
              const targetBars = 30;
              const blockSize = Math.floor(channelData.length / targetBars) || 1;
              for (let i = 0; i < targetBars; i++) {
                let sum = 0;
                for (let j = 0; j < blockSize; j++) {
                  sum += Math.abs(channelData[i * blockSize + j] || 0);
                }
                const avg = sum / blockSize;
                const normalized = Math.max(0.15, Math.min(1.0, Math.pow(avg * 4.5, 0.75)));
                calculatedWaveform.push(Number(normalized.toFixed(2)));
              }
              try {
                await ctx.close();
              } catch {}
            }
          } catch (decodeErr) {
            console.warn('Audio decoding fallback to sampled waveform:', decodeErr);
          }

          // Fallback waveform if audio decoding didn't produce 30 bars
          if (calculatedWaveform.length !== 30) {
            const capturedSamples = [...waveformSamplesRef.current];
            const targetBars = 30;
            if (capturedSamples.length > 0) {
              const step = capturedSamples.length / targetBars;
              for (let i = 0; i < targetBars; i++) {
                const idx = Math.min(capturedSamples.length - 1, Math.floor(i * step));
                calculatedWaveform.push(Math.max(0.15, Math.min(1, capturedSamples[idx] || 0.3)));
              }
            } else {
              for (let i = 0; i < targetBars; i++) {
                calculatedWaveform.push(0.2 + 0.6 * Math.abs(Math.sin(i * 0.4)));
              }
            }
          }

          // Extension matching
          const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
          const audioFile = new File([audioBlob], `voice_${Date.now()}.${ext}`, {
            type: mimeType
          });

          // Upload audio file
          const audioUrl = await uploadMediaFile(audioFile);

          await onSendVoice({
            audioUrl,
            audioDuration: Number(Math.max(0.5, calculatedDuration).toFixed(1)),
            waveform: calculatedWaveform
          });

          cleanupRecording();
          setIsRecording(false);
          setIsUploading(false);
          setRecordingSeconds(0);
          resolve();
        } catch (uploadErr) {
          console.error('Failed to process/upload voice message:', uploadErr);
          setIsUploading(false);
          cleanupRecording();
          setIsRecording(false);
          resolve();
        }
      };

      try {
        if (recorder.state === 'recording') {
          recorder.requestData();
          recorder.stop();
        } else {
          resolve();
        }
      } catch {
        resolve();
      }
    });
  };

  // Upload an existing voice note or audio file (Direct fallback that always works)
  const handleAudioFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowErrorDialog(false);
    setPermissionError(null);
    setIsUploading(true);

    try {
      // 1. Calculate duration and waveform via AudioContext if available
      let duration = 3;
      const waveform: number[] = [];

      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const arrayBuffer = await file.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          if (audioBuffer && audioBuffer.duration > 0) {
            duration = audioBuffer.duration;
          }

          const channelData = audioBuffer.getChannelData(0);
          const targetBars = 30;
          const blockSize = Math.floor(channelData.length / targetBars) || 1;
          for (let i = 0; i < targetBars; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
              sum += Math.abs(channelData[i * blockSize + j] || 0);
            }
            const avg = sum / blockSize;
            const normalized = Math.max(0.15, Math.min(1.0, Math.pow(avg * 4.5, 0.75)));
            waveform.push(Number(normalized.toFixed(2)));
          }
          try {
            await ctx.close();
          } catch {}
        }
      } catch (fileDecodeErr) {
        console.warn('File decode notice, using fallback metadata:', fileDecodeErr);
      }

      if (waveform.length !== 30) {
        for (let i = 0; i < 30; i++) {
          const val = 0.2 + 0.7 * Math.abs(Math.sin((i + 1) * 0.45) * Math.cos(i * 0.25));
          waveform.push(Number(val.toFixed(2)));
        }
      }

      // 2. Upload audio
      const audioUrl = await uploadMediaFile(file);

      await onSendVoice({
        audioUrl,
        audioDuration: Number(duration.toFixed(1)),
        waveform
      });
    } catch (err) {
      console.error('Failed to upload voice audio file:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Open standalone window to bypass iframe permission blocks
  const handleOpenStandaloneWindow = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    }
  };

  // Format recording timer
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // If not recording, show Telegram/WhatsApp style Mic trigger button & fallback file picker
  if (!isRecording && !isUploading) {
    return (
      <div className={`relative flex items-center gap-1 ${className}`}>
        {/* Hidden Audio File Input for guaranteed fallback */}
        <input
          type="file"
          ref={audioFileInputRef}
          onChange={handleAudioFileSelected}
          accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm,.aac"
          className="hidden"
        />

        {/* Primary Record Microphone Button */}
        <button
          type="button"
          onClick={handleStartRecording}
          disabled={disabled}
          className="p-2 sm:p-2.5 rounded-full text-brand-dark/60 hover:text-brand-accent hover:bg-brand-muted/50 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed group relative shrink-0"
          title={t('record_voice_message', 'Записать голосовое сообщение')}
        >
          <Mic size={19} className="group-hover:scale-110 transition-transform" />
          <span className="sr-only">{t('record_voice', 'Record Voice')}</span>
        </button>

        {/* Permission Help Dialog / Modal */}
        {showErrorDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-brand-card text-brand-dark rounded-3xl border border-brand-dark/15 shadow-2xl p-5 sm:p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 shrink-0">
                  <AlertCircle size={20} />
                </div>
                <button
                  onClick={() => setShowErrorDialog(false)}
                  className="p-1 rounded-full text-brand-dark/40 hover:text-brand-dark transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1">
                <h4 className="font-display font-semibold text-sm sm:text-base uppercase tracking-tight text-brand-dark">
                  {t('mic_access_title', 'Доступ к микрофону')}
                </h4>
                <p className="text-xs text-brand-dark/70 leading-relaxed font-normal">
                  {permissionError || t('mic_permission_denied', 'Браузер заблокировал доступ к микрофону.')}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* 1. Upload Voice Audio File */}
                <button
                  type="button"
                  onClick={() => {
                    setShowErrorDialog(false);
                    audioFileInputRef.current?.click();
                  }}
                  className="w-full py-2.5 px-4 rounded-full bg-brand-accent text-white font-semibold text-xs uppercase tracking-wider hover:bg-brand-dark transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  <FileAudio size={15} />
                  <span>{t('upload_voice_file', 'Прикрепить аудиозапись (файл)')}</span>
                </button>

                {/* 2. Open in Standalone Tab (if in iframe) */}
                {isInIframe && (
                  <button
                    type="button"
                    onClick={handleOpenStandaloneWindow}
                    className="w-full py-2.5 px-4 rounded-full bg-brand-light text-brand-dark border border-brand-dark/15 font-semibold text-xs uppercase tracking-wider hover:bg-brand-dark hover:text-white transition-all flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <ExternalLink size={14} />
                    <span>{t('open_standalone', 'Открыть в отдельной вкладке')}</span>
                  </button>
                )}

                {/* 3. Retry Button */}
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="w-full py-2 px-4 rounded-full text-brand-dark/70 hover:text-brand-dark font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={13} />
                  <span>{t('retry', 'Попробовать снова')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active recording UI (WhatsApp / Telegram style bar)
  return (
    <div className={`flex items-center gap-2 sm:gap-3 bg-brand-muted/40 border border-brand-accent/40 rounded-full px-3 py-1.5 shadow-xs w-full max-w-full animate-in fade-in zoom-in-95 duration-200 ${className}`}>
      {/* Blinking Recording Dot */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex items-center justify-center w-4 h-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
        </div>
        <span className="font-mono text-xs font-bold text-red-700 dark:text-red-400 tracking-wider">
          {formatTimer(recordingSeconds)}
        </span>
      </div>

      {/* Live Audio Visualizer Waves (Telegram style) */}
      <div className="flex-1 flex items-center justify-center gap-[2px] h-6 px-1 overflow-hidden min-w-0">
        {liveVolumeBars.map((v, i) => (
          <div
            key={i}
            style={{ height: `${Math.max(4, Math.round(v * 20))}px` }}
            className="w-[2.5px] rounded-full bg-[#7A0000] transition-all duration-75"
          />
        ))}
      </div>

      {/* Cancel Recording Button */}
      <button
        type="button"
        onClick={handleCancelRecording}
        disabled={isUploading}
        className="p-1.5 rounded-full text-brand-dark/50 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
        title={t('cancel_recording', 'Отменить запись')}
      >
        <Trash2 size={16} />
      </button>

      {/* Send Voice Message Button */}
      <button
        type="button"
        onClick={handleStopAndSend}
        disabled={isUploading}
        className="w-8 h-8 rounded-full bg-[#7A0000] text-white flex items-center justify-center hover:bg-[#5a0000] active:scale-95 transition-all shrink-0 shadow-xs disabled:opacity-50"
        title={t('send_voice_message', 'Отправить голосовое сообщение')}
      >
        {isUploading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Send size={14} className="fill-white ml-0.5" />
        )}
      </button>
    </div>
  );
}
