#!/usr/bin/env bash
# Runs a browser command once the machine can afford it: a run claims its cap
# (STACK_BROWSER_MB, MiB) and is admitted while the available memory, less the
# caps every admitted run still holds, covers that cap and a reserve
# (STACK_BROWSER_RESERVE_MB). Claims live per user in $XDG_RUNTIME_DIR, so runs
# from every session and worktree share one budget. Where systemd-run exists the
# run is held to its cap with no swap, so a run that outgrows it is killed alone.
# A cap plus the reserve above the machine's MemTotal is refused at once, since
# no wait could admit it. The run's own peak (its scope's memory.peak) is
# printed when it ends, so a scoped run's cap is set from evidence.
# Without /proc/meminfo (macOS) the budget is one run at a time.
set -euo pipefail

cap=${STACK_BROWSER_MB:-7168}
reserve=${STACK_BROWSER_RESERVE_MB:-2048}
if [ -r /proc/meminfo ]; then
	total=$(awk '/^MemTotal:/ { print int($2 / 1024) }' /proc/meminfo)
	if [ $((cap + reserve)) -gt "$total" ]; then
		echo "browser-run: a ${cap} MiB cap plus a ${reserve} MiB reserve exceeds MemTotal (${total} MiB); no wait can admit it" >&2
		exit 1
	fi
fi
dir="${XDG_RUNTIME_DIR:-/tmp}/stack-browser.d"
mkdir -p "$dir"
claim="$dir/$$"

held() {
	local total=0 file pid
	for file in "$dir"/[0-9]*; do
		[ -e "$file" ] || continue
		pid=${file##*/}
		if kill -0 "$pid" 2>/dev/null; then
			total=$((total + $(<"$file")))
		else
			rm -f "$file"
		fi
	done
	echo "$total"
}

affords() {
	local held_mb=$1 available
	if [ -r /proc/meminfo ]; then
		available=$(awk '/^MemAvailable:/ { print int($2 / 1024) }' /proc/meminfo)
		[ $((available - held_mb)) -ge $((cap + reserve)) ]
	else
		[ "$held_mb" -eq 0 ]
	fi
}

exec 9>"$dir/admit.lock"
waited=0
while :; do
	flock 9
	if affords "$(held)"; then
		echo "$cap" >"$claim"
		flock -u 9
		break
	fi
	flock -u 9
	if [ "$waited" -eq 0 ]; then
		echo "browser-run: waiting for ${cap} MiB plus a ${reserve} MiB reserve" >&2
		waited=1
	fi
	sleep 5
done
exec 9>&-
trap 'rm -f "$claim"' EXIT

if command -v systemd-run >/dev/null; then
	# The wrapper stays in the scope after the command ends, so the scope's
	# cgroup still holds the peak; the command's exit code is the run's.
	systemd-run --user --scope --quiet --collect \
		-p "MemoryMax=${cap}M" -p MemorySwapMax=0 \
		bash -c '"$@"; code=$?
			peak=/sys/fs/cgroup$(cut -d: -f3 /proc/self/cgroup)/memory.peak
			[ -r "$peak" ] && echo "browser-run: peak $(($(<"$peak") / 1048576)) MiB" >&2
			exit $code' _ "$@"
else
	"$@"
fi
