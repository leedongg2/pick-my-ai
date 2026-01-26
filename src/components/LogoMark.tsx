import React from 'react';
import { cn } from '@/utils/cn';

interface LogoMarkProps extends React.SVGAttributes<SVGSVGElement> {
  className?: string;
}

export const LogoMark: React.FC<LogoMarkProps> = ({ className, ...props }) => {
  return (
    <svg
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Pick-My-AI 로고"
      className={cn(className)}
      {...props}
    >
      <defs>
        <linearGradient id="logo-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="logo-gradient-2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="logo-gradient-3" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id="logo-gradient-4" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      
      {/* 4개의 삼각형으로 구성된 다이아몬드 */}
      <path
        d="M 256 120 L 360 256 L 256 256 Z"
        fill="url(#logo-gradient-1)"
      />
      <path
        d="M 360 256 L 256 392 L 256 256 Z"
        fill="url(#logo-gradient-2)"
      />
      <path
        d="M 256 392 L 152 256 L 256 256 Z"
        fill="url(#logo-gradient-3)"
      />
      <path
        d="M 152 256 L 256 120 L 256 256 Z"
        fill="url(#logo-gradient-4)"
      />
    </svg>
  );
};
