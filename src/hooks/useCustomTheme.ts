'use client';

import { useStore } from '@/store';
import { useMemo } from 'react';

/**
 * 커스텀 디자인 테마를 실제 UI에 적용하기 위한 훅
 */
export function useCustomTheme() {
  const { customDesignTheme } = useStore();

  // 배경색에 따라 대비되는 글자색 계산
  const getContrastColor = (hexColor: string): string => {
    const hex = hexColor?.replace('#', '');
    if (!hex || hex.length !== 6) return '#ffffff';
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#111827' : '#ffffff';
  };

  // 전역 테마 색상 (기본값 포함)
  const theme = useMemo(() => {
    return customDesignTheme.theme || {
      primaryColor: '#3b82f6',
      secondaryColor: '#6366f1',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      buttonColor: '#3b82f6',
      cardColor: '#f9fafb',
      headerColor: '#ffffff',
    };
  }, [customDesignTheme.theme]);

  const getElementStyle = (elementId: string, defaultStyle: React.CSSProperties = {}): React.CSSProperties => {
    // 개별 요소 색상이 있으면 우선 사용
    const customColor = customDesignTheme.elementColors[elementId];
    
    if (customColor) {
      // 요소 ID에 따라 적절한 스타일 속성 반환
      if (elementId.includes('background') || elementId.includes('button') || elementId.includes('badge') || elementId.includes('card')) {
        return {
          ...defaultStyle,
          backgroundColor: customColor,
          color: getContrastColor(customColor),
        };
      }

      if (elementId.includes('text') || elementId.includes('title') || elementId.includes('description')) {
        return {
          ...defaultStyle,
          color: customColor,
        };
      }

      if (elementId.includes('border')) {
        return {
          ...defaultStyle,
          borderColor: customColor,
        };
      }
    }

    // 개별 색상이 없으면 전역 테마 색상 사용
    if (elementId.includes('button') || elementId.includes('badge')) {
      return {
        ...defaultStyle,
        backgroundColor: theme.buttonColor,
        color: getContrastColor(theme.buttonColor),
      };
    }

    return defaultStyle;
  };

  const getThemeColor = (colorKey: keyof typeof customDesignTheme.theme) => {
    return customDesignTheme.theme?.[colorKey];
  };

  const hasCustomTheme = useMemo(() => {
    return customDesignTheme.theme !== null || Object.keys(customDesignTheme.elementColors).length > 0;
  }, [customDesignTheme]);

  return {
    customDesignTheme,
    theme,
    getElementStyle,
    getThemeColor,
    getContrastColor,
    hasCustomTheme,
  };
}
