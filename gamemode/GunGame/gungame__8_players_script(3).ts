// Gun Game script with randomized weapon set selection at game start
const KILLS_PER_WEAPON = 1;
const NUM_WEAPON_TIERS = 19;
const FINAL_TIER_INDEX = NUM_WEAPON_TIERS - 1;
const RESPAWN_DELAY = 3;
const KNIFE_SPEED_MULTIPLIER = 1.5;
const KNIFE_HEALTH_BONUS = 155;

const playerTiers: { [playerId: number]: number } = {};
const playerWeaponPackages: { [playerId: number]: mod.WeaponPackage[] } = {};
const playerLastTierOnSpawn: { [playerId: number]: number } = {};
const playerLastKills: { [playerId: number]: number } = {};
const playerLastKillTime: { [playerId: number]: number } = {};

let smokeVFX: mod.VFX;

export function SpawnSmokeColumn() {
    const pos = mod.CreateVector(61.628, 70.255, -28.681);
    const rot = mod.CreateVector(0, 0, 0);
    smokeVFX = mod.SpawnObject(mod.RuntimeSpawn_Common.FX_Vehicle_Wreck_PTV, pos, rot);
    mod.EnableVFX(smokeVFX, true);
}

let activeWeaponList: mod.Weapons[] = [];

// ---- Weapon Set Variants (each same length) ----
const WEAPON_SETS: mod.Weapons[][] = [
    [
        mod.Weapons.Sidearm_M45A1, mod.Weapons.Sidearm_P18, mod.Weapons.Sidearm_M44,
        mod.Weapons.Shotgun_M87A1, mod.Weapons.Shotgun__185KS_K, mod.Weapons.SMG_PW7A2,
        mod.Weapons.SMG_SL9, mod.Weapons.Carbine_M4A1, mod.Weapons.Carbine_M417_A2,
        mod.Weapons.AssaultRifle_SOR_556_Mk2, mod.Weapons.AssaultRifle_TR_7,
        mod.Weapons.LMG_M_60, mod.Weapons.LMG_KTS100_MK8, mod.Weapons.DMR_SVDM,
        mod.Weapons.DMR_M39_EMR, mod.Weapons.Sniper_SV_98, mod.Weapons.Sniper_PSR
    ],
    [
        mod.Weapons.Sidearm_M44, mod.Weapons.Shotgun_M87A1, mod.Weapons.Shotgun_M1014,
         mod.Weapons.AssaultRifle_NVO_228E,
        mod.Weapons.AssaultRifle_SOR_556_Mk2,
        mod.Weapons.AssaultRifle_TR_7, mod.Weapons.AssaultRifle_B36A4, mod.Weapons.LMG_L110,
        mod.Weapons.LMG_KTS100_MK8, mod.Weapons.LMG_M123K, 
        mod.Weapons.LMG_M240L,
        mod.Weapons.LMG_RPKM, mod.Weapons.LMG_M250, mod.Weapons.LMG_DRS_IAR,
        mod.Weapons.DMR_SVDM, mod.Weapons.Sniper_M2010_ESR, mod.Weapons.Sniper_PSR
    ],
    [
        mod.Weapons.SMG_SCW_10, mod.Weapons.SMG_SGX, mod.Weapons.SMG_UMG_40,
        mod.Weapons.SMG_PW7A2, mod.Weapons.SMG_SL9, mod.Weapons.SMG_KV9,
        mod.Weapons.Carbine_M4A1, mod.Weapons.Carbine_GRT_BC, mod.Weapons.Carbine_M277,
        mod.Weapons.Carbine_QBZ_192, mod.Weapons.Carbine_SG_553R,
        mod.Weapons.Carbine_M417_A2, mod.Weapons.Shotgun_M1014, mod.Weapons.Shotgun_M87A1,
        mod.Weapons.Shotgun__185KS_K, mod.Weapons.AssaultRifle_M433, mod.Weapons.AssaultRifle_KORD_6P67
    ],
[
    mod.Weapons.Sidearm_P18,              // Reliable backup pistol
    mod.Weapons.Sidearm_M45A1,            // Good Sidearm - .45 ACP
    mod.Weapons.Sidearm_M44,              // Best Sidearm - 25ms TTK
    mod.Weapons.AssaultRifle_SOR_556_Mk2, // Good AR - 16.7ms TTK
    mod.Weapons.AssaultRifle_TR_7,        // Best AR (available) - 20ms TTK
    mod.Weapons.Carbine_M4A1,             // Good Carbine - 14.3ms close range
    mod.Weapons.Carbine_M417_A2,          // Best Carbine - 16.7ms TTK
    mod.Weapons.SMG_SL9,                  // Solid SMG - 12.5ms close range
    mod.Weapons.SMG_PW7A2,                // Best SMG (available) - 12.5ms TTK
    mod.Weapons.LMG_KTS100_MK8,           // Decent LMG alternative
    mod.Weapons.LMG_M_60,                 // Best LMG - 20ms TTK
    mod.Weapons.DMR_M39_EMR,              // Solid DMR - 33.4ms TTK
    mod.Weapons.DMR_SVDM,                 // Best DMR (available) - 33.4ms TTK
    mod.Weapons.Sniper_SV_98,             // Good Sniper alternative
    mod.Weapons.Sniper_PSR,               // Best Sniper - 64ms consistent
    mod.Weapons.Shotgun_M87A1,            // Backup Shotgun option
    mod.Weapons.Shotgun__185KS_K          // Best Shotgun - 10ms TTK
]
];

