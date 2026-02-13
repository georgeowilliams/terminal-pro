const meta = {
  id: "linux-terminal",
  title: "Linux Terminal Expert",
  subtitle: "Interactive notes + navigation",
  version: "v3",
};

  const lessons = [
    {
      id: "mindset",
      module: "0. Welcome",
      title: "How terminal pros think",
      tags: ["fundamentals","workflow"],
      content: `
<p>Becoming “terminal expert” is less about memorizing commands and more about building a <b>mental model</b>:</p>
<ul>
  <li><b>Everything is a file</b> (or a stream): config, devices, sockets, logs.</li>
  <li><b>Small tools + pipes</b>: compose commands like LEGO.</li>
  <li><b>Inspect first, then act</b>: preview before you delete/overwrite.</li>
</ul>

<pre>
ASCII model of streams + pipe composition:

stdin(0) -> [ tool A ] -> [ tool B ] -> [ tool C ] -> stdout(1)
                 |            |            |
               flags       filters     formatters

stderr(2) -------------------------------------> terminal

Redirect patterns:
  cmd > out.txt
  cmd 2> err.txt
  cmd > all.txt 2>&1
</pre>

<div class="hint">
Core pro habit: keep a scratch pad command:
<code>history | tail</code>, then refine.
</div>

<p><span class="pill">Pro tools you’ll adopt</span> <code>tmux</code>, <code>fzf</code>, <code>ripgrep</code>, <code>bat</code>, <code>fd</code>, <code>jq</code>, <code>ssh</code>, <code>git</code></p>
`
    },

    {
      id: "navigation",
      module: "1. Movement & Discovery",
      title: "Navigation: files, paths, and fast jumping",
      tags: ["fundamentals","filesystem"],
      content: `
<p>Learn to move like a native:</p>
<ul>
  <li><code>pwd</code>, <code>ls</code>, <code>cd</code> basics — but the pro upgrades are <code>eza</code>, <code>zoxide</code>, and fuzzy finding.</li>
  <li>Use <code>pushd</code>/<code>popd</code> like a stack for directories.</li>
</ul>

<div class="grid2">
<pre>
Filesystem tree mental model:

/ (root)
├─ home/
│  ├─ you/
│  │  ├─ projects/
│  │  └─ downloads/
├─ dev/
├─ proc/
└─ etc/
   ├─ ssh/
   └─ systemd/
</pre>

<pre>
Fast jumping (recommended):

zoxide (z) remembers directories:
  z proj
  z iso

fzf fuzzy search:
  cd "$(find . -type d | fzf)"
</pre>
</div>

<div class="hint warn">
If you install one “quality of life” tool first, make it <b>fzf</b>. It upgrades everything.
</div>
`
    },

    {
      id: "help",
      module: "2. Reading the System",
      title: "Getting help: man, tldr, and discoverability",
      tags: ["fundamentals","docs"],
      content: `
<p>Pros don’t guess. They query documentation fast.</p>
<ul>
  <li><code>man rsync</code> (full manual)</li>
  <li><code>tldr rsync</code> (quick examples)</li>
  <li><code>command --help</code> (fast flags overview)</li>
  <li><code>apropos keyword</code> or <code>man -k keyword</code></li>
</ul>

<pre>
ASCII: How to learn a command in 30 seconds

1) tldr curl
2) man curl  (search inside man: /pattern)
3) try a tiny example
4) add flags one at a time
</pre>

<p><span class="pill">Pro libraries/tools</span> <code>tldr</code>, <code>man</code>, <code>info</code>, <code>cheat</code></p>
`
    },

    {
      id: "text",
      module: "3. Text as Data",
      title: "Pipes, grep, rg, awk, sed, sort, uniq",
      tags: ["text","search"],
      content: `
<p>Your superpower: turn text streams into answers.</p>

<div class="grid2">
<pre>
Pipeline anatomy:

cat file.txt
| rg "error|warn"
| sort
| uniq -c
| sort -nr
</pre>

<pre>
Modern defaults:

rg  = ripgrep (faster grep)
fd  = friendlier find
bat = better cat (syntax highlighting)
</pre>
</div>

<p>Practice drills:</p>
<ul>
  <li>Find all TODOs: <code>rg -n "TODO|FIXME" .</code></li>
  <li>Top 20 largest files: <code>du -ah . | sort -hr | head -20</code></li>
  <li>Extract a column: <code>awk '{print $2}'</code></li>
</ul>

<div class="hint">
When you’re stuck: print intermediate output after each pipe step.
</div>

<p><span class="pill">Pro libraries/tools</span> <code>ripgrep (rg)</code>, <code>awk</code>, <code>sed</code>, <code>sort</code>, <code>uniq</code>, <code>column</code></p>
`
    },

    {
      id: "globbing",
      module: "4. Shell Power",
      title: "Globs, quoting, variables, and exit codes",
      tags: ["shell","fundamentals"],
      content: `
<p>This is where most “not quite expert” users break things. Learn these rules:</p>

<pre>
Globs (shell expands them):

*.log     matches log files
**/*.js   recursive glob (depends on shell)
{a,b}.txt brace expansion -> a.txt b.txt

Quoting:
"..." keeps spaces, still expands $VARS
'...' literal (no expansions)
\\ escapes next character
</pre>

<pre>
Exit codes:

0   success
!=0 failure

Chain logic:
cmd1 && cmd2   (only run cmd2 if cmd1 succeeded)
cmd1 || cmd2   (run cmd2 if cmd1 failed)
</pre>

<div class="hint danger">
If a path might contain spaces, quote it: <code>"$path"</code>
</div>

<p><span class="pill">Pro libraries/tools</span> <code>shellcheck</code> (lint), <code>bash</code>/<code>zsh</code>, <code>direnv</code> (env per folder)</p>
`
    },

    {
      id: "permissions",
      module: "5. Ownership & Permissions",
      title: "chmod, chown, umask (and why sudo is not a hammer)",
      tags: ["security","filesystem"],
      content: `
<p>Permissions are a 3×3 grid: <b>user</b>, <b>group</b>, <b>others</b> with <b>rwx</b>.</p>

<pre>
Permissions grid:

        r  w  x
user    1  1  1
group   1  0  1
other   0  0  0

-rwxr-x---  file
 ^^^ ^^^ ^^^
 u   g   o

Octal map: r=4 w=2 x=1
7=rwx 5=r-x 0=---

chmod 750 file
</pre>

<pre>
Ownership flow:

[user alice] ---- member of ----> [devops group]
      |                              |
 owns deploy.sh                 can read logs/

chown alice:devops deploy.sh
</pre>

<ul>
  <li><code>chown user:group file</code></li>
  <li><code>umask</code> controls default permission masking</li>
  <li>Prefer least privilege over “sudo everything”</li>
</ul>

<div class="hint warn">
A strong pro habit: understand who owns a file before fixing it.
Try: <code>ls -la</code>
</div>
`
    },

    {
      id: "processes",
      module: "6. Processes & Performance",
      title: "ps, top/htop, kill, signals, jobs",
      tags: ["process","performance"],
      content: `
<p>Learn how Linux runs your programs.</p>

<div class="grid2">
<pre>
Process tree + signals flow:

terminal ---- spawns ----> shell ---- spawns ----> program
   |                          |
 Ctrl+C                    jobs/bg/fg
   |
 sends SIGINT --------------> program

Inspect:
ps aux | rg node
pstree -p

Signals:
SIGINT, SIGTERM, SIGKILL
</pre>

<pre>
Jobs (in your shell):

cmd &
jobs
fg %1
bg %1
disown
</pre>
</div>

<p><span class="pill">Pro libraries/tools</span> <code>htop</code>/<code>btop</code>, <code>strace</code>, <code>lsof</code>, <code>time</code></p>
`
    },

    {
      id: "networking",
      module: "7. Networking Basics",
      title: "curl, wget, ssh, scp/rsync, ports and DNS",
      tags: ["network","security"],
      content: `
<p>Terminal pros can diagnose network issues quickly.</p>

<pre>
Networking path:

you -> DNS -> IP -> TCP handshake -> service:port -> response
         |                        |
      name->addr               443/22/80

Socket map:
client:ephemeral_port -> server:443
</pre>

<pre>
Ports cheat:

22  -> SSH
80  -> HTTP
443 -> HTTPS
53  -> DNS
</pre>

<ul>
  <li><code>curl -I https://example.com</code> headers</li>
  <li><code>dig example.com</code> DNS query</li>
  <li><code>ss -tulpn</code> listening ports</li>
  <li><code>ssh user@host</code> remote shell</li>
  <li><code>rsync -avz</code> fast sync, resumable</li>
</ul>

<p><span class="pill">Pro libraries/tools</span> <code>openssh</code>, <code>rsync</code>, <code>mtr</code>, <code>tcpdump</code>, <code>nmap</code> (responsible use)</p>
`
    },

    {
      id: "git",
      module: "8. Version Control",
      title: "Git fundamentals for terminal workflow",
      tags: ["git","workflow"],
      content: `
<p>If you build anything (you do), git is part of being a terminal pro.</p>

<pre>
Core loop:
git status
git diff
git add -p
git commit -m "message"
git push
</pre>

<pre>
ASCII: commits are a chain

A -- B -- C -- D (main)
      \\
       E -- F     (feature)
</pre>

<p>Recommended tools:</p>
<ul>
  <li><code>delta</code> for nicer diffs</li>
  <li><code>lazygit</code> if you like a terminal UI</li>
</ul>
`
    },

    {
      id: "tmux",
      module: "9. Multiplexing",
      title: "tmux: sessions, panes, and muscle memory",
      tags: ["workflow","tmux"],
      content: `
<p><b>tmux</b> is how terminal pros keep context and speed.</p>

<pre>
tmux model:

session: work
  ├─ window: editor
  │   ├─ pane 1
  │   └─ pane 2
  └─ window: logs
      └─ pane 3

+---------------------------+
| pane 1       | pane 2     |
|--------------+------------|
| pane 3                    |
+---------------------------+
</pre>

<pre>
Key chords map:

Ctrl+b c   new window
Ctrl+b %   split vertical
Ctrl+b "   split horizontal
Ctrl+b o   rotate panes
</pre>

<ul>
  <li>Start: <code>tmux</code></li>
  <li>New session: <code>tmux new -s work</code></li>
  <li>Detach: <code>Ctrl+b</code> then <code>d</code></li>
  <li>Reattach: <code>tmux a -t work</code></li>
</ul>

<div class="hint">
Pro tip: keep one session per project: <code>work</code>, <code>infra</code>, <code>notes</code>.
</div>
`
    },

    {
      id: "dotfiles",
      module: "10. Professional Setup",
      title: "Dotfiles: shell config, prompt, aliases, and safety rails",
      tags: ["workflow","shell","security"],
      content: `
<p>Pros build guardrails and repeatability.</p>

<ul>
  <li><b>Shell</b>: bash or zsh</li>
  <li><b>Prompt</b>: starship (fast, cross-shell)</li>
  <li><b>Aliases</b>: short and safe (avoid hidden magic)</li>
  <li><b>Functions</b>: for workflows (git, ssh, logs)</li>
</ul>

<pre>
Recommended "safe defaults" aliases:

alias rm='rm -i'
alias cp='cp -i'
alias mv='mv -i'

# Better tools:
alias cat='bat'
alias ls='eza -lah'
</pre>

<p><span class="pill">Pro libraries/tools</span> <code>starship</code>, <code>zoxide</code>, <code>direnv</code>, <code>chezmoi</code> (dotfiles mgmt)</p>
`
    },

    {
      id: "parsing",
      module: "11. Structured Data",
      title: "jq, yq, and logs (JSON/YAML as first-class)",
      tags: ["data","logs"],
      content: `
<p>Modern ops/dev work is JSON everywhere. Learn <b>jq</b>.</p>

<pre>
Extract fields:
cat file.json | jq '.items[] | {id, name}'

Filter:
jq '.items[] | select(.status=="error")'
</pre>

<p>YAML tools vary; <code>yq</code> is common.</p>

<p><span class="pill">Pro libraries/tools</span> <code>jq</code>, <code>yq</code>, <code>python</code> (quick one-liners), <code>gron</code></p>
`
    },

    {
      id: "scripting",
      module: "12. Scripting",
      title: "Write reliable shell scripts (and avoid footguns)",
      tags: ["shell","automation","security"],
      content: `
<p>Script like a pro: predictable, safe, tested.</p>

<pre>
Baseline script headers:

#!/usr/bin/env bash
set -euo pipefail
IFS=$'\\n\\t'
</pre>

<ul>
  <li><code>shellcheck</code> everything</li>
  <li>Prefer <code>printf</code> over <code>echo</code> for portability</li>
  <li>Handle paths safely; quote variables</li>
</ul>

<div class="hint danger">
If you ever write: <code>rm -rf $VAR</code>
…you must ensure VAR is never empty. Consider checks.
</div>
`
    },

    {
      id: "tools",
      module: "13. Pro Toolbox",
      title: "The typical terminal-pro library stack",
      tags: ["workflow","tools"],
      content: `
<p>This is a pragmatic “pro stack” you’ll see in modern setups:</p>

<div class="grid2">
<pre>
Search & navigate:
  fzf, ripgrep (rg), fd, zoxide

Viewing:
  bat, eza, less (with -R), delta

Sessions:
  tmux

Data:
  jq, yq

Dev:
  git, gh (GitHub CLI), make

Quality:
  shellcheck, shfmt

Ops:
  ssh, rsync, curl, wget
</pre>

<pre>
Monitoring/debug:
  htop/btop
  lsof
  strace
  dmesg, journalctl
  nc (netcat)
</pre>
</div>

<p class="hint">
You don’t need them all on day 1. Learn in layers:
<b>rg + fzf + tmux</b> will 10× your speed quickly.
</p>
`
    },

    {
      id: "challenge",
      module: "14. Practice Path",
      title: "30-day drills to become dangerous (in a good way)",
      tags: ["practice","workflow"],
      content: `
<p>Here’s a simple training plan:</p>

<ul>
  <li><b>Days 1–5</b>: navigation + pipes (<code>rg</code>, <code>fd</code>, <code>sort</code>, <code>awk</code>)</li>
  <li><b>Days 6–10</b>: permissions + processes (<code>chmod</code>, <code>ps</code>, <code>kill</code>, <code>lsof</code>)</li>
  <li><b>Days 11–15</b>: networking (<code>curl</code>, <code>ssh</code>, <code>rsync</code>, <code>ss</code>)</li>
  <li><b>Days 16–20</b>: tmux + dotfiles (speed & repeatability)</li>
  <li><b>Days 21–30</b>: write scripts + automate (lint with shellcheck)</li>
</ul>

<pre>
ASCII: skill stack

      [automation/scripts]
   [data parsing + networking]
 [process + permissions + text]
     [navigation + shell]
</pre>

<div class="hint">
Pick one “real” project (e.g. log analysis, backups, deploy script) and build it over the month.
</div>
`
    },
  ];
  const quizBank = {
    mindset: [
      { type:"mcq", prompt:"What does `2> err.txt` do?", choices:["Redirect stdout to err.txt","Redirect stderr to err.txt","Append stdout to err.txt","Pipe stderr to the next command"], answerIndex:1, explanation:"File descriptor 2 is stderr, so `2>` redirects stderr." },
      { type:"short", prompt:"What command shows your recent command history tail?", answer:"history | tail", explanation:"This gives a quick scratchpad of recent commands." }
    ],
    navigation: [
      { type:"mcq", prompt:"What does `pushd`/`popd` help with?", choices:["File permissions","Directory stack navigation","Process signals","Port scanning"], answerIndex:1, explanation:"They manage a stack of directories for quick jumping." },
      { type:"short", prompt:"Use zoxide to jump to a folder remembered as proj.", answer:"z proj", explanation:"zoxide stores weighted directory history." }
    ],
    help: [
      { type:"mcq", prompt:"Which command lists manuals matching a keyword?", choices:["whereis keyword","man -k keyword","help keyword","which keyword"], answerIndex:1, explanation:"`man -k` (or apropos) searches man page names/descriptions." },
      { type:"short", prompt:"Open the quick examples for curl.", answer:"tldr curl", explanation:"tldr provides concise examples." }
    ],
    text: [
      { type:"short", prompt:"Find TODO recursively with line numbers in current folder.", answer:'rg -n "TODO" .', explanation:"ripgrep is recursive by default; -n prints line numbers." },
      { type:"output", prompt:"Predict output for `printf \"a\\na\\nb\\n\" | sort | uniq -c`", answer:"      2 a\n      1 b", explanation:"sort groups lines; uniq -c counts adjacent duplicates." }
    ],
    globbing: [
      { type:"mcq", prompt:"Which quote type prevents variable expansion?", choices:["Double quotes \"...\"","Single quotes '...'","Backticks","No quotes"], answerIndex:1, explanation:"Single quotes keep content literal in shell." },
      { type:"short", prompt:"Write a safe command to list a path stored in variable path that might contain spaces.", answer:'ls "$path"', explanation:"Quote variables that may include spaces." }
    ],
    permissions: [
      { type:"mcq", prompt:"What does chmod 750 grant to group?", choices:["rwx","r-x","rw-","---"], answerIndex:1, explanation:"7 user=rwx, 5 group=r-x, 0 others=---." },
      { type:"short", prompt:"Set owner user and group devops on deploy.sh.", answer:"chown user:devops deploy.sh", explanation:"Format is chown user:group file." }
    ],
    processes: [
      { type:"mcq", prompt:"Ctrl+C usually sends which signal?", choices:["SIGTERM","SIGKILL","SIGINT","SIGHUP"], answerIndex:2, explanation:"Interactive interrupt is SIGINT." },
      { type:"short", prompt:"Bring first background job to foreground.", answer:"fg %1", explanation:"job spec `%1` targets the first job." }
    ],
    networking: [
      { type:"mcq", prompt:"Default SSH port is:", choices:["80","22","443","53"], answerIndex:1, explanation:"SSH listens on TCP 22 by default." },
      { type:"short", prompt:"List listening ports and processes.", answer:"ss -tulpn", explanation:"ss provides socket and process details." }
    ],
    git: [
      { type:"mcq", prompt:"Which command stages patches interactively?", choices:["git add -p","git stage all","git patch","git commit -p"], answerIndex:0, explanation:"`git add -p` lets you stage hunks." },
      { type:"short", prompt:"Check repo state before committing.", answer:"git status", explanation:"Always inspect status before changes." }
    ],
    tmux: [
      { type:"mcq", prompt:"tmux key chord for new window (default prefix)?", choices:["Ctrl+b c","Ctrl+b %","Ctrl+b o","Ctrl+b d"], answerIndex:0, explanation:"Prefix Ctrl+b then c creates a window." },
      { type:"short", prompt:"Reattach to tmux session named work.", answer:"tmux a -t work", explanation:"`a` is shorthand for attach." }
    ],
    dotfiles: [
      { type:"mcq", prompt:"Which alias is a safety rail for delete?", choices:["alias rm='rm -i'","alias rm='rm -rf'","alias cp='cp -r'","alias mv='mv -f'"], answerIndex:0, explanation:"Interactive rm helps avoid accidental deletion." },
      { type:"short", prompt:"Set safer copy alias from the lesson.", answer:"alias cp='cp -i'", explanation:"-i prompts before overwrite." }
    ],
    parsing: [
      { type:"mcq", prompt:"Which tool is designed to query JSON on CLI?", choices:["awk","jq","grep","sed"], answerIndex:1, explanation:"jq is purpose-built for JSON." },
      { type:"short", prompt:"Select error-status items with jq (assuming array at .items).", answer:'jq ".items[] | select(.status==\"error\")"', explanation:"Select filters objects by predicate." }
    ],
    scripting: [
      { type:"mcq", prompt:"Which strict-mode header is recommended?", choices:["set -x","set -euo pipefail","set +e","set -f"], answerIndex:1, explanation:"`set -euo pipefail` is the baseline here." },
      { type:"short", prompt:"What command should you run to lint shell scripts?", answer:"shellcheck script.sh", explanation:"shellcheck catches common shell bugs." }
    ],
    tools: [
      { type:"mcq", prompt:"Which trio gives the fastest day-one speedup?", choices:["curl + ssh + rsync","rg + fzf + tmux","jq + yq + python","git + gh + make"], answerIndex:1, explanation:"The lesson calls out rg + fzf + tmux." },
      { type:"short", prompt:"Name one monitoring tool from the toolbox section.", answer:"htop", explanation:"Any listed tool (e.g., htop, lsof, strace) is valid." }
    ],
    challenge: [
      { type:"mcq", prompt:"Days 11–15 focus on which area?", choices:["Git workflows","Networking","Dotfiles","Permissions"], answerIndex:1, explanation:"The plan explicitly assigns networking to days 11–15." },
      { type:"short", prompt:"What should you pick and build over the month?", answer:"one real project", explanation:"A real project compounds skills across lessons." }
    ]
  };

  lessons.forEach(l => {
  if (quizBank[l.id]) l.quiz = quizBank[l.id];
});

export const course = {
  meta,
  lessons,
  glossaryId: "linux-terminal",
};

export const drillTasks = [
  "Find the 10 largest files under current directory.",
  "List listening ports with owning processes.",
  "Find TODO/FIXME lines in this repo.",
  "Show top 5 memory-consuming processes.",
  "Find files modified in the last 24 hours."
];
