import { StreamingSettings } from '@/types';

export class StreamingManager {
  private settings: StreamingSettings;
  private buffer: string = '';
  private chunks: string[] = [];
  private isStreaming: boolean = false;
  private errorCount: number = 0;
  private maxErrorRetries: number = 3;
  private onChunk?: (chunk: string) => void;
  private onComplete?: (fullText: string) => void;
  private onError?: (error: Error) => void;

  constructor(settings: StreamingSettings) {
    this.settings = settings;
  }

  updateSettings(settings: Partial<StreamingSettings>) {
    this.settings = { ...this.settings, ...settings };
  }

  async processStream(
    response: Response,
    options: {
      onChunk?: (chunk: string) => void;
      onComplete?: (fullText: string) => void;
      onError?: (error: Error) => void;
      onTyping?: (isTyping: boolean) => void;
    } = {}
  ) {
    this.onChunk = options.onChunk;
    this.onComplete = options.onComplete;
    this.onError = options.onError;
    this.isStreaming = true;
    this.buffer = '';
    this.chunks = [];

    try {
      // Show typing indicator
      if (this.settings.showTypingIndicator && options.onTyping) {
        options.onTyping(true);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          this.isStreaming = false;
          if (options.onTyping) options.onTyping(false);
          if (this.onComplete) this.onComplete(fullText);
          break;
        }

        // Decode chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // Add to buffer with controlled delay
        if (this.settings.bufferSize > 0) {
          this.buffer += chunk;
          
          if (this.buffer.length >= this.settings.bufferSize || done) {
            await this.processBuffer(fullText);
            fullText += this.buffer;
            this.buffer = '';
          }
        } else {
          // Process immediately without buffering
          await this.processChunk(chunk);
          fullText += chunk;
        }

        // Apply chunk delay for smooth animation
        if (this.settings.chunkDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, this.settings.chunkDelay));
        }
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private async processBuffer(currentFullText: string) {
    if (!this.buffer) return;

    const lines = this.buffer.split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        await this.processChunk(line);
      }
    }
  }

  private async processChunk(chunk: string) {
    // Parse SSE format if needed
    const processedChunk = this.parseSSE(chunk);
    
    if (processedChunk && this.onChunk) {
      this.chunks.push(processedChunk);
      this.onChunk(processedChunk);
    }
  }

  private parseSSE(chunk: string): string {
    // Handle Server-Sent Events format
    const lines = chunk.split('\n');
    let result = '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        
        if (data === '[DONE]') {
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          
          // Handle different response formats
          if (parsed.choices?.[0]?.delta?.content) {
            result += parsed.choices[0].delta.content;
          } else if (parsed.choices?.[0]?.text) {
            result += parsed.choices[0].text;
          } else if (parsed.content) {
            result += parsed.content;
          } else if (typeof parsed === 'string') {
            result += parsed;
          }
        } catch (e) {
          // If not JSON, treat as plain text
          if (data.trim()) {
            result += data;
          }
        }
      } else if (line.trim() && !line.startsWith(':')) {
        // Plain text line
        result += line;
      }
    }

    return result;
  }

  private handleError(error: Error) {
    this.errorCount++;
    
    if (this.settings.errorRecovery && this.errorCount < this.maxErrorRetries) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Streaming error, retrying (${this.errorCount}/${this.maxErrorRetries})...`);
      }
      // Retry logic would go here
    } else {
      this.isStreaming = false;
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  // Smooth scrolling utility
  smoothScrollToBottom(element: HTMLElement) {
    if (!this.settings.smoothScrolling) {
      element.scrollTop = element.scrollHeight;
      return;
    }

    const start = element.scrollTop;
    const end = element.scrollHeight - element.clientHeight;
    const duration = 300; // ms
    const startTime = performance.now();

    const scroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      element.scrollTop = start + (end - start) * easeProgress;
      
      if (progress < 1) {
        requestAnimationFrame(scroll);
      }
    };

    requestAnimationFrame(scroll);
  }

  // Typing indicator animation
  createTypingIndicator(): HTMLElement {
    const indicator = document.createElement('div');
    indicator.className = 'flex items-center gap-1 p-3';
    
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'w-2 h-2 bg-gray-400 rounded-full animate-bounce';
      dot.style.animationDelay = `${i * 0.1}s`;
      indicator.appendChild(dot);
    }
    
    return indicator;
  }

  // Get streaming status
  getStatus() {
    return {
      isStreaming: this.isStreaming,
      chunksReceived: this.chunks.length,
      errorCount: this.errorCount,
      bufferSize: this.buffer.length,
    };
  }

  // Cancel streaming
  cancel() {
    this.isStreaming = false;
    this.buffer = '';
    this.chunks = [];
    this.errorCount = 0;
  }
}

// Enhanced fetch with streaming support
export async function fetchWithStreaming(
  url: string,
  options: RequestInit & {
    onStream?: (chunk: string) => void;
    streamingSettings?: StreamingSettings;
  } = {}
) {
  const { onStream, streamingSettings, ...fetchOptions } = options;
  
  const defaultSettings: StreamingSettings = {
    enabled: true,
    bufferSize: 1024,
    chunkDelay: 50,
    showTypingIndicator: true,
    smoothScrolling: true,
    errorRecovery: true,
  };
  
  const settings = { ...defaultSettings, ...streamingSettings };
  const manager = new StreamingManager(settings);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        'Accept': 'text/event-stream',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    if (response.body && settings.enabled) {
      await manager.processStream(response, {
        onChunk: onStream,
        onComplete: (text) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('Streaming complete:', text.length);
          }
        },
        onError: (error) => {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Streaming error:', error);
          }
        },
      });
    }
    
    return response;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Fetch error:', error);
    }
    throw error;
  }
}
