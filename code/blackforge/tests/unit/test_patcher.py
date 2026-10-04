from pathlib import Path

from blackforge.execution.patcher import Patcher


def test_apply_simple_patch(tmp_path: Path):
    target = tmp_path / "src" / "mod.py"
    target.parent.mkdir(parents=True)
    target.write_text("a = 1\nb = 2\nc = 3\n", encoding="utf-8")

    diff = """\
--- a/src/mod.py
+++ b/src/mod.py
@@ -1,3 +1,3 @@
 a = 1
-b = 2
+b = 20
 c = 3
"""
    modified = Patcher().apply(tmp_path, diff)
    assert modified == ["src/mod.py"]
    assert "b = 20" in target.read_text(encoding="utf-8")
