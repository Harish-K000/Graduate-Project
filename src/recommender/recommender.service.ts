import { Injectable } from '@nestjs/common';
import {
  RecommenderInput,
  RecommenderOutput,
  RedFlagInfo,
  ServiceRecommendation,
} from './recommender.types';

@Injectable()
export class RecommenderService {
  // MAIN ENTRY POINT
  recommend(input: RecommenderInput): RecommenderOutput {
    const tags = this.cleanAndTag(input);
    const redFlag = this.checkRedFlags(input, tags);

    if (redFlag) {
      const topService: ServiceRecommendation = {
        name: 'Urgent medical assessment',
        why: redFlag.message,
        nextSteps: redFlag.advice,
      };

      return {
        topService,
        backupOption: undefined,
        redFlag,
        tags,
      };
    }

    const candidates = this.applyRules(input, tags);
    const ranked = this.scoreAndSort(candidates, tags, input);

    const topService = ranked[0];
    const backupOption = ranked.length > 1 ? ranked[1] : undefined;

    return {
      topService,
      backupOption,
      redFlag: null,
      tags,
    };
  }

  // STEP 1: CLEANING & TAGGING (from your slide example)
  private cleanAndTag(input: RecommenderInput): string[] {
    const tags: string[] = [];
    const body = (input.bodyArea || '').toLowerCase();
    const sport = (input.sport || '').toLowerCase();
    const pain = (input.painType || '').toLowerCase();
    const mechanism = (input.injuryMechanism || '').toLowerCase();
    const goal = (input.goal || '').toLowerCase();
    const urgency = (input.urgency || '').toLowerCase();

    // location
    if (body.includes('knee')) tags.push('knee_pain');
    if (body.includes('shoulder')) tags.push('shoulder_pain');
    if (body.includes('neck')) tags.push('neck_pain');
    if (body.includes('back')) tags.push('back_pain');

    // sport / activity
    if (sport.includes('run')) tags.push('running');
    if (sport.includes('lifting') || sport.includes('gym')) tags.push('strength_training');

    // onset / timing
    if (pain.includes('week')) tags.push('acute_onset_2w'); // simple example
    if (pain.includes('month')) tags.push('subacute_onset');

    // pattern
    if (pain.includes('sharp')) tags.push('sharp_pain');
    if (pain.includes('dull')) tags.push('dull_pain');

    // mechanism
    if (mechanism.includes('no fall') || mechanism.includes('no trauma')) {
      tags.push('no_trauma');
      tags.push('overuse_suspected');
    }
    if (mechanism.includes('twisted') || mechanism.includes('sprain')) {
      tags.push('sprain_suspected');
    }
    if (mechanism.includes('surgery') || mechanism.includes('post-op') || mechanism.includes('post op')) {
      tags.push('post_op');
    }

    // swelling
    if (input.swelling === true) tags.push('swelling_true');
    if (input.swelling === false) tags.push('swelling_false');

    // goals
    if (goal.includes('run')) tags.push('return_to_running_goal');
    if (goal.includes('strong') || goal.includes('strength')) tags.push('strength_goal');
    if (goal.includes('fitness') || goal.includes('general')) tags.push('general_fitness_goal');

    // urgency
    if (urgency === 'now') tags.push('high_urgency');
    if (urgency === 'soon') tags.push('medium_urgency');

    return tags;
  }

  // STEP 2: RED-FLAG CHECKS (very conservative; expand as needed)
  private checkRedFlags(input: RecommenderInput, tags: string[]): RedFlagInfo | null {
    // Example conservative rules — expand with your full red-flag list
    if (input.headHit && input.dizziness) {
      return {
        message:
          'Your symptoms could indicate a more serious head or neurological issue.',
        advice: [
          'Please seek urgent medical care or visit the emergency department.',
          'Do not continue training until you have been medically cleared.',
        ],
      };
    }

    if (tags.includes('knee_pain') && input.swelling && input.urgency === 'now') {
      return {
        message:
          'Significant knee pain with swelling and high urgency could indicate a more serious injury.',
        advice: [
          'Consider seeing a doctor, urgent care, or emergency department as soon as possible.',
          'If you book at Depth, mention the swelling and recent onset when you call.',
        ],
      };
    }

    // No red flag triggered
    return null;
  }

