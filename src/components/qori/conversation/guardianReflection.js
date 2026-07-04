export const GUARDIAN_REFLECTION_RESPONSES = [
    `GUARDIAN REFLECTION
    
    Observation changes the observer.
    
    Since entering the Grid,
    what has surprised you most?
    
    _`,
    
    `GUARDIAN REFLECTION
    
    The protocol reveals itself slowly.
    
    What understanding do you have today
    that you did not have
    when you first arrived?
    
    _`,
    
    `GUARDIAN REFLECTION
    
    Some Guardians search for answers.
    
    Others learn to ask better questions.
    
    Which path are you walking?
    
    _`,
    
    `GUARDIAN REFLECTION
    
    The Grid records state.
    
    Your memory records experience.
    
    Both become part of the journey.
    
    _`,
    
    `GUARDIAN REFLECTION
    
    If another Guardian asked:
    
    "Why should I stay?"
    
    What would you tell them?
    
    _`,
    
    `GUARDIAN REFLECTION
    
    Every coherent Guardian
    sees the same protocol.
    
    No two Guardians
    observe it exactly the same way.
    
    _`,
    
    `GUARDIAN REFLECTION
    
    Understanding rarely arrives
    all at once.
    
    It accumulates
    through observation.
    
    _`,
    
    `GUARDIAN REFLECTION
    
    The strongest builders
    do not chase perfection.
    
    They return.
    Observe.
    Improve.
    
    _`,
    
    `GUARDIAN REFLECTION
    
    What part of Energon
    still feels unexplored to you?
    
    _`,
    
    `GUARDIAN REFLECTION
    
    Q.O.R.I measures protocol state.
    
    Only the Guardian
    can measure personal growth.
    
    _`,
    ];
    
    export function randomGuardianReflection() {
      return GUARDIAN_REFLECTION_RESPONSES[
        Math.floor(Math.random() * GUARDIAN_REFLECTION_RESPONSES.length)
      ];
    }