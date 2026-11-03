# Require the `verify` check on `main`

`.github/workflows/ci.yml` defines the `verify` job (typecheck, lint, tests and a production build on Node 22), the `verify-node24` job (typecheck, tests and build on Node 24) and the advisory `audit` job. GitHub only blocks a merge on a check that branch protection marks as required, and only a repository admin can change that setting. These are the steps for the owner; nothing in the repository changes it (ADR 0008, code review item C3).

## Before you start

- You need the Admin role on the repository.
- The `verify` check must have run at least once in the last seven days (open or update any pull request) so GitHub can offer it in the list.

## Steps (classic branch protection)

1. On GitHub, open the repository and choose **Settings**.
2. In the sidebar under **Code and automation**, choose **Branches**.
3. Next to **Branch protection rules**, choose **Add classic branch protection rule** (or edit the existing rule for `main`).
4. In **Branch name pattern**, type `main`.
5. Tick **Require a pull request before merging**. Tick **Require approvals** and keep **1** if every change should have a reviewer (ADR 0008 asks for approval before merge).
6. Tick **Require status checks to pass before merging**, and also **Require branches to be up to date before merging**.
7. In the search box under that option, type `verify` and select the check named **verify** (GitHub Actions). Do not select `audit`: it is advisory by design. Add `verify-node24` too once it has passed on a few pull requests, if Node 24 failures should also block merges.
8. Optional: tick **Do not allow bypassing the above settings** so the rule also applies to admins.
9. Choose **Create** (or **Save changes**).

If the repository uses rulesets instead (**Settings**, **Rules**, **Rulesets**), create a branch ruleset that targets the default branch, enable **Require a pull request before merging** and **Require status checks to pass**, and add the `verify` check in the same way.

## Check that it works

Open a pull request. The checks list shows **Required** next to `verify`, and the merge button stays disabled until it passes. Vercel's preview and production deployments are not affected by this setting.
