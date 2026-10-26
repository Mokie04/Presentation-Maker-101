import type { CONTENT_LAYOUT, CREDIT_LAYOUT, SLIDE_COUNTER, TITLE_LAYOUT } from '../slide-theme';

// Widen literal values while retaining each layout's numeric/percentage units.
type LayoutValues<T> = {
  readonly [K in keyof T]: T[K] extends number ? number
    : T[K] extends `${number}%` ? `${number}%` : LayoutValues<T[K]>;
};

export interface SlideTheme {
  readonly id: string;
  readonly name: string;
  /** Six-digit sRGB hex values without #. */
  readonly palette: {
    readonly background: string;
    readonly primary: string;
    readonly secondary: string;
    readonly textDark: string;
    readonly heading: string;
    readonly muted: string;
    readonly subtle: string;
    readonly cardBackground: string;
    readonly cardBorder: string;
  };
  readonly typography: {
    readonly exportFace: string;
    /** CSS font-family; bundled font variables are provided by lib/fonts. */
    readonly previewFont: string;
    readonly metricsId: string;
  };
  readonly shape: {
    /** Percentage of the visual card's shorter side. */
    readonly visualCornerRadius: `${number}%`;
    readonly visualBorderWidth: number;
  };
  readonly layout: {
    readonly title: LayoutValues<typeof TITLE_LAYOUT>;
    readonly content: LayoutValues<typeof CONTENT_LAYOUT>;
    readonly credit: LayoutValues<typeof CREDIT_LAYOUT>;
    readonly counter: LayoutValues<typeof SLIDE_COUNTER>;
  };
}