// ---- Attachments ----
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

// ---- Initialization ----
export async function OnGameModeStarted() {
    const index = mod.RoundToInteger(mod.RandomReal(0, WEAPON_SETS.length - 1));
    activeWeaponList = WEAPON_SETS[index];
    switch (index){
    case 0: {
    mod.DisplayNotificationMessage(mod.Message("Classic Weapon Set Selected!"));
    break;
    }
    case 1: {
    mod.DisplayNotificationMessage(mod.Message("Heavy Weapon Set Selected!"));
    break;  

    }
    case 2: {
    mod.DisplayNotificationMessage(mod.Message("CQB Weapon Set Selected!"));
    break;
        
    }
    case 3: {
    mod.DisplayNotificationMessage(mod.Message("Meta Weapon Set Selected!"));
    break;
        
    }

    }
    mod.SetGameModeTargetScore(NUM_WEAPON_TIERS);
    mod.SetSpawnMode(mod.SpawnModes.AutoSpawn);
    mod.SetScoreboardType(mod.ScoreboardType.CustomFFA);
    mod.SetScoreboardHeader(mod.Message("GUN GAME"));
    mod.SetScoreboardColumnNames(mod.Message("Tier"), mod.Message("Kills"));
    mod.SetScoreboardColumnWidths(1, 2);
    mod.SetScoreboardSorting(1, false);
   SpawnSmokeColumn();
    
}

// ---- Player join / spawn ----
export async function OnPlayerJoinGame(player: mod.Player) {
    if (!mod.IsPlayerValid(player)) return;
    const pid = mod.GetObjId(player);

    playerTiers[pid] = 0;
    playerLastTierOnSpawn[pid] = 0;
    try { playerLastKills[pid] = mod.GetPlayerKills(player); } catch { playerLastKills[pid] = 0; }

    generateRandomWeaponPackages(player);
    mod.EnablePlayerDeploy(player, true);
    mod.SetRedeployTime(player, RESPAWN_DELAY);
    mod.SkipManDown(player, true);
    mod.DisplayHighlightedWorldLogMessage(mod.Message("Welcome to Gun Game! Get 1 kill per weapon to advance."), player);
    updateScoreboard(player);
}

export async function OnPlayerDeployed(player: mod.Player) {
    if (!mod.IsPlayerValid(player)) return;
    const pid = mod.GetObjId(player);
    const tier = getTier(player);
    playerLastTierOnSpawn[pid] = tier;
    try { playerLastKills[pid] = mod.GetPlayerKills(player); } catch {}

    clearPlayerLoadout(player);
    mod.SetPlayerMaxHealth(player, 100);
    mod.SetPlayerMovementSpeedMultiplier(player, 1.0);

    equipWeaponForTier(player, tier);
    updateScoreboard(player);

    if (tier === 17) {
       mod.ForceSwitchInventory(player, mod.InventorySlots.GadgetOne);}
}

// ---- Kill / death handling ----
export async function OnPlayerEarnedKill(killer: mod.Player, victim: mod.Player, deathType: mod.DeathType, weapon: mod.WeaponUnlock) {
    if (!mod.IsPlayerValid(killer) || !mod.IsPlayerValid(victim)) return;
    if (mod.Equals(killer, victim)) return;
    if (mod.GetSoldierState(victim, mod.SoldierStateBool.IsAlive)) return;

    const now = Date.now();
    const killerId = mod.GetObjId(killer);
    if (playerLastKillTime[killerId] && now - playerLastKillTime[killerId] < 300) return;
    playerLastKillTime[killerId] = now;

    const isKnife = mod.EventDeathTypeCompare(deathType, mod.PlayerDeathTypes.Melee);
    if (isKnife) handleKnifeKill(killer, victim);
    else handleNormalKill(killer);

    updateScoreboard(killer);
    updateScoreboard(victim);
}

