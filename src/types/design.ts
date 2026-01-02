export interface DesignElement {
  id: string;
  type: 'button' | 'text' | 'background' | 'card' | 'header';
  label: string;
  selector: string;
  currentColor: string;
  scope?: 'global' | 'element';
}

export interface DesignTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  cardColor: string;
  headerColor: string;
}

export const defaultTheme: DesignTheme = {
  primaryColor: '#3b82f6',
  secondaryColor: '#6366f1',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  buttonColor: '#3b82f6',
  cardColor: '#f9fafb',
  headerColor: '#1f2937',
};

type ElementSelectorType = 'color' | 'background' | 'border';

export const elementClassMap: Record<
  string,
  {
    selector: string;
    type: ElementSelectorType;
  }
> = {
  header: { selector: 'header', type: 'background' },
  'nav-logo': { selector: '.preview-nav-logo', type: 'background' },
  'nav-title': { selector: '.preview-nav-title', type: 'color' },
  'nav-login': { selector: '.preview-nav-login', type: 'color' },
  'nav-signup': { selector: '.preview-nav-signup', type: 'background' },
  'nav-home-tab': { selector: '.preview-nav-home-tab', type: 'background' },
  'nav-home-tab-text': { selector: '.preview-nav-home-tab', type: 'color' },
  'nav-dashboard-tab': { selector: '.preview-nav-dashboard-tab', type: 'background' },
  'nav-dashboard-tab-text': { selector: '.preview-nav-dashboard-tab', type: 'color' },
  'nav-settings-tab': { selector: '.preview-nav-settings-tab', type: 'background' },
  'nav-settings-tab-text': { selector: '.preview-nav-settings-tab', type: 'color' },
  'hero-badge': { selector: '.preview-hero-badge', type: 'background' },
  'hero-primary-button': { selector: '.preview-hero-primary-button', type: 'background' },
  'hero-secondary-button': { selector: '.preview-hero-secondary-button', type: 'background' },
  'hero-secondary-button-text': { selector: '.preview-hero-secondary-button', type: 'color' },
  'hero-secondary-button-border': { selector: '.preview-hero-secondary-button', type: 'border' },
};
