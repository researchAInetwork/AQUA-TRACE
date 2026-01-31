
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisReport, GroundingSource, RiskLevel, ConfidenceLevel } from "../types.ts";

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

async function getGeoLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) return null;
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return null;
  }
}

export async function analyzeWaterImage(file: File, context: string): Promise<{ report: AnalysisReport; sources: GroundingSource[] }> {
  // Always initialize fresh to ensure latest context/key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = await fileToBase64(file);
  const mimeType = file.type;
  const location = await getGeoLocation();

  const prompt = `
    Analyze this imagery of a water body for potential environmental pollution. 
    ${context ? `User provided context: ${context}` : ''}
    
    If available, identify:
    1. Visible indicators (discoloration, foam, debris, oil sheen, dead wildlife).
    2. Likely category (Industrial, Agricultural runoff, Urban sewage, Natural algae).
    3. Potential ecological impact and human health risks.
    4. Immediate recommendations for the user.

    Also, find nearby environmental testing labs or water authorities using the provided location.

    CRITICAL: You must return the analysis as a valid JSON object matching the following structure:
    {
      "observedIndicators": ["string"],
      "likelyPollutionCategory": "string",
      "environmentalImpactExplanation": "string",
      "humanHealthImplications": "string",
      "environmentalRiskLevel": "Low" | "Medium" | "High",
      "riskJustification": "string",
      "recommendedImmediateActions": ["string"],
      "confidenceLevel": "Low" | "Moderate" | "High",
      "assessmentLimitations": ["string"]
    }
  `;

  // MUST use gemini-2.5-flash for Maps grounding support
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      tools: [
        { googleSearch: {} },
        { googleMaps: {} }
      ],
      ...(location && {
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: location.latitude,
              longitude: location.longitude
            }
          }
        }
      })
    }
  });

  const text = response.text || '';
  
  // Extract JSON from response text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse analysis report from model response.");
  }

  const report: AnalysisReport = JSON.parse(jsonMatch[0]);
  
  // Extract Grounding Sources
  const sources: GroundingSource[] = [];
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  for (const chunk of groundingChunks) {
    if (chunk.web) {
      sources.push({ title: chunk.web.title, uri: chunk.web.uri });
    } else if (chunk.maps) {
      sources.push({ title: chunk.maps.title, uri: chunk.maps.uri });
    }
  }

  return { report, sources };
}

export async function generateAudioReport(report: AnalysisReport): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Summarize this water quality report for an environmental inspector. Be professional and urgent if risk is high.
    Category: ${report.likelyPollutionCategory}.
    Risk: ${report.environmentalRiskLevel}.
    Impact: ${report.environmentalImpactExplanation}.
    Recommendations: ${report.recommendedImmediateActions.join(', ')}.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audio synthesis failed.");
  return base64Audio;
}
