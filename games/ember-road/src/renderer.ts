export type ArtDirection = "ember" | "moon" | "tabletop";

import { attackMotion } from "./attack-motion";
import { isEmberMarch } from "./ember-march";
import { isFirstLight, weaponAppearance } from "./first-light";
import { HERO_ATLASES } from "./hero-art";
import type {
  ActorId,
  BattlePhase,
  CompanionId,
  EnemyFighter,
  GameEvent,
  GameState,
  PetId,
} from "./model";
import { COMBO_TUNING, enemyIntent, rank, visibleBattle } from "./model";
import { systemUnlocked } from "./progression";
import { spriteBottom, visibleSpriteHeight } from "./sprite-frames";

interface ActorMotion {
  arrival: number;
  attack: number;
  contact: number;
  hurt: number;
  death: number;
  target: ActorId;
  projectile: boolean;
}
export interface Scene {
  firstLight?: boolean;
  march?: boolean;
  blade?: "ordinary" | "sunfang";
  time: number;
  distance: number;
  walking: boolean;
  chapter: number;
  beacons?: number;
  upgrades?: { blade: number; mail: number; charm: number };
  storm?: number;
  thorns?: number;
  reducedMotion: boolean;
  direction?: ArtDirection;
  companion: CompanionId;
  companyReady?: boolean;
  petsReady?: boolean;
  weapon?: string;
  pet: PetId;
  shield: number;
  brace?: number;
  exposed?: boolean;
  enemies: EnemyFighter[];
  marked?: ActorId;
}

export interface Spark {
  x: number;
  y: number;
  age: number;
  life: number;
  vx: number;
  vy: number;
  color: string;
  text?: string;
  label?: boolean;
}

const INK = "#26382f";
const PAPER = "#f5e6c2";
const GOLD = "#e8b75e";
const RUST = "#b44e35";
const TEAL = "#486d64";

