import type { Metadata } from 'next';
import {
  DM_Sans,
  JetBrains_Mono,
  Outfit,
  Playfair_Display,
  Plus_Jakarta_Sans,
} from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-outfit',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  title: 'Audio Visualizer Studio',
  description:
    'Client-side audio visualization and MP4 video creator studio with 20 reactive templates, custom backgrounds, branding, and aspect ratios.',
  openGraph: {
    title: 'Audio Visualizer Studio',
    description:
      'Create and export real-time audio-reactive MP4 videos directly in your browser.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Audio Visualizer Studio',
    description:
      'Create and export real-time audio-reactive MP4 videos directly in your browser.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${dmSans.variable} ${jetbrainsMono.variable} ${outfit.variable} ${playfair.variable}`}
    >
      <body
        suppressHydrationWarning
        className="studio-ambient-canvas min-h-screen text-slate-900 selection:bg-sky-100 selection:text-sky-900"
      >
        {children}
      </body>
    </html>
  );
}
