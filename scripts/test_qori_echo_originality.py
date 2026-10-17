from pathlib import Path
import re
import subprocess
import sys
import tempfile

source = Path("src/components/qori/qoriVisitorEchoes.js").read_text()
match = re.search(
    r'match:\s*\["community",\s*"join",\s*"people"\],'
    r'\s*responses:\s*\[\s*`([^`]*)`',
    source, re.S
)
assert match, "Community Echo not found"

with tempfile.TemporaryDirectory() as folder:
    candidate = Path(folder) / "candidate.txt"

    def check(text):
        candidate.write_text(text)
        result = subprocess.run(
            [sys.executable, "scripts/qori_echo_originality.py",
             "--candidate", str(candidate), "CREATOR"],
            capture_output=True, text=True, check=True
        )
        return result.stdout.split(
            "========== CANDIDATE ORIGINALITY =========="
        )[-1]

    duplicate = check(match.group(1))
    assert "REVIEW | community | wording 100%" in duplicate
    print("PASS: Exact duplicate detected")

    unrelated = check(
        "A violinist tunes four strings before an orchestra "
        "rehearsal. The conductor checks seating arrangements "
        "while musicians practice scales. Concert hall acoustics "
        "change how instruments sound across the room."
    )
    assert "REVIEW |" not in unrelated
    print("PASS: Unrelated writing not flagged")

print("ALL ORIGINALITY CHECKER TESTS PASSED")
