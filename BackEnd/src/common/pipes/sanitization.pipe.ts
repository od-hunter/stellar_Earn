import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class SanitizationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) return value;

    // Handle different data types
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.transform(item, metadata));
    }

    if (typeof value === 'object') {
      const sanitized = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this.transform(val, metadata);
      }
      return sanitized;
    }

    return value;
  }

  private sanitizeString(str: string): string {
    if (typeof str !== 'string') return str;

    return (
      str
        // Remove NULL bytes
        .replace(/\0/g, '')
        // Remove control characters except tab, newline, carriage return
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Remove HTML tags (basic protection)
        .replace(/<[^>]*>/g, '')
        // Decode HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        // Trim whitespace
        .trim()
    );
  }
}
