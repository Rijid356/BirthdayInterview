// Default birthday interview questions
// Users can customize these per child in a future version

const DEFAULT_QUESTIONS = [
  // Basics
  { id: 'q1', text: 'How old are you today?', category: 'basics' },

  // Favorites
  { id: 'q2', text: "What's your favorite color?", category: 'favorites', enrichable: true, enrichmentType: 'color' },
  { id: 'q3', text: "What's your favorite food?", category: 'favorites', enrichable: true, enrichmentType: 'food' },
  { id: 'q4', text: "What's your favorite animal?", category: 'favorites', enrichable: true, enrichmentType: 'animal' },
  { id: 'q5', text: "What's your favorite song or music?", category: 'favorites', enrichable: true, enrichmentType: 'song', spotifySearch: true },
  { id: 'q6', text: "What's your favorite book or story?", category: 'favorites', enrichable: true, enrichmentType: 'book' },
  { id: 'q7', text: "What's your favorite thing to do for fun?", category: 'favorites', enrichable: true, enrichmentType: 'activity' },
  { id: 'q8', text: "What's your favorite movie?", category: 'favorites', enrichable: true, enrichmentType: 'movie' },
  { id: 'q21', text: "What's your favorite TV show?", category: 'favorites', enrichable: true, enrichmentType: 'tvshow' },
  { id: 'q22', text: "What's your favorite restaurant?", category: 'favorites', enrichable: true, enrichmentType: 'restaurant' },

  // Friends & Family
  { id: 'q9', text: "Who's your best friend?", category: 'people' },
  { id: 'q10', text: "What's your favorite thing to do with your family?", category: 'people' },

  // Dreams & Aspirations
  { id: 'q11', text: 'What do you want to be when you grow up?', category: 'dreams' },
  { id: 'q12', text: 'If you could have any superpower, what would it be?', category: 'dreams' },
  { id: 'q13', text: 'If you could go anywhere in the world, where would you go?', category: 'dreams' },
  { id: 'q14', text: 'What do you wish you could learn how to do?', category: 'dreams' },

  // Reflections
  { id: 'q15', text: "What's the best thing that happened this year?", category: 'reflections' },
  { id: 'q16', text: 'What was the funniest thing that happened this year?', category: 'reflections' },
  { id: 'q17', text: "What's something you're really proud of?", category: 'reflections' },
  { id: 'q18', text: "What's something that makes you happy?", category: 'reflections' },

  // Fun & Silly
  { id: 'q19', text: 'If you could eat one food every day forever, what would it be?', category: 'fun' },
  { id: 'q20', text: "What's the silliest thing you can think of?", category: 'fun' },
];

export const QUESTION_CATEGORIES = {
  basics: { label: 'The Basics', emoji: '🎂' },
  favorites: { label: 'Favorites', emoji: '⭐' },
  people: { label: 'Friends & Family', emoji: '❤️' },
  dreams: { label: 'Dreams & Wishes', emoji: '✨' },
  reflections: { label: 'Looking Back', emoji: '🪞' },
  fun: { label: 'Fun & Silly', emoji: '🎈' },
};

export default DEFAULT_QUESTIONS;
