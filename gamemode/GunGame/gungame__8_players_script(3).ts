// Gun Game script with weapon tier UI display
import { ParseUI } from "modlib";

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
let activeWeaponList: mod.Weapons[] = [];

// =====================================================
// WEAPON TIER UI CLASS
// =====================================================
class WeaponTierUI {
    player: mod.Player;
    rootWidget: mod.UIWidget | undefined;
    tierText: mod.UIWidget | undefined;
    weaponIconContainer: mod.UIWidget | undefined;
    weaponNameText: mod.UIWidget | undefined;
    killsText: mod.UIWidget | undefined;
    width: number = 380;
    height: number = 110;
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
            position: [10, 100],
            anchor: mod.UIAnchor.TopLeft,
            bgFill: mod.UIBgFill.Blur,
            bgColor: [0.05, 0.05, 0.1],
            bgAlpha: 0.3,
            cornerRadius: 12,
            borderColor: [1, 0.5, 0],
            borderThickness: 2,
            playerId: this.player,
            children: [{
                type: "Container",
                position: [0, 0],
                size: [this.width - this.padding * 2, this.height - this.padding * 2],
                anchor: mod.UIAnchor.Center,
                bgFill: mod.UIBgFill.Blur,
                cornerRadius: 10,
                borderColor: [1, 0.5, 0],
                bgColor: [0.05, 0.05, 0.1],
                bgAlpha: 0.7
            }]
        });

        // Create weapon icon container
        this.createWeaponIconContainer();

        // Tier text (top right)
        this.tierText = ParseUI({
            type: "Text",
            parent: this.rootWidget,
            textSize: 26,
            position: [125, -5],
            size: [this.width - 130, 35],
            textColor: [1, 0.9, 0.3],
            anchor: mod.UIAnchor.TopLeft,
            textAnchor: mod.UIAnchor.CenterLeft,
            bgAlpha: 0,
            textLabel: mod.Message("TIER: {0} / {1}", 1, 19),
        });

        // Weapon name text (middle right)
        this.weaponNameText = ParseUI({
            type: "Text",
            parent: this.rootWidget,
            textSize: 20,
            position: [125, 35],
            size: [this.width - 130, 28],
            textColor: [0.8, 0.9, 1],
            anchor: mod.UIAnchor.TopLeft,
            textAnchor: mod.UIAnchor.CenterLeft,
            bgAlpha: 0,
            textLabel: mod.Message("M4A1 Carbine"),
        });

        // Kills requirement text (bottom right)
        this.killsText = ParseUI({
            type: "Text",
            parent: this.rootWidget,
            textSize: 16,
            position: [125, 52],
            size: [this.width - 130, 25],
            textColor: [1, 0.5, 0],
            anchor: mod.UIAnchor.TopLeft,
            textAnchor: mod.UIAnchor.CenterLeft,
            bgAlpha: 0,
            textLabel: mod.Message("Get 1 kill to advance!"),
        });
    }

    /**
     * Creates a new weapon icon container and assigns it.
     */
    private createWeaponIconContainer() {
        this.weaponIconContainer = ParseUI({
            type: "Container",
            parent: this.rootWidget,
            position: [20, 0],
            size: [90, 90],
            anchor: mod.UIAnchor.CenterLeft,
            bgFill: mod.UIBgFill.Solid,
            bgColor: [0.1, 0.1, 0.15],
            bgAlpha: 0.8,
            cornerRadius: 8,
            borderColor: [1, 0.5, 0],
            borderThickness: 1
        });
    }

    update(
        tier: number,
        totalTiers: number,
        weapon: mod.Weapons | null,
        weaponPackage: mod.WeaponPackage | undefined,
        weaponName: string
    ) {
        if (!this.rootWidget || !this.tierText || !this.weaponNameText || !this.killsText) return;

        // Update tier text
        mod.SetUITextLabel(this.tierText, mod.Message("TIER: {0} / {1}", tier + 1, totalTiers));

        // Update weapon name
        mod.SetUITextLabel(this.weaponNameText, mod.Message("{0}", weaponName));

        // Update kills text based on tier
        if (tier === totalTiers - 1) {
            mod.SetUITextLabel(this.killsText, mod.Message("FINAL KILL TO WIN!"));
        } else {
            mod.SetUITextLabel(this.killsText, mod.Message("Get 1 kill to advance!"));
        }

        // --- Refresh the weapon icon container ---
        if (this.weaponIconContainer) {
            mod.DeleteUIWidget(this.weaponIconContainer);
        }
        this.createWeaponIconContainer();

        // --- Add new weapon icon ---
        if (weapon !== null) {
            const iconPos = mod.CreateVector(0, 0, 0);
            const iconSize = mod.CreateVector(80, 80, 0);
            if (!this.weaponIconContainer) return;

            if (weaponPackage) {
                mod.AddUIWeaponImage(
                    "weaponIcon",
                    iconPos,
                    iconSize,
                    mod.UIAnchor.Center,
                    weapon,
                    this.weaponIconContainer,
                    weaponPackage,
                    this.player
                );
            } else {
                mod.AddUIWeaponImage(
                    "weaponIcon",
                    iconPos,
                    iconSize,
                    mod.UIAnchor.Center,
                    weapon,
                    this.weaponIconContainer,
                    this.player
                );
            }
        }
    }

    destroy() {
        if (this.weaponIconContainer) {
            mod.DeleteUIWidget(this.weaponIconContainer);
        }
        if (this.rootWidget) {
            mod.DeleteUIWidget(this.rootWidget);
        }
    }
}