export class WorldRenderer {
  private ctx: CanvasRenderingContext2D;
  private heroImage = new Image();
  private sunfangImage = new Image();
  private clearingImage = new Image();
  private enemyImage = new Image();
  private partyImage = new Image();
  private petImage = new Image();
  private walkImage = new Image();
  private motions = new Map<ActorId, ActorMotion>();
  private foes: EnemyFighter[] = [];
  private fallen: EnemyFighter[] = [];
  private capturedBattle: BattlePhase | undefined;
  private campView = true;
  private scene: Scene | null = null;
  private effects: { actor: ActorId; target: ActorId; age: number; kind: string }[] = [];
  private seenReactions = new WeakSet<object>();
  private backdrops = new Map<number, HTMLImageElement>();
  private lightningAge = 1;
  private readonly roadAtlasUrl = new URL("../assets/toon-roads.png", import.meta.url).href;
  private width = 1000;
  private height = 520;
  private actorScale = 1;
  readonly sparks: Spark[] = [];
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("The game needs a browser with Canvas 2D support.");
    this.ctx = ctx;
    this.heroImage.src = HERO_ATLASES.ordinary;
    this.sunfangImage.src = HERO_ATLASES.sunfang;
    this.clearingImage.src = new URL(
      "../assets/first-light-clearing-v1.webp",
      import.meta.url,
    ).href;
    this.enemyImage.src = new URL("../assets/toon-enemies.png", import.meta.url).href;
    this.partyImage.src = new URL("../assets/toon-party.png", import.meta.url).href;
    this.petImage.src = new URL("../assets/toon-pets.png", import.meta.url).href;
    this.walkImage.src = new URL("../assets/toon-walk.png", import.meta.url).href;
    this.backdrop(1);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * ratio);
    this.canvas.height = Math.round(rect.height * ratio);
    this.width = 1000;
    this.height = (rect.height / Math.max(1, rect.width)) * this.width;
    this.actorScale = Math.min(1.03, Math.max(0.45, this.height / 420));
  }

  clear() {
    this.motions.clear();
    this.foes = [];
    this.fallen = [];
    this.capturedBattle = undefined;
    this.effects = [];
    this.seenReactions = new WeakSet();
    this.sparks.length = 0;
  }

  capture(state: GameState) {
    const battle = visibleBattle(state);
    if (battle) {
      const sameBattle = battle === this.capturedBattle;
      if (!sameBattle) {
        this.fallen = [];
        this.motions.clear();
        this.effects = [];
        this.seenReactions = new WeakSet();
        for (const foe of battle.enemies) {
          if (!foe.pendingHit || foe.hp <= 0) continue;
          const contact = foe.pendingHit.windup ?? (foe.row === "back" ? 0.65 : 0.29);
          Object.assign(this.motion(foe.id), {
            attack: Math.max(0, contact - foe.pendingHit.remaining),
            contact,
            target: "hero",
            projectile: foe.row === "back",
          });
        }
        for (const actor of ["hero", "companion", "pet"] as const) {
          const hit =
            battle[
              actor === "hero" ? "heroHit" : actor === "companion" ? "companionHit" : "petHit"
            ];
          if (!hit) continue;
          const contact =
            actor === "hero" ? 0.22 : actor === "pet" ? 0.3 : hit.projectile ? 0.5 : 0.25;
          Object.assign(this.motion(actor), {
            attack: Math.max(0, contact - hit.remaining),
            contact,
            target: hit.target,
            projectile: hit.projectile,
          });
        }
      }
      this.capturedBattle = battle;
      if (sameBattle && isEmberMarch(state)) {
        for (const foe of battle.enemies) {
          if (foe.hp > 0 && !this.motions.has(foe.id)) this.motion(foe.id).arrival = 0;
        }
      }
      this.foes = [
        ...battle.enemies,
        ...this.fallen.filter((foe) => !battle.enemies.some((current) => current.id === foe.id)),
      ];
      // The saved queue owns flights, including those already in the air on reload.
      for (const reaction of battle.reactions ?? []) {
        if (this.seenReactions.has(reaction)) continue;
        this.seenReactions.add(reaction);
        this.effects.push({
          actor: reaction.actor,
          target: reaction.target,
          age: Math.max(0, COMBO_TUNING.shardFlight - reaction.remaining),
          kind: reaction.effect,
        });
      }
    }
  }

  private motion(id: ActorId) {
    let motion = this.motions.get(id);
    if (!motion) {
      motion = {
        arrival: 1,
        attack: -1,
        contact: 0.22,
        hurt: -1,
        death: 0,
        target: "hero",
        projectile: false,
      };
      this.motions.set(id, motion);
    }
    return motion;
  }

  get settling() {
    return [...this.motions.values()].some((m) => m.death > 0 && m.death < 1);
  }

  handle(events: GameEvent[], state: GameState) {
    for (const event of events) {
      if (event.type === "spawn") {
        if (!this.foes.some((foe) => foe.id === event.enemy.id)) this.foes.push({ ...event.enemy });
        this.motion(event.enemy.id).arrival = 0;
      } else if (event.type === "command") {
        if (event.command === "breakthrough" || event.result === "perfect")
          Object.assign(this.motion("hero"), {
            attack: 0.22,
            contact: 0.22,
            target: event.target,
            projectile: false,
          });
        const p = this.position(event.result === "perfect" ? "hero" : event.target);
        this.effects.push({
          actor: "hero",
          target: event.target,
          age: 0,
          kind: event.command === "brace" ? "shield" : "interrupt",
        });
        if (event.result !== "ready")
          this.sparks.push({
            x: p.x - 35,
            y: p.y - 180 * p.scale,
            label: true,
            age: 0,
            life: 0.8,
            vx: 0,
            vy: -18,
            color: event.result === "perfect" ? "#ffe08a" : "#9de6e0",
            text:
              event.result === "perfect"
                ? "PERFECT!"
                : event.result === "interrupt"
                  ? "BROKEN"
                  : "BRACED",
          });
      } else if (event.type === "combo") {
        if (event.effect !== "shatterguard")
          this.effects.push({
            actor: event.actor,
            target: event.target,
            age: 0,
            kind: event.effect,
          });
      } else if (event.type === "swing") {
        Object.assign(this.motion(event.actor), {
          attack: 0,
          target: event.target,
          projectile: event.projectile,
          contact:
            event.contact ??
            (event.actor === "hero"
              ? 0.22
              : event.actor === "pet"
                ? 0.3
                : event.actor === "companion"
                  ? event.projectile
                    ? 0.5
                    : 0.25
                  : event.projectile
                    ? 0.65
                    : 0.29),
        });
      } else if (event.type === "hit") {
        if (event.damage === 0) continue;
        this.motion(event.target).hurt = 0;
        if (!event.effect && (event.actor === "hero" || event.actor === "pet"))
          this.effects.push({
            actor: event.actor,
            target: event.target,
            age: 0,
            kind: event.actor === "pet" ? "pet-impact" : `weapon-${state.meta.loadout.weapon}`,
          });
        this.impact(event.target, event.damage, event.critical, false, event.lightning);
        if (
          !event.effect &&
          (event.lightning ||
            (event.actor === "hero" && event.target !== this.motion("hero").target))
        )
          this.effects.push({
            actor: event.actor,
            target: event.target,
            age: 0,
            kind: event.lightning ? "lightning" : "cleave",
          });
      } else if (event.type === "xp") {
        const p = this.position(event.target);
        this.sparks.push({
          x: p.x,
          y: p.y - 45 * p.scale,
          age: 0,
          life: 0.65,
          vx: -35,
          vy: -30,
          color: "#b9ff8d",
          label: true,
          text: `+${event.amount} XP`,
        });
      } else if (event.type === "heal") this.impact("hero", event.amount, false, true);
      else if (event.type === "kill") {
        const foe = this.foes.find((foe) => foe.id === event.target);
        if (isEmberMarch(state) && foe && !this.fallen.some((dead) => dead.id === foe.id))
          this.fallen.push({ ...foe, hp: 0 });
        this.motion(event.target).death = 0.001;
        this.motion(event.target).attack = -1;
      } else if (event.type === "defeat") this.motion("hero").death = 0.001;
      else if (event.type === "interrupt") {
        this.motion(event.target).attack = -1;
        this.effects.push({ actor: event.actor, target: event.target, age: 0, kind: "interrupt" });
      } else if (event.type === "shield")
        this.effects.push({ actor: "hero", target: "hero", age: 0, kind: "shield" });
      else if (event.type === "skill")
        this.effects.push({ actor: "hero", target: "hero", age: 0, kind: event.skill });
    }
    this.capture(state);
  }

  frame(
    state: GameState,
    time: number,
    reducedMotion: boolean,
    camp = state.phase.kind === "camp",
  ) {
    this.campView = camp;
    this.capture(state);
    if (camp) return;
    const enemies = !camp && (visibleBattle(state) || this.settling) ? this.foes : [];
    this.draw({
      firstLight: isFirstLight(state),
      march: isEmberMarch(state),
      blade: weaponAppearance(state),
      time,
      distance: state.run.distance,
      walking: state.phase.kind === "travel" || (isEmberMarch(state) && !!visibleBattle(state)),
      chapter: state.run.chapter,
      beacons: state.run.cleared,
      upgrades: state.meta.upgrades,
      storm: rank(state, "storm"),
      thorns: rank(state, "thorns"),
      reducedMotion,
      companion: state.meta.loadout.companion,
      companyReady: !isFirstLight(state) && systemUnlocked(state, "company"),
      petsReady: !isFirstLight(state) && systemUnlocked(state, "pets"),
      weapon: state.meta.loadout.weapon,
      pet: state.meta.loadout.pet,
      shield: state.run.shield,
      brace: isFirstLight(state)
        ? undefined
        : state.phase.kind === "battle"
          ? state.phase.commands?.brace
          : 0,
      exposed: state.phase.kind === "battle" ? (state.phase.commands?.exposed ?? 0) > 0 : false,
      marked: visibleBattle(state)?.mark?.target,
      enemies,
    });
  }

  private position(id: ActorId) {
    if (this.scene?.march && !this.campView) {
      const image = this.clearingImage;
      const artHeight = image.naturalWidth
        ? image.naturalHeight *
          Math.max(1000 / image.naturalWidth, this.height / image.naturalHeight) *
          1.06
        : this.height;
      const ground = Math.min(this.height * 0.94, this.height / 2 + artHeight * 0.3);
      const scale = this.actorScale * 0.62;
      if (id === "hero") return { x: 220, y: ground, scale };
      if (id === "companion") return { x: 95, y: ground - 10, scale: scale * 0.88 };
      if (id === "pet") return { x: 160, y: ground + 10, scale: scale * 0.5 };
      const foe = this.foes.find((foe) => foe.id === id);
      const slot = foe?.slot ?? 0;
      const back = foe?.row === "back";
      const arrival = this.scene.reducedMotion ? 1 : this.motion(id).arrival;
      return {
        x: (back ? 740 : 435) + (slot % 2) * (back ? 130 : 150) + (1 - arrival) ** 2 * 110,
        y: ground - (back ? 20 : 0) + (slot % 2) * 12,
        scale: scale * (foe?.kind === "warden" ? 1.18 : back ? 0.8 : 0.92),
      };
    }
    const ground = this.height * 0.76;
    if (this.campView) {
      if (id === "hero") return { x: 200, y: ground, scale: this.actorScale };
      if (id === "companion") return { x: 535, y: ground, scale: this.actorScale * 0.92 };
      if (id === "pet") return { x: 850, y: ground, scale: this.actorScale * 0.5 };
    }
    if (id === "hero")
      return { x: this.scene?.firstLight ? 300 : 355, y: ground, scale: this.actorScale };
    if (id === "companion") return { x: 155, y: ground - 18, scale: this.actorScale * 0.88 };
    if (id === "pet") return { x: 270, y: ground + 14, scale: this.actorScale * 0.5 };
    const foe = this.foes.find((e) => e.id === id);
    const slot = foe?.slot ?? 0;
    const back = foe?.row === "back";
    return {
      x: this.scene?.firstLight
        ? (back ? 790 : 610) + (slot % 2) * (back ? 100 : 140)
        : back
          ? 795 + (slot % 2) * 120
          : 540 + (slot % 2) * 125,
      y: ground - (back ? 30 : 0) + (slot % 2) * 15,
      scale:
        this.actorScale *
        (this.scene?.firstLight
          ? foe?.kind === "warden"
            ? 1.15
            : back
              ? 0.82
              : 0.98
          : back
            ? 0.77
            : 0.89),
    };
  }

  private posedPosition(id: ActorId, scene = this.scene) {
    const p = this.position(id);
    if (!scene || scene.reducedMotion) return p;
    const m = this.motion(id);
    if (m.attack < 0 || m.projectile || m.death > 0) return p;
    const target = this.position(m.target);
    const pose = attackMotion(m.attack, m.contact, m.projectile, id === "pet");
    const reach = id === "pet" ? 32 : 74;
    p.x += (target.x - p.x - Math.sign(target.x - p.x) * reach) * pose.reach;
    p.y -= pose.lift;
    if (id === "pet" && scene.pet === "owl")
      p.y -= Math.sin(Math.max(0, pose.reach) * Math.PI) * 65;
    return p;
  }

  private impact(
    target: ActorId,
    value: number,
    critical: boolean,
    heal = false,
    lightning = false,
  ) {
    if (!value) return;
    if (lightning) this.lightningAge = 0;
    const { x, y, scale } = this.posedPosition(target);
    if (!heal) {
      for (let i = 0; i < (critical ? 7 : 3); i++) {
        const angle = (i / (critical ? 7 : 3)) * Math.PI * 2;
        this.sparks.push({
          x,
          y: y - 95 * scale,
          age: 0,
          life: critical ? 0.45 : 0.28,
          vx: Math.cos(angle) * (critical ? 90 : 48),
          vy: Math.sin(angle) * 45 - 35,
          color: critical ? "#ffd26d" : "#f1d894",
        });
      }
    }
    this.sparks.push({
      x,
      y: y - 170 * scale,
      age: 0,
      life: 0.8,
      vx: critical ? -10 : 4,
      vy: -25,
      color: heal ? "#bee09c" : critical ? "#ffe1a0" : PAPER,
      text: `${heal ? "+" : "−"}${Math.ceil(value)}${critical ? "!" : ""}`,
    });
  }

  advance(dt: number) {
    this.lightningAge += dt;
    for (const m of this.motions.values()) {
      m.arrival = Math.min(1, m.arrival + dt / 0.35);
      if (m.attack >= 0) {
        m.attack += dt;
        if (m.attack > m.contact + 0.35) m.attack = -1;
      }
      if (m.hurt >= 0) {
        m.hurt += dt;
        if (m.hurt > 0.24) m.hurt = -1;
      }
      if (m.death > 0) m.death = Math.min(1, m.death + dt / 0.48);
    }
    this.fallen = this.fallen.filter((foe) => this.motion(foe.id).death < 1);
    for (const effect of this.effects) effect.age += dt;
    this.effects = this.effects.filter((e) => e.age < 0.6);
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      if (!p) continue;
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (!p.text) p.vy += dt * 180;
      if (p.age >= p.life) this.sparks.splice(i, 1);
    }
  }

  draw(s: Scene) {
    const c = this.ctx;
    const w = this.width;
    const h = this.height;
    c.setTransform(this.canvas.width / w, 0, 0, this.canvas.height / h, 0, 0);
    c.clearRect(0, 0, w, h);
    const direction = s.direction ?? "ember";
    if (direction === "moon") this.moonWorld(s);
    else if (direction === "tabletop") this.tableWorld(s);
    else this.emberWorld(s);
    this.scene = s;
    this.drawActors(s);
    this.drawEffects(s);
    if (!s.reducedMotion && !s.firstLight) {
      this.particles(s);
      this.weather(s);
    }
    if (!s.firstLight) this.foreground(s);
    c.save();
    for (const p of this.sparks) {
      c.globalAlpha = Math.min(1, (1 - p.age / p.life) * 2);
      if (p.text) {
        c.font = `700 ${p.label ? (s.march ? 11 : 15) : p.text.includes("!") ? (s.march ? 24 : 32) : s.march ? 18 : 26}px ${p.label || s.firstLight || s.march ? "Nunito, sans-serif" : "Georgia, serif"}`;
        c.textAlign = "center";
        c.lineWidth = p.label ? 3 : 5;
        c.strokeStyle = "#25362e";
        c.strokeText(p.text, p.x, p.y);
        c.fillStyle = p.color;
        c.fillText(p.text, p.x, p.y);
      } else {
        c.fillStyle = p.color;
        c.translate(p.x, p.y);
        c.rotate(p.age * 8);
        c.fillRect(-2, -2, 4, 4);
        c.rotate(-p.age * 8);
        c.translate(-p.x, -p.y);
      }
    }
    c.restore();
    if (s.firstLight) return;
    const vignette = c.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7);
    vignette.addColorStop(0, "#19352d00");
    vignette.addColorStop(1, direction === "moon" ? "#0c112966" : "#1f352e55");
    c.fillStyle = vignette;
    c.fillRect(0, 0, w, h);
  }

  private drawActors(s: Scene) {
    const ids: ActorId[] = [
      "companion",
      ...s.enemies.filter((e) => e.row === "back").map((e) => e.id),
      "hero",
      ...s.enemies.filter((e) => e.row === "front").map((e) => e.id),
      "pet",
    ];
    for (const id of ids) {
      const m = this.motion(id);
      const foe = s.enemies.find((e) => e.id === id);
      if (foe && foe.hp <= 0 && m.death === 0) continue;
      if (
        m.death >= 1 ||
        (id === "companion" && s.companyReady === false) ||
        (id === "pet" && s.petsReady === false)
      )
        continue;
      const { x, y, scale } = this.posedPosition(id, s);
      const pose = attackMotion(m.attack, m.contact, m.projectile, id === "pet");
      const attack = m.attack < 0 ? 0 : pose.frame / 4 + 0.01;
      const hurt = m.hurt < 0 ? 0 : m.hurt / 0.24;
      this.ctx.save();
      if (!s.reducedMotion && m.attack >= 0) {
        const facing = this.position(m.target).x >= x ? 1 : -1;
        this.ctx.translate(x, y);
        this.ctx.rotate(pose.tilt * facing);
        this.ctx.scale(pose.sx, pose.sy);
        this.ctx.translate(-x, -y);
      }
      if (id === "hero" || (foe && foe.kind !== "archer")) {
        this.character(
          x,
          y,
          scale,
          id === "hero" ? "hero" : foe!.kind,
          s.walking && !s.reducedMotion ? Math.sin(s.time * 10) : 0,
          attack,
          hurt,
          m.death,
          s,
          id !== "hero",
        );
        if (id === "hero") this.equipment(s, x, y, scale);
      } else {
        const pet = id === "pet";
        const walking = id === "companion" && s.walking && !s.reducedMotion;
        const image = pet ? this.petImage : walking ? this.walkImage : this.partyImage;
        const rows = pet || walking ? 3 : 4;
        const row = pet
          ? { fox: 0, hound: 1, owl: 2 }[s.pet]
          : id === "companion"
            ? { mira: 0, bram: 1, sable: 2 }[s.companion]
            : 3;
        const column = walking ? Math.floor(s.time * 7) % 4 : pose.frame;
        this.atlas(
          image,
          4,
          rows,
          column,
          row,
          x,
          y,
          (pet ? 250 : 270) * scale,
          m.death,
          hurt,
          s.reducedMotion,
        );
      }
      this.ctx.restore();
      if (foe && foe.hp > 0) {
        const visibleHeight =
          foe.kind === "archer"
            ? 270 * visibleSpriteHeight("party", 3, 0)
            : 300 *
              visibleSpriteHeight(
                "enemies",
                0,
                { raider: 0, sentinel: 1, hexer: 2, warden: 3 }[foe.kind],
              );
        const barY = y - (visibleHeight + 16) * scale;
        this.healthBar(x, barY, 74, foe.hp, foe.maxHp);
        if (foe.pendingHit && s.brace !== undefined) {
          const intent = enemyIntent(foe),
            c = this.ctx;
          const progress = Math.min(
            1,
            1 - foe.pendingHit.remaining / (foe.pendingHit.windup ?? intent.windup),
          );
          c.fillStyle = "#172126";
          c.fillRect(x - 39, barY - 13, 78, 7);
          c.fillStyle = progress > 0.8 ? "#ffce6a" : foe.kind === "hexer" ? "#cc99f2" : "#e38b6f";
          c.fillRect(x - 37, barY - 11, 74 * progress, 3);
        }
      }
    }
    if (s.shield > 0 || (s.brace ?? 0) > 0) {
      const p = this.posedPosition("hero", s);
      this.ctx.strokeStyle = (s.brace ?? 0) > 0.6 ? "#ffe08a" : "#9cdee8";
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.ellipse(p.x, p.y - 85 * p.scale, 78 * p.scale, 112 * p.scale, 0, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  private atlas(
    image: HTMLImageElement,
    cols: number,
    rows: number,
    column: number,
    row: number,
    x: number,
    y: number,
    extent: number,
    death: number,
    hurt: number,
    reduced: boolean,
  ) {
    if (!image.complete || !image.naturalWidth) return;
    const c = this.ctx;
    const sw = image.naturalWidth / cols,
      sh = image.naturalHeight / rows;
    const sheet = image === this.petImage ? "pets" : image === this.walkImage ? "walk" : "party";
    const bottom = spriteBottom(sheet, row, column);
    c.save();
    this.ellipse(x, y + 3, extent * 0.18, extent * 0.035, "#263e333b");
    c.translate(x + (reduced ? 0 : Math.sin(hurt * Math.PI) * 6), y);
    c.globalAlpha *= 1 - death;
    if (death && !reduced) {
      c.rotate(death * 0.8);
      c.translate(death * 15, death * 8);
    }
    c.drawImage(
      image,
      column * sw,
      row * sh,
      sw,
      sh,
      -extent / 2,
      -(extent * sh * bottom) / sw,
      extent,
      (extent * sh) / sw,
    );
    c.restore();
  }

  private drawEffects(s: Scene) {
    const c = this.ctx;
    for (const [id, m] of this.motions) {
      if (m.attack < 0 || !m.projectile || m.attack > m.contact || m.death > 0) continue;
      const source = this.posedPosition(id, s),
        target = this.posedPosition(m.target, s);
      const windup = Math.min(0.2, m.contact * 0.35);
      if (m.attack < windup) continue;
      const t = Math.min(1, (m.attack - windup) / (m.contact - windup));
      const sx = source.x + (id === "companion" ? 45 : -35),
        sy = source.y - 105 * source.scale;
      const tx = target.x,
        ty = target.y - 100 * target.scale;
      const x = sx + (tx - sx) * t,
        y = sy + (ty - sy) * t - Math.sin(t * Math.PI) * 18;
      const bolt =
        id === "companion"
          ? s.companion === "sable"
          : this.foes.find((e) => e.id === id)?.kind === "hexer";
      c.save();
      c.translate(x, y);
      c.rotate(Math.atan2(ty - sy, tx - sx));
      if (bolt) {
        c.fillStyle = "#cba4fa";
        c.shadowColor = "#a879e5";
        c.shadowBlur = 15;
        c.beginPath();
        c.ellipse(0, 0, 11, 5, 0, 0, Math.PI * 2);
        c.fill();
      } else {
        this.line(-22, 0, 10, 0, "#452e21", 3);
        this.line(4, -4, 12, 0, "#eee8d7", 2);
        this.line(4, 4, 12, 0, "#eee8d7", 2);
        this.line(-20, -4, -14, 0, "#caba94", 2);
      }
      c.restore();
    }
    for (const foe of s.enemies) {
      if (foe.hp <= 0 || (!foe.braced && s.marked !== foe.id)) continue;
      const q = this.posedPosition(foe.id, s);
      const y = q.y - 165 * q.scale;
      c.save();
      c.strokeStyle = s.marked === foe.id ? "#ffc477" : "#98b6c3";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(q.x, y, 10, 0, Math.PI * 2);
      c.stroke();
      this.line(q.x - 5, y, q.x + 5, y, c.strokeStyle, 2);
      if (s.marked === foe.id) this.line(q.x, y - 5, q.x, y + 5, c.strokeStyle, 2);
      c.restore();
    }
    for (const effect of this.effects) {
      const p = this.posedPosition(effect.actor, s),
        q = this.posedPosition(effect.target, s);
      c.save();
      c.globalAlpha = 1 - effect.age / 0.6;
      if (effect.kind.startsWith("weapon-") || effect.kind === "pet-impact") {
        if (s.reducedMotion || effect.age > 0.22) {
          c.restore();
          continue;
        }
        const t = effect.age / 0.22;
        c.globalAlpha = (1 - t) ** 2;
        c.strokeStyle = effect.kind === "pet-impact" ? "#ff9d55" : "#fff2a9";
        c.lineWidth = (effect.kind === "weapon-greatsword" ? 11 : 6) * (1 - t * 0.6);
        c.lineCap = "round";
        if (effect.kind === "weapon-spear") {
          this.line(
            q.x - 78,
            q.y - 75 * q.scale,
            q.x + 25,
            q.y - 105 * q.scale,
            "#c1f4f5",
            6 * (1 - t),
          );
        } else if (effect.kind === "pet-impact") {
          for (let i = 0; i < 3; i++)
            this.line(
              q.x - 15 + i * 10,
              q.y - 105 * q.scale,
              q.x + 1 + i * 10,
              q.y - 60 * q.scale,
              "#ffbe70",
              3 * (1 - t),
            );
        } else {
          c.beginPath();
          c.ellipse(
            q.x,
            q.y - 95 * q.scale,
            (44 + t * 25) * q.scale,
            (60 + t * 18) * q.scale,
            -0.4,
            -0.9,
            1.3,
          );
          c.stroke();
        }
      } else if (effect.kind === "shatterguard") {
        const progress = s.reducedMotion ? 1 : Math.min(1, effect.age / COMBO_TUNING.shardFlight);
        const x = p.x + (q.x - p.x) * progress;
        const y = p.y - 85 * p.scale + (q.y - 85 * q.scale - (p.y - 85 * p.scale)) * progress;
        c.fillStyle = "#bcefff";
        c.beginPath();
        c.moveTo(x + 11, y);
        c.lineTo(x, y - 6);
        c.lineTo(x - 8, y);
        c.lineTo(x, y + 6);
        c.closePath();
        c.fill();
      } else if (
        effect.kind === "mark" ||
        effect.kind === "hunters-signal" ||
        effect.kind === "brace"
      ) {
        c.strokeStyle = effect.kind === "brace" ? "#98b6c3" : "#ffc477";
        c.lineWidth = effect.kind === "hunters-signal" ? 4 : 2;
        const y = q.y - 165 * q.scale;
        c.beginPath();
        c.arc(
          q.x,
          y,
          effect.kind === "hunters-signal"
            ? 16 + (s.reducedMotion ? 0 : (effect.age / 0.6) * 18)
            : 12,
          0,
          Math.PI * 2,
        );
        c.stroke();
        this.line(q.x - 7, y, q.x + 7, y, c.strokeStyle, 2);
        if (effect.kind !== "brace") this.line(q.x, y - 7, q.x, y + 7, c.strokeStyle, 2);
      } else if (effect.kind === "lightning" || effect.kind === "storm-relay") {
        c.strokeStyle = "#d8bcff";
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(p.x, p.y - 100 * p.scale);
        for (let i = 1; i <= 7; i++)
          c.lineTo(p.x + ((q.x - p.x) * i) / 7, q.y - 90 * q.scale + (i % 2 ? -18 : 12));
        c.stroke();
      } else if (effect.kind === "interrupt") {
        c.strokeStyle = "#eed18b";
        c.lineWidth = 3;
        const yy = q.y - 175 * q.scale;
        this.line(q.x - 12, yy - 12, q.x + 12, yy + 12, "#eed18b", 3);
        this.line(q.x - 12, yy + 12, q.x + 12, yy - 12, "#eed18b", 3);
      } else {
        c.strokeStyle = effect.kind === "aegis" || effect.kind === "shield" ? "#9cdee8" : "#f7d59a";
        c.lineWidth = 5;
        c.beginPath();
        c.ellipse(
          effect.kind === "cleave" ? q.x : p.x + 80,
          p.y - 75 * p.scale,
          (effect.kind === "whirlwind" ? 220 : 70) * p.scale,
          75 * p.scale,
          0,
          -1.8,
          1.8,
        );
        c.stroke();
      }
      c.restore();
    }
  }

  private shape(points: number[][], fill: string, stroke = INK, line = 3) {
    const c = this.ctx;
    c.beginPath();
    points.forEach((p, i) => {
      if (i === 0) c.moveTo(p[0] ?? 0, p[1] ?? 0);
      else c.lineTo(p[0] ?? 0, p[1] ?? 0);
    });
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    if (line) {
      c.strokeStyle = stroke;
      c.lineWidth = line;
      c.lineJoin = "round";
      c.stroke();
    }
  }

  private ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    fill: string,
    stroke?: string,
    line = 2,
  ) {
    const c = this.ctx;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = line;
      c.stroke();
    }
  }

  private line(x: number, y: number, xx: number, yy: number, color: string, width: number) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(xx, yy);
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = "round";
    c.stroke();
  }

  private emberWorld(s: Scene) {
    const c = this.ctx;
    const h = this.height;
    const ground = h * 0.73;
    if (
      (s.firstLight || s.march) &&
      this.clearingImage.complete &&
      this.clearingImage.naturalWidth
    ) {
      const image = this.clearingImage;
      const scale =
        Math.max(1000 / image.naturalWidth, h / image.naturalHeight) * (s.march ? 1.06 : 1);
      const width = image.naturalWidth * scale,
        height = image.naturalHeight * scale;
      c.drawImage(
        image,
        (1000 - width) / 2 + (s.march && !s.reducedMotion ? Math.sin(s.distance * 0.06) * 24 : 0),
        (h - height) / 2,
        width,
        height,
      );
      return;
    }
    const image = this.backdrop(s.chapter);
    if (image.complete && image.naturalWidth) {
      const img = image;
      const index = Math.max(0, Math.min(4, s.chapter - 1));
      const sw = img.naturalWidth / 2;
      const sh = img.naturalHeight / 3;
      const scale = Math.max(1000 / sw, h / sh);
      const w = sw * scale;
      const hh = sh * scale;
      const drift = Math.sin(s.distance * 0.15) * Math.min(22, Math.max(0, (w - 1000) / 2));
      c.drawImage(
        img,
        (index % 2) * sw,
        Math.floor(index / 2) * sh,
        sw,
        sh,
        (1000 - w) / 2 + drift,
        Math.max(h - hh, Math.min(0, h * 0.73 - hh * 0.74)),
        w,
        hh,
      );
      return;
    }
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#d7cfaa");
    sky.addColorStop(0.58, "#e9d7a8");
    sky.addColorStop(1, "#819278");
    c.fillStyle = sky;
    c.fillRect(0, 0, 1000, h);
    this.ellipse(725, h * 0.28, 65, 65, "#edc36c");
    this.ellipse(725, h * 0.28, 83, 83, "#f2dba51f");
    this.shape(
      [
        [0, h * 0.49],
        [130, h * 0.26],
        [270, h * 0.45],
        [450, h * 0.19],
        [680, h * 0.5],
        [815, h * 0.31],
        [1000, h * 0.46],
        [1000, h],
        [0, h],
      ],
      "#aeb19a",
      INK,
      0,
    );
    this.shape(
      [
        [0, h * 0.6],
        [150, h * 0.42],
        [390, h * 0.55],
        [540, h * 0.39],
        [720, h * 0.58],
        [930, h * 0.4],
        [1000, h * 0.52],
        [1000, h],
        [0, h],
      ],
      "#81957e",
      INK,
      0,
    );
    for (let i = 0; i < 11; i++) {
      const x = ((((i * 117 - s.distance * 9) % 1250) + 1250) % 1250) - 120;
      this.tree(x, ground - 20 - (i % 3) * 8, 0.65 + (i % 4) * 0.1, "#6c826b", 0.12);
    }
    c.save();
    c.globalAlpha = 0.5;
    this.ruin(755 - ((s.distance * 3) % 120), ground - 8, 0.9);
    c.restore();
    this.shape(
      [
        [0, ground - 15],
        [180, ground - 26],
        [360, ground - 10],
        [540, ground - 22],
        [760, ground - 16],
        [1000, ground - 30],
        [1000, h],
        [0, h],
      ],
      "#6b805f",
      INK,
      0,
    );
    this.shape(
      [
        [0, ground + 7],
        [170, ground + 1],
        [420, ground + 10],
        [680, ground - 2],
        [1000, ground - 2],
        [1000, ground + 79],
        [810, ground + 91],
        [610, ground + 82],
        [360, ground + 92],
        [160, ground + 78],
        [0, ground + 89],
      ],
      "#c8b58d",
      "#506047",
      3,
    );
    this.shape(
      [
        [0, ground + 20],
        [230, ground + 10],
        [490, ground + 26],
        [700, ground + 14],
        [1000, ground + 11],
        [1000, ground + 48],
        [700, ground + 40],
        [500, ground + 52],
        [260, ground + 43],
        [0, ground + 57],
      ],
      "#d9c69f",
      INK,
      0,
    );
    for (let i = 0; i < 24; i++) {
      const x = ((((i * 63 - s.distance * 68) % 1240) + 1240) % 1240) - 120;
      const y = ground + 20 + ((i * 31) % 59);
      this.line(x, y, x + 9 + (i % 13), y - 2, "#ad9a76", 2);
    }
    for (let i = 0; i < 14; i++) {
      const x = ((((i * 97 - s.distance * 75) % 1300) + 1300) % 1300) - 150;
      const y = ground + 82 + (i % 3) * 8;
      this.grass(x, y, 0.7, "#3c5945");
    }
    this.signpost(99 - ((s.distance * 60) % 1200), ground - 6);
  }

  private moonWorld(s: Scene) {
    const c = this.ctx;
    const h = this.height;
    const ground = h * 0.73;
    c.fillStyle = "#17243a";
    c.fillRect(0, 0, 1000, h);
    this.ellipse(720, h * 0.25, 67, 67, "#d8dfc6");
    this.ellipse(746, h * 0.2, 56, 56, "#17243a");
    for (let i = 0; i < 50; i++)
      this.ellipse((i * 179) % 1000, (i * 37) % (h * 0.6), 1, 1, "#d8dfc680");
    this.shape(
      [
        [0, ground],
        [110, h * 0.35],
        [240, h * 0.5],
        [510, h * 0.16],
        [790, h * 0.47],
        [920, h * 0.3],
        [1000, h * 0.4],
        [1000, h],
        [0, h],
      ],
      "#263c52",
      INK,
      0,
    );
    for (let i = 0; i < 10; i++)
      this.tree(
        ((((i * 137 - s.distance * 12) % 1250) + 1250) % 1250) - 100,
        ground,
        0.8 + (i % 3) * 0.1,
        "#1d3443",
        0.1,
      );
    this.ruin(810, ground - 5, 1.3);
    this.shape(
      [
        [0, ground - 5],
        [190, ground - 15],
        [500, ground],
        [760, ground - 10],
        [1000, ground - 5],
        [1000, h],
        [0, h],
      ],
      "#304d4d",
      INK,
      0,
    );
    this.shape(
      [
        [0, ground + 8],
        [330, ground + 2],
        [550, ground + 14],
        [1000, ground + 5],
        [1000, ground + 78],
        [600, ground + 75],
        [270, ground + 88],
        [0, ground + 70],
      ],
      "#647c79",
      "#142c33",
      3,
    );
    for (let i = 0; i < 16; i++)
      this.line(
        (i * 79 - s.distance * 65 + 1500) % 1100,
        ground + 23 + (i % 6) * 7,
        ((i * 79 - s.distance * 65 + 1500) % 1100) + 30,
        ground + 21 + (i % 6) * 7,
        "#82968a",
        2,
      );
  }

  private tableWorld(s: Scene) {
    const c = this.ctx;
    const h = this.height;
    const g = h * 0.73;
    c.fillStyle = "#eadcbc";
    c.fillRect(0, 0, 1000, h);
    for (let i = 0; i < 12; i++) this.line(0, i * 53, 1000, i * 53 + 8, "#d7c9aa", 1);
    c.save();
    c.translate(520, g - 100);
    c.rotate(-0.05);
    this.shape(
      [
        [-370, -120],
        [310, -120],
        [370, 165],
        [-350, 172],
      ],
      "#f5edda",
      "#b4a47f",
      2,
    );
    c.restore();
    for (let i = 0; i < 9; i++) {
      const x = ((((i * 135 - s.distance * 23) % 1300) + 1300) % 1300) - 150;
      this.tree(x, g - 12, 0.68 + (i % 3) * 0.14, "#56725b", 0.3);
    }
    this.ruin(810, g, 0.85);
    this.shape(
      [
        [0, g + 5],
        [210, g - 5],
        [500, g + 12],
        [740, g],
        [1000, g + 8],
        [1000, g + 85],
        [560, g + 88],
        [200, g + 78],
        [0, g + 90],
      ],
      "#bd9c69",
      "#7b6848",
      3,
    );
    for (let i = 0; i < 23; i++)
      this.ellipse(
        (i * 53 - s.distance * 65 + 1500) % 1100,
        g + 25 + (i % 4) * 13,
        9,
        4,
        "#d5bb8a",
        "#a98c5e",
        1,
      );
  }

  private tree(x: number, y: number, s: number, color: string, lean: number) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    this.shape(
      [
        [-5, 0],
        [-1, -123],
        [7, -115],
        [9, 0],
      ],
      "#435344",
      INK,
      0,
    );
    this.shape(
      [
        [-74, -45],
        [-35, -96],
        [-52, -93],
        [-20, -139],
        [-33, -134],
        [2, -192],
        [40, -135],
        [24, -138],
        [62, -88],
        [42, -92],
        [82, -42],
      ],
      color,
      INK,
      0,
    );
    this.line(2, -156, 5, -42, "#f2e1b326", 2);
    this.line(4, -71, -32, -51, "#f2e1b326", 2);
    c.restore();
    void lean;
  }

  private ruin(x: number, y: number, s: number) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    const stone = "#68796a";
    this.shape(
      [
        [-40, 0],
        [-38, -148],
        [-20, -153],
        [-16, -198],
        [12, -197],
        [18, -151],
        [39, -147],
        [42, 0],
      ],
      stone,
      "#526252",
      2,
    );
    this.shape(
      [
        [-35, -148],
        [-35, -179],
        [-23, -182],
        [-20, -149],
      ],
      "#7d8b73",
      "#526252",
      2,
    );
    this.shape(
      [
        [20, -147],
        [20, -175],
        [32, -179],
        [36, -147],
      ],
      "#7d8b73",
      "#526252",
      2,
    );
    this.shape(
      [
        [-14, 0],
        [-13, -40],
        [0, -53],
        [15, -39],
        [15, 0],
      ],
      "#405e50",
      "#526252",
      2,
    );
    for (const yy of [-75, -108, -143]) this.line(-35, yy, 33, yy + 3, "#526252", 2);
    this.shape(
      [
        [-36, -132],
        [-26, -92],
        [-34, -58],
        [-20, -42],
        [-25, 0],
        [-43, 0],
      ],
      "#456c50",
      INK,
      0,
    );
    this.line(4, -178, 4, -164, "#3e554b", 6);
    c.restore();
  }

  private signpost(x: number, y: number) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    this.line(0, 0, -3, -97, "#493e2b", 7);
    this.shape(
      [
        [-39, -88],
        [31, -91],
        [44, -79],
        [31, -66],
        [-40, -64],
      ],
      "#b5985e",
      "#514d32",
      3,
    );
    c.font = "700 12px Georgia, serif";
    c.fillStyle = "#3c4934";
    c.textAlign = "center";
    c.fillText("THE MARCH", 0, -73);
    this.line(-21, -51, -35, -15, "#5b784e", 3);
    this.ellipse(-30, -30, 9, 4, "#5b784e");
    c.restore();
  }

  private grass(x: number, y: number, s: number, color: string) {
    this.shape(
      [
        [x - 15 * s, y],
        [x - 18 * s, y - 19 * s],
        [x - 4 * s, y - 6 * s],
        [x, y - 28 * s],
        [x + 5 * s, y - 5 * s],
        [x + 18 * s, y - 17 * s],
        [x + 12 * s, y],
      ],
      color,
      INK,
      0,
    );
  }

  private character(
    x: number,
    y: number,
    size: number,
    kind: string,
    gait: number,
    attack: number,
    hurt: number,
    death: number,
    scene: Scene,
    flip: boolean,
  ) {
    const c = this.ctx;
    const hero = kind === "hero";
    const boss = kind === "warden";
    const mage = kind === "hexer";
    const skeleton = kind === "sentinel";
    let scale = size * (boss ? 1.3 : mage ? 0.9 : hero ? 1 : 0.9);
    if (scene.direction === "tabletop") scale *= 0.95;
    const spriteImage = hero
      ? scene.blade === "sunfang" && this.sunfangImage.complete && this.sunfangImage.naturalWidth
        ? this.sunfangImage
        : this.heroImage
      : this.enemyImage;
    if (spriteImage.complete && spriteImage.naturalWidth) {
      this.spriteCharacter(x, y, scale, kind, attack, hurt, death, scene, spriteImage);
      return;
    }
    c.save();
    this.ellipse(x, y + 4, 43 * scale * (1 - death * 0.3), 8 * scale, "#263e333b");
    c.translate(x, y);
    c.scale((flip ? -1 : 1) * scale, scale);
    c.globalAlpha *= 1 - death;
    if (death) {
      c.translate(-death * 35, death * 8);
      c.rotate(-death * 1.2);
    }
    if (hurt > 0) c.translate(-Math.sin(hurt * Math.PI) * 8, 0);
    const swing = attack > 0 ? this.swing(attack) : 0;
    const bodyLean = attack > 0 ? swing * 0.08 : 0;
    c.rotate(bodyLean);
    const cloth = hero ? PAPER : mage ? "#725a65" : "#8b5944";
    const armor = hero ? TEAL : boss ? "#6e6650" : skeleton ? "#8c8d77" : "#45524d";
    const highlight = hero ? "#7e9a87" : boss ? "#a59767" : "#6e7b68";
    const cape = scene.reducedMotion ? 0 : Math.sin(scene.time * (scene.walking ? 8 : 3)) * 5;
    this.shape(
      [
        [-18, -91],
        [-38, -72],
        [-49 - cape, -29],
        [-37 - cape, -38],
        [-31 - cape, -28],
        [-19, -45],
        [-7, -75],
      ],
      cloth,
      INK,
      3,
    );
    this.line(-31, -67, -39 - cape, -41, hero ? "#c2b28a" : "#6c3d36", 2);
    for (const [off, phase] of [
      [-15, 1],
      [15, -1],
    ]) {
      c.save();
      c.translate(off ?? 0, -34);
      c.rotate(gait * 0.4 * (phase ?? 1));
      this.shape(
        [
          [-10, -3],
          [9, -3],
          [8, 23],
          [-9, 23],
        ],
        "#3d4a40",
        INK,
        3,
      );
      this.shape(
        [
          [-11, 14],
          [11, 14],
          [13, 29],
          [22, 32],
          [22, 38],
          [-12, 38],
        ],
        "#463e31",
        INK,
        3,
      );
      this.line(-5, 18, 5, 18, GOLD, 2);
      c.restore();
    }
    this.shape(
      [
        [-26, -86],
        [-32, -47],
        [-20, -30],
        [18, -30],
        [30, -47],
        [24, -87],
      ],
      armor,
      INK,
      4,
    );
    this.shape(
      [
        [-23, -82],
        [-26, -57],
        [-3, -49],
        [20, -58],
        [22, -82],
      ],
      highlight,
      INK,
      2,
    );
    this.line(-2, -76, -2, -50, hero ? "#abc0a1" : "#b8b28c", 2);
    this.shape(
      [
        [-28, -47],
        [26, -47],
        [25, -36],
        [-25, -36],
      ],
      "#6c4e35",
      INK,
      3,
    );
    this.shape(
      [
        [-6, -48],
        [6, -48],
        [6, -35],
        [-6, -35],
      ],
      GOLD,
      INK,
      2,
    );
    this.ellipse(-19, -86, 18, 14, armor, INK, 3);
    this.line(-29, -88, -10, -88, highlight, 3);
    if (hero || boss || skeleton)
      this.shield(-29, -59, hero ? 1 : boss ? 1.15 : 0.7, hero ? "#b76844" : "#60664f", hero);
    if (mage) {
      this.shape(
        [
          [-28, -99],
          [-13, -143],
          [5, -170],
          [11, -143],
          [33, -99],
        ],
        "#655461",
        INK,
        4,
      );
      this.ellipse(2, -110, 29, 26, "#273731", INK, 4);
      this.line(-12, -113, -4, -113, GOLD, 4);
      this.line(10, -113, 17, -113, GOLD, 4);
      this.shape(
        [
          [-25, -79],
          [-33, -34],
          [0, -24],
          [29, -35],
          [23, -79],
        ],
        "#75616d",
        INK,
        3,
      );
      this.line(1, -78, 1, -33, "#b99b87", 3);
    } else if (skeleton) {
      this.ellipse(0, -111, 32, 31, "#ded8b9", INK, 4);
      this.shape(
        [
          [-21, -108],
          [-11, -119],
          [-2, -110],
          [-7, -100],
        ],
        INK,
        INK,
        0,
      );
      this.shape(
        [
          [8, -111],
          [20, -117],
          [22, -104],
          [11, -100],
        ],
        INK,
        INK,
        0,
      );
      this.line(-8, -86, 11, -86, INK, 5);
      for (const xx of [-5, 2, 9]) this.line(xx, -91, xx, -82, INK, 2);
      this.shape(
        [
          [-31, -120],
          [-23, -144],
          [6, -151],
          [28, -133],
          [33, -119],
        ],
        "#60725f",
        INK,
        3,
      );
    } else if (hero || boss) {
      this.helmet(hero, boss, highlight, armor);
    } else {
      this.ellipse(0, -108, 32, 30, "#7e8861", INK, 4);
      this.shape(
        [
          [-27, -111],
          [-49, -126],
          [-42, -101],
          [-29, -96],
        ],
        "#7e8861",
        INK,
        3,
      );
      this.shape(
        [
          [26, -112],
          [45, -128],
          [43, -103],
          [28, -95],
        ],
        "#7e8861",
        INK,
        3,
      );
      this.shape(
        [
          [-30, -118],
          [-17, -142],
          [9, -141],
          [29, -123],
          [30, -115],
        ],
        "#4a5a4d",
        INK,
        3,
      );
      this.line(-17, -110, -8, -112, GOLD, 4);
      this.line(9, -112, 18, -110, GOLD, 4);
      this.shape(
        [
          [-10, -93],
          [12, -93],
          [9, -85],
          [-7, -85],
        ],
        INK,
        INK,
        0,
      );
      this.shape(
        [
          [-8, -92],
          [-3, -85],
          [0, -92],
        ],
        PAPER,
        INK,
        0,
      );
    }
    if (hero) {
      this.shape(
        [
          [-26, -88],
          [-4, -81],
          [26, -91],
          [29, -80],
          [2, -69],
          [-28, -78],
        ],
        PAPER,
        INK,
        3,
      );
      this.shape(
        [
          [-22, -84],
          [-50 - cape, -92],
          [-64 - cape, -82],
          [-56 - cape, -77],
          [-68 - cape, -66],
          [-47 - cape, -70],
          [-21, -74],
        ],
        PAPER,
        INK,
        3,
      );
      this.line(-39, -81, -54 - cape, -79, "#d1b984", 2);
    }
    c.save();
    c.translate(20, -77);
    c.rotate(attack > 0 ? swing : hero ? -0.26 : 0.2);
    this.shape(
      [
        [-9, -2],
        [13, 1],
        [17, 31],
        [1, 35],
        [-6, 17],
      ],
      armor,
      INK,
      3,
    );
    this.ellipse(9, 30, 11, 10, "#65523c", INK, 3);
    if (mage) {
      this.line(11, 42, 11, -75, "#5d4a35", 6);
      this.shape(
        [
          [1, -77],
          [4, -92],
          [18, -98],
          [25, -86],
          [20, -72],
        ],
        GOLD,
        INK,
        3,
      );
      this.ellipse(12, -83, 8, 8, "#f6d68b");
    } else if (boss) {
      this.line(11, 48, 11, -77, "#5c4430", 7);
      this.shape(
        [
          [12, -78],
          [32, -91],
          [53, -78],
          [58, -54],
          [40, -42],
          [12, -54],
        ],
        "#a8aa8b",
        INK,
        4,
      );
      this.line(42, -82, 49, -57, PAPER, 3);
    } else {
      this.sword(hero ? 1 : 0.82);
    }
    c.restore();
    if (attack > 0.34 && attack < 0.74 && !scene.reducedMotion) {
      c.save();
      c.globalAlpha *= Math.sin(((attack - 0.34) / 0.4) * Math.PI) * 0.85;
      c.beginPath();
      c.ellipse(37, -86, 80, 64, -0.25, -1.2, 1.1);
      c.strokeStyle = hero ? "#fff0bb" : "#dca580";
      c.lineWidth = 9;
      c.stroke();
      c.beginPath();
      c.ellipse(37, -86, 72, 57, -0.25, -1.2, 1.1);
      c.strokeStyle = GOLD;
      c.lineWidth = 2;
      c.stroke();
      c.restore();
    }
    c.restore();
  }

  private spriteCharacter(
    x: number,
    y: number,
    scale: number,
    kind: string,
    attack: number,
    hurt: number,
    death: number,
    scene: Scene,
    img: HTMLImageElement,
  ) {
    const c = this.ctx;
    const hero = kind === "hero";
    const column = hero
      ? attack > 0
        ? Math.min(3, Math.floor(attack * 4))
        : scene.walking && !scene.reducedMotion
          ? Math.floor(scene.time * 7) % 4
          : 0
      : ({ raider: 0, sentinel: 1, hexer: 2, warden: 3 }[kind] ?? 0);
    const row = hero ? (attack > 0 ? 1 : 0) : attack > 0.3 && attack < 0.8 ? 1 : 0;
    const cell = img.naturalWidth / 4;
    const cellHeight = img.naturalHeight / 2;
    const extent = (hero ? 204 : 300) * scale;
    const bottom = spriteBottom(hero ? "hero" : "enemies", row, column);
    const recoil = scene.reducedMotion ? 0 : Math.sin(hurt * Math.PI) * (hero ? -8 : 9);
    const lunge = 0;
    const breath = scene.reducedMotion ? 0 : Math.sin(scene.time * 2.7) * 1.5;
    c.save();
    this.ellipse(x, y + 4, 39 * scale, 8 * scale, "#263e3347");
    c.translate(x + recoil + lunge, y + breath);
    c.globalAlpha *= 1 - death;
    if (death) {
      c.translate(hero ? -death * 35 : death * 35, death * 12);
      c.rotate((hero ? -1 : 1) * death * 0.9);
    }
    // Sunfang's follow-through crosses the nominal cell boundary. Keep its tip
    // with that pose and exclude it from the next pose, without stretching either.
    const sunfang = hero && scene.blade === "sunfang" && row === 1;
    const inset = sunfang && column === 3 ? 0.065 : 0;
    const extra = sunfang && column === 2 ? 0.065 : 0;
    c.drawImage(
      img,
      (column + inset) * cell,
      row * cellHeight,
      cell * (1 - inset + extra),
      cellHeight,
      -extent / 2 + extent * inset,
      -extent * bottom + 4,
      extent * (1 - inset + extra),
      extent,
    );
    if (attack > 0.32 && attack < 0.65 && !scene.reducedMotion) {
      c.globalAlpha *= Math.sin(((attack - 0.32) / 0.33) * Math.PI) * 0.9;
      c.beginPath();
      c.ellipse(
        hero ? 65 : -55,
        -85 * scale,
        72 * scale,
        60 * scale,
        hero ? -0.3 : 0.3,
        hero ? -1.6 : 1.5,
        hero ? 1.2 : 4.5,
      );
      c.strokeStyle = hero ? "#ffe7a6" : "#dcb98b";
      c.lineWidth = 5;
      c.stroke();
    }
    c.restore();
  }

  private helmet(hero: boolean, boss: boolean, highlight: string, armor: string) {
    const c = this.ctx;
    this.shape(
      [
        [-32, -95],
        [-35, -125],
        [-26, -147],
        [-9, -157],
        [16, -153],
        [33, -136],
        [36, -101],
        [22, -88],
        [-16, -88],
      ],
      armor,
      INK,
      4,
    );
    this.shape(
      [
        [-31, -123],
        [-25, -143],
        [-8, -151],
        [2, -147],
        [0, -125],
      ],
      highlight,
      INK,
      2,
    );
    this.shape(
      [
        [-32, -120],
        [33, -120],
        [37, -98],
        [21, -87],
        [-20, -90],
      ],
      hero ? "#a6ad8d" : "#868773",
      INK,
      3,
    );
    this.shape(
      [
        [-26, -115],
        [31, -115],
        [28, -103],
        [-27, -105],
      ],
      "#253a32",
      INK,
      2,
    );
    this.line(-14, -110, -2, -110, hero ? "#ffdc88" : "#e5b657", 3);
    this.line(12, -110, 23, -110, hero ? "#ffdc88" : "#e5b657", 3);
    this.line(3, -148, 3, -121, "#d3c79e", 4);
    for (const yy of [-98, -93]) this.line(7, yy, 23, yy, INK, 2);
    this.ellipse(-27, -118, 3, 3, GOLD);
    this.ellipse(29, -118, 3, 3, GOLD);
    if (boss) {
      this.shape(
        [
          [-30, -136],
          [-47, -151],
          [-48, -171],
          [-35, -158],
          [-23, -148],
        ],
        "#b6ac83",
        INK,
        3,
      );
      this.shape(
        [
          [27, -139],
          [46, -157],
          [45, -177],
          [33, -163],
          [20, -151],
        ],
        "#b6ac83",
        INK,
        3,
      );
      this.shape(
        [
          [-12, -151],
          [-19, -175],
          [-5, -166],
          [3, -181],
          [11, -165],
          [26, -175],
          [18, -151],
        ],
        GOLD,
        INK,
        3,
      );
    } else if (hero) {
      this.shape(
        [
          [-8, -155],
          [-11, -171],
          [-26, -178],
          [-44, -170],
          [-40, -158],
          [-22, -165],
          [-14, -154],
        ],
        "#b9653e",
        INK,
        3,
      );
      this.line(-18, -169, -34, -166, "#e29a59", 2);
    }
    void c;
  }

  private shield(x: number, y: number, scale: number, color: string, hero: boolean) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(scale, scale);
    this.shape(
      [
        [-23, -24],
        [11, -28],
        [27, -16],
        [22, 16],
        [3, 34],
        [-20, 19],
      ],
      color,
      INK,
      4,
    );
    this.shape(
      [
        [-17, -18],
        [8, -22],
        [20, -12],
        [15, 13],
        [2, 26],
        [-14, 14],
      ],
      hero ? "#ce8c53" : "#8a8561",
      "#ddbd78",
      2,
    );
    this.line(-1, -15, 1, 18, hero ? "#f5d598" : "#c5b77f", 4);
    this.line(-10, -3, 10, -5, hero ? "#f5d598" : "#c5b77f", 4);
    c.restore();
  }

  private sword(scale: number) {
    const c = this.ctx;
    c.save();
    c.translate(11, 26);
    c.scale(scale, scale);
    this.shape(
      [
        [-4, 13],
        [-5, -50],
        [4, -75],
        [12, -50],
        [10, 13],
      ],
      "#c7d0b5",
      INK,
      3,
    );
    this.shape(
      [
        [4, -71],
        [4, 10],
        [9, 10],
        [10, -47],
      ],
      "#e6e6c7",
      INK,
      0,
    );
    this.line(3, -55, 3, 3, "#82988b", 1.5);
    this.shape(
      [
        [-16, 12],
        [19, 11],
        [20, 19],
        [-16, 21],
      ],
      GOLD,
      INK,
      3,
    );
    this.line(2, 22, 2, 39, "#694b32", 6);
    this.ellipse(2, 43, 6, 6, GOLD, INK, 2);
    c.restore();
  }

  private swing(t: number) {
    if (t < 0.32) return -0.25 - Math.sin(((t / 0.32) * Math.PI) / 2) * 1.8;
    if (t < 0.58) return -2.05 + (1 - (1 - (t - 0.32) / 0.26) ** 3) * 3.7;
    return 1.65 - ((t - 0.58) / 0.42) * 1.9;
  }

  private backdrop(chapter: number) {
    let image = this.backdrops.get(chapter);
    if (!image) {
      image = new Image();
      image.src = this.roadAtlasUrl;
      this.backdrops.set(chapter, image);
    }
    return image;
  }

  private equipment(s: Scene, x: number, ground: number, scale: number) {
    const c = this.ctx;
    const gear = s.upgrades;
    c.save();
    c.translate(x, ground);
    if ((gear?.blade ?? 0) > 0) {
      c.strokeStyle = "#edb25b";
      c.lineWidth = 1.5 + Math.min(3, gear?.blade ?? 0);
      c.globalAlpha = 0.65;
      c.beginPath();
      c.ellipse(0, 0, 38 * scale, 8 * scale, 0, 0, Math.PI * 2);
      c.stroke();
    }
    if ((gear?.mail ?? 0) > 0) {
      c.globalAlpha = 0.38;
      c.strokeStyle = "#a8cfdd";
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(9 * scale, -78 * scale, 48 * scale, 83 * scale, -0.1, -0.9, 1.1);
      c.stroke();
    }
    if ((gear?.charm ?? 0) > 0) {
      const phase = s.reducedMotion ? 0 : s.time * 1.6;
      this.ellipse(
        Math.cos(phase) * 47 * scale,
        -115 * scale + Math.sin(phase) * 8,
        4,
        4,
        "#ffd58b",
      );
    }
    if ((s.thorns ?? 0) > 0) {
      c.strokeStyle = "#a9bc79";
      c.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI;
        this.line(
          Math.cos(a) * 36 * scale,
          Math.sin(a) * 6,
          Math.cos(a) * 44 * scale,
          Math.sin(a) * 12,
          "#a9bc79",
          2,
        );
      }
    }
    c.restore();
    if (this.lightningAge < 0.35 && !s.reducedMotion) {
      c.save();
      c.globalAlpha = 1 - this.lightningAge / 0.35;
      c.strokeStyle = "#d6f0ff";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(480, ground - 280 * scale);
      c.lineTo(462, ground - 200 * scale);
      c.lineTo(488, ground - 204 * scale);
      c.lineTo(473, ground - 108 * scale);
      c.stroke();
      c.strokeStyle = "#7ac5df88";
      c.lineWidth = 12;
      c.stroke();
      c.restore();
    }
  }

  private weather(s: Scene) {
    if (s.chapter === 1) return;
    const c = this.ctx;
    const h = this.height;
    c.save();
    for (let i = 0; i < (s.chapter === 4 ? 30 : 13); i++) {
      const x = ((i * 137 + s.time * (s.chapter === 4 ? 15 : 5)) % 1100) - 50;
      const y = (i * 71 + s.time * (s.chapter === 4 ? 20 : s.chapter === 5 ? -12 : 2) + h * 10) % h;
      c.globalAlpha = s.chapter === 4 ? 0.55 : 0.25 + Math.sin(i + s.time) * 0.15;
      this.ellipse(
        x,
        y,
        s.chapter === 4 ? 2 : 2.8,
        s.chapter === 4 ? 2 : 1.8,
        s.chapter === 3 ? "#b7d38b" : s.chapter === 5 ? "#ffb168" : "#d8e7f5",
      );
    }
    c.restore();
  }

  private healthBar(x: number, y: number, width: number, health: number, max: number) {
    const c = this.ctx;
    c.fillStyle = "#28392dd9";
    c.fillRect(x - width / 2 - 2, y - 2, width + 4, 10);
    c.fillStyle = RUST;
    c.fillRect(x - width / 2, y, width * Math.max(0, health / Math.max(1, max)), 6);
  }

  private particles(s: Scene) {
    const c = this.ctx;
    const moon = s.direction === "moon";
    c.save();
    for (let i = 0; i < 15; i++) {
      const x = ((i * 127 + s.time * (moon ? 5 : 11)) % 1100) - 50;
      const y = this.height * 0.2 + ((i * 67) % (this.height * 0.6)) + Math.sin(s.time + i) * 8;
      c.globalAlpha = 0.2 + (Math.sin(s.time * 1.3 + i) + 1) * 0.15;
      this.ellipse(
        x,
        y,
        i % 3 === 0 ? 2.5 : 1.3,
        i % 3 === 0 ? 2.5 : 1.3,
        moon ? "#e0d7a0" : "#faf0bf",
      );
    }
    c.restore();
  }

  private foreground(s: Scene) {
    const h = this.height;
    const c = this.ctx;
    if (s.direction === "tabletop") return;
    const color = s.direction === "moon" ? "#142d32" : "#304f3c";
    const scroll = s.distance * 82;
    for (const [base, scale] of [
      [30, 1.3],
      [980, 1.1],
      [810, 0.8],
    ]) {
      const x = (((((base ?? 0) - scroll) % 1350) + 1350) % 1350) - 80;
      this.grass(x, h + 2, scale ?? 1, color);
      this.grass(x + 36, h, (scale ?? 1) * 0.8, color);
    }
    c.save();
    c.globalAlpha = 0.25;
    this.shape(
      [
        [0, h],
        [0, h - 72],
        [42, h - 43],
        [67, h - 14],
        [130, h],
      ],
      color,
      INK,
      0,
    );
    this.shape(
      [
        [1000, h],
        [1000, h - 80],
        [953, h - 49],
        [921, h - 20],
        [870, h],
      ],
      color,
      INK,
      0,
    );
    c.restore();
  }
}