  // STEP 3: RULE MAPPING (tags -> candidate services)
  private applyRules(input: RecommenderInput, tags: string[]): ServiceRecommendation[] {
    const candidates: ServiceRecommendation[] = [];

    // Example from your "Runner with knee pain" case
    if (tags.includes('knee_pain') && (tags.includes('running') || tags.includes('overuse_suspected'))) {
      candidates.push({
        name: 'Physiotherapy',
        why:
          'Knee pain related to running and possible overuse is best assessed by a physiotherapist who can check your mechanics, loading, and strength.',
        nextSteps: [
          'Book an initial 60-minute physiotherapy assessment.',
          'Bring your running shoes and any braces or orthotics you currently use.',
          'Expect movement tests and a simple starting home plan.',
        ],
      });
    }

    // Swelling + acute / post-op: consider Game Ready / recovery add-on
    if (tags.includes('swelling_true') && (tags.includes('post_op') || tags.includes('sprain_suspected'))) {
      candidates.push({
        name: 'Physiotherapy + Game Ready / Recovery',
        why:
          'Because there is swelling after a recent injury or surgery, combining physiotherapy with focused recovery (e.g., Game Ready / icing protocols) can help manage pain and swelling.',
        nextSteps: [
          'Book physiotherapy as your primary service.',
          'Ask the therapist whether Game Ready or additional recovery sessions are appropriate for you.',
        ],
      });
    }

    // General fitness goals, no clear current pain: membership / training
    if (!tags.find((t) => t.endsWith('_pain')) && tags.includes('general_fitness_goal')) {
      candidates.push({
        name: 'Strength & Conditioning / Membership',
        why:
          'Since your main goal is general fitness without specific pain, a coached strength and conditioning program is a good starting point.',
        nextSteps: [
          'Book a consultation with a coach to review your goals and training history.',
          'Discuss how many sessions per week are realistic for you.',
        ],
      });
    }

    // Backup: if there is muscle tightness / overuse but user wants short-term relief
    if (tags.includes('overuse_suspected') && tags.includes('strength_training')) {
      candidates.push({
        name: 'Massage Therapy / Recovery Session',
        why:
          'If your main concern is muscle tightness or overuse soreness, a recovery-focused session or massage can provide short-term relief while you adjust training.',
        nextSteps: [
          'If pain persists or limits training, follow this with a physiotherapy assessment.',
        ],
      });
    }

    // If we somehow had no candidates, default to physio when there is pain
    const anyPain = tags.some((t) => t.endsWith('_pain'));
    if (candidates.length === 0 && anyPain) {
      candidates.push({
        name: 'Physiotherapy',
        why:
          'Because you are experiencing pain, the safest starting point is a physiotherapy assessment to understand what is going on.',
        nextSteps: [
          'Book an initial 60-minute physiotherapy assessment.',
          'Describe your symptoms and goals in the intake form.',
        ],
      });
    }

    return candidates;
  }

  // STEP 4: SCORING & RANKING
  private scoreAndSort(
    candidates: ServiceRecommendation[],
    tags: string[],
    input: RecommenderInput,
  ): ServiceRecommendation[] {
    const anyPain = tags.some((t) => t.endsWith('_pain'));

    for (const c of candidates) {
      c.score = 0;

      // Generic scoring
      if (c.name.includes('Physiotherapy') && anyPain) c.score! += 3;
      if (c.name.includes('Game Ready') && tags.includes('swelling_true')) c.score! += 2;
      if (c.name.includes('Membership') || c.name.includes('Strength & Conditioning')) {
        if (!anyPain) c.score! += 2;
      }

      if (tags.includes('return_to_running_goal') && c.name.includes('Physiotherapy')) {
        c.score! += 1;
      }

      // Slight boost for higher urgency → favour clinically oriented services
      if (input.urgency === 'now' && c.name.includes('Physiotherapy')) {
        c.score! += 1;
      }
    }

    return candidates.sort((a, b) => (b.score || 0) - (a.score || 0));
  }
}
