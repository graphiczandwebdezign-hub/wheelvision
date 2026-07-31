# Chapter 24 — CI/CD

## CI pipeline

- Run linting, formatting checks, tests, and type checks on every pull request.
- Enforce branch protection and required reviews.

## CD pipeline

- Deploy preview builds for pull requests.
- Promote staging and production deployments from the main branch.

## Release strategy

- Semantic versioning for platform releases.
- Rollback strategy via previous deployment artifacts.
- Feature flags for gradual tenant rollout.