export async function OnPlayerDied(victim: mod.Player, killer: mod.Player, deathType: mod.DeathType, weapon: mod.WeaponUnlock) {
    if (!mod.IsPlayerValid(victim)) return;
    const pid = mod.GetObjId(victim);
    const currentTier = getTier(victim) || 0;
    const spawnTier = playerLastTierOnSpawn[pid] || 0;
    if (currentTier > spawnTier) setTier(victim, spawnTier);
    updateScoreboard(victim);
}

// ---- Kill handlers ----
function handleNormalKill(player: mod.Player): void {
    if (!mod.IsPlayerValid(player)) return;
    const pid = mod.GetObjId(player);
    const tier = getTier(player);
    if (tier === FINAL_TIER_INDEX) { handlePlayerVictory(player); return; }

    const newTier = Math.min(tier + 1, FINAL_TIER_INDEX);
    setTier(player, newTier);
    mod.SetPlayerMaxHealth(player, 100);
    playerLastTierOnSpawn[pid] = newTier;
    mod.DisplayHighlightedWorldLogMessage(mod.Message("LEVEL UP! Tier {0}", newTier + 1), player);
    equipWeaponForTier(player, newTier);

    if (newTier === FINAL_TIER_INDEX - 1) mod.DisplayNotificationMessage(mod.Message("{0} reached FINAL TIER!"));
}

function handleKnifeKill(killer: mod.Player, victim: mod.Player): void {
    handleNormalKill(killer);
    if (!mod.IsPlayerValid(victim)) return;
    const victimId = mod.GetObjId(victim);
    const victimTier = getTier(victim);
    if (victimTier > 0) {
        const newTier = Math.max(0, victimTier - 1);
        setTier(victim, newTier);
        playerLastTierOnSpawn[victimId] = newTier;
        mod.DisplayHighlightedWorldLogMessage(mod.Message("HUMILIATED! Demoted to tier {0}", newTier + 1), victim);
        if (mod.GetSoldierState(victim, mod.SoldierStateBool.IsAlive)) equipWeaponForTier(victim, newTier);
    }
}

function handlePlayerVictory(player: mod.Player): void {
    if (!mod.IsPlayerValid(player)) return;
    mod.DisplayNotificationMessage(mod.Message("{0} has won Gun Game!", player));
    mod.EndGameMode(player);
}

// ---- Weapon / loadout ----
function equipWeaponForTier(player: mod.Player, tier: number): void {
    if (!mod.IsPlayerValid(player)) return;
    try {
        mod.RemoveEquipment(player, mod.InventorySlots.PrimaryWeapon);
        mod.RemoveEquipment(player, mod.InventorySlots.SecondaryWeapon);
        mod.RemoveEquipment(player, mod.InventorySlots.GadgetOne);
        mod.RemoveEquipment(player, mod.InventorySlots.GadgetTwo);
        mod.RemoveEquipment(player, mod.InventorySlots.ClassGadget);
        mod.RemoveEquipment(player, mod.InventorySlots.Throwable);
        mod.RemoveEquipment(player, mod.InventorySlots.MeleeWeapon);
        mod.AddEquipment(player, mod.Gadgets.Melee_Combat_Knife, mod.InventorySlots.MeleeWeapon);
    } catch {}

    if (tier >= 0 && tier < activeWeaponList.length) {
        const weapon = activeWeaponList[tier];
        const pkg = getPlayerWeaponPackage(player, tier);
        if (pkg) mod.AddEquipment(player, weapon, pkg, mod.InventorySlots.PrimaryWeapon);
        else mod.AddEquipment(player, weapon, mod.InventorySlots.PrimaryWeapon);
        mod.Resupply(player, mod.ResupplyTypes.AmmoCrate);
        mod.ForceSwitchInventory(player, mod.InventorySlots.PrimaryWeapon);
        return;
    }

    if (tier === 17) {
        mod.AddEquipment(player, mod.Gadgets.Launcher_Unguided_Rocket, mod.InventorySlots.GadgetOne);
        mod.Resupply(player, mod.ResupplyTypes.AmmoCrate);
        mod.SetInventoryMagazineAmmo(player, mod.InventorySlots.GadgetOne, 6);
        mod.ForceSwitchInventory(player, mod.InventorySlots.GadgetOne);
        mod.SpotTarget(player,999, mod.SpotStatus.SpotInMinimap);
        mod.DisplayHighlightedWorldLogMessage(mod.Message("3D MARKED! RPG TIME!"), player);
        return;
    }

    if (tier === FINAL_TIER_INDEX) {
        mod.AddEquipment(player, mod.Gadgets.Throwable_Throwing_Knife, mod.InventorySlots.Throwable);
        mod.Resupply(player, mod.ResupplyTypes.AmmoCrate);
        mod.SetInventoryMagazineAmmo(player, mod.InventorySlots.Throwable, 5);
        mod.SetPlayerMaxHealth(player, KNIFE_HEALTH_BONUS);
        mod.SetPlayerMovementSpeedMultiplier(player, KNIFE_SPEED_MULTIPLIER);
        mod.ForceSwitchInventory(player, mod.InventorySlots.MeleeWeapon);
        mod.SpotTarget(player,999, mod.SpotStatus.SpotInBoth);
        mod.DisplayNotificationMessage(mod.Message("{0} reached FINAL TIER!", player));
        mod.DisplayHighlightedWorldLogMessage(mod.Message("FINAL TIER: Knives! Get the final kill to WIN!"), player);
        return;
    }

    mod.AddEquipment(player, mod.Weapons.Sidearm_M45A1, mod.InventorySlots.PrimaryWeapon);
    mod.Resupply(player, mod.ResupplyTypes.AmmoCrate);
}

