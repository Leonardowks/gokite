import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio } = await req.json();
    
    if (!audio) {
      throw new Error("Áudio não fornecido");
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY não configurada");
    }
    
    // Log key prefix for debugging (safe - only shows first chars)
    console.log("API Key prefix:", ELEVENLABS_API_KEY.substring(0, 8) + "...");
    console.log("Iniciando transcrição com ElevenLabs Scribe...");

    // Decode base64 audio
    const binaryAudio = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    
    // Create form data for ElevenLabs API
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: "audio/webm" });
    formData.append("file", blob, "audio.webm");
    formData.append("model_id", "scribe_v1");
    formData.append("language_code", "por"); // Portuguese

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs STT error:", response.status, errorText);

      // ElevenLabs returns 401 for both invalid keys and missing permissions.
      const missingSttPermission =
        errorText.includes("missing_permissions") ||
        errorText.toLowerCase().includes("speech_to_text");

      const message = missingSttPermission
        ? "Sua API key do ElevenLabs não tem a permissão speech_to_text (Speech-to-Text). Gere uma nova key com essa permissão e atualize o connector."
        : "Chave da API ElevenLabs inválida/expirada. Verifique a configuração do connector.";

      return new Response(
        JSON.stringify({ error: message, details: errorText }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await response.json();
    console.log("Transcrição concluída:", result.text);

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro no elevenlabs-stt:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
