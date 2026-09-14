declare module 'text-readability' {
  interface Readability {
    fleschReadingEase(text: string): number;
    fleschKincaidGrade(text: string): number;
    gunningFog(text: string): number;
    smogIndex(text: string): number;
    automatedReadabilityIndex(text: string): number;
    colemanLiauIndex(text: string): number;
    daleChallReadabilityScore(text: string): number;
    textStandard(text: string, floatOutput?: boolean): string | number;
    syllableCount(text: string): number;
    lexiconCount(text: string, removePunctuation?: boolean): number;
    sentenceCount(text: string): number;
  }
  const rs: Readability;
  export default rs;
}
