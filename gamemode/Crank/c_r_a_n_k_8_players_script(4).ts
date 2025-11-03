// Cranked game mode with randomized weapon loadouts on each spawn
import { ParseUI } from "modlib";

// --- Cranked state management ---
const CRANKED_BASE_TIME = 15;
const CRANKED_TIME_INCREASE = 7;
const CRANKED_MIN_TIME = 10;
const RESPAWN_DELAY = 2;

// --- Weapon randomization setup ---
const SIGHTS: mod.WeaponAttachments[] = [
    mod.WeaponAttachments.Scope_Mini_Flex_100x,
    mod.WeaponAttachments.Scope_RO_S_125x,
    mod.WeaponAttachments.Scope_GRIM_150x,
    mod.WeaponAttachments.Scope_CCO_200x,
    mod.WeaponAttachments.Scope_CQ_RDS_125x,
    mod.WeaponAttachments.Scope_Osa_7_100x,
    mod.WeaponAttachments.Scope_3VZR_175x,
    mod.WeaponAttachments.Scope_ROX_150x
];

const BARRELS: mod.WeaponAttachments[] = [
    mod.WeaponAttachments.Barrel_145_Factory,
    mod.WeaponAttachments.Barrel_16_Factory,
    mod.WeaponAttachments.Barrel_145_Carbine,
    mod.WeaponAttachments.Barrel_16_Short,
    
];

const UNDERBARRELS: mod.WeaponAttachments[] = [
    mod.WeaponAttachments.Bottom_Classic_Vertical,
    mod.WeaponAttachments.Bottom_Slim_Angled,
    mod.WeaponAttachments.Bottom_Factory_Angled,
    mod.WeaponAttachments.Bottom_Folding_Vertical,
    mod.WeaponAttachments.Bottom_Canted_Stubby,
    mod.WeaponAttachments.Bottom_Full_Angled,
    mod.WeaponAttachments.Bottom_Low_Profile_Stubby
];

const MUZZLES: mod.WeaponAttachments[] = [
    mod.WeaponAttachments.Muzzle_Standard_Suppressor,
    mod.WeaponAttachments.Muzzle_Flash_Hider,
    mod.WeaponAttachments.Muzzle_Compensated_Brake,
    mod.WeaponAttachments.Muzzle_CQB_Suppressor,
    mod.WeaponAttachments.Muzzle_Double_port_Brake,
    mod.WeaponAttachments.Muzzle_Long_Suppressor,
    mod.WeaponAttachments.Muzzle_Triple_port_Brake
];

const AMMO: mod.WeaponAttachments[] = [
   mod.WeaponAttachments.Ammo_FMJ,
   mod.WeaponAttachments.Ammo_Frangible,
   mod.WeaponAttachments.Ammo_Polymer_Case,
   mod.WeaponAttachments.Ammo_Tungsten_Core,

];

const TOP: mod.WeaponAttachments[] = [
   mod.WeaponAttachments.Top_120_mW_Blue,
   mod.WeaponAttachments.Top_50_mW_Blue,
   mod.WeaponAttachments.Top_50_mW_Green,
   mod.WeaponAttachments.Top_5_mW_Green,
   mod.WeaponAttachments.Top_5_mW_Red,

];





const ERGO: mod.WeaponAttachments[] = [
   mod.WeaponAttachments.Ergonomic_Improved_Mag_Catch,
   mod.WeaponAttachments.Ergonomic_Magwell_Flare,
   mod.WeaponAttachments.Ergonomic_Match_Trigger


]


let activeWeaponList: mod.Weapons[] = [
    mod.Weapons.SMG_KV9, mod.Weapons.AssaultRifle_TR_7, mod.Weapons.Carbine_AK_205,
    mod.Weapons.SMG_SL9, mod.Weapons.SMG_USG_90, mod.Weapons.SMG_PW7A2,
    mod.Weapons.AssaultRifle_KORD_6P67, mod.Weapons.Carbine_M4A1, mod.Weapons.Carbine_M417_A2,
    mod.Weapons.SMG_SGX, mod.Weapons.LMG_M_60, mod.Weapons.Carbine_GRT_BC,
    mod.Weapons.AssaultRifle_B36A4, mod.Weapons.Carbine_SG_553R, mod.Weapons.AssaultRifle_M433
];

let secondaryWeaponList: mod.Weapons[] = [
    mod.Weapons.Sidearm_ES_57, mod.Weapons.Sidearm_M44, mod.Weapons.Sidearm_M45A1,
    mod.Weapons.Sidearm_P18
];


const playerWeaponPackages: Record<number, mod.WeaponPackage[]> = {};