// Store UI instances per player
const playerUIs: { [playerId: number]: WeaponTierUI } = {};



// =====================================================
// WEAPON SETS
// =====================================================
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
        mod.Weapons.AssaultRifle_NVO_228E, mod.Weapons.AssaultRifle_SOR_556_Mk2,
        mod.Weapons.AssaultRifle_TR_7, mod.Weapons.AssaultRifle_B36A4, mod.Weapons.LMG_L110,
        mod.Weapons.LMG_KTS100_MK8, mod.Weapons.LMG_M123K, mod.Weapons.LMG_M240L,
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
        mod.Weapons.Sidearm_P18, mod.Weapons.Sidearm_M45A1, mod.Weapons.Sidearm_M44,
        mod.Weapons.AssaultRifle_SOR_556_Mk2, mod.Weapons.AssaultRifle_TR_7,
        mod.Weapons.Carbine_M4A1, mod.Weapons.Carbine_M417_A2, mod.Weapons.SMG_SL9,
        mod.Weapons.SMG_PW7A2, mod.Weapons.LMG_KTS100_MK8, mod.Weapons.LMG_M_60,
        mod.Weapons.DMR_M39_EMR, mod.Weapons.DMR_SVDM, mod.Weapons.Sniper_SV_98,
        mod.Weapons.Sniper_PSR, mod.Weapons.Shotgun_M87A1, mod.Weapons.Shotgun__185KS_K
    ]
];
// =====================================================
// WEAPON NAMES MAPPING
// =====================================================
// ===========================
// CREATE WEAPON_NAMES MAPPING (RELIABLE)
// ===========================
// WEAPON NAMES MAPPING // ===================================================== 


