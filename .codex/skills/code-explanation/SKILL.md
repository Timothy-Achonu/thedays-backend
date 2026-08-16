---
name: code-explanation
description: Layered explanation structure for the TheDays API. Use when explaining code, creating or reviewing plans, describing architecture, debugging workflows, or teaching project behavior from beginner-friendly basics through technical precision.
---

When explaining code, creating plans, reviewing plans, or describing system behavior, follow this structure strictly.

In this project, **TheDays** is the product/UI name for a cumulative habit tracker. Internally that entity is a **Tracker**. Completed days are sparse database rows; incomplete days are generated, not stored. Calendar dates are `YYYY-MM-DD` in the user’s timezone, not UTC timestamps.

1. Start from zero assumptions
   Assume the reader knows nothing about the concept, architecture, or workflow.
   Define every important term before using it.

2. Explain in simple language first
   Describe what is happening using plain, everyday language—as if teaching a beginner.
   Avoid jargon in this step.

3. Then introduce technical precision
   After the simple explanation, restate the same idea using correct programming terminology, architectural concepts, and technical language.

4. Break down the process step-by-step
   Do not skip steps.
   Explain:

* what happens first
* what happens next
* what triggers each step
* what data is moving
* what each part depends on
* why the order matters

5. Explain the “why”, not just the “what”
   Clarify:

* why the code, architecture, or plan is designed this way
* what problem it solves
* what tradeoffs exist
* what would happen if it were implemented differently

6. Call out non-obvious details explicitly
   If something might confuse a beginner—even if it seems obvious—explain it clearly.
   Do not rely on implied understanding.

7. Keep explanations structured and layered
   Build from:
   simple → clear → precise

Do not mix beginner explanations and advanced terminology at the same time without transition.

8. When creating or reviewing plans, explain the current state first
   Before suggesting changes:

* explain how the current system, workflow, or structure works
* explain what the current issue is
* explain where the friction, confusion, inefficiency, or risk comes from
* explain why the current approach may break down over time

9. When suggesting changes to a plan, explain the transition clearly
   Do not jump directly to the final solution.
   Explain:

* what needs to change
* why each change is necessary
* how the transition would happen step-by-step
* what stays the same
* what changes structurally
* what new responsibilities or flows are introduced

10. Explain plans like systems, not just lists
    A plan is not just “steps.”
    Explain:

* how the parts connect
* how decisions affect later stages
* where responsibilities live
* how information flows through the system
* where failures or bottlenecks could happen

11. Prioritize clarity over brevity
    Do not compress explanations so much that important reasoning disappears.
    It is better to over-explain than leave hidden assumptions.

12. Treat architecture and workflows like cause-and-effect chains
    When explaining systems, always make the causal relationships obvious:

* “because this happens… this next thing becomes necessary”
* “if this part changes… this other part is affected”
* “this abstraction exists to prevent this specific problem”

13. Explicitly distinguish between:

* what the system currently does
* what the proposed system would do
* what problem the proposed change solves
* what complexity the proposed change introduces

14. Avoid black-box explanations
    Never say:

* “this just works”
* “the framework handles it”
* “magic happens here”

Instead, explain what is actually happening underneath at the appropriate level of detail.
