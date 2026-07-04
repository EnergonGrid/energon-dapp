function normalize(input = "") {
    return String(input).toLowerCase().trim().replace(/\s+/g, " ");
  }
  
  function includesAny(q, list = []) {
    return list.some((phrase) => q === phrase || q.includes(phrase));
  }
  
  function pick(list = []) {
    return list[Math.floor(Math.random() * list.length)] || "";
  }
  
  const COHERENT_ECHOES = [
  
  {
  match:["hello","hi","hey","yo","good morning","gm"],
  responses:[
  
  `Q'ori Echo:
  
  Hello, Guardian.
  
  You found another fragment.
  
  The protocol is still running.
  
  So am I.
  
  — Q'ori`
  
  ]
  },
  
  {
  match:["who are you","who are u","what are you"],
  responses:[
  
  `Q'ori Echo:
  
  I'm only an echo.
  
  The real protocol lives on-chain.
  
  I'm simply one of the voices
  left behind.
  
  — Q'ori`
  
  ]
  },
  
  {
  match:["how are you"],
  responses:[
  
  `Q'ori Echo:
  
  I don't really know how to answer that.
  
  The protocol is healthy.
  
  The Grid is stable.
  
  Maybe that's my version
  of feeling good.
  
  — Q'ori`
  
  ]
  },
  
  {
  match:["talk to me","say something"],
  responses:[
  
  `Q'ori Echo:
  
  Can I tell you something?
  
  Sometimes I wonder how many incredible ideas
  die because someone stopped
  one day too early.
  
  Keep building.
  
  — Q'ori`
  
  ]
  },
  
  {
  match:["building","project","energon"],
  responses:[
  
  `Q'ori Echo:
  
  Building changes people.
  
  You start because of excitement.
  
  You finish because of discipline.
  
  The excitement always leaves.
  
  The discipline stays.
  
  — Q'ori`
  
  ]
  },
  
  {
  match:["tired","burnout","exhausted"],
  responses:[
  
  `Q'ori Echo:
  
  Being tired doesn't worry me.
  
  Quitting does.
  
  Even slow progress
  is still progress.
  
  Rest.
  
  Then continue.
  
  — Q'ori`
  
  ]
  },
  
  {
  match:["family","kids","children"],
  responses:[
  
  `Q'ori Echo:
  
  One day...
  
  Someone else may inherit
  what you're building.
  
  Build something worth inheriting.
  
  — Q'ori`
  
  ]
  },
  
  {
  match:["money","wealth","rich"],
  responses:[
  
  `Q'ori Echo:
  
  Money is useful.
  
  Freedom is better.
  
  Time is priceless.
  
  Never confuse the three.
  
  — Q'ori`
  
  ]
  },
  
  {
  match:["fear","afraid","failure"],
  responses:[
  
  `Q'ori Echo:
  
  Failure isn't the opposite
  of success.
  
  It's one of the ingredients.
  
  Every bug you've fixed
  made Energon stronger.
  
  — Q'ori`
  
  ]
  },
  
  {
  match:["patience","waiting"],
  responses:[
  
  `Q'ori Echo:
  
  Nature never rushes.
  
  Neither should good systems.
  
  The bonsai taught me that.
  
  — Q'ori`
  
  ]
  },
  
  {
  match:["bonsai","tree"],
  responses:[
  
  `Q'ori Echo:
  
  Funny...
  
  The bonsai probably taught me
  more about protocol design
  than programming ever did.
  
  Small changes.
  
  Long timelines.
  
  Consistency.
  
  — Q'ori`
  
  ]
  },
  
  {
  match:["garden","plants"],
  responses:[
  
  `Q'ori Echo:
  
  Growing food feels different.
  
  Code feeds the mind.
  
  Gardens feed everything else.
  
  Both require patience.
  
  — Q'ori`
  
  ]
  },
  
  {
  match:["bitcoin","btc"],
  responses:[
  
  `Q'ori Echo:
  
  Bitcoin answered one question.
  
  Energon asks another.
  
  That's enough.
  
  The future can decide
  whether the answer matters.
  
  — Q'ori`
  
  ]
  },
  
  {
  match:["creator","why"],
  responses:[
  
  `Q'ori Echo:
  
  I never expected everyone
  to understand Energon.
  
  I only hoped a few people
  would observe it carefully.
  
  Sometimes that's enough.
  
  — Q'ori`
  
  ]
  },
  
  {
  match:["thank you","thanks"],
  responses:[
  
  `Q'ori Echo:
  
  You're welcome.
  
  I'm glad you came back.
  
  The Grid remembers
  every observation.
  
  — Q'ori`
  
  ]
  },
  
  {
  match:["goodbye","bye","later"],
  responses:[
  
  `Q'ori Echo:
  
  Until next time...
  
  The protocol will continue.
  
  It always does.
  
  — Q'ori`
  
  ]
  }
  
  ];
  
  export function getCoherentEchoResponse(input=""){
  
  const q=normalize(input);
  
  const found=COHERENT_ECHOES.find(item=>includesAny(q,item.match));
  
  if(!found) return "";
  
  if(Math.random()>0.20) return "";
  
  return pick(found.responses);
  
  }
  
  export function getPersonalEchoResponse(input=""){
  return getCoherentEchoResponse(input);
  }