// One-in-the-Chamber gamemode with 3 lives per player; handles kills, equipment refresh, respawn delays and spectator on elimination.

const INITIAL_BULLETS = 1;
const RESPAWN_DELAY = 3;
const TARGET_KILLS = 20;
const INITIAL_THROWABLES = 3; // Renamed BRUV for clarity
const INITIAL_LIVES = 3;


function assignPlayersToUniqueTeams() {
    // Assign every valid player to a unique team by iterating the engine player array correctly.
    const allPlayersArray = mod.AllPlayers(); // engine collection
    const count = mod.CountOf(allPlayersArray);
    let teamIndex = 1;

    for (let i = 0; i < count; i++) {
        const p = mod.ValueInArray(allPlayersArray, i);
        if (!mod.IsPlayerValid(p)) continue;

        // Protect against excessively large teamIndex by clamping if necessary.
        // (If map provides fewer teams, teams will still be sequentially assigned; adjust as needed.)
        const team = mod.GetTeam(teamIndex);
        mod.SetTeam(p, team);
        teamIndex++;
    }
}
function resetPlayerTeams() {
    // single pass team assignment (no nested loops)
    assignPlayersToUniqueTeams();
}



export async function OnRoundEnded() {
    resetPlayerTeams();
    const players = mod.AllPlayers();
    const n = mod.CountOf(players);
    for (let i = 0; i < n; i++) {
        const p = mod.ValueInArray(players, i);
        if (mod.IsPlayerValid(p)) updateScoreboard(p);
    }
}



let smokeVFX: mod.VFX;

export function SpawnSmokeColumn() {
    const pos = mod.CreateVector(61.628, 70.255, -28.681);
    const rot = mod.CreateVector(0, 0, 0);
    smokeVFX = mod.SpawnObject(mod.RuntimeSpawn_Common.FX_Vehicle_Wreck_PTV, pos, rot);
    mod.EnableVFX(smokeVFX, true);
}

// Player tracking variables
const playerLives: { [key: number]: number } = {};
const playerKillsCount: { [key: number]: number } = {};
const playerLastKillsSnapshot: { [key: number]: number } = {};
const playerLastKillTime: { [key: number]: number } = {};
const playerUIs: { [key: number]: SimpleCounterUI } = {};
const playerHandles: { [key: number]: mod.Player } = {};
//=================================================
// UI CLASS
//==============================================

import { ParseUI } from "modlib";

class SimpleCounterUI {
    player: mod.Player;                            // FIX: Added player tracking
    rootWidget: mod.UIWidget | undefined;
    counterText: mod.UIWidget | undefined;
    width: number = 200;
    height: number = 100;

    bgColor = [0, 0, 0.2] // RGB
    padding = 4
    
    // state management
    isUIVisible = false;
    lives: number = INITIAL_LIVES;

    // FIX: Now accepts and stores the player object
    constructor(player: mod.Player, initialLives: number = INITIAL_LIVES) {
        this.player = player;
        this.lives = initialLives;
    }