// Safe getWeaponName function
function getWeaponName(weapon: mod.Weapons | null): string {
    if (weapon === null) return "Special Weapon";
    
    // Direct switch statement instead of dictionary lookup
    switch (weapon) {
        // Sidearms
        case mod.Weapons.Sidearm_M45A1: return "M1911 Pistol";
        case mod.Weapons.Sidearm_P18: return "P18 Pistol";
        case mod.Weapons.Sidearm_M44: return ".44 Magnum Revolver";
        case mod.Weapons.Sidearm_ES_57: return "FN - Five Seven"
        
        // Shotguns
        case mod.Weapons.Shotgun_M87A1: return "M590A1 Shotgun";
        case mod.Weapons.Shotgun__185KS_K: return "Saiga-12";
        case mod.Weapons.Shotgun_M1014: return "Benelli M4 Shotgun";
        
        // SMGs
        case mod.Weapons.SMG_PW7A2: return "MP7 A2 SMG";
        case mod.Weapons.SMG_SL9: return "SL9 SMG";
        case mod.Weapons.SMG_SCW_10: return "APC-10 SMG";
        case mod.Weapons.SMG_SGX: return "MPX SMG";
        case mod.Weapons.SMG_UMG_40: return "UMP-45 SMG";
        case mod.Weapons.SMG_KV9: return "Kriss Vector SMG";
        case mod.Weapons.SMG_PW5A3: return "MP5A1";
        
        // Carbines
        case mod.Weapons.Carbine_M4A1: return "M4A1 Carbine";
        case mod.Weapons.Carbine_M417_A2: return "HK417 Carbine";
        case mod.Weapons.Carbine_GRT_BC: return "Grot B10 Carbine";
        case mod.Weapons.Carbine_M277: return "MCX Spear Carbine";
        case mod.Weapons.Carbine_QBZ_192: return "QBZ-192 Carbine";
        case mod.Weapons.Carbine_SG_553R: return "SG-553R Carbine";
        
        // Assault Rifles
        case mod.Weapons.AssaultRifle_SOR_556_Mk2: return "Scar-H Mk2 Assault Rifle";
        case mod.Weapons.AssaultRifle_TR_7: return "Tar-21 Assault Rifle";
        case mod.Weapons.AssaultRifle_NVO_228E: return "ACE-32 Assault Rifle";
        case mod.Weapons.AssaultRifle_B36A4: return "G36 Assault Rifle";
        case mod.Weapons.AssaultRifle_M433: return "HK 433 Assault Rifle";
        case mod.Weapons.AssaultRifle_KORD_6P67: return "AEK-971 Assault Rifle";
        
        // LMGs
        case mod.Weapons.LMG_M_60: return "M-60 LMG";
        case mod.Weapons.LMG_KTS100_MK8: return "Ultimax 100 Mk. 8";
        case mod.Weapons.LMG_L110: return "L108A1 LMG";
        case mod.Weapons.LMG_M123K: return "MG4k LMG";
        case mod.Weapons.LMG_M240L: return "M240L LMG";
        case mod.Weapons.LMG_RPKM: return "RPK LMG";
        case mod.Weapons.LMG_M250: return "M250 LMG";
        case mod.Weapons.LMG_DRS_IAR: return "M-27 IAR LMG";
        
        // DMRs
        case mod.Weapons.DMR_SVDM: return "SVDM DMR";
        case mod.Weapons.DMR_M39_EMR: return "M39-EMR DMR";
        case mod.Weapons.DMR_SVK_86: return "SVK DMR"
        
        // Snipers
        case mod.Weapons.Sniper_SV_98: return "SV-98 Sniper";
        case mod.Weapons.Sniper_PSR: return "PSR Sniper";
        case mod.Weapons.Sniper_M2010_ESR: return "M2010-ESR Sniper";
        
        default:
            console.log(`[WARNING] Unknown weapon: ${weapon}`);
            return "Unknown Weapon";
    }
}
// =====================================================
// ATTACHMENTS
// =====================================================
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

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getTier(player: mod.Player): number {
    if (!mod.IsPlayerValid(player)) return 0;
    return playerTiers[mod.GetObjId(player)] ?? 0;
}

function setTier(player: mod.Player, tier: number): void {
    if (!mod.IsPlayerValid(player)) return;
    const clamped = Math.max(0, Math.min(FINAL_TIER_INDEX, Math.floor(tier)));
    playerTiers[mod.GetObjId(player)] = clamped;
}

function getPlayerWeaponPackage(player: mod.Player, tier: number): mod.WeaponPackage | undefined {
    if (!mod.IsPlayerValid(player)) return undefined;
    const pkgs = playerWeaponPackages[mod.GetObjId(player)];
    return pkgs ? pkgs[tier] : undefined;
}

