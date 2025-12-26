import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VoiceAssistantState, VoiceCommandResult } from '@/types/voice';

// Check if browser supports Web Speech API
const isSpeechRecognitionSupported = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

export function useVoiceAssistant() {
  const [state, setState] = useState<VoiceAssistantState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    lastResult: null,
    error: null,
  });

  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      setState(prev => ({
        ...prev,
        error: 'Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.',
      }));
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    const recognition = recognitionRef.current;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setState(prev => ({ ...prev, isListening: true, error: null, transcript: '' }));
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      
      console.log('Transcript:', transcript);
      setState(prev => ({ ...prev, transcript }));

      // If final result, process it
      if (event.results[event.results.length - 1].isFinal) {
        recognition.stop();
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      let errorMessage = 'Erro no reconhecimento de voz';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Nenhuma fala detectada. Tente novamente.';
          break;
        case 'audio-capture':
          errorMessage = 'Microfone não encontrado. Verifique as permissões.';
          break;
        case 'not-allowed':
          errorMessage = 'Permissão de microfone negada.';
          break;
        case 'network':
          errorMessage = 'Erro de rede. Verifique sua conexão.';
          break;
      }
      
      setState(prev => ({ ...prev, isListening: false, error: errorMessage }));
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setState(prev => {
        // Only process if we have a transcript and aren't already processing
        if (prev.transcript && !prev.isProcessing) {
          processCommand(prev.transcript);
        }
        return { ...prev, isListening: false };
      });
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const processCommand = async (transcript: string) => {
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const { data, error } = await supabase.functions.invoke('voice-assistant', {
        body: { transcript },
      });

      if (error) throw error;

      const result: VoiceCommandResult = data;
      setState(prev => ({
        ...prev,
        isProcessing: false,
        lastResult: result,
        error: result.success ? null : result.message,
      }));

      // Speak the response
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(result.message);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.1;
        speechSynthesis.speak(utterance);
      }

      return result;
    } catch (error) {
      console.error('Error processing command:', error);
      const errorMessage = 'Erro ao processar comando. Tente novamente.';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
        lastResult: { success: false, message: errorMessage },
      }));
    }
  };

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setState(prev => ({
        ...prev,
        error: 'Reconhecimento de voz não disponível',
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      error: null,
      transcript: '',
      lastResult: null,
    }));

    try {
      recognitionRef.current.start();
      
      // Auto-stop after 10 seconds
      timeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 10000);
    } catch (error) {
      console.error('Error starting recognition:', error);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isListening: false,
      isProcessing: false,
      transcript: '',
      lastResult: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    reset,
    isSupported: isSpeechRecognitionSupported(),
  };
}
