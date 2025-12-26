export interface VoiceCommandResult {
  success: boolean;
  message: string;
  intent?: string;
  confidence?: number;
  transcript?: string;
  data?: Record<string, any>;
  navigation?: { route: string; pagina: string };
  actionExecuted?: boolean;
}

export interface VoiceAssistantState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  lastResult: VoiceCommandResult | null;
  error: string | null;
}

export type VoiceIntent = 
  | 'registrar_despesa'
  | 'consultar_faturamento'
  | 'cadastrar_cliente'
  | 'agendar_aula'
  | 'criar_aluguel'
  | 'consulta_geral';