function updatePlayerUI(player: mod.Player, tier: number): void {
    if (!mod.IsPlayerValid(player)) return;
    const pid = mod.GetObjId(player);
    let ui = playerUIs[pid];
    
    // Create UI if it doesn't exist
    if (!ui) {
        ui = new WeaponTierUI(player);
        playerUIs[pid] = ui;
        ui.show();
    }
    if (tier < 0) tier = 0;
    if (tier >= NUM_WEAPON_TIERS) tier = NUM_WEAPON_TIERS - 1;
    // Get weapon info for current tier
    let weapon: mod.Weapons | null = null;
    let weaponPackage: mod.WeaponPackage | undefined = undefined;
    let weaponName = "";
    

if (tier === 17) {
    weapon = null;
    weaponName = "RPG LAUNCHER";
} else if (tier === FINAL_TIER_INDEX) {  // tier 18
    weapon = null;
    weaponName = "COMBAT KNIFE";
     console.log("[DEBUG] Fallback: Unknown Weapon");
} else if (tier >= 0 && tier < activeWeaponList.length) {
    weapon = activeWeaponList[tier];
    weaponPackage = getPlayerWeaponPackage(player, tier);
    weaponName = getWeaponName(weapon);
    console.log(`[DEBUG] Tier ${tier} - Setting weapon: ${weaponName}`);
    console.log(`[DEBUG] Tier ${tier} - Weapon enum value: ${weapon}`);


} else {
    // Fallback for any unexpected tier values
    weaponName = "Unknown Weapon";
}

    ui.update(tier, NUM_WEAPON_TIERS, weapon, weaponPackage, weaponName);
}

function updateScoreboard(player: mod.Player): void {
    if (!mod.IsPlayerValid(player)) return;
    const tier = getTier(player);
    mod.SetScoreboardPlayerValues(player, tier + 1, tier);
}

// =====================================================
// WEAPON GENERATION
// =====================================================
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

// =====================================================
// LOADOUT MANAGEMENT
// =====================================================
function clearPlayerLoadout(player: mod.Player): void {
    if (!mod.IsPlayerValid(player)) return;
    mod.RemoveEquipment(player, mod.InventorySlots.PrimaryWeapon);
    mod.RemoveEquipment(player, mod.InventorySlots.SecondaryWeapon);
    mod.RemoveEquipment(player, mod.InventorySlots.GadgetOne);
    mod.RemoveEquipment(player, mod.InventorySlots.GadgetTwo);
    mod.RemoveEquipment(player, mod.InventorySlots.ClassGadget);
    mod.RemoveEquipment(player, mod.InventorySlots.Throwable);
    mod.AddEquipment(player, mod.Gadgets.Melee_Combat_Knife, mod.InventorySlots.MeleeWeapon);
}

