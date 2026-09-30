const PROFANITY = ['fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'bastard', 'slut', 'whore', 'хуй', 'пизда', 'ебать', 'блядь', 'сука', 'пидор'];
const GOV_KEYWORDS = ['government', 'president', 'правительство', 'президент', 'парламент', 'государство', 'politics', 'пошл']; // added some basic words

export async function moderateContent(text: string): Promise<{ isAllowed: boolean; reason?: string }> {
 if (!text) return { isAllowed: true };
 const lower = text.toLowerCase();
 
 if (PROFANITY.some(word => lower.includes(word))) {
 return { isAllowed: false, reason: "Profanity is not allowed. A warning will be recorded." };
 }
 
 if (GOV_KEYWORDS.some(word => lower.includes(word))) {
 return { isAllowed: false, reason: "Political or government-directed discussions are not allowed." };
 }
 
 return { isAllowed: true };
}
