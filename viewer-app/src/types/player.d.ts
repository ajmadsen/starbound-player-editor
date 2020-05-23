export interface Player {
  aiState: AIState;
  blueprints: Blueprints;
  codexes: Codexes;
  companions: PlayerCompanions;
  deployment: Deployment;
  description: string;
  genericProperties: GenericProperties;
  genericScriptStorage: GenericScriptStorage;
  identity: Identity;
  inventory: Inventory;
  log: Log;
  modeType: string;
  movementController: MovementController;
  quests: PlayerQuests;
  shipUpgrades: ShipUpgrades;
  statusController: StatusController;
  team: Team;
  techController: TechController;
  techs: Techs;
  universeMap: UniverseMap;
  uuid: string;
}

export interface AIState {
  availableMissions: any[];
  completedMissions: any[];
}

export interface Blueprints {
  knownBlueprints: KnownBlueprint[];
  newBlueprints: KnownBlueprint[];
}

export interface KnownBlueprint {
  count: number;
  name: string;
  parameters: GenericProperties;
}

export interface GenericProperties {}

export interface Codexes {
  protectorate1: boolean;
  protectorate2: boolean;
}

export interface PlayerCompanions {
  companions: CompanionsCompanions;
  scriptStorage: CompanionsScriptStorage;
}

export interface CompanionsCompanions {
  crew: any[];
  followers: any[];
  pets: any[];
  shipCrew: any[];
}

export interface CompanionsScriptStorage {
  activePods: GenericProperties;
  pods: GenericProperties;
  recruits: Recruits;
}

export interface Recruits {
  beenOnShip: GenericProperties;
}

export interface Deployment {
  scriptStorage: GenericProperties;
}

export interface GenericScriptStorage {
  bounty: GenericProperties;
  stealing: GenericProperties;
}

export interface Identity {
  bodyDirectives: string;
  color: number[];
  emoteDirectives: string;
  facialHairDirectives: string;
  facialHairGroup: string;
  facialHairType: string;
  facialMaskDirectives: string;
  facialMaskGroup: string;
  facialMaskType: string;
  gender: string;
  hairDirectives: string;
  hairGroup: string;
  hairType: string;
  name: string;
  personalityArmIdle: string;
  personalityArmOffset: number[];
  personalityHeadOffset: number[];
  personalityIdle: string;
  species: string;
}

export interface Inventory {
  backCosmeticSlot: any;
  backSlot: any;
  beamAxe: any;
  chestCosmeticSlot: any;
  chestSlot: Slot;
  currencies: Currencies;
  customBar: Array<Array<any[]>>;
  customBarGroup: number;
  headCosmeticSlot: any;
  headSlot: any;
  inspectionTool: InspectionTool;
  itemBags: ItemBags;
  legsCosmeticSlot: any;
  legsSlot: Slot;
  paintTool: any;
  selectedActionBar: any;
  swapSlot: any;
  trashSlot: any;
  wireTool: any;
}

export interface Slot {
  content: PurpleContent;
  id: string;
  version: number;
}

export interface PurpleContent {
  count: number;
  name: string;
  parameters: StarterChestParameters;
}

export interface StarterChestParameters {
  colorIndex: number;
}

export interface Currencies {
  essence: number;
  money: number;
}

export interface InspectionTool {
  content: KnownBlueprint;
  id: string;
  version: number;
}

export interface ItemBags {
  foodBag: any[];
  mainBag: any[];
  materialBag: any[];
  objectBag: any[];
  reagentBag: any[];
}

export interface Log {
  cinematics: string[];
  collections: GenericProperties;
  deathCount: number;
  introComplete: boolean;
  playTime: number;
  radioMessages: any[];
  scannedObjects: any[];
}

export interface MovementController {
  crouching: boolean;
  facingDirection: string;
  movingDirection: string;
  position: number[];
  rotation: number;
  velocity: number[];
}

export interface PlayerQuests {
  currentQuest: string;
  quests: QuestsQuests;
}

export interface QuestsQuests {
  protectorate: Protectorate;
}

export interface Protectorate {
  content: ProtectorateContent;
  id: string;
  version: number;
}