// Generates a random primary weapon package and equips it
function generateRandomWeaponPackages(player: mod.Player): void {
    if (!mod.IsPlayerValid(player)) return;
    const pid = mod.GetObjId(player);
    const packages: mod.WeaponPackage[] = [];
    playerWeaponPackages[pid] = [];

    for (let i = 0; i < activeWeaponList.length; i++) {
        const pkg = mod.CreateNewWeaponPackage();
        const chance = mod.RandomReal(0, 1);

        if (chance > 0.1) mod.AddAttachmentToWeaponPackage(SIGHTS[mod.RoundToInteger(mod.RandomReal(0, SIGHTS.length - 1))], pkg);
        if (chance > 0.2) mod.AddAttachmentToWeaponPackage(BARRELS[mod.RoundToInteger(mod.RandomReal(0, BARRELS.length - 1))], pkg);
        if (chance > 0.3) mod.AddAttachmentToWeaponPackage(UNDERBARRELS[mod.RoundToInteger(mod.RandomReal(0, UNDERBARRELS.length - 1))], pkg);
        if (chance > 0.4) mod.AddAttachmentToWeaponPackage(MUZZLES[mod.RoundToInteger(mod.RandomReal(0, MUZZLES.length - 1))], pkg);
        if (chance > 0.5) mod.AddAttachmentToWeaponPackage(AMMO[mod.RoundToInteger(mod.RandomReal(0, AMMO.length - 1))], pkg);
        if (chance > 0.5) mod.AddAttachmentToWeaponPackage(TOP[mod.RoundToInteger(mod.RandomReal(0, TOP.length - 1))], pkg);
        


        packages.push(pkg);
    }

    playerWeaponPackages[pid] = packages;

    if (packages.length > 0) {
        const index = mod.RoundToInteger(mod.RandomReal(0, activeWeaponList.length - 1));
        const index_secondary = mod.RoundToInteger(mod.RandomReal(0, secondaryWeaponList.length - 1));
        const chosenWeapon = activeWeaponList[index];
        const chosenSecondary = secondaryWeaponList[index_secondary];
        const secPkg = packages[index_secondary];
        const chosenPkg = packages[index];
        mod.AddEquipment(player, chosenWeapon, chosenPkg, mod.InventorySlots.PrimaryWeapon);
        mod.AddEquipment(player, chosenSecondary, secPkg, mod.InventorySlots.SecondaryWeapon);
    }


    
}

// Clears all player equipment
function clearPlayerLoadout(player: mod.Player): void {
    if (!mod.IsPlayerValid(player)) return;
    mod.RemoveEquipment(player, mod.InventorySlots.PrimaryWeapon);
    mod.RemoveEquipment(player, mod.InventorySlots.SecondaryWeapon);
    mod.RemoveEquipment(player, mod.InventorySlots.GadgetOne);
    mod.RemoveEquipment(player, mod.InventorySlots.GadgetTwo);
    mod.RemoveEquipment(player, mod.InventorySlots.ClassGadget);
    mod.RemoveEquipment(player, mod.InventorySlots.Throwable);
    mod.SetPlayerMaxHealth(player, 100);
    mod.SetPlayerMovementSpeedMultiplier(player, 1.0);
}



export function EventRingOfFire() {
   

    const ring: mod.RingOfFire = mod.GetRingOfFire(1337);
    if (ring) {
        mod.RingOfFireStart(ring);
        
        
        
    } else {
        console.log("RingOfFire with id 1337 not found");
    }
}




// Creates a per-player cranked countdown UI
class SimpleCounterUI {
    player: mod.Player;
    rootWidget: mod.UIWidget | undefined;
    counterText: mod.UIWidget | undefined;
    width: number = 300;
    height: number = 60;
    padding = 4;
    isUIVisible = false;

    constructor(player: mod.Player) {
        this.player = player;
    }

    show() {
        if (!this.rootWidget) this.create();
        if (!this.rootWidget) return;
        mod.SetUIWidgetVisible(this.rootWidget, true);
        this.isUIVisible = true;
    }

    hide() {
        if (this.rootWidget) {
            mod.SetUIWidgetVisible(this.rootWidget, false);
            this.isUIVisible = false;
        }
    }

