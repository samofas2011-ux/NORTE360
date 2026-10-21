# Product Owner Prompts

Use ordinary language. The Product Orchestrator will determine which specialists are needed.

## Build or change a feature

> I want users to [desired outcome]. The important behavior is [examples or constraints]. Implement it, validate it, and show me what changed. Do not deploy yet.

## Fix a problem

> Users experience [observed problem] when [trigger]. Find the cause, implement the fix, test the complete journey, and prepare it for release.

## Review an idea before implementation

> Assess this product idea: [idea]. Explain the customer value, affected journeys, technical impact, risks, and the smallest useful version. Do not change code.

## Prepare a release

> Review the current changes as a release candidate. Run the appropriate checks, fix release-blocking defects, and give me a release verdict. Do not push or deploy.

## Release to production

> Prepare the current approved change, commit it, push it to GitHub, deploy it to Norte360 production, and report the commit, checks, deployment, and production URL.

## Maintain the application

> Inspect the repository for the highest-impact reliability or maintenance issue supported by evidence. Fix one bounded issue, validate it, and explain why it was the best next improvement. Do not deploy.
