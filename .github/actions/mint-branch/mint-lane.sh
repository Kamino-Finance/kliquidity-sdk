#!/usr/bin/env bash
set -euo pipefail

# mint-lane.sh
#
# Create or fast-forward a lane branch (e.g. feature/<lane>) to a trusted base ref.
#
# Trust rule:
#   base commit must be contained in origin/master OR contained in the history of at least one
#   "trusted tag namespace" derived from a configurable tag prefix.
#
# Defaults:
#   --lane-prefix feature
#   --tag-prefix v
#   -> trusted tags: refs/tags/v*
#
# Usage:
#   ./mint-lane.sh --lane kswap-sdk --base-ref master
#   ./mint-lane.sh --lane kswap-sdk --base-ref v1.2.3
#   ./mint-lane.sh --lane kswap-sdk --base-ref refs/tags/v1.2.3
#   ./mint-lane.sh --lane kswap-sdk --base-ref <40-hex-sha>
#   ./mint-lane.sh --lane kswap-sdk --tag-prefix release/ --base-ref release/kswap-sdk/v1.2.3
#   ./mint-lane.sh --lane kswap-sdk --tag-prefix v --dry-run

lane_name=""
base_ref="master"
lane_prefix="feature"
dry_run=false
sync_mode="rebase" # reset | rebase
tag_prefix="v"

usage() {
  cat <<'EOF'
Usage:
  mint-lane.sh --lane <name> [--base-ref <ref>] [--lane-prefix <prefix>] [--tag-prefix <pfx>] [--sync-mode <mode>] [--dry-run]

Args:
  --lane         Lane suffix, e.g. "kswap-sdk" -> "feature/kswap-sdk"
  --base-ref     Trusted base ref: master | refs/tags/<tag> | <tag> | <commit-sha>  (default: master)
  --lane-prefix  Branch prefix (default: feature)
  --tag-prefix   Trusted tag prefix (default: v). Trusted tags are refs/tags/<prefix>*
  --sync-mode    How to sync to the trusted base rate if the lane branch already exists. rebase (default) | reset
  --dry-run      Do not push; only print what would happen

Trust:
  base commit must be contained in origin/master OR in history of at least one trusted tag:
    refs/tags/<tag-prefix>*
EOF
}

fail() { echo "ERROR: $*" >&2; exit 1; }

while [ "${#@}" -gt 0 ]; do
  case "$1" in
    --lane) lane_name="${2:-}"; shift 2;;
    --base-ref) base_ref="${2:-}"; shift 2;;
    --lane-prefix) lane_prefix="${2:-}"; shift 2;;
    --tag-prefix) tag_prefix="${2:-}"; shift 2;;
    --sync-mode) sync_mode="${2:-}"; shift 2;;
    --dry-run) dry_run=true; shift 1;;
    -h|--help) usage; exit 0;;
    *) fail "Unknown argument: $1";;
  esac
done

[ -n "${lane_name}" ] || { usage; fail "--lane is required"; }
[ -n "${tag_prefix}" ] || fail "--tag-prefix must be non-empty"

case "${sync_mode}" in
  reset|rebase) ;;
  *) fail "--sync-mode must be 'reset' or 'rebase'";;
esac

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Must run inside a git repo"
git remote get-url origin >/dev/null 2>&1 || fail "Missing 'origin' remote"

lane="${lane_prefix}/${lane_name}"
trusted_tag_glob="refs/tags/${tag_prefix}*"

echo "== Config =="
echo "Lane:        ${lane}"
echo "Base ref:    ${base_ref}"
echo "Tag prefix:  ${tag_prefix}"
echo "Trusted tags glob: ${trusted_tag_glob}"
echo "Dry run:     ${dry_run}"

echo "== Fetching refs =="
git fetch --prune origin master
git fetch --tags origin

echo "== Resolving base-ref =="
# Normalize bare tag name to refs/tags/<tag> if it exists
case "${base_ref}" in
  master) ;;
  refs/tags/*) ;;
  [0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]* ) ;;
  *)
    if git show-ref --tags --verify --quiet "refs/tags/${base_ref}"; then
      base_ref="refs/tags/${base_ref}"
    else
      fail "base-ref must be 'master', a tag (refs/tags/<tag> or <tag>), or a commit SHA"
    fi
    ;;
esac

base_sha="$(git rev-parse "${base_ref}^{commit}")"
echo "Requested base: ${base_ref} -> ${base_sha}"

echo "== Trust check =="
trusted=false

if git merge-base --is-ancestor "${base_sha}" "origin/master"; then
  trusted=true
  echo "Trust OK: base is contained in origin/master"
else
  echo "Base not on origin/master; checking trusted tag namespace: ${trusted_tag_glob}"

  anchor_tags=()
  while IFS= read -r t; do
    [ -n "$t" ] && anchor_tags+=("$t")
  done < <(git for-each-ref --format='%(refname)' "${trusted_tag_glob}")

  [ "${#anchor_tags[@]}" -gt 0 ] || fail "No trusted tags found matching ${trusted_tag_glob}"

  for t in "${anchor_tags[@]}"; do
    anchor_sha="$(git rev-parse "${t}^{commit}")"
    if git merge-base --is-ancestor "${base_sha}" "${anchor_sha}"; then
      trusted=true
      echo "Trust OK: base is contained in trusted tag history: ${t} (${anchor_sha})"
      break
    fi
  done
fi

[ "${trusted}" = "true" ] || fail "Refusing: ${base_sha} is not contained in origin/master or any trusted tag history"

echo "== Minting lane branch =="

if git ls-remote --exit-code --heads origin "refs/heads/${lane}" | grep -qE "[[:space:]]refs/heads/${lane}$"; then
  echo "Lane exists on origin; updating (${sync_mode})"

  git fetch origin "${lane}:${lane}"
  git checkout "${lane}"

  current_sha="$(git rev-parse HEAD)"
  echo "Current lane HEAD: ${current_sha}"
  echo "Target base SHA:   ${base_sha}"

  if [ "${sync_mode}" = "reset" ]; then
    echo "Resetting lane to ${base_sha} (force)."
    git reset --hard "${base_sha}"
    if [ "${dry_run}" = "true" ]; then
      echo "[dry-run] Would push: git push --force-with-lease origin ${lane}"
    else
      git push --force-with-lease origin "${lane}"
    fi

  else
    echo "Rebasing lane onto ${base_sha} (force update)."
    # Ensure we have the base commit locally (already true, but explicit is cheap)
    git fetch --prune origin master >/dev/null 2>&1 || true

    # Rebase lane commits onto base. If it’s already contained, this is a no-op.
    if [ "${dry_run}" = "true" ]; then
      echo "[dry-run] Would run: git rebase ${base_sha}"
      echo "[dry-run] Would push: git push --force-with-lease origin ${lane}"
    else
      git rebase "${base_sha}"
      git push --force-with-lease origin "${lane}"
    fi
  fi
else
  echo "Lane does not exist on origin; creating it at ${base_sha}"
  git checkout -b "${lane}" "${base_sha}"
  if [ "${dry_run}" = "true" ]; then
    echo "[dry-run] Would push: git push origin ${lane}"
  else
    git push origin "${lane}"
  fi
fi

echo "DONE"
