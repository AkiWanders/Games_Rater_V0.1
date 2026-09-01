const CATEGORIES = [
  {
    key: 'art',
    name: 'Art',
    icon: '🎨',
    questions: [
      'Color palette and mood',
      'Environment/world design',
      'Character/outfit design',
      'Animation quality',
      'Creativity/originality',
    ],
  },
  {
    key: 'sound',
    name: 'Sound & Music',
    icon: '🎵',
    questions: [
      'Score/theme memorability',
      'Combat audio',
      'Ambient/atmospheric sound',
      'Voice acting quality',
      'Overall immersion',
    ],
  },
  {
    key: 'gameplay',
    name: 'Gameplay',
    icon: '🎮',
    questions: [
      'Control responsiveness',
      'Combat feel',
      'Traversal/movement fluidity',
      'Learning curve/intuitiveness',
      'Bugs/jank affecting play',
    ],
  },
  {
    key: 'story',
    name: 'Story & Lore',
    icon: '📖',
    questions: [
      'Protagonist/character depth',
      'Plot pacing & dialogue quality',
      'World-building coherence',
      'Emotional/philosophical impact',
      'Memorability',
    ],
  },
  {
    key: 'fun',
    name: 'Fun',
    icon: '😄',
    questions: [
      'Moment-to-moment satisfaction',
      'Reward-to-effort ratio',
      'Difficulty satisfaction',
      'Replayability/pull factor',
      'Overall time-well-spent feeling',
    ],
  },
];

const SCORES = [
  { value: 0, label: 'Bad', emoji: '😖' },
  { value: 1, label: 'Meh', emoji: '😐' },
  { value: 2, label: 'Good', emoji: '🙂' },
  { value: 3, label: 'Masterpiece', emoji: '🤩' },
];

const STORAGE_KEY = 'akiGameRater.games';

function categoryTotal(scores, catKey) {
  const cat = CATEGORIES.find((c) => c.key === catKey);
  const arr = scores[catKey] || [];
  const raw = arr.reduce((s, v) => s + (Number(v) || 0), 0);
  const max = cat.questions.length * 3;
  return round1((raw / max) * 10);
}

function finalScore(game) {
  if (game.override != null && game.override !== '') {
    return round1(Number(game.override));
  }
  const sum = CATEGORIES.reduce((s, cat) => s + categoryTotal(game.scores, cat.key), 0);
  return round1(sum / CATEGORIES.length);
}

function finalMode(game) {
  return (game.override == null || game.override === '') ? 'auto' : 'manual';
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function badgeClass(score) {
  if (score >= 9) return 'badge-s';
  if (score >= 7.5) return 'badge-a';
  if (score >= 6) return 'badge-b';
  if (score >= 4) return 'badge-c';
  if (score >= 2) return 'badge-d';
  return 'badge-f';
}

function rankTier(score) {
  if (score >= 9) return { label: 'S', cls: 'tier-s' };
  if (score >= 7.5) return { label: 'A', cls: 'tier-a' };
  if (score >= 6) return { label: 'B', cls: 'tier-b' };
  if (score >= 4) return { label: 'C', cls: 'tier-c' };
  if (score >= 2) return { label: 'D', cls: 'tier-d' };
  return { label: 'F', cls: 'tier-f' };
}
