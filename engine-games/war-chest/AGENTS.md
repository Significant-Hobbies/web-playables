# War Chest

Personal native Godot 4 desktop game. Work on main; do not commit, push or release without explicit owner instruction.
Read PRODUCT.md and DESIGN.md before gameplay/UI changes. Issue #1 owns the active specification.
Keep rules in scripts/game.gd independent of rendering. Run scripts/check.sh after model changes, then inspect the native game after presentation changes.
Godot is the only runtime dependency. Assets require provenance in ASSETS.md; downloaded media and generated screenshots remain ignored by Git.
Never overwrite a malformed player save. Tests must use isolated storage. No accounts, analytics, network calls, payments, cloud saves, or daily-login obligations.
