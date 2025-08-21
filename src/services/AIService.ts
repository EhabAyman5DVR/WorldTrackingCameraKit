// Types for API responses
export interface AIResponse {
  text: string;          // GPT response text
  audioUrl: string;      // TTS audio URL
  visemeData: Viseme[]; // Lip-sync data
}

export interface Viseme {
  timestamp: number;
  value: string;
  duration: number;
}

export interface APIError {
  message: string;
  code: number;
  details?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  version: string;
}

export interface GPTRequest {
  transcription: string;
  model?: string;
  backstory?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface TTSRequestOpenAI {
  text: string;
  voice: string; // e.g., 'alloy', 'shimmer', etc.
}

class AIService {
  private readonly BASE_URL = 'https://www.5d-ai-hub.com/api';
  private token: string | null = null;
  private tokenExpiryTime: Date | null = null;

  // Load token from localStorage
  private loadToken(): { token: string; expiryTime: Date } | null {
    const tokenData = localStorage.getItem('aiToken');
    if (tokenData) {
      const { token, expiryTime } = JSON.parse(tokenData);
      return { token, expiryTime: new Date(expiryTime) };
    }
    return null;
  }

  // Save token to localStorage
  private saveToken(token: string, expiryTime: Date): void {
    localStorage.setItem('aiToken', JSON.stringify({ token, expiryTime }));
    this.token = token;
    this.tokenExpiryTime = expiryTime;
  }

  // Check if token is valid
  private isTokenValid(): boolean {
    if (!this.token || !this.tokenExpiryTime) {
      const savedToken = this.loadToken();
      if (savedToken) {
        this.token = savedToken.token;
        this.tokenExpiryTime = savedToken.expiryTime;
      }
    }
    return !!(this.token && this.tokenExpiryTime && this.tokenExpiryTime > new Date());
  }

  // Login method
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      // Check for cached token first
      if (this.isTokenValid()) {
        console.log('Using cached token');
        return { token: this.token!, version: 'cached' };
      }

      const response = await fetch(`${this.BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await this.handleResponse<LoginResponse>(response);

      // Save token with 30-minute expiry
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 30);
      this.saveToken(data.token, expiryTime);

      console.log('Login successful. Token cached.');
      return data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // Add authorization header to requests
  //   private getHeaders(): HeadersInit {
  //     const headers: HeadersInit = {
  //       'Content-Type': 'application/json'
  //     };

  //     if (this.token) {
  //       headers['Authorization'] = `Bearer ${this.token}`;
  //     }

  //     return headers;
  //   }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new APIError(
        error.message || `HTTP error! status: ${response.status}`,
        response.status
      );
    }
    return await response.json();
  }

  // Language settings
  private lang: string = 'en'; // Default language
  private langForGoogleASR: string = 'en-US'; // Default ASR language

  // Set language for transcription
  setLanguage(language: 'en' | 'ar'): void {
    this.lang = language;
    switch (language) {
      case 'en':
        this.langForGoogleASR = 'en-US'; // English
        break;
      case 'ar':
        this.langForGoogleASR = 'ar-XA'; // Arabic
        break;
      default:
        console.error('Invalid language code selected.');
        throw new APIError('Invalid language code', 400);
    }
  }

  async generateTTSUsingOpenAI(text: string, voice: string = 'alloy'): Promise<string> {
    try {
      if (!this.isTokenValid()) {
        throw new APIError('Not authenticated', 401);
      }

      const ttsUrl = `${this.BASE_URL}/tts-open-ai`;
      console.log('Sending text to OpenAI TTS:', text);

      const ttsRequestPayload: TTSRequestOpenAI = {
        text: text,
        voice: voice
      };

      const response = await fetch(ttsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(ttsRequestPayload)
      });

      const mp3Url = await response.text(); // Expecting plain URL as text
      console.log('Received .mp3 URL from OpenAI:', mp3Url);

      if (!response.ok) {
        throw new APIError(mp3Url || `HTTP error! status: ${response.status}`, response.status);
      }
      
      return mp3Url.trim().replace(/"/g, ''); // Clean up URL from potential quotes
    } catch (error) {
      console.error('OpenAI TTS error:', error);
      if (error instanceof APIError) {
        throw error;
      } else {
        throw new APIError(`Failed to process OpenAI TTS request: ${(error as Error).message}`, 500);
      }
    }
  }

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      if (!this.isTokenValid()) {
        throw new APIError('Not authenticated', 401);
      }

      // Create form data with language and audio
      const formData = new FormData();
      formData.append('language', this.langForGoogleASR);
      formData.append('audio', audioBlob, 'audio.wav');
      const response = await fetch(`${this.BASE_URL}/asr-google`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json'
        },
        body: formData
      });
      console.log(response)
      // Get the raw text response
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      // Try to parse as JSON first
      let transcriptionText: string;
      try {
        const data = JSON.parse(responseText);
        transcriptionText = data.text || responseText;
      } catch {
        // If not JSON, use the raw text
        transcriptionText = responseText;
      }

      if (!transcriptionText || transcriptionText.trim() === '') {
        // Handle empty transcription with language-specific messages
        const errorMessage = this.lang === 'ar'
          ? 'عذرا لم استطع سماعك تاكد من ان الميكروفون يعمل جيدا'
          : 'Sorry, I cannot hear you well. Please check your microphone.';

        throw new APIError(errorMessage, 400);
      }

      console.log('Transcription successful:', transcriptionText);
      return transcriptionText;

    } catch (error) {
      console.error('Transcription error:', error);

      // Handle errors with language-specific messages
      const errorMessage = this.lang === 'ar'
        ? 'عذرا لم استطع سماعك تاكد من ان الميكروفون يعمل جيدا'
        : 'Sorry, I cannot hear you well. Please check your microphone.';

      // If it's not already an APIError, create one
      if (!(error instanceof APIError)) {
        throw new APIError(errorMessage, 500);
      }

      throw error;
    }
  }

  async sendTranscriptionToGPT(
    transcription: string,
    options?: {
      model?: string;
      backstory?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    try {
      if (!this.isTokenValid()) {
        throw new APIError('Not authenticated', 401);
      }

      const gptUrl = `${this.BASE_URL}/gpt`;
      console.log('Sending transcription to GPT:', transcription);

      const gptRequestPayload: GPTRequest = {
        transcription: transcription,
        ...options
      };

      const response = await fetch(gptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(gptRequestPayload)
      });

      // Directly get the text response as the backend sends plain text
      const responseText = await response.text();
      console.log('GPT Raw Response:', responseText);

      if (!response.ok) {
        throw new APIError(responseText || `HTTP error! status: ${response.status}`, response.status);
      }

      return responseText;
    } catch (error) {
      console.error('Failed to send transcription to GPT:', error);
      if (error instanceof APIError) {
        throw error;
      } else {
        throw new APIError(`Failed to process GPT request: ${(error as Error).message}`, 500);
      }
    }
  }

}

// Custom error class for API errors
export class APIError extends Error {
  code: number;
  details?: string;

  constructor(message: string, code: number, details?: string) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.details = details;
  }
}

// Export a singleton instance
export const aiService = new AIService();
