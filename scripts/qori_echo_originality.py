from pathlib import Path
from itertools import combinations
import re

SOURCES = {
    "CREATOR": Path("src/components/qori/qoriVisitorEchoes.js"),
    "QORI_GUARDIAN": Path("src/components/qori/qoriCoherentEchoes.js"),
}

ENTRY = re.compile(
    r'\bmatch\s*:\s*\[([^\]]*)\]\s*,?\s*responses\s*:\s*\[\s*`([^`]*)`',
    re.S
)

COMMON = set("""
the and for with from this that what when where have has
was were are you your they them their its but not into
about something people someone because would could should
there here then than just want wanted also only
energon creator echo qori
""".split())

def words(message):
    message = re.sub(
        r"Creator Echo:|Q['’]ori Echo:|— Creator|— Q['’]ori",
        " ", message, flags=re.I
    )
    message = re.sub(
        r"one\s+wallet\.\s*one\s+cube\.\s*one\s+guardian\.?",
        " ", message, flags=re.I
    )
    return re.findall(r"[a-z]+", message.lower())

def grams(tokens):
    return set(zip(*(tokens[i:] for i in range(4))))

def compare(a, b):
    wa, wb = words(a), words(b)
    ga, gb = grams(wa), grams(wb)
    wording = len(ga & gb) / max(1, min(len(ga), len(gb)))
    ka = {w for w in wa if len(w) > 3 and w not in COMMON}
    kb = {w for w in wb if len(w) > 3 and w not in COMMON}
    topic = len(ka & kb) / max(1, len(ka | kb))
    return wording, topic

print("========== Q.O.R.I. ORIGINALITY AUDIT ==========")

for group, path in SOURCES.items():
    source = path.read_text(encoding="utf-8")
    matches = list(ENTRY.finditer(source))
    declared = len(re.findall(r'\bresponses\s*:', source))

    if len(matches) != declared:
        raise SystemExit(
            f"STOP: {path} has unsupported response structures."
        )

    items = []
    for match in matches:
        key = re.search(r'"([^"]+)"', match.group(1))
        label = key.group(1) if key else "unknown"
        items.append((label, match.group(2)))

    results = []
    for (label_a, text_a), (label_b, text_b) in combinations(items, 2):
        wording, topic = compare(text_a, text_b)
        results.append((wording, topic, label_a, label_b))

    flagged = [
        r for r in results if r[0] >= 0.50 or r[1] >= 0.40
    ]

    print(f"\n{group}: {len(items)} messages, {len(results)} comparisons")
    print(f"Potential repetition flags: {len(flagged)}")

    for wording, topic, a, b in sorted(
        results, key=lambda r: max(r[0], r[1]), reverse=True
    )[:6]:
        flag = "REVIEW" if wording >= 0.50 or topic >= 0.40 else "INFO"
        print(
            f"{flag} | {a} <> {b} | "
            f"wording {wording:.0%} | topic {topic:.0%}"
        )

print("\nADVISORY REPORT ONLY — NO MESSAGES MODIFIED")

# CANDIDATE_REPORT_V1
import sys

if len(sys.argv) > 1:
    if len(sys.argv) != 4 or sys.argv[1] != "--candidate" or sys.argv[3] not in SOURCES:
        raise SystemExit("USAGE: --candidate FILE CREATOR|QORI_GUARDIAN")

    f = Path(sys.argv[2])
    if not f.is_file():
        raise SystemExit("STOP: Candidate file missing.")

    candidate = f.read_text(encoding="utf-8")
    if len(words(candidate)) < 15:
        raise SystemExit("STOP: Candidate too short.")

    source = SOURCES[sys.argv[3]].read_text(encoding="utf-8")
    matches = list(ENTRY.finditer(source))
    if len(matches) != len(re.findall(r'\bresponses\s*:', source)):
        raise SystemExit("STOP: Unsupported response structure.")

    scores = []
    for m in matches:
        label = re.search(r'"([^"]+)"', m.group(1))
        w, t = compare(candidate, m.group(2))
        scores.append((w, t, label.group(1) if label else "unknown"))

    print("\n========== CANDIDATE ORIGINALITY ==========")
    for w, t, label in sorted(scores, reverse=True)[:5]:
        flag = "REVIEW" if w >= 0.50 or t >= 0.40 else "INFO"
        print(f"{flag} | {label} | wording {w:.0%} | topic {t:.0%}")

    print("READ-ONLY COMPARISON COMPLETE")