    create() {
        this.rootWidget = ParseUI({
            type: "Container",
            size: [this.width, this.height],
            position: [0, 100],
            anchor: mod.UIAnchor.TopLeft,
            bgFill: mod.UIBgFill.Blur,
            bgColor: [0.05, 0.05, 0.1],
            bgAlpha: 0.25,
            cornerRadius: 8,
            borderColor: [1, 0.5, 0],
            playerId: this.player,
            children: [{
                type: "Container",
                position: [0, 0],
                size: [this.width - this.padding, this.height - this.padding],
                anchor: mod.UIAnchor.Center,
                bgFill: mod.UIBgFill.Blur,
                cornerRadius: 8,
                borderColor: [1, 0.5, 0],
                bgColor: [0.05, 0.05, 0.1],
                bgAlpha: 0.6
            }]
        });

        this.counterText = ParseUI({
            type: "Text",
            parent: this.rootWidget,
            textSize: 28,
            position: [0, 0, 0],
            size: [this.width, 58],
            textColor: [1,1,1],
            anchor: mod.UIAnchor.TopLeft,
            textAnchor: mod.UIAnchor.Center,
            bgColor: [0.05, 0.05, 0.1],
            bgAlpha: 0.5,
            textLabel: mod.Message("Time Left: {0}s   Streak: {1}", 0, 0),
        });
    }

    update(timeLeft: number, streak: number) {
        if (!this.counterText) return;
        mod.SetUITextLabel(this.counterText, mod.Message("Time Left: {0}s   Streak: {1}", timeLeft, streak));
        }
    }


// VFX helpers
export function PlaySparkEffect(player: mod.Player, enabled: boolean) {
    if (!mod.IsPlayerValid(player)) return;
    const pos = mod.GetObjectPosition(player);
    const zero = mod.CreateVector(0, 0, 0);
    const vfx = mod.SpawnObject(mod.RuntimeSpawn_Common.FX_Rocket_ArmorPiercing_Hit_Metal, pos, zero);
    mod.EnableVFX(vfx, enabled);
}

export function PlayExplodeEffect(player: mod.Player, enabled: boolean) {
    if (!mod.IsPlayerValid(player)) return;
    const pos = mod.GetObjectPosition(player);
    const zero = mod.CreateVector(0, 0, 0);
    const vfx = mod.SpawnObject(mod.RuntimeSpawn_Common.FX_Bomb_Mk82_AIR_Detonation, pos, zero);
    mod.EnableVFX(vfx, enabled);
}

export function PlayWinEffect(player: mod.Player, enabled: boolean) {
    if (!mod.IsPlayerValid(player)) return;
    const pos = mod.GetObjectPosition(player);
    const zero = mod.CreateVector(0, 0, 0);
    const vfx = mod.SpawnObject(mod.RuntimeSpawn_Common.FX_Grenade_Smoke_Detonation, pos, zero);
    mod.EnableVFX(vfx, enabled);
}

let smokeVFX: mod.VFX;
export function SpawnSmokeColumn() {
    const pos = mod.CreateVector(61.628, 70.255, -28.681);
    const rot = mod.CreateVector(0, 0, 0);
    smokeVFX = mod.SpawnObject(mod.RuntimeSpawn_Common.FX_Vehicle_Wreck_PTV, pos, rot);
    mod.EnableVFX(smokeVFX, true);
}

// --- Player state tracking ---
interface PlayerCrankedState {
    isCranked: boolean;
    killStreak: number;
    timeRemaining: number;
    timerActive: boolean;
    timerToken: number;
    ui?: SimpleCounterUI;
}

const playerStates = new Map<number, PlayerCrankedState>();

function initializePlayerState(playerId: number) {
    playerStates.set(playerId, {
        isCranked: false,
        killStreak: 0,
        timeRemaining: 0,
        timerActive: false,
        timerToken: 0,
    });
}

function getPlayerState(playerId: number): PlayerCrankedState {
    let state = playerStates.get(playerId);
    if (!state) {
        initializePlayerState(playerId);
        state = playerStates.get(playerId)!;
    }
    return state;
}

function calculateCrankedTime(killStreak: number): number {
    const time = CRANKED_MIN_TIME + (killStreak * CRANKED_TIME_INCREASE);
    return Math.max(time, CRANKED_MIN_TIME);
}

// --- Cranked timer logic ---
async function startCrankedTimer(player: mod.Player) {
    if (!mod.IsPlayerValid(player)) return;
    const playerId = mod.GetObjId(player);
    const state = getPlayerState(playerId);

    if (!state.ui) state.ui = new SimpleCounterUI(player);
    state.timerToken++;
    const myToken = state.timerToken;
    state.timerActive = true;

    if (!state.timeRemaining || state.timeRemaining <= 0) {
        state.timeRemaining = CRANKED_BASE_TIME;
    }

    state.ui.show();

    while (true) {
        if (state.timerToken !== myToken || !mod.IsPlayerValid(player) || !mod.GetSoldierState(player, mod.SoldierStateBool.IsAlive)) {
            state.timerActive = false;
            state.ui.hide();
            return;
        }

        const displayTime = Math.max(Math.ceil(state.timeRemaining), 0);
        state.ui.update(displayTime, state.killStreak);

        if (state.timeRemaining <= 0) {
            PlayExplodeEffect(player, true);
            mod.Kill(player);
            try {
                mod.DisplayHighlightedWorldLogMessage(mod.Message("YOU EXPLODED! Final Streak: {0}", state.killStreak), player);
            } catch {}
            state.ui.hide();
            state.isCranked = false;
            state.killStreak = 0;
            state.timerActive = false;
            return;
        }

        await mod.Wait(1);
        state.timeRemaining -= 1;
    }
}