    show() {
        if (!this.rootWidget)
            this.create();
        if (!this.rootWidget)
            return;

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
            bgColor: this.bgColor,
            bgAlpha: 0.5,
            // CRITICAL FIX: Scope the UI to the specific player!
            playerId: this.player, 
            children: [{
                type: "Container",
                position: [0, 0],
                size: [this.width - this.padding, this.height - this.padding],
                anchor: mod.UIAnchor.Center,
                bgFill: mod.UIBgFill.Blur,
                bgColor: [0, 0, 0.6],
                bgAlpha: 0.70
            }]
        })
        
        this.counterText = ParseUI({
            type: "Text",
            parent: this.rootWidget,
            textSize: 36,
            textColor: [1, 1, 1],
            position: [0, 0, 0],
            size: [this.width, 50],
            anchor: mod.UIAnchor.Center,
            textAnchor: mod.UIAnchor.Center,
            bgAlpha: 0.2,
            textLabel: mod.Message("Lives: {0}" , this.lives),
        })
    }

    update(newLives: number) {
        if (!this.counterText) return;
        this.lives = newLives;
        mod.SetUITextLabel(this.counterText, mod.Message("Lives: {0}" , this.lives));
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

export async function OnGameModeStarted() {
    
    mod.SetGameModeTargetScore(TARGET_KILLS);
    mod.SetSpawnMode(mod.SpawnModes.AutoSpawn);

    
    mod.SetScoreboardType(mod.ScoreboardType.CustomFFA);
    mod.SetScoreboardHeader(mod.Message("ONE IN THE CHAMBER"));
    mod.DisplayHighlightedWorldLogMessage(mod.Message("You've got 3 lives, use them well!"));
    mod.SetScoreboardColumnNames(mod.Message("Kills"), mod.Message("Lives"));
    mod.SetScoreboardColumnWidths(1, 1);
    mod.SetScoreboardSorting(1, true);
    SpawnSmokeColumn();
    resetPlayerTeams();
    
}

// ============================================================================
// PLAYER JOIN/SPAWN HANDLING
// ============================================================================

export async function OnPlayerJoinGame(player: mod.Player) {
    if (!mod.IsPlayerValid(player)) return;
    const playerId = getPlayerId(player);
     playerHandles[playerId] = player; 
    assignPlayersToUniqueTeams();

    // Initialize kill count and scoreboard baseline
    playerKillsCount[playerId] = 0;
    try {
        playerLastKillsSnapshot[playerId] = mod.GetPlayerKills(player);
    } catch {
        playerLastKillsSnapshot[playerId] = 0;
    }

    mod.EnablePlayerDeploy(player, true);
    mod.SetRedeployTime(player, RESPAWN_DELAY);
    mod.SkipManDown(player, true);

    // initialize lives
    playerLives[playerId] = INITIAL_LIVES;

    // FIX: Pass the player object to the UI constructor
    const ui = new SimpleCounterUI(player, INITIAL_LIVES); 
    playerUIs[playerId] = ui;
    ui.show();

    
    updateScoreboard(player);
}

export async function OnPlayerDeployed(player: mod.Player) {
    if (!mod.IsPlayerValid(player)) return;

    // Clear loadout and give player 1 bullet
    clearPlayerLoadout(player);
    equipOneInTheChamberLoadout(player);
    mod.SetPlayerMaxHealth(player, 100);

    updateScoreboard(player);
}

// ============================================================================
// KILL HANDLING - EQUIPMENT REFRESH VERSION
// ============================================================================

export async function OnPlayerEarnedKill(
    killer: mod.Player,
    victim: mod.Player,
    deathType: mod.DeathType,
    weapon: mod.WeaponUnlock
) {
    // Validate players - CRITICAL: Both must be valid
    if (!mod.IsPlayerValid(killer) || !mod.IsPlayerValid(victim)) {
        console.log(`[OITC] Invalid killer or victim, ignoring`);
        return;
    }

    // No suicides or self-kills
    if (mod.Equals(killer, victim)) {
        console.log(`[OITC] Suicide detected, ignoring`);
        return;
    }

    // Ensure victim is actually dead
    if (mod.GetSoldierState(victim, mod.SoldierStateBool.IsAlive)) {
        console.log(`[OITC] Victim still alive, ignoring phantom kill event`);
        return;
    }

    const killerId = getPlayerId(killer);
    const victimId = getPlayerId(victim);

    // DEBOUNCE: Prevent duplicate kill events within 200ms
    const currentTime = Date.now();
    const lastKillTime = playerLastKillTime[killerId] || 0;
    if (currentTime - lastKillTime < 200) {
        console.log(`[OITC] Duplicate kill event detected (${currentTime - lastKillTime}ms), ignoring`);
        return;
    }

    console.log(`[OITC] Valid kill event: Killer ${killerId} -> Victim ${victimId}, DeathType: ${deathType}`);

    // --- CRITICAL: Check scoreboard kill delta ---
    const oldKills = playerLastKillsSnapshot[killerId] ?? 0;
    let newKills = oldKills;
    try {
        newKills = mod.GetPlayerKills(killer);
    } catch {
        // keep old if error
    }
    const gained = Math.max(0, newKills - oldKills);

    console.log(`[OITC] Player ${killerId}: oldKills=${oldKills}, newKills=${newKills}, gained=${gained}`);

    // If no actual kill registered on scoreboard, ignore this event
    if (gained <= 0) {
        console.log(`[OITC] No scoreboard kill delta, ignoring event`);
        updateScoreboard(killer);
        updateScoreboard(victim);
        return;
    }

    // Update timestamp AFTER confirming legitimate kill
    playerLastKillTime[killerId] = currentTime;

    // ONLY update snapshot when we have a confirmed legitimate kill
    playerLastKillsSnapshot[killerId] = newKills;

    // Increment internal kill count by exactly 1
    playerKillsCount[killerId] = (playerKillsCount[killerId] || 0) + 1;

    // === EQUIPMENT REFRESH APPROACH ===
    // Refresh equipment for the killer (keeps them supplied)
    await refreshPlayerEquipment(killer);

    mod.SetPlayerMaxHealth(killer, 100);
    console.log(`[OITC] Player ${killerId} new internal kill count: ${playerKillsCount[killerId]}`);

    // Notify player
    mod.DisplayHighlightedWorldLogMessage(
        mod.Message("Kill {0} / {1}", playerKillsCount[killerId], TARGET_KILLS),
        killer
    );

    // Check victory
    if (playerKillsCount[killerId] >= TARGET_KILLS) {
        handlePlayerVictory(killer);
        updateScoreboard(killer);
        return;
    }

    // update scoreboards (victim/spawn handled in OnPlayerDied)
    updateScoreboard(killer);
    updateScoreboard(victim);
}

// ============================================================================
// DEATH/LIVES HANDLING
// ============================================================================

export async function OnPlayerDied(
    victim: mod.Player,
    killer: mod.Player,
    deathType: mod.DeathType,
    weapon: mod.WeaponUnlock
) {
    if (!mod.IsPlayerValid(victim)) return;
    const victimId = getPlayerId(victim);

    // Log suicides/environmental deaths
    if (!mod.IsPlayerValid(killer) || mod.Equals(killer, victim)) {
        console.log(`[OITC] Player ${victimId} died from suicide/environment - no kill credited`);
    }

    // decrement life
    playerLives[victimId] = (playerLives[victimId] || INITIAL_LIVES) - 1;
    
    // UPDATE UI WITH NEW LIVES COUNT
    const ui = playerUIs[victimId];
    if (ui) {
        ui.update(playerLives[victimId]);
    }

    if ((playerLives[victimId] ?? INITIAL_LIVES) <= 0) {
        // Hide UI when eliminated
        if (ui) {
            ui.hide();
        }
        mod.DisplayNotificationMessage(mod.Message("You are eliminated."), victim);
        mod.EnablePlayerDeploy(victim, false);
         mod.SetRedeployTime(victim, 999999);
        updateScoreboard(victim);
        
 if (mod.IsPlayerValid(victim)) {
        // Move to killer's team to enable auto-spectate
        if (mod.IsPlayerValid(killer)) {
            const killerTeam = mod.GetTeam(killer);
            mod.SetTeam(victim, killerTeam);}

        // Switch to spectator mode (no respawn)
        mod.SetSpawnMode(mod.SpawnModes.Spectating);
    }

    updateScoreboard(victim);

        
        
        
        // CHECK FOR LAST PLAYER STANDING
        const winner = checkForLastPlayerStanding();
        if (winner !== null) {
            handlePlayerVictory(winner);
        }
        return;
    }

    // If still has lives, wait briefly then redeploy
    if (playerLives[victimId] > 0) {
        // short delay to let the engine complete death/cleanup
        await mod.Wait(0.8);

        // double-check player is still valid before deploy
        if (mod.IsPlayerValid(victim)) {
            mod.DisplayNotificationMessage(mod.Message("{0} lives remaining!", playerLives[victimId]), victim);
            // allow deploy and redeploy
            mod.EnablePlayerDeploy(victim, true);
            mod.SetRedeployTime(victim, RESPAWN_DELAY);
            mod.DeployPlayer(victim);
        } else if (playerLives[victimId] === 1) {
         mod.DisplayNotificationMessage(mod.Message("LAST CHANCE!"), victim);
        }

        // ensure scoreboard updated after deploy attempt
        await mod.Wait(0.1);
        updateScoreboard(victim);
    }
}

// ============================================================================
// EQUIPMENT REFRESH FUNCTION
// ============================================================================

async function refreshPlayerEquipment(player: mod.Player): Promise<void> {
    if (!mod.IsPlayerValid(player)) return;
    console.log(`[OITC] Refreshing equipment for player ${getPlayerId(player)}`);

    // small delay to let kill/weapon state settle
    await mod.Wait(0.05);

    if (!mod.IsPlayerValid(player)) {
        console.log(`[OITC] Player no longer valid, aborting refresh`);
        return;
    }

    try {
        // Set pistol ammo: 1 in magazine, 0 in reserve
        mod.SetInventoryAmmo(player, mod.InventorySlots.PrimaryWeapon, INITIAL_BULLETS);
        mod.SetInventoryMagazineAmmo(player, mod.InventorySlots.PrimaryWeapon, 0);

        await mod.Wait(0.05);

        // Set throwing knife: 3 ready
        mod.SetInventoryAmmo(player, mod.InventorySlots.Throwable, INITIAL_THROWABLES);
        // FIX: Removed unnecessary/incorrect SetInventoryMagazineAmmo for throwable.
        
        mod.ForceSwitchInventory(player, mod.InventorySlots.PrimaryWeapon);

        console.log(`[OITC] Equipment refresh complete`);
    } catch (e) {
        console.log(`[OITC] Error during equipment refresh: ${e}`);
    }
}

// ============================================================================
// VICTORY HANDLING
// ============================================================================

function handlePlayerVictory(player: mod.Player): void {
    mod.DisplayNotificationMessage(
        mod.Message("{0} is the winner!", player)
    );
    mod.EndGameMode(player);
    resetPlayerTeams();
}

// ============================================================================
// LOADOUT MANAGEMENT
// ============================================================================

function equipOneInTheChamberLoadout(player: mod.Player): void {
    if (!mod.IsPlayerValid(player)) return;

    // Add primary weapon (pistol)
    mod.AddEquipment(player, mod.Weapons.Sidearm_M44, mod.InventorySlots.PrimaryWeapon);

    // Add throwing knife gadget
    mod.AddEquipment(player, mod.Gadgets.Throwable_Throwing_Knife, mod.InventorySlots.Throwable);

    mod.Resupply(player, mod.ResupplyTypes.AmmoCrate);

    // Set pistol ammo: 1 in magazine, 0 in reserve
    mod.SetInventoryAmmo(player, mod.InventorySlots.PrimaryWeapon, 0);
    mod.SetInventoryMagazineAmmo(player, mod.InventorySlots.PrimaryWeapon, INITIAL_BULLETS);

    // Set throwing knife: 3 ready
    mod.SetInventoryAmmo(player, mod.InventorySlots.Throwable, INITIAL_THROWABLES);
    // FIX: Removed unnecessary/incorrect mod.SetInventoryMagazineAmmo(player, mod.InventorySlots.Throwable, 1);

    mod.ForceSwitchInventory(player, mod.InventorySlots.PrimaryWeapon);
}

function clearPlayerLoadout(player: mod.Player): void {
    if (!mod.IsPlayerValid(player)) return;
    mod.RemoveEquipment(player, mod.InventorySlots.PrimaryWeapon);
    mod.RemoveEquipment(player, mod.InventorySlots.SecondaryWeapon);
    mod.RemoveEquipment(player, mod.InventorySlots.GadgetOne);
    mod.RemoveEquipment(player, mod.InventorySlots.GadgetTwo);
    mod.RemoveEquipment(player, mod.InventorySlots.ClassGadget);
    mod.RemoveEquipment(player, mod.InventorySlots.Throwable);
    mod.RemoveEquipment(player, mod.InventorySlots.MeleeWeapon);
    mod.AddEquipment(player, mod.Gadgets.Melee_Combat_Knife);
}

// ============================================================================
// UTILITY
// ============================================================================

function getPlayerId(player: mod.Player): number {
    return mod.GetObjId(player);
}

function updateScoreboard(player: mod.Player): void {
    if (!mod.IsPlayerValid(player)) return;
    const playerId = getPlayerId(player);
    const kills = playerKillsCount[playerId] || 0;
    const lives = playerLives[playerId] ?? INITIAL_LIVES;

    mod.SetScoreboardPlayerValues(player, kills, lives);
}

function checkForLastPlayerStanding(): mod.Player | null {
    const alivePlayers: mod.Player[] = [];

    for (const playerIdStr in playerLives) {
        const playerId = parseInt(playerIdStr);
        const lives = playerLives[playerId] ?? 0;
        const player = playerHandles[playerId];

        if (lives > 0 && mod.IsPlayerValid(player)) {
            alivePlayers.push(player);
        }
    }

    return alivePlayers.length === 1 ? alivePlayers[0] : null;
}
