#!/bin/sh
# Fetch original licensed media only. Existing local assets are preserved.
set -eu
cd "$(dirname "$0")/.."
mkdir -p assets/models/weapons assets/textures assets/licenses
fetch() {
 if [ ! -f "$2" ]; then curl -fL --retry 2 "$1" -o "$2"; fi
}
ADVENTURERS="https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/672074b73ba276876a19e8816ecdc5241817ab47"
SKELETONS="https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0/15b62b9bad122f72926c10fb14d622c73819fa54"
DUNGEON="https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0/b0ca9bd96a8072ab36a3a5464f00ed1e06a16d07"
for model in Knight Mage Rogue_Hooded; do
 fetch "$ADVENTURERS/addons/kaykit_character_pack_adventures/Characters/gltf/$model.glb" "assets/models/$model.glb"
done
for model in Skeleton_Warrior Skeleton_Rogue; do
 fetch "$SKELETONS/addons/kaykit_character_pack_skeletons/Characters/gltf/$model.glb" "assets/models/$model.glb"
done
for name in sword_1handed.gltf sword_1handed.bin knight_texture.png; do
 fetch "$ADVENTURERS/addons/kaykit_character_pack_adventures/Assets/gltf/$name" "assets/models/weapons/$name"
done
for name in torch_lit.gltf.glb barrel_large_decorated.gltf.glb crates_stacked.gltf.glb chest_gold.glb; do
 fetch "$DUNGEON/addons/kaykit_dungeon_remastered/Assets/gltf/$name" "assets/models/$name"
done
fetch "$ADVENTURERS/LICENSE.txt" assets/licenses/KayKit-Adventurers.txt
fetch "$SKELETONS/LICENSE.txt" assets/licenses/KayKit-Skeletons.txt
fetch "$DUNGEON/LICENSE.txt" assets/licenses/KayKit-Dungeon.txt
fetch https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rock_face_03/rock_face_03_diff_1k.jpg assets/textures/stone.jpg