function resetCrankedStateById(playerId: number) {
    const s = getPlayerState(playerId);
    s.isCranked = false;
    s.killStreak = 0;
    s.timerActive = false;
    s.timeRemaining = 0;
    s.timerToken++;
    if (s.ui) s.ui.hide();
}

// --- Game mode events ---
export function OnGameModeStarted() {
    mod.SetSpawnMode(mod.SpawnModes.AutoSpawn);
    playerStates.clear();
    mod.SetScoreboardType(mod.ScoreboardType.CustomFFA);
    mod.SetScoreboardHeader(mod.Message("CRANKED"));
    mod.SetScoreboardColumnNames(mod.Message("Kills"), mod.Message("Streak"));
    mod.SetScoreboardColumnWidths(1, 2);
    mod.SetScoreboardSorting(1, false);
    SpawnSmokeColumn();
    EventRingOfFire();
    mod.DisplayHighlightedWorldLogMessage(mod.Message("Get a 15 kill-streak to win!"));
}

export function OnPlayerJoinGame(player: mod.Player) {
    if (!mod.IsPlayerValid(player)) return;
    const id = mod.GetObjId(player);
    initializePlayerState(id);
    mod.SetRedeployTime(player, RESPAWN_DELAY);
    mod.SkipManDown(player, true);
    updateScoreboard(player);
}

export function OnPlayerLeaveGame(player: mod.Player) {
    if (!mod.IsPlayerValid(player)) return;
    const id = mod.GetObjId(player);
    resetCrankedStateById(id);
    playerStates.delete(id);
}

export async function OnPlayerDeployed(player: mod.Player) {
    if (!mod.IsPlayerValid(player)) return;
    const id = mod.GetObjId(player);
    resetCrankedStateById(id);
    clearPlayerLoadout(player);
    generateRandomWeaponPackages(player);
    updateScoreboard(player);
}

export async function OnPlayerDied(victim: mod.Player) {
    if (!mod.IsPlayerValid(victim)) return;
    const victimId = mod.GetObjId(victim);
    resetCrankedStateById(victimId);
    updateScoreboard(victim);
}