async function equipWeaponForTier(player: mod.Player, tier: number): Promise<void> {
    if (!mod.IsPlayerValid(player)) return;
    let equippedWeapon: mod.Weapons | null = null;

    // Standard weapon tiers
    if (tier >= 0 && tier < activeWeaponList.length) {
        const weapon = activeWeaponList[tier];
        const pkg = getPlayerWeaponPackage(player, tier);
        if (pkg) mod.AddEquipment(player, weapon, pkg, mod.InventorySlots.PrimaryWeapon);
        else mod.AddEquipment(player, weapon, mod.InventorySlots.PrimaryWeapon);
        mod.Resupply(player, mod.ResupplyTypes.AmmoCrate);
        mod.ForceSwitchInventory(player, mod.InventorySlots.PrimaryWeapon);
        updatePlayerUI(player, tier);
        equippedWeapon = weapon;
        return;
    }

    // RPG tier
    if (tier === 17) {
        mod.RemoveEquipment(player, mod.InventorySlots.PrimaryWeapon);
        mod.AddEquipment(player, mod.Gadgets.Launcher_Unguided_Rocket, mod.InventorySlots.GadgetOne);
        mod.Resupply(player, mod.ResupplyTypes.AmmoCrate);
        mod.SetInventoryMagazineAmmo(player, mod.InventorySlots.GadgetOne, 6);
        mod.SpotTarget(player, 999, mod.SpotStatus.SpotInMinimap);
        mod.DisplayHighlightedWorldLogMessage(mod.Message("3D MARKED! RPG TIME!"), player);
        await mod.Wait(0.2);
        mod.ForceSwitchInventory(player, mod.InventorySlots.GadgetOne);
        
        updatePlayerUI(player, tier);
        return;
    }

    // Final knife tier
    if (tier === FINAL_TIER_INDEX) {
        clearPlayerLoadout(player);
        mod.AddEquipment(player, mod.Gadgets.Throwable_Throwing_Knife, mod.InventorySlots.Throwable);
        mod.Resupply(player, mod.ResupplyTypes.AmmoCrate);
        mod.SetInventoryMagazineAmmo(player, mod.InventorySlots.Throwable, 5);
        mod.SetPlayerMaxHealth(player, KNIFE_HEALTH_BONUS);
        mod.SetPlayerMovementSpeedMultiplier(player, KNIFE_SPEED_MULTIPLIER);
        mod.ForceSwitchInventory(player, mod.InventorySlots.MeleeWeapon);
        mod.SpotTarget(player, 999, mod.SpotStatus.SpotInBoth);
        mod.DisplayNotificationMessage(mod.Message("{0} reached FINAL TIER!", player));
        updatePlayerUI(player, tier);
        mod.DisplayHighlightedWorldLogMessage(mod.Message("FINAL TIER: Knives! Get the final kill to WIN!"), player);
        return;
    }

    // Fallback
    mod.AddEquipment(player, mod.Weapons.Sidearm_M45A1, mod.InventorySlots.PrimaryWeapon);
    mod.Resupply(player, mod.ResupplyTypes.AmmoCrate);
}

// =====================================================
// KILL HANDLING
// =====================================================
function handleNormalKill(player: mod.Player): void {
    if (!mod.IsPlayerValid(player)) return;
    const pid = mod.GetObjId(player);
    const tier = getTier(player);
    
    if (tier === FINAL_TIER_INDEX) {
        handlePlayerVictory(player);
        return;
    }

    const newTier = Math.min(tier + 1, FINAL_TIER_INDEX);
    setTier(player, newTier);
    mod.SetPlayerMaxHealth(player, 100);
    playerLastTierOnSpawn[pid] = newTier;
    
    mod.DisplayHighlightedWorldLogMessage(mod.Message("LEVEL UP! Tier {0}", newTier + 1), player);
    equipWeaponForTier(player, newTier);
    updatePlayerUI(player, newTier);

    if (newTier === FINAL_TIER_INDEX - 1) {
        mod.DisplayNotificationMessage(mod.Message("{0} reached FINAL TIER!", player));
    }
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
        
        if (mod.GetSoldierState(victim, mod.SoldierStateBool.IsAlive)) {
            equipWeaponForTier(victim, newTier);
        }
        
        updatePlayerUI(victim, newTier);
    }
}

function handlePlayerVictory(player: mod.Player): void {
    if (!mod.IsPlayerValid(player)) return;
    mod.DisplayNotificationMessage(mod.Message("{0} has won Gun Game!", player));
    mod.EndGameMode(player);
}

// =====================================================
// VFX
// =====================================================
export function SpawnSmokeColumn() {
    const pos = mod.CreateVector(61.628, 70.255, -28.681);
    const rot = mod.CreateVector(0, 0, 0);
    smokeVFX = mod.SpawnObject(mod.RuntimeSpawn_Common.FX_Vehicle_Wreck_PTV, pos, rot);
    mod.EnableVFX(smokeVFX, true);
}

