import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VoiceAssistantState, VoiceCommandResult } from '@/types/voice';

export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export const OPENAI_VOICES: { id: OpenAIVoice; name: string; description: string }[] = [
  { id: 'nova', name: 'Nova', description: 'Feminina, amigável' },
  { id: 'alloy', name: 'Alloy', description: 'Neutra, versátil' },
  { id: 'echo', name: 'Echo', description: 'Masculina, clara' },
  { id: 'fable', name: 'Fable', description: 'Expressiva, narrativa' },
  { id: 'onyx', name: 'Onyx', description: 'Masculina, profunda' },
  { id: 'shimmer', name: 'Shimmer', description: 'Feminina, suave' },
];

const VOICE_STORAGE_KEY = 'gokite-voice-preference';
const COMMAND_HISTORY_KEY = 'gokite-voice-history';
const CONVERSATION_KEY = 'gokite-jarvis-conversation';
const MAX_HISTORY_ITEMS = 10;
const MAX_CONVERSATION_MESSAGES = 20;

export interface CommandHistoryItem {
  id: string;
  transcript: string;
  intent: string;
  message: string;
  success: boolean;
  timestamp: number;
}

export function useVoiceAssistant() {
  const [state, setState] = React.useState<VoiceAssistantState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    lastResult: null,
    error: null,
  });

  const [selectedVoice, setSelectedVoice] = React.useState<OpenAIVoice>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(VOICE_STORAGE_KEY) as OpenAIVoice) || 'nova';
    }
    return 'nova';
  });

  const [commandHistory, setCommandHistory] = React.useState<CommandHistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(COMMAND_HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Adiciona ao histórico de conversa do Assistente (sincroniza header com página)
  const addToConversation = React.useCallback((userMessage: string, assistantMessage: string, isAction?: boolean) => {
    try {
      const stored = localStorage.getItem(CONVERSATION_KEY);
      const messages = stored ? JSON.parse(stored) : [];
      
      // Adiciona mensagem do usuário
      messages.push({
        id: crypto.randomUUID(),
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
      });
      
      // Adiciona resposta do assistente
      messages.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantMessage,
        timestamp: Date.now(),
        isAction,
      });
      
      // Mantém apenas últimas mensagens
      const trimmed = messages.slice(-MAX_CONVERSATION_MESSAGES);
      localStorage.setItem(CONVERSATION_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Error saving conversation:', e);
    }
  }, []);

  const addToHistory = React.useCallback((item: Omit<CommandHistoryItem, 'id' | 'timestamp'>) => {
    const newItem: CommandHistoryItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    
    setCommandHistory(prev => {
      const updated = [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(COMMAND_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });

    // Sincroniza com a página do Assistente
    addToConversation(item.transcript, item.message, item.success);
  }, [addToConversation]);

  const clearHistory = React.useCallback(() => {
    setCommandHistory([]);
    localStorage.removeItem(COMMAND_HISTORY_KEY);
  }, []);

  const startListening = React.useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        error: null,
        transcript: '',
        lastResult: null,
      }));

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (chunksRef.current.length === 0) {
          setState(prev => ({ ...prev, isListening: false, error: 'Nenhum áudio gravado' }));
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setState(prev => ({ ...prev, isListening: true }));

      // Auto-stop after 15 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopListening();
        }
      }, 15000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setState(prev => ({
        ...prev,
        error: 'Não foi possível acessar o microfone. Verifique as permissões.',
      }));
    }
  }, []);

  const stopListening = React.useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setState(prev => ({ ...prev, isListening: false }));
    }
  }, []);

  const processAudio = async (audioBlob: Blob) => {
    setState(prev => ({ ...prev, isProcessing: true, transcript: 'Transcrevendo...' }));

    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Step 1: Speech-to-Text with OpenAI Whisper
      console.log('Sending audio to OpenAI Whisper...');
      const { data: sttData, error: sttError } = await supabase.functions.invoke('openai-stt', {
        body: { audio: base64Audio },
      });

      if (sttError || sttData?.error) {
        throw new Error(sttData?.error || sttError?.message || 'Erro na transcrição');
      }

      const transcript = sttData.text;
      if (!transcript) {
        throw new Error('Nenhum texto transcrito');
      }

      console.log('Transcription:', transcript);
      setState(prev => ({ ...prev, transcript }));

      // Step 2: Process command with AI
      console.log('Processing command...');
      const { data: commandData, error: commandError } = await supabase.functions.invoke('voice-assistant', {
        body: { transcript },
      });

      if (commandError || !commandData) {
        throw new Error(commandError?.message || 'Erro ao processar comando');
      }

      const result: VoiceCommandResult = commandData;
      setState(prev => ({
        ...prev,
        isProcessing: false,
        lastResult: result,
        error: result.success ? null : result.message,
      }));

      // Add to history
      addToHistory({
        transcript,
        intent: result.intent || 'unknown',
        message: result.message,
        success: result.success,
      });

      // Step 3: Text-to-Speech response with OpenAI
      if (result.message) {
        console.log('Generating TTS response with voice:', selectedVoice);
        try {
          const { data: ttsData, error: ttsError } = await supabase.functions.invoke('openai-tts', {
            body: { text: result.message, voice: selectedVoice },
          });

          if (!ttsError && ttsData?.audioContent) {
            const audioUrl = `data:audio/mpeg;base64,${ttsData.audioContent}`;
            if (audioRef.current) {
              audioRef.current.pause();
            }
            audioRef.current = new Audio(audioUrl);
            audioRef.current.play().catch(e => console.log('Audio playback error:', e));
          }
        } catch (ttsError) {
          console.error('TTS error (non-critical):', ttsError);
        }
      }

      return result;
    } catch (error) {
      console.error('Error processing audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar comando';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
        lastResult: { success: false, message: errorMessage },
      }));
    }
  };

  const stopAudio = React.useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const changeVoice = React.useCallback((voice: OpenAIVoice) => {
    setSelectedVoice(voice);
    localStorage.setItem(VOICE_STORAGE_KEY, voice);
  }, []);

  const reset = React.useCallback(() => {
    stopAudio();
    setState({
      isListening: false,
      isProcessing: false,
      transcript: '',
      lastResult: null,
      error: null,
    });
  }, [stopAudio]);

  return {
    ...state,
    selectedVoice,
    commandHistory,
    changeVoice,
    clearHistory,
    startListening,
    stopListening,
    stopAudio,
    reset,
    isSupported: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  };
}