// --- Kill handling & streak bonuses ---
export async function OnPlayerEarnedKill(killer: mod.Player, victim: mod.Player) {
    if (!mod.IsPlayerValid(victim)) return;
    const victimId = mod.GetObjId(victim);

    if (killer && mod.IsPlayerValid(killer) && mod.GetObjId(killer) !== victimId) {
        const killerId = mod.GetObjId(killer);
        const killerState = getPlayerState(killerId);

        killerState.killStreak++;
        killerState.isCranked = true;
        if (!killerState.ui) killerState.ui = new SimpleCounterUI(killer);

        if (!killerState.timerActive) {
            killerState.timerToken++;
            killerState.timeRemaining = calculateCrankedTime(killerState.killStreak);
            killerState.timerActive = true;
            startCrankedTimer(killer);
        } else {
            killerState.timeRemaining += CRANKED_TIME_INCREASE;
            killerState.timeRemaining = Math.max(killerState.timeRemaining, CRANKED_MIN_TIME);
            killerState.ui.update(Math.ceil(killerState.timeRemaining), killerState.killStreak);
        }

        updateScoreboard(killer);
        const streak = killerState.killStreak;
        const pos = mod.GetObjectPosition(killer);

        switch (streak) {
            case 1:
                mod.SetPlayerMaxHealth(killer, 115);
                mod.SetPlayerMovementSpeedMultiplier(killer, 1.1);
                mod.AddEquipment(killer, mod.Gadgets.Class_Adrenaline_Injector, mod.InventorySlots.ClassGadget);
                mod.EnableScreenEffect(killer, mod.ScreenEffects.Saturated, true);
                mod.DisplayHighlightedWorldLogMessage(mod.Message("STREAK 1: +15 Health, +10% Speed, Adrenaline Shot"), killer);
                PlaySparkEffect(killer, true);
                break;
            case 2:
                mod.SetPlayerMaxHealth(killer, 130);
                mod.SetPlayerMovementSpeedMultiplier(killer, 1.2);
                mod.AddEquipment(killer, mod.Gadgets.Throwable_Flash_Grenade, mod.InventorySlots.Throwable);
                mod.DisplayHighlightedWorldLogMessage(mod.Message("STREAK 2: +30 Health, +20% Speed, Flashbang"), killer);
                PlaySparkEffect(killer, true);
                break;
            case 3:
                mod.SetPlayerMaxHealth(killer, 150);
                mod.SetPlayerMovementSpeedMultiplier(killer, 1.3);
                mod.DisplayHighlightedWorldLogMessage(mod.Message("STREAK 3: +50 Health, +30% Speed, Deployable Cover"), killer);
                mod.AddEquipment(killer, mod.Gadgets.Deployable_Cover, mod.InventorySlots.GadgetTwo);
                PlaySparkEffect(killer, true);
                break;
            case 4:
                mod.SetPlayerMaxHealth(killer, 175);
                mod.SetPlayerMovementSpeedMultiplier(killer, 1.4);
                mod.DisplayHighlightedWorldLogMessage(mod.Message("STREAK 4: +75 Health, +40% Speed, Supply Pouch"), killer);
                mod.AddEquipment(killer, mod.Gadgets.Misc_Supply_Pouch, mod.InventorySlots.GadgetOne);
                PlaySparkEffect(killer, true);
                break;
            case 5:
                mod.SetPlayerMaxHealth(killer, 200);
                mod.SetPlayerMovementSpeedMultiplier(killer, 1.5);
                mod.DisplayHighlightedWorldLogMessage(mod.Message("STREAK 5: +100 Health, +50% Speed, Refill on next streaks"), killer);
                PlaySparkEffect(killer, true);
                break;
            case 15:
                PlayWinEffect(killer, true);
                handlePlayerVictory(killer);
                break;
            default:
                if (streak > 5) {
                    PlaySparkEffect(killer, true);
                    mod.Resupply(killer, mod.ResupplyTypes.AmmoBox);
                    mod.Resupply(killer, mod.ResupplyTypes.AmmoCrate);
                    mod.Resupply(killer, mod.ResupplyTypes.SupplyBag);
                    mod.Heal(killer, 50);
                    mod.SetInventoryAmmo(killer, mod.InventorySlots.Throwable, 2);
                    mod.SetInventoryAmmo(killer, mod.InventorySlots.ClassGadget, 1);
                    mod.SetInventoryAmmo(killer, mod.InventorySlots.GadgetTwo, 1);
                    mod.PlaySound(mod.RuntimeSpawn_Common.SFX_Gadgets_Defibrillator_Equipped_Fire_OneShot3D, 2.0, killer);
                    mod.PlaySound(mod.RuntimeSpawn_Common.SFX_Gadgets_Defibrillator_Equipped_Charged_OneShot3D, 2.0, killer);
                    mod.SpotTarget(killer, 999, mod.SpotStatus.SpotInMinimap);
                    mod.SpawnObject(mod.RuntimeSpawn_Common.SFX_Gadgets_C4_Activate_OneShot3D, pos, pos, pos);
                    mod.SpawnObject(mod.RuntimeSpawn_Common.SFX_Gadgets_Defibrillator_Equipped_Charged_OneShot3D, pos, pos, pos);
                    mod.DisplayHighlightedWorldLogMessage(mod.Message("MARKED! KILL STREAK: {0}", killerState.killStreak), killer);
                }
                break;
        }
        const totalKills = getPLayerKills(player);
        if (totalKills >= 50) {
        PlayWinEffect(player);    
        handlePlayerVictory(player);
        }

        updateScoreboard(victim);
    }
}

function handlePlayerVictory(player: mod.Player) {
    if (!mod.IsPlayerValid(player)) return;
    mod.DisplayNotificationMessage(mod.Message("{0} IS THE CRANKER!", player));
    mod.EndGameMode(player);
}

export function OnGameModeEnding() {
    playerStates.forEach((_, id) => resetCrankedStateById(id));
    playerStates.clear();
}

function updateScoreboard(player: mod.Player) {
    if (!mod.IsPlayerValid(player)) return;
    const playerId = mod.GetObjId(player);
    const state = getPlayerState(playerId);
    let kills = 0;
    try {
        kills = mod.GetPlayerKills(player);
    } catch {
        kills = 0;
    }
    const streak = state.killStreak;
    mod.SetScoreboardPlayerValues(player, kills, streak);
}