function clearPlayerLoadout(player: mod.Player): void {
    if (!mod.IsPlayerValid(player)) return;
    mod.RemoveEquipment(player, mod.InventorySlots.PrimaryWeapon);
    mod.RemoveEquipment(player, mod.InventorySlots.SecondaryWeapon);
    mod.RemoveEquipment(player, mod.InventorySlots.GadgetOne);
    mod.RemoveEquipment(player, mod.InventorySlots.GadgetTwo);
    mod.RemoveEquipment(player, mod.InventorySlots.ClassGadget);
    mod.RemoveEquipment(player, mod.InventorySlots.Throwable);
}

function generateRandomWeaponPackages(player: mod.Player): void {
    if (!mod.IsPlayerValid(player)) return;
    const pid = mod.GetObjId(player);
    const packages: mod.WeaponPackage[] = [];
    for (let i = 0; i < activeWeaponList.length; i++) {
        const pkg = mod.CreateNewWeaponPackage();
        const chance = mod.RandomReal(0, 1);
        if (chance > 0.2) mod.AddAttachmentToWeaponPackage(SIGHTS[mod.RoundToInteger(mod.RandomReal(0, SIGHTS.length - 1))], pkg);
        if (chance > 0.4) mod.AddAttachmentToWeaponPackage(BARRELS[mod.RoundToInteger(mod.RandomReal(0, BARRELS.length - 1))], pkg);
        if (chance > 0.5) mod.AddAttachmentToWeaponPackage(UNDERBARRELS[mod.RoundToInteger(mod.RandomReal(0, UNDERBARRELS.length - 1))], pkg);
        if (chance > 0.6) mod.AddAttachmentToWeaponPackage(MUZZLES[mod.RoundToInteger(mod.RandomReal(0, MUZZLES.length - 1))], pkg);
        if (chance > 0.6) mod.AddAttachmentToWeaponPackage(AMMO[mod.RoundToInteger(mod.RandomReal(0, AMMO.length - 1))], pkg);
        packages.push(pkg);
    }
    playerWeaponPackages[pid] = packages;
}

function getPlayerWeaponPackage(player: mod.Player, tier: number): mod.WeaponPackage | undefined {
    if (!mod.IsPlayerValid(player)) return undefined;
    const pkgs = playerWeaponPackages[mod.GetObjId(player)];
    return pkgs ? pkgs[tier] : undefined;
}

function getTier(player: mod.Player): number {
    if (!mod.IsPlayerValid(player)) return 0;
    return playerTiers[mod.GetObjId(player)] ?? 0;
}

function setTier(player: mod.Player, tier: number): void {
    if (!mod.IsPlayerValid(player)) return;
    const clamped = Math.max(0, Math.min(FINAL_TIER_INDEX, Math.floor(tier)));
    playerTiers[mod.GetObjId(player)] = clamped;
}

function updateScoreboard(player: mod.Player): void {
    if (!mod.IsPlayerValid(player)) return;
    const tier = getTier(player);
    mod.SetScoreboardPlayerValues(player, tier + 1, tier);
}


