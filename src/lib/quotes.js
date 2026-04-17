// quotes.js — Curated fitness motivational quotes

const quotes = [
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Your body can stand almost anything. It's your mind that you have to convince.", author: "Unknown" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "David Goggins" },
  { text: "The difference between try and triumph is a little 'umph'.", author: "Marvin Phillips" },
  { text: "Success starts with self-discipline.", author: "Unknown" },
  { text: "The body achieves what the mind believes.", author: "Napoleon Hill" },
  { text: "No matter how slow you go, you are still lapping everybody on the couch.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "The only way to define your limits is by going beyond them.", author: "Arthur C. Clarke" },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
  { text: "It never gets easier. You just get stronger.", author: "Unknown" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "The hard days are the best because that's when champions are made.", author: "Gabby Douglas" },
  { text: "You don't have to be extreme, just consistent.", author: "Unknown" },
  { text: "Strength does not come from the body. It comes from the will.", author: "Gandhi" },
  { text: "Your only limit is you.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { text: "What hurts today makes you stronger tomorrow.", author: "Jay Cutler" },
  { text: "Sweat is just fat crying.", author: "Unknown" },
  { text: "Be stronger than your excuses.", author: "Unknown" },
  { text: "If it doesn't challenge you, it won't change you.", author: "Fred DeVito" },
  { text: "You are one workout away from a better mood.", author: "Unknown" },
  { text: "Rome wasn't built in a day, but they worked on it every single day.", author: "Unknown" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Train insane or remain the same.", author: "Unknown" },
  { text: "Great things never came from comfort zones.", author: "Unknown" },
  { text: "The clock is ticking. Are you becoming the person you want to be?", author: "Greg Plitt" },
  { text: "Don't wish for it. Work for it.", author: "Unknown" },
  { text: "Strive for progress, not perfection.", author: "Unknown" },
  { text: "Your health is an investment, not an expense.", author: "Unknown" },
  { text: "Making excuses burns zero calories per hour.", author: "Unknown" },
  { text: "Once you learn to quit, it becomes a habit.", author: "Vince Lombardi" },
  { text: "The last three or four reps is what makes the muscle grow.", author: "Arnold Schwarzenegger" },
  { text: "Today I will do what others won't, so tomorrow I can do what others can't.", author: "Jerry Rice" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Every champion was once a contender that didn't give up.", author: "Gabby Douglas" },
  { text: "Blood, sweat, and respect. The first two you give. The last one you earn.", author: "Dwayne Johnson" },
  { text: "I don't count my sit-ups. I only start counting when it starts hurting.", author: "Muhammad Ali" },
  { text: "Obsessed is a word the lazy use to describe the dedicated.", author: "Unknown" },
  { text: "Whether you think you can, or you think you can't — you're right.", author: "Henry Ford" },
  { text: "Suffer the pain of discipline or suffer the pain of regret.", author: "Jim Rohn" },
  { text: "When you feel like quitting, think about why you started.", author: "Unknown" },
  { text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "We are what we repeatedly do. Excellence is not an act, but a habit.", author: "Aristotle" },
  { text: "A year from now you'll wish you had started today.", author: "Karen Lamb" },
  { text: "The resistance that you fight physically in the gym strengthens you.", author: "Arnold Schwarzenegger" },
];

export function getRandomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export function getDailyQuote() {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)
  );
  return quotes[dayOfYear % quotes.length];
}

export default quotes;
