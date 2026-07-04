function normalize(input = "") {
    return String(input).toLowerCase().trim().replace(/\s+/g, " ");
  }
  
  function hasAny(q, words = []) {
    return words.some((word) => q === word || q.includes(word));
  }
  
  export function builderAssistant(input = "") {
    const q = normalize(input);
  
    if (
      hasAny(q, [
        "dashboard",
        "frontend",
        "ui",
        "interface",
      ])
    ) {
      return `BUILDER ASSISTANT
  
  Dashboard work detected.
  
  Before committing:
  
  • Verify live protocol values
  • Test desktop
  • Test mobile
  • Watch browser console
  • Confirm Guardian states
  
  A stable interface builds trust.
  
  _`;
    }
  
    if (
      hasAny(q, [
        "bug",
        "issue",
        "problem",
        "broken",
        "error",
        "fix",
      ])
    ) {
      return `DEBUG PROTOCOL
  
  Q.O.R.I recommends:
  
  1. Reproduce the issue.
  2. Isolate the cause.
  3. Change one thing.
  4. Test again.
  5. Commit only after confirmation.
  
  Never fix multiple unknowns at once.
  
  _`;
    }
  
    if (
      hasAny(q, [
        "deploy",
        "vercel",
        "production",
        "publish",
        "release",
      ])
    ) {
      return `DEPLOYMENT CHECKLIST
  
  Before deployment:
  
  • Local build passes
  • No console errors
  • Wallet connection tested
  • Mobile verified
  • Desktop verified
  • Protocol state confirmed
  
  Deploy only after observation.
  
  _`;
    }
  
    if (
      hasAny(q, [
        "contract",
        "smart contract",
        "controller",
        "solidity",
      ])
    ) {
      return `CONTRACT REVIEW
  
  Remember:
  
  Contracts define truth.
  
  Frontends display truth.
  
  Never build around assumptions.
  
  Always verify on-chain state.
  
  _`;
    }
  
    if (
      hasAny(q, [
        "test",
        "testing",
        "verify",
        "verification",
      ])
    ) {
      return `TESTING MODE
  
  Observe.
  
  Verify.
  
  Repeat.
  
  The goal is not proving code works.
  
  The goal is finding where it doesn't.
  
  _`;
    }
  
    return `BUILDER MODE
  
  Current recommendation:
  
  One change.
  
  One test.
  
  One confirmation.
  
  Then continue.
  
  _`;
  }