// =====================================================
// GAME MODE EVENTS
// =====================================================
export async function OnGameModeStarted() {
    const index = mod.RoundToInteger(mod.RandomReal(0, WEAPON_SETS.length - 1));
    activeWeaponList = WEAPON_SETS[index];
    
    switch (index) {
        case 0:
            mod.DisplayNotificationMessage(mod.Message("Classic Weapon Set Selected!"));
            break;
        case 1:
            mod.DisplayNotificationMessage(mod.Message("Heavy Weapon Set Selected!"));
            break;
        case 2:
            mod.DisplayNotificationMessage(mod.Message("CQB Weapon Set Selected!"));
            break;
        case 3:
            mod.DisplayNotificationMessage(mod.Message("Meta Weapon Set Selected!"));
            break;
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

export async function OnPlayerJoinGame(player: mod.Player) {
    if (!mod.IsPlayerValid(player)) return;
    const pid = mod.GetObjId(player);

    playerTiers[pid] = 0;
    playerLastTierOnSpawn[pid] = 0;
    try { 
        playerLastKills[pid] = mod.GetPlayerKills(player); 
    } catch { 
        playerLastKills[pid] = 0; 
    }

    generateRandomWeaponPackages(player);
    mod.EnablePlayerDeploy(player, true);
    mod.SetRedeployTime(player, RESPAWN_DELAY);
    mod.SkipManDown(player, true);
    mod.DisplayHighlightedWorldLogMessage(mod.Message("Welcome to Gun Game! Get 1 kill per weapon to advance."), player);
    
    updateScoreboard(player);
    updatePlayerUI(player, 0);
}

export async function OnPlayerDeployed(player: mod.Player) {
    if (!mod.IsPlayerValid(player)) return;
    const pid = mod.GetObjId(player);
    const tier = getTier(player);
    
    playerLastTierOnSpawn[pid] = tier;
    try { 
        playerLastKills[pid] = mod.GetPlayerKills(player); 
    } catch {}

    clearPlayerLoadout(player);
    mod.SetPlayerMaxHealth(player, 100);
    mod.SetPlayerMovementSpeedMultiplier(player, 1.0);
    
    await equipWeaponForTier(player, tier);
    updateScoreboard(player);
    updatePlayerUI(player, tier);
    if (tier === 17){
        mod.ForceSwitchInventory(player, mod.InventorySlots.GadgetOne);
    }
}

export async function OnPlayerEarnedKill(killer: mod.Player, victim: mod.Player, deathType: mod.DeathType, weapon: mod.WeaponUnlock) {
    if (!mod.IsPlayerValid(killer) || !mod.IsPlayerValid(victim)) return;
    if (mod.Equals(killer, victim)) return;
    if (mod.GetSoldierState(victim, mod.SoldierStateBool.IsAlive)) return;

    const now = Date.now();
    const killerId = mod.GetObjId(killer);
    
    if (playerLastKillTime[killerId] && now - playerLastKillTime[killerId] < 300) return;
    playerLastKillTime[killerId] = now;

    const isKnife = mod.EventDeathTypeCompare(deathType, mod.PlayerDeathTypes.Melee);
    
    if (isKnife) {
        handleKnifeKill(killer, victim);
    } else {
        handleNormalKill(killer);
    }

    updateScoreboard(killer);
    updateScoreboard(victim);
}

export async function OnPlayerDied(victim: mod.Player, killer: mod.Player, deathType: mod.DeathType, weapon: mod.WeaponUnlock) {
    if (!mod.IsPlayerValid(victim)) return;
    const pid = mod.GetObjId(victim);
    const currentTier = getTier(victim) || 0;
    const spawnTier = playerLastTierOnSpawn[pid] || 0;
    
    if (currentTier > spawnTier) {
        setTier(victim, spawnTier);
    }
    
    updateScoreboard(victim);
}

export async function OnPlayerLeftGame(player: mod.Player) {
    if (!mod.IsPlayerValid(player)) return;
    const pid = mod.GetObjId(player);
    
    if (playerUIs[pid]) {
        playerUIs[pid].destroy();
        delete playerUIs[pid];
    }
    
    delete playerTiers[pid];
    delete playerWeaponPackages[pid];
    delete playerLastTierOnSpawn[pid];
    delete playerLastKills[pid];
    delete playerLastKillTime[pid];
}
