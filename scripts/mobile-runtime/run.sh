#!/usr/bin/env bash
set -euo pipefail
# Only fixed trusted commands run on the host. Student code stays in the container.
mkdir -p runtime-result
printf '{"phase":"infrastructure"}' > runtime-result/result.json
case "$STUDENT_REPO" in *[!a-zA-Z0-9_./-]*|'') exit 1;; esac
[[ "$STUDENT_SHA" =~ ^[a-f0-9]{40}$ ]] || exit 1
[[ "$STUDENT_ROOT" == '' || "$STUDENT_ROOT" == 'aplikacioni/' ]] || exit 1
name="mobile-w8-${GITHUB_RUN_ID:-local}"
cleanup(){ docker rm -f "$name" "$name-relay" >/dev/null 2>&1 || true; docker network rm "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker pull node:22-bookworm-slim >/dev/null
mkdir -p student-source
curl --fail --location --max-time 45 --max-filesize 52428800 "https://codeload.github.com/$STUDENT_REPO/tar.gz/$STUDENT_SHA" -o student-source.tar.gz
python3 - <<'PY'
import tarfile
with tarfile.open('student-source.tar.gz') as t:
    members=[]
    size=0
    for m in t:
        size+=m.size
        members.append(m)
        if size>100*1024*1024 or len(members)>15000: raise ValueError('Archive too large')
    # Reject links/devices entirely; only ordinary files and directories are needed.
    if any(not (m.isfile() or m.isdir()) for m in members): raise ValueError('Links are not accepted in test sources')
    t.extractall('student-source',filter='data')
PY
source_dir="$(find "$PWD/student-source" -mindepth 1 -maxdepth 1 -type d | head -1)/$STUDENT_ROOT"
[[ -f "$source_dir/package-lock.json" ]] || exit 1
docker network create --internal "$name" >/dev/null
docker run -d --name "$name" --user 1000:1000 --cap-drop ALL --security-opt no-new-privileges --read-only --memory 2g --cpus 2 --pids-limit 256 --tmpfs /tmp:rw,nosuid,size=128m --tmpfs /work:rw,exec,nosuid,size=2g,uid=1000,gid=1000 --mount "type=bind,src=$source_dir,dst=/source,readonly" --publish 127.0.0.1:3000:3000 --env XDG_CACHE_HOME=/work/.cache --env NPM_CONFIG_CACHE=/work/.npm-cache --env NEXT_TELEMETRY_DISABLED=1 --env CI=1 --workdir /work node:22-bookworm-slim sleep infinity >/dev/null
# Ignore all package lifecycle scripts. Neither credentials nor host tool directories are mounted.
if ! timeout 150 docker exec "$name" sh -c 'cp -R /source/. /work/ && npm ci --ignore-scripts --no-audit --no-fund > /tmp/install.log 2>&1'; then
 docker exec "$name" sh -c 'tail -n 35 /tmp/install.log | head -c 12000' > runtime-result/install.txt || true
 printf '{"phase":"install"}' > runtime-result/result.json
 exit 0
fi
# Remove internet access before any student JavaScript is started.
docker network disconnect bridge "$name"
docker network connect "$name" "$name"
docker exec -d "$name" sh -c 'node node_modules/next/dist/bin/next dev --hostname 0.0.0.0 --port 3000 > /tmp/app.log 2>&1'
# A trusted fixed-destination relay exposes only the app port, not internet access to the app.
docker run -d --name "$name-relay" --user 1000:1000 --read-only --cap-drop ALL --security-opt no-new-privileges --memory 128m --cpus 1 --pids-limit 64 --publish 127.0.0.1:3000:3000 --env TARGET="$name" node:22-bookworm-slim node -e 'const net=require("net");net.createServer(s=>{const t=net.connect(3000,process.env.TARGET);s.on("error",()=>t.destroy());t.on("error",()=>s.destroy());s.pipe(t);t.pipe(s);}).listen(3000,"0.0.0.0")' >/dev/null
docker network connect "$name" "$name-relay"
RESULT_DIR=runtime-result timeout 180 node scripts/mobile-runtime/browser.mjs

docker exec "$name" sh -c 'tail -n 35 /tmp/app.log | head -c 12000' > runtime-result/start.txt || true
