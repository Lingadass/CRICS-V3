import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatBallChipDisplay } from '../components/LiveScoreboardCard';
import { formatBallConfirmationMessage } from '../components/LiveScoringKeypad';
import { deriveCareerStats, deriveHeadToHead } from '../engine/careerStatsEngine';
import { BallEvent, MatchRecord, Player } from '../engine/types';
import { formatBowlingStyle, getTranslations } from '../i18n/translations';

const mkPlayer = (
  id: string,
  name: string,
  bowlingStyle: Player['bowlingStyle'] = 'None'
): Player => ({
  id,
  name,
  dob: '1996-05-12',
  role: bowlingStyle === 'None' ? 'Batter' : 'Bowler',
  battingStyle: 'Right-hand bat',
  bowlingStyle,
  jerseyNumber: 7,
  createdAt: 1000,
});

describe('STAGE 11 GROUP E: Scoring Layout & Stats Polish Unit Tests', () => {
  it('22(a). exposes separate 30s, 50s, and 100s labels and separates 30-49, 50-99, and 100+ counts accurately', () => {
    const en = getTranslations('en');
    const hi = getTranslations('hi');
    const es = getTranslations('es');

    expect(en.careers.thirtiesShort).toBe('30s');
    expect(en.careers.fiftiesShort).toBe('50s');
    expect(en.careers.hundredsShort).toBe('100s');
    expect(hi.careers.thirtiesShort).toBeTruthy();
    expect(es.careers.thirtiesShort).toBeTruthy();

    const batter = mkPlayer('P-BAT', 'DHANA', 'None');
    const otherBat = mkPlayer('P-NS', 'RISHI', 'None');
    const bowler = mkPlayer('P-BWL', 'LINGADASS', 'Right-arm fast');
    const bowlerOther = mkPlayer('P-BWL2', 'KARTHIK', 'None');

    const match: MatchRecord = {
      id: 'M-MILESTONE',
      title: 'Milestone Match',
      format: 'T20',
      venue: 'Oval',
      date: '2026-04-01',
      season: '2026',
      teamAId: 'T-A',
      teamBId: 'T-B',
      teamAXI: [batter.id, otherBat.id],
      teamBXI: [bowler.id, bowlerOther.id],
      tossWinnerTeamId: 'T-A',
      tossDecision: 'bat',
      rules: {
        oversPerInnings: 20,
        ballsPerOver: 6,
        wideRuns: 1,
        noBallRuns: 1,
        freeHitEnabled: true,
        powerplayOvers: 6,
        maxOversPerBowler: 4,
      },
      innings: [
        {
          inningsNumber: 1,
          battingTeamId: 'T-A',
          bowlingTeamId: 'T-B',
          openingStrikerId: batter.id,
          openingNonStrikerId: otherBat.id,
          openingBowlerId: bowler.id,
        },
      ],
      currentInningsNumber: 1,
      status: 'completed',
      scorerName: 'Scorer',
      createdAt: 1,
      updatedAt: 2,
    };

    // 6 balls of 6 => 36 runs (counts as one 30s, zero 50s, zero 100s)
    const events: BallEvent[] = Array.from({ length: 6 }, (_, i) => ({
      id: `EV-${i + 1}`,
      matchId: match.id,
      inningsNumber: 1,
      sequence: i + 1,
      timestamp: 1000 + i,
      actionType: 'delivery',
      strikerId: batter.id,
      nonStrikerId: otherBat.id,
      bowlerId: bowler.id,
      runsOffBat: 6,
      extraType: 'none',
      extraRuns: 0,
      isWicket: false,
    }));

    const stats = deriveCareerStats([batter, otherBat, bowler, bowlerOther], [match], events);
    expect(stats[batter.id].runs).toBe(36);
    expect(stats[batter.id].thirties).toBe(1);
    expect(stats[batter.id].fifties).toBe(0);
    expect(stats[batter.id].hundreds).toBe(0);
  });

  it('22(b). formats BowlingStyle "None" as translated "Does not bowl" across EN, HI, and ES while preserving active bowling styles', () => {
    const en = getTranslations('en');
    const hi = getTranslations('hi');
    const es = getTranslations('es');

    expect(formatBowlingStyle('None', en)).toBe('Does not bowl');
    expect(formatBowlingStyle('None', hi)).not.toBe('None');
    expect(formatBowlingStyle('None', hi)).toBe(hi.players.doesNotBowl);
    expect(formatBowlingStyle('None', es)).not.toBe('None');
    expect(formatBowlingStyle('None', es)).toBe(es.players.doesNotBowl);
    expect(formatBowlingStyle('Right-arm fast', en)).toBe('Right-arm fast');
    expect(formatBowlingStyle('Left-arm orthodox', hi)).toBe('Left-arm orthodox');
  });

  it('22(c). deriveHeadToHead supports As-bowler lookup so LINGADASS as bowler against DHANA reports the dismissal', () => {
    const dhana = mkPlayer('P-DHANA', 'DHANA', 'None');
    const partner = mkPlayer('P-PARTNER', 'ARJUN', 'None');
    const lingadass = mkPlayer('P-LINGA', 'LINGADASS', 'Right-arm medium');
    const keeper = mkPlayer('P-KP', 'VIKRAM', 'None');

    const match: MatchRecord = {
      id: 'M-H2H',
      title: 'Club Clash',
      format: 'T20',
      venue: 'Ground A',
      date: '2026-04-05',
      season: '2026',
      teamAId: 'T-1',
      teamBId: 'T-2',
      teamAXI: [dhana.id, partner.id],
      teamBXI: [lingadass.id, keeper.id],
      tossWinnerTeamId: 'T-1',
      tossDecision: 'bat',
      rules: {
        oversPerInnings: 20,
        ballsPerOver: 6,
        wideRuns: 1,
        noBallRuns: 1,
        freeHitEnabled: true,
        powerplayOvers: 6,
        maxOversPerBowler: 4,
      },
      innings: [
        {
          inningsNumber: 1,
          battingTeamId: 'T-1',
          bowlingTeamId: 'T-2',
          openingStrikerId: dhana.id,
          openingNonStrikerId: partner.id,
          openingBowlerId: lingadass.id,
        },
      ],
      currentInningsNumber: 1,
      status: 'live',
      scorerName: 'Scorer',
      createdAt: 1,
      updatedAt: 2,
    };

    const events: BallEvent[] = [
      {
        id: 'E1',
        matchId: match.id,
        inningsNumber: 1,
        sequence: 1,
        timestamp: 1001,
        actionType: 'delivery',
        strikerId: dhana.id,
        nonStrikerId: partner.id,
        bowlerId: lingadass.id,
        runsOffBat: 4,
        extraType: 'none',
        extraRuns: 0,
        isBoundaryFour: true,
        isWicket: false,
      },
      {
        id: 'E2',
        matchId: match.id,
        inningsNumber: 1,
        sequence: 2,
        timestamp: 1002,
        actionType: 'delivery',
        strikerId: dhana.id,
        nonStrikerId: partner.id,
        bowlerId: lingadass.id,
        runsOffBat: 0,
        extraType: 'none',
        extraRuns: 0,
        isWicket: true,
        wicketType: 'bowled',
        dismissedPlayerId: dhana.id,
      },
    ];

    // Viewing LINGADASS "As batter" vs DHANA -> 0 balls, 0 dismissals
    const asBatter = deriveHeadToHead(lingadass.id, dhana.id, events, { [match.id]: match });
    expect(asBatter.balls).toBe(0);
    expect(asBatter.dismissals).toBe(0);

    // Viewing LINGADASS "As bowler" vs DHANA (batterId=dhana, bowlerId=lingadass) -> 2 balls, 4 runs, 1 dismissal
    const asBowler = deriveHeadToHead(dhana.id, lingadass.id, events, { [match.id]: match });
    expect(asBowler.balls).toBe(2);
    expect(asBowler.runs).toBe(4);
    expect(asBowler.fours).toBe(1);
    expect(asBowler.dismissals).toBe(1);
  });

  it('22(d). localizes ball confirmation banners and over chips in HI and ES without hardcoded English fallback', () => {
    const hi = getTranslations('hi');
    const es = getTranslations('es');

    const dotEvent = {
      actionType: 'delivery' as const,
      runsOffBat: 0,
      extraType: 'none' as const,
      extraRuns: 0,
      isWicket: false,
    };
    const wideTwoEvent = {
      actionType: 'delivery' as const,
      runsOffBat: 0,
      extraType: 'wide' as const,
      extraRuns: 2,
      isWicket: false,
    };
    const swapEvent = {
      actionType: 'manual-strike-swap' as const,
      runsOffBat: 0,
      extraType: 'none' as const,
      extraRuns: 0,
      isWicket: false,
    };

    const hiDot = formatBallConfirmationMessage(dotEvent, hi);
    const esDot = formatBallConfirmationMessage(dotEvent, es);
    expect(hiDot).not.toContain('Dot ball');
    expect(esDot).not.toContain('Dot ball');

    const hiWide = formatBallConfirmationMessage(wideTwoEvent, hi);
    const esWide = formatBallConfirmationMessage(wideTwoEvent, es);
    expect(hiWide).toContain(hi.scoring.wide);
    expect(hiWide).not.toContain('recorded');
    expect(esWide).toContain(es.scoring.wide);
    expect(esWide).not.toContain('recorded');

    expect(formatBallConfirmationMessage(swapEvent, hi)).toBe(hi.scoring.confirmStrikeSwapped);
    expect(formatBallConfirmationMessage(swapEvent, es)).toBe(es.scoring.confirmStrikeSwapped);

    const hiSixChip = formatBallChipDisplay(
      { label: '6', isWicket: false, isBoundary: true, isExtra: false },
      hi
    );
    expect(hiSixChip.text).toBe(`6 ${hi.scoring.sixUpper}`);
  });

  it('Group E UI structure invariants exist in touched components', () => {
    const careersSource = fs.readFileSync(
      path.resolve(__dirname, '../components/CareersView.tsx'),
      'utf8'
    );
    expect(careersSource).not.toContain('thirtyPlusScoresLabel');
    expect(careersSource).toContain('thirtiesShort');
    expect(careersSource).toContain('fiftiesShort');
    expect(careersSource).toContain('hundredsShort');
    expect(careersSource).toContain('formatBowlingStyle');

    const h2hSource = fs.readFileSync(
      path.resolve(__dirname, '../components/CareersAnalyticsSections.tsx'),
      'utf8'
    );
    expect(h2hSource).toContain('h2h-role-batter');
    expect(h2hSource).toContain('h2h-role-bowler');

    const scoreboardSource = fs.readFileSync(
      path.resolve(__dirname, '../components/LiveScoreboardCard.tsx'),
      'utf8'
    );
    expect(scoreboardSource).toContain('text-[40px]');
    expect(scoreboardSource).toContain('text-[16px]');
    expect(scoreboardSource).toContain('text-[20px]');
    expect(scoreboardSource).toContain('min-h-[48px]');
  });
});
