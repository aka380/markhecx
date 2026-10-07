import type { BriefDraft } from '../creative';
/** Local extraction only. It does not invent a budget, rights, or timeline. */
export function extractBrief(prompt: string): BriefDraft {
  const find = (terms: string[]) => terms.find(term => new RegExp(`\\b${term}\\b`, 'i').test(prompt)) || '';
  return {
    title: prompt.trim().slice(0,100),
    contentType: find(['Product film','Social video','Product imagery','Animation','Video','Image']),
    style: find(['Cinematic','Minimal','Photorealistic','Playful','Editorial']),
    platform: find(['Instagram','YouTube','TikTok','Website']),
    format: find(['Video','Image','Animation']),
    aspectRatio: prompt.match(/\b(?:16:9|9:16|4:5|1:1)\b/)?.[0] || '',
    commercialUse: 'Unspecified',
    requirements: [],
  };
}
