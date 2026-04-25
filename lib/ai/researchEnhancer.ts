export async function fetchResearchData(
  niche: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _keywords: string[]
): Promise<{ trends: string[]; hooks: string[] }> {
  return {
    trends: [`Trending in ${niche}: sustainable fashion`, `Rising: quiet luxury accessories`],
    hooks: [`Why ${niche} is the new power move`, `The art of intentional dressing`],
  };
}
