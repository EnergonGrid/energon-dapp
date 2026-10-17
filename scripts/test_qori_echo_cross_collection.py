from pathlib import Path
import re
import subprocess
import sys
import tempfile

source = Path("src/components/qori/qoriCoherentEchoes.js").read_text()
pattern = r'match\s*:\s*\[([^\]]+)\]\s*,?\s*responses\s*:\s*\[\s*`([^`]*)`'
entries = list(re.finditer(pattern, source, re.S))
assert len(entries) == 16, "Unexpected Guardian Echo count"

selected = max(entries, key=lambda m: len(m.group(2)))
label = re.search(r'"([^"]+)"', selected.group(1)).group(1)

with tempfile.TemporaryDirectory() as folder:
    candidate = Path(folder) / "guardian.txt"
    candidate.write_text(selected.group(2), encoding="utf-8")

    def report(group):
        output = subprocess.check_output(
            [sys.executable, "scripts/qori_echo_originality.py",
             "--candidate", str(candidate), group],
            text=True
        )
        return output.split("========== CANDIDATE ORIGINALITY ==========")[-1]

    guardian = report("QORI_GUARDIAN")
    assert f"REVIEW | {label} | wording 100%" in guardian
    print("PASS: Q'ori detects her own Echo")

    creator = report("CREATOR")
    assert "REVIEW |" not in creator
    print("PASS: Creator collection remains distinct")

print("ALL CROSS-COLLECTION TESTS PASSED")