export interface ProtectorateContent {
  arc: Arc;
  arcPos: number;
  canTurnIn: boolean;
  completionText: string;
  failureText: string;
  indicators: any[];
  lastUpdatedOn: number;
  location: any;
  money: number;
  parameters: PurpleParameters;
  portraitTitles: PortraitTitles;
  portraits: Portraits;
  rewards: any[];
  scriptStorage: ContentScriptStorage;
  serverUuid: any;
  showDialog: boolean;
  state: string;
  text: string;
  title: string;
  unread: boolean;
  worldId: any;
}

export interface Arc {
  content: ArcContent;
  id: string;
  version: number;
}

export interface ArcContent {
  quests: Quest[];
  stagehandUniqueId: any;
}

export interface Quest {
  content: QuestContent;
  id: string;
  version: number;
}

export interface QuestContent {
  parameters: GenericProperties;
  questId: string;
  seed: number;
  templateId: string;
}

export interface PurpleParameters {
  beamaxe: Beamaxe;
  player: PlayerClass;
  sail: Beamaxe;
  uniformLocker: Beamaxe;
  weaponChest: Beamaxe;
}

export interface Beamaxe {
  indicator: any;
  item?: InspectionTool;
  name: null | string;
  portrait: Portrait[] | null;
  type: string;
}

export interface Portrait {
  image: string;
}

export interface PlayerClass {
  gender: string;
  indicator: any;
  name: string;
  portrait: QuestComplete[];
  species: string;
  type: string;
  uniqueId: string;
}

export interface QuestComplete {
  color: number[];
  fullbright: boolean;
  image: string;
  position: number[];
  transformation: Array<number[]>;
}

export interface PortraitTitles {
  QuestComplete: string;
  QuestFailed: string;
  QuestStarted: string;
}

export interface Portraits {
  QuestComplete: QuestComplete[];
  QuestFailed: QuestComplete[];
  QuestStarted: QuestComplete[];
}

export interface ContentScriptStorage {
  starterChest: PurpleContent;
  starterLegs: PurpleContent;
}

export interface ShipUpgrades {
  capabilities: any[];
  crewSize: number;
  fuelEfficiency: number;
  maxFuel: number;
  shipLevel: number;
  shipSpeed: number;
}

export interface StatusController {
  ephemeralEffects: any[];
  persistentEffectCategories: PersistentEffectCategories;
  resourceValues: ResourceValues;
  resourcesLocked: ResourcesLocked;
  statusProperties: StatusProperties;
}

export interface PersistentEffectCategories {
  environment: string[];
}

export interface ResourceValues {
  breath: number;
  damageAbsorption: number;
  energy: number;
  energyRegenBlock: number;
  food: number;
  health: number;
  perfectBlock: number;
  perfectBlockLimit: number;
  shieldStamina: number;
  shieldStaminaRegenBlock: number;
}

export interface ResourcesLocked {
  breath: boolean;
  damageAbsorption: boolean;
  energy: boolean;
  energyRegenBlock: boolean;
  food: boolean;
  health: boolean;
  perfectBlock: boolean;
  perfectBlockLimit: boolean;
  shieldStamina: boolean;
  shieldStaminaRegenBlock: boolean;
}

export interface StatusProperties {
  breathHealthPenaltyPercentageRate: number;
  damageFlashOffDirectives: string;
  damageFlashOnDirectives: string;
  hitInvulnerabilityFlash: number;
  hitInvulnerabilityThreshold: number;
  hitInvulnerabilityTime: number;
  mouthPosition: number[];
  ouchNoise: string;
  shieldHitInvulnerabilityTime: number;
  targetMaterialKind: string;
}

export interface Team {
  team: number;
  type: string;
}

export interface TechController {
  techModules: any[];
}

export interface Techs {
  availableTechs: any[];
  enabledTechs: any[];
  equippedTechs: GenericProperties;
}

export interface UniverseMap extends Record<string, Universe> {}

export interface Universe {
  systems: Array<Array<number[] | SystemClass>>;
  teleportBookmarks: any[];
}

export interface SystemClass {
  bookmarks: any[];
  mappedObjects: GenericProperties;
  mappedPlanets: MappedPlanet[];
}

export interface MappedPlanet {
  location: number[];
  planet: number;
  satellite: number;
}
