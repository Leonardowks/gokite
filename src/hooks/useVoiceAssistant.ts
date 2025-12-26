import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VoiceAssistantState, VoiceCommandResult } from '@/types/voice';

export function useVoiceAssistant() {
  const [state, setState] = useState<VoiceAssistantState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    lastResult: null,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startListening = useCallback(async () => {
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
        // Stop all tracks
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

  const stopListening = useCallback(() => {
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

      // Step 1: Speech-to-Text with ElevenLabs
      console.log('Sending audio to ElevenLabs STT...');
      const { data: sttData, error: sttError } = await supabase.functions.invoke('elevenlabs-stt', {
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

      // Step 2: Process command with Lovable AI
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

      // Step 3: Text-to-Speech response with ElevenLabs
      if (result.message) {
        console.log('Generating TTS response...');
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ text: result.message }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.audioContent) {
              const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
              const audio = new Audio(audioUrl);
              audio.play().catch(e => console.log('Audio playback error:', e));
            }
          }
        } catch (ttsError) {
          console.error('TTS error (non-critical):', ttsError);
          // Continue without TTS - not critical
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
    isSupported: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  };
}
