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

  async getGPTResponse(text: string): Promise<string> {
    try {
      if (!this.isTokenValid()) {
        throw new APIError('Not authenticated', 401);
      }

      const response = await fetch(`${this.BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ text })
      });

      const data = await this.handleResponse<{ response: string }>(response);
      return data.response;
    } catch (error) {
      console.error('GPT error:', error);
      throw error;
    }
  }

  async generateSpeech(text: string): Promise<AIResponse> {
    try {
      if (!this.isTokenValid()) {
        throw new APIError('Not authenticated', 401);
      }

      const response = await fetch(`${this.BASE_URL}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ text })
      });

      return await this.handleResponse<AIResponse>(response);
    } catch (error) {
      console.error('TTS error:', error);
      throw error;
    }
  }

  // Main method to process audio and get complete response
  async processAudioMessage(audioBlob: Blob): Promise<AIResponse> {
    try {
      // 1. Convert audio to text
      const transcribedText = await this.transcribeAudio(audioBlob);
      console.log('Transcribed text:', transcribedText);

      // 2. Get GPT response
      const gptResponse = await this.getGPTResponse(transcribedText);
      console.log('GPT response:', gptResponse);

      // 3. Generate speech and visemes
      const aiResponse = await this.generateSpeech(gptResponse);
      console.log('Generated speech and visemes:', aiResponse);

      return aiResponse;
    } catch (error) {
      console.error('Processing error:', error);
      throw error;
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
