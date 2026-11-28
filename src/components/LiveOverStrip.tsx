import React, { useEffect, useRef } from 'react';
import { BallDisplayChip, DerivedInningsState, OverSummary } from '../engine/types';
import { TranslationDictionary } from '../i18n/translations';

interface LiveOverStripProps {
  inn: DerivedInningsState;
  t: TranslationDictionary;
}

export function formatCompactBallChip(
  chip: BallDisplayChip,
  t: TranslationDictionary
): { text: string; className: string } {
  if (chip.isWicket) {
    return {
      text: chip.label.includes(t.scoring.wktShort) ? chip.label : `${chip.label} ${t.scoring.wktShort}`,
      className: 'bg-wicket text-white border border-wicket',
    };
  }
  if (chip.isBoundary && chip.label.includes('6')) {
    return {
      text: chip.label,
      className: 'bg-six/20 text-six border border-six/50 font-black',
    };
  }
  if (chip.isBoundary || chip.label === '4') {
    return {
      text: chip.label,
      className: 'bg-four/20 text-four border border-four/50 font-black',
    };
  }
  if (chip.isExtra) {
    return {
      text: chip.label,
      className: 'bg-extra/20 text-extra border border-extra/50',
    };
  }
  return {
    text: chip.label,
    className: 'bg-card text-text border border-line',
  };
}

export const LiveOverStrip: React.FC<LiveOverStripProps> = ({ inn, t }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const oversList = inn.overSummaries;

  // Scroll to rightmost (newest ball) on every new ball or over change
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    }
  }, [oversList, inn.currentOverBalls.length]);

  return (
    <div
      data-testid="live-this-over-row"
      className="h-[clamp(44px,6.5vh,52px)] min-h-[44px] max-h-[52px] w-full bg-page border-t border-b border-line flex items-center relative overflow-hidden shrink-0 select-none"
    >
      {/* Soft fade gradients on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-page to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-page to-transparent pointer-events-none z-10" />

      <div
        ref={scrollRef}
        data-testid="live-over-strip"
        role="region"
        tabIndex={0}
        aria-label={t.scoring.oversHistoryAria || 'Overs and balls history'}
        className="w-full h-full flex items-center gap-1.5 overflow-x-auto touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-2.5 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-inset"
        style={{ scrollSnapType: 'none' }}
      >
        {oversList.length === 0 ? (
          <span className="text-sm text-muted italic px-1">{t.scoring.zeroBalls}</span>
        ) : (
          <ol className="flex items-center gap-1.5 list-none m-0 p-0">
            {oversList.map((os: OverSummary, oIdx: number) => (
              <React.Fragment key={os.overNumber}>
                {oIdx > 0 && (
                  <li aria-hidden="true" className="h-6 w-px bg-line/80 mx-1 shrink-0" />
                )}
                <li className="flex items-center gap-1 shrink-0">
                  <span className="text-[14px] font-bold font-mono text-muted shrink-0 pl-0.5">
                    {t.scoring.overAbbr || 'Ov'} {os.overNumber}
                  </span>
                  {os.balls.map((chip: BallDisplayChip) => {
                    const formatted = formatCompactBallChip(chip, t);
                    return (
                      <span
                        key={chip.eventId}
                        data-ball-chip="true"
                        data-chip="true"
                        className={`h-[clamp(34px,5vh,40px)] min-h-[32px] max-h-[40px] min-w-[32px] px-1.5 rounded-lg flex items-center justify-center font-mono text-[14px] font-bold shrink-0 leading-none ${formatted.className}`}
                      >
                        {formatted.text}
                      </span>
                    );
                  })}
                </li>
              </React.Fragment>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
